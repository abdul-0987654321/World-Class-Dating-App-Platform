"""Conversation analysis for compatibility scoring."""

import asyncio
from typing import Dict, List, Optional, Any
from datetime import datetime
import structlog
from collections import Counter
import re

from app.config import Settings

logger = structlog.get_logger()


class CompatibilityAnalyzerService:
    """Service for analyzing conversation compatibility between users."""

    def __init__(self, settings: Settings):
        """Initialize the compatibility analyzer service."""
        self.settings = settings

    async def initialize(self):
        """Initialize the service."""
        logger.info("Compatibility analyzer service initialized")

    async def close(self):
        """Cleanup resources."""
        pass

    async def analyze_conversation_compatibility(
        self,
        messages: List[Dict[str, Any]],
        user1_id: str,
        user2_id: str,
        user1_profile: Optional[Dict[str, Any]] = None,
        user2_profile: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Analyze compatibility based on conversation patterns.

        Args:
            messages: List of messages between users
            user1_id: First user ID
            user2_id: Second user ID
            user1_profile: Optional user1 profile data
            user2_profile: Optional user2 profile data

        Returns:
            Compatibility analysis with score and insights
        """
        try:
            if len(messages) < 3:
                return {
                    "success": True,
                    "compatibility_score": 0,
                    "status": "insufficient_data",
                    "message": "Need at least 3 messages for compatibility analysis"
                }

            # Separate messages by user
            user1_messages = [m for m in messages if m.get("sender_id") == user1_id]
            user2_messages = [m for m in messages if m.get("sender_id") == user2_id]

            # Calculate various compatibility metrics
            response_dynamics = self._analyze_response_dynamics(messages, user1_id, user2_id)
            communication_style = self._analyze_communication_styles(user1_messages, user2_messages)
            engagement_level = self._calculate_engagement_level(messages, user1_id, user2_id)
            topic_alignment = self._analyze_topic_alignment(user1_messages, user2_messages)
            emotional_resonance = self._analyze_emotional_resonance(messages)
            conversation_depth = self._analyze_conversation_depth(messages)

            # Calculate overall compatibility score
            compatibility_score = self._calculate_compatibility_score({
                "response_dynamics": response_dynamics,
                "communication_style": communication_style,
                "engagement": engagement_level,
                "topics": topic_alignment,
                "emotional": emotional_resonance,
                "depth": conversation_depth
            })

            # Generate insights
            insights = self._generate_compatibility_insights({
                "response_dynamics": response_dynamics,
                "communication_style": communication_style,
                "engagement": engagement_level,
                "topics": topic_alignment,
                "emotional": emotional_resonance,
                "depth": conversation_depth
            })

            # Determine compatibility level
            compatibility_level = self._get_compatibility_level(compatibility_score)

            return {
                "success": True,
                "compatibility_score": round(compatibility_score, 1),
                "compatibility_level": compatibility_level,
                "metrics": {
                    "response_dynamics": response_dynamics,
                    "communication_style": communication_style,
                    "engagement_level": engagement_level,
                    "topic_alignment": topic_alignment,
                    "emotional_resonance": emotional_resonance,
                    "conversation_depth": conversation_depth
                },
                "insights": insights,
                "red_flags": self._identify_red_flags(messages, user1_id, user2_id),
                "green_flags": self._identify_green_flags(messages, user1_id, user2_id),
                "recommendations": self._generate_recommendations(compatibility_score, insights),
                "analyzed_at": datetime.utcnow().isoformat()
            }

        except Exception as e:
            logger.error("Compatibility analysis failed", error=str(e))
            return {
                "success": False,
                "error": str(e)
            }

    async def predict_conversation_success(
        self,
        initial_messages: List[Dict[str, Any]],
        user1_profile: Dict[str, Any],
        user2_profile: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Predict likelihood of successful long-term conversation.

        Args:
            initial_messages: First few messages
            user1_profile: User 1 profile
            user2_profile: User 2 profile

        Returns:
            Success prediction and factors
        """
        try:
            # Analyze initial interaction quality
            initial_quality = self._assess_initial_interaction(initial_messages)

            # Check profile alignment
            profile_compatibility = self._assess_profile_compatibility(
                user1_profile,
                user2_profile
            )

            # Predict success probability
            success_probability = self._calculate_success_probability(
                initial_quality,
                profile_compatibility
            )

            # Identify success factors
            success_factors = self._identify_success_factors(
                initial_messages,
                user1_profile,
                user2_profile
            )

            # Identify risk factors
            risk_factors = self._identify_risk_factors(
                initial_messages,
                initial_quality
            )

            return {
                "success": True,
                "success_probability": round(success_probability, 1),
                "prediction": self._get_success_prediction(success_probability),
                "initial_interaction_quality": initial_quality,
                "profile_compatibility": profile_compatibility,
                "success_factors": success_factors,
                "risk_factors": risk_factors,
                "recommendations": self._get_success_recommendations(
                    success_probability,
                    risk_factors
                )
            }

        except Exception as e:
            logger.error("Conversation success prediction failed", error=str(e))
            return {
                "success": False,
                "error": str(e)
            }

    def _analyze_response_dynamics(
        self,
        messages: List[Dict[str, Any]],
        user1_id: str,
        user2_id: str
    ) -> Dict[str, Any]:
        """Analyze response patterns and timing."""
        if len(messages) < 2:
            return {"score": 0, "balanced": False}

        response_times = []
        message_length_balance = []

        for i in range(1, len(messages)):
            current = messages[i]
            previous = messages[i-1]

            # Calculate response time if timestamps available
            if "timestamp" in current and "timestamp" in previous:
                try:
                    current_time = datetime.fromisoformat(current["timestamp"].replace('Z', '+00:00'))
                    previous_time = datetime.fromisoformat(previous["timestamp"].replace('Z', '+00:00'))
                    response_time = (current_time - previous_time).total_seconds()
                    response_times.append(response_time)
                except:
                    pass

            # Track message length balance
            if current.get("sender_id") != previous.get("sender_id"):
                current_length = len(current.get("content", ""))
                previous_length = len(previous.get("content", ""))
                if previous_length > 0:
                    balance_ratio = current_length / previous_length
                    message_length_balance.append(balance_ratio)

        # Calculate balance score
        avg_balance = sum(message_length_balance) / len(message_length_balance) if message_length_balance else 1.0
        balance_score = 100 - abs(1.0 - avg_balance) * 100

        # Calculate response time score
        avg_response_time = sum(response_times) / len(response_times) if response_times else 300
        response_score = 100 if avg_response_time < 300 else max(0, 100 - (avg_response_time - 300) / 60)

        return {
            "score": (balance_score + response_score) / 2,
            "balanced": 0.7 <= avg_balance <= 1.3,
            "avg_response_time_seconds": round(avg_response_time, 0) if response_times else None,
            "message_balance": "good" if 0.7 <= avg_balance <= 1.3 else "unbalanced"
        }

    def _analyze_communication_styles(
        self,
        user1_messages: List[Dict[str, Any]],
        user2_messages: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Analyze and compare communication styles."""
        user1_style = self._determine_communication_style(user1_messages)
        user2_style = self._determine_communication_style(user2_messages)

        # Calculate style compatibility
        style_compatibility = self._calculate_style_compatibility(user1_style, user2_style)

        return {
            "score": style_compatibility,
            "user1_style": user1_style,
            "user2_style": user2_style,
            "compatibility": "high" if style_compatibility > 70 else "moderate" if style_compatibility > 50 else "low"
        }

    def _determine_communication_style(self, messages: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Determine communication style from messages."""
        if not messages:
            return {"type": "unknown", "traits": []}

        total_length = sum(len(m.get("content", "")) for m in messages)
        avg_length = total_length / len(messages)

        question_count = sum(1 for m in messages if "?" in m.get("content", ""))
        emoji_count = sum(len(re.findall(r'[😀-🙏]', m.get("content", ""))) for m in messages)
        exclamation_count = sum(m.get("content", "").count("!") for m in messages)

        traits = []

        # Determine style characteristics
        if avg_length > 100:
            traits.append("detailed")
            style_type = "expressive"
        elif avg_length < 30:
            traits.append("concise")
            style_type = "brief"
        else:
            traits.append("balanced")
            style_type = "balanced"

        if question_count / len(messages) > 0.3:
            traits.append("curious")

        if emoji_count / len(messages) > 1:
            traits.append("expressive")

        if exclamation_count / len(messages) > 0.5:
            traits.append("enthusiastic")

        return {
            "type": style_type,
            "traits": traits,
            "avg_message_length": round(avg_length, 1),
            "question_ratio": round(question_count / len(messages), 2),
            "emoji_usage": "high" if emoji_count / len(messages) > 2 else "moderate" if emoji_count / len(messages) > 0.5 else "low"
        }

    def _calculate_style_compatibility(
        self,
        style1: Dict[str, Any],
        style2: Dict[str, Any]
    ) -> float:
        """Calculate compatibility between communication styles."""
        score = 50.0  # Base compatibility

        # Length compatibility
        length_diff = abs(style1["avg_message_length"] - style2["avg_message_length"])
        if length_diff < 30:
            score += 25
        elif length_diff < 70:
            score += 15

        # Emoji usage compatibility
        emoji_match = style1["emoji_usage"] == style2["emoji_usage"]
        if emoji_match:
            score += 15

        # Shared traits
        shared_traits = set(style1["traits"]) & set(style2["traits"])
        score += len(shared_traits) * 5

        return min(score, 100)

    def _calculate_engagement_level(
        self,
        messages: List[Dict[str, Any]],
        user1_id: str,
        user2_id: str
    ) -> Dict[str, Any]:
        """Calculate mutual engagement level."""
        user1_messages = [m for m in messages if m.get("sender_id") == user1_id]
        user2_messages = [m for m in messages if m.get("sender_id") == user2_id]

        # Message count balance
        total_messages = len(messages)
        balance_ratio = min(len(user1_messages), len(user2_messages)) / max(len(user1_messages), len(user2_messages)) if messages else 0

        # Average message length (indicates investment)
        avg_length_1 = sum(len(m.get("content", "")) for m in user1_messages) / len(user1_messages) if user1_messages else 0
        avg_length_2 = sum(len(m.get("content", "")) for m in user2_messages) / len(user2_messages) if user2_messages else 0

        # Calculate engagement score
        engagement_score = (
            balance_ratio * 40 +  # Message balance
            min(avg_length_1, 200) / 200 * 30 +  # Message substance
            min(avg_length_2, 200) / 200 * 30  # Message substance
        )

        return {
            "score": round(engagement_score, 1),
            "level": "high" if engagement_score > 70 else "moderate" if engagement_score > 50 else "low",
            "balance_ratio": round(balance_ratio, 2),
            "mutual": balance_ratio > 0.7
        }

    def _analyze_topic_alignment(
        self,
        user1_messages: List[Dict[str, Any]],
        user2_messages: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Analyze alignment in conversation topics."""
        # Extract key topics/words from messages
        user1_words = self._extract_key_topics(user1_messages)
        user2_words = self._extract_key_topics(user2_messages)

        # Find common topics
        common_topics = set(user1_words.keys()) & set(user2_words.keys())

        # Calculate alignment score
        if not user1_words or not user2_words:
            alignment_score = 0
        else:
            alignment_score = (len(common_topics) / max(len(user1_words), len(user2_words))) * 100

        return {
            "score": round(alignment_score, 1),
            "common_topics": list(common_topics)[:10],
            "topic_diversity": len(common_topics),
            "alignment": "strong" if alignment_score > 60 else "moderate" if alignment_score > 30 else "developing"
        }

    def _extract_key_topics(self, messages: List[Dict[str, Any]]) -> Dict[str, int]:
        """Extract key topics from messages."""
        # Simple word frequency (in production, use NLP/topic modeling)
        words = []
        stopwords = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'i', 'you', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'it', 'this', 'that', 'these', 'those', 'my', 'your', 'his', 'her', 'its', 'our', 'their'}

        for message in messages:
            content = message.get("content", "").lower()
            # Simple word extraction
            message_words = re.findall(r'\b[a-z]{4,}\b', content)
            words.extend([w for w in message_words if w not in stopwords])

        # Count frequencies
        word_freq = Counter(words)
        return dict(word_freq.most_common(20))

    def _analyze_emotional_resonance(self, messages: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze emotional connection and resonance."""
        if not messages:
            return {"score": 0}

        # Count emotional indicators
        positive_words = ['love', 'great', 'awesome', 'amazing', 'wonderful', 'excited', 'happy', 'fun', 'beautiful', 'perfect']
        laughter = ['haha', 'lol', 'lmao', '😂', '😄', '😊']

        positive_count = 0
        laughter_count = 0

        for message in messages:
            content = message.get("content", "").lower()
            positive_count += sum(1 for word in positive_words if word in content)
            laughter_count += sum(1 for laugh in laughter if laugh in content)

        # Calculate resonance score
        resonance_score = min(
            (positive_count / len(messages) * 30) +
            (laughter_count / len(messages) * 40) +
            30,  # Base score
            100
        )

        return {
            "score": round(resonance_score, 1),
            "positive_indicators": positive_count,
            "shared_laughter": laughter_count,
            "level": "strong" if resonance_score > 70 else "moderate" if resonance_score > 50 else "developing"
        }

    def _analyze_conversation_depth(self, messages: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze conversation depth and substance."""
        if not messages:
            return {"score": 0}

        # Indicators of deep conversation
        question_count = sum(1 for m in messages if "?" in m.get("content", ""))
        long_message_count = sum(1 for m in messages if len(m.get("content", "")) > 100)

        personal_indicators = ['feel', 'think', 'believe', 'value', 'important', 'dream', 'goal', 'passion']
        personal_sharing_count = sum(
            1 for m in messages
            if any(word in m.get("content", "").lower() for word in personal_indicators)
        )

        # Calculate depth score
        depth_score = min(
            (question_count / len(messages) * 100 * 0.3) +
            (long_message_count / len(messages) * 100 * 0.4) +
            (personal_sharing_count / len(messages) * 100 * 0.3),
            100
        )

        return {
            "score": round(depth_score, 1),
            "questions_asked": question_count,
            "personal_sharing": personal_sharing_count,
            "substantive_messages": long_message_count,
            "level": "deep" if depth_score > 70 else "moderate" if depth_score > 50 else "surface"
        }

    def _calculate_compatibility_score(self, metrics: Dict[str, Any]) -> float:
        """Calculate overall compatibility score from all metrics."""
        weights = {
            "response_dynamics": 0.15,
            "communication_style": 0.20,
            "engagement": 0.25,
            "topics": 0.15,
            "emotional": 0.15,
            "depth": 0.10
        }

        total_score = 0.0

        for metric, weight in weights.items():
            metric_score = metrics[metric].get("score", 0)
            total_score += metric_score * weight

        return total_score

    def _get_compatibility_level(self, score: float) -> str:
        """Get compatibility level description."""
        if score >= 80:
            return "excellent"
        elif score >= 65:
            return "strong"
        elif score >= 50:
            return "good"
        elif score >= 35:
            return "moderate"
        else:
            return "developing"

    def _generate_compatibility_insights(self, metrics: Dict[str, Any]) -> List[str]:
        """Generate human-readable insights."""
        insights = []

        # Response dynamics
        if metrics["response_dynamics"]["score"] > 70:
            insights.append("You both respond promptly and maintain balanced conversation flow")

        # Communication style
        if metrics["communication_style"]["score"] > 70:
            insights.append("Your communication styles are well-aligned")

        # Engagement
        if metrics["engagement"]["score"] > 70:
            insights.append("Both of you are equally invested in the conversation")

        # Topics
        if metrics["topics"]["score"] > 50:
            insights.append(f"You've found common ground in {len(metrics['topics']['common_topics'])} shared interests")

        # Emotional
        if metrics["emotional"]["score"] > 60:
            insights.append("Strong emotional connection and positive energy")

        # Depth
        if metrics["depth"]["score"] > 60:
            insights.append("Moving beyond surface-level conversation")

        return insights if insights else ["Still getting to know each other"]

    def _identify_red_flags(
        self,
        messages: List[Dict[str, Any]],
        user1_id: str,
        user2_id: str
    ) -> List[str]:
        """Identify potential red flags in conversation."""
        red_flags = []

        user1_count = sum(1 for m in messages if m.get("sender_id") == user1_id)
        user2_count = sum(1 for m in messages if m.get("sender_id") == user2_id)

        # Imbalanced participation
        if user1_count > 0 and user2_count > 0:
            ratio = user1_count / user2_count if user2_count > 0 else float('inf')
            if ratio > 3 or ratio < 0.33:
                red_flags.append("Significantly unbalanced conversation participation")

        # Very short responses
        short_response_count = sum(1 for m in messages if len(m.get("content", "")) < 10)
        if short_response_count / len(messages) > 0.5:
            red_flags.append("Many very short, low-effort responses")

        return red_flags

    def _identify_green_flags(
        self,
        messages: List[Dict[str, Any]],
        user1_id: str,
        user2_id: str
    ) -> List[str]:
        """Identify positive indicators in conversation."""
        green_flags = []

        # Mutual questions (showing interest)
        question_count = sum(1 for m in messages if "?" in m.get("content", ""))
        if question_count / len(messages) > 0.3:
            green_flags.append("Both asking questions and showing genuine interest")

        # Shared laughter
        laughter = ['haha', 'lol', '😂', '😄']
        laughter_count = sum(
            1 for m in messages
            if any(laugh in m.get("content", "").lower() for laugh in laughter)
        )
        if laughter_count > 3:
            green_flags.append("Shared humor and laughter")

        # Planning future interaction
        future_words = ['meet', 'see', 'together', 'date', 'plans']
        if any(any(word in m.get("content", "").lower() for word in future_words) for m in messages):
            green_flags.append("Discussing future plans together")

        return green_flags

    def _generate_recommendations(self, score: float, insights: List[str]) -> List[str]:
        """Generate recommendations based on compatibility."""
        recommendations = []

        if score > 70:
            recommendations.append("Strong compatibility! Consider suggesting a video call or in-person date")
            recommendations.append("Keep building on your shared interests")
        elif score > 50:
            recommendations.append("Good foundation - try deepening conversations with more personal questions")
            recommendations.append("Share more about your values and life goals")
        else:
            recommendations.append("Take time to explore common interests")
            recommendations.append("Ask open-ended questions to learn more about each other")

        return recommendations

    def _assess_initial_interaction(self, messages: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Assess quality of initial interaction."""
        if not messages:
            return {"score": 0}

        # Check for thoughtful first messages
        first_message_quality = len(messages[0].get("content", "")) if messages else 0

        # Check for mutual engagement
        unique_senders = len(set(m.get("sender_id") for m in messages))

        # Check for questions
        questions = sum(1 for m in messages if "?" in m.get("content", ""))

        quality_score = min(
            (first_message_quality / 50 * 40) +
            (unique_senders / 2 * 30) +
            (questions / len(messages) * 30),
            100
        )

        return {
            "score": round(quality_score, 1),
            "first_message_quality": "good" if first_message_quality > 30 else "moderate" if first_message_quality > 15 else "poor",
            "mutual_engagement": unique_senders >= 2,
            "questions_asked": questions
        }

    def _assess_profile_compatibility(
        self,
        profile1: Dict[str, Any],
        profile2: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Assess compatibility based on profiles."""
        # Shared interests
        interests1 = set(profile1.get("interests", []))
        interests2 = set(profile2.get("interests", []))
        shared_interests = interests1 & interests2

        compatibility_score = len(shared_interests) / max(len(interests1), len(interests2), 1) * 100

        return {
            "score": round(compatibility_score, 1),
            "shared_interests": list(shared_interests),
            "shared_count": len(shared_interests)
        }

    def _calculate_success_probability(
        self,
        initial_quality: Dict[str, Any],
        profile_compatibility: Dict[str, Any]
    ) -> float:
        """Calculate probability of conversation success."""
        return (initial_quality["score"] * 0.6) + (profile_compatibility["score"] * 0.4)

    def _identify_success_factors(
        self,
        messages: List[Dict[str, Any]],
        profile1: Dict[str, Any],
        profile2: Dict[str, Any]
    ) -> List[str]:
        """Identify factors that increase success probability."""
        factors = []

        if len(messages) > 5:
            factors.append("Active conversation with multiple exchanges")

        interests1 = set(profile1.get("interests", []))
        interests2 = set(profile2.get("interests", []))
        if len(interests1 & interests2) > 2:
            factors.append("Multiple shared interests")

        question_count = sum(1 for m in messages if "?" in m.get("content", ""))
        if question_count > 2:
            factors.append("Both showing genuine interest through questions")

        return factors

    def _identify_risk_factors(
        self,
        messages: List[Dict[str, Any]],
        initial_quality: Dict[str, Any]
    ) -> List[str]:
        """Identify risk factors for conversation failure."""
        risks = []

        if initial_quality["score"] < 40:
            risks.append("Low-quality initial interaction")

        if len(messages) < 3:
            risks.append("Very few message exchanges")

        unique_senders = len(set(m.get("sender_id") for m in messages))
        if unique_senders < 2:
            risks.append("One-sided conversation")

        return risks

    def _get_success_prediction(self, probability: float) -> str:
        """Get success prediction category."""
        if probability > 75:
            return "very_likely"
        elif probability > 60:
            return "likely"
        elif probability > 40:
            return "possible"
        else:
            return "unlikely"

    def _get_success_recommendations(
        self,
        probability: float,
        risk_factors: List[str]
    ) -> List[str]:
        """Get recommendations to improve success probability."""
        recommendations = []

        if probability < 50:
            recommendations.append("Focus on finding common interests")
            recommendations.append("Ask more open-ended questions")

        if risk_factors:
            recommendations.append("Address conversation balance and engagement")

        recommendations.append("Move conversation beyond small talk")

        return recommendations
