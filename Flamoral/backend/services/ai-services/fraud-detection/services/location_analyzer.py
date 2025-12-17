"""Location anomaly detection service."""

import logging
import math
from typing import Optional
from datetime import datetime

from models import LocationAnomalyRequest, LocationAnomalyResponse, LocationData

logger = logging.getLogger(__name__)


class LocationAnalyzerService:
    """Service for detecting location anomalies and impossible travel."""

    def __init__(self):
        self.user_locations = {}  # In production, use database

    async def initialize(self):
        """Initialize the service."""
        logger.info("Initializing Location Analyzer Service")

    async def close(self):
        """Cleanup resources."""
        logger.info("Closing Location Analyzer Service")

    async def detect_anomaly(
        self,
        request: LocationAnomalyRequest
    ) -> LocationAnomalyResponse:
        """
        Detect location anomalies including impossible travel.

        Args:
            request: Location anomaly request

        Returns:
            LocationAnomalyResponse with anomaly details
        """
        current_loc = request.current_location
        previous_loc = request.previous_location

        # If no previous location, store current and return no anomaly
        if not previous_loc:
            await self._store_location(request.user_id, current_loc)
            return LocationAnomalyResponse(
                user_id=request.user_id,
                is_anomaly=False,
                impossible_travel=False,
                details={"status": "first_location"}
            )

        # Calculate distance between locations
        distance_km = self._calculate_distance(
            previous_loc.latitude,
            previous_loc.longitude,
            current_loc.latitude,
            current_loc.longitude
        )

        # Calculate time difference
        time_diff_hours = self._calculate_time_diff(
            previous_loc.timestamp or datetime.utcnow(),
            current_loc.timestamp or datetime.utcnow()
        )

        # Calculate required speed
        max_speed_kmh = 0.0
        if time_diff_hours > 0:
            max_speed_kmh = distance_km / time_diff_hours

        # Check for impossible travel
        # Commercial aircraft max speed ~900 km/h
        # Give some buffer for timezone changes, etc.
        impossible_travel = max_speed_kmh > 1000

        # Check for VPN
        vpn_detected = await self._detect_vpn(current_loc.ip_address)

        # Determine if this is an anomaly
        is_anomaly = impossible_travel or (
            max_speed_kmh > 500 and time_diff_hours < 24
        )

        # Store current location
        await self._store_location(request.user_id, current_loc)

        details = {
            "previous_country": previous_loc.country_code,
            "current_country": current_loc.country_code,
            "travel_distance_km": round(distance_km, 2),
            "time_elapsed_hours": round(time_diff_hours, 2),
            "required_speed_kmh": round(max_speed_kmh, 2)
        }

        if vpn_detected:
            details["vpn_info"] = "VPN or proxy detected"

        return LocationAnomalyResponse(
            user_id=request.user_id,
            is_anomaly=is_anomaly,
            impossible_travel=impossible_travel,
            distance_km=round(distance_km, 2),
            time_diff_hours=round(time_diff_hours, 2),
            max_speed_kmh=round(max_speed_kmh, 2),
            vpn_detected=vpn_detected,
            details=details
        )

    def _calculate_distance(
        self,
        lat1: float,
        lon1: float,
        lat2: float,
        lon2: float
    ) -> float:
        """
        Calculate distance between two coordinates using Haversine formula.

        Returns:
            Distance in kilometers
        """
        # Earth's radius in kilometers
        R = 6371.0

        # Convert to radians
        lat1_rad = math.radians(lat1)
        lon1_rad = math.radians(lon1)
        lat2_rad = math.radians(lat2)
        lon2_rad = math.radians(lon2)

        # Haversine formula
        dlat = lat2_rad - lat1_rad
        dlon = lon2_rad - lon1_rad

        a = math.sin(dlat / 2)**2 + \
            math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

        distance = R * c
        return distance

    def _calculate_time_diff(
        self,
        time1: datetime,
        time2: datetime
    ) -> float:
        """
        Calculate time difference in hours.

        Returns:
            Time difference in hours
        """
        diff = abs((time2 - time1).total_seconds())
        return diff / 3600

    async def _detect_vpn(self, ip_address: Optional[str]) -> bool:
        """
        Detect if IP address is from VPN or proxy.

        Args:
            ip_address: IP address to check

        Returns:
            True if VPN/proxy detected
        """
        if not ip_address:
            return False

        # In production, use VPN detection API
        # For now, simple heuristic
        vpn_indicators = [
            "192.168.",  # Private range
            "10.",       # Private range
            "172.16.",   # Private range
        ]

        return any(ip_address.startswith(indicator) for indicator in vpn_indicators)

    async def _store_location(self, user_id: str, location: LocationData):
        """Store location for future reference."""
        # In production, store in database
        self.user_locations[user_id] = {
            "latitude": location.latitude,
            "longitude": location.longitude,
            "timestamp": location.timestamp or datetime.utcnow(),
            "ip_address": location.ip_address,
            "country_code": location.country_code
        }
