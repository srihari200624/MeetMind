import { useState, useRef } from "react";
import { ConfBar } from "../components/UI";

// To wire to real API (Step E):
//   import api from '../api/client';
//   In handleSubmit: await api.submitTask(task.id, file, note);

export default function TaskModal({ task, onClose }) {
  const [file, setFile] = useState(null);
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const fileRef = useRef();

  const handleFile = async (f) => {
    setFile(f);
    setValidation(null);
    setValidating(true);
    await new Promise(r => setTimeout(r, 1400));
    // ── MOCK VALIDATION — replace with api.submitTask() ──
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
  if (submitted) return; // prevent double submit
  setSubmitted(true);
  const fd = new FormData();
  fd.append("action_item_id", task.id);
  fd.append("employee_id", task.owner_id);
  fd.append("file", file);
  try {
    await fetch("http://127.0.0.1:8000/submit-task", {
      method: "POST", body: fd
    });
  } catch (err) {
    console.error(err);
  }
  onClose();
};

  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal-box">
        <div style={{ padding:"20px 24px", borderBottom:"1px solid var(--border)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:16 }}>Task Details</span>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", fontSize:22, color:"var(--text-muted)", lineHeight:1 }}>×</button>
        </div>
        <div style={{ padding:24 }}>
          <div style={{ marginBottom:20 }}>
            <div style={{ display:"flex", gap:6, marginBottom:10 }}>
              <span className={`badge badge-${task.priority}`}>{task.priority}</span>
              <span className={`badge badge-${task.status}`}>{task.status}</span>
            </div>
            <h2 style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:20, letterSpacing:"-0.02em", marginBottom:6 }}>{task.task}</h2>
            <p style={{ fontSize:13, color:"var(--text-muted)" }}>{task.meeting} · Due {task.deadline}</p>
          </div>

          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:12, fontWeight:600, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Transcript Context</div>
            <div className="transcript-quote">"{task.transcript}"</div>
          </div>

          <div style={{ marginBottom:20, background:"var(--bg-secondary)", borderRadius:"var(--radius-md)", padding:"14px 16px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
              <span style={{ fontSize:13, fontWeight:500 }}>AI Extraction Confidence</span>
              <span style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:14, color: task.confidence>=70 ? "var(--green)" : "var(--amber)" }}>{task.confidence}%</span>
            </div>
            <ConfBar value={task.confidence} />
            <p style={{ fontSize:11, color:"var(--text-muted)", marginTop:6 }}>
              {task.confidence>=70 ? "Self-check passed. Task parameters clearly identified." : "Low confidence — review task carefully."}
            </p>
          </div>

          {task.status==="rejected" && task.submission?.note && (
            <div style={{ background:"var(--red-bg)", border:"1px solid var(--red-border)", borderRadius:"var(--radius-sm)", padding:"12px 14px", fontSize:13, color:"var(--red)", marginBottom:20 }}>
              <strong>Manager Feedback:</strong> {task.submission.note}
            </div>
          )}

          {(task.status==="pending"||task.status==="rejected") && !submitted && (
            <div>
              <div style={{ fontSize:12, fontWeight:600, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:10 }}>Submit Your Work</div>
              <div className="upload-zone"
                onClick={() => fileRef.current?.click()}
                onDragOver={e=>e.preventDefault()}
                onDrop={e=>{e.preventDefault();handleFile(e.dataTransfer.files[0]);}}
              >
                <input type="file" ref={fileRef} style={{ display:"none" }} onChange={e=>handleFile(e.target.files[0])} />
                {file ? (
                  <div>
                    <div style={{ fontSize:28, marginBottom:6 }}>📄</div>
                    <div style={{ fontWeight:600, fontSize:14 }}>{file.name}</div>
                    <div style={{ fontSize:12, color:"var(--text-muted)" }}>{(file.size/1024).toFixed(1)} KB</div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize:32, marginBottom:8 }}>📁</div>
                    <div style={{ fontWeight:600, fontSize:14, marginBottom:4 }}>Drop file here or click to browse</div>
                    <div style={{ fontSize:12, color:"var(--text-muted)" }}>PDF, DOCX, images, code files accepted</div>
                  </div>
                )}
              </div>
              {validating && (
                <div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 14px", background:"var(--bg-secondary)", borderRadius:"var(--radius-sm)", marginTop:10, fontSize:13, color:"var(--text-secondary)" }}>
                  <div className="spinner" /> AI is checking submission relevance...
                </div>
              )}
              {validation && (
                <div style={{ padding:"10px 14px", background: validation.ok?"var(--green-bg)":"var(--amber-bg)", border:`1px solid ${validation.ok?"var(--green-border)":"var(--amber-border)"}`, borderRadius:"var(--radius-sm)", marginTop:10, fontSize:13, color: validation.ok?"var(--green)":"var(--amber)" }}>
                  {validation.ok?"✅":"⚠️"} {validation.note}
                </div>
              )}
              {file && !validating && (
                <button className="btn btn-primary" style={{ width:"100%", marginTop:12 }} onClick={handleSubmit}>
                  Submit for Review →
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}