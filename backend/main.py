import os
import json
import shutil
from datetime import datetime
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI

from database import init_db, get_connection
from auth import login, get_all_employees, get_all_managers, get_user_by_id
from transcribe import transcribe_audio
from extract import extract_action_items, save_meeting_and_items, generate_summary
from notify import notify_task_assigned, notify_task_submitted, notify_task_approved, notify_task_rejected
from scheduler import start_scheduler, run_escalation
from watcher import start_watcher

# ── App setup ────────────────────────────────────────────────────────────────
app = FastAPI(title="MeetMind AI", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

lm_client = OpenAI(base_url="http://127.0.0.1:1234/v1", api_key="lm-studio")
MODEL = "qwen/qwen2.5-vl-7b"

# ── Startup ──────────────────────────────────────────────────────────────────
@app.on_event("startup")
def startup():
    init_db()
    start_scheduler()
    start_watcher()
    print("MeetMind AI v2.0 started.")

# ── Pydantic models ──────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    employee_id: str
    password: str

class ApproveRequest(BaseModel):
    submission_id: int
    action: str  # 'approved' | 'rejected'
    rejection_reason: str = ""


# ── Auth ─────────────────────────────────────────────────────────────────────
@app.post("/login")
def login_endpoint(req: LoginRequest):
    user = login(req.employee_id, req.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid employee ID or password.")
    return {"success": True, "user": user}


# ── Meetings ─────────────────────────────────────────────────────────────────
@app.post("/upload-meeting")
async def upload_meeting(
    file: UploadFile = File(...),
    title: str = Form(...),
    manager_id: int = Form(...)
):
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    transcription = transcribe_audio(file_path)
    transcript = transcription["transcript"]
    action_items = extract_action_items(transcript)
    summary = generate_summary(transcript)

    speakers = list(set(s["speaker"] for s in transcription.get("speaker_segments", [])))
    meeting_id = save_meeting_and_items(
        title, summary, transcript, action_items, manager_id,
        speaker_count=transcription.get("speaker_count", len(speakers)),
        speakers=json.dumps(speakers)
    )

    for item in action_items:
        if item.get("owner_email") and not item.get("needs_review"):
            notify_task_assigned(
                to_email=item["owner_email"],
                employee_name=item["owner"],
                task=item["task"],
                deadline=item["deadline"] or "Not specified",
                priority=item["priority"]
            )

    return {
        "success": True,
        "meeting_id": meeting_id,
        "transcript": transcript,
        "summary": summary,
        "action_items": action_items
    }


# Alias used by frontend
@app.post("/upload")
async def upload_alias(
    file: UploadFile = File(...),
    title: str = Form(...),
    manager_id: int = Form(...)
):
    return await upload_meeting(file=file, title=title, manager_id=manager_id)


@app.get("/meetings")
def get_meetings():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM meetings ORDER BY created_at DESC")
    meetings = [dict(m) for m in cursor.fetchall()]
    for meeting in meetings:
        cursor.execute("SELECT * FROM action_items WHERE meeting_id = ?", (meeting["id"],))
        meeting["action_items"] = [dict(a) for a in cursor.fetchall()]
    conn.close()
    return meetings


@app.get("/meetings/{meeting_id}")
def get_meeting(meeting_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM meetings WHERE id = ?", (meeting_id,))
    meeting = cursor.fetchone()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found.")
    meeting = dict(meeting)
    cursor.execute("SELECT * FROM action_items WHERE meeting_id = ?", (meeting_id,))
    meeting["action_items"] = [dict(a) for a in cursor.fetchall()]
    conn.close()
    return meeting


# ── Tasks (new unified endpoints) ────────────────────────────────────────────
@app.get("/tasks")
def get_all_tasks(status: str = None, owner_id: int = None):
    """All tasks, optionally filtered by status or owner_id."""
    conn = get_connection()
    cursor = conn.cursor()

    query = """
        SELECT ai.*, m.title as meeting_title
        FROM action_items ai
        JOIN meetings m ON ai.meeting_id = m.id
        WHERE 1=1
    """
    params = []
    if status:
        query += " AND ai.status = ?"
        params.append(status)
    if owner_id:
        query += " AND ai.owner_id = ?"
        params.append(owner_id)
    query += " ORDER BY ai.created_at DESC"

    cursor.execute(query, params)
    tasks = [dict(t) for t in cursor.fetchall()]
    conn.close()
    return tasks


@app.get("/tasks/{task_id}")
def get_task(task_id: int):
    """Single task with its submissions."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT ai.*, m.title as meeting_title
        FROM action_items ai
        JOIN meetings m ON ai.meeting_id = m.id
        WHERE ai.id = ?
    """, (task_id,))
    task = cursor.fetchone()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")
    task = dict(task)
    cursor.execute("SELECT * FROM submissions WHERE action_item_id = ? ORDER BY submitted_at DESC", (task_id,))
    task["submissions"] = [dict(s) for s in cursor.fetchall()]
    conn.close()
    return task


# ── Employee ──────────────────────────────────────────────────────────────────
@app.get("/my-tasks/{user_id}")
def get_my_tasks(user_id: int):
    return get_all_tasks(owner_id=user_id)


@app.post("/submit-task")
async def submit_task(
    action_item_id: int = Form(...),
    employee_id: int = Form(...),
    file: UploadFile = File(...)
):
    file_path = os.path.join(UPLOAD_DIR, f"submission_{action_item_id}_{file.filename}")
    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT task FROM action_items WHERE id = ?", (action_item_id,))
    task_row = cursor.fetchone()
    if not task_row:
        raise HTTPException(status_code=404, detail="Task not found.")
    task_description = task_row["task"]

    file_ext = os.path.splitext(file.filename)[1].lower()
    validation_prompt = f"""You are a task validation assistant.

Task description: "{task_description}"
Submitted file name: "{file.filename}"
File type: "{file_ext}"

Does this submission seem relevant to the task? Answer in JSON only:
{{"relevant": true, "reason": "short explanation"}}"""

    validation_response = lm_client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": validation_prompt}],
        max_tokens=100,
        temperature=0
    )

    raw = validation_response.choices[0].message.content.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    try:
        vr = json.loads(raw.strip())
        validation_flag = not vr.get("relevant", True)
        validation_note = vr.get("reason", "")
    except Exception:
        validation_flag = False
        validation_note = ""

    cursor.execute("""
        INSERT INTO submissions (action_item_id, employee_id, file_path, file_name, file_type, validation_flag, validation_note)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (action_item_id, employee_id, file_path, file.filename, file_ext, int(validation_flag), validation_note))
    cursor.execute("UPDATE action_items SET status = 'submitted' WHERE id = ?", (action_item_id,))
    conn.commit()

    employee = get_user_by_id(employee_id)
    for manager in get_all_managers():
        notify_task_submitted(
            to_email=manager["email"],
            manager_name=manager["name"],
            employee_name=employee["name"] if employee else "Employee",
            task=task_description,
            validation_flag=validation_flag,
            validation_note=validation_note
        )

    conn.close()
    return {
        "success": True,
        "validation_flag": validation_flag,
        "validation_note": validation_note,
        "message": f"⚠️ Warning: {validation_note}" if validation_flag else "✅ Submission looks good. Sent to manager for review."
    }


# ── Score endpoint (new) ──────────────────────────────────────────────────────
@app.get("/score/{user_id}")
def get_user_score(user_id: int):
    """Accountability score breakdown for a user."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id, name, email FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    cursor.execute("""
        SELECT
            COUNT(*) as total,
            SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
            SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) as submitted,
            SUM(CASE WHEN status = 'pending'  THEN 1 ELSE 0 END) as pending,
            AVG(accountability_score) as avg_score
        FROM action_items WHERE owner_id = ?
    """, (user_id,))
    stats = dict(cursor.fetchone())

    cursor.execute("""
        SELECT level, COUNT(*) as count
        FROM escalation_log WHERE employee_id = ?
        GROUP BY level
    """, (user_id,))
    escalations = {row["level"]: row["count"] for row in cursor.fetchall()}

    conn.close()
    return {
        "user": dict(user),
        "stats": stats,
        "escalations": escalations
    }


# ── Manager ───────────────────────────────────────────────────────────────────
@app.get("/pending-submissions")
def get_pending_submissions():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT s.*, ai.task, ai.priority, ai.deadline,
               u.name as employee_name, u.email as employee_email
        FROM submissions s
        JOIN action_items ai ON s.action_item_id = ai.id
        JOIN users u ON s.employee_id = u.id
        WHERE s.reviewed_at IS NULL
        ORDER BY s.submitted_at DESC
    """)
    submissions = [dict(s) for s in cursor.fetchall()]
    conn.close()
    return submissions


