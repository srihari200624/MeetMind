import os
import json
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, date
from database import get_connection
from notify import notify_escalation, send_email
from openai import OpenAI

lm_client = OpenAI(base_url="http://127.0.0.1:1234/v1", api_key="lm-studio")
MODEL = "qwen/qwen2.5-vl-7b"
PROMPT_FILE = os.path.join(os.path.dirname(__file__), "extraction_prompt.txt")

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


def run_prompt_refinement():
    """Read correction signals, ask Qwen to rewrite the extraction prompt, save to file."""
    print(f"[Scheduler] Running weekly prompt refinement at {datetime.now()}")

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT original_task, rejection_reason
        FROM correction_signals
        ORDER BY created_at DESC
        LIMIT 20
    """)
    corrections = [dict(r) for r in cursor.fetchall()]
    conn.close()

    if not corrections:
        print("[Scheduler] No corrections found - skipping prompt refinement.")
        return

    examples = "\n".join([
        f"  - Task: \"{c['original_task']}\" - Rejected because: {c['rejection_reason']}"
        for c in corrections if c.get("rejection_reason")
    ])

    meta_prompt = f"""You are an AI prompt engineer. Below is the current extraction prompt used to extract action items from meeting transcripts, followed by a list of recent mistakes.

Rewrite the extraction prompt to avoid these mistakes. Keep the same JSON output format. Use {{user_names}}, {{correction_context}}, and {{transcript}} as placeholders.

Current prompt:
---
You are an AI meeting assistant. Read the following meeting transcript carefully and extract all action items.

Known team members: {{user_names}}

For each action item, extract:
- task: clear description of what needs to be done
- owner: name of the person responsible (must be one of the known team members)
- deadline: deadline if mentioned, otherwise null
- priority: "high", "medium", or "low" based on urgency and importance

Return ONLY a valid JSON array. No explanation, no markdown, no extra text.
{{correction_context}}
Transcript:
{{transcript}}
---

Recent mistakes to fix:
{examples}

Return ONLY the rewritten prompt. No explanation."""

    try:
        response = lm_client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": meta_prompt}],
            max_tokens=800,
            temperature=0.3
        )
        new_prompt = response.choices[0].message.content.strip()
        with open(PROMPT_FILE, "w", encoding="utf-8") as f:
            f.write(new_prompt)
        print(f"[Scheduler] Prompt refined and saved to {PROMPT_FILE}")
    except Exception as e:
        print(f"[Scheduler] Prompt refinement failed: {e}")


def start_scheduler():
    """Start the background scheduler."""
    scheduler.add_job(run_escalation, "interval", hours=1, id="escalation_job")
    scheduler.add_job(run_prompt_refinement, "interval", weeks=1, id="refinement_job")
    scheduler.start()
    print("[Scheduler] Started — escalation runs every hour, prompt refinement runs weekly.")


def stop_scheduler():
    """Stop the background scheduler."""
    scheduler.shutdown()
    print("[Scheduler] Stopped.")


# ── Quick test ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("Running manual escalation check...")
    run_escalation()
    print("Done.")