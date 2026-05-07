import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import mysql.connector
from datetime import datetime
from ml_engine.xgboost_engine import XGBoostFraudModel
from anomaly_engine.ae_layer import AutoencoderFraudModel

# Rule engine imports
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))
from rule_engine.engine import RuleEngine
from rule_engine.blacklisted_ip import BlacklistedIPRule
from rule_engine.high_velocity import HighVelocityRule
from rule_engine.new_country import NewCountryRule
from rule_engine.lrg_transaction import LrgTransactionAmountRule
from rule_engine.micro_transaction import MicroTransactionRule
from rule_engine.burst_testing import BurstTestingRule

DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': 'password123',
    'database': 'risknet_db'
}

# ── Model Initialisation ──────────────────────────────────────────────────────

ml_engine = XGBoostFraudModel(model_path="../Models/best_model_overall.pkl")

try:
    anomaly_engine = AutoencoderFraudModel(
        model_path="../Models/autoencoder_refined.keras",
        scaler_path="../Models/autoencoder_scaler.pkl",
        threshold_path="../Models/autoencoder_threshold.pkl",
    )
except FileNotFoundError:
    anomaly_engine = None
    print("WARNING: Autoencoder model not found. Anomaly engine disabled.")

# ── Rule Engine Initialisation ────────────────────────────────────────────────

BLACKLISTED_IPS = {'192.168.1.1', '10.0.0.1', '172.16.0.5', '192.168.1.100'}

rule_engine = RuleEngine([
    BlacklistedIPRule(BLACKLISTED_IPS),
    HighVelocityRule(limit=10000.0, window_hours=1),
    NewCountryRule(),
    LrgTransactionAmountRule(threshold=1000.0),
    MicroTransactionRule(low_threshold=2.0),
    BurstTestingRule(amount_limit=5.0, count_limit=3, window_minutes=15),
])

# ── Default Settings ──────────────────────────────────────────────────────────

DEFAULT_SETTINGS = {
    "rule_weight": 70,
    "ml_core": 45,
    "anomaly_weight": 82,
    "review_threshold": 50,
    "auto_approve_low_risk": True
}

app = FastAPI(title="RiskNet API", version="1.2")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Pydantic Models ───────────────────────────────────────────────────────────

class TransactionInput(BaseModel):
    amount: float
    v1: float; v2: float; v3: float; v4: float; v5: float
    v6: float; v7: float; v8: float; v9: float; v10: float
    v11: float; v12: float; v13: float; v14: float; v15: float
    v16: float; v17: float; v18: float; v19: float; v20: float
    v21: float; v22: float; v23: float; v24: float; v25: float
    v26: float; v27: float; v28: float
    time_stamp: Optional[datetime] = None
    # Optional context fields for rule engine
    ip_address: Optional[str] = None
    country: Optional[str] = None
    user_id: Optional[str] = None

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

# ── Helpers ───────────────────────────────────────────────────────────────────

def get_db_connection():
    return mysql.connector.connect(**DB_CONFIG)


