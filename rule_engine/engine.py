from .base import AbstractRule
from typing import Dict, Any, List

class RuleEngine:
    """
    Engine to run the rules and compute the final risk score.
    """

    def __init__(self, rules: List[AbstractRule]):
        self.rules = rules

    def evaluate_transaction(self, transaction: Dict[str, Any], context: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Evaluate the transaction against all rules and compute the final risk score.

        Returns:
            Dict with total_score and individual rule scores.
        """
        total_score = 0.0
        rule_scores = {}

        for r in self.rules:
            score = r.get_risk_score(transaction, context)
            rule_scores[r.name] = score
            total_score += score

        return {
            'total_risk_score': total_score,
            'rule_scores': rule_scores,
            # HIGH  >= 100: two strong signals (e.g. Velocity+Burst, Velocity+Large) → block/review
            # MEDIUM >= 60: one strong + one weak (e.g. Velocity+Micro, Burst+Micro) → monitor
            # LOW   <  60: single signal alone → insufficient evidence
            'fraud_possibility': 'HIGH' if total_score >= 100.0 else 'MEDIUM' if total_score >= 60.0 else 'LOW'
        }