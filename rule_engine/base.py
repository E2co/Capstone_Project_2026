from abc import ABC, abstractmethod
from typing import Dict, Any

class AbstractRule(ABC):
    """ 
    Base class for all fraud detection rules.
    """

    def __init__(self, name: str, weight: float = 1.0):
        self.name = name
        self.weight = weight

    @abstractmethod
    def evaluate(self, transaction: Dict[str, Any], context: Dict[str, Any] = None) -> float:
        """
        Evaluate the rule against a transaction.

        Args:
            transaction: Dictionary containing transaction data
            context: Optional context data (e.g., historical transactions)

        Returns:
            A risk score. Higher the score, higher the risk.
        """
        pass

    def get_risk_score(self, transaction: Dict[str, Any], context: Dict[str, Any] = None) -> float:
        """
        Grabs the weighted risk score for the specific rule.
        """
        base_score = self.evaluate(transaction, context)
        return base_score * self.weight