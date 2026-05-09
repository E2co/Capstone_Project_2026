import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import { getAnalytics } from "../services/api";
import "./AnalyticsDashboard.css";

function FeatureBar({ label, value }) {
  return (
    <div className="feature-row">
      <div className="feature-meta">
        <span className="feature-label">{label}</span>
        <span className="feature-pct">{value}%</span>
      </div>
      <div className="feature-track">
        <div className="feature-fill" style={{ width: `${value}%`, opacity: label === "LOCATION" ? 0.5 : 1 }} />
      </div>
    </div>
  );
}

function AccuracyCurve({ data }) {
  const w = 300, h = 100;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / (max - min)) * (h - 10) - 5;
    return [x, y];
  });
  const pathD = pts.reduce((acc, [x, y], i) => {
    if (i === 0) return `M ${x} ${y}`;
    const [px, py] = pts[i - 1];
    const cx = (px + x) / 2;
    return `${acc} C ${cx} ${py}, ${cx} ${y}, ${x} ${y}`;
  }, "");
  const fillD = `${pathD} L ${w} ${h} L 0 ${h} Z`;
  const months = ["01 SEP", "08 SEP", "15 SEP", "22 SEP", "30 SEP"];
  return (
    <div className="curve-wrap">
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: "100%", height: "100px" }}>
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.25"/>
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.02"/>
          </linearGradient>
        </defs>
        <path d={fillD} fill="url(#areaGrad)"/>
        <path d={pathD} fill="none" stroke="#1D4ED8" strokeWidth="2.5" strokeLinecap="round"/>
      </svg>
      <div className="curve-labels">
        {months.map((m) => <span key={m}>{m}</span>)}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color }) {
  return (
    <div className="card stat-card">
      <div className="stat-value" style={{ color: color || "var(--text-primary)" }}>{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

function DateFilter({ active, onChange }) {
  const filters = ["Last 7 Days", "Last 30 Days", "All Data"];
  return (
    <div className="date-filter-bar card">
      <div className="date-filter-left">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
        </svg>
        <span className="date-filter-label">Date Range Filter</span>
        <div className="date-filter-options">
          {filters.map((f) => (
            <button key={f} className={`filter-btn ${active === f ? "filter-btn--active" : ""}`}
              onClick={() => onChange(f)}>{f}</button>
          ))}
        </div>
      </div>
      <div className="date-filter-right">
        <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
          Dataset: <strong>Sep 2013</strong>
        </span>
        <button className="more-filters">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="4" y1="6" x2="20" y2="6"/>
            <line x1="8" y1="12" x2="20" y2="12"/>
            <line x1="12" y1="18" x2="20" y2="18"/>
          </svg>
          MORE FILTERS
        </button>
      </div>
    </div>
  );
}

function AnalyticsDashboard({ user, onLogout }) {
  const [dateFilter, setDateFilter] = useState("All Data");
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

const fetchAnalytics = (filter = "All Data") => {
  setLoading(true);

  // The Kaggle credit card fraud dataset contains only two days
  // of transactions in September 2013.
  // Therefore, Last 7 Days and Last 30 Days both include
  // the entire dataset.
  const datasetStart = "2013-09-01";
  const datasetEnd = "2013-09-02";

  let dateFrom = null;
  let dateTo = null;

  switch (filter) {
    case "Last 7 Days":
    case "Last 30 Days":
      dateFrom = datasetStart;
      dateTo = datasetEnd;
      break;

    case "All Data":
    default:
      // Return full dataset without filtering
      dateFrom = null;
      dateTo = null;
      break;
  }

  getAnalytics(dateFrom, dateTo)
    .then((res) => {
      setAnalytics(res.data);
      setLoading(false);
    })
    .catch((err) => {
      console.error("Failed to load analytics:", err);
      setLoading(false);
    });
};

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchAnalytics("All Data");

    const handleVisibility = () => {
      if (document.visibilityState === "visible") fetchAnalytics(dateFilter);
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  const fi = analytics?.feature_importance || { amount: 30, location: 20, time: 60 };
  const cm = analytics?.confusion_matrix || { tp: 0.85, fn: 0.15, fp: 0.10, tn: 0.90 };
  const featureImportance = [
    { label: "AMOUNT", value: fi.amount },
    { label: "LOCATION", value: fi.location },
    { label: "TIME", value: fi.time },
  ];
  const accuracyCurve = [62, 70, 75, 90, 82, 78, 88, 95, 80, analytics?.accuracy || 98];

  return (
    <div className="layout">
      <Sidebar user={user} onLogout={onLogout} />
      <div className="main-content">
        <div className="page-header">
          <h1 className="header-title">Analytics Dashboard</h1>
          <div className="header-divider"/>
          <div className="prod-badge">
            <span className="prod-dot"/>
            Production v2.4
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
            <button className="icon-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </button>
            <button className="btn btn-primary"
              onClick={() => window.open("http://127.0.0.1:8000/export/transactions/", "_blank")}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Export Report
            </button>
          </div>
        </div>

        <div className="page-body analytics-body">
          {loading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, color: "var(--text-muted)" }}>
              Loading analytics…
            </div>
          ) : (
            <>
              {/* Live stats row */}
              <div className="analytics-stats-row">
                <StatCard
                  label="Total Transactions"
                  value={analytics?.total_transactions?.toLocaleString() || "—"}
                />
                <StatCard
                  label="Flagged"
                  value={analytics?.flagged?.toLocaleString() || "—"}
                  sub={`${analytics?.flag_rate || 0}% flag rate`}
                  color="var(--danger)"
                />
                <StatCard
                  label="Approved"
                  value={analytics?.approved?.toLocaleString() || "—"}
                  color="var(--success)"
                />
                <StatCard
                  label="Fraud Cases"
                  value={analytics?.fraud_count?.toLocaleString() || "—"}
                  sub={`${analytics?.fraud_rate || 0}% of total`}
                  color="var(--danger)"
                />
                <StatCard
                  label="Avg Final Score"
                  value={analytics?.avg_final_score || "—"}
                  sub="across all assessments"
                />
                <StatCard
                  label="Auto-Flagged"
                  value={analytics?.auto_flagged_count || 0}
                  sub="by AI system"
                  color="var(--warning)"
                />
              </div>

              {/* Top row */}
              <div className="analytics-top-grid">
                <div className="card feature-card">
                  <div className="card-header-row">
                    <div>
                      <div className="card-title">Feature Importance</div>
                      <div className="card-subtitle">Key drivers for prediction accuracy</div>
                    </div>
                    <div className="positive-change">+12% <span>vs last week</span></div>
                  </div>
                  <div className="feature-list">
                    {featureImportance.map((f) => (
                      <FeatureBar key={f.label} label={f.label} value={f.value} />
                    ))}
                  </div>
                </div>

                <div className="card latency-card">
                  <div className="card-header-row">
                    <div>
                      <div className="card-title">Latency (ms)</div>
                      <div className="card-subtitle">Real-time inference performance</div>
                    </div>
                    <div className="latency-value-block">
                      <div className="latency-big">{analytics?.latency || 42}ms</div>
                      <div className="negative-change">-5% performance</div>
                    </div>
                  </div>
                  <div className="latency-models">
                    {["RULE ENG", "XGBOOST", "ANOMALY"].map((m) => (
                      <div key={m} className="latency-model-col">
                        <div className="latency-bar-wrap">
                          <div className="latency-underline"/>
                        </div>
                        <div className="latency-model-label">{m}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom row */}
              <div className="analytics-bottom-grid">
                <div className="card confusion-card">
                  <div className="card-title" style={{ marginBottom: "20px" }}>Confusion Matrix</div>
                  <div className="matrix-table">
                    <div className="matrix-header-row">
                      <div className="matrix-corner">ACTUAL \ PRED</div>
                      <div className="matrix-col-head">POSITIVE</div>
                      <div className="matrix-col-head">NEGATIVE</div>
                    </div>
                    <div className="matrix-row">
                      <div className="matrix-row-head">Positive</div>
                      <div className="matrix-cell matrix-cell--filled">{cm.tp}</div>
                      <div className="matrix-cell">{cm.fn}</div>
                    </div>
                    <div className="matrix-row">
                      <div className="matrix-row-head">Negative</div>
                      <div className="matrix-cell">{cm.fp}</div>
                      <div className="matrix-cell matrix-cell--filled">{cm.tn}</div>
                    </div>
                  </div>
                </div>

                <div className="card accuracy-card">
                  <div className="card-header-row">
                    <div>
                      <div className="card-title">Model Accuracy Curve</div>
                      <div className="card-subtitle">Stability over last 30 days</div>
                    </div>
                    <div className="accuracy-avg">{analytics?.accuracy || 98.2}% avg</div>
                  </div>
                  <AccuracyCurve data={accuracyCurve} />
                </div>
              </div>

              {/* Feedback summary */}
              {analytics?.feedback && (
                <div className="card feedback-summary-card">
                  <div className="card-title" style={{ marginBottom: 16 }}>Analyst Feedback Summary</div>
                  <div className="feedback-summary-grid">
                    <div className="fb-cell">
                      <div className="fb-num" style={{ color: "var(--danger)" }}>{analytics.feedback.fraud_labels || 0}</div>
                      <div className="fb-label">Fraud Labels</div>
                    </div>
                    <div className="fb-cell">
                      <div className="fb-num" style={{ color: "var(--success)" }}>{analytics.feedback.legit_labels || 0}</div>
                      <div className="fb-label">Legit Labels</div>
                    </div>
                    <div className="fb-cell">
                      <div className="fb-num" style={{ color: "var(--warning)" }}>{analytics.feedback.review_labels || 0}</div>
                      <div className="fb-label">Sent to Review</div>
                    </div>
                    <div className="fb-cell">
                      <div className="fb-num">{analytics.feedback.total || 0}</div>
                      <div className="fb-label">Total Decisions</div>
                    </div>
                  </div>
                </div>
              )}

              <DateFilter active={dateFilter} onChange={(f) => {
                setDateFilter(f);
                fetchAnalytics(f);
              }} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default AnalyticsDashboard;
