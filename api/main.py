from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import mysql.connector
from datetime import datetime
from xgboost_engine import XGBoostFraudModel

DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': 'password123',
    'database': 'risknet_db'
}

ml_engine = XGBoostFraudModel(model_path="models/best_model_overall.pkl")

app = FastAPI(title="RiskNet API", version="1.1")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_methods=["*"],
    allow_headers=["*"],
)

#Models
class TransactionInput(BaseModel):
    amount: float
    v1: float; v2: float; v3: float; v4: float; v5: float
    v6: float; v7: float; v8: float; v9: float; v10: float
    v11: float; v12: float; v13: float; v14: float; v15: float
    v16: float; v17: float; v18: float; v19: float; v20: float
    v21: float; v22: float; v23: float; v24: float; v25: float
    v26: float; v27: float; v28: float
    time_stamp: Optional[datetime] = None

class SettingsInput(BaseModel):
    rule_weight: Optional[float] = 70
    ml_core: Optional[float] = 45
    anomaly_weight: Optional[float] = 82
    review_threshold: Optional[float] = 50
    auto_approve_low_risk: Optional[bool] = True

class TransactionAction(BaseModel):
    transaction_id: int
    action: str  # "flag", "approve", "review"
    note: Optional[str] = None

# Helpers
def get_db_connection():
    return mysql.connector.connect(**DB_CONFIG)

def rule_engine_score(transaction):
    if transaction['amount'] > 1000:
        return 80.0
    elif transaction['amount'] > 500:
        return 40.0
    return 10.0

def get_ml_assessment(transaction):
    model_input = {f"V{i}": transaction.get(f"v{i}") for i in range(1, 29)}
    model_input["Amount"] = transaction.get("amount")
    prediction = ml_engine.predict(model_input)
    return prediction

def weighted_ensemble(rule, ml, anomaly=30.0):
    # Weights: ML (50%), Anomaly (30%), Rule (20%)
    final_score = (0.5 * ml) + (0.3 * anomaly) + (0.2 * rule)
    
    if final_score < 40.0:
        risk = "LOW"
    elif final_score < 65.0:
        risk = "MEDIUM"
    else:
        risk = "HIGH"
        
    return {"score": final_score, "risk": risk}
#API ROUTES
@app.get("/transactions/")
def get_transactions(limit: int = 20):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(f"SELECT * FROM transactions ORDER BY time_stamp DESC LIMIT {limit}")
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
        return {"transactions": rows}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/assess_transaction/")
def assess_transaction(tx: TransactionInput):
    try:
        tx_dict = tx.dict()
        rule_val = rule_engine_score(tx_dict)
        ml_results = get_ml_assessment(tx_dict)
        ml_val = ml_results["ml_score"]
        assessment = weighted_ensemble(rule_val, ml_val)
        return {
            "status": "success",
            "ml_details": ml_results,
            "final_assessment": assessment
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/settings/")
def get_settings():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM settings LIMIT 1")
        row = cursor.fetchone()
        cursor.close()
        conn.close()
        if row:
            return row
        # Return defaults if no settings row exists yet
        return {
            "rule_weight": 70,
            "ml_core": 45,
            "anomaly_weight": 82,
            "review_threshold": 50,
            "auto_approve_low_risk": True
        }
    except Exception as e:
        # Return defaults if settings table doesn't exist yet
        return {
            "rule_weight": 70,
            "ml_core": 45,
            "anomaly_weight": 82,
            "review_threshold": 50,
            "auto_approve_low_risk": True
        }


@app.post("/settings/")
def update_settings(data: SettingsInput):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM settings")
        count = cursor.fetchone()[0]
        if count == 0:
            cursor.execute("""
                INSERT INTO settings (rule_weight, ml_core, anomaly_weight, review_threshold, auto_approve_low_risk)
                VALUES (%s, %s, %s, %s, %s)
            """, (data.rule_weight, data.ml_core, data.anomaly_weight, data.review_threshold, data.auto_approve_low_risk))
        else:
            cursor.execute("""
                UPDATE settings SET
                    rule_weight = %s,
                    ml_core = %s,
                    anomaly_weight = %s,
                    review_threshold = %s,
                    auto_approve_low_risk = %s
            """, (data.rule_weight, data.ml_core, data.anomaly_weight, data.review_threshold, data.auto_approve_low_risk))
        conn.commit()
        cursor.close()
        conn.close()
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/transaction_action/")
def transaction_action(data: TransactionAction):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE transactions SET status = %s WHERE id = %s
        """, (data.action, data.transaction_id))
        conn.commit()
        cursor.close()
        conn.close()
        return {"status": "success", "action": data.action, "transaction_id": data.transaction_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/analytics/")
def get_analytics():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT COUNT(*) as total FROM transactions")
        total = cursor.fetchone()["total"]

        cursor.execute("SELECT COUNT(*) as flagged FROM transactions WHERE status = 'flag'")
        flagged = cursor.fetchone()["flagged"]

        cursor.execute("SELECT COUNT(*) as approved FROM transactions WHERE status = 'approve'")
        approved = cursor.fetchone()["approved"]

        cursor.close()
        conn.close()

        return {
            "total_transactions": total,
            "flagged": flagged,
            "approved": approved,
            "latency": 42,
            "accuracy": 98.2,
            "feature_importance": {
                "amount": 30,
                "location": 20,
                "time": 60
            },
            "confusion_matrix": {
                "tp": 0.85,
                "fn": 0.15,
                "fp": 0.10,
                "tn": 0.90
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/retrain/")
def retrain_model():
    try:
        global ml_engine
        ml_engine = XGBoostFraudModel(model_path="models/best_model_overall.pkl")
        return {"status": "success", "message": "Model reloaded successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
