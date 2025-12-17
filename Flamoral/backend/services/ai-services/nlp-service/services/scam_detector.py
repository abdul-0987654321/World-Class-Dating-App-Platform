"""Scam detection service implementation."""

import logging
import re
from typing import List, Optional

from models import ScamDetectionResponse

logger = logging.getLogger(__name__)


class ScamDetectorService:
    """Service for detecting scam messages."""

    def __init__(self):
        self.scam_patterns = {}

    async def initialize(self):
        """Initialize the service."""
        logger.info("Initializing Scam Detector Service")
        await self._load_scam_patterns()

    async def close(self):
        """Cleanup resources."""
        logger.info("Closing Scam Detector Service")

    async def _load_scam_patterns(self):
        """Load scam detection patterns."""
        # Romance scam patterns
        self.scam_patterns["romance_scam"] = [
            r"\bsend\s+money\b",
            r"\bwestern\s+union\b",
            r"\bgift\s+card\b",
            r"\bitunes\s+card\b",
            r"\bsteam\s+card\b",
            r"\bhelp\s+me\s+financially\b",
            r"\bneed\s+money\s+urgently\b",
            r"\bemergency\b.*\bmoney\b",
            r"\bbank\s+account\b.*\bfrozen\b",
            r"\bstranded\b.*\bmoney\b",
            r"\bticket\b.*\bmoney\b"
        ]

        # Investment scam patterns
        self.scam_patterns["investment_scam"] = [
            r"\binvestment\s+opportunity\b",
            r"\bguaranteed\s+returns\b",
            r"\bget\s+rich\b",
            r"\bdouble\s+your\s+money\b",
            r"\bcrypto\b.*\binvestment\b",
            r"\bforex\b.*\btrading\b",
            r"\bpassive\s+income\b"
        ]

        # Phishing patterns
        self.scam_patterns["phishing"] = [
            r"\bclick\s+this\s+link\b",
            r"\bverify\s+your\s+account\b",
            r"\bconfirm\s+your\s+identity\b",
            r"\bupdate\s+your\s+information\b",
            r"\bsecurity\s+alert\b",
            r"\baccount\s+suspended\b"
        ]

        # Fake profile indicators
        self.scam_patterns["fake_profile"] = [
            r"\bvisit\s+my\s+website\b",
            r"\bcheck\s+out\s+my\s+profile\b",
            r"\badd\s+me\s+on\b",
            r"\bfollow\s+me\s+on\b",
            r"\bcontact\s+me\s+at\b.*@",
            r"\bwhatsapp\b.*\bnumber\b",
            r"\btelegram\b.*@"
        ]

    async def detect(self, text: str) -> ScamDetectionResponse:
        """
        Detect scam content in text.

        Args:
            text: Text to analyze

        Returns:
            ScamDetectionResponse with scam analysis
        """
        text_lower = text.lower()

        scam_indicators = []
        scam_type = None
        max_matches = 0

        # Check each scam pattern category
        for category, patterns in self.scam_patterns.items():
            matches = []
            for pattern in patterns:
                found = re.findall(pattern, text_lower)
                if found:
                    matches.extend(found)

            if matches:
                indicator = f"{category}: {len(matches)} indicators"
                scam_indicators.append(indicator)

                # Track the scam type with most matches
                if len(matches) > max_matches:
                    max_matches = len(matches)
                    scam_type = category

        # Check for suspicious URLs
        urls = re.findall(
            r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+',
            text
        )
        if urls:
            scam_indicators.append(f"contains_urls: {len(urls)} found")

        # Check for email addresses
        emails = re.findall(
            r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
            text
        )
        if emails:
            scam_indicators.append(f"contains_emails: {len(emails)} found")

        # Check for phone numbers
        phones = re.findall(
            r'(\+\d{1,3}[-\s]?)?\(?\d{3}\)?[-\s]?\d{3}[-\s]?\d{4}',
            text
        )
        if phones:
            scam_indicators.append(f"contains_phone_numbers: {len(phones)} found")

        # Calculate scam score based on indicators
        scam_score = min(len(scam_indicators) / 3.0, 1.0)

        # Determine if text is a scam (threshold: 0.4)
        is_scam = scam_score > 0.4

        return ScamDetectionResponse(
            text=text,
            is_scam=is_scam,
            scam_score=round(scam_score, 3),
            scam_indicators=scam_indicators,
            scam_type=scam_type
        )
