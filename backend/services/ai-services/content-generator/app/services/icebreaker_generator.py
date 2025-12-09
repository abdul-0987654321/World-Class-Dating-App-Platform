"""Ice-breaker message generation service."""

import asyncio
from typing import Dict, List, Optional, Any
import structlog
from openai import AsyncOpenAI
import random

logger = structlog.get_logger()


class IcebreakerGeneratorService:
    """Service for generating ice-breaker messages."""

    def __init__(self, settings):
        """Initialize the ice-breaker generator service."""
        self.settings = settings
        self.client: Optional[AsyncOpenAI] = None
        self.model = getattr(settings, 'GPT_MODEL', "gpt-4-turbo-preview")

    async def initialize(self):
        """Initialize the service."""
        try:
            api_key = getattr(self.settings, 'OPENAI_API_KEY', None)
            if api_key:
                self.client = AsyncOpenAI(api_key=api_key)
            logger.info("Ice-breaker generator service initialized")
        except Exception as e:
            logger.error("Failed to initialize ice-breaker generator", error=str(e))

    async def close(self):
        """Cleanup resources."""
        if self.client:
            await self.client.close()

    async def generate_icebreakers(
        self,
        match_profile: Dict[str, Any],
        user_profile: Optional[Dict[str, Any]] = None,
        count: int = 5,
        style: str = "friendly"
    ) -> Dict[str, Any]:
        """
        Generate ice-breaker messages for a match.

        Args:
            match_profile: Match's profile data
            user_profile: Optional user's own profile
            count: Number of ice-breakers to generate
            style: Style (friendly, humorous, thoughtful, flirty, casual)

        Returns:
            Generated ice-breaker messages with metadata
        """
        try:
            if not self.client:
                return await self._generate_icebreakers_fallback(
                    match_profile,
                    count,
                    style
                )

            # Extract key information
            match_bio = match_profile.get("bio", "")
            match_interests = match_profile.get("interests", [])
            match_prompts = match_profile.get("prompts", [])

            # Build prompt
            prompt = self._build_icebreaker_prompt(
                match_bio,
                match_interests,
                match_prompts,
                user_profile,
                style
            )

            # Generate ice-breakers
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert at creating engaging, authentic first messages for dating apps. Your messages are personalized, show genuine interest, and start conversations naturally."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.8,
                max_tokens=500,
                n=1
            )

            raw_icebreakers = response.choices[0].message.content.strip()
            icebreakers = self._parse_icebreakers(raw_icebreakers, count)

            # Rank ice-breakers
            ranked_icebreakers = self._rank_icebreakers(
                icebreakers,
                match_profile
            )

            return {
                "success": True,
                "icebreakers": ranked_icebreakers[:count],
                "style": style,
                "personalization_factors": self._get_personalization_factors(
                    match_profile
                ),
                "tips": self._get_icebreaker_tips(),
                "metadata": {
                    "model": self.model,
                    "tokens_used": response.usage.total_tokens if response.usage else 0
                }
            }

        except Exception as e:
            logger.error("Ice-breaker generation failed", error=str(e))
            return {
                "success": False,
                "error": str(e),
                "fallback": await self._generate_icebreakers_fallback(
                    match_profile,
                    count,
                    style
                )
            }

    async def generate_contextual_icebreaker(
        self,
        match_profile: Dict[str, Any],
        context: str,
        user_profile: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Generate an ice-breaker based on specific context.

        Args:
            match_profile: Match's profile
            context: Specific context (e.g., "shared_interest", "recent_photo", "prompt_answer")
            user_profile: Optional user profile

        Returns:
            Contextual ice-breaker message
        """
        try:
            if not self.client:
                return await self._generate_contextual_fallback(match_profile, context)

            prompt = self._build_contextual_prompt(
                match_profile,
                context,
                user_profile
            )

            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert at creating natural, context-specific conversation starters."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.8,
                max_tokens=150,
            )

            icebreaker = response.choices[0].message.content.strip()

            return {
                "success": True,
                "icebreaker": icebreaker,
                "context": context,
                "explanation": self._explain_icebreaker(icebreaker, context)
            }

        except Exception as e:
            logger.error("Contextual ice-breaker generation failed", error=str(e))
            return {
                "success": False,
                "error": str(e),
                "fallback": await self._generate_contextual_fallback(match_profile, context)
            }

    def _build_icebreaker_prompt(
        self,
        bio: str,
        interests: List[str],
        prompts: List[Dict],
        user_profile: Optional[Dict],
        style: str
    ) -> str:
        """Build prompt for ice-breaker generation."""
        prompt = f"""Generate {style} ice-breaker messages for this dating profile:

Bio: "{bio}"
Interests: {', '.join(interests) if interests else 'Not specified'}
"""

        if prompts:
            prompt += "\nPrompt Answers:\n"
            for p in prompts[:2]:
                prompt += f"- {p.get('question', '')}: {p.get('answer', '')}\n"

        if user_profile:
            user_interests = user_profile.get("interests", [])
            shared = set(interests) & set(user_interests)
            if shared:
                prompt += f"\nShared Interests: {', '.join(shared)}\n"

        prompt += f"""\nCreate 5 unique, {style} ice-breaker messages that:
1. Reference specific details from their profile
2. Ask an open-ended question
3. Are authentic and natural (not generic)
4. Are concise (1-2 sentences)
5. Show genuine interest

Format as numbered list (1., 2., etc.)"""

        return prompt

    def _build_contextual_prompt(
        self,
        profile: Dict[str, Any],
        context: str,
        user_profile: Optional[Dict]
    ) -> str:
        """Build prompt for contextual ice-breaker."""
        context_prompts = {
            "shared_interest": f"Create an ice-breaker about the shared interest in {profile.get('interests', [''])[0] if profile.get('interests') else 'their interests'}",
            "recent_photo": f"Create an ice-breaker commenting on their recent photo showing {profile.get('photo_context', 'an activity')}",
            "prompt_answer": f"Create an ice-breaker responding to their prompt answer: {profile.get('prompts', [{}])[0].get('answer', '') if profile.get('prompts') else ''}",
            "bio_hook": f"Create an ice-breaker based on an interesting detail from their bio"
        }

        base_prompt = context_prompts.get(context, "Create an engaging ice-breaker")

        return f"""{base_prompt}

Profile Bio: {profile.get('bio', '')}
Interests: {', '.join(profile.get('interests', []))}

Create a natural, friendly message that feels personal and invites conversation."""

    def _parse_icebreakers(self, raw_text: str, count: int) -> List[str]:
        """Parse ice-breakers from GPT response."""
        # Split by numbers or newlines
        lines = raw_text.strip().split('\n')
        icebreakers = []

        for line in lines:
            # Remove numbering and clean up
            cleaned = line.strip()
            # Remove common numbering patterns
            for prefix in ['1.', '2.', '3.', '4.', '5.', '1)', '2)', '3)', '4)', '5)', '-', '•']:
                if cleaned.startswith(prefix):
                    cleaned = cleaned[len(prefix):].strip()
                    break

            if cleaned and len(cleaned) > 10:
                icebreakers.append(cleaned)

        return icebreakers[:count]

    def _rank_icebreakers(
        self,
        icebreakers: List[str],
        profile: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Rank ice-breakers by quality."""
        ranked = []

        for ice in icebreakers:
            score = self._score_icebreaker(ice, profile)
            ranked.append({
                "message": ice,
                "score": score,
                "quality": "excellent" if score > 80 else "good" if score > 60 else "fair",
                "characteristics": self._get_message_characteristics(ice)
            })

        return sorted(ranked, key=lambda x: x["score"], reverse=True)

    def _score_icebreaker(self, message: str, profile: Dict[str, Any]) -> float:
        """Score an ice-breaker message."""
        score = 50.0

        # Has question
        if "?" in message:
            score += 15

        # References profile
        bio = profile.get("bio", "").lower()
        interests = [i.lower() for i in profile.get("interests", [])]

        words = message.lower().split()
        if any(word in bio for word in words if len(word) > 4):
            score += 20

        if any(interest in message.lower() for interest in interests):
            score += 15

        # Length check (not too short, not too long)
        word_count = len(words)
        if 10 <= word_count <= 30:
            score += 10

        # Authenticity indicators
        authentic_phrases = ["noticed", "curious", "wondering", "interested", "see that"]
        if any(phrase in message.lower() for phrase in authentic_phrases):
            score += 10

        return min(score, 100)

    def _get_message_characteristics(self, message: str) -> List[str]:
        """Get characteristics of the message."""
        chars = []

        if "?" in message:
            chars.append("asks_question")

        word_count = len(message.split())
        if word_count < 15:
            chars.append("concise")
        elif word_count > 25:
            chars.append("detailed")

        if any(word in message.lower() for word in ["love", "enjoy", "passion", "excited"]):
            chars.append("enthusiastic")

        if any(word in message.lower() for word in ["noticed", "see", "curious"]):
            chars.append("observant")

        return chars

    def _get_personalization_factors(self, profile: Dict[str, Any]) -> List[str]:
        """Get factors that make messages personalized."""
        factors = []

        if profile.get("bio"):
            factors.append("Bio content available")

        if profile.get("interests"):
            factors.append(f"{len(profile['interests'])} interests to reference")

        if profile.get("prompts"):
            factors.append(f"{len(profile['prompts'])} prompts to discuss")

        return factors

    def _get_icebreaker_tips(self) -> List[str]:
        """Get tips for using ice-breakers."""
        return [
            "Personalize further by adding your own touch",
            "Reference something specific from their profile",
            "Ask open-ended questions",
            "Keep it light and friendly",
            "Show genuine interest",
            "Be yourself - authenticity matters"
        ]

    def _explain_icebreaker(self, icebreaker: str, context: str) -> str:
        """Explain why an ice-breaker works."""
        explanations = {
            "shared_interest": "References your shared interest to establish common ground",
            "recent_photo": "Shows you looked at their photos and are interested in their activities",
            "prompt_answer": "Engages directly with something they shared about themselves",
            "bio_hook": "Picks up on an interesting detail they chose to highlight"
        }

        return explanations.get(context, "Creates a natural conversation starter")

    async def _generate_icebreakers_fallback(
        self,
        profile: Dict[str, Any],
        count: int,
        style: str
    ) -> Dict[str, Any]:
        """Fallback ice-breaker generation without GPT."""
        bio = profile.get("bio", "")
        interests = profile.get("interests", [])

        templates = {
            "friendly": [
                f"Hi! I noticed you're into {interests[0] if interests else 'some interesting things'}. What got you started with that?",
                f"Hey! Your profile caught my attention. Tell me more about {interests[0] if interests else 'yourself'}!",
                "Hi there! What's your favorite way to spend a weekend?",
            ],
            "humorous": [
                f"So {interests[0] if interests else 'your interests'}... teach me your ways! Where do I start?",
                "Quick question: coffee, tea, or something stronger? (This is important for compatibility)",
            ],
            "thoughtful": [
                f"I'm curious about {interests[0] if interests else 'what drives you'}. What do you love most about it?",
                "What's something you're passionate about that might surprise people?",
            ]
        }

        style_templates = templates.get(style, templates["friendly"])
        icebreakers = random.sample(style_templates, min(count, len(style_templates)))

        return {
            "success": True,
            "icebreakers": [
                {
                    "message": ice,
                    "score": 70,
                    "quality": "good",
                    "characteristics": ["template_based"]
                }
                for ice in icebreakers
            ],
            "style": style,
            "fallback": True
        }

    async def _generate_contextual_fallback(
        self,
        profile: Dict[str, Any],
        context: str
    ) -> Dict[str, Any]:
        """Fallback contextual ice-breaker."""
        interests = profile.get("interests", [])
        interest = interests[0] if interests else "your interests"

        messages = {
            "shared_interest": f"I see we're both into {interest}! What got you interested in that?",
            "recent_photo": "Great photos! That looks like fun - tell me about it?",
            "prompt_answer": "I loved your answer! What made you think of that?",
            "bio_hook": "Your profile is interesting! I'd love to know more about you."
        }

        return {
            "success": True,
            "icebreaker": messages.get(context, messages["bio_hook"]),
            "context": context,
            "fallback": True
        }
