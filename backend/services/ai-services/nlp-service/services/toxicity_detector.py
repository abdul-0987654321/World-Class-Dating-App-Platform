"""Toxicity detection service implementation."""

import logging
import re
from typing import Dict, List

from models import ToxicityResponse

logger = logging.getLogger(__name__)


class ToxicityDetectorService:
    """Service for detecting toxic content."""

    def __init__(self):
        self.toxicity_patterns = {}
        self.profanity_list = set()

    async def initialize(self):
        """Initialize the service."""
        logger.info("Initializing Toxicity Detector Service")
        await self._load_toxicity_patterns()

    async def close(self):
        """Cleanup resources."""
        logger.info("Closing Toxicity Detector Service")

    async def _load_toxicity_patterns(self):
        """Load toxicity patterns and keywords."""
        # Insult patterns
        self.toxicity_patterns["insult"] = [
            r"\bidiot\b", r"\bstupid\b", r"\bmoron\b", r"\bdumb\b",
            r"\bloser\b", r"\bpathetic\b", r"\bworthless\b", r"\buseless\b"
        ]

        # Threat patterns
        self.toxicity_patterns["threat"] = [
            r"\bkill\b", r"\bhurt\b", r"\bharm\b", r"\battack\b",
            r"\bdestroy\b", r"\bbeat\b", r"\bi'll\s+get\s+you\b"
        ]

        # Harassment patterns
        self.toxicity_patterns["harassment"] = [
            r"\bstalk\b", r"\bfollow\s+you\b", r"\bwatch\s+you\b",
            r"\bfind\s+you\b", r"\bhunt\s+you\b"
        ]

        # Hate speech patterns
        self.toxicity_patterns["hate_speech"] = [
            r"\brace\b.*\binferior\b", r"\bgender\b.*\binferior\b",
            r"\bhate\b.*\bpeople\b"
        ]

        # Profanity list (abbreviated for example)
        self.profanity_list = {
            "damn", "hell", "crap", "shit", "fuck", "ass", "bitch",
            "bastard", "piss", "dick"
        }

        # Sexual content patterns
        self.toxicity_patterns["sexual"] = [
            r"\bsex\b", r"\bnaked\b", r"\bnude\b", r"\bporn\b",
            r"\bxxx\b", r"\badult\s+content\b"
        ]

    async def detect(self, text: str) -> ToxicityResponse:
        """
        Detect toxicity in text.

        Args:
            text: Text to analyze

        Returns:
            ToxicityResponse with toxicity analysis
        """
        text_lower = text.lower()

        # Check each toxicity category
        categories = {}
        flagged_phrases = []
        total_score = 0.0

        for category, patterns in self.toxicity_patterns.items():
            matches = 0
            for pattern in patterns:
                found = re.findall(pattern, text_lower)
                if found:
                    matches += len(found)
                    flagged_phrases.extend(found)

            # Calculate category score (0-1)
            category_score = min(matches / 5.0, 1.0)
            categories[category] = round(category_score, 3)
            total_score += category_score

        # Check profanity
        words = re.findall(r'\b\w+\b', text_lower)
        profanity_count = sum(1 for word in words if word in self.profanity_list)
        profanity_score = min(profanity_count / 3.0, 1.0)
        categories["profanity"] = round(profanity_score, 3)
        total_score += profanity_score

        # Calculate overall toxicity score
        toxicity_score = min(total_score / len(categories), 1.0)

        # Determine if text is toxic (threshold: 0.3)
        is_toxic = toxicity_score > 0.3

        # Remove duplicates from flagged phrases
        flagged_phrases = list(set(flagged_phrases))

        return ToxicityResponse(
            text=text,
            is_toxic=is_toxic,
            toxicity_score=round(toxicity_score, 3),
            categories=categories,
            flagged_phrases=flagged_phrases
        )
