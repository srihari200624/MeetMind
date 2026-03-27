import { useState } from "react";
import { Avatar, ScoreRing, ConfBar } from "../components/UI";
import TaskModal from "../components/TaskModal";
import { MOCK_TASKS } from "../data/mockData";

// To wire to real API (Step E):
//   import api from '../api/client';
//   Replace useState(MOCK_TASKS) with:
//     const [tasks, setTasks] = useState([]);
//     useEffect(() => { api.getMyTasks(user.id).then(r => setTasks(r.data)); }, []);

export default function EmployeeDashboard({ user, onLogout, darkMode, toggleDark }) {
  const [tasks] = useState(MOCK_TASKS);
  const [filter, setFilter] = useState("all");
  const [selectedTask, setSelectedTask] = useState(null);
  const [tab, setTab] = useState("tasks");

  const filtered = filter==="all" ? tasks : tasks.filter(t=>t.status===filter);
  const totalScore = Math.round(tasks.reduce((a,t)=>a+t.score,0)/tasks.length);
  const completed = tasks.filter(t=>t.status==="approved").length;
  const pending   = tasks.filter(t=>t.status==="pending"||t.status==="rejected").length;

  return (
    <div style={{ minHeight:"100vh", background:"var(--bg)" }}>
      {/* ── Header ── */}
      <header style={{ height:58, borderBottom:"1px solid var(--border)", background:"var(--bg)", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 24px", position:"sticky", top:0, zIndex:50 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:28, height:28, background:"var(--black)", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <span style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:14, color:"var(--white)" }}>M</span>
          </div>
          <span style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:15 }}>MeetMind</span>
          <span className="badge badge-neutral" style={{ marginLeft:4 }}>Employee</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <button className="btn btn-secondary btn-sm" onClick={toggleDark}>{darkMode?"☀️":"🌙"}</button>
          <Avatar name={user.name} size={30} />
          <span style={{ fontSize:13, fontWeight:500 }}>{user.name}</span>
          <button className="btn btn-secondary btn-sm" onClick={onLogout}>Logout</button>
        </div>
      </header>

      <div style={{ maxWidth:1100, margin:"0 auto", padding:"28px 24px" }}>
        {/* ── Page title ── */}
        <div className="fade-up" style={{ marginBottom:28 }}>
          <h1 style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:24, letterSpacing:"-0.02em", marginBottom:4 }}>My Workspace</h1>
          <p style={{ fontSize:14, color:"var(--text-muted)" }}>Your assigned tasks, submissions and accountability score.</p>
        </div>

        {/* ── Stats row ── */}
        <div className="fade-up delay-1" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:28 }}>
          {[
            { label:"Total Tasks",  value:tasks.length, sub:"assigned" },
            { label:"Approved",     value:completed,    sub:"completed",      color:"var(--green)" },
            { label:"Pending",      value:pending,      sub:"need attention",  color:"var(--amber)" },
            { label:"Score",        value:totalScore,   sub:"accountability",  color:totalScore>=70?"var(--green)":"var(--amber)" },
          ].map((s,i)=>(
            <div key={i} className="stat-card">
              <div className="stat-label">{s.label}</div>
              <div className="stat-value" style={s.color?{color:s.color}:{}}>{s.value}</div>
              <div className="stat-sub">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* ── Tab switcher ── */}
        <div className="fade-up delay-2" style={{ display:"flex", gap:4, marginBottom:20, background:"var(--bg-secondary)", padding:4, borderRadius:"var(--radius-pill)", width:"fit-content" }}>
          {["tasks","score"].map(t=>(
            <button key={t} className="btn" onClick={()=>setTab(t)}
              style={{ background:tab===t?"var(--black)":"transparent", color:tab===t?"var(--white)":"var(--text-secondary)", height:32, padding:"0 16px", fontSize:13 }}>
              {t==="tasks"?"My Tasks":"My Score"}
            </button>
          ))}
        </div>

        {/* ── Tasks tab ── */}
        {tab==="tasks" && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 320px", gap:20 }}>
            <div>
              {/* Filter pills */}
              <div style={{ display:"flex", gap:6, marginBottom:16, flexWrap:"wrap" }}>
                {["all","pending","submitted","approved","rejected"].map(f=>(
                  <button key={f} className="btn btn-sm" onClick={()=>setFilter(f)}
                    style={{ background:filter===f?"var(--black)":"var(--bg-secondary)", color:filter===f?"var(--white)":"var(--text-secondary)", border:"1px solid var(--border)" }}>
                    {f.charAt(0).toUpperCase()+f.slice(1)}
                  </button>
                ))}
              </div>

              {/* Task cards */}
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {filtered.map((task,i)=>(
                  <div key={task.id} className={`card fade-up delay-${Math.min(i+1,4)}`}
                    style={{ padding:20, cursor:"pointer", borderColor:task.status==="rejected"?"var(--red-border)":"var(--border)" }}
                    onClick={()=>setSelectedTask(task)}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                      <div style={{ flex:1 }}>
                        <div style={{ display:"flex", gap:6, marginBottom:8, flexWrap:"wrap" }}>
                          <span className={`badge badge-${task.priority}`}>{task.priority}</span>
                          <span className={`badge badge-${task.status}`}>{task.status}</span>
                        </div>
                        <h3 style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:15, letterSpacing:"-0.01em", marginBottom:4 }}>{task.task}</h3>
                        <p style={{ fontSize:12, color:"var(--text-muted)" }}>From: {task.meeting} · Due: {task.deadline}</p>
                      </div>
                      <ScoreRing score={task.score} size={46} />
                    </div>
                    {task.status==="rejected"&&task.submission?.note&&(
                      <div style={{ background:"var(--red-bg)", border:"1px solid var(--red-border)", borderRadius:"var(--radius-sm)", padding:"8px 12px", fontSize:12, color:"var(--red)", marginBottom:12 }}>
                        <strong>Rejected:</strong> {task.submission.note}
                      </div>
                    )}
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", paddingTop:12, borderTop:"1px solid var(--border)" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        <span style={{ fontSize:11, color:"var(--text-muted)" }}>AI confidence</span>
                        <div style={{ width:60 }}><ConfBar value={task.confidence} /></div>
                        <span style={{ fontSize:11, color:"var(--text-muted)" }}>{task.confidence}%</span>
                      </div>
                      {(task.status==="pending"||task.status==="rejected")&&(
                        <button className="btn btn-primary btn-sm" onClick={e=>{e.stopPropagation();setSelectedTask(task);}}>
                          {task.status==="rejected"?"Re-upload →":"Upload Work →"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right sidebar */}
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              <div className="card" style={{ padding:20 }}>
                <div className="section-title" style={{ marginBottom:16 }}>Accountability Score</div>
                <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:16 }}>
                  <ScoreRing score={totalScore} size={64} />
                  <div>
                    <div style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:32, letterSpacing:"-0.03em" }}>{totalScore}</div>
                    <div style={{ fontSize:12, color:"var(--text-muted)" }}>out of 100</div>
                  </div>
                </div>
                <div className="progress-bar"><div className="progress-fill" style={{ width:`${totalScore}%` }} /></div>
                <p style={{ fontSize:11, color:"var(--text-muted)", marginTop:8 }}>+10 on approval · −5/day when overdue</p>
              </div>

              <div className="card" style={{ padding:20 }}>
                <div className="section-title" style={{ marginBottom:12 }}>Recent Activity</div>
                {[
                  { icon:"⚠️", t:"Submission Rejected",  s:"Draft Q2 Marketing Copy" },
                  { icon:"🔔", t:"New Task Assigned",    s:"Finish API Integration" },
                  { icon:"✅", t:"Work Approved",        s:"Database Schema Update" },
                ].map((n,i)=>(
                  <div key={i} className="feed-item">
                    <span style={{ fontSize:14 }}>{n.icon}</span>
                    <div>
                      <div style={{ fontSize:13, fontWeight:500 }}>{n.t}</div>
                      <div style={{ fontSize:11, color:"var(--text-muted)" }}>{n.s}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Score tab ── */}
        {tab==="score" && (
          <div style={{ maxWidth:600 }}>
            <div className="card" style={{ padding:24, marginBottom:16 }}>
              <div className="section-title" style={{ marginBottom:20 }}>Score Breakdown</div>
              <div style={{ display:"flex", alignItems:"center", gap:24, marginBottom:24 }}>
                <ScoreRing score={totalScore} size={80} />
                <div>
                  <div style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:48, letterSpacing:"-0.04em", lineHeight:1 }}>{totalScore}</div>
                  <div style={{ fontSize:13, color:"var(--text-muted)", marginTop:4 }}>Your accountability score</div>
                </div>
              </div>
              {tasks.map(t=>(
                <div key={t.id} style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
                  <div style={{ flex:1, fontSize:13, fontWeight:500, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{t.task}</div>
                  <div style={{ width:120 }}><ConfBar value={t.score} /></div>
                  <span style={{ fontSize:12, color:"var(--text-muted)", width:30, textAlign:"right" }}>{t.score}</span>
                  <span className={`badge badge-${t.status}`} style={{ minWidth:64 }}>{t.status}</span>
                </div>
              ))}
            </div>
            <div className="card-flat" style={{ padding:16 }}>
              <div style={{ fontSize:12, color:"var(--text-muted)", lineHeight:1.6 }}>
                Score starts at 50 · <strong style={{ color:"var(--green)" }}>+10</strong> on approval · <strong style={{ color:"var(--red)" }}>−5/day</strong> when overdue<br />
                L1 at 1 day overdue · L2 at 2 days / score &lt;50 · L3 at 3 days / score &lt;30
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedTask && <TaskModal task={selectedTask} onClose={()=>setSelectedTask(null)} />}
    </div>
  );
}