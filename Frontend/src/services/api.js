import axios from "axios";

const API = axios.create({
  baseURL: "http://127.0.0.1:8000",
});

export const getTransactions = (limit = 20, filters = {}) => {
  const params = new URLSearchParams();
  params.append("limit", limit);
  if (filters.search) params.append("search", filters.search);
  if (filters.status && filters.status !== "all") params.append("status", filters.status);
  if (filters.fraudClass !== null && filters.fraudClass !== undefined) params.append("class", filters.fraudClass);
  if (filters.min_amount) params.append("min_amount", filters.min_amount);
  if (filters.max_amount) params.append("max_amount", filters.max_amount);
  return API.get(`/transactions/?${params.toString()}`);
};

export const assessTransaction = (data) => API.post("/assess_transaction/", data);

export const transactionAction = (data) => API.post("/transaction_action/", data);

export const getSettings = () => API.get("/settings/");

export const updateSettings = (data) => API.post("/settings/", data);

export const getAnalytics = (dateFrom = null, dateTo = null) => {
  const params = new URLSearchParams();
  if (dateFrom) params.append("date_from", dateFrom);
  if (dateTo) params.append("date_to", dateTo);
  const q = params.toString();
  return API.get(`/analytics/${q ? "?" + q : ""}`);
};
export const getAuditLog = (transactionId = null, limit = 50) => {
  const params = new URLSearchParams();
  if (transactionId) params.append("transaction_id", transactionId);
  params.append("limit", limit);
  return API.get(`/audit_log/?${params.toString()}`);
};

export const getFeedback = (limit = 100) => API.get(`/feedback/?limit=${limit}`);
