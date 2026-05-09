import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useState } from "react";
import HomeDashboard from "./pages/HomeDashboard";
import AnalyticsDashboard from "./pages/AnalyticsDashboard";
import SystemSettings from "./pages/SystemSettings";
import Login from "./pages/Login";
import "./App.css";

function App() {
  const [user, setUser] = useState(() => {
    return sessionStorage.getItem("risknet_user") || null;
  });

  const handleLogin = (userData) => {
    sessionStorage.setItem("risknet_user", userData.username);
    setUser(userData.username);
  };

  const handleLogout = () => {
    sessionStorage.removeItem("risknet_user");
    setUser(null);
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomeDashboard user={user} onLogout={handleLogout} />} />
        <Route path="/analytics" element={<AnalyticsDashboard user={user} onLogout={handleLogout} />} />
        <Route path="/settings" element={<SystemSettings user={user} onLogout={handleLogout} />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
