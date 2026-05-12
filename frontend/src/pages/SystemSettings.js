import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import { getSettings, updateSettings, retrainModel, getHealth } from "../services/api";
import "./SystemSettings.css";

function SliderRow({ label, value, onChange, hint }) {
  return (
    <div className="slider-row">
      <div className="slider-label-row">
        <div>
          <span className="slider-label">{label}</span>
          {hint && <div className="slider-hint">{hint}</div>}
        </div>
        <span className="slider-value">{value}</span>
      </div>
      <input type="range" min="0" max="100" value={value}
        onChange={e => onChange(Number(e.target.value))} className="slider" />
    </div>
  );
}

function HealthDial({ value }) {
  const circumference = Math.PI * 60;
  return (
    <div className="health-dial">
      <svg width="160" height="90" viewBox="0 0 160 90">
        <path d="M 10 85 A 70 70 0 0 1 150 85" fill="none" stroke="#E2E8F0" strokeWidth="12" strokeLinecap="round" />
        <path d="M 10 85 A 70 70 0 0 1 150 85" fill="none" stroke="#1D4ED8" strokeWidth="12" strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - (value / 100) * circumference}
          style={{ transition: "stroke-dashoffset 0.5s ease" }} />
        <text x="80" y="72" textAnchor="middle" fontSize="26" fontWeight="800" fill="#0F172A" fontFamily="DM Sans">{value}%</text>
        <text x="80" y="86" textAnchor="middle" fontSize="10" fill="#94A3B8" fontFamily="DM Sans" letterSpacing="1">(AVERAGE)</text>
      </svg>
    </div>
  );
}

function WeightPreview({ rule, ml, anomaly }) {
  const total = rule + ml + anomaly || 1;
  const rPct  = Math.round((rule    / total) * 100);
  const mPct  = Math.round((ml      / total) * 100);
  const aPct  = Math.round((anomaly / total) * 100);
  return (
    <div className="weight-preview">
      <div className="wp-label">Effective weights (normalised)</div>
      <div className="wp-bar">
        <div className="wp-segment wp-rule"    style={{ width: `${rPct}%` }} title={`Rule ${rPct}%`} />
        <div className="wp-segment wp-ml"      style={{ width: `${mPct}%` }} title={`ML ${mPct}%`} />
        <div className="wp-segment wp-anomaly" style={{ width: `${aPct}%` }} title={`Anomaly ${aPct}%`} />
      </div>
      <div className="wp-legend">
        <span><span className="wp-dot wp-rule-dot" />Rule {rPct}%</span>
        <span><span className="wp-dot wp-ml-dot" />ML {mPct}%</span>
        <span><span className="wp-dot wp-anomaly-dot" />Anomaly {aPct}%</span>
      </div>
    </div>
  );
}

