import { useEffect, useState, useCallback } from "react";
import Sidebar from "../components/Sidebar";
import { 
  getTransactions, 
  assessTransaction, 
  transactionAction, 
  getAuditLog, 
  getFeedback, 
  submitAnalystFeedback 
} from "../services/api";
import "./HomeDashboard.css";

/** 
 * HELPERS 
 */
function fmtTxnId(id) {
  return `TXN-${String(id).padStart(8, "0")}`;
}

function classifyScore(score) {
  if (score >= 70) return { tier: "FRAUDULENT", label: "Fraudulent", color: "#EF4444", bg: "#FEF2F2", confidence: score };
  if (score >= 40) return { tier: "SUSPICIOUS", label: "Suspicious", color: "#F59E0B", bg: "#FFFBEB", confidence: score };
  return { tier: "LEGITIMATE", label: "Legitimate", color: "#10B981", bg: "#ECFDF5", confidence: 100 - score };
}

function formatTime(ts) {
  if (!ts) return "";
  const d = new Date(ts), now = new Date();
  const m = Math.floor((now - d) / 60000);
  if (m < 60) return `${m}m ago`;
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/** 
 * SUB-COMPONENTS 
 */
function ClassificationBadge({ score, autoFlagged }) {
  const cls = classifyScore(score);
  return (
    <div className="classification-badge" style={{ "--cls-color": cls.color, "--cls-bg": cls.bg }}>
      <span className="cls-dot" />
      <span className="cls-label">{cls.label}</span>
      <span className="cls-confidence">{cls.confidence.toFixed(1)}%</span>
      {autoFlagged && <span className="cls-auto">AUTO-FLAGGED</span>}
    </div>
  );
}

function RiskGauge({ score }) {
  const cls = classifyScore(score);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (score / 100) * circumference;
  return (
    <div className="risk-gauge">
      <svg width="148" height="148" viewBox="0 0 148 148">
        <circle cx="74" cy="74" r={radius} fill="none" stroke="#E2E8F0" strokeWidth="10" />
        <circle cx="74" cy="74" r={radius} fill="none" stroke={cls.color}
          strokeWidth="10" strokeDasharray={circumference} strokeDashoffset={dashOffset}
          strokeLinecap="round" transform="rotate(-90 74 74)"
          style={{ transition: "stroke-dashoffset 0.7s cubic-bezier(0.34,1.56,0.64,1)" }} />
        <text x="74" y="68" textAnchor="middle" fontSize="28" fontWeight="700" fill="#0F172A" fontFamily="DM Sans">
          {Math.round(score)}
        </text>
        <text x="74" y="84" textAnchor="middle" fontSize="10" fill="#94A3B8" fontFamily="DM Sans">
          / 100
        </text>
      </svg>
      <div className="gauge-tier" style={{ color: cls.color }}>{cls.tier}</div>
      <div className="gauge-confidence">
        {cls.tier === "LEGITIMATE" ? "Legitimate" : "Fraud"} confidence: <strong>{cls.confidence.toFixed(1)}%</strong>
      </div>
    </div>
  );
}

function EngineBar({ value }) {
  const pct = Math.min((value / 100) * 100, 100);
  return (
    <div className="engine-bar-track">
      <div className="engine-bar-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

function AuditTimeline({ txId, onClose }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAuditLog(txId).then(r => { 
      setEntries(r.data.audit_log || []); 
      setLoading(false); 
    }).catch(() => setLoading(false));
  }, [txId]);

  const steps = [
    { key: "ai_scoring", icon: "⚡", label: "AI Scoring" },
    { key: "classification", icon: "🔍", label: "Classification" },
    { key: "auto_flag", icon: "🚩", label: "Auto-flag Check" },
    { key: "logged", icon: "📋", label: "Audit Logged" },
  ];

  return (
    <div className="audit-overlay" onClick={onClose}>
      <div className="audit-modal" onClick={e => e.stopPropagation()}>
        <div className="audit-modal-head">
          <div>
            <div className="audit-modal-title">Audit Trail</div>
            <div className="audit-modal-sub">{fmtTxnId(txId)}</div>
          </div>
          <button className="audit-close-btn" onClick={onClose}>✕</button>
        </div>
        {loading ? (
          <div className="audit-loading"><div className="mini-spinner" />Loading entries…</div>
        ) : entries.length === 0 ? (
          <div className="audit-empty">No audit entries yet for this transaction.</div>
        ) : (
          <div className="audit-entries">
            {entries.map((e, idx) => {
              const cls = classifyScore(e.final_score || 0);
              return (
                <div key={e.id} className="audit-entry">
                  <div className="timeline-track">
                    <div className="timeline-dot" style={{ background: cls.color }} />
                    {idx < entries.length - 1 && <div className="timeline-line" />}
                  </div>
                  <div className="audit-entry-body">
                    <div className="audit-entry-time">
                      {new Date(e.created_at).toLocaleString()}
                      {e.auto_flagged && <span className="auto-flag-chip">AUTO-FLAGGED</span>}
                    </div>
                    <div className="audit-step-flow">
                      {steps.map((s, si) => (
                        <div key={s.key} className="audit-step">
                          <div className="audit-step-icon">{s.icon}</div>
                          <div className="audit-step-label">{s.label}</div>
                          {si < steps.length - 1 && <div className="audit-step-arrow">→</div>}
                        </div>
                      ))}
                    </div>
                    <div className="audit-scores-grid">
                      <div className="audit-score-cell">
                        <div className="asc-label">ML Score</div>
                        <div className="asc-value">{e.ml_score?.toFixed(1)}</div>
                        <div className="asc-bar"><div style={{ width: `${e.ml_score}%`, background: "#3B82F6" }} /></div>
                      </div>
                      <div className="audit-score-cell">
                        <div className="asc-label">Anomaly Score</div>
                        <div className="asc-value">{e.anomaly_score?.toFixed(1)}</div>
                        <div className="asc-bar"><div style={{ width: `${e.anomaly_score}%`, background: "#8B5CF6" }} /></div>
                      </div>
                      <div className="audit-score-cell">
                        <div className="asc-label">Rule Score</div>
                        <div className="asc-value">{e.rule_score?.toFixed(1)}</div>
                        <div className="asc-bar"><div style={{ width: `${e.rule_score}%`, background: "#F59E0B" }} /></div>
                      </div>
                      <div className="audit-score-cell audit-score-final" style={{ "--fc": cls.color }}>
                        <div className="asc-label">Final Score</div>
                        <div className="asc-value" style={{ color: cls.color, fontWeight: 800 }}>
                          {e.final_score?.toFixed(1)}
                        </div>
                        <div className="asc-tier" style={{ background: cls.bg, color: cls.color }}>
                          {e.risk_tier}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function FeedbackPanel({ stats }) {
  if (!stats) return null;
  const total = stats.total || 0;
  const fraudPct = total > 0 ? Math.round((stats.fraud_labels / total) * 100) : 0;
  const legitPct = total > 0 ? Math.round((stats.legit_labels / total) * 100) : 0;
  const last = stats.last_action;
  return (
    <div className="feedback-panel card">
      <div className="fp-header">
        <div className="fp-pulse" />
        <span className="fp-title">AI Learning Loop</span>
        <span className="fp-status">Active</span>
      </div>
      <div className="fp-stats">
        <div className="fp-stat">
          <div className="fp-stat-num fp-fraud">{stats.fraud_labels ?? 0}</div>
          <div className="fp-stat-label">Fraud Labels</div>
          <div className="fp-mini-bar"><div className="fp-mini-fill fp-fraud-fill" style={{ width: `${fraudPct}%` }} /></div>
        </div>
        <div className="fp-divider" />
        <div className="fp-stat">
          <div className="fp-stat-num fp-legit">{stats.legit_labels ?? 0}</div>
          <div className="fp-stat-label">Legit Labels</div>
          <div className="fp-mini-bar"><div className="fp-mini-fill fp-legit-fill" style={{ width: `${legitPct}%` }} /></div>
        </div>
        <div className="fp-divider" />
        <div className="fp-stat">
          <div className="fp-stat-num">{total}</div>
          <div className="fp-stat-label">Total Decisions</div>
        </div>
      </div>
      {last && (
        <div className="fp-last">
          <span className="fp-last-label">Last action:</span>
          <span className={`fp-last-action fp-action-${last.analyst_action}`}>
            {last.analyst_action === "flag" ? "🚩 Flag" : last.analyst_action === "approve" ? "✓ Approve" : "👁 Review"}
          </span>
          <span className="fp-last-time">{formatTime(last.created_at)}</span>
        </div>
      )}
      <div className="fp-footer">Model learning status: <strong>Active</strong></div>
    </div>
  );
}

function FilterBar({ filters, onChange }) {
  return (
    <div className="filter-bar">
      <select className="filter-select" value={filters.status || "all"}
        onChange={e => onChange({ ...filters, status: e.target.value })}>
        <option value="all">All Statuses</option>
        <option value="pending">Pending</option>
        <option value="flag">Flagged</option>
        <option value="approve">Approved</option>
        <option value="review">In Review</option>
      </select>
      <select className="filter-select" value={filters.fraudClass ?? "all"}
        onChange={e => onChange({ ...filters, fraudClass: e.target.value === "all" ? null : Number(e.target.value) })}>
        <option value="all">All Classes</option>
        <option value={1}>Fraud (Class 1)</option>
        <option value={0}>Legit (Class 0)</option>
      </select>
    </div>
  );
}

/** 
 * MAIN COMPONENT 
 */
function HomeDashboard({ user, role, onLogout }) {
  const [transactions, setTransactions] = useState([]);
  const [selectedTx, setSelectedTx] = useState(null);
  const [risk, setRisk] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [riskCache, setRiskCache] = useState({});
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ status: "all", fraudClass: null });
  const [limit, setLimit] = useState(20);
  const [loadingMore, setLoadingMore] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);
  const [showAudit, setShowAudit] = useState(false);
  const [feedbackStats, setFeedbackStats] = useState(null);
  const [analystNotes, setAnalystNotes] = useState("");

  const isAdmin = role === "Admin Specialist";
const isAnalyst = role === "Lead Data Scientist";
const isViewer = !isAdmin && !isAnalyst;

  const loadTransactions = useCallback((lim = limit, q = search, f = filters) => {
    return getTransactions(lim, { search: q, ...f })
      .then(r => { 
        setTransactions(r.data.transactions || []); 
        setError(null); 
      })
      .catch(() => setError("Failed to load transactions"));
  }, [limit, search, filters]);

  const loadFeedback = useCallback(() => {
    getFeedback(1).then(r => setFeedbackStats(r.data.stats)).catch(() => {});
  }, []);

  // Initialization
  useEffect(() => { 
    loadTransactions(); 
    loadFeedback(); 
  }, [loadTransactions, loadFeedback]);

  // Handle Search Debounce
  useEffect(() => {
    const t = setTimeout(() => loadTransactions(limit, search, filters), 350);
    return () => clearTimeout(t);
  }, [search, limit, filters, loadTransactions]);

  const handleLoadMore = () => {
    const nl = limit + 20; 
    setLimit(nl); 
    setLoadingMore(true);
    loadTransactions(nl, search, filters).finally(() => setLoadingMore(false));
  };

  // Assessment Logic
  useEffect(() => {
    if (!selectedTx) return;
    const txId = selectedTx.id;
    if (riskCache[txId]) { 
      setRisk(riskCache[txId]); 
      return; 
    }
    
    setLoading(true); 
    setRisk(null);

    const payload = {
      amount: selectedTx.amount, 
      transaction_id: txId,
      ...Object.fromEntries(Array.from({ length: 28 }, (_, i) => [
        `v${i + 1}`, selectedTx[`v${i + 1}`] ?? selectedTx[`V${i + 1}`] ?? 0,
      ])),
    };

    assessTransaction(payload)
      .then(res => {
        const result = {
          ...res.data.final_assessment,
          ml_score: res.data.ml_details?.ml_score ?? null,
          anomaly_score: res.data.anomaly_score ?? null,
          rule_score: res.data.rule_score ?? null,
          weights_used: res.data.weights_used ?? null,
          auto_flagged: res.data.auto_flagged ?? false,
        };
        setRisk(result); 
        setRiskCache(p => ({ ...p, [txId]: result }));
      })
      .catch(() => setError("Risk assessment failed"))
      .finally(() => setLoading(false));
  }, [selectedTx, riskCache]);

  const handleAction = action => {
    if (!selectedTx) return;
    setActionLoading(true); 
    setActionMessage(null);

    transactionAction({ transaction_id: selectedTx.id, action })
      .then(() => {
        const label = action === "flag" ? "🚩 Flagged — decision recorded for retraining"
          : action === "approve" ? "✓ Approved — labelled as legitimate"
          : "👁 Sent to Review — pending analyst";
          
        setActionMessage({ text: label, type: action });
        setTransactions(p => p.map(t => t.id === selectedTx.id ? { ...t, status: action } : t));
        setSelectedTx(p => ({ ...p, status: action }));
        setRiskCache(p => { const u = { ...p }; delete u[selectedTx.id]; return u; });
        loadFeedback();
      })
      .catch(() => setActionMessage({ text: "Action failed", type: "error" }))
      .finally(() => setActionLoading(false));
  };

  const handleAnalystDecision = (label) => {
    if (!selectedTx) return;
    setActionLoading(true); 
    setActionMessage(null);

    submitAnalystFeedback(selectedTx.id, {
      label,
      analyst: typeof user === "string" ? user.trim() : "Unknown",
      notes: analystNotes,
    })
      .then(() => {
        const msg = label === "Fraud" ? "🚩 Marked as Fraud — feedback recorded"
          : label === "Legitimate" ? "✓ Marked as Legitimate — feedback recorded"
          : "⬆ Escalated — sent to senior review";
        
        setActionMessage({ text: msg, type: label === "Fraud" ? "flag" : label === "Legitimate" ? "approve" : "review" });
        setAnalystNotes("");
        const status = label === "Fraud" ? "flag" : label === "Legitimate" ? "approve" : "escalate";
        setTransactions(p => p.map(t => t.id === selectedTx.id ? { ...t, status } : t));
        setSelectedTx(p => ({ ...p, status }));
        loadFeedback();
      })
      .catch(() => setActionMessage({ text: "Decision failed", type: "error" }))
      .finally(() => setActionLoading(false));
  };

  const getListBadge = tx => {
    const cached = riskCache[tx.id];
    if (tx.status && tx.status !== "pending") {
      if (tx.status === "flag") return <span className="badge badge-danger">🚩 Flagged</span>;
      if (tx.status === "approve") return <span className="badge badge-success">✓ Approved</span>;
      if (tx.status === "review") return <span className="badge badge-warning">👁 Review</span>;
      if (tx.status === "escalate") return <span className="badge badge-warning">⬆ Escalated</span>;
    }
    if (cached?.tier) {
      const cls = classifyScore(cached.score);
      return <span className="badge" style={{ background: cls.bg, color: cls.color }}>{cls.label}</span>;
    }
    return null;
  };

  return (
    <div className="layout">
      <Sidebar user={user} role={role} onLogout={onLogout} />
      <div className="main-content">
        <div className="page-header">
          <h1 className="header-title">Fraud Monitoring Console</h1>
          <div className="header-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input placeholder="Search by ID or amount…" value={search}
              onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="header-actions">
            <button className="icon-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </button>
          </div>
        </div>

        <div className="home-body">
          <div className="txn-panel">
            <div className="txn-panel-header">
              <span className="txn-panel-title">ACTIVE ALERTS</span>
              <span className="new-badge">{transactions.length}</span>
            </div>
            <FilterBar filters={filters} onChange={setFilters} />
            {error && <div className="error-msg">{error}</div>}
            <div className="txn-list">
              {transactions.length === 0 && !error && (
                <div className="empty-state">No transactions found</div>
              )}
              {transactions.map(tx => (
                <div key={tx.id}
                  className={`txn-item ${selectedTx?.id === tx.id ? "txn-item--selected" : ""}`}
                  onClick={() => { setSelectedTx(tx); setActionMessage(null); setAnalystNotes(""); }}>
                  <div className="txn-item-top">
                    <span className="txn-id">{tx.txn_ref || fmtTxnId(tx.id)}</span>
                    <span className="txn-time">{formatTime(tx.time_stamp)}</span>
                  </div>
                  <div className="txn-amount">${Number(tx.amount).toFixed(2)}</div>
                  <div>{getListBadge(tx)}</div>
                </div>
              ))}
              <div className="load-more-wrap">
                <button className="load-more-btn" onClick={handleLoadMore} disabled={loadingMore}>
                  {loadingMore ? "Loading…" : "Load More"}
                </button>
              </div>
            </div>
          </div>

          <div className="details-panel">
            {!selectedTx ? (
              <div className="empty-details">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.5">
                  <rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>
                </svg>
                <p>Select a transaction to view details</p>
                {feedbackStats && <FeedbackPanel stats={feedbackStats} />}
              </div>
            ) : (
              <>
                <div className="card details-header-card">
                  <div>
                    <h2 className="details-title">Transaction Details</h2>
                    <p className="details-subtitle">Reviewing for high-risk behaviour analysis</p>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
                    <span className="internal-id">{selectedTx.txn_ref || fmtTxnId(selectedTx.id)}</span>
                    <button className="btn btn-outline audit-btn" style={{ fontSize: 12, padding: "4px 10px" }}
                      onClick={() => setShowAudit(true)}>
                      📋 Audit Trail
                    </button>
                  </div>
                </div>

                {risk && (
                  <div className="classification-banner card" style={{ "--cls-color": classifyScore(risk.score).color, "--cls-bg": classifyScore(risk.score).bg }}>
                    <div className="cls-banner-left">
                      <div className="cls-banner-label">AI Classification</div>
                      <div className="cls-banner-tier">{classifyScore(risk.score).tier}</div>
                    </div>
                    <div className="cls-banner-right">
                      <ClassificationBadge score={risk.score} autoFlagged={risk.auto_flagged} />
                    </div>
                  </div>
                )}

                <div className="details-grid">
                  <div className="card txn-info-card">
                    <div className="card-section-title">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
                      </svg>
                      TRANSACTION INFO
                    </div>
                    <div className="info-row">
                      <span className="info-label">Amount</span>
                      <span className="info-value amount-value">${Number(selectedTx.amount).toFixed(2)} USD</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Transaction ID</span>
                      <span className="info-value mono">{selectedTx.txn_ref || fmtTxnId(selectedTx.id)}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Location</span>
                      <span className="info-value">{selectedTx.location || "Unknown"}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Date</span>
                      <span className="info-value">{selectedTx.time_stamp ? new Date(selectedTx.time_stamp).toLocaleString() : "N/A"}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Status</span>
                      <span className="info-value" style={{ textTransform: "capitalize" }}>{selectedTx.status || "pending"}</span>
                    </div>
                    {selectedTx.class != null && (
                      <div className="info-row">
                        <span className="info-label">Ground Truth</span>
                        <span className="info-value">
                          {selectedTx.class === 1
                            ? <span className="badge badge-danger">Fraud</span>
                            : <span className="badge badge-success">Legit</span>}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="card risk-card">
                    <div className="card-section-title">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
                      </svg>
                      RISK CONFIDENCE SCORE
                    </div>
                    {loading ? (
                      <div className="loading-spinner"><div className="spinner" /><p>Analysing…</p></div>
                    ) : risk ? (
                      <RiskGauge score={risk.score} />
                    ) : (
                      <div className="no-risk">Fetching score…</div>
                    )}
                  </div>
                </div>

                {risk && (
                  <div className="card engine-card">
                    <div className="card-section-title">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="3"/>
                        <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
                      </svg>
                      ENGINE ANALYSIS
                      {risk.weights_used && (
                        <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 400, color: "var(--text-muted)" }}>
                          Rule: {(risk.weights_used.rule * 100).toFixed(0)}% · ML: {(risk.weights_used.ml * 100).toFixed(0)}% · Anomaly: {(risk.weights_used.anomaly * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                    <div className="engine-grid">
                      <div className="engine-col">
                        <div className="engine-label">RULE ENGINE</div>
                        <div className="engine-triggered">
                          <span className="trigger-dot" style={{ background: risk.rule_score > 0 ? "var(--danger)" : "var(--success)" }} />
                          {risk.rule_score > 0 ? "Triggered" : "Clear"}
                        </div>
                        <EngineBar value={risk.rule_score ?? 0} />
                        <div className="engine-detail">Score: {risk.rule_score?.toFixed(1) ?? "—"}</div>
                      </div>
                      <div className="engine-col">
                        <div className="engine-label">ML PROBABILITY</div>
                        <div className="engine-value">{risk.ml_score != null ? (risk.ml_score / 100).toFixed(3) : (risk.score / 100).toFixed(3)}</div>
                        <EngineBar value={risk.ml_score ?? risk.score} />
                        <div className="engine-detail">Model: XGBoost-Ensemble</div>
                      </div>
                      <div className="engine-col">
                        <div className="engine-label">ANOMALY SCORE</div>
                        <div className="engine-value anomaly">
                          {risk.anomaly_score != null ? (risk.anomaly_score / 100).toFixed(3) : "—"}
                          <span className={`anomaly-tag ${risk.tier === "FRAUDULENT" ? "high" : risk.tier === "SUSPICIOUS" ? "med" : "low"}`}>
                            {risk.tier || risk.risk}
                          </span>
                        </div>
                        <EngineBar value={risk.anomaly_score ?? 0} />
                        <div className="engine-detail">Autoencoder reconstruction error</div>
                      </div>
                    </div>
                  </div>
                )}

                {feedbackStats && <FeedbackPanel stats={feedbackStats} />}

                {actionMessage && (
                  <div className={`action-message ${actionMessage.type}`}>{actionMessage.text}</div>
                )}

                {isAnalyst && selectedTx?.status === "review" ? (
                  <div className="analyst-panel card">
                    <div className="card-section-title">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                      </svg>
                      ANALYST DECISION REQUIRED
                    </div>
                    <div className="analyst-note-label">Add Notes (optional)</div>
                    <textarea
                      className="analyst-notes"
                      placeholder="Enter your analysis notes here..."
                      value={analystNotes}
                      onChange={e => setAnalystNotes(e.target.value)}
                      rows={3}
                    />
                    <div className="analyst-buttons">
                      <button className="btn btn-danger" onClick={() => handleAnalystDecision("Fraud")} disabled={actionLoading}>
                        🚩 Mark as Fraud
                      </button>
                      <button className="btn btn-primary" onClick={() => handleAnalystDecision("Legitimate")} disabled={actionLoading}>
                        ✓ Mark as Legitimate
                      </button>
                      <button className="btn btn-outline" onClick={() => handleAnalystDecision("Escalate")} disabled={actionLoading}>
                        ⬆ Escalate
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="action-buttons">
                    <button className="btn btn-outline" onClick={() => handleAction("review")} disabled={actionLoading}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
                      </svg>
                      Send to Review
                    </button>
                    <button className="btn btn-danger" onClick={() => handleAction("flag")} disabled={actionLoading}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                      </svg>
                      Flag as Fraud
                    </button>
                    <button className="btn btn-primary" onClick={() => handleAction("approve")} disabled={actionLoading}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      Approve
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {showAudit && selectedTx && (
        <AuditTimeline txId={selectedTx.id} onClose={() => setShowAudit(false)} />
      )}
    </div>
  );
}

export default HomeDashboard;