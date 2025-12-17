"""Icebreaker generation service."""

import logging
import json
from typing import List, Dict, Any
from app.services.ai_provider import AIProviderService

logger = logging.getLogger(__name__)


class IcebreakerService:
    """Service for generating icebreaker messages."""

    def __init__(self, ai_provider: AIProviderService):
        """Initialize icebreaker service."""
        self.ai_provider = ai_provider

    async def generate_icebreakers(
        self,
        match_profile: Dict[str, Any],
        num_suggestions: int = 3,
        tone: str = "friendly",
    ) -> Dict[str, Any]:
        """
        Generate icebreaker messages based on match's profile.

        Args:
            match_profile: Match's profile data
            num_suggestions: Number of icebreakers to generate
            tone: Tone of the icebreakers

        Returns:
            Dictionary with icebreakers and context
        """
        try:
            # Extract profile elements
            context_elements = self._extract_context(match_profile)

            # Build prompts
            system_prompt = self._build_system_prompt(tone)
            user_prompt = self._build_user_prompt(match_profile, context_elements, num_suggestions)

            # Generate icebreakers
            response = await self.ai_provider.generate_structured_completion(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                output_format="json",
                temperature=0.8,
            )

            # Parse response
            result = json.loads(response)

            # Add confidence scores
            icebreakers = result.get("icebreakers", [])
            confidence_scores = [0.85 - (i * 0.05) for i in range(len(icebreakers))]

            return {
                "icebreakers": icebreakers,
                "context_used": context_elements,
                "confidence_scores": confidence_scores,
            }

        except Exception as e:
            logger.error(f"Failed to generate icebreakers: {e}")
            # Return fallback icebreakers
            return self._get_fallback_icebreakers(num_suggestions)

    def _extract_context(self, profile: Dict[str, Any]) -> List[str]:
        """Extract relevant context from profile."""
        context = []

        # Bio
        if profile.get("bio"):
            context.append(f"Bio: {profile['bio'][:100]}")

        # Interests
        if profile.get("interests"):
            interests = profile["interests"][:3]
            context.append(f"Interests: {', '.join(interests)}")

        # Photos context (if provided)
        if profile.get("photo_contexts"):
            for ctx in profile["photo_contexts"][:2]:
                context.append(f"Photo: {ctx}")

        # Prompts
        if profile.get("prompts"):
            for prompt in profile["prompts"][:2]:
                if prompt.get("answer"):
                    context.append(f"{prompt.get('question', 'Prompt')}: {prompt['answer']}")

        # Location
        if profile.get("location"):
            context.append(f"Location: {profile['location']}")

        # Occupation
        if profile.get("occupation"):
            context.append(f"Occupation: {profile['occupation']}")

        return context

    def _build_system_prompt(self, tone: str) -> str:
        """Build system prompt for icebreaker generation."""
        tone_descriptions = {
            "friendly": "warm, approachable, and genuinely interested",
            "playful": "fun, light-hearted, and slightly teasing",
            "witty": "clever, humorous, and intelligent",
            "sincere": "genuine, thoughtful, and emotionally open",
        }

        tone_desc = tone_descriptions.get(tone, tone_descriptions["friendly"])

        return f"""You are an expert dating coach specializing in creating engaging first messages.
Your goal is to help create icebreakers that:
- Reference specific details from the match's profile
- Show genuine interest and attention
- Are {tone_desc}
- Encourage a response and conversation
- Are authentic and not generic
- Avoid being overly forward or inappropriate
- Are concise (2-3 sentences max)

Focus on shared interests, unique profile elements, or asking engaging questions about their passions."""

    def _build_user_prompt(
        self,
        profile: Dict[str, Any],
        context_elements: List[str],
        num_suggestions: int,
    ) -> str:
        """Build user prompt for icebreaker generation."""
        name = profile.get("first_name", "they")

        context_str = "\n".join(f"- {elem}" for elem in context_elements)

        return f"""Generate {num_suggestions} unique icebreaker messages for {name} based on their profile:

{context_str}

Return a JSON object with this structure:
{{
    "icebreakers": ["message 1", "message 2", "message 3"]
}}

Each icebreaker should:
- Reference at least one specific detail from their profile
- Be personalized and show you read their profile
- Include a question or conversation starter
- Be natural and conversational
- Be 1-3 sentences long"""

    def _get_fallback_icebreakers(self, num_suggestions: int) -> Dict[str, Any]:
        """Return fallback icebreakers if AI generation fails."""
        fallbacks = [
            "I noticed we have some common interests! What's been keeping you busy lately?",
            "Your profile caught my attention! Tell me more about yourself.",
            "Hey! I'd love to get to know you better. What's something you're passionate about?",
            "Hi! Your profile seems really interesting. What's your favorite way to spend a weekend?",
            "I saw your profile and wanted to say hi! What's something fun you've done recently?",
        ]

        return {
            "icebreakers": fallbacks[:num_suggestions],
            "context_used": ["General profile"],
            "confidence_scores": [0.5] * num_suggestions,
        }
