import os
import warnings
warnings.filterwarnings("ignore", category=UserWarning)

import torch
import soundfile as sf
from faster_whisper import WhisperModel
from pyannote.audio import Pipeline

# ── Load models once at startup ───────────────────────────────────────────────
print("Loading Faster-Whisper model...")
whisper_model = WhisperModel("base", device="cuda", compute_type="float16")
print("Faster-Whisper ready.")

print("Loading pyannote speaker diarisation pipeline...")
diarisation_pipeline = Pipeline.from_pretrained(
    "pyannote/speaker-diarization-3.1",
    token="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"
)
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
diarisation_pipeline.to(device)
print("pyannote ready.")


def get_employee_names() -> str:
    from database import get_connection
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM users")
    names = [row["name"] for row in cursor.fetchall()]
    conn.close()
    return ", ".join(names)


def transcribe_audio(file_path: str) -> dict:
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Audio file not found: {file_path}")

    # ── Step 1: Speaker diarisation ──────────────────────────────────────────
    print(f"Running speaker diarisation on {file_path}...")
    audio_data, sample_rate = sf.read(file_path, dtype="float32", always_2d=True)
    waveform = torch.from_numpy(audio_data.T)
    diarisation = diarisation_pipeline({"waveform": waveform, "sample_rate": sample_rate})

    speaker_segments = []
    for segment, track, speaker in diarisation.speaker_diarization.itertracks(yield_label=True):
        speaker_segments.append({
            "start": round(segment.start, 2),
            "end":   round(segment.end, 2),
            "speaker": speaker
        })

    # ── Step 2: Transcription ─────────────────────────────────────────────────
    print("Transcribing audio...")
    names = get_employee_names()
    prompt = f"Participants may include: {names}. MeetMind meeting transcript."

    segments, info = whisper_model.transcribe(
        file_path,
        beam_size=5,
        initial_prompt=prompt,
        word_timestamps=True
    )

    # ── Step 3: Align transcript with speaker labels ──────────────────────────
    def get_speaker_for_time(t):
        for seg in speaker_segments:
            if seg["start"] <= t <= seg["end"]:
                return seg["speaker"]
        return "UNKNOWN"

    transcript_parts = []
    current_speaker = None
    current_text = []

    for segment in segments:
        mid_time = (segment.start + segment.end) / 2
        speaker = get_speaker_for_time(mid_time)
        text = segment.text.strip()

        if speaker != current_speaker:
            if current_speaker and current_text:
                transcript_parts.append(f"{current_speaker}: {' '.join(current_text)}")
            current_speaker = speaker
            current_text = [text]
        else:
            current_text.append(text)

    if current_speaker and current_text:
        transcript_parts.append(f"{current_speaker}: {' '.join(current_text)}")

    full_transcript = "\n".join(transcript_parts)

    return {
        "transcript": full_transcript,
        "language": info.language,
        "duration": round(info.duration, 2),
        "speaker_count": len(set(s["speaker"] for s in speaker_segments)),
        "speaker_segments": speaker_segments
    }


# ── Quick test ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python transcribe.py <path_to_audio_file>")
    else:
        result = transcribe_audio(sys.argv[1])
        print(f"Language  : {result['language']}")
        print(f"Duration  : {result['duration']}s")
        print(f"Speakers  : {result['speaker_count']}")
        print(f"Transcript:\n{result['transcript']}")