@app.post("/review-submission")
def review_submission(req: ApproveRequest):
    if req.action not in ("approved", "rejected"):
        raise HTTPException(status_code=400, detail="Action must be 'approved' or 'rejected'.")

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT s.*, ai.task, ai.owner_id, ai.accountability_score, ai.id as task_id
        FROM submissions s
        JOIN action_items ai ON s.action_item_id = ai.id
        WHERE s.id = ?
    """, (req.submission_id,))
    submission = cursor.fetchone()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found.")

    cursor.execute(
    "UPDATE submissions SET reviewed_at = ? WHERE id = ?",
    (datetime.now().isoformat(), req.submission_id)
)

    if req.action == "approved":
        new_score = min(100, submission["accountability_score"] + 10)
        cursor.execute(
            "UPDATE action_items SET status = 'approved', accountability_score = ? WHERE id = ?",
            (new_score, submission["task_id"])
        )
    else:
        cursor.execute(
    "UPDATE action_items SET status = 'rejected' WHERE id = ?",
    (submission["task_id"],)
)
        # Log correction signal for adaptive prompt
        if req.rejection_reason:
            cursor.execute("""
                INSERT INTO correction_signals (task_id, employee_id, rejection_reason, original_task)
                VALUES (?, ?, ?, ?)
            """, (submission["task_id"], submission["owner_id"], req.rejection_reason, submission["task"]))

    conn.commit()

    employee = get_user_by_id(submission["owner_id"])
    if employee:
        if req.action == "approved":
            notify_task_approved(employee["email"], employee["name"], submission["task"])
        else:
            notify_task_rejected(employee["email"], employee["name"], submission["task"])

    conn.close()
    return {"success": True, "action": req.action}


@app.get("/employees-status")
def get_employees_status():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, email FROM users WHERE role = 'employee'")
    employees = [dict(e) for e in cursor.fetchall()]
    for emp in employees:
        cursor.execute("""
            SELECT COUNT(*) as total,
                SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status = 'pending'  THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) as submitted,
                AVG(accountability_score) as avg_score
            FROM action_items WHERE owner_id = ?
        """, (emp["id"],))
        emp.update(dict(cursor.fetchone()))
    conn.close()
    return employees


@app.get("/leaderboard")
def get_leaderboard():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT u.id, u.name,
               AVG(ai.accountability_score) as avg_score,
               COUNT(ai.id) as total_tasks,
               SUM(CASE WHEN ai.status = 'approved' THEN 1 ELSE 0 END) as completed_tasks
        FROM users u
        LEFT JOIN action_items ai ON u.id = ai.owner_id
        WHERE u.role = 'employee'
        GROUP BY u.id
        ORDER BY avg_score DESC
    """)
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows


