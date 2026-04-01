from .base import AbstractRule
from typing import Dict, Any

class LrgTransactionAmountRule(AbstractRule):
    """
    Rule to check if the transaction amount is unusually excessive.
    """

    def __init__(self, threshold: float, weight: float = 1.0):
        super().__init__("Large Transaction", weight)
        self.threshold = threshold

    def evaluate(self, transaction: Dict[str, Any], context: Dict[str, Any] = None) -> float:
        trans_amount = transaction.get('amount', 0.0)
        
        if trans_amount > self.threshold:
            return 50.0
        return 0.0