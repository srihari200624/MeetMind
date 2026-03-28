import { useEffect, useState } from "react";
import { SceneBg, ThemeToggle } from "../components/UI";
import Avatar from "../components/Avatar";
import ScoreRing from "../components/ScoreRing";
import ConfBar from "../components/ConfBar";
import TaskModal from "../components/TaskModal";
import api from "../api/client";

export default function EmployeeDashboard({ user, onLogout, theme, setTheme }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedTask, setSelectedTask] = useState(null);
  const [tab, setTab] = useState("tasks");

  const mapTask = (t) => ({
    id: t.id,
    task: t.task || "",
    meeting: t.meeting_title || "Meeting",
    deadline: t.deadline || "No deadline",
    priority: t.priority || "medium",
    status: t.status || "pending",
    score: Number(t.accountability_score ?? 50),
    confidence: Number(t.confidence ?? 50),
    transcript: "Transcript preview is available in meeting details.",
    submission: null,
  });

  const loadTasks = async () => {
    setError("");
    try {
      const [tasksRes] = await Promise.all([
        api.getMyTasks(user.id),
        api.getMyScore(user.id),
      ]);
      setTasks((tasksRes.data || []).map(mapTask));
    } catch (e) {
      setError(e?.response?.data?.detail || "Failed to load your tasks.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [user.id]);

  const handleSubmitTask = async (task, file) => {
    const res = await api.submitTask(task.id, user.id, file);
    await loadTasks();
    return res.data;
  };

  const filtered = filter === "all" ? tasks : tasks.filter((t) => t.status === filter);
  const totalScore = tasks.length ? Math.round(tasks.reduce((a, t) => a + t.score, 0) / tasks.length) : 0;
  const completed = tasks.filter((t) => t.status === "approved").length;
  const pending = tasks.filter((t) => t.status === "pending" || t.status === "rejected").length;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-base)", position: "relative" }}>
      <SceneBg />

      {/* Header */}
      <header style={{ height: 58, borderBottom: "1px solid var(--glass-border-md)", background: "var(--header-bg)", backdropFilter: "var(--glass-blur)", WebkitBackdropFilter: "var(--glass-blur)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", position: "sticky", top: 0, zIndex: 50, boxShadow: "var(--glass-shadow)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, background: "linear-gradient(135deg,#4f8aff,#c084fc)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 12px rgba(79,138,255,0.4), inset 0 1px 0 rgba(255,255,255,0.3)" }}>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 14, color: "#fff" }}>M</span>
          </div>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15 }}>MeetMind</span>
          <span className="badge badge-neutral" style={{ marginLeft: 4, fontFamily: "var(--font-mono)", fontSize: 10 }}>EMPLOYEE</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ThemeToggle theme={theme} setTheme={setTheme} />
          <Avatar name={user.name} size={30} />
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-secondary)" }}>{user.name}</span>
          <button className="btn btn-ghost btn-sm" onClick={onLogout}>Logout</button>
        </div>
      </header>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px", position: "relative", zIndex: 1 }}>
        {/* Page header */}
        <div className="fade-up" style={{ marginBottom: 32 }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 28, letterSpacing: "-0.03em", marginBottom: 6 }}>My Workspace</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Assigned tasks, submissions and accountability score.</p>
          {loading && <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>Loading tasks...</p>}
          {error && <p style={{ fontSize: 12, color: "var(--red)", marginTop: 8 }}>{error}</p>}
        </div>

        {/* Stats */}
        <div className="fade-up delay-1" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 14, marginBottom: 32 }}>
          <div className="glass stat-card" style={{ background: "linear-gradient(135deg,var(--accent-dim),var(--purple-dim))", borderColor: "var(--accent-glow)" }}>
            <div className="stat-label" style={{ color: "var(--accent)" }}>Accountability Score</div>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 4 }}>
              <ScoreRing score={totalScore} size={56} />
              <div>
                <div className="stat-value" style={{ fontSize: 40, color: "var(--accent)" }}>{totalScore}</div>
                <div className="stat-sub">out of 100</div>
              </div>
            </div>
          </div>
          {[
            { label: "Total", value: tasks.length, sub: "tasks" },
            { label: "Approved", value: completed, sub: "completed", color: "var(--green)" },
            { label: "Pending", value: pending, sub: "need action", color: "var(--amber)" },
          ].map((s, i) => (
            <div key={i} className="glass stat-card">
              <div className="stat-label">{s.label}</div>
              <div className="stat-value" style={s.color ? { color: s.color } : {}}>{s.value}</div>
              <div className="stat-sub">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Tab bar */}
        <div className="fade-up delay-2" style={{ display: "flex", gap: 4, marginBottom: 24, background: "var(--glass-bg-md)", padding: 4, borderRadius: "var(--radius-pill)", width: "fit-content", border: "1px solid var(--glass-border-md)", backdropFilter: "var(--glass-blur-sm)", WebkitBackdropFilter: "var(--glass-blur-sm)", boxShadow: "var(--glass-shadow)" }}>
          {["tasks", "score"].map((t) => (
            <button key={t} className="btn" onClick={() => setTab(t)} style={{ background: tab === t ? "var(--accent)" : "transparent", color: tab === t ? "#fff" : "var(--text-secondary)", height: 32, padding: "0 18px", fontSize: 12, letterSpacing: "0.04em", boxShadow: tab === t ? "0 0 16px var(--accent-glow)" : undefined }}>
              {t === "tasks" ? "MY TASKS" : "MY SCORE"}
            </button>
          ))}
        </div>

        {/* Tasks tab */}
        {tab === "tasks" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20 }}>
            <div>
              {/* Filters */}
              <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap" }}>
                {["all", "pending", "submitted", "approved", "rejected"].map((f) => (
                  <button key={f} className="btn btn-sm" onClick={() => setFilter(f)} style={{ background: filter === f ? "var(--accent)" : "var(--glass-bg-md)", color: filter === f ? "#fff" : "var(--text-secondary)", border: "1px solid", borderColor: filter === f ? "var(--accent)" : "var(--glass-border-md)", fontSize: 11, letterSpacing: "0.04em", boxShadow: filter === f ? "0 0 12px var(--accent-glow)" : undefined, backdropFilter: "var(--glass-blur-sm)", WebkitBackdropFilter: "var(--glass-blur-sm)" }}>
                    {f.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Task cards */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {filtered.map((task, i) => (
                  <div key={task.id} className={`glass fade-up delay-${Math.min(i + 1, 4)}`} style={{ padding: 20, cursor: "pointer", borderColor: task.status === "rejected" ? "var(--red-glow)" : "var(--glass-border)" }} onClick={() => setSelectedTask(task)}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                          <span className={`badge badge-${task.priority}`}>{task.priority}</span>
                          <span className={`badge badge-${task.status}`}>{task.status}</span>
                        </div>
                        <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, letterSpacing: "-0.01em", marginBottom: 4 }}>{task.task}</h3>
                        <p className="mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>{task.meeting} · {task.deadline}</p>
                      </div>
                      <ScoreRing score={task.score} size={46} />
                    </div>
                    {task.status === "rejected" && task.submission?.note && (
                      <div style={{ background: "var(--red-dim)", border: "1px solid var(--red-glow)", borderRadius: "var(--radius-sm)", padding: "8px 12px", fontSize: 12, color: "var(--red)", marginBottom: 12 }}>
                        <strong>Rejected:</strong> {task.submission.note}
                      </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 12, borderTop: "1px solid var(--glass-border)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span className="mono" style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Confidence</span>
                        <div style={{ width: 60 }}><ConfBar value={task.confidence} /></div>
                        <span className="mono" style={{ fontSize: 10, color: "var(--text-muted)" }}>{task.confidence}%</span>
                      </div>
                      {(task.status === "pending" || task.status === "rejected") && (
                        <button className="btn btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); setSelectedTask(task); }}>
                          {task.status === "rejected" ? "Re-upload →" : "Upload Work →"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {!loading && filtered.length === 0 && (
                  <div className="glass-flat" style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                    No tasks found for this filter.
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="glass" style={{ padding: 20 }}>
                <div className="section-title" style={{ marginBottom: 16 }}>Score History</div>
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
                  <ScoreRing score={totalScore} size={60} />
                  <div>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 36, letterSpacing: "-0.04em", color: "var(--accent)" }}>{totalScore}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>this month</div>
                  </div>
                </div>
                <div className="progress-bar"><div className="progress-fill" style={{ width: `${totalScore}%` }} /></div>
                <p className="mono" style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 8, lineHeight: 1.6 }}>+10 approval · −5/day overdue</p>
              </div>
              <div className="glass" style={{ padding: 20 }}>
                <div className="section-title" style={{ marginBottom: 14 }}>Activity</div>
                {[{ icon: "⚠️", t: "Rejected", s: "Q2 Marketing Copy" }, { icon: "🔔", t: "New Task", s: "API Integration" }, { icon: "✅", t: "Approved", s: "DB Schema Update" }].map((n, i) => (
                  <div key={i} className="feed-item">
                    <span style={{ fontSize: 14 }}>{n.icon}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{n.t}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{n.s}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Score tab */}
        {tab === "score" && (
          <div style={{ maxWidth: 560 }}>
            <div className="glass" style={{ padding: 28, marginBottom: 14 }}>
              <div className="section-title" style={{ marginBottom: 24 }}>Score Breakdown</div>
              <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 28 }}>
                <ScoreRing score={totalScore} size={80} />
                <div>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 56, letterSpacing: "-0.05em", lineHeight: 1, color: "var(--accent)" }}>{totalScore}</div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>Accountability score</div>
                </div>
              </div>
              {tasks.map((t) => (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                  <div style={{ flex: 1, fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.task}</div>
                  <div style={{ width: 100 }}><ConfBar value={t.score} /></div>
                  <span className="mono" style={{ fontSize: 11, color: "var(--text-muted)", width: 28, textAlign: "right" }}>{t.score}</span>
                  <span className={`badge badge-${t.status}`} style={{ minWidth: 68 }}>{t.status}</span>
                </div>
              ))}
            </div>
            <div className="glass-flat" style={{ padding: 16 }}>
              <p className="mono" style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.8 }}>
                Score starts at 50 · <span style={{ color: "var(--green)" }}>+10</span> on approval · <span style={{ color: "var(--red)" }}>−5/day</span> overdue
              </p>
            </div>
          </div>
        )}
      </div>

      {selectedTask && (
        <TaskModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onSubmitTask={handleSubmitTask}
        />
      )}
    </div>
  );
}
