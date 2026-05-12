import { useState } from "react";
import "./Login.css";

const USERS = [
  { username: "admin",   password: "admin123",   role: "Admin Specialist",   level: "Level 3 Access" },
  { username: "analyst", password: "analyst123", role: "Lead Data Scientist", level: "Level 2 Access" },
  { username: "viewer",  password: "viewer123",  role: "Viewer",             level: "Level 1 Access" },
];

function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState(null);
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = () => {
    setError(null);
    setLoading(true);

    setTimeout(() => {
      const user = USERS.find(
        u => u.username === username.trim() && u.password === password
      );
      if (user) {
        onLogin(user);
      } else {
        setError("Invalid username or password");
      }
      setLoading(false);
    }, 800);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSubmit();
  };

  return (
    <div className="login-page">
      <div className="login-bg" />

      <div className="login-card">
        {/* Logo */}
        <div className="login-logo">
          <div className="login-logo-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L3 7l9 5 9-5-9-5z" fill="#1D4ED8"/>
              <path d="M3 12l9 5 9-5" stroke="#1D4ED8" strokeWidth="2" strokeLinecap="round"/>
              <path d="M3 17l9 5 9-5" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="login-logo-text">RiskNet</span>
        </div>

        <div className="login-header">
          <h1 className="login-title">Welcome back</h1>
          <p className="login-subtitle">Sign in to the fraud detection platform</p>
        </div>

        <div className="login-form">
          <div className="login-field">
            <label className="login-label">Username</label>
            <input
              className="login-input"
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          </div>

          <div className="login-field">
            <label className="login-label">Password</label>
            <input
              className="login-input"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>

          {error && (
            <div className="login-error">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
              </svg>
              {error}
            </div>
          )}

          <button
            className="login-btn"
            onClick={handleSubmit}
            disabled={loading || !username || !password}
          >
            {loading ? (
              <><div className="login-spinner" /> Signing in…</>
            ) : (
              "Sign In"
            )}
          </button>
        </div>

        <div className="login-hint">
          <div className="login-hint-title">Demo credentials</div>
          <div className="login-hint-row">
            <span className="hint-user">admin</span>
            <span className="hint-pass">admin123</span>
            <span className="hint-role">Full access</span>
          </div>
          <div className="login-hint-row">
            <span className="hint-user">analyst</span>
            <span className="hint-pass">analyst123</span>
            <span className="hint-role">Analyst access</span>
          </div>
          <div className="login-hint-row">
            <span className="hint-user">viewer</span>
            <span className="hint-pass">viewer123</span>
            <span className="hint-role">View only</span>
          </div>
        </div>

        <div className="login-footer">
          © 2026 RiskNet · FinTech Analytics Enterprise
        </div>
      </div>
    </div>
  );
}

export default Login;
