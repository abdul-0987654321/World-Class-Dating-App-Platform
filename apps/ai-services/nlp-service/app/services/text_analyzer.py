"""Text analysis service for NLP operations."""

from typing import Dict, List, Optional, Any, Tuple
import re
import structlog
import redis.asyncio as redis
from langdetect import detect, detect_langs
import hashlib

from app.config import Settings

logger = structlog.get_logger()


class TextAnalyzerService:
    """Service for text analysis operations."""

    def __init__(self, settings: Settings):
        self.settings = settings
        self.redis_client: Optional[redis.Redis] = None
        self._sentiment_model = None
        self._toxicity_model = None
        self._embedding_model = None

        # Emotion keywords for simple emotion detection
        self.emotion_keywords = {
            "joy": ["happy", "excited", "thrilled", "delighted", "glad", "wonderful", "amazing", "love", "great", "awesome"],
            "sadness": ["sad", "unhappy", "depressed", "miserable", "heartbroken", "down", "upset", "disappointed"],
            "anger": ["angry", "furious", "mad", "annoyed", "irritated", "frustrated", "hate", "disgusted"],
            "fear": ["scared", "afraid", "terrified", "anxious", "worried", "nervous", "frightened"],
            "surprise": ["surprised", "shocked", "amazed", "astonished", "wow", "unexpected"],
            "love": ["love", "adore", "cherish", "care", "affection", "romantic", "attracted"]
        }

        # Interest categories
        self.interest_categories = {
            "sports": ["basketball", "football", "soccer", "tennis", "golf", "running", "gym", "fitness", "yoga", "swimming", "hiking", "cycling"],
            "music": ["music", "guitar", "piano", "singing", "concerts", "jazz", "rock", "hip hop", "classical", "edm", "dj"],
            "art": ["art", "painting", "drawing", "photography", "design", "sculpture", "museum", "gallery"],
            "food": ["cooking", "baking", "foodie", "restaurants", "cuisine", "chef", "wine", "coffee", "brunch"],
            "travel": ["travel", "adventure", "exploring", "wanderlust", "backpacking", "road trips", "beach", "mountains"],
            "technology": ["tech", "coding", "programming", "gaming", "computers", "startups", "ai", "apps"],
            "entertainment": ["movies", "netflix", "tv shows", "anime", "reading", "books", "theater", "comedy"],
            "nature": ["nature", "outdoors", "camping", "animals", "pets", "dogs", "cats", "gardening", "plants"],
            "social": ["friends", "parties", "socializing", "networking", "events", "dancing", "nightlife"],
            "wellness": ["meditation", "mindfulness", "wellness", "health", "self-care", "spirituality"]
        }

    async def initialize(self):
        """Initialize the service."""
        try:
            self.redis_client = redis.from_url(
                self.settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True
            )
            await self.redis_client.ping()
            logger.info("TextAnalyzer initialized")
        except Exception as e:
            logger.error("Failed to initialize text analyzer", error=str(e))
            raise

    async def close(self):
        """Close service connections."""
        if self.redis_client:
            await self.redis_client.close()

    async def analyze_sentiment(
        self,
        text: str,
        include_emotions: bool = False
    ) -> Dict[str, Any]:
        """
        Analyze sentiment of text.

        Args:
            text: Text to analyze
            include_emotions: Whether to include emotion breakdown

        Returns:
            Sentiment analysis results
        """
        # Check cache
        cache_key = f"sentiment:{hashlib.md5(text.encode()).hexdigest()}"
        cached = await self.redis_client.get(cache_key)
        if cached:
            import json
            return json.loads(cached)

        # Simple rule-based sentiment analysis
        text_lower = text.lower()

        positive_words = ["good", "great", "amazing", "wonderful", "love", "happy", "excellent", "fantastic", "beautiful", "awesome", "nice", "perfect", "best", "enjoy", "fun", "excited", "glad", "pleased"]
        negative_words = ["bad", "terrible", "awful", "hate", "sad", "angry", "horrible", "worst", "ugly", "boring", "annoying", "disappointed", "upset", "sorry", "unfortunately", "problem"]

        positive_count = sum(1 for word in positive_words if word in text_lower)
        negative_count = sum(1 for word in negative_words if word in text_lower)

        total = positive_count + negative_count
        if total == 0:
            sentiment = "neutral"
            confidence = 0.6
            scores = {"positive": 0.33, "negative": 0.33, "neutral": 0.34}
        elif positive_count > negative_count:
            sentiment = "positive"
            confidence = min(0.95, 0.5 + (positive_count - negative_count) * 0.1)
            scores = {"positive": confidence, "negative": (1 - confidence) / 2, "neutral": (1 - confidence) / 2}
        elif negative_count > positive_count:
            sentiment = "negative"
            confidence = min(0.95, 0.5 + (negative_count - positive_count) * 0.1)
            scores = {"positive": (1 - confidence) / 2, "negative": confidence, "neutral": (1 - confidence) / 2}
        else:
            sentiment = "neutral"
            confidence = 0.5
            scores = {"positive": 0.33, "negative": 0.33, "neutral": 0.34}

        result = {
            "sentiment": sentiment,
            "confidence": round(confidence, 3),
            "scores": {k: round(v, 3) for k, v in scores.items()}
        }

        if include_emotions:
            emotions = self._detect_emotions(text_lower)
            result["emotions"] = emotions

        # Cache result
        import json
        await self.redis_client.setex(
            cache_key,
            self.settings.CACHE_TTL,
            json.dumps(result)
        )

        return result

    def _detect_emotions(self, text: str) -> Dict[str, float]:
        """Detect emotions in text."""
        emotions = {}
        text_words = set(text.split())

        for emotion, keywords in self.emotion_keywords.items():
            matches = sum(1 for keyword in keywords if keyword in text or keyword in text_words)
            if matches > 0:
                emotions[emotion] = min(1.0, matches * 0.2)

        # Normalize
        total = sum(emotions.values())
        if total > 0:
            emotions = {k: round(v / total, 3) for k, v in emotions.items()}

        return emotions

    async def analyze_toxicity(
        self,
        text: str,
        include_categories: bool = True
    ) -> Dict[str, Any]:
        """
        Analyze text for toxic content.

        Args:
            text: Text to analyze
            include_categories: Whether to include category breakdown

        Returns:
            Toxicity analysis results
        """
        text_lower = text.lower()

        # Toxicity categories and their indicators
        toxicity_indicators = {
            "hate_speech": ["hate", "racist", "sexist", "homophobic", "slur", "discriminate"],
            "harassment": ["loser", "idiot", "stupid", "dumb", "ugly", "pathetic", "worthless", "kill yourself"],
            "violence": ["kill", "murder", "hurt", "attack", "beat", "punch", "stab", "shoot", "die"],
            "sexual": ["nude", "naked", "sex", "porn", "explicit"],
            "profanity": ["fuck", "shit", "damn", "ass", "bitch", "bastard", "crap"]
        }

        category_scores = {}
        flagged_phrases = []
        total_score = 0.0

        for category, indicators in toxicity_indicators.items():
            matches = []
            for indicator in indicators:
                if indicator in text_lower:
                    matches.append(indicator)

            if matches:
                score = min(1.0, len(matches) * 0.3)
                category_scores[category] = round(score, 3)
                flagged_phrases.extend(matches)
                total_score += score
            else:
                category_scores[category] = 0.0

        # Normalize total score
        overall_toxicity = min(1.0, total_score / len(toxicity_indicators))

        result = {
            "is_toxic": overall_toxicity >= self.settings.TOXICITY_THRESHOLD,
            "toxicity_score": round(overall_toxicity, 3),
            "flagged_phrases": list(set(flagged_phrases))
        }

        if include_categories:
            result["categories"] = category_scores

        # Determine action
        if overall_toxicity >= 0.8:
            result["action"] = "block"
        elif overall_toxicity >= self.settings.TOXICITY_THRESHOLD:
            result["action"] = "review"
        elif overall_toxicity >= 0.4:
            result["action"] = "warn"
        else:
            result["action"] = "allow"

        return result

    async def detect_language(self, text: str) -> Dict[str, Any]:
        """
        Detect the language of text.

        Args:
            text: Text to analyze

        Returns:
            Language detection results
        """
        try:
            primary = detect(text)
            all_langs = detect_langs(text)

            alternatives = [
                {"language": str(lang).split(":")[0], "confidence": round(lang.prob, 3)}
                for lang in all_langs[:5]
            ]

            return {
                "language": primary,
                "confidence": alternatives[0]["confidence"] if alternatives else 0.0,
                "alternatives": alternatives[1:] if len(alternatives) > 1 else [],
                "is_supported": primary in self.settings.SUPPORTED_LANGUAGES
            }

        except Exception as e:
            logger.warning("Language detection failed", error=str(e))
            return {
                "language": "unknown",
                "confidence": 0.0,
                "alternatives": [],
                "is_supported": False
            }

    async def calculate_similarity(
        self,
        text1: str,
        text2: str
    ) -> Dict[str, Any]:
        """
        Calculate semantic similarity between two texts.

        Args:
            text1: First text
            text2: Second text

        Returns:
            Similarity results
        """
        # Simple word overlap similarity (Jaccard)
        words1 = set(text1.lower().split())
        words2 = set(text2.lower().split())

        intersection = words1 & words2
        union = words1 | words2

        jaccard = len(intersection) / len(union) if union else 0.0

        # Common words bonus
        common_words = list(intersection)

        return {
            "similarity_score": round(jaccard, 3),
            "method": "jaccard",
            "common_terms": common_words[:10],
            "interpretation": self._interpret_similarity(jaccard)
        }

    def _interpret_similarity(self, score: float) -> str:
        """Interpret similarity score."""
        if score >= 0.8:
            return "very_similar"
        elif score >= 0.6:
            return "similar"
        elif score >= 0.4:
            return "somewhat_similar"
        elif score >= 0.2:
            return "slightly_similar"
        else:
            return "not_similar"

    async def extract_keywords(
        self,
        text: str,
        language: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Extract keywords from text.

        Args:
            text: Text to analyze
            language: Language code

        Returns:
            Extracted keywords
        """
        # Simple keyword extraction based on word frequency
        # Remove common stop words
        stop_words = {
            "i", "me", "my", "myself", "we", "our", "ours", "ourselves", "you",
            "your", "yours", "yourself", "he", "him", "his", "she", "her", "hers",
            "it", "its", "they", "them", "their", "what", "which", "who", "whom",
            "this", "that", "these", "those", "am", "is", "are", "was", "were",
            "be", "been", "being", "have", "has", "had", "having", "do", "does",
            "did", "doing", "a", "an", "the", "and", "but", "if", "or", "because",
            "as", "until", "while", "of", "at", "by", "for", "with", "about",
            "against", "between", "into", "through", "during", "before", "after",
            "above", "below", "to", "from", "up", "down", "in", "out", "on", "off",
            "over", "under", "again", "further", "then", "once", "here", "there",
            "when", "where", "why", "how", "all", "each", "few", "more", "most",
            "other", "some", "such", "no", "nor", "not", "only", "own", "same",
            "so", "than", "too", "very", "s", "t", "can", "will", "just", "don",
            "should", "now", "d", "ll", "m", "o", "re", "ve", "y", "ain", "aren",
            "couldn", "didn", "doesn", "hadn", "hasn", "haven", "isn", "ma",
            "mightn", "mustn", "needn", "shan", "shouldn", "wasn", "weren", "won",
            "wouldn", "like", "really", "also", "get", "make", "know", "think",
            "want", "see", "would", "could"
        }

        # Tokenize and clean
        words = re.findall(r'\b[a-zA-Z]{3,}\b', text.lower())
        filtered_words = [w for w in words if w not in stop_words]

        # Count frequencies
        word_counts = {}
        for word in filtered_words:
            word_counts[word] = word_counts.get(word, 0) + 1

        # Sort by frequency
        sorted_words = sorted(word_counts.items(), key=lambda x: x[1], reverse=True)

        keywords = [
            {"keyword": word, "frequency": count, "score": round(count / len(filtered_words), 3) if filtered_words else 0}
            for word, count in sorted_words[:20]
        ]

        return {
            "keywords": keywords,
            "total_words": len(words),
            "unique_words": len(set(filtered_words))
        }

    async def extract_interests(
        self,
        text: str,
        language: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Extract interests from profile text.

        Args:
            text: Profile text
            language: Language code

        Returns:
            Extracted interests by category
        """
        text_lower = text.lower()
        extracted = {}
        all_interests = []

        for category, keywords in self.interest_categories.items():
            matches = [kw for kw in keywords if kw in text_lower]
            if matches:
                extracted[category] = matches
                all_interests.extend(matches)

        return {
            "interests": all_interests,
            "by_category": extracted,
            "primary_categories": list(extracted.keys())[:5],
            "total_found": len(all_interests)
        }
