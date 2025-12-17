"""Fraud detection service implementation."""

import logging
import hashlib
import time
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import asyncio
import re

from models import (
    FraudCheckRequest, FraudCheckResponse,
    RiskScore, RiskLevel
)

logger = logging.getLogger(__name__)


class FraudDetectorService:
    """Main fraud detection service."""

    def __init__(self):
        self.ip_reputation_cache = {}
        self.velocity_tracking = {}
        self.known_bad_ips = set()
        self.known_vpn_ranges = set()

    async def initialize(self):
        """Initialize the service."""
        logger.info("Initializing Fraud Detector Service")
        # Load known bad IPs and VPN ranges
        await self._load_threat_intelligence()

    async def close(self):
        """Cleanup resources."""
        logger.info("Closing Fraud Detector Service")

    async def _load_threat_intelligence(self):
        """Load threat intelligence data."""
        # In production, load from database or external API
        self.known_bad_ips = {
            "10.0.0.1",  # Example placeholder
        }
        self.known_vpn_ranges = {
            "192.168.",  # Example placeholder
        }

    async def check_fraud(self, request: FraudCheckRequest) -> FraudCheckResponse:
        """
        Perform comprehensive fraud check.

        Args:
            request: Fraud check request

        Returns:
            FraudCheckResponse with risk assessment
        """
        factors = []
        risk_value = 0.0

        # Check IP reputation
        ip_risk = await self._check_ip_reputation(request.ip_address)
        if ip_risk > 0:
            factors.append({
                "type": "ip_reputation",
                "severity": ip_risk,
                "description": f"IP reputation risk: {ip_risk}"
            })
            risk_value += ip_risk * 30

        # Check for VPN/Proxy
        if await self._is_vpn_or_proxy(request.ip_address):
            factors.append({
                "type": "vpn_detected",
                "severity": 0.5,
                "description": "VPN or proxy detected"
            })
            risk_value += 15

        # Velocity check
        if request.action_type:
            velocity_risk = await self._check_velocity(
                request.user_id,
                request.action_type
            )
            if velocity_risk > 0:
                factors.append({
                    "type": "velocity_abuse",
                    "severity": velocity_risk,
                    "description": f"High action velocity detected"
                })
                risk_value += velocity_risk * 25

        # Device fingerprint check
        if request.device:
            device_risk = await self._check_device_fingerprint(
                request.user_id,
                request.device.model_dump()
            )
            if device_risk > 0:
                factors.append({
                    "type": "device_anomaly",
                    "severity": device_risk,
                    "description": "Suspicious device fingerprint"
                })
                risk_value += device_risk * 20

        # Location check
        if request.location:
            location_risk = await self._check_location_consistency(
                request.user_id,
                request.location.model_dump()
            )
            if location_risk > 0:
                factors.append({
                    "type": "location_anomaly",
                    "severity": location_risk,
                    "description": "Location inconsistency detected"
                })
                risk_value += location_risk * 30

        # Determine risk level and action
        risk_level, recommended_action = self._determine_risk_level(risk_value)

        risk_score = RiskScore(
            score=min(risk_value, 100),
            level=risk_level,
            factors=factors,
            recommended_action=recommended_action
        )

        return FraudCheckResponse(
            user_id=request.user_id,
            risk_score=risk_score,
            is_fraud=risk_value >= 70,
            timestamp=datetime.utcnow(),
            details={
                "ip_address": request.ip_address,
                "checks_performed": len(factors)
            }
        )

    async def _check_ip_reputation(self, ip_address: str) -> float:
        """
        Check IP reputation.

        Returns:
            Risk score between 0 and 1
        """
        # Check cache first
        if ip_address in self.ip_reputation_cache:
            cached = self.ip_reputation_cache[ip_address]
            if cached['expires'] > time.time():
                return cached['risk']

        # Check against known bad IPs
        if ip_address in self.known_bad_ips:
            risk = 1.0
        elif self._is_private_ip(ip_address):
            risk = 0.3  # Private IPs are somewhat suspicious
        else:
            # In production, query IP reputation API
            risk = 0.0

        # Cache the result
        self.ip_reputation_cache[ip_address] = {
            'risk': risk,
            'expires': time.time() + 3600  # Cache for 1 hour
        }

        return risk

    def _is_private_ip(self, ip_address: str) -> bool:
        """Check if IP is in private range."""
        private_patterns = [
            r'^10\.',
            r'^172\.(1[6-9]|2[0-9]|3[0-1])\.',
            r'^192\.168\.',
            r'^127\.',
        ]
        return any(re.match(pattern, ip_address) for pattern in private_patterns)

    async def _is_vpn_or_proxy(self, ip_address: str) -> bool:
        """Check if IP belongs to VPN or proxy."""
        # Check against known VPN ranges
        for vpn_range in self.known_vpn_ranges:
            if ip_address.startswith(vpn_range):
                return True

        # In production, check against VPN detection API
        return False

    async def _check_velocity(
        self,
        user_id: str,
        action_type: str,
        window_minutes: int = 60
    ) -> float:
        """
        Check if user is performing actions too quickly.

        Returns:
            Risk score between 0 and 1
        """
        key = f"{user_id}:{action_type}"
        current_time = time.time()

        # Initialize tracking if not exists
        if key not in self.velocity_tracking:
            self.velocity_tracking[key] = []

        # Clean old entries
        window_seconds = window_minutes * 60
        cutoff_time = current_time - window_seconds
        self.velocity_tracking[key] = [
            t for t in self.velocity_tracking[key]
            if t > cutoff_time
        ]

        # Add current action
        self.velocity_tracking[key].append(current_time)

        # Count actions in window
        action_count = len(self.velocity_tracking[key])

        # Define thresholds per action type
        thresholds = {
            "message_sent": 50,
            "swipe": 100,
            "profile_view": 200,
            "login": 5,
            "photo_upload": 10,
        }

        threshold = thresholds.get(action_type, 100)

        # Calculate risk based on threshold
        if action_count > threshold * 2:
            return 1.0
        elif action_count > threshold * 1.5:
            return 0.7
        elif action_count > threshold:
            return 0.4
        else:
            return 0.0

    async def _check_device_fingerprint(
        self,
        user_id: str,
        device_info: Dict[str, Any]
    ) -> float:
        """
        Check device fingerprint for anomalies.

        Returns:
            Risk score between 0 and 1
        """
        # Generate fingerprint hash
        fingerprint_data = f"{device_info.get('device_type', '')}:" \
                          f"{device_info.get('os_version', '')}:" \
                          f"{device_info.get('screen_resolution', '')}:" \
                          f"{device_info.get('timezone', '')}"

        fingerprint = hashlib.sha256(fingerprint_data.encode()).hexdigest()

        # Check if fingerprint exists in user's device history
        # In production, query from database
        # For now, assume it's a new device
        is_new_device = True

        # Check for suspicious patterns
        suspicious = False
        if not device_info.get('user_agent'):
            suspicious = True
        if not device_info.get('fingerprint'):
            suspicious = True

        if is_new_device and suspicious:
            return 0.6
        elif is_new_device:
            return 0.3
        elif suspicious:
            return 0.4
        else:
            return 0.0

    async def _check_location_consistency(
        self,
        user_id: str,
        location_data: Dict[str, Any]
    ) -> float:
        """
        Check for location consistency.

        Returns:
            Risk score between 0 and 1
        """
        # In production, query last known location from database
        # For now, return low risk
        return 0.0

    def _determine_risk_level(
        self,
        risk_value: float
    ) -> tuple[RiskLevel, str]:
        """
        Determine risk level and recommended action.

        Args:
            risk_value: Risk score (0-100)

        Returns:
            Tuple of (risk_level, recommended_action)
        """
        if risk_value >= 80:
            return RiskLevel.CRITICAL, "block_immediately"
        elif risk_value >= 60:
            return RiskLevel.HIGH, "require_verification"
        elif risk_value >= 40:
            return RiskLevel.MEDIUM, "monitor_closely"
        else:
            return RiskLevel.LOW, "allow"
