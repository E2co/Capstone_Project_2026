import axios from "axios";

const API = axios.create({ baseURL: "http://127.0.0.1:8000" });

// ── Transactions ──────────────────────────────────────────────────────────────
export const getTransactions = (limit = 20, filters = {}) => {
  const params = { limit };
  if (filters.search)     params.search     = filters.search;
  if (filters.status && filters.status !== "all") params.status = filters.status;
  if (filters.fraudClass != null) params["class"] = filters.fraudClass;
  if (filters.minAmount  != null) params.min_amount = filters.minAmount;
  if (filters.maxAmount  != null) params.max_amount = filters.maxAmount;
  return API.get("/transactions/", { params });
};

export const assessTransaction = (data) => API.post("/assess_transaction/", data);
export const transactionAction  = (data) => API.post("/transaction_action/", data);

// ── Settings ──────────────────────────────────────────────────────────────────
export const getSettings    = ()     => API.get("/settings/");
export const updateSettings = (data) => API.post("/settings/", data);
export const getHealth = () => API.get("/health/");

// ── Analytics ─────────────────────────────────────────────────────────────────
export const getAnalytics = (filters = {}) => {
  const params = {};
  if (filters.dateFrom) params.date_from = filters.dateFrom;
  if (filters.dateTo)   params.date_to   = filters.dateTo;
  return API.get("/analytics/", { params });
};

// ── Export (triggers browser file download) ───────────────────────────────────
export const exportTransactions = async (filters = {}) => {
  const params = { format: "csv" };
  if (filters.status && filters.status !== "all") params.status = filters.status;
  if (filters.fraudClass != null) params["class"] = filters.fraudClass;
  if (filters.dateFrom) params.date_from = filters.dateFrom;
  if (filters.dateTo)   params.date_to   = filters.dateTo;
  const response = await API.get("/export/transactions/", { params, responseType: "blob" });
  const url  = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href  = url;
  link.setAttribute("download", `risknet_export_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click(); link.remove();
  window.URL.revokeObjectURL(url);
};

// ── Audit log ─────────────────────────────────────────────────────────────────
export const getAuditLog = (transactionId = null, limit = 50) => {
  const params = { limit };
  if (transactionId) params.transaction_id = transactionId;
  return API.get("/audit_log/", { params });
};

// ── Feedback ──────────────────────────────────────────────────────────────────
export const getFeedback  = (limit = 100) => API.get("/feedback/", { params: { limit } });
export const submitAnalystFeedback = (transactionId, data) =>
  API.post(`/feedback/${transactionId}`, data);

// ── Retrain ───────────────────────────────────────────────────────────────────
export const retrainModel = () => API.post("/retrain/");
