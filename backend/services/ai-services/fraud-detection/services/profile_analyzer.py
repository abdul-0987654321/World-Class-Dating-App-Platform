"""Profile authenticity analysis service."""

import logging
import re
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta

from models import ProfileAnalysisRequest, ProfileAnalysisResponse

logger = logging.getLogger(__name__)


class ProfileAnalyzerService:
    """Service for analyzing profile authenticity."""

    def __init__(self):
        self.scam_patterns = self._load_scam_patterns()
        self.stock_photo_hashes = set()  # In production, load from database

    async def initialize(self):
        """Initialize the service."""
        logger.info("Initializing Profile Analyzer Service")
        await self._load_stock_photo_database()

    async def close(self):
        """Cleanup resources."""
        logger.info("Closing Profile Analyzer Service")

    def _load_scam_patterns(self) -> Dict[str, List[str]]:
        """Load known scam patterns."""
        return {
            "romance_scam": [
                r"send\s+money",
                r"western\s+union",
                r"gift\s+card",
                r"help\s+me\s+financially",
                r"investment\s+opportunity",
                r"my\s+account\s+was\s+frozen",
                r"need\s+.*\s+urgently",
            ],
            "catfish": [
                r"can't\s+video\s+call",
                r"camera\s+is\s+broken",
                r"phone\s+doesn't\s+work",
                r"lost\s+my\s+phone",
            ],
            "bot_indicators": [
                r"click\s+this\s+link",
                r"visit\s+my\s+website",
                r"add\s+me\s+on\s+\w+",
                r"follow\s+me\s+on",
                r"check\s+out\s+my\s+profile",
            ],
            "spam": [
                r"http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+",
                r"www\.",
                r"\.(com|net|org|io)",
            ]
        }

    async def _load_stock_photo_database(self):
        """Load stock photo hashes."""
        # In production, load from database or external service
        pass

    async def analyze_profile(
        self,
        request: ProfileAnalysisRequest
    ) -> ProfileAnalysisResponse:
        """
        Analyze profile for authenticity.

        Args:
            request: Profile analysis request

        Returns:
            ProfileAnalysisResponse with analysis results
        """
        fake_indicators = []
        scam_indicators = []
        authenticity_score = 100.0

        # Analyze bio for scam patterns
        if request.bio:
            bio_scams = await self._analyze_bio(request.bio)
            if bio_scams:
                scam_indicators.extend(bio_scams)
                authenticity_score -= len(bio_scams) * 15

        # Check for stock photos
        stock_photos_detected = False
        if request.photos:
            stock_photos_detected = await self._check_stock_photos(request.photos)
            if stock_photos_detected:
                fake_indicators.append("stock_photos_detected")
                authenticity_score -= 30

        # Analyze profile data
        profile_issues = await self._analyze_profile_data(request.profile_data)
        if profile_issues:
            fake_indicators.extend(profile_issues)
            authenticity_score -= len(profile_issues) * 10

        # Check account age
        if request.created_at:
            age_issues = self._check_account_age(request.created_at)
            if age_issues:
                fake_indicators.extend(age_issues)
                authenticity_score -= 10

        # Check profile completeness
        completeness_issues = self._check_profile_completeness(request.profile_data)
        if completeness_issues:
            fake_indicators.extend(completeness_issues)
            authenticity_score -= len(completeness_issues) * 5

        # Ensure score is between 0 and 100
        authenticity_score = max(0, min(100, authenticity_score))

        # Determine if profile is suspicious
        is_suspicious = (
            authenticity_score < 60 or
            len(scam_indicators) > 0 or
            stock_photos_detected
        )

        details = {
            "bio_length": len(request.bio) if request.bio else 0,
            "photo_count": len(request.photos) if request.photos else 0,
            "profile_fields": len(request.profile_data),
            "analysis_timestamp": datetime.utcnow().isoformat()
        }

        return ProfileAnalysisResponse(
            user_id=request.user_id,
            authenticity_score=round(authenticity_score, 2),
            is_suspicious=is_suspicious,
            fake_indicators=fake_indicators,
            scam_indicators=scam_indicators,
            stock_photos_detected=stock_photos_detected,
            details=details
        )

    async def _analyze_bio(self, bio: str) -> List[str]:
        """
        Analyze bio for scam patterns.

        Args:
            bio: User bio text

        Returns:
            List of detected scam indicators
        """
        indicators = []
        bio_lower = bio.lower()

        for category, patterns in self.scam_patterns.items():
            for pattern in patterns:
                if re.search(pattern, bio_lower):
                    indicators.append(f"{category}:{pattern[:30]}")

        # Check for excessive contact information
        email_count = len(re.findall(
            r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
            bio
        ))
        if email_count > 0:
            indicators.append("contains_email")

        phone_count = len(re.findall(
            r'(\+\d{1,3}[-\s]?)?\(?\d{3}\)?[-\s]?\d{3}[-\s]?\d{4}',
            bio
        ))
        if phone_count > 0:
            indicators.append("contains_phone")

        # Check for very short or very long bios
        if len(bio.strip()) < 20:
            indicators.append("bio_too_short")
        elif len(bio) > 2000:
            indicators.append("bio_too_long")

        return indicators

    async def _check_stock_photos(self, photo_urls: List[str]) -> bool:
        """
        Check if photos are stock photos.

        Args:
            photo_urls: List of photo URLs

        Returns:
            True if stock photos detected
        """
        # In production, use reverse image search API
        # or perceptual hashing against known stock photos
        # For now, simple heuristic based on URL patterns

        stock_photo_domains = [
            "shutterstock.com",
            "istockphoto.com",
            "gettyimages.com",
            "unsplash.com",
            "pexels.com",
            "pixabay.com"
        ]

        for url in photo_urls:
            url_lower = url.lower()
            if any(domain in url_lower for domain in stock_photo_domains):
                return True

        return False

    async def _analyze_profile_data(
        self,
        profile_data: Dict[str, Any]
    ) -> List[str]:
        """
        Analyze profile data for suspicious patterns.

        Args:
            profile_data: Profile data dictionary

        Returns:
            List of issues detected
        """
        issues = []

        # Check for unrealistic age
        age = profile_data.get("age")
        if age:
            if age < 18 or age > 100:
                issues.append("unrealistic_age")

        # Check for generic name patterns
        name = profile_data.get("name", "")
        if name:
            generic_patterns = [
                r"^test\s*\d*$",
                r"^user\s*\d+$",
                r"^admin",
                r"^support",
            ]
            if any(re.match(pattern, name.lower()) for pattern in generic_patterns):
                issues.append("generic_name")

        # Check for model-like description patterns
        occupation = profile_data.get("occupation", "").lower()
        if occupation:
            suspicious_occupations = ["model", "investor", "crypto", "forex"]
            if any(occ in occupation for occ in suspicious_occupations):
                issues.append("suspicious_occupation")

        # Check for location inconsistencies
        location = profile_data.get("location", "")
        if not location or location.lower() in ["unknown", "n/a", "test"]:
            issues.append("invalid_location")

        return issues

    def _check_account_age(self, created_at: datetime) -> List[str]:
        """
        Check if account is suspiciously new.

        Args:
            created_at: Account creation timestamp

        Returns:
            List of age-related issues
        """
        issues = []
        account_age = datetime.utcnow() - created_at

        # Very new accounts (less than 1 hour) are suspicious
        if account_age < timedelta(hours=1):
            issues.append("very_new_account")
        elif account_age < timedelta(days=1):
            issues.append("new_account")

        return issues

    def _check_profile_completeness(
        self,
        profile_data: Dict[str, Any]
    ) -> List[str]:
        """
        Check profile completeness.

        Args:
            profile_data: Profile data dictionary

        Returns:
            List of completeness issues
        """
        issues = []

        required_fields = ["name", "age", "location", "occupation"]
        missing_fields = [
            field for field in required_fields
            if not profile_data.get(field)
        ]

        if len(missing_fields) > 2:
            issues.append("incomplete_profile")

        # Check for very minimal information
        total_chars = sum(
            len(str(value)) for value in profile_data.values()
            if isinstance(value, str)
        )

        if total_chars < 50:
            issues.append("minimal_information")

        return issues