def _load_settings_from_db() -> dict:
    """Load settings from DB, fall back to defaults on any error."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM settings LIMIT 1")
        row = cursor.fetchone()
        cursor.close()
        conn.close()
        if row:
            return row
    except Exception:
        pass
    return DEFAULT_SETTINGS.copy()


def _normalize_weights(rule_w: float, ml_w: float, anomaly_w: float):
    """
    Convert the 0-100 slider values from settings into proper ensemble
    weights that sum to 1.0.
    """
    total = rule_w + ml_w + anomaly_w
    if total == 0:
        return 1/3, 1/3, 1/3
    return rule_w / total, ml_w / total, anomaly_w / total


def rule_engine_score(transaction: dict, context: dict = None) -> float:
    """
    Run the real rule engine and return a 0-100 normalised score.
    The rule engine's max theoretical score varies by rules loaded;
    we cap and scale to 100.
    """
    result = rule_engine.evaluate_transaction(transaction, context)
    raw = result["total_risk_score"]
    # Max possible from current rules: 20+50+20+50+20 = 160 — scale to 100
    MAX_RULE_SCORE = 160.0
    return min((raw / MAX_RULE_SCORE) * 100.0, 100.0)


def get_ml_score(transaction: dict) -> dict:
    model_input = {f"V{i}": transaction.get(f"v{i}") for i in range(1, 29)}
    model_input["Amount"] = transaction.get("amount")
    return ml_engine.predict(model_input)


def get_anomaly_score(transaction: dict) -> float:
    """Return anomaly ml_score (0-100), or 30.0 if engine unavailable."""
    if anomaly_engine is None:
        return 30.0
    model_input = {f"V{i}": transaction.get(f"v{i}") for i in range(1, 29)}
    model_input["Amount"] = transaction.get("amount")
    result = anomaly_engine.predict(model_input)
    return result["ml_score"]


def weighted_ensemble(rule: float, ml: float, anomaly: float,
                      rule_w: float, ml_w: float, anomaly_w: float,
                      review_threshold: float) -> dict:
    """Combine scores using dynamically loaded weights from settings."""
    final_score = (ml_w * ml) + (anomaly_w * anomaly) + (rule_w * rule)

    if final_score < review_threshold * 0.6:
        risk = "LOW"
    elif final_score < review_threshold:
        risk = "MEDIUM"
    else:
        risk = "HIGH"

    return {"score": round(final_score, 2), "risk": risk}

# ── API Routes ────────────────────────────────────────────────────────────────

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

        # Load live settings to drive ensemble weights
        settings = _load_settings_from_db()
        rule_w, ml_w, anomaly_w = _normalize_weights(
            settings.get("rule_weight", DEFAULT_SETTINGS["rule_weight"]),
            settings.get("ml_core",     DEFAULT_SETTINGS["ml_core"]),
            settings.get("anomaly_weight", DEFAULT_SETTINGS["anomaly_weight"]),
        )
        review_threshold = float(settings.get("review_threshold", DEFAULT_SETTINGS["review_threshold"]))

        # Build rule engine context from optional request fields
        context = None
        if tx_dict.get("user_id") or tx_dict.get("ip_address") or tx_dict.get("country"):
            context = {
                "historical_transactions": {},
                "user_countries": {
                    tx_dict.get("user_id", "unknown"): set()
                }
            }

        rule_val    = rule_engine_score(tx_dict, context)
        ml_results  = get_ml_score(tx_dict)
        ml_val      = ml_results["ml_score"]
        anomaly_val = get_anomaly_score(tx_dict)

        assessment = weighted_ensemble(
            rule=rule_val,
            ml=ml_val,
            anomaly=anomaly_val,
            rule_w=rule_w,
            ml_w=ml_w,
            anomaly_w=anomaly_w,
            review_threshold=review_threshold,
        )

        return {
            "status": "success",
            "ml_details": ml_results,
            "anomaly_score": round(anomaly_val, 2),
            "rule_score": round(rule_val, 2),
            "weights_used": {
                "rule": round(rule_w, 3),
                "ml": round(ml_w, 3),
                "anomaly": round(anomaly_w, 3),
            },
            "final_assessment": assessment,
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
        return DEFAULT_SETTINGS.copy()
    except Exception:
        return DEFAULT_SETTINGS.copy()


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

        cursor.execute("SELECT COUNT(*) as reviewed FROM transactions WHERE status = 'review'")
        reviewed = cursor.fetchone()["reviewed"]

        # Fraud rate by class if class column exists
        try:
            cursor.execute("SELECT COUNT(*) as fraud FROM transactions WHERE class = 1")
            fraud_count = cursor.fetchone()["fraud"]
        except Exception:
            fraud_count = 0

        cursor.close()
        conn.close()

        fraud_rate = round((fraud_count / total * 100), 2) if total > 0 else 0
        flag_rate  = round((flagged / total * 100), 2) if total > 0 else 0

        return {
            "total_transactions": total,
            "flagged": flagged,
            "approved": approved,
            "reviewed": reviewed,
            "fraud_count": fraud_count,
            "fraud_rate": fraud_rate,
            "flag_rate": flag_rate,
            "latency": 42,
            "accuracy": 98.2,
            "feature_importance": {
                "amount": 30,
                "location": 20,
                "time": 60,
            },
            "confusion_matrix": {
                "tp": 0.85,
                "fn": 0.15,
                "fp": 0.10,
                "tn": 0.90,
            },
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