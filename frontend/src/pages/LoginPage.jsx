import { useState } from "react";
import { SceneBg, ThemeToggle } from "../components/UI";
import api from "../api/client";

export default function LoginPage({ onLogin, theme, setTheme }) {
  const [id, setId] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.login(id.trim(), pass);
      onLogin(res.data.user);
    } catch (err) {
      setError(err?.response?.data?.detail || "Invalid Employee ID or password.");
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, position: "relative", overflow: "hidden" }}>
      <SceneBg />

      {/* Theme toggle */}
      <div style={{ position: "fixed", top: 16, right: 16, zIndex: 10 }}>
        <ThemeToggle theme={theme} setTheme={setTheme} />
      </div>

      <div style={{ width: "100%", maxWidth: 420, position: "relative", zIndex: 1 }}>
        {/* Brand */}
        <div className="fade-up" style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ width: 64, height: 64, background: "linear-gradient(135deg,#4f8aff,#c084fc)", borderRadius: 20, display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 18, boxShadow: "0 0 40px rgba(79,138,255,0.5), 0 8px 32px rgba(79,138,255,0.25), inset 0 1px 0 rgba(255,255,255,0.35)" }}>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 30, color: "#fff" }}>M</span>
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 28, letterSpacing: "-0.03em", marginBottom: 8, color: "var(--text-primary)" }}>MeetMind AI</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", letterSpacing: "0.02em" }}>We don't transcribe meetings. We finish them.</p>
        </div>

        {/* Card */}
        <div className="glass fade-up delay-1" style={{ padding: 32 }}>
          <div className="accent-line" style={{ marginBottom: 24 }} />
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, marginBottom: 24, color: "var(--text-secondary)", letterSpacing: "0.04em", textTransform: "uppercase" }}>Sign In</h2>

          <form onSubmit={handle}>
            <div style={{ marginBottom: 16 }}>
              <label>Employee ID</label>
              <input value={id} onChange={(e) => setId(e.target.value)} placeholder="MGR001 or EMP001" required autoFocus />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label>Password</label>
              <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="••••••••••" required />
            </div>
            {error && (
              <div style={{ background: "var(--red-dim)", border: "1px solid var(--red-glow)", color: "var(--red)", borderRadius: "var(--radius-sm)", padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>
                {error}
              </div>
            )}
            <button type="submit" className="btn btn-primary btn-lg" style={{ width: "100%" }} disabled={loading}>
              {loading ? <><div className="spinner" /> Authenticating...</> : "Sign In →"}
            </button>
          </form>

          <div className="divider" />
          <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>Quick fill — demo</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {[["MGR001","manager123","Manager"],["EMP001","emp001pass","Reno"],["EMP002","emp002pass","Mukil"]].map(([eid, pw, label]) => (
              <button key={eid} className="btn btn-ghost btn-sm" onClick={() => { setId(eid); setPass(pw); }} style={{ fontSize: 11 }}>{label}</button>
            ))}
          </div>
        </div>

        <p className="fade-up delay-2" style={{ textAlign: "center", fontSize: 11, color: "var(--text-muted)", marginTop: 20, letterSpacing: "0.04em" }}>
          100% LOCAL · ZERO CLOUD · PRIVACY BY ARCHITECTURE
        </p>
      </div>
    </div>
  );
}