function SystemSettings({ user, role, onLogout }) {
  const [settings, setSettings] = useState({
    rule_weight:           20,
    ml_core:               50,
    anomaly_weight:        30,
    review_threshold:      80,
    auto_approve_low_risk: true,
    auto_flag_high_risk:   false,
  });

  const [saved,          setSaved]          = useState(false);
  const [retraining,     setRetraining]     = useState(false);
  const [retrainMessage, setRetrainMessage] = useState(null);
  const [systemHealth,   setSystemHealth]   = useState({
    fastapi:  "checking",
    mysql:    "checking",
    ml_model: "checking",
  });
  const [healthLoading, setHealthLoading] = useState(true);

  const systemInfo = {
    lastTrained:  "2026.1.25",
    trainingData: "1.5K Rows",
    newlyFlagged: "2,300",
  };

  const fetchHealth = () => {
    setHealthLoading(true);
    getHealth()
      .then(res => { setSystemHealth(res.data); setHealthLoading(false); })
      .catch(() => {
        setSystemHealth({ fastapi: "offline", mysql: "offline", ml_model: "offline" });
        setHealthLoading(false);
      });
  };

  useEffect(() => {
    getSettings()
      .then(res => setSettings(prev => ({ ...prev, ...res.data })))
      .catch(() => {});
    fetchHealth();

    // Refresh health every 30 seconds
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSave = () => {
    updateSettings(settings)
      .then(() => { setSaved(true); setTimeout(() => setSaved(false), 2500); })
      .catch(() => alert("Failed to save settings"));
  };

  const handleRetrain = () => {
    setRetraining(true); setRetrainMessage(null);
    retrainModel()
      .then(() => {
        setRetrainMessage({ text: "Model retrained successfully!", type: "success" });
        setRetraining(false);
        fetchHealth(); // refresh health after retrain
      })
      .catch(() => {
        setRetrainMessage({ text: "Retrain failed — check model files", type: "error" });
        setRetraining(false);
      });
  };

  const set = (key, val) => setSettings(p => ({ ...p, [key]: val }));

  // Calculate health percentage from actual status
  const healthPct = Math.round(
    (Object.values(systemHealth).filter(s => s === "online").length /
     Object.keys(systemHealth).length) * 100
  );

  const serviceLabels = {
    fastapi:  "Fast API",
    mysql:    "MySQL",
    ml_model: "ML Model",
  };

  return (
    <div className="layout">
     <Sidebar user={user} role={role} onLogout={onLogout} />
      <div className="main-content">
        <div className="page-header settings-header">
          <div className="settings-header-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6"  x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </div>
          <h1 className="header-title">System Settings</h1>
          <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
            <div className="settings-search">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input placeholder="Search settings…" />
            </div>
            <div className="avatar-circle" />
          </div>
        </div>

        <div className="settings-body page-body">
          <div className="settings-title-block">
            <h2 className="settings-page-title">System Settings</h2>
            <p className="settings-page-subtitle">Configure core system parameters and monitor health</p>
          </div>

          <div className="settings-grid">
            <div className="settings-left">

              {/* Engine weights card */}
              <div className="settings-card">
                <div className="settings-card-title">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
                    <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
                  </svg>
                  Engine Weight Configuration
                </div>
                <div className="settings-card-note">
                  Weights are normalised at runtime — they control the relative influence of each engine on the final score.
                </div>
                <SliderRow label="Rule Engine Weight" value={settings.rule_weight}
                  onChange={v => set("rule_weight", v)}
                  hint="Blacklist / velocity / geo rules" />
                <SliderRow label="ML Core (XGBoost)" value={settings.ml_core}
                  onChange={v => set("ml_core", v)}
                  hint="Supervised fraud classification" />
                <SliderRow label="Anomaly Score Weight" value={settings.anomaly_weight}
                  onChange={v => set("anomaly_weight", v)}
                  hint="Autoencoder reconstruction error" />
                <WeightPreview
                  rule={settings.rule_weight}
                  ml={settings.ml_core}
                  anomaly={settings.anomaly_weight}
                />
              </div>

              {/* Review & auto-action card */}
              <div className="settings-card">
                <div className="settings-card-title">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
                    <polyline points="9 11 12 14 22 4"/>
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                  </svg>
                  Auto-Classification & Review
                </div>

                <SliderRow
                  label={`Review Threshold (${settings.review_threshold})`}
                  value={settings.review_threshold}
                  onChange={v => set("review_threshold", v)}
                  hint="Scores ≥ threshold → HIGH risk tier" />

                <div className="tier-legend">
                  <div className="tier-item">
                    <span className="tier-dot" style={{ background:"#10B981" }} />
                    <span>0 – 39 &nbsp;<strong>Legitimate</strong></span>
                  </div>
                  <div className="tier-item">
                    <span className="tier-dot" style={{ background:"#F59E0B" }} />
                    <span>40 – 69 &nbsp;<strong>Suspicious</strong></span>
                  </div>
                  <div className="tier-item">
                    <span className="tier-dot" style={{ background:"#EF4444" }} />
                    <span>70 – 100 &nbsp;<strong>Fraudulent</strong></span>
                  </div>
                </div>

                <div className="toggle-row">
                  <div className="toggle-info">
                    <div className="toggle-label">Auto-Approve Low Risk</div>
                    <div className="toggle-sub">Bypass review for scores under 40 (Legitimate)</div>
                  </div>
                  <button className={`toggle-switch ${settings.auto_approve_low_risk ? "toggle-switch--on" : ""}`}
                    onClick={() => set("auto_approve_low_risk", !settings.auto_approve_low_risk)}>
                    <div className="toggle-thumb" />
                  </button>
                </div>

                <div className="toggle-row toggle-row--danger">
                  <div className="toggle-info">
                    <div className="toggle-label">Auto-Flag High Risk ⚡</div>
                    <div className="toggle-sub">Automatically flag transactions scoring ≥ 70 (Fraudulent)</div>
                  </div>
                  <button className={`toggle-switch ${settings.auto_flag_high_risk ? "toggle-switch--danger-on" : ""}`}
                    onClick={() => set("auto_flag_high_risk", !settings.auto_flag_high_risk)}>
                    <div className="toggle-thumb" />
                  </button>
                </div>
              </div>

              <button className="btn btn-primary save-btn" onClick={handleSave}>
                {saved ? "✓ Settings Saved & Applied" : "Save Settings"}
              </button>
            </div>

            <div className="settings-right">
              {/* System health — live */}
              <div className="settings-card">
                <div className="settings-card-section-head">
                  SYSTEM HEALTH
                  <button onClick={fetchHealth} style={{
                    marginLeft: "auto", background: "none", border: "none",
                    cursor: "pointer", color: "var(--text-muted)", fontSize: 12,
                    fontFamily: "DM Sans", padding: 0
                  }}>
                    {healthLoading ? "Checking…" : "↻ Refresh"}
                  </button>
                </div>
                <HealthDial value={healthLoading ? 0 : healthPct} />
                <div className="health-services">
                  {Object.entries(systemHealth).map(([svc, status]) => {
                    const color = status === "online"   ? "#10B981"
                                : status === "checking" ? "#94A3B8"
                                : status === "degraded" ? "#F59E0B"
                                : "#EF4444";
                    return (
                      <div key={svc} className="health-row">
                        <span className="health-service-name">
                          {serviceLabels[svc] || svc}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 11, color, fontWeight: 600, textTransform: "uppercase" }}>
                            {status}
                          </span>
                          {status === "online" ? (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
                              <circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/>
                            </svg>
                          ) : status === "checking" ? (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
                              <circle cx="12" cy="12" r="10"/>
                            </svg>
                          ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
                              <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
                            </svg>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* System info + retrain */}
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
                        <ellipse cx="12" cy="5" rx="9" ry="3"/>
                        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
                        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
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
                        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                        <line x1="4" y1="22" x2="4" y2="15"/>
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
                    padding: "10px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                    background: retrainMessage.type === "success" ? "#ECFDF5" : "#FEF2F2",
                    color:      retrainMessage.type === "success" ? "#10B981" : "#EF4444",
                  }}>{retrainMessage.text}</div>
                )}

                <button className="retrain-btn" onClick={handleRetrain} disabled={retraining}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="23 4 23 10 17 10"/>
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                  </svg>
                  {retraining ? "RETRAINING…" : "RETRAIN MODEL"}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="settings-build-label">
          <span className="build-tag">CURRENT BUILD</span>
          <span className="build-version">v2.6.0-stable</span>
        </div>
      </div>
    </div>
  );
}

export default SystemSettings;