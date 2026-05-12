import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useState } from "react";
import HomeDashboard from "./pages/HomeDashboard";
import AnalyticsDashboard from "./pages/AnalyticsDashboard";
import SystemSettings from "./pages/SystemSettings";
import Login from "./pages/Login";
import "./App.css";

function App() {
  const [user, setUser] = useState(() => {
    const stored = sessionStorage.getItem("risknet_user");
    if (!stored) return null;

    try {
      // Normal case: stored as JSON object
      return JSON.parse(stored);
    } catch {
      // Legacy case: stored as plain text like "admin"
      if (stored === "admin") {
        return {
          username: "admin",
          role: "Admin Specialist",
        };
      }

      if (stored === "analyst") {
        return {
          username: "analyst",
          role: "Lead Data Scientist",
        };
      }

      // Fallback for any other plain string
      return {
        username: stored,
        role: "RiskNet Analyst",
      };
    }
  });

  const handleLogin = (userData) => {
    sessionStorage.setItem("risknet_user", JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    sessionStorage.removeItem("risknet_user");
    setUser(null);
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  const isAdmin = user.role === "Admin Specialist";

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            <HomeDashboard
              user={user.username}
              role={user.role}
              onLogout={handleLogout}
            />
          }
        />

        <Route
          path="/analytics"
          element={
            <AnalyticsDashboard
              user={user.username}
              role={user.role}
              onLogout={handleLogout}
            />
          }
        />

        <Route
          path="/settings"
          element={
            isAdmin ? (
              <SystemSettings
                user={user.username}
                role={user.role}
                onLogout={handleLogout}
              />
            ) : (
              <Navigate to="/" />
            )
          }
        />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
