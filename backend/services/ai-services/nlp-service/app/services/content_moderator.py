"""Content moderation service."""

from typing import Dict, List, Optional, Any
from datetime import datetime
import re
import structlog
import redis.asyncio as redis
from motor.motor_asyncio import AsyncIOMotorClient

from app.config import Settings

logger = structlog.get_logger()


class ContentModeratorService:
    """Service for content moderation."""

    def __init__(self, settings: Settings):
        self.settings = settings
        self.redis_client: Optional[redis.Redis] = None
        self.mongo_client: Optional[AsyncIOMotorClient] = None
        self.db = None

        # Profanity word list (basic)
        self.profanity_words = {
            "fuck", "shit", "ass", "bitch", "damn", "crap", "bastard",
            "dick", "cock", "pussy", "whore", "slut", "fag", "nigger",
            "retard", "cunt"
        }

        # Spam indicators
        self.spam_patterns = [
            r"(?i)click\s+here",
            r"(?i)free\s+(money|prize|gift)",
            r"(?i)congratulations.+won",
            r"(?i)limited\s+time\s+offer",
            r"(?i)act\s+now",
            r"(?i)100%\s+(free|guaranteed)",
            r"(?i)make\s+money\s+(fast|quick)",
            r"(?i)work\s+from\s+home",
            r"(?i)earn\s+\$\d+",
            r"(?i)(buy|sell)\s+(followers|likes)",
        ]

        # Contact info patterns (policy violation)
        self.contact_patterns = [
            r"(?i)(?:my\s+)?(?:phone|cell|mobile|number)\s*(?:is\s*)?:?\s*[\+]?[\d\s\-\(\)]{7,}",
            r"(?i)(?:call|text|reach)\s+(?:me\s+)?(?:at|on)\s+[\+]?[\d\s\-\(\)]{7,}",
            r"[\+]?[1-9][\d\s\-\(\)]{9,}",
            r"(?i)(?:my\s+)?(?:instagram|insta|ig|snap(?:chat)?|tiktok|twitter|fb|facebook)\s*(?:is\s*)?:?\s*@?\w+",
            r"(?i)@\w{3,}",
            r"(?i)(?:my\s+)?(?:email|e-mail)\s*(?:is\s*)?:?\s*[\w\.\-]+@[\w\.\-]+\.\w+",
            r"[\w\.\-]+@[\w\.\-]+\.\w{2,}",
            r"(?i)(?:add|find|follow)\s+(?:me\s+)?(?:on|at)\s+(?:instagram|insta|ig|snap(?:chat)?|tiktok|twitter|fb|facebook)",
        ]

        # Inappropriate content patterns
        self.inappropriate_patterns = [
            r"(?i)looking\s+for\s+(?:sex|hookup|fwb|nsa)",
            r"(?i)(?:sugar\s*(?:daddy|mommy|baby))",
            r"(?i)(?:escort|companion)\s+service",
            r"(?i)(?:pay|paid|payment)\s+(?:for|to)\s+(?:meet|date|sex)",
            r"(?i)send\s+(?:me\s+)?(?:nudes?|pics|pictures)",
            r"(?i)(?:onlyfans|fansly|manyvids)",
        ]

    async def initialize(self):
        """Initialize the service."""
        try:
            self.redis_client = redis.from_url(
                self.settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True
            )
            await self.redis_client.ping()

            self.mongo_client = AsyncIOMotorClient(self.settings.MONGODB_URL)
            self.db = self.mongo_client[self.settings.MONGODB_DATABASE]

            logger.info("ContentModerator initialized")
        except Exception as e:
            logger.error("Failed to initialize content moderator", error=str(e))
            raise

    async def close(self):
        """Close service connections."""
        if self.redis_client:
            await self.redis_client.close()
        if self.mongo_client:
            self.mongo_client.close()

    async def moderate_content(
        self,
        content: str,
        content_type: str,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Moderate user-generated content.

        Args:
            content: Content to moderate
            content_type: Type of content (message, bio, profile_text, comment)
            user_id: Optional user ID

        Returns:
            Moderation results
        """
        if not content or not content.strip():
            return {
                "action": "allow",
                "issues": [],
                "content_type": content_type
            }

        issues = []

        # Check profanity
        profanity_result = self._check_profanity(content)
        if profanity_result["found"]:
            issues.append({
                "type": "profanity",
                "severity": profanity_result["severity"],
                "words": profanity_result["words"]
            })

        # Check spam
        spam_result = self._check_spam(content)
        if spam_result["is_spam"]:
            issues.append({
                "type": "spam",
                "severity": "high",
                "patterns_matched": spam_result["patterns_matched"]
            })

        # Check contact info (policy violation)
        contact_result = self._check_contact_info(content)
        if contact_result["found"]:
            issues.append({
                "type": "contact_info",
                "severity": "medium",
                "matches": contact_result["matches"]
            })

        # Check inappropriate content
        inappropriate_result = self._check_inappropriate(content)
        if inappropriate_result["found"]:
            issues.append({
                "type": "inappropriate_content",
                "severity": inappropriate_result["severity"],
                "patterns": inappropriate_result["patterns"]
            })

        # Determine action
        action = self._determine_action(issues, content_type)

        # Store moderation result if user_id provided
        if user_id:
            await self._store_moderation_result(user_id, {
                "content_type": content_type,
                "content_preview": content[:100],
                "issues": issues,
                "action": action,
                "timestamp": datetime.utcnow().isoformat()
            })

        return {
            "action": action,
            "is_approved": action == "allow",
            "issues": issues,
            "content_type": content_type,
            "severity": self._get_max_severity(issues),
            "cleaned_content": self._clean_content(content) if action != "block" else None
        }

    def _check_profanity(self, content: str) -> Dict[str, Any]:
        """Check content for profanity."""
        content_lower = content.lower()
        words = content_lower.split()

        found_words = []
        for word in words:
            # Clean punctuation
            clean_word = re.sub(r'[^\w]', '', word)
            if clean_word in self.profanity_words:
                found_words.append(clean_word)

        if found_words:
            # Determine severity based on which words
            severe_words = {"nigger", "fag", "retard", "cunt"}
            has_severe = any(w in severe_words for w in found_words)

            return {
                "found": True,
                "severity": "high" if has_severe else "medium",
                "words": list(set(found_words))
            }

        return {"found": False, "severity": None, "words": []}

    def _check_spam(self, content: str) -> Dict[str, Any]:
        """Check content for spam patterns."""
        patterns_matched = []

        for pattern in self.spam_patterns:
            if re.search(pattern, content):
                patterns_matched.append(pattern)

        # Also check for excessive caps
        words = content.split()
        if len(words) > 5:
            caps_words = sum(1 for w in words if w.isupper() and len(w) > 2)
            if caps_words / len(words) > 0.5:
                patterns_matched.append("excessive_caps")

        # Check for repetition
        if len(content) > 20:
            if len(set(content.lower().split())) / len(content.split()) < 0.3:
                patterns_matched.append("repetitive_content")

        return {
            "is_spam": len(patterns_matched) > 0,
            "patterns_matched": patterns_matched,
            "spam_score": min(1.0, len(patterns_matched) * 0.3)
        }

    def _check_contact_info(self, content: str) -> Dict[str, Any]:
        """Check content for contact information."""
        matches = []

        for pattern in self.contact_patterns:
            found = re.findall(pattern, content)
            if found:
                matches.extend(found if isinstance(found[0], str) else [m[0] for m in found])

        return {
            "found": len(matches) > 0,
            "matches": list(set(matches))[:5]  # Limit to 5
        }

    def _check_inappropriate(self, content: str) -> Dict[str, Any]:
        """Check content for inappropriate content."""
        patterns_found = []

        for pattern in self.inappropriate_patterns:
            if re.search(pattern, content):
                patterns_found.append(pattern)

        if patterns_found:
            return {
                "found": True,
                "severity": "high",
                "patterns": patterns_found
            }

        return {"found": False, "severity": None, "patterns": []}

    def _determine_action(
        self,
        issues: List[Dict],
        content_type: str
    ) -> str:
        """Determine moderation action based on issues."""
        if not issues:
            return "allow"

        # Get max severity
        severities = [i.get("severity") for i in issues if i.get("severity")]

        if "high" in severities:
            return "block"

        if "medium" in severities:
            # For bios and profile text, be stricter
            if content_type in ["bio", "profile_text"]:
                return "review"
            return "warn"

        return "allow"

    def _get_max_severity(self, issues: List[Dict]) -> Optional[str]:
        """Get maximum severity from issues."""
        if not issues:
            return None

        severities = [i.get("severity") for i in issues if i.get("severity")]

        if "high" in severities:
            return "high"
        if "medium" in severities:
            return "medium"
        if "low" in severities:
            return "low"

        return None

    def _clean_content(self, content: str) -> str:
        """Clean content by censoring profanity."""
        cleaned = content

        for word in self.profanity_words:
            # Replace with asterisks
            pattern = re.compile(re.escape(word), re.IGNORECASE)
            replacement = word[0] + "*" * (len(word) - 1)
            cleaned = pattern.sub(replacement, cleaned)

        return cleaned

    async def _store_moderation_result(self, user_id: str, result: Dict):
        """Store moderation result for user."""
        await self.db.moderation_history.update_one(
            {"user_id": user_id},
            {
                "$push": {
                    "results": {
                        "$each": [result],
                        "$slice": -100  # Keep last 100 results
                    }
                },
                "$inc": {
                    f"action_counts.{result['action']}": 1
                },
                "$set": {
                    "latest_result": result,
                    "updated_at": datetime.utcnow()
                },
                "$setOnInsert": {
                    "created_at": datetime.utcnow()
                }
            },
            upsert=True
        )
