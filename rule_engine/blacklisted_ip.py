from .base import AbstractRule
from typing import Dict, Any

class BlacklistedIPRule(AbstractRule):
    """
    Rule to check if the transaction IP is blacklisted.
    """

    def __init__(self, blacklisted_ips: set, weight: float = 1.0):
        super().__init__("Blacklisted IP", weight)
        self.blacklisted_ips = blacklisted_ips

    def evaluate(self, transaction: Dict[str, Any], context: Dict[str, Any] = None) -> float:
        ip_addr = transaction.get('ip_address')
        
        if ip_addr in self.blacklisted_ips:
            return 20.0
        return 0.0