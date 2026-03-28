export default function ScoreRing({ score, size = 52 }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = score >= 70 ? "var(--green)" : score >= 40 ? "var(--amber)" : "var(--red)";
  const glow  = score >= 70 ? "var(--green-glow)" : score >= 40 ? "var(--amber-glow)" : "var(--red-glow)";

  return (
    <div className="score-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(128,128,160,0.18)" strokeWidth={3} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={3}
          strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 5px ${glow})` }}
        />
      </svg>
      <span className="score-ring-text mono" style={{ fontSize: size * 0.22 }}>{score}</span>
    </div>
  );
}
