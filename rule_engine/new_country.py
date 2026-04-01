from .base import AbstractRule
from typing import Dict, Any

class NewCountryRule(AbstractRule):
    """
    Rule to check if the transaction is from a new country.
    """

    def __init__(self, weight: float = 1.0):
        super().__init__("New Country", weight)

    def evaluate(self, transaction: Dict[str, Any], context: Dict[str, Any] = None) -> float:
        user_id = transaction.get('user_id')
        country = transaction.get('country')

        if context and 'user_countries' in context:
            user_countries = context['user_countries'].get(user_id, set())
            if country not in user_countries:
                return 20.0
        return 0.0