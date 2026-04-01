from .base import AbstractRule
from typing import Dict, Any
import math
from datetime import datetime

class GeographicInconsistencyRule(AbstractRule):
    """
    Rule that detects physically impossible travel between transactions.
    Activates if the implied speed between the last known location and the current transaction location exceeds max_speed_kmh.
    """

    def __init__(self, max_speed_kmh: 900.0, weight: float = 1.0):
        super().__init__("Geographic Inconsistency", weight)
        self.max_speed_kmh = max_speed_kmh # Default speed of an average commercial flight

    def haversine_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """
        Calculate the great-cicrle distance in kilometres between two points on Earth using the Haversine formula.
        """
        R = 6371 # Earth's radius in kilmetres

        d_lat = math.radians(lat2 - lat1)
        d_lon = math.radians(lon2 - lon1)

        a = (math.sin(d_lat / 2) ** 2 + 
             math.cos(math.radians(lat1)) * 
             math.cos(math.radians(lat2)) * 
             math.sin(d_lon / 2) ** 2)

        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c

    def evaluate(self, transaction: Dict[str, Any], context: Dict[str, Any] = None) -> float:
        if not context:
            return 0.0
        
        user_id = transaction.get('user_id')
        current_lat = transaction.get('latitude')
        current_lon = transaction.get('longitude')
        current_time = transaction.get('timestamp')

        # Cannot evaluate without location data
        if None in (user_id, current_lat, current_lon, current_time):
            return 0.0
        
        historical_data = context.get('historical_transactions', {}).get(user_id, [])
        if not historical_data:
            return 0.0
        
        # Retrieve the most recent transaction that has location data
        last_trans = None
        for txn in sorted(historical_data, key=lambda x: x['timestamp'], reverse=True):
            if 'latitude' in txn and 'longitude' in txn:
                last_trans = txn
                break
        
        if not last_trans:
            return 0.0
        
        distance_km = self.haversine_distance(last_trans['latitude'], last_trans['longitude'], current_lat, current_lon)

        time_difference = current_time - last_trans['timestamp']
        hours_elapsed = time_difference.total_seconds() / 3600

        if hours_elapsed < 0.001:
            return 60.0 if distance_km > 10 else 0.0
        
        implied_speed = distance_km / hours_elapsed

        if implied_speed > self.max_speed_kmh:
            return 60.0
        return 0.0