@app.get("/escalation-summary")
def get_escalation_summary():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT level, COUNT(*) as count FROM escalation_log GROUP BY level")
    summary = {row["level"]: row["count"] for row in cursor.fetchall()}
    conn.close()
    return {"L1": summary.get("L1", 0), "L2": summary.get("L2", 0), "L3": summary.get("L3", 0)}


# ── Pending review tasks (confidence flagged) ─────────────────────────────────
@app.get("/flagged-tasks")
def get_flagged_tasks():
    """Tasks flagged by confidence scoring — manager must approve before notification fires."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT ai.*, m.title as meeting_title
        FROM action_items ai
        JOIN meetings m ON ai.meeting_id = m.id
        WHERE ai.needs_review = 1 AND ai.status = 'pending'
        ORDER BY ai.created_at DESC
    """)
    tasks = [dict(t) for t in cursor.fetchall()]
    conn.close()
    return tasks


@app.post("/approve-flagged/{task_id}")
def approve_flagged_task(task_id: int):
    """Manager clears a confidence-flagged task — triggers notification."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE action_items SET needs_review = 0 WHERE id = ?", (task_id,)
    )
    cursor.execute("SELECT * FROM action_items WHERE id = ?", (task_id,))
    task = cursor.fetchone()
    conn.commit()
    conn.close()

    if task and task["owner_email"]:
        notify_task_assigned(
            to_email=task["owner_email"],
            employee_name=task["owner"],
            task=task["task"],
            deadline=task["deadline"] or "Not specified",
            priority=task["priority"]
        )

    return {"success": True, "task_id": task_id}


# ── Dev helpers ───────────────────────────────────────────────────────────────
@app.post("/test-escalation")
def test_escalation():
    run_escalation()
    return {"success": True, "message": "Escalation check triggered manually."}


@app.post("/test-refinement")
def test_refinement():
    from scheduler import run_prompt_refinement
    run_prompt_refinement()
    return {"success": True, "message": "Prompt refinement triggered manually."}


@app.get("/")
def health():
    return {"status": "MeetMind AI v2.0 running"}

