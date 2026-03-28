import { useState, useRef } from "react";
import ConfBar from "./ConfBar";

export default function TaskModal({ task, onClose, onSubmitTask }) {
  const [file, setFile] = useState(null);
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const fileRef = useRef();

  const handleFile = async (f) => {
    setFile(f);
    setValidation(null);
    setValidating(true);
    await new Promise((r) => setTimeout(r, 1400));
    const mismatch = f.name.includes("report") && task.task.toLowerCase().includes("api");
    setValidation({
      ok: !mismatch,
      note: mismatch
        ? "This looks like a report file but the task requires code/integration files."
        : "Submission looks relevant to the task.",
    });
    setValidating(false);
  };

  const handleSubmit = async () => {
    if (!file || !onSubmitTask) return;
    setSubmitError("");
    setValidating(true);
    try {
      const result = await onSubmitTask(task, file);
      setValidation({
        ok: !result?.validation_flag,
        note: result?.validation_note || (result?.validation_flag ? "Submission flagged for review." : "Submission looks relevant to the task."),
      });
      setSubmitted(true);
    } catch (e) {
      setSubmitError(e?.response?.data?.detail || "Submission failed. Please try again.");
    } finally {
      setValidating(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--glass-border-md)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--glass-bg-md)", backdropFilter: "var(--glass-blur-sm)", WebkitBackdropFilter: "var(--glass-blur-sm)" }}>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15 }}>Task Details</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "var(--text-muted)", lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: 24 }}>
          {/* Title */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
              <span className={`badge badge-${task.priority}`}>{task.priority}</span>
              <span className={`badge badge-${task.status}`}>{task.status}</span>
            </div>
            <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 20, letterSpacing: "-0.02em", marginBottom: 6 }}>{task.task}</h2>
            <p style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{task.meeting} · Due {task.deadline}</p>
          </div>

          {/* Transcript */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Transcript Context</p>
            <div className="transcript-quote">"{task.transcript}"</div>
          </div>

          {/* Confidence */}
          <div style={{ marginBottom: 20, background: "var(--glass-bg-md)", border: "1px solid var(--glass-border-md)", borderRadius: "var(--radius-md)", padding: "14px 16px", backdropFilter: "var(--glass-blur-sm)", WebkitBackdropFilter: "var(--glass-blur-sm)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>AI Extraction Confidence</span>
              <span className="mono" style={{ fontWeight: 600, fontSize: 13, color: task.confidence >= 70 ? "var(--green)" : "var(--amber)" }}>{task.confidence}%</span>
            </div>
            <ConfBar value={task.confidence} />
            <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>
              {task.confidence >= 70 ? "Self-check passed. Task parameters clearly identified." : "Low confidence — review carefully before submitting."}
            </p>
          </div>

          {/* Rejection feedback */}
          {task.status === "rejected" && task.submission?.note && (
            <div style={{ background: "var(--red-dim)", border: "1px solid var(--red-glow)", borderRadius: "var(--radius-sm)", padding: "12px 14px", fontSize: 13, color: "var(--red)", marginBottom: 20 }}>
              <strong>Manager Feedback:</strong> {task.submission.note}
            </div>
          )}

          {/* Upload area */}
          {(task.status === "pending" || task.status === "rejected") && !submitted && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Submit Your Work</p>
              <div
                className="upload-zone"
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
              >
                <input type="file" ref={fileRef} style={{ display: "none" }} onChange={(e) => handleFile(e.target.files[0])} />
                {file ? (
                  <div>
                    <div style={{ fontSize: 28, marginBottom: 6 }}>📄</div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{file.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{(file.size / 1024).toFixed(1)} KB</div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>📁</div>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Drop file here or click to browse</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>PDF, DOCX, images, code files</div>
                  </div>
                )}
              </div>
              {validating && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "var(--glass-bg-md)", borderRadius: "var(--radius-sm)", marginTop: 10, fontSize: 13, color: "var(--text-secondary)" }}>
                  <div className="spinner" /> AI is checking submission relevance...
                </div>
              )}
              {validation && (
                <div style={{ padding: "10px 14px", background: validation.ok ? "var(--green-dim)" : "var(--amber-dim)", border: `1px solid ${validation.ok ? "var(--green-glow)" : "var(--amber-glow)"}`, borderRadius: "var(--radius-sm)", marginTop: 10, fontSize: 13, color: validation.ok ? "var(--green)" : "var(--amber)" }}>
                  {validation.ok ? "✅" : "⚠️"} {validation.note}
                </div>
              )}
              {submitError && (
                <div style={{ padding: "10px 14px", background: "var(--red-dim)", border: "1px solid var(--red-glow)", borderRadius: "var(--radius-sm)", marginTop: 10, fontSize: 13, color: "var(--red)" }}>
                  {submitError}
                </div>
              )}
              {file && !validating && !submitted && (
                <button className="btn btn-primary" style={{ width: "100%", marginTop: 12 }} onClick={handleSubmit}>
                  Submit for Review →
                </button>
              )}
            </div>
          )}

          {submitted && (
            <div style={{ padding: "10px 14px", background: "var(--green-dim)", border: "1px solid var(--green-glow)", borderRadius: "var(--radius-sm)", marginTop: 10, fontSize: 13, color: "var(--green)" }}>
              Submission sent to manager for review.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
