"""
feedback_service.py
Handles analyst feedback: writing labels and reading stats.
"""


def write_feedback(conn, transaction_id: int, action: str) -> None:
    """
    Map analyst action → fraud/legit label and persist in feedback table.
    flag → fraud | approve/review → legit
    """
    label = "fraud" if action == "flag" else "legit"
    try:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO feedback (transaction_id, label, analyst_action) "
            "VALUES (%s, %s, %s)",
            (transaction_id, label, action),
        )
        conn.commit()
        cursor.close()
    except Exception as e:
        print(f"[feedback_service] write failed: {e}")


def get_feedback_stats(conn) -> dict:
    """Return aggregate feedback counts and last action details."""
    try:
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT COUNT(*) AS v FROM feedback")
        total = cursor.fetchone()["v"]

        cursor.execute("SELECT COUNT(*) AS v FROM feedback WHERE label='fraud'")
        fraud = cursor.fetchone()["v"]

        cursor.execute("SELECT COUNT(*) AS v FROM feedback WHERE label='legit'")
        legit = cursor.fetchone()["v"]

        cursor.execute(
            "SELECT analyst_action, label, created_at FROM feedback "
            "ORDER BY created_at DESC LIMIT 1"
        )
        last = cursor.fetchone()
        cursor.close()

        return {
            "total":       total,
            "fraud_labels": fraud,
            "legit_labels": legit,
            "last_action":  last,
        }
    except Exception as e:
        print(f"[feedback_service] stats failed: {e}")
        return {"total": 0, "fraud_labels": 0, "legit_labels": 0, "last_action": None}


def get_feedback_list(conn, limit: int = 100) -> list:
    """Return recent feedback entries."""
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        "SELECT * FROM feedback ORDER BY created_at DESC LIMIT %s", (limit,)
    )
    rows = cursor.fetchall()
    cursor.close()
    return rows