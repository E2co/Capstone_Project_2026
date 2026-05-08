from .base import AbstractRule
from typing import Dict, Any
from datetime import datetime, timedelta


class HighVelocityRule(AbstractRule):
    """
    Rule that checks for high velocity transactions.
    Flags when the total spend by a user within `window_hours` exceeds `limit`.
    """

    def __init__(self, limit: float, window_hours: int = 1, weight: float = 1.0):
        super().__init__("High Velocity", weight)
        self.limit = limit
        self.window_hours = window_hours

    def evaluate(self, transaction: Dict[str, Any], context: Dict[str, Any] = None) -> float:
        if not context or 'historical_transactions' not in context:
            return 0.0

        user_id        = transaction.get('user_id')
        current_time   = transaction.get('timestamp')
        current_amount = transaction.get('amount', 0.0)

        if not user_id or not current_time:
            return 0.0

        history      = context.get('historical_transactions', {}).get(user_id, [])
        window_start = current_time - timedelta(hours=self.window_hours)

        windowed_total = sum(
            t.get('amount', 0.0)
            for t in history
            if window_start <= t.get('timestamp', datetime.min) <= current_time
        ) + current_amount

        if windowed_total > self.limit:
            return 50.0

        return 0.0