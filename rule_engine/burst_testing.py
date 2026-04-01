from .base import AbstractRule
from typing import Dict, Any
from datetime import timedelta

class BurstTestingRule(AbstractRule):
    """
    Detects multiple small transactions in a short window.
    """
    def __init__(self, amount_limit: float = 5.0, count_limit: int = 3, window_minutes: int = 15, weight: float = 1.0):
        super().__init__("Burst Testing", weight)
        self.amount_limit = amount_limit
        self.count_limit = count_limit
        self.window_minutes = window_minutes

    def evaluate(self, transaction: Dict[str, Any], context: Dict[str, Any] = None) -> float:
        if not context or 'historical_transactions' not in context:
            return 0.0
            
        current_amount = transaction.get('amount', 0.0)
        current_time = transaction.get('timestamp')
        user_id = transaction.get('user_id')
        
        # Rule only applies to small amounts (Card Testing)
        if current_amount > self.amount_limit or current_amount <= 0:
            return 0.0
            
        history = context.get('historical_transactions', {}).get(user_id, [])
        window_start = current_time - timedelta(minutes=self.window_minutes)
        
        # Count previous SMALL transactions in the window
        small_burst_count = len([
            t for t in history 
            if window_start <= t['timestamp'] <= current_time 
            and 0 < t['amount'] <= self.amount_limit
        ])
        
        # If this is the Nth small transaction, trigger the risk score
        if small_burst_count >= self.count_limit:
            return 50.0 
        return 0.0