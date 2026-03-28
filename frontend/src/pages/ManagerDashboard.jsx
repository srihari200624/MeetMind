import { useEffect, useMemo, useRef, useState } from "react";
import { SceneBg, ThemeToggle } from "../components/UI";
import Avatar from "../components/Avatar";
import ScoreRing from "../components/ScoreRing";
import ConfBar from "../components/ConfBar";
import { MOCK_ACTIVITY } from "../data/MockData";
import api from "../api/client";

export default function ManagerDashboard({ user, onLogout, theme, setTheme }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [submissions, setSubmissions] = useState([]);
  const [queue, setQueue] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [team, setTeam] = useState([]);
  const [escalationSummary, setEscalationSummary] = useState({ L1: 0, L2: 0, L3: 0 });
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [pipelineStep, setPipelineStep] = useState(0);
  const fileRef = useRef();

  const mapSubmission = (s) => ({
    id: s.id,
    employee: s.employee_name || "Employee",
    task: s.task || "",
    file: s.file_name || "attachment",
    validationFlag: !!s.validation_flag,
    validationScore: s.validation_flag ? 65 : 92,
    submittedAt: s.submitted_at ? new Date(s.submitted_at).toLocaleString() : "just now",
    priority: s.priority || "medium",
  });

  const mapFlaggedTask = (q) => ({
    id: q.id,
    task: q.task || "",
    owner: q.owner || "Unknown",
    confidence: Number(q.confidence ?? 50),
    meeting: q.meeting_title || "Meeting",
    context: "Review this confidence-flagged extraction before notifying the owner.",
  });

  const mapMeeting = (m) => ({
    id: m.id,
    title: m.title || "Meeting",
    date: m.created_at ? new Date(m.created_at).toLocaleString() : "",
    tasks: Array.isArray(m.action_items) ? m.action_items.length : 0,
    summary: m.summary || "",
    speakers: (() => {
      try {
        return JSON.parse(m.speakers || "[]");
      } catch {
        return [];
      }
    })(),
  });

  const mapEmployee = (e) => ({
    id: e.id,
    name: e.name,
    score: Math.round(Number(e.avg_score || 0)),
    total: Number(e.total || 0),
    completed: Number(e.completed || 0),
    pending: Number(e.pending || 0),
    submitted: Number(e.submitted || 0),
  });

  const loadDashboardData = async () => {
    setError("");
    try {
      const [pendingRes, flaggedRes, meetingsRes, teamRes, escalationRes] = await Promise.all([
        api.getPendingSubmissions(),
        api.getFlaggedTasks(),
        api.getMeetings(),
        api.getEmployeesStatus(),
        api.getEscalationSummary(),
      ]);
      setSubmissions((pendingRes.data || []).map(mapSubmission));
      setQueue((flaggedRes.data || []).map(mapFlaggedTask));
      setMeetings((meetingsRes.data || []).map(mapMeeting));
      setTeam((teamRes.data || []).map(mapEmployee));
      setEscalationSummary(escalationRes.data || { L1: 0, L2: 0, L3: 0 });
    } catch (e) {
      setError(e?.response?.data?.detail || "Failed to load manager dashboard data.");
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const totalTasks = useMemo(() => team.reduce((acc, e) => acc + e.total, 0), [team]);
  const totalCompleted = useMemo(() => team.reduce((acc, e) => acc + e.completed, 0), [team]);
  const avgScore = useMemo(() => {
    if (!team.length) return 0;
    return Math.round(team.reduce((acc, e) => acc + e.score, 0) / team.length);
  }, [team]);
  const escalationsCount = escalationSummary.L1 + escalationSummary.L2 + escalationSummary.L3;

  const tabs = [
    { id: "overview",    label: "Overview",    icon: "⊞" },
    { id: "meetings",    label: "Meetings",    icon: "🎙" },
    { id: "team",        label: "Team",        icon: "◎" },
    { id: "escalations", label: "Escalations", icon: "⚡", badge: escalationsCount },
    { id: "queue",       label: "AI Queue",    icon: "⚖", badge: queue.length },
    { id: "analytics",   label: "Analytics",   icon: "↗" },
  ];

  const pipelineSteps = [
    "File accepted in dashboard",
    "Uploading file to backend",
    "Backend processing: diarization + transcription",
    "Backend processing: extraction + summary",
    "Backend completed: DB save + notifications",
  ];

  const handleUpload = async (file) => {
    if (!file) return;
    setError("");
    setUploading(true);
    setPipelineStep(1);
    try {
      const now = new Date();
      const title = `Meeting ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;

      // Move to backend-synced stages: request starts and stays in processing until API returns.
      setPipelineStep(2);
      const uploadPromise = api.uploadMeeting(file, title, user.id);
      setPipelineStep(3);

      await uploadPromise;
      setPipelineStep(4);
      await loadDashboardData();
      setPipelineStep(5);
    } catch (e) {
      setError(e?.response?.data?.detail || "Failed to upload and process meeting.");
      setPipelineStep(0);
    } finally {
      if (fileRef.current) fileRef.current.value = "";
      setUploading(false);
    }
  };

  const handleReview = async (submissionId, action) => {
    const rejectionReason = action === "rejected" ? (window.prompt("Enter rejection reason") || "") : "";
    await api.reviewSubmission(submissionId, action, rejectionReason);
    await loadDashboardData();
  };

  const handleApproveFlagged = async (taskId) => {
    await api.approveFlagged(taskId);
    await loadDashboardData();
  };

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--bg-base)", position: "relative" }}>
      <SceneBg />

      {/* Header */}
      <header style={{ height: 58, borderBottom: "1px solid var(--glass-border-md)", background: "var(--header-bg)", backdropFilter: "var(--glass-blur)", WebkitBackdropFilter: "var(--glass-blur)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", flexShrink: 0, zIndex: 50, position: "relative", boxShadow: "var(--glass-shadow)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, background: "linear-gradient(135deg,#4f8aff,#c084fc)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 12px rgba(79,138,255,0.4), inset 0 1px 0 rgba(255,255,255,0.3)" }}>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 14, color: "#fff" }}>M</span>
          </div>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15 }}>MeetMind</span>
          <span className="badge badge-manager" style={{ marginLeft: 4, fontFamily: "var(--font-mono)", fontSize: 10 }}>MANAGER</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ThemeToggle theme={theme} setTheme={setTheme} />
          <Avatar name={user.name} size={30} />
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-secondary)" }}>{user.name}</span>
          <button className="btn btn-ghost btn-sm" onClick={onLogout}>Logout</button>
        </div>
      </header>

      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative", zIndex: 1 }}>
        {/* Sidebar */}
        <aside style={{ width: 200, borderRight: "1px solid var(--glass-border-md)", background: "var(--sidebar-bg)", backdropFilter: "var(--glass-blur)", WebkitBackdropFilter: "var(--glass-blur)", padding: "16px 10px", display: "flex", flexDirection: "column", gap: 2, flexShrink: 0, overflowY: "auto" }}>
          {tabs.map((t) => (
            <button key={t.id} className={`nav-item ${activeTab === t.id ? "active" : ""}`} onClick={() => setActiveTab(t.id)}>
              <span style={{ fontSize: 14 }}>{t.icon}</span>
              <span>{t.label}</span>
              {t.badge ? <span className="nav-badge">{t.badge}</span> : null}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <div style={{ padding: "12px 8px", borderTop: "1px solid var(--glass-border-md)" }}>
            <div className="mono" style={{ fontSize: 10, color: "var(--text-muted)", lineHeight: 1.8 }}>
              <div style={{ color: "var(--green)", marginBottom: 2 }}>● Watchdog active</div>
              <div style={{ color: "var(--green)", marginBottom: 2 }}>● LM Studio connected</div>
              <div style={{ color: "var(--green)" }}>● MailHog running</div>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>

          {/* ── OVERVIEW ── */}
          {activeTab === "overview" && (
            <div className="fade-in">
              <div style={{ marginBottom: 28 }}>
                <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 26, letterSpacing: "-0.03em", marginBottom: 4 }}>Command Center</h1>
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Monitor pipeline · review submissions · track accountability.</p>
                {error && <p style={{ fontSize: 12, color: "var(--red)", marginTop: 8 }}>{error}</p>}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 2fr", gap: 14, marginBottom: 28 }}>
                {[
                  { label: "Meetings", value: String(meetings.length), sub: "processed" },
                  { label: "Tasks", value: String(totalTasks), sub: "assigned" },
                  { label: "Avg Score", value: String(avgScore), sub: "team accountability" },
                ].map((s, i) => (
                  <div key={i} className="glass stat-card">
                    <div className="stat-label">{s.label}</div>
                    <div className="stat-value">{s.value}</div>
                    <div className="stat-sub">{s.sub}</div>
                  </div>
                ))}
                <div className="glass stat-card" style={{ background: "linear-gradient(135deg,var(--accent-dim),var(--purple-dim))", borderColor: "var(--accent-glow)" }}>
                  <div className="stat-label" style={{ color: "var(--accent)" }}>Pending Review</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div className="stat-value" style={{ color: "var(--accent)", fontSize: 40 }}>{submissions.length}</div>
                    <div style={{ flex: 1 }}>{submissions.slice(0, 2).map((s) => <div key={s.id} style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}>{s.employee} — {s.task.slice(0, 28)}...</div>)}</div>
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 20 }}>
                {/* Approvals */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                    <span className="section-title">Pending Approvals</span>
                    <span className="badge badge-neutral mono" style={{ fontSize: 10 }}>{submissions.length} WAITING</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {submissions.map((s) => (
                      <div key={s.id} className="glass" style={{ padding: 18 }}>
                        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                          <Avatar name={s.employee} />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                              <span style={{ fontWeight: 600, fontSize: 14 }}>{s.employee}</span>
                              <span className="mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>{s.submittedAt}</span>
                            </div>
                            <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 12 }}>{s.task}</p>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "var(--glass-bg-md)", borderRadius: "var(--radius-sm)", border: "1px solid var(--glass-border)", marginBottom: 12, backdropFilter: "var(--glass-blur-sm)", WebkitBackdropFilter: "var(--glass-blur-sm)" }}>
                              <span>📄</span>
                              <span className="mono" style={{ fontSize: 12, fontWeight: 500, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.file}</span>
                              <span className="mono" style={{ fontSize: 10, fontWeight: 600, color: s.validationFlag ? "var(--amber)" : "var(--green)", whiteSpace: "nowrap" }}>{s.validationFlag ? `⚠️ ${s.validationScore}%` : `✅ ${s.validationScore}%`}</span>
                            </div>
                            <div style={{ display: "flex", gap: 8 }}>
                              <button className="btn btn-success btn-sm" onClick={() => handleReview(s.id, "approved")}>Approve</button>
                              <button className="btn btn-danger btn-sm" onClick={() => handleReview(s.id, "rejected")}>Reject</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {submissions.length === 0 && <div className="glass-flat" style={{ padding: 32, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>All caught up ✓</div>}
                  </div>
                </div>

                {/* Right column */}
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ background: "linear-gradient(135deg,var(--accent-dim),var(--purple-dim))", border: "1px solid var(--accent-glow)", borderRadius: "var(--radius-lg)", padding: 20, backdropFilter: "var(--glass-blur)", WebkitBackdropFilter: "var(--glass-blur)", boxShadow: "var(--glass-shadow)" }}>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Process Meeting</div>
                    <p className="mono" style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 14, lineHeight: 1.6 }}>WATCHDOG ACTIVE — OR UPLOAD MANUALLY</p>
                    {!uploading ? (
                      <div className="upload-zone" onClick={() => fileRef.current?.click()}>
                        <input type="file" ref={fileRef} style={{ display: "none" }} onChange={(e) => handleUpload(e.target.files?.[0])} accept="audio/*" />
                        <div style={{ fontSize: 28, marginBottom: 6 }}>🎙</div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>Drop audio here</div>
                        <div className="mono" style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>MP3 · WAV · OGG · MP4</div>
                      </div>
                    ) : (
                      <div>
                        {pipelineSteps.map((step, i) => (
                          <div key={i} className={`pipeline-step ${i < pipelineStep ? "done" : i === pipelineStep ? "active" : ""}`}>
                            {i < pipelineStep ? "✓" : i === pipelineStep ? <div className="spinner" /> : <span style={{ opacity: 0.3 }}>○</span>}
                            <span>{step}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="glass" style={{ padding: 18 }}>
                    <div className="section-title" style={{ marginBottom: 14 }}>Live Agent Feed</div>
                    {MOCK_ACTIVITY.map((a) => (
                      <div key={a.id} className="feed-item">
                        <div className="feed-dot" style={{ background: a.color, boxShadow: `0 0 6px ${a.color}` }} />
                        <div>
                          <div style={{ fontSize: 12, lineHeight: 1.4 }}>{a.text}</div>
                          <div className="mono" style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{a.time}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── MEETINGS ── */}
          {activeTab === "meetings" && (
            <div className="fade-in">
              <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 24, letterSpacing: "-0.03em", marginBottom: 4 }}>Meetings & Intelligence</h1>
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>pyannote/Whisper processing history.</p>
              </div>
              {meetings.map((m) => (
                <div key={m.id} className="glass" style={{ padding: 22, marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div>
                      <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{m.title}</h3>
                      <p className="mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>{m.date}</p>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <span className="tag">{m.tasks} tasks</span>
                      <span className="tag">🎙 {m.speakers.length} speakers</span>
                    </div>
                  </div>
                  <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 14, lineHeight: 1.6 }}>{m.summary}</p>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    {m.speakers.map((s) => <Avatar key={s} name={s} size={28} />)}
                    <span className="mono" style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: 6 }}>DETECTED BY PYANNOTE.AUDIO</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── TEAM ── */}
          {activeTab === "team" && (
            <div className="fade-in">
              <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 24, letterSpacing: "-0.03em", marginBottom: 4 }}>Team Leaderboard</h1>
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Accountability rankings.</p>
              </div>
              {[...team].sort((a, b) => b.score - a.score).map((emp, i) => (
                <div key={emp.id} className="lb-row">
                  <span className="lb-rank" style={{ color: i === 0 ? "#fbbf24" : i === 1 ? "#94a3b8" : "#b45309" }}>{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}</span>
                  <Avatar name={emp.name} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{emp.name}</div>
                    <div className="mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>{emp.completed}/{emp.total} completed</div>
                  </div>
                  <div style={{ width: 110 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span className="mono" style={{ fontSize: 10, color: "var(--text-muted)" }}>SCORE</span>
                      <span className="mono" style={{ fontSize: 10, fontWeight: 600 }}>{emp.score}</span>
                    </div>
                    <ConfBar value={emp.score} />
                  </div>
                  <ScoreRing score={emp.score} size={42} />
                </div>
              ))}
            </div>
          )}

          {/* ── ESCALATIONS ── */}
          {activeTab === "escalations" && (
            <div className="fade-in">
              <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 24, letterSpacing: "-0.03em", marginBottom: 4 }}>Escalation Alerts</h1>
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>APScheduler L1/L2/L3 overdue alerts.</p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 24 }}>
                {["L1", "L2", "L3"].map((l) => {
                  const count = Number(escalationSummary?.[l] || 0);
                  const st = { L1: { bg: "var(--amber-dim)", border: "var(--amber-glow)", text: "var(--amber)" }, L2: { bg: "var(--red-dim)", border: "var(--red-glow)", text: "var(--red)" }, L3: { bg: "var(--purple-dim)", border: "var(--purple-glow)", text: "var(--purple)" } };
                  return (
                    <div key={l} className="glass" style={{ padding: 20, background: st[l].bg, borderColor: st[l].border }}>
                      <div className="mono" style={{ fontSize: 10, fontWeight: 600, color: st[l].text, letterSpacing: "0.1em", marginBottom: 8 }}>{l} ESCALATION</div>
                      <div style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 40, color: st[l].text, lineHeight: 1 }}>{count}</div>
                    </div>
                  );
                })}
              </div>
              {team
                .filter((e) => (e.pending || 0) > 0)
                .map((e) => {
                  const level = e.pending >= 3 ? "L3" : e.pending >= 2 ? "L2" : "L1";
                  return (
                    <div key={e.id} className="glass" style={{ padding: 16, display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
                      <Avatar name={e.name} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{e.name}</div>
                        <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{e.pending} task(s) pending review/action</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <span className={`badge esc-${level.toLowerCase()}`}>{level}</span>
                        <div className="mono" style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>{e.pending} pending · {e.score} score</div>
                      </div>
                    </div>
                  );
                })}
              {team.filter((e) => (e.pending || 0) > 0).length === 0 && (
                <div className="glass-flat" style={{ padding: 32, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                  No active escalation signals.
                </div>
              )}
            </div>
          )}

          {/* ── QUEUE ── */}
          {activeTab === "queue" && (
            <div className="fade-in">
              <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 24, letterSpacing: "-0.03em", marginBottom: 4 }}>AI Confidence Queue</h1>
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Extractions below 70% held for review before notifications fire.</p>
              </div>
              <div style={{ background: "var(--amber-dim)", border: "1px solid var(--amber-glow)", borderRadius: "var(--radius-md)", padding: "14px 16px", marginBottom: 20, fontSize: 12, color: "var(--amber)", backdropFilter: "var(--glass-blur-sm)", WebkitBackdropFilter: "var(--glass-blur-sm)" }}>
                ⚖ {queue.length} extractions held. Edits log to corrections table → weekly prompt refinement.
              </div>
              {queue.map((q) => (
                <div key={q.id} className="glass" style={{ padding: 20, borderColor: "var(--amber-glow)", marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                    <div>
                      <span className="badge badge-medium mono" style={{ marginBottom: 8, fontSize: 10 }}>CONFIDENCE {q.confidence}%</span>
                      <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{q.task}</h3>
                      <p className="mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>{q.meeting} · {q.owner}</p>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setQueue(queue.filter((x) => x.id !== q.id))}>Discard</button>
                      <button className="btn btn-primary btn-sm" onClick={() => handleApproveFlagged(q.id)}>Edit & Confirm</button>
                    </div>
                  </div>
                  <div className="transcript-quote">{q.context}</div>
                  <div style={{ marginTop: 14 }}><ConfBar value={q.confidence} /></div>
                </div>
              ))}
              {queue.length === 0 && <div className="glass-flat" style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>Queue empty ✓ All extractions passed threshold</div>}
            </div>
          )}

          {/* ── ANALYTICS ── */}
          {activeTab === "analytics" && (
            <div className="fade-in">
              <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 24, letterSpacing: "-0.03em", marginBottom: 4 }}>System Analytics</h1>
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>AI confidence trends · adaptive learning metrics.</p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
                {[{ label: "Extraction Precision", value: "84%", sub: "vs 62% baseline", color: "var(--green)" }, { label: "Completion Rate", value: "61%", sub: "vs 17% industry", color: "var(--green)" }, { label: "Validation Accuracy", value: "87%", sub: "mismatch detection", color: "var(--accent)" }, { label: "L1/L2 Resolution", value: "54%", sub: "before L3 fires", color: "var(--amber)" }].map((s, i) => (
                  <div key={i} className="glass stat-card">
                    <div className="stat-label">{s.label}</div>
                    <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                    <div className="stat-sub">{s.sub}</div>
                  </div>
                ))}
              </div>
              <div className="glass" style={{ padding: 22, marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                  <span className="section-title">AI Confidence Trend</span>
                  <span className="badge badge-approved mono" style={{ fontSize: 10 }}>ADAPTIVE LOOP ACTIVE</span>
                </div>
                {[["Jan", 65], ["Feb", 72], ["Mar", 85], ["Apr", 93]].map(([month, val]) => (
                  <div key={month} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <span className="mono" style={{ fontSize: 11, color: "var(--text-muted)", width: 36 }}>{month}</span>
                    <div style={{ flex: 1 }}><ConfBar value={val} /></div>
                    <span className="mono" style={{ fontSize: 11, fontWeight: 600, width: 36, textAlign: "right" }}>{val}%</span>
                  </div>
                ))}
                <p className="mono" style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 14, borderTop: "1px solid var(--glass-border)", paddingTop: 12, lineHeight: 1.6 }}>EACH SPIKE = WEEKLY APSCHEDULER PROMPT REFINEMENT JOB</p>
              </div>
              <div className="glass" style={{ padding: 22 }}>
                <div className="section-title" style={{ marginBottom: 16 }}>Top Rejection Reasons</div>
                {[["Vague task scope", 45], ["Wrong owner assigned", 30], ["Deadline misinterpreted", 15], ["Missing context", 10]].map(([label, val]) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                    <span style={{ fontSize: 12, width: 180, color: "var(--text-secondary)" }}>{label}</span>
                    <div style={{ flex: 1 }}><ConfBar value={val} /></div>
                    <span className="mono" style={{ fontSize: 11, color: "var(--text-muted)", width: 32, textAlign: "right" }}>{val}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
