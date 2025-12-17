"""Response suggestion service."""

import logging
import json
from typing import List, Dict, Any
from app.services.ai_provider import AIProviderService

logger = logging.getLogger(__name__)


class ResponseSuggesterService:
    """Service for generating response suggestions."""

    def __init__(self, ai_provider: AIProviderService):
        """Initialize response suggester service."""
        self.ai_provider = ai_provider

    async def generate_suggestions(
        self,
        conversation_history: List[Dict[str, Any]],
        match_profile: Dict[str, Any],
        user_profile: Dict[str, Any] = None,
        num_suggestions: int = 3,
        style: str = "balanced",
    ) -> Dict[str, Any]:
        """
        Generate response suggestions based on conversation.

        Args:
            conversation_history: Recent messages
            match_profile: Match's profile
            user_profile: User's own profile
            num_suggestions: Number of suggestions
            style: Response style

        Returns:
            Dictionary with suggestions and insights
        """
        try:
            # Analyze conversation
            conversation_analysis = self._analyze_conversation(conversation_history)

            # Build prompts
            system_prompt = self._build_system_prompt(style)
            user_prompt = self._build_user_prompt(
                conversation_history,
                match_profile,
                user_profile,
                conversation_analysis,
                num_suggestions,
            )

            # Generate suggestions
            response = await self.ai_provider.generate_structured_completion(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                output_format="json",
                temperature=0.75,
            )

            # Parse response
            result = json.loads(response)

            return {
                "suggestions": result.get("suggestions", []),
                "conversation_insights": result.get("insights", {}),
                "suggested_topics": result.get("suggested_topics", []),
                "tone_recommendations": result.get("tone", "Keep it natural and engaged"),
            }

        except Exception as e:
            logger.error(f"Failed to generate response suggestions: {e}")
            return self._get_fallback_suggestions(num_suggestions)

    def _analyze_conversation(self, history: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze conversation for context."""
        if not history:
            return {"stage": "first_message", "topics": [], "sentiment": "neutral"}

        # Get topics mentioned
        topics = set()
        for msg in history:
            text = msg.get("text", "").lower()
            # Simple keyword extraction
            if any(word in text for word in ["travel", "trip", "vacation"]):
                topics.add("travel")
            if any(word in text for word in ["food", "cook", "restaurant", "eat"]):
                topics.add("food")
            if any(word in text for word in ["music", "concert", "song", "band"]):
                topics.add("music")
            if any(word in text for word in ["movie", "film", "show", "series"]):
                topics.add("entertainment")
            if any(word in text for word in ["work", "job", "career"]):
                topics.add("work")
            if any(word in text for word in ["sport", "gym", "fitness", "exercise"]):
                topics.add("fitness")

        # Determine conversation stage
        message_count = len(history)
        if message_count <= 4:
            stage = "early"
        elif message_count <= 10:
            stage = "building_rapport"
        else:
            stage = "established"

        # Get last message for context
        last_message = history[-1].get("text", "")

        return {
            "stage": stage,
            "topics": list(topics),
            "message_count": message_count,
            "last_message": last_message,
            "sentiment": "positive",  # Simplified
        }

    def _build_system_prompt(self, style: str) -> str:
        """Build system prompt for response suggestions."""
        style_descriptions = {
            "balanced": "natural, engaging, and well-rounded",
            "playful": "fun, light, and teasing in a charming way",
            "deep": "thoughtful, meaningful, and emotionally intelligent",
            "flirty": "subtly romantic and playful without being too forward",
        }

        style_desc = style_descriptions.get(style, style_descriptions["balanced"])

        return f"""You are an expert dating coach helping someone respond to messages.
Create responses that are:
- {style_desc}
- Authentic and true to the person's communication style
- Continue the conversation naturally
- Show interest and ask engaging questions
- Reference previous conversation points
- Are not too long (2-4 sentences typically)
- Avoid generic responses

Help the user connect meaningfully while being themselves."""

    def _build_user_prompt(
        self,
        history: List[Dict[str, Any]],
        match_profile: Dict[str, Any],
        user_profile: Dict[str, Any],
        analysis: Dict[str, Any],
        num_suggestions: int,
    ) -> str:
        """Build user prompt for response suggestions."""
        # Format conversation history
        conv_str = ""
        for msg in history[-6:]:  # Last 6 messages for context
            sender = "Them" if msg.get("is_match", True) else "You"
            conv_str += f"{sender}: {msg.get('text', '')}\n"

        # Match context
        match_name = match_profile.get("first_name", "Match")
        match_interests = ", ".join(match_profile.get("interests", [])[:3])

        # User context (if available)
        user_context = ""
        if user_profile:
            user_interests = ", ".join(user_profile.get("interests", [])[:3])
            user_context = f"\nYour interests: {user_interests}"

        return f"""Help generate {num_suggestions} response suggestions for this conversation with {match_name}:

RECENT CONVERSATION:
{conv_str}

MATCH'S INTERESTS: {match_interests}
{user_context}

CONVERSATION ANALYSIS:
- Stage: {analysis['stage']}
- Topics discussed: {', '.join(analysis['topics']) if analysis['topics'] else 'None yet'}
- Their last message: "{analysis['last_message'][:150]}"

Generate {num_suggestions} different response options. Return JSON:
{{
    "suggestions": ["response 1", "response 2", "response 3"],
    "insights": {{
        "engagement_level": "high/medium/low",
        "conversation_flow": "description of how it's going"
    }},
    "suggested_topics": ["topic 1", "topic 2"],
    "tone": "recommended tone for reply"
}}

Each suggestion should:
- Respond directly to their last message
- Keep the conversation flowing
- Show personality
- Be genuine and natural"""

    def _get_fallback_suggestions(self, num_suggestions: int) -> Dict[str, Any]:
        """Return fallback suggestions if AI generation fails."""
        return {
            "suggestions": [
                "That's really interesting! Tell me more about that.",
                "I can relate to that! How did you get into it?",
                "That sounds amazing! What's been the best part about it?",
            ][:num_suggestions],
            "conversation_insights": {
                "engagement_level": "good",
                "conversation_flow": "Progressing naturally",
            },
            "suggested_topics": ["Ask about their interests", "Share a related story", "Suggest meeting up"],
            "tone_recommendations": "Stay engaged and curious",
        }
