import { useState } from "react";

// To wire to real API (Step E), replace the mock login block with:
//   import api from '../api/client';
//   const res = await api.login(id, pass);
//   onLogin(res.data.user);

export default function LoginPage({ onLogin }) {
  const [id, setId] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handle = async (e) => {
  e.preventDefault();
  setError("");
  setLoading(true);
  try {
    const res = await fetch("http://127.0.0.1:8000/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employee_id: id, password: pass })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Login failed");
    onLogin(data.user);
  } catch (err) {
    setError(err.message);
  }
  setLoading(false);
};

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:24, background:"var(--bg)" }}>
      <div style={{ width:"100%", maxWidth:420 }}>
        <div className="fade-up" style={{ textAlign:"center", marginBottom:40 }}>
          <div style={{ width:56, height:56, background:"var(--black)", borderRadius:16, display:"inline-flex", alignItems:"center", justifyContent:"center", marginBottom:16 }}>
            <span style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:26, color:"var(--white)" }}>M</span>
          </div>
          <h1 style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:26, letterSpacing:"-0.02em", marginBottom:6 }}>MeetMind AI</h1>
          <p style={{ fontSize:14, color:"var(--text-muted)" }}>We don't transcribe meetings. We finish them.</p>
        </div>

        <div className="card fade-up delay-1" style={{ padding:28 }}>
          <h2 style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:17, marginBottom:22 }}>Sign in to your workspace</h2>
          <form onSubmit={handle}>
            <div style={{ marginBottom:14 }}>
              <label>Employee ID</label>
              <input value={id} onChange={e=>setId(e.target.value)} placeholder="e.g. MGR001 or EMP001" required autoFocus />
            </div>
            <div style={{ marginBottom:18 }}>
              <label>Password</label>
              <input type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="Enter your password" required />
            </div>
            {error && (
              <div style={{ background:"var(--red-bg)", border:"1px solid var(--red-border)", color:"var(--red)", borderRadius:"var(--radius-sm)", padding:"10px 14px", fontSize:13, marginBottom:14 }}>
                {error}
              </div>
            )}
            <button type="submit" className="btn btn-primary btn-lg" style={{ width:"100%" }} disabled={loading}>
              {loading ? <><div className="spinner" style={{ borderTopColor:"var(--white)" }} /> Signing in...</> : "Sign In →"}
            </button>
          </form>
          <div className="divider" />
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
            {[["MGR001","manager123","Manager"],["EMP001","emp001pass","Reno Red"],["EMP002","emp002pass","Mukil"]].map(([eid,pw,label]) => (
              <button key={eid} className="btn btn-secondary btn-sm" onClick={() => { setId(eid); setPass(pw); }} style={{ fontSize:11 }}>{label}</button>
            ))}
          </div>
          <p style={{ fontSize:11, color:"var(--text-muted)", textAlign:"center", marginTop:10 }}>Quick fill for demo</p>
        </div>

        <p className="fade-up delay-2" style={{ textAlign:"center", fontSize:12, color:"var(--text-muted)", marginTop:20 }}>
          100% local · Zero cloud dependencies · Privacy by architecture
        </p>
      </div>
    </div>
  );
}