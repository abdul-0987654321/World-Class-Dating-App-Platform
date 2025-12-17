"""Enhanced sentiment analysis for message tone detection."""

import asyncio
from typing import Dict, List, Optional, Any
import structlog
from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification
import torch

from app.config import Settings

logger = structlog.get_logger()


class SentimentAnalysisService:
    """Service for analyzing sentiment and emotional tone of messages."""

    def __init__(self, settings: Settings):
        """Initialize the sentiment analysis service."""
        self.settings = settings
        self.sentiment_pipeline = None
        self.emotion_pipeline = None
        self.model_loaded = False

    async def initialize(self):
        """Initialize the sentiment models."""
        try:
            # Load sentiment analysis model
            model_name = self.settings.SENTIMENT_MODEL
            self.sentiment_pipeline = pipeline(
                "sentiment-analysis",
                model=model_name,
                device=0 if torch.cuda.is_available() else -1
            )

            # Load emotion detection model (if available)
            try:
                self.emotion_pipeline = pipeline(
                    "text-classification",
                    model="j-hartmann/emotion-english-distilroberta-base",
                    device=0 if torch.cuda.is_available() else -1,
                    top_k=None
                )
            except:
                logger.warning("Emotion model not available, using sentiment only")

            self.model_loaded = True
            logger.info("Sentiment analysis service initialized successfully")

        except Exception as e:
            logger.error("Failed to initialize sentiment service", error=str(e))
            self.model_loaded = False

    async def close(self):
        """Cleanup resources."""
        self.sentiment_pipeline = None
        self.emotion_pipeline = None

    async def analyze_message_tone(
        self,
        message: str,
        context: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Analyze the tone and sentiment of a message.

        Args:
            message: Message text to analyze
            context: Optional previous messages for context

        Returns:
            Detailed sentiment and tone analysis
        """
        try:
            if not message or not message.strip():
                return {
                    "success": False,
                    "error": "Empty message"
                }

            # Basic sentiment analysis
            sentiment = await self._analyze_sentiment(message)

            # Emotion detection
            emotions = await self._detect_emotions(message)

            # Tone characteristics
            tone_characteristics = self._analyze_tone_characteristics(message)

            # Context analysis if provided
            context_shift = None
            if context:
                context_shift = await self._analyze_context_shift(context, message)

            # Overall tone assessment
            overall_tone = self._determine_overall_tone(
                sentiment,
                emotions,
                tone_characteristics
            )

            # Get tone recommendations
            recommendations = self._get_tone_recommendations(overall_tone, tone_characteristics)

            return {
                "success": True,
                "message": message,
                "sentiment": sentiment,
                "emotions": emotions,
                "tone_characteristics": tone_characteristics,
                "overall_tone": overall_tone,
                "context_shift": context_shift,
                "recommendations": recommendations,
                "appropriateness": self._assess_appropriateness(
                    overall_tone,
                    tone_characteristics
                )
            }

        except Exception as e:
            logger.error("Message tone analysis failed", error=str(e))
            return {
                "success": False,
                "error": str(e)
            }

    async def analyze_conversation_sentiment_flow(
        self,
        messages: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Analyze sentiment flow across entire conversation.

        Args:
            messages: List of messages with content and metadata

        Returns:
            Sentiment flow analysis
        """
        try:
            if not messages:
                return {
                    "success": False,
                    "error": "No messages provided"
                }

            # Analyze sentiment for each message
            sentiment_timeline = []
            for msg in messages:
                content = msg.get("content", "")
                if content:
                    sentiment = await self._analyze_sentiment(content)
                    sentiment_timeline.append({
                        "message_id": msg.get("id"),
                        "timestamp": msg.get("timestamp"),
                        "sender_id": msg.get("sender_id"),
                        "sentiment": sentiment["label"],
                        "score": sentiment["score"],
                        "valence": sentiment["valence"]
                    })

            # Calculate flow metrics
            sentiment_trajectory = self._calculate_sentiment_trajectory(sentiment_timeline)
            volatility = self._calculate_sentiment_volatility(sentiment_timeline)
            overall_trend = self._determine_sentiment_trend(sentiment_timeline)

            # Identify significant moments
            significant_moments = self._identify_significant_moments(sentiment_timeline)

            return {
                "success": True,
                "message_count": len(messages),
                "sentiment_timeline": sentiment_timeline,
                "trajectory": sentiment_trajectory,
                "volatility": volatility,
                "overall_trend": overall_trend,
                "significant_moments": significant_moments,
                "health_score": self._calculate_conversation_health(
                    sentiment_timeline,
                    volatility,
                    overall_trend
                )
            }

        except Exception as e:
            logger.error("Conversation sentiment flow analysis failed", error=str(e))
            return {
                "success": False,
                "error": str(e)
            }

    async def detect_emotional_state(
        self,
        messages: List[str],
        user_id: str
    ) -> Dict[str, Any]:
        """
        Detect emotional state from recent messages.

        Args:
            messages: List of recent messages from user
            user_id: User ID

        Returns:
            Emotional state analysis
        """
        try:
            if not messages:
                return {
                    "success": False,
                    "error": "No messages provided"
                }

            # Analyze emotions in all messages
            all_emotions = []
            for message in messages:
                emotions = await self._detect_emotions(message)
                all_emotions.extend(emotions)

            # Aggregate emotions
            emotion_summary = self._aggregate_emotions(all_emotions)

            # Determine dominant emotional state
            dominant_state = self._determine_dominant_state(emotion_summary)

            # Assess emotional stability
            stability = self._assess_emotional_stability(all_emotions)

            return {
                "success": True,
                "user_id": user_id,
                "message_count": len(messages),
                "emotion_summary": emotion_summary,
                "dominant_state": dominant_state,
                "stability": stability,
                "insights": self._generate_emotional_insights(
                    emotion_summary,
                    dominant_state,
                    stability
                )
            }

        except Exception as e:
            logger.error("Emotional state detection failed", error=str(e))
            return {
                "success": False,
                "error": str(e)
            }

    async def _analyze_sentiment(self, text: str) -> Dict[str, Any]:
        """Analyze sentiment of text."""
        if not self.model_loaded or not self.sentiment_pipeline:
            return self._fallback_sentiment_analysis(text)

        try:
            # Get sentiment from model
            result = self.sentiment_pipeline(text[:512])[0]  # Limit length

            # Convert to standard format
            label = result["label"].lower()
            score = result["score"]

            # Map to valence (-1 to 1)
            if "positive" in label:
                valence = score
            elif "negative" in label:
                valence = -score
            else:
                valence = 0.0

            return {
                "label": label,
                "score": round(score, 3),
                "valence": round(valence, 3),
                "confidence": "high" if score > 0.8 else "moderate" if score > 0.6 else "low"
            }

        except Exception as e:
            logger.error("Sentiment analysis failed", error=str(e))
            return self._fallback_sentiment_analysis(text)

    async def _detect_emotions(self, text: str) -> List[Dict[str, Any]]:
        """Detect specific emotions in text."""
        if not self.emotion_pipeline:
            return self._fallback_emotion_detection(text)

        try:
            # Get emotions from model
            results = self.emotion_pipeline(text[:512])[0]

            # Sort by score and return top emotions
            emotions = [
                {
                    "emotion": result["label"],
                    "score": round(result["score"], 3)
                }
                for result in sorted(results, key=lambda x: x["score"], reverse=True)
                if result["score"] > 0.1  # Filter low-confidence emotions
            ]

            return emotions[:5]  # Top 5 emotions

        except Exception as e:
            logger.error("Emotion detection failed", error=str(e))
            return self._fallback_emotion_detection(text)

    def _analyze_tone_characteristics(self, message: str) -> Dict[str, Any]:
        """Analyze specific tone characteristics."""
        characteristics = {
            "formality": self._assess_formality(message),
            "enthusiasm": self._assess_enthusiasm(message),
            "warmth": self._assess_warmth(message),
            "assertiveness": self._assess_assertiveness(message),
            "playfulness": self._assess_playfulness(message)
        }

        return characteristics

    def _assess_formality(self, text: str) -> str:
        """Assess formality level."""
        formal_indicators = ["please", "thank you", "would", "could", "appreciate"]
        informal_indicators = ["hey", "yeah", "lol", "haha", "wanna", "gonna"]

        text_lower = text.lower()
        formal_count = sum(1 for word in formal_indicators if word in text_lower)
        informal_count = sum(1 for word in informal_indicators if word in text_lower)

        if formal_count > informal_count:
            return "formal"
        elif informal_count > formal_count:
            return "casual"
        else:
            return "neutral"

    def _assess_enthusiasm(self, text: str) -> str:
        """Assess enthusiasm level."""
        exclamation_count = text.count("!")
        caps_words = sum(1 for word in text.split() if word.isupper() and len(word) > 1)
        enthusiastic_words = ["amazing", "awesome", "excited", "love", "great"]

        score = (
            exclamation_count * 10 +
            caps_words * 5 +
            sum(5 for word in enthusiastic_words if word in text.lower())
        )

        if score > 20:
            return "very_high"
        elif score > 10:
            return "high"
        elif score > 5:
            return "moderate"
        else:
            return "low"

    def _assess_warmth(self, text: str) -> str:
        """Assess warmth/friendliness."""
        warm_indicators = ["😊", "😄", "❤️", "💕", "thanks", "appreciate", "sweet", "kind"]
        text_lower = text.lower()

        warmth_score = sum(5 for indicator in warm_indicators if indicator in text_lower or indicator in text)

        if warmth_score > 15:
            return "very_warm"
        elif warmth_score > 5:
            return "warm"
        else:
            return "neutral"

    def _assess_assertiveness(self, text: str) -> str:
        """Assess assertiveness level."""
        assertive_indicators = ["i think", "i believe", "definitely", "certainly", "should"]
        text_lower = text.lower()

        assertiveness = sum(1 for indicator in assertive_indicators if indicator in text_lower)

        if assertiveness > 2:
            return "high"
        elif assertiveness > 0:
            return "moderate"
        else:
            return "low"

    def _assess_playfulness(self, text: str) -> str:
        """Assess playfulness/humor."""
        playful_indicators = ["haha", "lol", "😂", "😄", "😜", "😉"]
        playful_count = sum(1 for indicator in playful_indicators if indicator in text.lower() or indicator in text)

        if playful_count > 2:
            return "very_playful"
        elif playful_count > 0:
            return "playful"
        else:
            return "serious"

    async def _analyze_context_shift(
        self,
        context: List[str],
        current_message: str
    ) -> Dict[str, Any]:
        """Analyze sentiment shift from context."""
        if not context:
            return None

        # Analyze previous sentiment
        prev_sentiment = await self._analyze_sentiment(context[-1])
        current_sentiment = await self._analyze_sentiment(current_message)

        # Calculate shift
        sentiment_shift = current_sentiment["valence"] - prev_sentiment["valence"]

        return {
            "shift_magnitude": abs(sentiment_shift),
            "shift_direction": "more_positive" if sentiment_shift > 0 else "more_negative" if sentiment_shift < 0 else "stable",
            "previous_sentiment": prev_sentiment["label"],
            "current_sentiment": current_sentiment["label"]
        }

    def _determine_overall_tone(
        self,
        sentiment: Dict[str, Any],
        emotions: List[Dict[str, Any]],
        characteristics: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Determine overall tone from all analyses."""
        # Primary tone from sentiment and top emotion
        primary_tone = sentiment["label"]
        if emotions:
            primary_tone = f"{emotions[0]['emotion']}_{sentiment['label']}"

        # Tone modifiers from characteristics
        modifiers = []
        if characteristics["enthusiasm"] in ["high", "very_high"]:
            modifiers.append("enthusiastic")
        if characteristics["warmth"] in ["warm", "very_warm"]:
            modifiers.append("warm")
        if characteristics["playfulness"] in ["playful", "very_playful"]:
            modifiers.append("playful")

        return {
            "primary_tone": primary_tone,
            "modifiers": modifiers,
            "description": self._generate_tone_description(primary_tone, modifiers),
            "dating_appropriateness": self._assess_dating_context_appropriateness(
                sentiment,
                emotions,
                characteristics
            )
        }

    def _generate_tone_description(self, primary_tone: str, modifiers: List[str]) -> str:
        """Generate human-readable tone description."""
        if modifiers:
            return f"{', '.join(modifiers)} and {primary_tone}"
        return primary_tone

    def _assess_dating_context_appropriateness(
        self,
        sentiment: Dict[str, Any],
        emotions: List[Dict[str, Any]],
        characteristics: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Assess if tone is appropriate for dating context."""
        issues = []

        # Check for overly negative sentiment
        if sentiment["valence"] < -0.5:
            issues.append("tone_too_negative")

        # Check for overly formal
        if characteristics["formality"] == "formal":
            issues.append("may_seem_too_formal")

        # Check for concerning emotions
        if emotions:
            concerning_emotions = ["anger", "fear", "disgust"]
            if any(e["emotion"] in concerning_emotions and e["score"] > 0.6 for e in emotions):
                issues.append("concerning_emotional_tone")

        appropriateness_score = 100 - (len(issues) * 25)

        return {
            "score": max(0, appropriateness_score),
            "appropriate": len(issues) == 0,
            "issues": issues,
            "level": "appropriate" if appropriateness_score > 75 else "needs_adjustment" if appropriateness_score > 50 else "inappropriate"
        }

    def _get_tone_recommendations(
        self,
        overall_tone: Dict[str, Any],
        characteristics: Dict[str, Any]
    ) -> List[str]:
        """Get recommendations for improving tone."""
        recommendations = []

        if not overall_tone["dating_appropriateness"]["appropriate"]:
            issues = overall_tone["dating_appropriateness"]["issues"]

            if "tone_too_negative" in issues:
                recommendations.append("Try to maintain a more positive and upbeat tone")

            if "may_seem_too_formal" in issues:
                recommendations.append("Consider using a more casual, friendly tone")

            if "concerning_emotional_tone" in issues:
                recommendations.append("The message may come across as intense - consider softening the tone")

        if characteristics["enthusiasm"] == "low":
            recommendations.append("Adding some enthusiasm could make your message more engaging")

        if characteristics["warmth"] == "neutral":
            recommendations.append("Consider adding warmth to make your message more inviting")

        return recommendations if recommendations else ["Tone is well-suited for dating context"]

    def _assess_appropriateness(
        self,
        overall_tone: Dict[str, Any],
        characteristics: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Assess message appropriateness."""
        return overall_tone.get("dating_appropriateness", {
            "score": 100,
            "appropriate": True,
            "issues": [],
            "level": "appropriate"
        })

    def _calculate_sentiment_trajectory(
        self,
        timeline: List[Dict[str, Any]]
    ) -> str:
        """Calculate overall sentiment trajectory."""
        if len(timeline) < 3:
            return "insufficient_data"

        valences = [msg["valence"] for msg in timeline]
        start_avg = sum(valences[:len(valences)//3]) / (len(valences)//3)
        end_avg = sum(valences[-len(valences)//3:]) / (len(valences)//3)

        if end_avg > start_avg + 0.2:
            return "improving"
        elif end_avg < start_avg - 0.2:
            return "declining"
        else:
            return "stable"

    def _calculate_sentiment_volatility(
        self,
        timeline: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Calculate sentiment volatility."""
        if len(timeline) < 2:
            return {"score": 0, "level": "stable"}

        valences = [msg["valence"] for msg in timeline]
        changes = [abs(valences[i] - valences[i-1]) for i in range(1, len(valences))]
        avg_change = sum(changes) / len(changes)

        volatility_score = avg_change * 100

        return {
            "score": round(volatility_score, 1),
            "level": "high" if volatility_score > 40 else "moderate" if volatility_score > 20 else "low"
        }

    def _determine_sentiment_trend(
        self,
        timeline: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Determine sentiment trend."""
        if not timeline:
            return {"trend": "unknown"}

        positive_count = sum(1 for msg in timeline if msg["valence"] > 0.2)
        negative_count = sum(1 for msg in timeline if msg["valence"] < -0.2)
        neutral_count = len(timeline) - positive_count - negative_count

        return {
            "trend": "positive" if positive_count > negative_count else "negative" if negative_count > positive_count else "neutral",
            "positive_ratio": round(positive_count / len(timeline), 2),
            "negative_ratio": round(negative_count / len(timeline), 2),
            "neutral_ratio": round(neutral_count / len(timeline), 2)
        }

    def _identify_significant_moments(
        self,
        timeline: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Identify significant sentiment moments."""
        moments = []

        for i, msg in enumerate(timeline):
            # Very positive moments
            if msg["valence"] > 0.7:
                moments.append({
                    "type": "very_positive",
                    "message_id": msg["message_id"],
                    "timestamp": msg["timestamp"],
                    "description": "Highly positive moment"
                })

            # Very negative moments
            if msg["valence"] < -0.7:
                moments.append({
                    "type": "very_negative",
                    "message_id": msg["message_id"],
                    "timestamp": msg["timestamp"],
                    "description": "Concerning negative moment"
                })

            # Large sentiment shifts
            if i > 0:
                shift = abs(msg["valence"] - timeline[i-1]["valence"])
                if shift > 0.5:
                    moments.append({
                        "type": "significant_shift",
                        "message_id": msg["message_id"],
                        "timestamp": msg["timestamp"],
                        "description": "Major sentiment shift"
                    })

        return moments[:10]  # Top 10 moments

    def _calculate_conversation_health(
        self,
        timeline: List[Dict[str, Any]],
        volatility: Dict[str, Any],
        trend: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Calculate overall conversation health score."""
        # Positive trend is good
        trend_score = 0
        if trend["trend"] == "positive":
            trend_score = 40
        elif trend["trend"] == "neutral":
            trend_score = 30

        # Low volatility is good
        volatility_score = 0
        if volatility["level"] == "low":
            volatility_score = 30
        elif volatility["level"] == "moderate":
            volatility_score = 20

        # High positive ratio is good
        positive_ratio_score = trend.get("positive_ratio", 0) * 30

        health_score = trend_score + volatility_score + positive_ratio_score

        return {
            "score": round(health_score, 1),
            "level": "excellent" if health_score > 80 else "good" if health_score > 60 else "fair" if health_score > 40 else "poor",
            "components": {
                "trend": trend_score,
                "stability": volatility_score,
                "positivity": round(positive_ratio_score, 1)
            }
        }

    def _aggregate_emotions(
        self,
        all_emotions: List[Dict[str, Any]]
    ) -> Dict[str, float]:
        """Aggregate emotions across messages."""
        emotion_totals = {}
        emotion_counts = {}

        for emotion_data in all_emotions:
            emotion = emotion_data["emotion"]
            score = emotion_data["score"]

            if emotion not in emotion_totals:
                emotion_totals[emotion] = 0
                emotion_counts[emotion] = 0

            emotion_totals[emotion] += score
            emotion_counts[emotion] += 1

        # Calculate averages
        return {
            emotion: round(emotion_totals[emotion] / emotion_counts[emotion], 3)
            for emotion in emotion_totals
        }

    def _determine_dominant_state(
        self,
        emotion_summary: Dict[str, float]
    ) -> Dict[str, Any]:
        """Determine dominant emotional state."""
        if not emotion_summary:
            return {"state": "neutral", "confidence": 0}

        dominant_emotion = max(emotion_summary.items(), key=lambda x: x[1])

        return {
            "state": dominant_emotion[0],
            "confidence": round(dominant_emotion[1], 3),
            "secondary_emotions": sorted(
                [(k, v) for k, v in emotion_summary.items() if k != dominant_emotion[0]],
                key=lambda x: x[1],
                reverse=True
            )[:3]
        }

    def _assess_emotional_stability(
        self,
        all_emotions: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Assess emotional stability across messages."""
        if not all_emotions:
            return {"stable": True, "score": 100}

        # Check for dramatic emotion changes
        # (Simplified - would need temporal grouping in production)
        emotion_variety = len(set(e["emotion"] for e in all_emotions))

        stability_score = max(0, 100 - (emotion_variety * 10))

        return {
            "stable": stability_score > 60,
            "score": stability_score,
            "emotion_variety": emotion_variety,
            "assessment": "stable" if stability_score > 70 else "moderately_stable" if stability_score > 50 else "variable"
        }

    def _generate_emotional_insights(
        self,
        emotion_summary: Dict[str, float],
        dominant_state: Dict[str, Any],
        stability: Dict[str, Any]
    ) -> List[str]:
        """Generate insights about emotional state."""
        insights = []

        # Dominant state insight
        state = dominant_state["state"]
        insights.append(f"Primary emotional state: {state}")

        # Stability insight
        if stability["stable"]:
            insights.append("Emotionally consistent and stable communication")
        else:
            insights.append("Varied emotional expression across messages")

        # Positive emotions
        positive_emotions = ["joy", "love", "surprise"]
        if any(emotion in emotion_summary for emotion in positive_emotions):
            insights.append("Positive emotional tone detected")

        return insights

    def _fallback_sentiment_analysis(self, text: str) -> Dict[str, Any]:
        """Fallback sentiment analysis using simple heuristics."""
        positive_words = ["love", "great", "awesome", "amazing", "wonderful", "happy", "excited", "perfect"]
        negative_words = ["hate", "terrible", "awful", "bad", "sad", "angry", "annoyed", "disappointed"]

        text_lower = text.lower()
        positive_count = sum(1 for word in positive_words if word in text_lower)
        negative_count = sum(1 for word in negative_words if word in text_lower)

        if positive_count > negative_count:
            return {"label": "positive", "score": 0.7, "valence": 0.7, "confidence": "low"}
        elif negative_count > positive_count:
            return {"label": "negative", "score": 0.7, "valence": -0.7, "confidence": "low"}
        else:
            return {"label": "neutral", "score": 0.6, "valence": 0.0, "confidence": "low"}

    def _fallback_emotion_detection(self, text: str) -> List[Dict[str, Any]]:
        """Fallback emotion detection using simple keywords."""
        emotions = {
            "joy": ["happy", "joy", "excited", "great", "wonderful"],
            "love": ["love", "adore", "appreciate", "like"],
            "surprise": ["wow", "omg", "amazing", "incredible"],
            "sadness": ["sad", "unhappy", "disappointed"],
            "anger": ["angry", "mad", "frustrated", "annoyed"]
        }

        text_lower = text.lower()
        detected = []

        for emotion, keywords in emotions.items():
            matches = sum(1 for keyword in keywords if keyword in text_lower)
            if matches > 0:
                detected.append({
                    "emotion": emotion,
                    "score": min(matches * 0.3, 0.9)
                })

        return detected if detected else [{"emotion": "neutral", "score": 0.8}]
