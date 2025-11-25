"""Profile analysis service for fraud detection."""

from typing import Dict, List, Optional, Any
from datetime import datetime
import re
import structlog
import redis.asyncio as redis
from motor.motor_asyncio import AsyncIOMotorClient

from app.config import Settings

logger = structlog.get_logger()


class ProfileAnalyzerService:
    """Analyzes user profiles for fraud indicators."""

    def __init__(self, settings: Settings):
        self.settings = settings
        self.redis_client: Optional[redis.Redis] = None
        self.mongo_client: Optional[AsyncIOMotorClient] = None
        self.db = None

        # Romance scam keywords
        self.scam_keywords = {
            "high_risk": [
                "send money", "wire transfer", "western union", "moneygram",
                "gift card", "bitcoin", "cryptocurrency", "investment opportunity",
                "inheritance", "lottery winner", "bank account", "urgent help",
                "military deployment", "oil rig", "offshore", "stranded",
                "hospital bills", "dying mother", "plane ticket"
            ],
            "medium_risk": [
                "business proposal", "widow", "widower", "lonely",
                "god fearing", "honest man", "honest woman", "true love",
                "soul mate", "destiny", "fate brought us", "whatsapp",
                "hangout", "telegram", "move off app"
            ],
            "catfish_indicators": [
                "model", "actress", "photographer", "won't video call",
                "camera broken", "bad internet", "busy schedule",
                "can't meet yet"
            ]
        }

        # Suspicious bio patterns
        self.suspicious_patterns = [
            r"(?i)whatsapp\s*:?\s*\+?\d+",
            r"(?i)telegram\s*:?\s*@?\w+",
            r"(?i)snapchat\s*:?\s*\w+",
            r"(?i)instagram\s*:?\s*@?\w+",
            r"(?i)kik\s*:?\s*\w+",
            r"(?i)add\s+me\s+on",
            r"(?i)contact\s+me\s+(at|on)",
            r"(?i)text\s+me\s+at\s+\d+",
            r"(?i)(sugar\s*(daddy|mommy|baby))",
            r"(?i)(looking\s+for\s+(arrangement|sponsor))",
            r"(?i)(pay\s*(pal|venmo|cashapp))",
            r"(?i)(bitcoin|crypto|nft)",
        ]

    async def initialize(self):
        """Initialize service connections."""
        try:
            self.redis_client = redis.from_url(
                self.settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True
            )
            await self.redis_client.ping()

            self.mongo_client = AsyncIOMotorClient(self.settings.MONGODB_URL)
            self.db = self.mongo_client[self.settings.MONGODB_DATABASE]

            logger.info("ProfileAnalyzer initialized")
        except Exception as e:
            logger.error("Failed to initialize profile analyzer", error=str(e))
            raise

    async def close(self):
        """Close connections."""
        if self.redis_client:
            await self.redis_client.close()
        if self.mongo_client:
            self.mongo_client.close()

    async def analyze_profile(
        self,
        user_id: str,
        profile_data: Dict,
        photos: Optional[List[str]] = None,
        bio: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Analyze a profile for fraud indicators.

        Args:
            user_id: User ID
            profile_data: Profile information
            photos: List of photo URLs
            bio: User bio text

        Returns:
            Analysis results with risk indicators
        """
        risk_factors = []
        risk_score = 0.0

        # Analyze bio text
        if bio:
            bio_result = self._analyze_bio(bio)
            if bio_result["is_suspicious"]:
                risk_factors.extend(bio_result["factors"])
                risk_score += bio_result["risk_contribution"]

        # Analyze profile completeness
        completeness_result = self._analyze_completeness(profile_data)
        if completeness_result["is_suspicious"]:
            risk_factors.append({
                "type": "profile_completeness",
                "severity": completeness_result["severity"],
                "details": completeness_result["details"]
            })
            risk_score += completeness_result["risk_contribution"]

        # Analyze photos
        if photos:
            photo_result = await self._analyze_photos(user_id, photos)
            if photo_result["is_suspicious"]:
                risk_factors.extend(photo_result["factors"])
                risk_score += photo_result["risk_contribution"]

        # Check for known scam profile patterns
        scam_result = self._check_scam_patterns(profile_data, bio)
        if scam_result["is_suspicious"]:
            risk_factors.append({
                "type": "scam_pattern",
                "severity": scam_result["severity"],
                "details": scam_result["details"]
            })
            risk_score += scam_result["risk_contribution"]

        # Check profile age vs activity
        age_result = self._check_profile_age(profile_data)
        if age_result["is_suspicious"]:
            risk_factors.append({
                "type": "profile_age",
                "severity": age_result["severity"],
                "details": age_result["details"]
            })
            risk_score += age_result["risk_contribution"]

        # Normalize score
        risk_score = min(1.0, risk_score)

        # Store analysis
        await self._store_profile_analysis(user_id, {
            "risk_score": risk_score,
            "risk_factors": risk_factors,
            "timestamp": datetime.utcnow().isoformat()
        })

        return {
            "user_id": user_id,
            "risk_score": risk_score,
            "risk_level": self._get_risk_level(risk_score),
            "risk_factors": risk_factors,
            "is_fake_profile": risk_score >= 0.7,
            "is_suspicious": risk_score >= 0.5,
            "recommended_action": self._get_recommended_action(risk_score)
        }

    def _analyze_bio(self, bio: str) -> Dict[str, Any]:
        """Analyze bio text for fraud indicators."""
        if not bio or len(bio.strip()) == 0:
            return {"is_suspicious": False, "factors": [], "risk_contribution": 0}

        factors = []
        risk_contribution = 0.0
        bio_lower = bio.lower()

        # Check for high-risk keywords
        found_high_risk = []
        for keyword in self.scam_keywords["high_risk"]:
            if keyword.lower() in bio_lower:
                found_high_risk.append(keyword)

        if found_high_risk:
            factors.append({
                "type": "high_risk_keywords",
                "severity": "high",
                "details": {"keywords": found_high_risk}
            })
            risk_contribution += min(0.5, len(found_high_risk) * 0.15)

        # Check for medium-risk keywords
        found_medium_risk = []
        for keyword in self.scam_keywords["medium_risk"]:
            if keyword.lower() in bio_lower:
                found_medium_risk.append(keyword)

        if found_medium_risk:
            factors.append({
                "type": "medium_risk_keywords",
                "severity": "medium",
                "details": {"keywords": found_medium_risk}
            })
            risk_contribution += min(0.3, len(found_medium_risk) * 0.1)

        # Check for catfish indicators
        found_catfish = []
        for keyword in self.scam_keywords["catfish_indicators"]:
            if keyword.lower() in bio_lower:
                found_catfish.append(keyword)

        if found_catfish:
            factors.append({
                "type": "catfish_indicators",
                "severity": "medium",
                "details": {"keywords": found_catfish}
            })
            risk_contribution += min(0.2, len(found_catfish) * 0.08)

        # Check for suspicious patterns (contact info, etc.)
        found_patterns = []
        for pattern in self.suspicious_patterns:
            if re.search(pattern, bio):
                found_patterns.append(pattern)

        if found_patterns:
            factors.append({
                "type": "suspicious_patterns",
                "severity": "high",
                "details": {"patterns_matched": len(found_patterns)}
            })
            risk_contribution += min(0.4, len(found_patterns) * 0.15)

        return {
            "is_suspicious": len(factors) > 0,
            "factors": factors,
            "risk_contribution": risk_contribution
        }

    def _analyze_completeness(self, profile_data: Dict) -> Dict[str, Any]:
        """Analyze profile completeness."""
        required_fields = [
            "first_name", "age", "gender", "bio", "photos",
            "interests", "location"
        ]

        filled_fields = 0
        for field in required_fields:
            value = profile_data.get(field)
            if value and (not isinstance(value, (list, str)) or len(value) > 0):
                filled_fields += 1

        completeness = filled_fields / len(required_fields)

        # Very incomplete profiles are suspicious
        if completeness < 0.3:
            return {
                "is_suspicious": True,
                "severity": "medium",
                "details": {
                    "completeness_ratio": round(completeness, 2),
                    "filled_fields": filled_fields,
                    "total_fields": len(required_fields)
                },
                "risk_contribution": 0.2
            }

        return {"is_suspicious": False, "risk_contribution": 0}

    async def _analyze_photos(
        self,
        user_id: str,
        photos: List[str]
    ) -> Dict[str, Any]:
        """Analyze photos for fraud indicators."""
        factors = []
        risk_contribution = 0.0

        # Check number of photos
        if len(photos) == 1:
            factors.append({
                "type": "single_photo",
                "severity": "low",
                "details": {"photo_count": 1}
            })
            risk_contribution += 0.1

        # Check for stock photo indicators (would integrate with photo service)
        # This is a placeholder for the actual image analysis
        # In production, this would call the photo-analysis-service

        # Check for reverse image search results (would need external API)

        return {
            "is_suspicious": len(factors) > 0,
            "factors": factors,
            "risk_contribution": risk_contribution
        }

    def _check_scam_patterns(
        self,
        profile_data: Dict,
        bio: Optional[str]
    ) -> Dict[str, Any]:
        """Check for known scam profile patterns."""
        scam_indicators = []

        # Common scam profile patterns
        age = profile_data.get("age", 0)
        occupation = profile_data.get("occupation", "").lower()
        location = profile_data.get("location", {})

        # Military/Doctor abroad pattern
        if occupation in ["military", "army", "soldier", "doctor", "engineer", "contractor"]:
            if bio:
                bio_lower = bio.lower()
                if any(word in bio_lower for word in ["deployed", "overseas", "abroad", "mission", "project"]):
                    scam_indicators.append("military_abroad_pattern")

        # Wealthy widow/widower pattern
        if profile_data.get("relationship_status") in ["widowed"]:
            if bio:
                bio_lower = bio.lower()
                if any(word in bio_lower for word in ["late husband", "late wife", "passed away", "lonely"]):
                    scam_indicators.append("lonely_widow_pattern")

        # Too good to be true (very attractive + wealthy indicators)
        if occupation in ["ceo", "business owner", "entrepreneur", "investor"]:
            photos = profile_data.get("photos", [])
            if len(photos) == 1:  # Single photo + claims of wealth
                scam_indicators.append("wealthy_single_photo")

        if scam_indicators:
            return {
                "is_suspicious": True,
                "severity": "high",
                "details": {"indicators": scam_indicators},
                "risk_contribution": len(scam_indicators) * 0.2
            }

        return {"is_suspicious": False, "risk_contribution": 0}

    def _check_profile_age(self, profile_data: Dict) -> Dict[str, Any]:
        """Check profile creation date vs activity."""
        created_at = profile_data.get("created_at")
        if not created_at:
            return {"is_suspicious": False, "risk_contribution": 0}

        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))

        age_days = (datetime.utcnow() - created_at.replace(tzinfo=None)).days

        # Brand new profile with lots of activity
        activity_count = profile_data.get("activity_count", 0)
        if age_days < 1 and activity_count > 100:
            return {
                "is_suspicious": True,
                "severity": "high",
                "details": {
                    "profile_age_days": age_days,
                    "activity_count": activity_count,
                    "reason": "new_profile_high_activity"
                },
                "risk_contribution": 0.3
            }

        return {"is_suspicious": False, "risk_contribution": 0}

    def _get_risk_level(self, score: float) -> str:
        """Get risk level string."""
        if score >= 0.85:
            return "critical"
        elif score >= 0.7:
            return "high"
        elif score >= 0.5:
            return "medium"
        elif score >= 0.3:
            return "low"
        else:
            return "minimal"

    def _get_recommended_action(self, score: float) -> str:
        """Get recommended action based on risk score."""
        if score >= 0.85:
            return "suspend_account"
        elif score >= 0.7:
            return "require_verification"
        elif score >= 0.5:
            return "manual_review"
        elif score >= 0.3:
            return "monitor"
        else:
            return "none"

    async def _store_profile_analysis(self, user_id: str, analysis: Dict):
        """Store profile analysis results."""
        await self.db.profile_analysis.update_one(
            {"user_id": user_id},
            {
                "$push": {
                    "analyses": {
                        "$each": [analysis],
                        "$slice": -20
                    }
                },
                "$set": {
                    "latest_analysis": analysis,
                    "updated_at": datetime.utcnow()
                },
                "$setOnInsert": {
                    "created_at": datetime.utcnow()
                }
            },
            upsert=True
        )
