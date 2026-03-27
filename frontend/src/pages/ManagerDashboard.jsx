import { useState, useEffect, useRef } from "react";
import { Avatar, ScoreRing, ConfBar } from "../components/UI";
import { MOCK_SUBMISSIONS, MOCK_QUEUE, MOCK_ESCALATIONS, MOCK_ACTIVITY } from "../data/mockData";

// To wire to real API (Step E), replace each MOCK_* with api calls, e.g.:
//   import api from '../api/client';
//   useEffect(() => { api.getPendingSubmissions().then(r => setSubmissions(r.data)); }, []);
//   useEffect(() => { api.getFlaggedTasks().then(r => setQueue(r.data)); }, []);

export default function ManagerDashboard({ user, onLogout, darkMode, toggleDark }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [submissions, setSubmissions] = useState([]);
  useEffect(() => {
    fetch("http://127.0.0.1:8000/pending-submissions")
      .then(r => r.json())
      .then(data => setSubmissions(Array.isArray(data) ? data : []))
      .catch(() => setSubmissions([]));
  }, []);
  const [team, setTeam] = useState([]);
  useEffect(() => {
    fetch("http://127.0.0.1:8000/leaderboard")
      .then(r => r.json())
      .then(data => setTeam(Array.isArray(data) ? data : []))
      .catch(() => setTeam([]));
  }, []);
  const [meetings, setMeetings] = useState([]);
  useEffect(() => {
    fetch("http://127.0.0.1:8000/meetings")
      .then(r => r.json())
      .then(data => setMeetings(Array.isArray(data) ? data : []))
      .catch(() => setMeetings([]));
  }, []);
  const [queue, setQueue] = useState([]);
  useEffect(() => {
    fetch("http://127.0.0.1:8000/flagged-tasks")
      .then(r => r.json())
      .then(data => setQueue(Array.isArray(data) ? data : []));
  }, []);
  const [uploading, setUploading] = useState(false);
  const [pipelineStep, setPipelineStep] = useState(0);
  const fileRef = useRef();

  const tabs = [
    { id: "overview", label: "Overview", icon: "⊞" },
    { id: "meetings", label: "Meetings & Intel", icon: "🎙" },
    { id: "team", label: "Team", icon: "◎" },
    { id: "escalations", label: "Escalations", icon: "⚡", badge: MOCK_ESCALATIONS.length },
    { id: "queue", label: "Confidence Queue", icon: "⚖", badge: queue.length },
    { id: "analytics", label: "Analytics", icon: "↗" },
  ];

  const pipelineSteps = [
    "Watching folder...",
    "Detecting speakers (pyannote)",
    "Transcribing (Faster-Whisper)",
    "Extracting tasks (Qwen2.5)",
    "Sending notifications (MailHog)",
  ];

  const handleUpload = async (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;
    setUploading(true);
    setPipelineStep(1);

    const fd = new FormData();
    fd.append("file", uploadedFile);
    fd.append("title", uploadedFile.name);
    fd.append("manager_id", user.id);

    try {
      setPipelineStep(2);
      const res = await fetch("http://127.0.0.1:8000/upload-meeting", {
        method: "POST",
        body: fd
      });
      setPipelineStep(4);
      const data = await res.json();
      setPipelineStep(5);
      console.log("Meeting processed:", data);
    } catch (err) {
      console.error("Upload failed:", err);
    }
    setUploading(false);
  };

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--bg)" }}>

      {/* ── Header ── */}
      <header style={{ height: 58, borderBottom: "1px solid var(--border)", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", flexShrink: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, background: "var(--black)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 14, color: "var(--white)" }}>M</span>
          </div>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15 }}>MeetMind</span>
          <span className="badge" style={{ background: "var(--black)", color: "var(--white)", marginLeft: 4 }}>Manager</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={toggleDark}>{darkMode ? "☀️" : "🌙"}</button>
          <Avatar name={user.name} size={30} />
          <span style={{ fontSize: 13, fontWeight: 500 }}>{user.name}</span>
          <button className="btn btn-secondary btn-sm" onClick={onLogout}>Logout</button>
        </div>
      </header>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* ── Sidebar ── */}
        <aside style={{ width: 210, borderRight: "1px solid var(--border)", background: "var(--bg)", padding: "14px 10px", display: "flex", flexDirection: "column", gap: 2, flexShrink: 0, overflowY: "auto" }}>
          {tabs.map(t => (
            <button key={t.id} className={`nav-item ${activeTab === t.id ? "active" : ""}`} onClick={() => setActiveTab(t.id)}>
              <span style={{ fontSize: 14 }}>{t.icon}</span>
              <span>{t.label}</span>
              {t.badge ? <span className="nav-badge">{t.badge}</span> : null}
            </button>
          ))}
        </aside>

        {/* ── Main content ── */}
        <main style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>

          {/* OVERVIEW */}
          {activeTab === "overview" && (
            <div className="fade-in">
              <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 22, letterSpacing: "-0.02em", marginBottom: 4 }}>Command Center</h1>
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Monitor pipeline, review submissions, track team accountability.</p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 24 }}>
                {[
                  { label: "Meetings", value: meetings.length, sub: "processed" },
                  { label: "Total Tasks", value: meetings.reduce((a, m) => a + (m.action_items?.length || 0), 0), sub: "extracted" },
                  { label: "Pending Review", value: submissions.length, sub: "submissions", color: "var(--blue)" },
                  { label: "Team Avg Score", value: team.length ? Math.round(team.reduce((a, e) => a + (e.avg_score || 0), 0) / team.length) : 0, sub: "accountability" },
                ].map((s, i) => (
                  <div key={i} className="stat-card">
                    <div className="stat-label">{s.label}</div>
                    <div className="stat-value" style={s.color ? { color: s.color } : {}}>{s.value}</div>
                    <div className="stat-sub">{s.sub}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20 }}>
                {/* Pending approvals */}
                <div>
                  <div className="section-header">
                    <span className="section-title">Pending Approvals</span>
                    <span className="badge badge-neutral">{submissions.length} waiting</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {submissions.map(s => (
                      <div key={s.id} className="card" style={{ padding: 18 }}>
                        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                          <Avatar name={s.employee_name} />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                              <span style={{ fontWeight: 600, fontSize: 14 }}>{s.employee_name}</span>
                              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{s.submitted_at}</span>
                            </div>
                            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 10 }}>{s.task}</p>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "var(--bg-secondary)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", marginBottom: 12 }}>
                              <span>📄</span>
                              <span style={{ fontSize: 13, fontWeight: 500, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.file_name}</span>
                              <span style={{ fontSize: 11, fontWeight: 600, color: s.validationFlag ? "var(--amber)" : "var(--green)", whiteSpace: "nowrap" }}>
                                {s.validation_flag ? `⚠️ ${s.validation_note || "Relevance mismatch"}` : "✅ Looks relevant"}
                              </span>
                            </div>
                            {/* To wire: pass submission id + rejection_reason to api.reviewSubmission() */}
                            <div style={{ display: "flex", gap: 8 }}>
                              <button className="btn btn-success btn-sm" onClick={async () => {
                                await fetch("http://127.0.0.1:8000/review-submission", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ submission_id: s.id, action: "approved" })
                                });
                                setSubmissions(prev => prev.filter(x => x.id !== s.id));
                              }}>Approve</button>
                              <button className="btn btn-danger btn-sm" onClick={async () => {
                                const reason = prompt("Rejection reason (optional):");
                                await fetch("http://127.0.0.1:8000/review-submission", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ submission_id: s.id, action: "rejected", rejection_reason: reason || "" })
                                });
                                setSubmissions(prev => prev.filter(x => x.id !== s.id));
                              }}>Reject</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {submissions.length === 0 && <div className="card-flat" style={{ padding: 32, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>All caught up ✓</div>}
                  </div>
                </div>

                {/* Right column */}
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {/* Process meeting card */}
                  <div style={{ background: "var(--black)", borderRadius: "var(--radius-lg)", padding: 20, color: "var(--white)" }}>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Process New Meeting</div>
                    <p style={{ fontSize: 12, opacity: 0.6, marginBottom: 14 }}>Watchdog active · or upload manually</p>
                    {!uploading ? (
                      <div className="upload-zone" style={{ borderColor: "rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.7)" }} onClick={() => fileRef.current?.click()}>
                        <input type="file" ref={fileRef} style={{ display: "none" }} onChange={handleUpload} accept="audio/*" />
                        <div style={{ fontSize: 28, marginBottom: 6 }}>🎙</div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>Drop audio file here</div>
                        <div style={{ fontSize: 11, opacity: 0.6 }}>MP3, WAV, OGG</div>
                      </div>
                    ) : (
                      <div>
                        {pipelineSteps.map((step, i) => (
                          <div key={i} className={`pipeline-step ${i < pipelineStep ? "done" : i === pipelineStep ? "active" : "waiting"}`}
                            style={{ background: i < pipelineStep ? "var(--green-bg)" : i === pipelineStep ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: i < pipelineStep ? "var(--green)" : "rgba(255,255,255,0.7)", marginBottom: 6 }}>
                            {i < pipelineStep ? "✓" : i === pipelineStep ? <div className="spinner" style={{ borderTopColor: "#fff" }} /> : <span style={{ opacity: 0.3 }}>○</span>}
                            <span style={{ fontSize: 12 }}>{step}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Live feed */}
                  <div className="card" style={{ padding: 18 }}>
                    <div className="section-title" style={{ marginBottom: 12 }}>Live Agent Feed</div>
                    {MOCK_ACTIVITY.map(a => (
                      <div key={a.id} className="feed-item">
                        <div className="feed-dot" style={{ background: a.color }} />
                        <div>
                          <div style={{ fontSize: 12, lineHeight: 1.4 }}>{a.text}</div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{a.time}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MEETINGS */}
          {activeTab === "meetings" && (
            <div className="fade-in">
              <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 22, letterSpacing: "-0.02em", marginBottom: 4 }}>Meetings & Intelligence</h1>
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>pyannote/Whisper processing history and extracted insights.</p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {meetings.map(m => (
                  <div key={m.id} className="card" style={{ padding: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <div>
                        <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{m.title}</h3>
                        <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{m.created_at}</p>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <span className="tag">{m.action_items?.length ?? 0} tasks</span>
                        <span className="tag">🎙 {m.speaker_count ?? 0} speakers</span>
                      </div>
                    </div>
                    <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 12 }}>{m.summary}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TEAM */}
          {activeTab === "team" && (
            <div className="fade-in">
              <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 22, letterSpacing: "-0.02em", marginBottom: 4 }}>Team Leaderboard</h1>
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Accountability rankings across the organisation.</p>
              </div>
              {[...team].sort((a, b) => b.avg_score - a.avg_score).map((emp, i) => (
                <div key={emp.id} className="lb-row">
                  <span className="lb-rank">{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}</span>
                  <Avatar name={emp.name} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{emp.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{emp.completed_tasks}/{emp.total_tasks} tasks completed</div>
                  </div>
                  <div style={{ width: 120 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Score</span>
                      <span style={{ fontSize: 11, fontWeight: 600 }}>{Math.round(emp.avg_score)}</span>
                    </div>
                    <ConfBar value={Math.round(emp.avg_score)} />
                  </div>
                  <ScoreRing score={Math.round(emp.avg_score)} size={44} />
                </div>
              ))}
            </div>
          )}

          {/* ESCALATIONS */}
          {activeTab === "escalations" && (
            <div className="fade-in">
              <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 22, letterSpacing: "-0.02em", marginBottom: 4 }}>Escalation Alerts</h1>
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>APScheduler-triggered L1/L2/L3 overdue alerts.</p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 24 }}>
                {["L1", "L2", "L3"].map(l => {
                  const count = MOCK_ESCALATIONS.filter(e => e.level === l).length;
                  const colors = { L1: ["var(--amber-bg)", "var(--amber-border)", "var(--amber)"], L2: ["var(--red-bg)", "var(--red-border)", "var(--red)"], L3: ["#1a0a2e", "#7c3aed", "#c084fc"] };
                  return (
                    <div key={l} style={{ background: colors[l][0], border: `1px solid ${colors[l][1]}`, borderRadius: "var(--radius-lg)", padding: 20 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: colors[l][2], textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{l} Escalation</div>
                      <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 36, color: colors[l][2] }}>{count}</div>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {MOCK_ESCALATIONS.map(e => (
                  <div key={e.id} className="card" style={{ padding: 16, display: "flex", alignItems: "center", gap: 14 }}>
                    <Avatar name={e.employee} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{e.employee}</div>
                      <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{e.task}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span className={`badge esc-${e.level.toLowerCase()}`}>{e.level}</span>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{e.daysOverdue}d overdue · score {e.score}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CONFIDENCE QUEUE */}
          {activeTab === "queue" && (
            <div className="fade-in">
              <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 22, letterSpacing: "-0.02em", marginBottom: 4 }}>Confidence Queue</h1>
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Qwen2.5 extractions below 70% confidence — review before notifications fire.</p>
              </div>
              <div style={{ background: "var(--amber-bg)", border: "1px solid var(--amber-border)", borderRadius: "var(--radius-md)", padding: "14px 16px", marginBottom: 20, fontSize: 13, color: "var(--amber)" }}>
                ⚖ {queue.length} extractions held back. Edits save to corrections table → feed weekly prompt refinement job.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {queue.map(q => (
                  <div key={q.id} className="card" style={{ padding: 20, borderColor: "var(--amber-border)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <div>
                        <span className="badge badge-medium" style={{ marginBottom: 8 }}>Confidence: {q.confidence}%</span>
                        <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{q.task}</h3>
                        <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{q.meeting} · Owner: {q.owner}</p>
                      </div>
                      {/* To wire: Discard → DELETE task; Edit & Confirm → api.approveFlagged(q.id) */}
                      <div style={{ display: "flex", gap: 8 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => setQueue(queue.filter(x => x.id !== q.id))}>Discard</button>
                        <button className="btn btn-primary btn-sm" onClick={async () => {
                          await fetch(`http://127.0.0.1:8000/approve-flagged/${q.id}`, { method: "POST" });
                          setQueue(prev => prev.filter(x => x.id !== q.id));
                        }}>Edit & Confirm</button>                      </div>
                    </div>
                    <div className="transcript-quote">{q.context}</div>
                    <div style={{ marginTop: 12 }}><ConfBar value={q.confidence} /></div>
                  </div>
                ))}
                {queue.length === 0 && (
                  <div className="card-flat" style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                    Queue empty ✓ All extractions passed confidence threshold
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ANALYTICS */}
          {activeTab === "analytics" && (
            <div className="fade-in">
              <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 22, letterSpacing: "-0.02em", marginBottom: 4 }}>System Analytics</h1>
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Completion rates, AI confidence trends, adaptive learning metrics.</p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
                {[
                  { label: "Extraction Precision", value: "84%", sub: "vs 62% baseline", color: "var(--green)" },
                  { label: "Completion Rate", value: "61%", sub: "vs 17% industry", color: "var(--green)" },
                  { label: "Validation Accuracy", value: "87%", sub: "mismatch detection", color: "var(--blue)" },
                  { label: "L1/L2 Resolution", value: "54%", sub: "before L3 fires", color: "var(--amber)" },
                ].map((s, i) => (
                  <div key={i} className="stat-card">
                    <div className="stat-label">{s.label}</div>
                    <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                    <div className="stat-sub">{s.sub}</div>
                  </div>
                ))}
              </div>

              <div className="card" style={{ padding: 22, marginBottom: 16 }}>
                <div className="section-header">
                  <span className="section-title">AI Confidence Trend</span>
                  <span className="badge" style={{ background: "var(--green-bg)", color: "var(--green)", border: "1px solid var(--green-border)" }}>Adaptive Loop Active</span>
                </div>
                {[["Jan", 65], ["Feb", 72], ["Mar", 85], ["Apr (Now)", 93]].map(([month, val]) => (
                  <div key={month} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                    <span style={{ fontSize: 12, color: "var(--text-muted)", width: 80 }}>{month}</span>
                    <div style={{ flex: 1 }}><ConfBar value={val} /></div>
                    <span style={{ fontSize: 12, fontWeight: 600, width: 36, textAlign: "right" }}>{val}%</span>
                  </div>
                ))}
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 12, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                  Each spike = weekly APScheduler prompt refinement job ingesting corrections from SQLite.
                </p>
              </div>

              <div className="card" style={{ padding: 22 }}>
                <div className="section-title" style={{ marginBottom: 16 }}>Top Rejection Reasons</div>
                {[
                  ["Vague task scope", 45, "var(--red)"],
                  ["Wrong owner assigned", 30, "var(--amber)"],
                  ["Deadline misinterpreted", 15, "var(--blue)"],
                  ["Missing context", 10, "var(--text-muted)"],
                ].map(([label, val, color]) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <span style={{ fontSize: 13, width: 180, color: "var(--text-secondary)" }}>{label}</span>
                    <div style={{ flex: 1 }}>
                      <div className="conf-bar"><div className="conf-bar-fill" style={{ width: `${val}%`, background: color }} /></div>
                    </div>
                    <span style={{ fontSize: 12, color: "var(--text-muted)", width: 32, textAlign: "right" }}>{val}%</span>
                  </div>
                ))}
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 12, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                  Feeds weekly prompt refinement job to auto-correct Qwen2.5 extractions.
                </p>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}