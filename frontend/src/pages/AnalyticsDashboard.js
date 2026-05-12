import { useState, useEffect, useCallback } from "react";
import Sidebar from "../components/Sidebar";
import { getAnalytics, exportTransactions } from "../services/api";
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
  const max = Math.max(...data), min = Math.min(...data);
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
  return (
    <div className="curve-wrap">
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: "100%", height: "100px" }}>
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#3B82F6" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={fillD} fill="url(#areaGrad)" />
        <path d={pathD} fill="none" stroke="#1D4ED8" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      <div className="curve-labels">
        {["01 SEP","08 SEP","15 SEP","22 SEP","30 SEP"].map(m => <span key={m}>{m}</span>)}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color, icon }) {
  return (
    <div className="card stat-card">
      {icon && <div className="stat-card-icon">{icon}</div>}
      <div className="stat-card-label">{label}</div>
      <div className="stat-card-value" style={{ color: color || "var(--text-primary)" }}>{value}</div>
      {sub && <div className="stat-card-sub">{sub}</div>}
    </div>
  );
}

function FeedbackLearningCard({ feedback, autoFlaggedCount }) {
  const total     = feedback?.total        ?? 0;
  const fraudLbls = feedback?.fraud_labels ?? 0;
  const legitLbls = feedback?.legit_labels ?? 0;
  const last      = feedback?.last_action  ?? null;
  const fraudPct  = total > 0 ? Math.round((fraudLbls / total) * 100) : 0;
  const legitPct  = total > 0 ? Math.round((legitLbls / total) * 100) : 0;

  return (
    <div className="card feedback-learning-card">
      <div className="flc-header">
        <div className="flc-header-left">
          <div className="flc-live-dot" />
          <div>
            <div className="flc-title">Analyst Feedback Learning</div>
            <div className="flc-subtitle">Training data collected from analyst decisions</div>
          </div>
        </div>
        <div className="flc-status-pill">
          <span className="flc-status-dot" />
          Model Learning: Active
        </div>
      </div>

      <div className="flc-stats">
        <div className="flc-stat">
          <div className="flc-stat-icon flc-icon-fraud">🚩</div>
          <div className="flc-stat-num flc-fraud">{fraudLbls.toLocaleString()}</div>
          <div className="flc-stat-label">Fraud Labels</div>
          <div className="flc-bar-track">
            <div className="flc-bar-fill flc-bar-fraud" style={{ width: `${fraudPct}%` }} />
          </div>
          <div className="flc-pct">{fraudPct}% of total</div>
        </div>

        <div className="flc-stat-divider" />

        <div className="flc-stat">
          <div className="flc-stat-icon flc-icon-legit">✓</div>
          <div className="flc-stat-num flc-legit">{legitLbls.toLocaleString()}</div>
          <div className="flc-stat-label">Legitimate Labels</div>
          <div className="flc-bar-track">
            <div className="flc-bar-fill flc-bar-legit" style={{ width: `${legitPct}%` }} />
          </div>
          <div className="flc-pct">{legitPct}% of total</div>
        </div>

        <div className="flc-stat-divider" />

        <div className="flc-stat">
          <div className="flc-stat-icon flc-icon-total">📊</div>
          <div className="flc-stat-num">{total.toLocaleString()}</div>
          <div className="flc-stat-label">Total Decisions</div>
          <div className="flc-bar-track">
            <div className="flc-bar-fill flc-bar-total" style={{ width: "100%" }} />
          </div>
          <div className="flc-pct">All analyst actions</div>
        </div>

        <div className="flc-stat-divider" />

        <div className="flc-stat">
          <div className="flc-stat-icon flc-icon-auto">⚡</div>
          <div className="flc-stat-num flc-auto">{(autoFlaggedCount ?? 0).toLocaleString()}</div>
          <div className="flc-stat-label">Auto-Flagged</div>
          <div className="flc-bar-track">
            <div className="flc-bar-fill flc-bar-auto"
              style={{ width: total > 0 ? `${Math.round(((autoFlaggedCount ?? 0) / total) * 100)}%` : "0%" }} />
          </div>
          <div className="flc-pct">By AI engine</div>
        </div>
      </div>

      <div className="flc-footer">
        {last ? (
          <div className="flc-last-action">
            <span className="flc-last-label">Last analyst action:</span>
            <span className={`flc-last-type flc-action-${last.analyst_action}`}>
              {last.analyst_action === "flag"    ? "🚩 Flagged as fraud"
               : last.analyst_action === "approve" ? "✓ Approved as legitimate"
               : "👁 Sent to review"}
            </span>
          </div>
        ) : (
          <div className="flc-last-action flc-last-label">
            No analyst decisions yet — flag, approve or review a transaction to start.
          </div>
        )}
        <div className="flc-model-status">
          <div className="flc-model-bar">
            <div className="flc-model-fill" style={{ width: `${Math.min(total * 2, 100)}%` }} />
          </div>
          <span className="flc-model-label">
            Dataset readiness: <strong>{Math.min(total * 2, 100)}%</strong>
            {total < 50 && " — collect more labels to retrain"}
          </span>
        </div>
      </div>
    </div>
  );
}

