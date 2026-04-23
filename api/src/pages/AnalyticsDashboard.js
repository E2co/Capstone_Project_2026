import { useState } from "react";
import Sidebar from "../components/Sidebar";
import "./AnalyticsDashboard.css";

// Static data matching Figma — replace with API calls if you add a /analytics/ endpoint
const ANALYTICS_DATA = {
  featureImportance: [
    { label: "AMOUNT", value: 30 },
    { label: "LOCATION", value: 20 },
    { label: "TIME", value: 60 },
  ],
  latency: { value: 42, change: -5, unit: "ms" },
  accuracy: { value: 98.2, label: "avg" },
  confusionMatrix: {
    tp: 0.85, fn: 0.15,
    fp: 0.10, tn: 0.90,
  },
  accuracyCurve: [62, 70, 75, 90, 82, 78, 88, 95, 80, 98],
};

function FeatureBar({ label, value }) {
  return (
    <div className="feature-row">
      <div className="feature-meta">
        <span className="feature-label">{label}</span>
        <span className="feature-pct">{value}%</span>
      </div>
      <div className="feature-track">
        <div
          className="feature-fill"
          style={{ width: `${value}%`, opacity: label === "LOCATION" ? 0.5 : 1 }}
        />
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

  const months = ["01 OCT", "08 OCT", "15 OCT", "22 OCT", "30 OCT"];

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

function DateFilter({ active, onChange }) {
  const filters = ["Last 7 Days", "Last 30 Days", "Custom"];
  return (
    <div className="date-filter-bar card">
      <div className="date-filter-left">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
        </svg>
        <span className="date-filter-label">Date Range Filter</span>
        <div className="date-filter-options">
          {filters.map((f) => (
            <button
              key={f}
              className={`filter-btn ${active === f ? "filter-btn--active" : ""}`}
              onClick={() => onChange(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      <div className="date-filter-right">
        Showing data from <strong>Oct 24</strong> to <strong>Oct 31, 2023</strong>
        <button className="more-filters">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="20" y2="12"/><line x1="12" y1="18" x2="20" y2="18"/>
          </svg>
          MORE FILTERS
        </button>
      </div>
    </div>
  );
}

function AnalyticsDashboard() {
  const [dateFilter, setDateFilter] = useState("Last 7 Days");
  const { featureImportance, latency, accuracy, confusionMatrix, accuracyCurve } = ANALYTICS_DATA;

  return (
    <div className="layout">
      <Sidebar />
      <div className="main-content">
        {/* Header */}
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
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </button>
            <button className="icon-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
            </button>
            <button className="btn btn-primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Export Report
            </button>
          </div>
        </div>

        <div className="page-body analytics-body">
          {/* Top row */}
          <div className="analytics-top-grid">
            {/* Feature Importance */}
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

            {/* Latency */}
            <div className="card latency-card">
              <div className="card-header-row">
                <div>
                  <div className="card-title">Latency (ms)</div>
                  <div className="card-subtitle">Real-time inference performance</div>
                </div>
                <div className="latency-value-block">
                  <div className="latency-big">{latency.value}ms</div>
                  <div className="negative-change">{latency.change}% performance</div>
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
            {/* Confusion Matrix */}
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
                  <div className="matrix-cell matrix-cell--filled">{confusionMatrix.tp}</div>
                  <div className="matrix-cell">{confusionMatrix.fn}</div>
                </div>
                <div className="matrix-row">
                  <div className="matrix-row-head">Negative</div>
                  <div className="matrix-cell">{confusionMatrix.fp}</div>
                  <div className="matrix-cell matrix-cell--filled">{confusionMatrix.tn}</div>
                </div>
              </div>
            </div>

            {/* Accuracy Curve */}
            <div className="card accuracy-card">
              <div className="card-header-row">
                <div>
                  <div className="card-title">Model Accuracy Curve</div>
                  <div className="card-subtitle">Stability over last 30 days</div>
                </div>
                <div className="accuracy-avg">{accuracy.value}% avg</div>
              </div>
              <AccuracyCurve data={accuracyCurve} />
            </div>
          </div>

          {/* Date filter */}
          <DateFilter active={dateFilter} onChange={setDateFilter} />
        </div>
      </div>
    </div>
  );
}

export default AnalyticsDashboard;
