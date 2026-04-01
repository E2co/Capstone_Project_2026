from .base import AbstractRule
from typing import Dict, Any

class MicroTransactionRule(AbstractRule):
    """
    Rule to flag suspiciously small transactions (often used for card testing).
    """
    def __init__(self, low_threshold: float = 2.0, weight: float = 1.0):
        super().__init__("Micro Transaction", weight)
        self.low_threshold = low_threshold

    def evaluate(self, transaction: Dict[str, Any], context: Dict[str, Any] = None) -> float:
        amount = transaction.get('amount', 0.0)
    # Give a smaller score that requires 'help' from other rules to flag
        if 0 < amount <= 5.0:
            return 20.0 # Reduced from 40.0
        return 0.0