import os
import time
import threading
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

WATCH_FOLDER = r"C:\Users\tsuja\meetmind\watch_folder"
SUPPORTED_EXTENSIONS = {".ogg", ".mp3", ".wav"}

# Avoid processing the same file twice
_processed = set()
_lock = threading.Lock()

class MeetingHandler(FileSystemEventHandler):
    def on_created(self, event):
        if event.is_directory:
            return

        path = event.src_path
        ext = os.path.splitext(path)[1].lower()

        if ext not in SUPPORTED_EXTENSIONS:
            return

        with _lock:
            if path in _processed:
                return
            _processed.add(path)

        # Small delay to ensure file is fully written before reading
        time.sleep(2)

        print(f"[Watcher] New meeting file detected: {path}")
        _process_meeting(path)


def _process_meeting(file_path: str):
    # Import here to avoid circular imports at module load time
    from transcribe import transcribe_audio
    from extract import extract_action_items, save_meeting_and_items, generate_summary
    from notify import notify_task_assigned
    from database import get_connection

    try:
        title = os.path.basename(file_path)
        print(f"[Watcher] Transcribing {title}...")
        transcription = transcribe_audio(file_path)
        transcript = transcription["transcript"]

        print(f"[Watcher] Extracting tasks...")
        action_items = extract_action_items(transcript)
        summary = generate_summary(transcript)

        # Use manager id=1 (Hari) as default for auto-ingested meetings
        meeting_id = save_meeting_and_items(title, summary, transcript, action_items, manager_id=1)
        print(f"[Watcher] Saved meeting #{meeting_id} with {len(action_items)} tasks.")

        for item in action_items:
            if item.get("owner_email") and not item.get("needs_review"):
                notify_task_assigned(
                    to_email=item["owner_email"],
                    employee_name=item["owner"],
                    task=item["task"],
                    deadline=item["deadline"] or "Not specified",
                    priority=item["priority"]
                )

    except Exception as e:
        print(f"[Watcher] Error processing {file_path}: {e}")


def start_watcher():
    os.makedirs(WATCH_FOLDER, exist_ok=True)
    observer = Observer()
    observer.schedule(MeetingHandler(), WATCH_FOLDER, recursive=False)
    observer.start()
    print(f"[Watcher] Watching {WATCH_FOLDER} for new meetings...")
    return observer