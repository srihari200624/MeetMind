import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

load_dotenv()

# Gmail SMTP config — loaded from .env
GMAIL_ADDRESS = os.environ.get("GMAIL_ADDRESS", "")
GMAIL_APP_PASSWORD = os.environ.get("GMAIL_APP_PASSWORD", "")
SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 587


def send_email(to_email: str, subject: str, body: str) -> bool:
    """Send a plain text email via Gmail SMTP."""
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"MeetMind AI <{GMAIL_ADDRESS}>"
        msg["To"] = to_email

        msg.attach(MIMEText(body, "plain"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.login(GMAIL_ADDRESS, GMAIL_APP_PASSWORD)
            server.sendmail(GMAIL_ADDRESS, to_email, msg.as_string())

        print(f"Email sent to {to_email}: {subject}")
        return True

    except Exception as e:
        print(f"Failed to send email to {to_email}: {e}")
        return False


def notify_task_assigned(to_email: str, employee_name: str, task: str, deadline: str, priority: str) -> bool:
    """Notify employee of a newly assigned task."""
    subject = f"[MeetMind] New Task Assigned: {task[:50]}"
    body = f"""Hi {employee_name},

A new task has been assigned to you from a recent meeting.

Task      : {task}
Priority  : {priority.upper()}
Deadline  : {deadline if deadline else 'Not specified'}

Please log in to MeetMind to view your task and submit your completed work.

This is an automated message from MeetMind AI.
"""
    return send_email(to_email, subject, body)


def notify_task_submitted(to_email: str, manager_name: str, employee_name: str, task: str, validation_flag: bool, validation_note: str = "") -> bool:
    """Notify manager that an employee has submitted work."""
    subject = f"[MeetMind] Submission Ready for Review: {task[:50]}"
    flag_note = f"\n⚠️  AI Validation Warning: {validation_note}" if validation_flag else "\n✅ AI Validation: Submission looks relevant to the task."
    body = f"""Hi {manager_name},

{employee_name} has submitted work for the following task and it is ready for your review.

Task      : {task}
Employee  : {employee_name}
{flag_note}

Please log in to MeetMind to review and approve or reject the submission.

This is an automated message from MeetMind AI.
"""
    return send_email(to_email, subject, body)


def notify_task_approved(to_email: str, employee_name: str, task: str) -> bool:
    """Notify employee that their submission was approved."""
    subject = f"[MeetMind] Task Approved: {task[:50]}"
    body = f"""Hi {employee_name},

Great news! Your submission for the following task has been approved.

Task      : {task}

Your accountability score has been updated. Keep up the great work!

This is an automated message from MeetMind AI.
"""
    return send_email(to_email, subject, body)


def notify_task_rejected(to_email: str, employee_name: str, task: str) -> bool:
    """Notify employee that their submission was rejected."""
    subject = f"[MeetMind] Task Rejected — Resubmission Required: {task[:50]}"
    body = f"""Hi {employee_name},

Your submission for the following task has been reviewed and requires resubmission.

Task      : {task}

Please log in to MeetMind, review the feedback, and resubmit your work before the deadline.

This is an automated message from MeetMind AI.
"""
    return send_email(to_email, subject, body)


def notify_escalation(to_email: str, name: str, task: str, level: str, days_overdue: int, score: int) -> bool:
    """Send escalation email based on L1/L2/L3 level."""
    if level == "L1":
        subject = f"[MeetMind] Reminder: Task Due — {task[:50]}"
        body = f"""Hi {name},

This is a friendly reminder that the following task is overdue by {days_overdue} day(s).

Task              : {task}
Days Overdue      : {days_overdue}
Accountability Score : {score}/100

Please log in to MeetMind and submit your completed work as soon as possible.

This is an automated message from MeetMind AI.
"""

    elif level == "L2":
        subject = f"[MeetMind] Action Required: Overdue Task — {task[:50]}"
        body = f"""Hi {name},

Your task is now {days_overdue} day(s) overdue and your accountability score has dropped to {score}/100.

Task              : {task}
Days Overdue      : {days_overdue}
Accountability Score : {score}/100

Your manager has been notified. Please submit your work immediately.

This is an automated message from MeetMind AI.
"""

    elif level == "L3":
        subject = f"[MeetMind] URGENT: Escalation Required — {task[:50]}"
        body = f"""Hi {name},

URGENT: Your task is critically overdue by {days_overdue} day(s) and your accountability score has dropped to {score}/100.

Task              : {task}
Days Overdue      : {days_overdue}
Accountability Score : {score}/100

This issue has been escalated to your team lead. Immediate action is required.

This is an automated message from MeetMind AI.
"""
    else:
        return False

    return send_email(to_email, subject, body)


# ── Quick test ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("Testing task assignment email...")
    notify_task_assigned(
        to_email="meetmind.test@gmail.com",
        employee_name="Reno Red",
        task="Finish the API integration",
        deadline="2026-03-28",
        priority="high"
    )
    print("Done. Check meetmind.test@gmail.com inbox.")