function DateFilter({ active, onPresetChange, dateFrom, dateTo, onDateChange, onExport, exporting }) {
  return (
    <div className="date-filter-bar card">
      <div className="date-filter-left">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
        </svg>
        <span className="date-filter-label">Date Range</span>
        <div className="date-filter-options">
          {["Last 7 Days", "Last 30 Days", "All Data", "Custom"].map(f => (
            <button key={f}
              className={`filter-btn ${active === f ? "filter-btn--active" : ""}`}
              onClick={() => onPresetChange(f)}>{f}
            </button>
          ))}
        </div>
        {active === "Custom" && (
          <div className="custom-date-inputs">
            <input type="date" className="date-input" value={dateFrom}
              onChange={e => onDateChange("from", e.target.value)} />
            <span style={{ color: "var(--text-muted)", fontSize: 12 }}>→</span>
            <input type="date" className="date-input" value={dateTo}
              onChange={e => onDateChange("to", e.target.value)} />
          </div>
        )}
      </div>
      <div className="date-filter-right">
        <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
          {active === "Last 7 Days"  && "Sep 23 – Sep 30, 2013"}
          {active === "Last 30 Days" && "Sep 01 – Sep 30, 2013"}
          {active === "All Data"     && "Full dataset"}
          {active === "Custom"       && dateFrom && dateTo && `${dateFrom} → ${dateTo}`}
        </span>
        <button className="more-filters" onClick={onExport} disabled={exporting}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          {exporting ? "EXPORTING…" : "EXPORT CSV"}
        </button>
      </div>
    </div>
  );
}

// Dataset is from 2013 — anchor all preset ranges to dataset end date
function getPresetDates(preset) {
  const datasetEnd = new Date("2013-09-30");
  const toStr = d => d.toISOString().slice(0, 10);
  if (preset === "Last 7 Days") {
    const f = new Date(datasetEnd); f.setDate(datasetEnd.getDate() - 7);
    return { from: toStr(f), to: toStr(datasetEnd) };
  }
  if (preset === "Last 30 Days") {
    const f = new Date(datasetEnd); f.setDate(datasetEnd.getDate() - 30);
    return { from: toStr(f), to: toStr(datasetEnd) };
  }
  return { from: "", to: "" };
}

const STATIC_ACCURACY_CURVE = [62, 70, 75, 90, 82, 78, 88, 95, 80, 98];

