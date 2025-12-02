"""Language detection service implementation."""

import logging
import re
from typing import Dict, List, Any

from models import LanguageDetectResponse

logger = logging.getLogger(__name__)


class LanguageDetectorService:
    """Service for detecting text language."""

    def __init__(self):
        self.language_patterns = {}

    async def initialize(self):
        """Initialize the service."""
        logger.info("Initializing Language Detector Service")
        await self._load_language_patterns()

    async def close(self):
        """Cleanup resources."""
        logger.info("Closing Language Detector Service")

    async def _load_language_patterns(self):
        """Load language detection patterns."""
        # Common words in different languages
        self.language_patterns = {
            "en": {  # English
                "words": ["the", "and", "is", "in", "to", "of", "a", "for", "on", "with"],
                "chars": set("abcdefghijklmnopqrstuvwxyz")
            },
            "es": {  # Spanish
                "words": ["el", "la", "de", "que", "y", "a", "en", "un", "ser", "se"],
                "chars": set("abcdefghijklmnopqrstuvwxyzáéíóúñü")
            },
            "fr": {  # French
                "words": ["le", "de", "un", "être", "et", "à", "il", "avoir", "ne", "je"],
                "chars": set("abcdefghijklmnopqrstuvwxyzàâæçéèêëïîôùûüÿœ")
            },
            "de": {  # German
                "words": ["der", "die", "und", "in", "den", "von", "zu", "das", "mit", "sich"],
                "chars": set("abcdefghijklmnopqrstuvwxyzäöüß")
            },
            "it": {  # Italian
                "words": ["il", "di", "e", "la", "a", "che", "in", "un", "per", "non"],
                "chars": set("abcdefghijklmnopqrstuvwxyzàèéìíîòóùú")
            },
            "pt": {  # Portuguese
                "words": ["o", "a", "de", "que", "e", "do", "da", "em", "um", "para"],
                "chars": set("abcdefghijklmnopqrstuvwxyzáàâãçéêíóôõú")
            },
            "ru": {  # Russian
                "words": ["в", "и", "не", "на", "я", "что", "он", "с", "а", "как"],
                "chars": set("абвгдеёжзийклмнопрстуфхцчшщъыьэюя")
            },
            "zh": {  # Chinese
                "words": ["的", "一", "是", "在", "不", "了", "有", "和", "人", "这"],
                "chars": set()  # Will check for CJK unicode range
            },
            "ja": {  # Japanese
                "words": ["の", "に", "は", "を", "た", "が", "で", "て", "と", "し"],
                "chars": set()  # Will check for hiragana/katakana/kanji
            },
            "ar": {  # Arabic
                "words": ["في", "من", "على", "إلى", "أن", "هذا", "كان", "قد", "هو", "لم"],
                "chars": set("ابتثجحخدذرزسشصضطظعغفقكلمنهوي")
            }
        }

    async def detect(self, text: str) -> LanguageDetectResponse:
        """
        Detect language of text.

        Args:
            text: Text to analyze

        Returns:
            LanguageDetectResponse with detected language
        """
        text_lower = text.lower()
        words = re.findall(r'\b\w+\b', text_lower)

        if not words:
            return LanguageDetectResponse(
                text=text,
                language="unknown",
                confidence=0.0,
                alternatives=[]
            )

        # Score each language
        language_scores = {}

        for lang_code, lang_data in self.language_patterns.items():
            score = 0

            # Count matching common words
            common_words = lang_data["words"]
            word_matches = sum(1 for word in words if word in common_words)
            score += word_matches * 2

            # Check character set
            chars = lang_data["chars"]
            if chars:
                text_chars = set(text_lower)
                char_overlap = len(text_chars & chars) / max(len(text_chars), 1)
                score += char_overlap * 10

            # Special handling for CJK languages
            if lang_code == "zh":
                # Chinese characters (CJK Unified Ideographs)
                if any('\u4e00' <= char <= '\u9fff' for char in text):
                    score += 20

            if lang_code == "ja":
                # Japanese hiragana, katakana, kanji
                if any('\u3040' <= char <= '\u309f' for char in text):  # Hiragana
                    score += 15
                if any('\u30a0' <= char <= '\u30ff' for char in text):  # Katakana
                    score += 15
                if any('\u4e00' <= char <= '\u9fff' for char in text):  # Kanji
                    score += 10

            if lang_code == "ar":
                # Arabic script
                if any('\u0600' <= char <= '\u06ff' for char in text):
                    score += 20

            language_scores[lang_code] = score

        # Find top language
        sorted_languages = sorted(
            language_scores.items(),
            key=lambda x: x[1],
            reverse=True
        )

        if not sorted_languages or sorted_languages[0][1] == 0:
            return LanguageDetectResponse(
                text=text,
                language="unknown",
                confidence=0.0,
                alternatives=[]
            )

        detected_language = sorted_languages[0][0]
        max_score = sorted_languages[0][1]

        # Calculate confidence (normalize score)
        total_score = sum(score for _, score in sorted_languages)
        confidence = max_score / max(total_score, 1)

        # Get alternatives (top 3, excluding the detected language)
        alternatives = [
            {
                "language": lang,
                "confidence": round(score / max(total_score, 1), 3)
            }
            for lang, score in sorted_languages[1:4]
            if score > 0
        ]

        return LanguageDetectResponse(
            text=text,
            language=detected_language,
            confidence=round(confidence, 3),
            alternatives=alternatives
        )
