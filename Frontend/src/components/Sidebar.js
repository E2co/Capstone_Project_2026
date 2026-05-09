import { Link, useLocation } from "react-router-dom";
import "./Sidebar.css";

const navItems = [
  {
    path: "/analytics",
    label: "Analytics Dashboard",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/>
        <rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
  },
  {
    path: "/",
    label: "Transactions",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="5" width="20" height="14" rx="2"/>
        <path d="M2 10h20"/>
      </svg>
    ),
  },
  {
    path: "/settings",
    label: "System Settings",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
        <path d="M12 2v2M12 20v2M2 12h2M20 12h2"/>
      </svg>
    ),
  },
  ];

function Sidebar({ user, onLogout }) {
  const location = useLocation();

  return (
    <aside className="sidebar">
      {/* ... rest stays the same ... */}
      <div className="sidebar-footer">
        <div className="user-avatar">{user ? user[0].toUpperCase() : "A"}</div>
        <div className="user-info">
          <div className="user-name">{user || "Admin"}</div>
          <div className="user-role">RiskNet Analyst</div>
        </div>
        <button onClick={onLogout} style={{
          marginLeft: "auto", background: "none", border: "none",
          cursor: "pointer", color: "var(--text-muted)", fontSize: 18
        }} title="Logout">⏻</button>
      </div>
    </aside>
  );
}
