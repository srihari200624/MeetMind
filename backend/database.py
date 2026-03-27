"""
MeetMind AI — database.py
SQLite in WAL mode. All tables for the full autonomous pipeline.
Run directly to initialise: python database.py
"""

import sqlite3
import os
import hashlib

DB_PATH = os.path.join(os.path.dirname(__file__), "meetmind.db")

def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row          # access columns by name
    conn.execute("PRAGMA journal_mode=WAL") # WAL mode — concurrent reads + writes
    conn.execute("PRAGMA foreign_keys=ON")  # enforce FK constraints
    return conn


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def init_db():
    conn = get_connection()
    c = conn.cursor()

    # ── Users ────────────────────────────────────────────────────────────────
    c.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id     TEXT    UNIQUE NOT NULL,
            name            TEXT    NOT NULL,
            email           TEXT    NOT NULL,
            password_hash   TEXT    NOT NULL,
            role            TEXT    NOT NULL CHECK(role IN ('manager','employee')),
            accountability_score INTEGER DEFAULT 50,
            created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # ── Meetings ─────────────────────────────────────────────────────────────
    c.execute("""
        CREATE TABLE IF NOT EXISTS meetings (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            title           TEXT    NOT NULL,
            audio_filename  TEXT,
            transcript      TEXT,
            summary         TEXT,
            manager_id      INTEGER NOT NULL REFERENCES users(id),
            created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # ── Tasks (action items extracted from meetings) ──────────────────────────
    c.execute("""
        CREATE TABLE IF NOT EXISTS tasks (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            meeting_id      INTEGER NOT NULL REFERENCES meetings(id),
            task_description TEXT   NOT NULL,
            owner_id        INTEGER REFERENCES users(id),
            owner_name      TEXT,               -- raw name from LLM, before matching
            deadline        DATE,
            priority        TEXT    DEFAULT 'medium' CHECK(priority IN ('high','medium','low')),
            confidence INTEGER DEFAULT 50,
            needs_review INTEGER DEFAULT 0,
            status          TEXT    DEFAULT 'pending'
                                    CHECK(status IN ('pending','submitted','approved','rejected')),
            confidence_score INTEGER DEFAULT 100, -- 0-100, Qwen self-check
            low_confidence  INTEGER DEFAULT 0,    -- 1 = held in queue for manager review
            escalation_level INTEGER DEFAULT 0,   -- 0=none, 1=L1, 2=L2, 3=L3
            created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # ── Submissions (employee work uploads) ───────────────────────────────────
    c.execute("""
        CREATE TABLE IF NOT EXISTS submissions (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id         INTEGER NOT NULL REFERENCES tasks(id),
            employee_id     INTEGER NOT NULL REFERENCES users(id),
            filename        TEXT    NOT NULL,
            filepath        TEXT    NOT NULL,
            filetype        TEXT,
            validation_score INTEGER,           -- 0-100, Qwen context check
            validation_flag  INTEGER DEFAULT 0, -- 1 = mismatch warning
            validation_note  TEXT,
            manager_note    TEXT,               -- rejection reason from manager
            submitted_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # ── Correction signals (manager edits + rejections → feed adaptive prompt) ─
    c.execute("""
        CREATE TABLE IF NOT EXISTS correction_signals (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id         INTEGER REFERENCES tasks(id),
            meeting_id      INTEGER REFERENCES meetings(id),
            signal_type     TEXT    NOT NULL
                                    CHECK(signal_type IN ('rejection','edit','low_confidence')),
            original_text   TEXT,   -- what LLM extracted
            corrected_text  TEXT,   -- what manager changed it to (NULL for rejection)
            rejection_reason TEXT,
            created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # ── Escalation log (every L1/L2/L3 event fired by scheduler) ─────────────
    c.execute("""
        CREATE TABLE IF NOT EXISTS escalation_log (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id         INTEGER NOT NULL REFERENCES tasks(id),
            employee_id     INTEGER NOT NULL REFERENCES users(id),
            level           TEXT    NOT NULL CHECK(level IN ('L1','L2','L3')),
            fired_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # ── Score history (snapshot per score change event) ───────────────────────
    c.execute("""
        CREATE TABLE IF NOT EXISTS score_history (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id     INTEGER NOT NULL REFERENCES users(id),
            score           INTEGER NOT NULL,
            reason          TEXT,   -- e.g. "approved", "overdue -5", "L2 escalation"
            recorded_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # ── Prompt refinement log (weekly adaptive job) ───────────────────────────
    c.execute("""
        CREATE TABLE IF NOT EXISTS prompt_refinements (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            signals_used    INTEGER,            -- how many correction signals consumed
            old_prompt      TEXT,
            new_prompt      TEXT,
            refined_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # ── Indexes for common queries ────────────────────────────────────────────
    c.execute("CREATE INDEX IF NOT EXISTS idx_tasks_owner   ON tasks(owner_id)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_tasks_meeting ON tasks(meeting_id)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_tasks_status  ON tasks(status)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_subs_task     ON submissions(task_id)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_signals_meeting ON correction_signals(meeting_id)")

    conn.commit()
    conn.close()
    print("✅ Database initialised successfully.")
    print(f"   Location: {DB_PATH}")
    print(f"   Mode: WAL (concurrent reads + writes enabled)")


def seed_users():
    """
    Seed the four team members.
    Safe to run multiple times — skips existing employee IDs.
    """
    users = [
        ("MGR001", "Hari",         "meetmind.test@gmail.com", "manager123",  "manager"),
        ("EMP001", "Reno Red",     "meetmind.test@gmail.com", "emp001pass",  "employee"),
        ("EMP002", "Mukil Dharan", "meetmind.test@gmail.com", "emp002pass",  "employee"),
        ("EMP003", "Bala Ashwath", "meetmind.test@gmail.com", "emp003pass",  "employee"),
    ]

    conn = get_connection()
    c = conn.cursor()

    for emp_id, name, email, password, role in users:
        existing = c.execute(
            "SELECT id FROM users WHERE employee_id = ?", (emp_id,)
        ).fetchone()

        if existing:
            print(f"   ⚠️  {name} ({emp_id}) already exists — skipped.")
        else:
            c.execute("""
                INSERT INTO users (employee_id, name, email, password_hash, role)
                VALUES (?, ?, ?, ?, ?)
            """, (emp_id, name, email, hash_password(password), role))
            print(f"   ✅ {name} ({role}) created.")

    conn.commit()
    conn.close()


if __name__ == "__main__":
    print("\n── MeetMind Database Setup ──────────────────────────────")
    init_db()
    print("\n── Seeding users ────────────────────────────────────────")
    seed_users()
    print("\n── Done. Run: python auth.py to verify login works. ─────\n")