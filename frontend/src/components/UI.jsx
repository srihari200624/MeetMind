// ── Shared UI primitives ─────────────────────────────────────────────────────

const avatarColors = ["#e0e7ff","#fce7f3","#d1fae5","#fef3c7","#e0f2fe","#f3e8ff"];
const avatarTextColors = ["#4338ca","#be185d","#065f46","#92400e","#0369a1","#7c3aed"];

export function getAvatarColor(name) {
  const i = (name?.charCodeAt(0) || 0) % avatarColors.length;
  return { bg: avatarColors[i], text: avatarTextColors[i] };
}

export function Avatar({ name, size = 36 }) {
  const { bg, text } = getAvatarColor(name);
  return (
    <div
      className="avatar"
      style={{ width: size, height: size, background: bg, color: text, fontSize: size * 0.36 }}
    >
      {name?.charAt(0)?.toUpperCase()}
    </div>
  );
}

export function ScoreRing({ score, size = 52 }) {
  const r = (size - 6) / 2, circ = 2 * Math.PI * r, fill = (score / 100) * circ;
  const color = score >= 70 ? "#16a34a" : score >= 40 ? "#d97706" : "#dc2626";
  return (
    <div className="score-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--bg-tertiary)" strokeWidth={3} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={3}
          strokeDasharray={`${fill} ${circ}`} strokeLinecap="round" />
      </svg>
      <span className="score-ring-text" style={{ fontSize: size * 0.22 }}>{score}</span>
    </div>
  );
}

export function ConfBar({ value }) {
  const pct = Math.min(100, Math.max(0, value));
  const color = pct >= 70 ? "#16a34a" : pct >= 40 ? "#d97706" : "#dc2626";
  return (
    <div className="conf-bar">
      <div className="conf-bar-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}