import { useState, useEffect } from "react";
import "./App.css";
import "./styles.css";
import LoginPage from "./pages/LoginPage";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import ManagerDashboard from "./pages/ManagerDashboard";

export default function App() {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState("dark");

  // Apply theme class to <html> so CSS vars cascade everywhere
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") root.classList.add("light-mode");
    else root.classList.remove("light-mode");
    localStorage.setItem("meetmind_theme", theme);
  }, [theme]);

  // Load saved theme + user on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("meetmind_theme");
    if (savedTheme) setTheme(savedTheme);
    try {
      const savedUser = localStorage.getItem("meetmind_user");
      if (savedUser) setUser(JSON.parse(savedUser));
    } catch {}
  }, []);

  const handleLogin = (u) => {
    localStorage.setItem("meetmind_user", JSON.stringify(u));
    setUser(u);
  };

  const handleLogout = () => {
    localStorage.removeItem("meetmind_user");
    setUser(null);
  };

  if (!user)
    return <LoginPage onLogin={handleLogin} theme={theme} setTheme={setTheme} />;

  if (user.role === "manager")
    return <ManagerDashboard user={user} onLogout={handleLogout} theme={theme} setTheme={setTheme} />;

  return <EmployeeDashboard user={user} onLogout={handleLogout} theme={theme} setTheme={setTheme} />;
}
