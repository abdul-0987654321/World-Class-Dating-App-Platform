"""Date idea generation service."""

import logging
import json
from typing import List, Dict, Any
from app.services.ai_provider import AIProviderService

logger = logging.getLogger(__name__)


class DateIdeaGeneratorService:
    """Service for generating personalized date ideas."""

    def __init__(self, ai_provider: AIProviderService):
        """Initialize date idea generator service."""
        self.ai_provider = ai_provider

    async def generate_date_ideas(
        self,
        match_profile: Dict[str, Any],
        user_profile: Dict[str, Any],
        location: str = None,
        budget: str = "moderate",
        date_type: str = "first",
        num_suggestions: int = 3,
    ) -> Dict[str, Any]:
        """
        Generate personalized date ideas.

        Args:
            match_profile: Match's profile
            user_profile: User's profile
            location: City or location
            budget: Budget level
            date_type: Type of date
            num_suggestions: Number of ideas

        Returns:
            Dictionary with date ideas and compatibility notes
        """
        try:
            # Find shared interests
            shared_interests = self._find_shared_interests(user_profile, match_profile)

            # Build prompts
            system_prompt = self._build_system_prompt(date_type, budget)
            user_prompt = self._build_user_prompt(
                user_profile,
                match_profile,
                shared_interests,
                location,
                num_suggestions,
            )

            # Generate date ideas
            response = await self.ai_provider.generate_structured_completion(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                output_format="json",
                temperature=0.75,
            )

            # Parse response
            result = json.loads(response)

            return {
                "date_ideas": result.get("date_ideas", []),
                "shared_interests": shared_interests,
                "compatibility_notes": result.get("compatibility_notes", ""),
            }

        except Exception as e:
            logger.error(f"Failed to generate date ideas: {e}")
            return self._get_fallback_date_ideas(num_suggestions, budget)

    def _find_shared_interests(
        self,
        user_profile: Dict[str, Any],
        match_profile: Dict[str, Any],
    ) -> List[str]:
        """Find shared interests between profiles."""
        user_interests = set(user_profile.get("interests", []))
        match_interests = set(match_profile.get("interests", []))

        shared = list(user_interests.intersection(match_interests))

        # Also check for related interests
        interest_groups = {
            "outdoor": {"hiking", "camping", "nature", "outdoors", "travel"},
            "food": {"cooking", "food", "restaurants", "wine", "coffee"},
            "fitness": {"gym", "fitness", "sports", "yoga", "running"},
            "arts": {"art", "museums", "photography", "painting", "music"},
            "entertainment": {"movies", "concerts", "theater", "comedy", "music"},
        }

        for group_name, keywords in interest_groups.items():
            if any(i.lower() in keywords for i in user_interests) and \
               any(i.lower() in keywords for i in match_interests):
                if group_name not in shared:
                    shared.append(group_name)

        return shared

    def _build_system_prompt(self, date_type: str, budget: str) -> str:
        """Build system prompt for date idea generation."""
        date_type_context = {
            "first": "a first date - focus on low pressure, conversation-friendly settings",
            "second": "a second date - can be more creative and show personality",
            "casual": "a casual hangout - relaxed and fun",
            "special": "a special occasion - memorable and romantic",
        }

        budget_context = {
            "low": "budget-friendly options under $30",
            "moderate": "moderate budget ($30-$100)",
            "high": "upscale experiences",
            "any": "any budget level",
        }

        context = date_type_context.get(date_type, date_type_context["first"])
        budget_desc = budget_context.get(budget, budget_context["moderate"])

        return f"""You are an expert dating consultant specializing in planning memorable dates.

This is for {context}.
Budget: {budget_desc}

Create date ideas that:
- Are personalized to both people's interests
- Create opportunities for connection and conversation
- Are appropriate for the relationship stage
- Consider the budget
- Have clear activity descriptions
- Include conversation starters
- Have backup plans for weather/availability issues

Be creative, thoughtful, and practical."""

    def _build_user_prompt(
        self,
        user_profile: Dict[str, Any],
        match_profile: Dict[str, Any],
        shared_interests: List[str],
        location: str,
        num_suggestions: int,
    ) -> str:
        """Build user prompt for date idea generation."""
        # Profile summaries
        user_interests = ", ".join(user_profile.get("interests", [])[:5])
        match_interests = ", ".join(match_profile.get("interests", [])[:5])
        match_name = match_profile.get("first_name", "your match")

        location_str = f" in {location}" if location else ""

        shared_str = ", ".join(shared_interests) if shared_interests else "None identified yet"

        return f"""Generate {num_suggestions} personalized date ideas{location_str}:

YOUR INTERESTS: {user_interests}

{match_name.upper()}'S INTERESTS: {match_interests}

SHARED INTERESTS: {shared_str}

Return JSON:
{{
    "date_ideas": [
        {{
            "title": "Date idea name",
            "description": "Detailed description of the date",
            "reasoning": "Why this works for both of you",
            "estimated_cost": "Cost estimate",
            "duration": "How long it will take",
            "conversation_starters": ["topic 1", "topic 2", "topic 3"],
            "backup_plan": "Alternative if main plan doesn't work"
        }}
    ],
    "compatibility_notes": "Brief note about compatibility"
}}

For each date idea:
- Be specific about the activity and venue type
- Explain why it suits both people
- Include 3 conversation starters related to the activity
- Suggest a backup plan
- Consider creating a memorable experience"""

    def _get_fallback_date_ideas(self, num_suggestions: int, budget: str) -> Dict[str, Any]:
        """Return fallback date ideas if AI generation fails."""
        ideas = [
            {
                "title": "Coffee Shop Chat",
                "description": "Meet at a cozy coffee shop for conversation and getting to know each other",
                "reasoning": "Low pressure, easy to extend if going well",
                "estimated_cost": "$10-20",
                "duration": "1-2 hours",
                "conversation_starters": [
                    "What's your go-to coffee order?",
                    "What's been the highlight of your week?",
                    "Any fun plans coming up?",
                ],
                "backup_plan": "If coffee shop is too crowded, take a walk in a nearby park",
            },
            {
                "title": "Local Museum or Gallery",
                "description": "Explore a museum or art gallery together",
                "reasoning": "Built-in conversation topics, shows cultural interests",
                "estimated_cost": "$20-40",
                "duration": "2-3 hours",
                "conversation_starters": [
                    "What kind of art do you usually enjoy?",
                    "Have you been to any interesting exhibits recently?",
                    "What caught your eye here?",
                ],
                "backup_plan": "Grab lunch or coffee nearby to continue the conversation",
            },
            {
                "title": "Food Market or Food Trucks",
                "description": "Visit a local food market or food truck area",
                "reasoning": "Casual, lots to talk about, easy to share different foods",
                "estimated_cost": "$25-50",
                "duration": "2-3 hours",
                "conversation_starters": [
                    "What's your favorite type of cuisine?",
                    "Have you tried anything new lately?",
                    "Do you like to cook?",
                ],
                "backup_plan": "If weather is bad, visit a food hall or indoor market",
            },
        ]

        return {
            "date_ideas": ideas[:num_suggestions],
            "shared_interests": [],
            "compatibility_notes": "These are versatile date ideas that work for most people",
        }
