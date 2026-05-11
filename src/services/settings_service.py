"""
settings_service.py
Handles loading and saving system configuration settings.
"""

from .scoring_service import DEFAULT_SETTINGS

# In-memory cache — updated atomically on every POST /settings/
# This means weight changes apply to the NEXT scoring call with zero restart.
_cache: dict = DEFAULT_SETTINGS.copy()


def get_live() -> dict:
    """Return the current in-memory settings (always up-to-date)."""
    return _cache


def load_from_db(conn) -> dict:
    """Load settings from DB row, fall back to defaults on any error."""
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM settings LIMIT 1")
        row = cursor.fetchone()
        cursor.close()
        if row:
            return row
    except Exception:
        pass
    return DEFAULT_SETTINGS.copy()


def save_to_db(conn, data: dict) -> None:
    """Upsert settings row and refresh the in-memory cache."""
    global _cache
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM settings")
    count = cursor.fetchone()[0]

    fields = (
        data["rule_weight"], data["ml_core"], data["anomaly_weight"],
        data["review_threshold"], data["auto_approve_low_risk"],
        data.get("auto_flag_high_risk", False),
    )

    if count == 0:
        cursor.execute(
            """INSERT INTO settings
               (rule_weight, ml_core, anomaly_weight, review_threshold,
                auto_approve_low_risk, auto_flag_high_risk)
               VALUES (%s, %s, %s, %s, %s, %s)""",
            fields,
        )
    else:
        cursor.execute(
            """UPDATE settings SET
               rule_weight=%s, ml_core=%s, anomaly_weight=%s,
               review_threshold=%s, auto_approve_low_risk=%s,
               auto_flag_high_risk=%s""",
            fields,
        )
    conn.commit()
    cursor.close()

    # Refresh cache immediately
    _cache = {
        "rule_weight":           data["rule_weight"],
        "ml_core":               data["ml_core"],
        "anomaly_weight":        data["anomaly_weight"],
        "review_threshold":      data["review_threshold"],
        "auto_approve_low_risk": data["auto_approve_low_risk"],
        "auto_flag_high_risk":   data.get("auto_flag_high_risk", False),
    }