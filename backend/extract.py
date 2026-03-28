import os
import json
from openai import OpenAI
from database import get_connection

# LM Studio client
client = OpenAI(base_url="http://127.0.0.1:1234/v1", api_key="lm-studio")
MODEL = "qwen/qwen2.5-vl-7b"

CONFIDENCE_THRESHOLD = 70
PROMPT_FILE = os.path.join(os.path.dirname(__file__), "extraction_prompt.txt")


def load_extraction_prompt() -> str | None:
    """Load refined prompt from file if it exists."""
    if os.path.exists(PROMPT_FILE):
        with open(PROMPT_FILE, "r", encoding="utf-8") as f:
            return f.read().strip()
    return None


def get_all_users() -> list:
    """Fetch all users from DB for owner matching."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, email FROM users")
    users = [dict(u) for u in cursor.fetchall()]
    conn.close()
    return users


def get_recent_corrections(limit: int = 5) -> list:
    """Fetch the most recent correction signals for adaptive prompt injection."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT original_task, rejection_reason
        FROM correction_signals
        ORDER BY created_at DESC
        LIMIT ?
    """, (limit,))
    corrections = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return corrections


def build_correction_context(corrections: list) -> str:
    """Format corrections into a prompt snippet."""
    if not corrections:
        return ""
    lines = ["Recent extraction mistakes to avoid:"]
    for i, c in enumerate(corrections, 1):
        reason = c.get("rejection_reason", "").strip()
        task = c.get("original_task", "").strip()
        lines.append(f"  {i}. Task \"{task}\" was rejected — reason: {reason}")
    return "\n".join(lines)


def fuzzy_match_owner(owner_name: str, users: list) -> dict | None:
    """Match extracted owner name to a user in the DB."""
    owner_lower = owner_name.lower().strip()

    for user in users:
        if user["name"].lower() == owner_lower:
            return user

    for user in users:
        name_parts = user["name"].lower().split()
        if any(part in owner_lower for part in name_parts):
            return user

    for user in users:
        if owner_lower in user["name"].lower() or user["name"].lower() in owner_lower:
            return user

    return None


def score_task_confidence(task: dict, transcript: str) -> int:
    """
    Ask Qwen to score confidence (0-100) for a single extracted task.
    Returns integer score.
    """
    prompt = f"""You are a quality checker for meeting action item extraction.

Given this transcript excerpt and extracted task, score how confident you are (0–100) that:
- The task is genuinely an action item (not a comment or observation)
- The owner is correctly identified
- The deadline (if any) is accurate

Return ONLY a JSON object with a single key "score". No explanation, no markdown.

Example: {{"score": 85}}

Transcript:
{transcript}

Extracted task:
{json.dumps(task)}"""

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=50,
            temperature=0
        )
        raw = response.choices[0].message.content.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        result = json.loads(raw.strip())
        return int(result.get("score", 50))
    except Exception as e:
        print(f"Confidence scoring failed for task '{task.get('task', '')}': {e}")
        return 50  # Default to mid-confidence on failure


def extract_action_items(transcript: str) -> list:
    """
    Send transcript to Qwen2.5 via LM Studio.
    Returns list of action items with confidence scores and review flags.
    """
    users = get_all_users()
    user_names = ", ".join([u["name"] for u in users])

    corrections = get_recent_corrections()
    correction_context = build_correction_context(corrections)

    refined_prompt = load_extraction_prompt()
    prompt = refined_prompt.format(
        user_names=user_names,
        correction_context=f"\n{correction_context}" if correction_context else "",
        transcript=transcript
    ) if refined_prompt else f"""You are an AI meeting assistant. Read the following meeting transcript carefully and extract all action items.

Known team members: {user_names}

For each action item, extract:
- task: clear description of what needs to be done
- owner: name of the person responsible (must be one of the known team members)
- deadline: deadline if mentioned, otherwise null
- priority: "high", "medium", or "low" based on urgency and importance

Return ONLY a valid JSON array. No explanation, no markdown, no extra text.

Example format:
[
  {{
    "task": "Prepare the Q4 budget report",
    "owner": "Reno Red",
    "deadline": "2026-03-30",
    "priority": "high"
  }}
]
{f'''
{correction_context}
''' if correction_context else ""}
Transcript:
{transcript}"""  # noqa - end of fallback prompt

    response = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=1000,
        temperature=0
    )

    raw = response.choices[0].message.content.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    try:
        items = json.loads(raw)
    except json.JSONDecodeError:
        print(f"Failed to parse JSON from LLM response:\n{raw}")
        return []

    enriched = []
    for item in items:
        matched_user = fuzzy_match_owner(item.get("owner", ""), users)

        confidence = score_task_confidence(item, transcript)
        needs_review = confidence < CONFIDENCE_THRESHOLD

        enriched.append({
            "task": item.get("task", ""),
            "owner": item.get("owner", ""),
            "owner_id": matched_user["id"] if matched_user else None,
            "owner_email": matched_user["email"] if matched_user else None,
            "deadline": item.get("deadline"),
            "priority": item.get("priority", "medium"),
            "confidence": confidence,
            "needs_review": needs_review
        })

    flagged = sum(1 for i in enriched if i["needs_review"])
    if flagged:
        print(f"[extract] {flagged}/{len(enriched)} task(s) flagged for manager review (confidence < {CONFIDENCE_THRESHOLD})")

    return enriched


def save_meeting_and_items(title: str, summary: str, transcript: str, action_items: list, manager_id: int, speaker_count: int = 0, speakers: str = "[]") -> int:
    """Save meeting and action items to SQLite. Returns meeting ID."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO meetings (title, summary, transcript, manager_id, speaker_count, speakers)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (title, summary, transcript, manager_id, speaker_count, speakers))
    meeting_id = cursor.lastrowid

    for item in action_items:
        cursor.execute("""
            INSERT INTO action_items
                (meeting_id, task, owner, owner_id, deadline, priority, confidence, needs_review)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            meeting_id,
            item["task"],
            item["owner"],
            item["owner_id"],
            item["deadline"],
            item["priority"],
            item.get("confidence", 50),
            1 if item.get("needs_review") else 0
        ))

    conn.commit()
    conn.close()
    return meeting_id


def generate_summary(transcript: str) -> str:
    """Generate a short meeting summary using Qwen2.5."""
    response = client.chat.completions.create(
        model=MODEL,
        messages=[{
            "role": "user",
            "content": f"Summarize this meeting transcript in 2-3 sentences:\n\n{transcript}"
        }],
        max_tokens=200,
        temperature=0.3
    )
    return response.choices[0].message.content.strip()


# ── Quick test ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    test_transcript = """
    Hari: Alright team, let's go through the tasks for this sprint.
    Reno Red, can you finish the API integration by March 28?
    Reno Red: Sure, I'll get it done.
    Hari: Mukil Dharan, please prepare the pitch deck for the demo, high priority.
    Mukil Dharan: Got it, I'll have it ready by March 27.
    Hari: Bala Ashwath, write the test cases for the submission module by March 29.
    Bala Ashwath: No problem.
    """

    print("Extracting action items...")
    items = extract_action_items(test_transcript)
    for item in items:
        flag = " ⚠ NEEDS REVIEW" if item["needs_review"] else ""
        print(f"[{item['confidence']:3d}%]{flag} {item}")

    print("\nGenerating summary...")
    summary = generate_summary(test_transcript)
    print(summary)