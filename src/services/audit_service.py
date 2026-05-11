"""
audit_service.py
Handles writing and reading audit log entries.
"""

from typing import Optional


def write_audit_log(conn, transaction_id: Optional[int], ml_score: float,
                    anomaly_score: float, rule_score: float, final_score: float,
                    risk_tier: str, auto_flagged: bool = False) -> None:
    """Insert one scoring event into audit_log. Silently swallows DB errors."""
    try:
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO audit_log
               (transaction_id, ml_score, anomaly_score, rule_score,
                final_score, risk_tier, auto_flagged)
               VALUES (%s, %s, %s, %s, %s, %s, %s)""",
            (transaction_id, ml_score, anomaly_score, rule_score,
             final_score, risk_tier, auto_flagged),
        )
        conn.commit()
        cursor.close()
    except Exception as e:
        print(f"[audit_service] write failed: {e}")


def get_audit_entries(conn, transaction_id: Optional[int] = None,
                      limit: int = 50) -> list:
    """Fetch audit log entries, optionally filtered by transaction_id."""
    cursor = conn.cursor(dictionary=True)
    if transaction_id:
        cursor.execute(
            "SELECT * FROM audit_log WHERE transaction_id = %s "
            "ORDER BY created_at DESC LIMIT %s",
            (transaction_id, limit),
        )
    else:
        cursor.execute(
            "SELECT * FROM audit_log ORDER BY created_at DESC LIMIT %s",
            (limit,),
        )
    rows = cursor.fetchall()
    cursor.close()
    return rows