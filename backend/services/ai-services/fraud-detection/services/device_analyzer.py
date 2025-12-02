"""Device fingerprint analysis service."""

import logging
import hashlib
from typing import Dict, List, Optional
from datetime import datetime

from models import DeviceCheckRequest, DeviceCheckResponse, DeviceInfo

logger = logging.getLogger(__name__)


class DeviceAnalyzerService:
    """Service for analyzing device fingerprints."""

    def __init__(self):
        self.user_devices = {}  # In production, use database
        self.device_fingerprints = {}

    async def initialize(self):
        """Initialize the service."""
        logger.info("Initializing Device Analyzer Service")

    async def close(self):
        """Cleanup resources."""
        logger.info("Closing Device Analyzer Service")

    async def check_device(
        self,
        request: DeviceCheckRequest
    ) -> DeviceCheckResponse:
        """
        Check device fingerprint for anomalies.

        Args:
            request: Device check request

        Returns:
            DeviceCheckResponse with analysis results
        """
        device = request.device
        user_id = request.user_id

        # Generate device fingerprint
        fingerprint_hash = self._generate_fingerprint(device)

        # Get user's known devices
        known_devices = await self._get_user_devices(user_id)

        # Check if device is new
        is_new = device.device_id not in known_devices

        # Check if fingerprint matches
        fingerprint_match = await self._check_fingerprint_match(
            user_id,
            device.device_id,
            fingerprint_hash
        )

        # Detect risk indicators
        risk_indicators = await self._detect_risk_indicators(device)

        # Determine if device is trusted
        is_trusted = (
            not is_new and
            fingerprint_match and
            len(risk_indicators) == 0
        )

        # Store device info
        await self._store_device(user_id, device, fingerprint_hash)

        details = {
            "fingerprint_hash": fingerprint_hash,
            "device_type": device.device_type,
            "os_version": device.os_version,
            "app_version": device.app_version,
            "known_devices_count": len(known_devices)
        }

        return DeviceCheckResponse(
            user_id=user_id,
            device_id=device.device_id,
            is_trusted=is_trusted,
            is_new=is_new,
            fingerprint_match=fingerprint_match,
            risk_indicators=risk_indicators,
            details=details
        )

    def _generate_fingerprint(self, device: DeviceInfo) -> str:
        """
        Generate device fingerprint hash.

        Args:
            device: Device information

        Returns:
            Fingerprint hash
        """
        # Combine multiple device attributes
        fingerprint_data = (
            f"{device.device_type}:"
            f"{device.os_version or ''}:"
            f"{device.user_agent or ''}:"
            f"{device.screen_resolution or ''}:"
            f"{device.timezone or ''}:"
            f"{device.fingerprint or ''}"
        )

        # Generate SHA-256 hash
        return hashlib.sha256(fingerprint_data.encode()).hexdigest()

    async def _get_user_devices(self, user_id: str) -> Dict[str, Dict]:
        """
        Get user's known devices.

        Args:
            user_id: User ID

        Returns:
            Dictionary of known devices
        """
        # In production, query from database
        return self.user_devices.get(user_id, {})

    async def _check_fingerprint_match(
        self,
        user_id: str,
        device_id: str,
        fingerprint_hash: str
    ) -> bool:
        """
        Check if device fingerprint matches known fingerprint.

        Args:
            user_id: User ID
            device_id: Device ID
            fingerprint_hash: Current fingerprint hash

        Returns:
            True if fingerprint matches
        """
        user_devices = await self._get_user_devices(user_id)

        if device_id not in user_devices:
            return False

        stored_fingerprint = user_devices[device_id].get("fingerprint_hash")
        return stored_fingerprint == fingerprint_hash

    async def _detect_risk_indicators(
        self,
        device: DeviceInfo
    ) -> List[str]:
        """
        Detect risk indicators in device information.

        Args:
            device: Device information

        Returns:
            List of risk indicators
        """
        indicators = []

        # Check for missing critical information
        if not device.user_agent:
            indicators.append("missing_user_agent")

        if not device.fingerprint:
            indicators.append("missing_fingerprint")

        # Check for suspicious user agents
        if device.user_agent:
            suspicious_patterns = [
                "bot",
                "crawler",
                "scraper",
                "curl",
                "wget",
                "python-requests"
            ]
            user_agent_lower = device.user_agent.lower()
            for pattern in suspicious_patterns:
                if pattern in user_agent_lower:
                    indicators.append(f"suspicious_user_agent:{pattern}")
                    break

        # Check for version mismatches
        if device.device_type == "ios" and device.os_version:
            try:
                version_num = float(device.os_version.split('.')[0])
                if version_num < 12:  # Very old iOS version
                    indicators.append("outdated_os_version")
            except (ValueError, IndexError):
                pass

        # Check for emulator indicators
        if device.device_type in ["android", "ios"]:
            if not device.screen_resolution:
                indicators.append("missing_screen_resolution")

        # Check for multiple devices from same fingerprint
        # (could indicate device spoofing)
        if device.fingerprint:
            device_count = await self._count_devices_with_fingerprint(
                device.fingerprint
            )
            if device_count > 5:
                indicators.append("fingerprint_reuse")

        return indicators

    async def _count_devices_with_fingerprint(
        self,
        fingerprint: str
    ) -> int:
        """
        Count how many devices use the same fingerprint.

        Args:
            fingerprint: Device fingerprint

        Returns:
            Count of devices
        """
        # In production, query from database
        count = 0
        for user_devices in self.user_devices.values():
            for device_info in user_devices.values():
                if device_info.get("fingerprint_hash") == fingerprint:
                    count += 1
        return count

    async def _store_device(
        self,
        user_id: str,
        device: DeviceInfo,
        fingerprint_hash: str
    ):
        """
        Store device information.

        Args:
            user_id: User ID
            device: Device information
            fingerprint_hash: Device fingerprint hash
        """
        # In production, store in database
        if user_id not in self.user_devices:
            self.user_devices[user_id] = {}

        self.user_devices[user_id][device.device_id] = {
            "device_type": device.device_type,
            "os_version": device.os_version,
            "app_version": device.app_version,
            "user_agent": device.user_agent,
            "fingerprint_hash": fingerprint_hash,
            "screen_resolution": device.screen_resolution,
            "timezone": device.timezone,
            "last_seen": datetime.utcnow().isoformat(),
            "first_seen": datetime.utcnow().isoformat()
        }
