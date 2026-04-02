# ml_engine/xgboost_model.py
import pickle
import pandas as pd

class XGBoostFraudModel:
    # Order matters — must match training exactly
    FEATURE_COLS = [
        'V1','V2','V3','V4','V5','V6','V7','V8','V9','V10',
        'V11','V12','V13','V14','V15','V16','V17','V18','V19','V20',
        'V21','V22','V23','V24','V25','V26','V27','V28',
        'Amount'   # ← Amount is LAST
    ]

    def __init__(self, model_path: str = "models/best_model_overall.pkl"):
        with open(model_path, "rb") as f:
            self.model = pickle.load(f)

    def predict(self, transaction: dict) -> dict:
        df = pd.DataFrame([transaction])[self.FEATURE_COLS]  # enforces column order
        fraud_prob = float(self.model.predict_proba(df)[0][1])
        return {
            "fraud_probability": fraud_prob,
            "ml_score": fraud_prob * 100,
            "signal": "HIGH" if fraud_prob > 0.3 else "LOW"
        }
