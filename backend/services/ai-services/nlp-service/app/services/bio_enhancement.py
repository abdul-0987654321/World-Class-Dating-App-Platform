"""Bio generation and enhancement using GPT."""

import asyncio
from typing import Dict, List, Optional, Any
import openai
from openai import AsyncOpenAI
import structlog
from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import Settings

logger = structlog.get_logger()


class BioEnhancementService:
    """Service for generating and enhancing user bios using GPT."""

    def __init__(self, settings: Settings):
        """Initialize the bio enhancement service."""
        self.settings = settings
        self.client: Optional[AsyncOpenAI] = None
        self.model = settings.GPT_MODEL if hasattr(settings, 'GPT_MODEL') else "gpt-4-turbo-preview"

    async def initialize(self):
        """Initialize the OpenAI client."""
        try:
            api_key = getattr(self.settings, 'OPENAI_API_KEY', None)
            if not api_key:
                logger.warning("OpenAI API key not configured, bio enhancement will use fallback")
                return

            self.client = AsyncOpenAI(api_key=api_key)
            logger.info("Bio enhancement service initialized successfully")
        except Exception as e:
            logger.error("Failed to initialize bio enhancement service", error=str(e))
            raise

    async def close(self):
        """Cleanup resources."""
        if self.client:
            await self.client.close()

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    async def generate_bio(
        self,
        user_data: Dict[str, Any],
        tone: str = "friendly",
        max_length: int = 500
    ) -> Dict[str, Any]:
        """
        Generate a bio from user data.

        Args:
            user_data: User information (interests, occupation, values, etc.)
            tone: Desired tone (friendly, professional, humorous, romantic, adventurous)
            max_length: Maximum character length

        Returns:
            Generated bio with metadata
        """
        if not self.client:
            return await self._generate_bio_fallback(user_data, tone, max_length)

        try:
            # Build prompt from user data
            prompt = self._build_bio_generation_prompt(user_data, tone, max_length)

            # Call GPT API
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert dating profile writer who creates authentic, engaging, and attractive bios that help people make genuine connections."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.8,
                max_tokens=max_length // 2,  # Rough token estimate
                n=3,  # Generate 3 variations
            )

            # Extract generated bios
            generated_bios = [
                choice.message.content.strip()
                for choice in response.choices
            ]

            return {
                "success": True,
                "bios": generated_bios,
                "primary_bio": generated_bios[0],
                "tone": tone,
                "character_count": len(generated_bios[0]),
                "variations_count": len(generated_bios),
                "metadata": {
                    "model": self.model,
                    "tokens_used": response.usage.total_tokens if response.usage else 0
                }
            }

        except Exception as e:
            logger.error("Bio generation failed", error=str(e))
            return {
                "success": False,
                "error": str(e),
                "fallback": await self._generate_bio_fallback(user_data, tone, max_length)
            }

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    async def enhance_bio(
        self,
        current_bio: str,
        enhancement_goals: List[str],
        preserve_tone: bool = True
    ) -> Dict[str, Any]:
        """
        Enhance an existing bio.

        Args:
            current_bio: Existing bio text
            enhancement_goals: Goals like "more_engaging", "show_personality", "add_humor", "more_specific"
            preserve_tone: Whether to maintain the original tone

        Returns:
            Enhanced bio with suggestions
        """
        if not self.client:
            return await self._enhance_bio_fallback(current_bio, enhancement_goals)

        try:
            prompt = self._build_bio_enhancement_prompt(current_bio, enhancement_goals, preserve_tone)

            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert dating profile consultant who improves bios while maintaining authenticity and the user's unique voice."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.7,
                max_tokens=800,
            )

            enhanced_bio = response.choices[0].message.content.strip()

            # Analyze improvements
            improvements = await self._analyze_improvements(current_bio, enhanced_bio)

            return {
                "success": True,
                "original_bio": current_bio,
                "enhanced_bio": enhanced_bio,
                "improvements": improvements,
                "enhancement_goals": enhancement_goals,
                "metadata": {
                    "model": self.model,
                    "tokens_used": response.usage.total_tokens if response.usage else 0,
                    "character_count": len(enhanced_bio)
                }
            }

        except Exception as e:
            logger.error("Bio enhancement failed", error=str(e))
            return {
                "success": False,
                "error": str(e),
                "fallback": await self._enhance_bio_fallback(current_bio, enhancement_goals)
            }

    async def get_bio_suggestions(
        self,
        current_bio: str
    ) -> Dict[str, Any]:
        """
        Get suggestions for improving a bio without rewriting it.

        Args:
            current_bio: Current bio text

        Returns:
            Suggestions and recommendations
        """
        if not self.client:
            return self._get_bio_suggestions_fallback(current_bio)

        try:
            prompt = f"""Analyze this dating profile bio and provide specific, actionable suggestions for improvement:

Bio: "{current_bio}"

Provide:
1. Strengths (2-3 points)
2. Areas for improvement (3-4 specific suggestions)
3. Tone assessment
4. Overall score (1-10)
5. One specific example of how to improve the weakest part

Format your response as structured feedback."""

            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a professional dating profile consultant providing constructive feedback."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.5,
                max_tokens=600,
            )

            suggestions = response.choices[0].message.content.strip()

            # Parse suggestions into structured format
            structured_suggestions = self._parse_suggestions(suggestions)

            return {
                "success": True,
                "current_bio": current_bio,
                "suggestions": suggestions,
                "structured_suggestions": structured_suggestions,
                "metadata": {
                    "model": self.model,
                    "tokens_used": response.usage.total_tokens if response.usage else 0
                }
            }

        except Exception as e:
            logger.error("Failed to get bio suggestions", error=str(e))
            return {
                "success": False,
                "error": str(e),
                "fallback": self._get_bio_suggestions_fallback(current_bio)
            }

    def _build_bio_generation_prompt(
        self,
        user_data: Dict[str, Any],
        tone: str,
        max_length: int
    ) -> str:
        """Build prompt for bio generation."""
        interests = user_data.get("interests", [])
        occupation = user_data.get("occupation", "")
        hobbies = user_data.get("hobbies", [])
        values = user_data.get("values", [])
        looking_for = user_data.get("looking_for", "")
        unique_traits = user_data.get("unique_traits", [])

        prompt = f"""Create an engaging dating profile bio with a {tone} tone (max {max_length} characters).

User Information:
- Occupation: {occupation}
- Interests: {', '.join(interests) if interests else 'Not specified'}
- Hobbies: {', '.join(hobbies) if hobbies else 'Not specified'}
- Values: {', '.join(values) if values else 'Not specified'}
- Looking for: {looking_for if looking_for else 'meaningful connections'}
- Unique traits: {', '.join(unique_traits) if unique_traits else 'Not specified'}

Guidelines:
1. Be authentic and specific (avoid clichés like "love to laugh")
2. Show personality through examples, not just statements
3. Include a conversation starter or question
4. Be positive and inviting
5. Keep it concise and impactful
6. Use the {tone} tone naturally

Create a bio that stands out and attracts genuine matches."""

        return prompt

    def _build_bio_enhancement_prompt(
        self,
        current_bio: str,
        enhancement_goals: List[str],
        preserve_tone: bool
    ) -> str:
        """Build prompt for bio enhancement."""
        goals_text = "\n".join([f"- {goal.replace('_', ' ').title()}" for goal in enhancement_goals])

        tone_instruction = "Preserve the original tone and voice" if preserve_tone else "Feel free to adjust the tone if it improves the bio"

        prompt = f"""Improve this dating profile bio based on the following goals:

Current Bio:
"{current_bio}"

Enhancement Goals:
{goals_text}

Instructions:
1. {tone_instruction}
2. Keep the core personality and authenticity
3. Make it more specific and engaging
4. Remove any clichés or generic statements
5. Add concrete examples where appropriate
6. Ensure it flows naturally

Provide only the improved bio, no explanations."""

        return prompt

    async def _analyze_improvements(
        self,
        original: str,
        enhanced: str
    ) -> List[str]:
        """Analyze what was improved between original and enhanced bio."""
        improvements = []

        if len(enhanced) > len(original):
            improvements.append("Added more detail and specificity")
        if len(enhanced.split(".")) > len(original.split(".")):
            improvements.append("Improved structure and flow")
        if any(word in enhanced.lower() for word in ["because", "when", "where", "how"]):
            improvements.append("Added context and examples")

        return improvements if improvements else ["General refinement and polish"]

    def _parse_suggestions(self, suggestions_text: str) -> Dict[str, Any]:
        """Parse AI suggestions into structured format."""
        # Simple parsing - in production, use more robust parsing
        return {
            "raw_suggestions": suggestions_text,
            "parsed": True,
            "sections": {
                "strengths": [],
                "improvements": [],
                "tone": "Unknown",
                "score": 0
            }
        }

    async def _generate_bio_fallback(
        self,
        user_data: Dict[str, Any],
        tone: str,
        max_length: int
    ) -> Dict[str, Any]:
        """Fallback bio generation without GPT."""
        interests = user_data.get("interests", [])
        occupation = user_data.get("occupation", "professional")

        # Simple template-based generation
        templates = {
            "friendly": f"{occupation} who loves {', '.join(interests[:2]) if interests else 'exploring new experiences'}. Looking for genuine connections!",
            "professional": f"Accomplished {occupation} passionate about {interests[0] if interests else 'personal growth'}. Seeking meaningful relationships.",
            "humorous": f"{occupation} by day, {interests[0] if interests else 'adventurer'} by night. Let's create some stories together!",
        }

        bio = templates.get(tone, templates["friendly"])

        return {
            "success": True,
            "bios": [bio],
            "primary_bio": bio,
            "tone": tone,
            "character_count": len(bio),
            "variations_count": 1,
            "fallback": True
        }

    async def _enhance_bio_fallback(
        self,
        current_bio: str,
        enhancement_goals: List[str]
    ) -> Dict[str, Any]:
        """Fallback bio enhancement."""
        enhanced = current_bio

        # Simple enhancements
        if "more_engaging" in enhancement_goals:
            if not current_bio.endswith(("?", "!")):
                enhanced += " What's your story?"

        return {
            "success": True,
            "original_bio": current_bio,
            "enhanced_bio": enhanced,
            "improvements": ["Basic enhancements applied"],
            "fallback": True
        }

    def _get_bio_suggestions_fallback(self, current_bio: str) -> Dict[str, Any]:
        """Fallback suggestions."""
        return {
            "success": True,
            "current_bio": current_bio,
            "suggestions": "Consider adding more specific details about your interests and what makes you unique.",
            "structured_suggestions": {
                "strengths": ["Shows personality"],
                "improvements": ["Add specific examples", "Include conversation starter"],
                "score": 6
            },
            "fallback": True
        }
