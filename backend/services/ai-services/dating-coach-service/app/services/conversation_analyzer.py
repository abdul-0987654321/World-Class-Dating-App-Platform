"""Conversation analysis service."""

import logging
import json
from typing import List, Dict, Any
from datetime import datetime
from app.services.ai_provider import AIProviderService

logger = logging.getLogger(__name__)


class ConversationAnalyzerService:
    """Service for analyzing conversation flow and dynamics."""

    def __init__(self, ai_provider: AIProviderService):
        """Initialize conversation analyzer service."""
        self.ai_provider = ai_provider

    async def analyze_conversation(
        self,
        conversation_history: List[Dict[str, Any]],
        match_profile: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Analyze conversation and provide insights.

        Args:
            conversation_history: Full conversation history
            match_profile: Match's profile data

        Returns:
            Dictionary with metrics, insights, and recommendations
        """
        try:
            # Calculate basic metrics
            metrics = self._calculate_metrics(conversation_history)

            # Build prompts for AI analysis
            system_prompt = self._build_system_prompt()
            user_prompt = self._build_user_prompt(conversation_history, match_profile, metrics)

            # Get AI insights
            response = await self.ai_provider.generate_structured_completion(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                output_format="json",
                temperature=0.6,
            )

            # Parse response
            result = json.loads(response)

            return {
                "metrics": {
                    **metrics,
                    "emoji_usage": self._count_emojis(conversation_history),
                },
                "insights": result.get("insights", []),
                "recommendations": result.get("recommendations", []),
                "red_flags": result.get("red_flags", []),
                "green_flags": result.get("green_flags", []),
                "next_steps": result.get("next_steps", []),
                "interest_level": result.get("interest_level", "uncertain"),
            }

        except Exception as e:
            logger.error(f"Failed to analyze conversation: {e}")
            return self._get_fallback_analysis(conversation_history)

    def _calculate_metrics(self, history: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculate quantitative conversation metrics."""
        if not history:
            return {
                "engagement_level": "none",
                "response_rate": 0.0,
                "avg_response_time": None,
                "sentiment_trend": "neutral",
                "conversation_balance": 0.5,
            }

        # Count messages by sender
        user_messages = [m for m in history if not m.get("is_match", False)]
        match_messages = [m for m in history if m.get("is_match", False)]

        total_messages = len(history)
        user_count = len(user_messages)
        match_count = len(match_messages)

        # Response rate (simplified)
        response_rate = match_count / max(user_count, 1)

        # Conversation balance (0.5 is perfect balance)
        if total_messages > 0:
            user_ratio = user_count / total_messages
            balance = 1 - abs(0.5 - user_ratio)
        else:
            balance = 0.5

        # Engagement level based on metrics
        if response_rate > 0.9 and balance > 0.7:
            engagement = "high"
        elif response_rate > 0.6 and balance > 0.5:
            engagement = "medium"
        else:
            engagement = "low"

        # Average response time (if timestamps available)
        avg_response_time = None
        try:
            response_times = []
            for i in range(1, len(history)):
                if history[i].get("timestamp") and history[i-1].get("timestamp"):
                    time_diff = history[i]["timestamp"] - history[i-1]["timestamp"]
                    if history[i].get("is_match") != history[i-1].get("is_match"):
                        response_times.append(time_diff)

            if response_times:
                avg_seconds = sum(response_times) / len(response_times)
                if avg_seconds < 300:  # 5 minutes
                    avg_response_time = "Very quick (under 5 min)"
                elif avg_seconds < 3600:  # 1 hour
                    avg_response_time = f"Quick ({int(avg_seconds / 60)} min)"
                elif avg_seconds < 86400:  # 1 day
                    avg_response_time = f"Same day ({int(avg_seconds / 3600)} hours)"
                else:
                    avg_response_time = f"{int(avg_seconds / 86400)} days"
        except Exception as e:
            logger.warning(f"Could not calculate response time: {e}")

        # Sentiment trend (simplified)
        recent_messages = history[-5:]
        positive_indicators = ["!", "haha", "lol", "😊", "😄", "❤️", "love", "great", "amazing"]
        negative_indicators = ["...", "ok", "sure", "whatever", "idk"]

        positive_count = sum(
            1 for msg in recent_messages
            if any(ind in msg.get("text", "").lower() for ind in positive_indicators)
        )
        negative_count = sum(
            1 for msg in recent_messages
            if any(ind in msg.get("text", "").lower() for ind in negative_indicators)
        )

        if positive_count > negative_count:
            sentiment = "positive"
        elif negative_count > positive_count:
            sentiment = "negative"
        else:
            sentiment = "neutral"

        return {
            "engagement_level": engagement,
            "response_rate": round(response_rate, 2),
            "avg_response_time": avg_response_time,
            "sentiment_trend": sentiment,
            "conversation_balance": round(balance, 2),
        }

    def _count_emojis(self, history: List[Dict[str, Any]]) -> Dict[str, int]:
        """Count emoji usage in conversation."""
        emoji_count = {"user": 0, "match": 0}

        for msg in history:
            text = msg.get("text", "")
            # Simple emoji detection (can be enhanced)
            emoji_chars = sum(1 for char in text if ord(char) > 127000)

            if msg.get("is_match", False):
                emoji_count["match"] += emoji_chars
            else:
                emoji_count["user"] += emoji_chars

        return emoji_count

    def _build_system_prompt(self) -> str:
        """Build system prompt for conversation analysis."""
        return """You are an expert dating coach analyzing conversation dynamics.

Provide insights about:
1. INSIGHTS: Key observations about the conversation flow and chemistry
2. RECOMMENDATIONS: Specific actionable advice for improving the conversation
3. RED FLAGS: Warning signs or concerning patterns (if any)
4. GREEN FLAGS: Positive indicators of interest and compatibility
5. NEXT STEPS: What to do next to progress the relationship
6. INTEREST LEVEL: Estimate match's interest (high/medium/low/uncertain)

Be honest, specific, and constructive. Focus on actionable advice."""

    def _build_user_prompt(
        self,
        history: List[Dict[str, Any]],
        match_profile: Dict[str, Any],
        metrics: Dict[str, Any],
    ) -> str:
        """Build user prompt for conversation analysis."""
        # Format recent conversation
        conv_str = ""
        for msg in history[-20:]:  # Last 20 messages
            sender = "Match" if msg.get("is_match", False) else "You"
            conv_str += f"{sender}: {msg.get('text', '')}\n"

        match_name = match_profile.get("first_name", "Match")

        return f"""Analyze this conversation with {match_name}:

CONVERSATION ({len(history)} total messages):
{conv_str}

METRICS:
- Engagement: {metrics['engagement_level']}
- Response rate: {metrics['response_rate']:.0%}
- Balance: {metrics['conversation_balance']:.0%}
- Sentiment: {metrics['sentiment_trend']}
- Avg response time: {metrics.get('avg_response_time', 'Unknown')}

MATCH'S PROFILE:
- Interests: {', '.join(match_profile.get('interests', [])[:5])}
- Bio: {match_profile.get('bio', 'N/A')[:100]}

Return JSON:
{{
    "insights": ["insight 1", "insight 2", "insight 3"],
    "recommendations": ["specific action 1", "specific action 2"],
    "red_flags": ["red flag if any"],
    "green_flags": ["positive sign 1", "positive sign 2"],
    "next_steps": ["next step 1", "next step 2"],
    "interest_level": "high/medium/low/uncertain"
}}

Analyze:
- Quality of conversation topics
- Mutual engagement and enthusiasm
- Question-asking and interest shown
- Flirting or romantic interest
- Readiness to meet in person
- Any concerning patterns"""

    def _get_fallback_analysis(self, history: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Return fallback analysis if AI analysis fails."""
        metrics = self._calculate_metrics(history)

        insights = ["The conversation is ongoing"]
        recommendations = ["Keep asking open-ended questions", "Share about yourself authentically"]
        green_flags = []
        red_flags = []

        if metrics["engagement_level"] == "high":
            green_flags.append("Strong mutual engagement")
        elif metrics["engagement_level"] == "low":
            recommendations.append("Try to engage more with their responses")

        if len(history) > 10:
            insights.append("You've built some conversation history")
            if metrics["engagement_level"] in ["high", "medium"]:
                recommendations.append("Consider suggesting a date or phone call")

        return {
            "metrics": {
                **metrics,
                "emoji_usage": self._count_emojis(history),
            },
            "insights": insights,
            "recommendations": recommendations,
            "red_flags": red_flags,
            "green_flags": green_flags,
            "next_steps": ["Continue the conversation", "Look for opportunities to meet"],
            "interest_level": metrics["engagement_level"],
        }
