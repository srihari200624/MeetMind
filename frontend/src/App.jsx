import { useState, useEffect } from "react";
import "./App.css";
import LoginPage from "./pages/LoginPage";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import ManagerDashboard from "./pages/ManagerDashboard";

export default function App() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("meetmind_user") || "null"));
  const [darkMode, setDarkMode] = useState(false);

  const toggleDark = () => {
    setDarkMode(d => {
      document.documentElement.classList.toggle("dark", !d);
      return !d;
    });
  };

  const handleLogin = (u) => {
    localStorage.setItem("meetmind_user", JSON.stringify(u));
    setUser(u);
  };

  const handleLogout = () => {
    localStorage.removeItem("meetmind_user");
    setUser(null);
  };

  if (!user) return <LoginPage onLogin={handleLogin} />;
  if (user.role === "manager") return <ManagerDashboard user={user} onLogout={handleLogout} darkMode={darkMode} toggleDark={toggleDark} />;
  return <EmployeeDashboard user={user} onLogout={handleLogout} darkMode={darkMode} toggleDark={toggleDark} />;
}