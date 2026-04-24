import axios from "axios";

const API = axios.create({
  baseURL: "http://127.0.0.1:8000",
});

export const getTransactions = (limit = 10) => API.get(`/transactions/?limit=${limit}`);

export const assessTransaction = (data) => API.post("/assess_transaction/", data);

export const getSettings = () => API.get("/settings/");

export const updateSettings = (data) => API.post("/settings/", data);

export const getAnalytics = () => API.get("/analytics/");

export const transactionAction = (data)         => API.post("/transaction_action/", data);
