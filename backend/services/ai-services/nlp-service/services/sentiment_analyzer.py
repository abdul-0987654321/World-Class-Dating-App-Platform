"""Sentiment analysis service implementation."""

import logging
import re
from typing import Dict, Optional

from models import SentimentResponse, SentimentLabel

logger = logging.getLogger(__name__)


class SentimentAnalyzerService:
    """Service for analyzing text sentiment."""

    def __init__(self):
        self.positive_words = set()
        self.negative_words = set()
        self.emotion_lexicon = {}

    async def initialize(self):
        """Initialize the service."""
        logger.info("Initializing Sentiment Analyzer Service")
        await self._load_lexicons()

    async def close(self):
        """Cleanup resources."""
        logger.info("Closing Sentiment Analyzer Service")

    async def _load_lexicons(self):
        """Load sentiment and emotion lexicons."""
        # Positive words
        self.positive_words = {
            "love", "great", "amazing", "wonderful", "fantastic", "excellent",
            "good", "nice", "happy", "joy", "beautiful", "perfect", "best",
            "awesome", "incredible", "outstanding", "super", "brilliant",
            "lovely", "sweet", "kind", "friendly", "caring", "generous",
            "fun", "exciting", "interesting", "cool", "like", "enjoy"
        }

        # Negative words
        self.negative_words = {
            "hate", "terrible", "awful", "horrible", "bad", "worst", "poor",
            "sad", "angry", "annoyed", "upset", "disappointed", "boring",
            "dull", "ugly", "stupid", "idiot", "jerk", "rude", "mean",
            "nasty", "disgusting", "gross", "terrible", "sucks", "useless",
            "waste", "annoying", "frustrating", "pathetic"
        }

        # Emotion lexicon
        self.emotion_lexicon = {
            "joy": ["happy", "joy", "delighted", "cheerful", "excited"],
            "love": ["love", "adore", "affection", "passionate", "romance"],
            "surprise": ["surprised", "amazed", "shocked", "astonished"],
            "sadness": ["sad", "unhappy", "depressed", "melancholy", "blue"],
            "anger": ["angry", "furious", "mad", "rage", "annoyed"],
            "fear": ["afraid", "scared", "terrified", "anxious", "worried"]
        }

    async def analyze(self, text: str) -> SentimentResponse:
        """
        Analyze sentiment of text.

        Args:
            text: Text to analyze

        Returns:
            SentimentResponse with sentiment analysis
        """
        # Clean and tokenize text
        tokens = self._tokenize(text)

        # Count positive and negative words
        positive_count = sum(1 for token in tokens if token in self.positive_words)
        negative_count = sum(1 for token in tokens if token in self.negative_words)

        # Calculate sentiment score (-1 to 1)
        total_sentiment_words = positive_count + negative_count
        if total_sentiment_words == 0:
            score = 0.0
            sentiment = SentimentLabel.NEUTRAL
            confidence = 0.5
        else:
            score = (positive_count - negative_count) / total_sentiment_words

            # Determine sentiment label
            if score > 0.2:
                sentiment = SentimentLabel.POSITIVE
                confidence = min(abs(score) + 0.5, 1.0)
            elif score < -0.2:
                sentiment = SentimentLabel.NEGATIVE
                confidence = min(abs(score) + 0.5, 1.0)
            else:
                sentiment = SentimentLabel.NEUTRAL
                confidence = 0.6

        # Analyze emotions
        emotions = self._analyze_emotions(tokens)

        return SentimentResponse(
            text=text,
            sentiment=sentiment,
            score=round(score, 3),
            confidence=round(confidence, 3),
            emotions=emotions
        )

    def _tokenize(self, text: str) -> list:
        """
        Tokenize text into words.

        Args:
            text: Text to tokenize

        Returns:
            List of tokens
        """
        # Convert to lowercase and split into words
        text_lower = text.lower()
        # Remove punctuation and split
        tokens = re.findall(r'\b\w+\b', text_lower)
        return tokens

    def _analyze_emotions(self, tokens: list) -> Dict[str, float]:
        """
        Analyze emotions in text.

        Args:
            tokens: Tokenized text

        Returns:
            Dictionary of emotion scores
        """
        emotion_scores = {}

        for emotion, keywords in self.emotion_lexicon.items():
            count = sum(1 for token in tokens if token in keywords)
            if count > 0:
                # Normalize by total tokens (max 1.0)
                score = min(count / len(tokens) * 10, 1.0)
                emotion_scores[emotion] = round(score, 3)

        return emotion_scores
