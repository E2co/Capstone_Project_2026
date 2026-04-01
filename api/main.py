from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
import mysql.connector
import pandas as pd
from datetime import datetime

DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',          # your MySQL username
    'password': 'password123',  # your MySQL password
    'database': 'risknet_db'
}

# FastAPI app
app = FastAPI(title="RiskNet API", version="1.0")

# Pydantic model for transaction input
class TransactionInput(BaseModel):
    amount: float
    v1: float; v2: float; v3: float; v4: float; v5: float
    v6: float; v7: float; v8: float; v9: float; v10: float
    v11: float; v12: float; v13: float; v14: float; v15: float
    v16: float; v17: float; v18: float; v19: float; v20: float
    v21: float; v22: float; v23: float; v24: float; v25: float
    v26: float; v27: float; v28: float
    time_stamp: Optional[datetime] = None

# Connect to MySQL 
def get_db_connection():
    conn = mysql.connector.connect(**DB_CONFIG)
    return conn

#Get ransaction history 
def fetch_user_history(last_n=5):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(f"SELECT * FROM transactions ORDER BY time_stamp DESC LIMIT {last_n}")
    result = cursor.fetchall()
    cursor.close()
    conn.close()
    return pd.DataFrame(result)

# Placeholder scoring functions
def rule_engine_score(transaction):
    #(I can edit this but for now it works for a limit of 5000. So if over it returns a high score else it gives a low one)
    if transaction['amount'] > 5000:
        return 80.0
    return 10.0

def ml_score(transaction):

    return 50.0  # fixed value

def anomaly_score(transaction):
   
    return 30.0 

def weighted_ensemble(rule, ml, anomaly):
    final_score = 0.2 * rule + 0.5 * ml + 0.3 * anomaly
    if final_score < 50.0:
        risk = "LOW"
    elif final_score < 80.0:
        risk = "MEDIUM"
    else:
        risk = "HIGH"
    return {"score": final_score, "risk": risk}

# API endpoint: assess transaction
@app.post("/assess_transaction/")
def assess_transaction(tx: TransactionInput):
    try:
        # Convert Pydantic model to dict for processing
        tx_dict = tx.dict()
        
        # Fetch recent history (optional)
        history_df = fetch_user_history()
        
        # Compute scores
        rule = rule_engine_score(tx_dict)
        ml = ml_score(tx_dict)
        anomaly = anomaly_score(tx_dict)
        result = weighted_ensemble(rule, ml, anomaly)
        
        return {"transaction": tx_dict, "assessment": result}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Optional: fetch last N transactions (for dashboard)
@app.get("/transactions/")
def get_transactions(limit: int = 10):
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
