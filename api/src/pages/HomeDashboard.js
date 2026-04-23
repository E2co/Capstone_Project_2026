import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import { getTransactions, assessTransaction } from "../services/api";
import axios from "axios";
import "./HomeDashboard.css";

const API = axios.create({ baseURL: "http://127.0.0.1:8000" });

function RiskScoreGauge({ score }) {
  const color = score >= 75 ? "#EF4444" : score >= 40 ? "#F59E0B" : "#10B981";
  const label = score >= 75 ? "CRITICAL SEVERITY" : score >= 40 ? "MEDIUM SEVERITY" : "LOW RISK";
  const labelColor = score >= 75 ? "#EF4444" : score >= 40 ? "#F59E0B" : "#10B981";
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (score / 100) * circumference;

  return (
    <div className="risk-gauge">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="#E2E8F0" strokeWidth="10"/>
        <circle
          cx="70" cy="70" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform="rotate(-90 70 70)"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
        <text x="70" y="65" textAnchor="middle" fontSize="28" fontWeight="700" fill="#0F172A" fontFamily="DM Sans">
          {Math.round(score)}
        </text>
        <text x="70" y="82" textAnchor="middle" fontSize="11" fill="#94A3B8" fontFamily="DM Sans">
          / 100
        </text>
      </svg>
      <div className="risk-label" style={{ color: labelColor }}>{label}</div>
    </div>
  );
}

