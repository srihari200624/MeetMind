// ── Avatar color palette ──────────────────────────────────────────────────────
const avatarPalette = [
  { bg: "rgba(79,138,255,0.2)",  text: "#2d60e8" },
  { bg: "rgba(52,211,153,0.2)",  text: "#0c8f64" },
  { bg: "rgba(251,191,36,0.2)",  text: "#b87209" },
  { bg: "rgba(248,113,113,0.2)", text: "#d42b4a" },
  { bg: "rgba(192,132,252,0.2)", text: "#6d28d9" },
  { bg: "rgba(251,146,60,0.2)",  text: "#c2410c" },
];

export function getAvatarColor(name) {
  return avatarPalette[(name?.charCodeAt(0) || 0) % avatarPalette.length];
}
