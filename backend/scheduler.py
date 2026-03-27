from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, date
from database import get_connection
from notify import notify_escalation, send_email

scheduler = BackgroundScheduler()


def get_managers() -> list:
    """Fetch all managers from DB."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT name, email FROM users WHERE role = 'manager'")
    managers = [dict(m) for m in cursor.fetchall()]
    conn.close()
    return managers


def decay_scores():
    """Decay accountability scores by 5 for every overdue pending task."""
    conn = get_connection()
    cursor = conn.cursor()

    today = date.today().isoformat()

    # Get all overdue pending tasks
    cursor.execute("""
        SELECT id, accountability_score
        FROM action_items
        WHERE status = 'pending'
        AND deadline IS NOT NULL
        AND deadline < ?
    """, (today,))
    overdue = cursor.fetchall()

    for item in overdue:
        new_score = max(0, item["accountability_score"] - 5)
        cursor.execute("""
            UPDATE action_items SET accountability_score = ? WHERE id = ?
        """, (new_score, item["id"]))

    conn.commit()
    conn.close()
    print(f"[Scheduler] Score decay applied to {len(overdue)} overdue tasks.")


def run_escalation():
    """Check all overdue tasks and fire L1/L2/L3 escalation emails."""
    print(f"[Scheduler] Running escalation check at {datetime.now()}")

    decay_scores()

    conn = get_connection()
    cursor = conn.cursor()

    today = date.today().isoformat()
    managers = get_managers()

    # Get all overdue pending tasks with owner info
    cursor.execute("""
        SELECT
            ai.id,
            ai.task,
            ai.deadline,
            ai.accountability_score,
            ai.owner,
            u.name as owner_name,
            u.email as owner_email
        FROM action_items ai
        LEFT JOIN users u ON ai.owner_id = u.id
        WHERE ai.status = 'pending'
        AND ai.deadline IS NOT NULL
        AND ai.deadline < ?
    """, (today,))
    overdue_items = cursor.fetchall()

    for item in overdue_items:
        deadline = date.fromisoformat(item["deadline"])
        days_overdue = (date.today() - deadline).days
        score = item["accountability_score"]
        owner_email = item["owner_email"]
        owner_name = item["owner_name"] or item["owner"]
        task = item["task"]
        item_id = item["id"]

        # Determine escalation level
        if days_overdue >= 3 or score < 30:
            level = "L3"
        elif days_overdue >= 2 or score < 50:
            level = "L2"
        elif days_overdue >= 1:
            level = "L1"
        else:
            continue

        # Send escalation email to employee
        if owner_email:
            notify_escalation(owner_email, owner_name, task, level, days_overdue, score)

        # Notify managers on L2 and L3
        if level in ("L2", "L3") and managers:
            for manager in managers:
                subject = f"[MeetMind] {level} Escalation: {task[:50]}"
                body = f"""Hi {manager['name']},

A task has reached {level} escalation and requires your attention.

Employee     : {owner_name}
Task         : {task}
Days Overdue : {days_overdue}
Score        : {score}/100
Level        : {level}

Please log in to MeetMind to review and take action.

This is an automated message from MeetMind AI.
"""
                send_email(manager["email"], subject, body)

        # Log escalation
        cursor.execute("""
            INSERT INTO escalation_log (action_item_id, level, message_sent)
            VALUES (?, ?, ?)
        """, (item_id, level, f"{level} escalation fired. Days overdue: {days_overdue}, Score: {score}"))

    conn.commit()
    conn.close()
    print(f"[Scheduler] Escalation check complete. Processed {len(overdue_items)} overdue tasks.")


def start_scheduler():
    """Start the background scheduler."""
    scheduler.add_job(run_escalation, "interval", hours=1, id="escalation_job")
    scheduler.start()
    print("[Scheduler] Started — escalation runs every hour.")


def stop_scheduler():
    """Stop the background scheduler."""
    scheduler.shutdown()
    print("[Scheduler] Stopped.")


# ── Quick test ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("Running manual escalation check...")
    run_escalation()
    print("Done.")