function EngineBar({ value, max = 1 }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="engine-bar-track">
      <div className="engine-bar-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

function formatTime(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const now = new Date();
  const diffMin = Math.floor((now - date) / 60000);
  if (diffMin < 60) return `${diffMin}m ago`;
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getRiskBadge(risk) {
  if (!risk) return null;
  if (risk === "HIGH") return <span className="badge badge-danger">⚠ High Risk Flag</span>;
  if (risk === "MEDIUM") return <span className="badge badge-warning">⏳ Pending Review</span>;
  return <span className="badge badge-success">✓ Low Risk</span>;
}

function HomeDashboard() {
  const [transactions, setTransactions] = useState([]);
  const [selectedTx, setSelectedTx] = useState(null);
  const [risk, setRisk] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [riskCache, setRiskCache] = useState({});
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(20);
  const [loadingMore, setLoadingMore] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  useEffect(() => {
    getTransactions(limit)
      .then((res) => setTransactions(res.data.transactions))
      .catch(() => setError("Failed to load transactions"));
  }, []);

  const handleLoadMore = () => {
    const newLimit = limit + 20;
    setLimit(newLimit);
    setLoadingMore(true);
    getTransactions(newLimit)
      .then((res) => {
        setTransactions(res.data.transactions);
        setLoadingMore(false);
      })
      .catch(() => {
        setError("Failed to load more");
        setLoadingMore(false);
      });
  };

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
      ...Object.fromEntries(
        Array.from({ length: 28 }, (_, i) => [
          `v${i + 1}`,
          selectedTx[`v${i + 1}`] ?? selectedTx[`V${i + 1}`] ?? 0,
        ])
      ),
    };

    assessTransaction(payload)
      .then((res) => {
        const result = res.data.final_assessment;
        setRisk(result);
        setRiskCache((prev) => ({ ...prev, [txId]: result }));
      })
      .catch(() => setError("Risk assessment failed"))
      .finally(() => setLoading(false));
  }, [selectedTx, riskCache]);

  const handleAction = (action) => {
    if (!selectedTx) return;
    setActionLoading(true);
    setActionMessage(null);

    API.post("/transaction_action/", {
      transaction_id: selectedTx.id,
      action: action,
    })
      .then(() => {
        const label =
          action === "flag"
            ? "🚩 Flagged as Fraud"
            : action === "approve"
            ? "✓ Transaction Approved"
            : "👁 Sent to Review";
        setActionMessage({ text: label, type: action });
        setTransactions((prev) =>
          prev.map((tx) =>
            tx.id === selectedTx.id ? { ...tx, status: action } : tx
          )
        );
        setSelectedTx((prev) => ({ ...prev, status: action }));
      })
      .catch(() => setActionMessage({ text: "Action failed", type: "error" }))
      .finally(() => setActionLoading(false));
  };

  const filtered = transactions.filter((tx) => {
    const q = search.toLowerCase();
    return (
      String(tx.id).includes(q) ||
      String(tx.amount).includes(q) ||
      (tx.location && tx.location.toLowerCase().includes(q))
    );
  });

  return (
    <div className="layout">
      <Sidebar />
      <div className="main-content">
        {/* Header */}
        <div className="page-header">
          <h1 className="header-title">Fraud Monitoring Console</h1>
          <div className="header-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              placeholder="Search transactions, UIDs, or locations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="header-actions">
            <button className="icon-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="home-body">
          {/* Left: Transaction List */}
          <div className="txn-panel">
            <div className="txn-panel-header">
              <span className="txn-panel-title">ACTIVE ALERTS</span>
              <span className="new-badge">{filtered.length} New</span>
            </div>

            {error && <div className="error-msg">{error}</div>}

            <div className="txn-list">
              {filtered.length === 0 && !error && (
                <div className="empty-state">No transactions found</div>
              )}
              {filtered.map((tx) => {
                const cached = riskCache[tx.id];
                const isSelected = selectedTx?.id === tx.id;
                return (
                  <div
                    key={tx.id}
                    className={`txn-item ${isSelected ? "txn-item--selected" : ""}`}
                    onClick={() => {
                      setSelectedTx(tx);
                      setActionMessage(null);
                    }}
                  >
                    <div className="txn-item-top">
                      <span className="txn-id">TXN #{tx.id}</span>
                      <span className="txn-time">{formatTime(tx.time_stamp)}</span>
                    </div>
                    <div className="txn-amount">${Number(tx.amount).toFixed(2)}</div>
                    <div>
                      {tx.status && tx.status !== "pending"
                        ? (() => {
                            if (tx.status === "flag") return <span className="badge badge-danger">🚩 Flagged</span>;
                            if (tx.status === "approve") return <span className="badge badge-success">✓ Approved</span>;
                            if (tx.status === "review") return <span className="badge badge-warning">👁 In Review</span>;
                            return null;
                          })()
                        : getRiskBadge(cached?.risk)}
                    </div>
                  </div>
                );
              })}

              {/* Load More Button */}
              <div className="load-more-wrap">
                <button
                  className="load-more-btn"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? "Loading..." : "Load More"}
                </button>
              </div>
            </div>
          </div>

          {/* Right: Transaction Details */}
          <div className="details-panel">
            {!selectedTx ? (
              <div className="empty-details">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.5">
                  <rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>
                </svg>
                <p>Select a transaction to view details</p>
              </div>
            ) : (
              <>
                <div className="card details-header-card">
                  <div>
                    <h2 className="details-title">Transaction Details</h2>
                    <p className="details-subtitle">Reviewing transaction record for high-risk behavior analysis</p>
                  </div>
                  <span className="internal-id">Internal ID: TXN_A{selectedTx.id}B_99</span>
                </div>

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
                      <span className="info-label">UID</span>
                      <span className="info-value mono">{selectedTx.uid || `8823-XYZ-${selectedTx.id}`}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Location</span>
                      <span className="info-value">{selectedTx.location || "Unknown"}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Date</span>
                      <span className="info-value">
                        {selectedTx.time_stamp ? new Date(selectedTx.time_stamp).toLocaleString() : "N/A"}
                      </span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Status</span>
                      <span className="info-value" style={{ textTransform: "capitalize" }}>
                        {selectedTx.status || "pending"}
                      </span>
                    </div>
                  </div>

                  <div className="card risk-card">
                    <div className="card-section-title">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
                      </svg>
                      RISK CONFIDENCE SCORE
                    </div>
                    {loading ? (
                      <div className="loading-spinner">
                        <div className="spinner"/>
                        <p>Assessing...</p>
                      </div>
                    ) : risk ? (
                      <RiskScoreGauge score={risk.score} />
                    ) : (
                      <div className="no-risk">Fetching risk score...</div>
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
                    </div>
                    <div className="engine-grid">
                      <div className="engine-col">
                        <div className="engine-label">RULE ENGINE</div>
                        <div className="engine-triggered">
                          <span className="trigger-dot"/>
                          {risk.score > 40 ? "Triggered" : "Clear"}
                        </div>
                        <div className="engine-detail">
                          {risk.score > 40 ? "Match: Policy #R-542 (High Value)" : "No matching rules"}
                        </div>
                      </div>
                      <div className="engine-col">
                        <div className="engine-label">ML PROBABILITY</div>
                        <div className="engine-value">{(risk.score / 100).toFixed(2)}</div>
                        <EngineBar value={risk.score / 100} />
                        <div className="engine-detail">Model: Fraud-V4-Ensemble</div>
                      </div>
                      <div className="engine-col">
                        <div className="engine-label">ANOMALY SCORE</div>
                        <div className="engine-value anomaly">
                          {(risk.score / 180).toFixed(2)}
                          <span className={`anomaly-tag ${risk.risk === "HIGH" ? "high" : risk.risk === "MEDIUM" ? "med" : "low"}`}>
                            {risk.risk}
                          </span>
                        </div>
                        <div className="engine-detail">Standard deviation &gt; 3.2</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Message */}
                {actionMessage && (
                  <div className={`action-message ${actionMessage.type}`}>
                    {actionMessage.text}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="action-buttons">
                  <button
                    className="btn btn-outline"
                    onClick={() => handleAction("review")}
                    disabled={actionLoading}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
                    </svg>
                    Send to Review
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleAction("flag")}
                    disabled={actionLoading}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    </svg>
                    Flag as Fraud
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => handleAction("approve")}
                    disabled={actionLoading}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Approve Transaction
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomeDashboard;