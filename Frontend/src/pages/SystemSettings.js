import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import { getSettings, updateSettings } from "../services/api";
import "./SystemSettings.css";

function SliderRow({ label, value, onChange }) {
  return (
    <div className="slider-row">
      <div className="slider-label-row">
        <span className="slider-label">{label}</span>
        <span className="slider-value">{value}%</span>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="slider"
      />
    </div>
  );
}

function HealthDial({ value }) {
  const circumference = Math.PI * 60;

  return (
    <div className="health-dial">
      <svg width="160" height="90" viewBox="0 0 160 90">
        <path
          d="M 10 85 A 70 70 0 0 1 150 85"
          fill="none"
          stroke="#E2E8F0"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          d="M 10 85 A 70 70 0 0 1 150 85"
          fill="none"
          stroke="#1D4ED8"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - (value / 100) * circumference}
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
        <text x="80" y="72" textAnchor="middle" fontSize="26" fontWeight="800" fill="#0F172A" fontFamily="DM Sans">
          {value}%
        </text>
        <text x="80" y="86" textAnchor="middle" fontSize="10" fill="#94A3B8" fontFamily="DM Sans" letterSpacing="1">
          (AVERAGE)
        </text>
      </svg>
    </div>
  );
}

function SystemSettings() {
  const [settings, setSettings] = useState({
    rule_weight: 70,
    ml_core: 45,
    anomaly_weight: 82,
    review_threshold: 50,
    auto_approve_low_risk: true,
  });

  const [saved, setSaved] = useState(false);
  const [retraining, setRetraining] = useState(false);
  const [retrainMessage, setRetrainMessage] = useState(null);

  const systemHealth = {
    kafka: "online",
    redis: "online",
    fastapi: "degraded",
  };

  const systemInfo = {
    lastTrained: "2026.1.25",
    trainingData: "1.5K Rows",
    newlyFlagged: "2,300",
  };

  useEffect(() => {
    getSettings()
      .then((res) => setSettings((prev) => ({ ...prev, ...res.data })))
      .catch(() => {});
  }, []);

  const handleSave = () => {
    updateSettings(settings)
      .then(() => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      })
      .catch(() => alert("Failed to save settings"));
  };

  const handleRetrain = () => {
    setRetraining(true);
    setRetrainMessage(null);
    fetch("http://127.0.0.1:8000/retrain/", { method: "POST" })
      .then((res) => res.json())
      .then(() => {
        setRetrainMessage({ text: "Model retrained successfully!", type: "success" });
        setRetraining(false);
      })
      .catch(() => {
        setRetrainMessage({ text: "Retrain failed", type: "error" });
        setRetraining(false);
      });
  };

  return (
    <div className="layout">
      <Sidebar />
      <div className="main-content settings-dark">
        <div className="page-header settings-header">
          <div className="settings-header-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </div>
          <h1 className="header-title">System Settings</h1>
          <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
            <div className="settings-search">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input placeholder="Search settings..." />
            </div>
            <div className="avatar-circle"/>
          </div>
        </div>

        <div className="settings-body page-body">
          <div className="settings-title-block">
            <h2 className="settings-page-title">System Settings</h2>
            <p className="settings-page-subtitle">Configure core system parameters and monitor health</p>
          </div>

          <div className="settings-grid">
            <div className="settings-left">
              <div className="settings-card">
                <div className="settings-card-title">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
                    <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
                  </svg>
                  System Configuration
                </div>
                <SliderRow
                  label="Rule Engine Weight"
                  value={settings.rule_weight}
                  onChange={(v) => setSettings({ ...settings, rule_weight: v })}
                />
                <SliderRow
                  label="ML Core"
                  value={settings.ml_core}
                  onChange={(v) => setSettings({ ...settings, ml_core: v })}
                />
                <SliderRow
                  label="Anomaly Score Weight"
                  value={settings.anomaly_weight}
                  onChange={(v) => setSettings({ ...settings, anomaly_weight: v })}
                />
              </div>

              <div className="settings-card">
                <div className="settings-card-title">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
                    <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                  </svg>
                  Manual Review
                </div>
                <SliderRow
                  label={`Review Threshold (${settings.review_threshold}%)`}
                  value={settings.review_threshold}
                  onChange={(v) => setSettings({ ...settings, review_threshold: v })}
                />
                <div className="toggle-row">
                  <div className="toggle-info">
                    <div className="toggle-label">Auto-Approve Low Risk</div>
                    <div className="toggle-sub">Bypass review for scores under 10%</div>
                  </div>
                  <button
                    className={`toggle-switch ${settings.auto_approve_low_risk ? "toggle-switch--on" : ""}`}
                    onClick={() =>
                      setSettings({ ...settings, auto_approve_low_risk: !settings.auto_approve_low_risk })
                    }
                  >
                    <div className="toggle-thumb"/>
                  </button>
                </div>
              </div>

              <button className="btn btn-primary save-btn" onClick={handleSave}>
                {saved ? "✓ Saved!" : "Save Settings"}
              </button>
            </div>

            <div className="settings-right">
              <div className="settings-card">
                <div className="settings-card-section-head">SYSTEM HEALTH</div>
                <HealthDial value={78} />
                <div className="health-services">
                  {Object.entries(systemHealth).map(([service, status]) => {
                    const color = status === "online" ? "#10B981" : status === "degraded" ? "#F59E0B" : "#EF4444";
                    return (
                      <div key={service} className="health-row">
                        <span className="health-service-name">
                          {service === "fastapi" ? "Fast API" : service.charAt(0).toUpperCase() + service.slice(1)}
                        </span>
                        <span>
                          {status === "online" ? (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
                              <circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/>
                            </svg>
                          ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
                              <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
                            </svg>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="settings-card">
                <div className="settings-card-section-head">LATEST SYSTEM INFO</div>
                <div className="sysinfo-list">
                  <div className="sysinfo-row">
                    <div className="sysinfo-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
                      </svg>
                    </div>
                    <div>
                      <div className="sysinfo-label">LAST TRAINED</div>
                      <div className="sysinfo-value">{systemInfo.lastTrained}</div>
                    </div>
                  </div>
                  <div className="sysinfo-row">
                    <div className="sysinfo-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2">
                        <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
                      </svg>
                    </div>
                    <div>
                      <div className="sysinfo-label">TRAINING DATA</div>
                      <div className="sysinfo-value">{systemInfo.trainingData}</div>
                    </div>
                  </div>
                  <div className="sysinfo-row">
                    <div className="sysinfo-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2">
                        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>
                      </svg>
                    </div>
                    <div>
                      <div className="sysinfo-label">NEWLY FLAGGED</div>
                      <div className="sysinfo-value">{systemInfo.newlyFlagged}</div>
                    </div>
                  </div>
                </div>

                {retrainMessage && (
                  <div style={{
                    padding: "10px 14px",
                    borderRadius: "8px",
                    fontSize: "13px",
                    fontWeight: "600",
                    background: retrainMessage.type === "success" ? "#ECFDF5" : "#FEF2F2",
                    color: retrainMessage.type === "success" ? "#10B981" : "#EF4444",
                    marginBottom: "8px"
                  }}>
                    {retrainMessage.text}
                  </div>
                )}

                <button className="retrain-btn" onClick={handleRetrain} disabled={retraining}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                  </svg>
                  {retraining ? "RETRAINING..." : "RETRAIN"}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="settings-build-label">
          <span className="build-tag">CURRENT BUILD</span>
          <span className="build-version">v2.4.12-stable</span>
        </div>
      </div>
    </div>
  );
}

export default SystemSettings;