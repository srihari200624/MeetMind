// Shared UI components used across all pages

// ── Background Scene (dark mesh + light blobs) ────────────────────────────────
export function SceneBg() {
  return (
    <div className="scene-bg">
      <div className="scene-bg-dark" />
      <div className="blob blob-1" />
      <div className="blob blob-2" />
      <div className="blob blob-3" />
      <div className="blob blob-4" />
      <div className="blob blob-5" />
    </div>
  );
}

// ── Theme Toggle Button ────────────────────────────────────────────────────────
export function ThemeToggle({ theme, setTheme }) {
  return (
    <button
      className="theme-toggle"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
    </button>
  );
}