function AnalyticsDashboard({ user, role, onLogout }) {
  const [dateFilter, setDateFilter] = useState("All Data");
  const [dateFrom,   setDateFrom]   = useState("");
  const [dateTo,     setDateTo]     = useState("");
  const [analytics,  setAnalytics]  = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [exporting,  setExporting]  = useState(false);

  const fetchAnalytics = useCallback((from, to) => {
    setLoading(true); setError(null);
    const params = {};
    if (from) params.dateFrom = from;
    if (to)   params.dateTo   = to;
    getAnalytics(params)
      .then(res  => { setAnalytics(res.data); setLoading(false); })
      .catch(()  => { setError("Failed to load analytics"); setLoading(false); });
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchAnalytics("", "");
    const handleVisibility = () => {
      if (document.visibilityState === "visible") fetchAnalytics(dateFrom, dateTo);
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  const handlePresetChange = preset => {
    setDateFilter(preset);
    if (preset === "All Data") {
      setDateFrom(""); setDateTo("");
      fetchAnalytics("", "");
    } else if (preset !== "Custom") {
      const { from, to } = getPresetDates(preset);
      setDateFrom(from); setDateTo(to);
      fetchAnalytics(from, to);
    }
  };

  const handleDateChange = (which, val) => {
    if (which === "from") {
      setDateFrom(val);
      if (dateTo) fetchAnalytics(val, dateTo);
    } else {
      setDateTo(val);
      if (dateFrom) fetchAnalytics(dateFrom, val);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try { await exportTransactions({ dateFrom, dateTo }); }
    catch { alert("Export failed. Please try again."); }
    finally { setExporting(false); }
  };

  const fi  = analytics?.feature_importance ?? { amount: 30, location: 20, time: 60 };
  const cm  = analytics?.confusion_matrix   ?? { tp: 0.85, fn: 0.15, fp: 0.10, tn: 0.90 };
  const acc = analytics?.accuracy  ?? 98.2;
  const lat = analytics?.latency   ?? 42;

  return (
    <div className="layout">
     <Sidebar user={user} role={role} onLogout={onLogout} />
      <div className="main-content">
        <div className="page-header">
          <h1 className="header-title">Analytics Dashboard</h1>
          <div className="header-divider" />
          <div className="prod-badge">
            <span className="prod-dot" />
            Production v2.6
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button className="icon-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </button>
            <button className="btn btn-primary" onClick={handleExport} disabled={exporting}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              {exporting ? "Exporting…" : "Export Report"}
            </button>
          </div>
        </div>

        <div className="page-body analytics-body">
          {loading && (
            <div className="analytics-loading">
              <div className="analytics-spinner" />
              Loading analytics…
            </div>
          )}
          {error && (
            <div style={{ padding: 16, background: "var(--danger-bg)", color: "var(--danger)", borderRadius: "var(--radius-sm)" }}>
              {error}
            </div>
          )}

          {analytics && (
            <div className="stat-cards-row">
              <StatCard label="Total Transactions"
                value={analytics.total_transactions?.toLocaleString() ?? "—"}
                icon="💳" />
              <StatCard label="Flagged"
                value={analytics.flagged?.toLocaleString() ?? "—"}
                sub={`${analytics.flag_rate ?? 0}% flag rate`}
                color="var(--danger)" icon="🚩" />
              <StatCard label="Approved"
                value={analytics.approved?.toLocaleString() ?? "—"}
                color="var(--success)" icon="✓" />
              <StatCard label="Fraud Detected"
                value={analytics.fraud_count?.toLocaleString() ?? "—"}
                sub={`${analytics.fraud_rate ?? 0}% of total`}
                color="var(--warning)" icon="⚠" />
            </div>
          )}

          {analytics && (
            <FeedbackLearningCard
              feedback={analytics.feedback}
              autoFlaggedCount={analytics.auto_flagged_count}
            />
          )}

          {!loading && (
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
                  {[
                    { label: "AMOUNT",   value: fi.amount   },
                    { label: "LOCATION", value: fi.location },
                    { label: "TIME",     value: fi.time     },
                  ].map(f => <FeatureBar key={f.label} {...f} />)}
                </div>
              </div>

              <div className="card latency-card">
                <div className="card-header-row">
                  <div>
                    <div className="card-title">Latency (ms)</div>
                    <div className="card-subtitle">Real-time inference performance</div>
                  </div>
                  <div className="latency-value-block">
                    <div className="latency-big">{lat}ms</div>
                    <div className="negative-change">-5% performance</div>
                  </div>
                </div>
                <div className="latency-models">
                  {["RULE ENG", "XGBOOST", "ANOMALY"].map(m => (
                    <div key={m} className="latency-model-col">
                      <div className="latency-bar-wrap"><div className="latency-underline" /></div>
                      <div className="latency-model-label">{m}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {!loading && (
            <div className="analytics-bottom-grid">
              <div className="card confusion-card">
                <div className="card-title" style={{ marginBottom: 20 }}>Confusion Matrix</div>
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
                    <div className="card-subtitle">Stability over Sep 2013</div>
                  </div>
                  <div className="accuracy-avg">{acc}% avg</div>
                </div>
                <AccuracyCurve data={STATIC_ACCURACY_CURVE} />
              </div>
            </div>
          )}

          <DateFilter
            active={dateFilter}
            onPresetChange={handlePresetChange}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateChange={handleDateChange}
            onExport={handleExport}
            exporting={exporting}
          />
        </div>
      </div>
    </div>
  );
}

export default AnalyticsDashboard;