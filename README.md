# MeetMind AI 
> **"We don't transcribe meetings. We finish them."**

MeetMind is a fully local, autonomous meeting intelligence platform that converts raw meeting audio into assigned tasks, tracks completion, escalates overdue work, and gets smarter over time — all on a single machine with zero cloud dependencies.

Built for **StudAI Foundry 2026** by Hari, Renorad, Mukil Dharan & Bala Ashwath.

---

## What It Does

1. Manager uploads meeting audio (or drops it in a watch folder)
2. **pyannote.audio** diarises speakers
3. **Faster-Whisper** transcribes the audio (GPU accelerated)
4. **Qwen2.5-VL-7b** extracts action items with confidence scoring
5. Low-confidence extractions are held in a review queue — no notification fires until a human confirms
6. Tasks are assigned to employees and stored in local SQLite
7. Employees log in, view tasks, and upload completed work
8. AI validates submission relevance before it reaches the manager
9. Manager approves or rejects — rejections feed the adaptive prompt refinement pipeline
10. **APScheduler** runs hourly L1/L2/L3 escalation logic
11. All notifications delivered via **MailHog** (local, zero external dependencies)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI + Python |
| Frontend | React + Vite |
| Transcription | Faster-Whisper (GPU) |
| Diarisation | pyannote.audio |
| Task Extraction | Qwen2.5-VL-7b via LM Studio |
| Database | SQLite |
| Notifications | MailHog (local SMTP) |
| Scheduling | APScheduler |

---

## Prerequisites

Before running MeetMind, install the following:

- Python 3.11+
- Node.js 18+
- [LM Studio](https://lmstudio.ai/) with `qwen/qwen2.5-vl-7b` loaded and local server running on port 1234
- [MailHog](https://github.com/mailhog/MailHog/releases) — download `MailHog_windows_amd64.exe` and run it
- A CUDA-capable GPU (recommended for Faster-Whisper)

---

## Setup

### 1. Clone the repo

```bash
git clone https://github.com/srihari200624/MeetMind.git
cd MeetMind
```

### 2. Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux

pip install -r ../requirements.txt
```

### 3. Frontend

```bash
cd ../frontend
npm install
```

---

## Running the App

Open **4 terminals**:

**Terminal 1 — LM Studio**
- Open LM Studio, load `qwen/qwen2.5-vl-7b`, start the local server on port 1234

**Terminal 2 — MailHog**
```bash
MailHog_windows_amd64.exe
```
View inbox at: http://localhost:8025

**Terminal 3 — Backend**
```bash
cd backend
venv\Scripts\activate
uvicorn main:app --reload
```
API runs at: http://127.0.0.1:8000
Swagger docs: http://127.0.0.1:8000/docs

**Terminal 4 — Frontend**
```bash
cd frontend
npm run dev
```
App runs at: http://localhost:5173

---

## Demo Credentials

| Role | Employee ID | Password | Name |
|---|---|---|---|
| Manager | MGR001 | manager123 | Hari |
| Employee | EMP001 | emp001pass | Reno Red |
| Employee | EMP002 | emp002pass | Mukil Dharan |
| Employee | EMP003 | emp003pass | Bala Ashwath |

---

## Demo Flow

1. Login as **MGR001**
2. Upload `sample.ogg` (included in repo) via the Manager Dashboard
3. Watch the pipeline: diarisation → transcription → extraction → confidence scoring
4. Go to **Confidence Queue** — review and confirm flagged tasks
5. Check **http://localhost:8025** — notification email fired
6. Login as **EMP001** — task is assigned
7. Click the task → upload any file as work submission
8. Back to Manager → **Pending Approvals** → Approve
9. Check **Leaderboard** — score updated in real time

---

## Project Structure

```
MeetMind/
├── backend/
│   ├── main.py          # FastAPI app, all routes
│   ├── database.py      # SQLite schema + init
│   ├── transcribe.py    # pyannote + Faster-Whisper pipeline
│   ├── extract.py       # Qwen2.5 task extraction + confidence scoring
│   ├── auth.py          # Login + user management
│   ├── notify.py        # MailHog email notifications
│   ├── scheduler.py     # APScheduler escalation jobs
│   └── uploads/         # Audio files + submissions stored here
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── LoginPage.jsx
│       │   ├── ManagerDashboard.jsx
│       │   └── EmployeeDashboard.jsx
│       └── components/
│           ├── TaskModal.jsx
│           └── UI.jsx
├── sample.ogg           # Sample meeting audio for demo
├── requirements.txt
└── README.md
```

---

## Key Constants

| Setting | Value |
|---|---|
| LM Studio URL | http://127.0.0.1:1234/v1 |
| Confidence threshold | 70% |
| Backend | http://127.0.0.1:8000 |
| Frontend | http://localhost:5173 |
| MailHog UI | http://localhost:8025 |

---

## Current Limitations

- Folder watcher (auto-ingest) not yet implemented — manual upload only
- Weekly prompt refinement job is scaffolded but not yet active
- Escalations tab uses mock data — live DB wiring in progress
- Local deployment only — requires LM Studio and MailHog running on the same machine

---

## Team

**Hari · Renorad · Mukil Dharan · Bala Ashwath**
Chennai · March 2026

---

*MeetMind AI · StudAI Foundry 2026 · SRMIST Grand Finale*