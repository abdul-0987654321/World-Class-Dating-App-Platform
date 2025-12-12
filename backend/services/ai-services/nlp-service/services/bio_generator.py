"""Bio and prompt suggestion generator using NLP and AI."""

import logging
from typing import Dict, Any, List, Optional
import random
import re
from openai import AsyncOpenAI
import anthropic

logger = logging.getLogger(__name__)


class BioTemplateEngine:
    """Generates bio templates based on user data."""

    TEMPLATES = {
        "adventurous": [
            "Adventure seeker who {activity1} and {activity2}. {unique_trait}",
            "{profession} by day, {hobby} enthusiast by night. Always up for {activity1}!",
            "Life's too short for boring {preference}. Let's {activity1} together!"
        ],
        "intellectual": [
            "{profession} with a passion for {interest1} and {interest2}.",
            "Deep conversations over {preference} are my jam. {unique_trait}",
            "Always learning, currently into {interest1}. {profession} who loves {hobby}."
        ],
        "creative": [
            "Creative soul who {hobby}. {unique_trait}",
            "{profession} who finds beauty in {interest1}. Love {activity1} and {preference}.",
            "Artist at heart. {hobby} and {activity1} are my creative outlets."
        ],
        "athletic": [
            "Fitness enthusiast who {activity1}. {profession} staying active and healthy.",
            "{activity1} addict. Looking for a workout buddy and adventure partner!",
            "Active lifestyle: {activity1}, {activity2}, and {preference}. {unique_trait}"
        ],
        "homebody": [
            "Netflix and {preference} > everything. {profession} who loves cozy nights in.",
            "Homebody who {hobby}. {unique_trait}",
            "Perfect date: {activity1} followed by {preference}. {profession} seeking similar vibes."
        ],
        "social": [
            "Social butterfly who loves {activity1} and meeting new people. {profession}",
            "Life of the party! {hobby} enthusiast who's always up for {activity1}.",
            "People person. {profession} who enjoys {preference} and {activity2}."
        ]
    }

    PROMPT_ANSWERS = {
        "looking_for": [
            "Someone who can match my energy and {trait1}",
            "A partner in crime for {activity} adventures",
            "Genuine connection with someone who values {value}",
            "Someone who {trait1} and {trait2}",
            "A best friend I can {activity} with"
        ],
        "ideal_date": [
            "Spontaneous {activity1} followed by {activity2}",
            "{activity1} with great conversation and {preference}",
            "Something active like {activity1}, then relaxing with {preference}",
            "Exploring {location} and trying new {preference}",
            "Low-key {activity1} where we can actually talk"
        ],
        "green_flags": [
            "Good sense of humor and {trait1}",
            "{trait1}, {trait2}, and great communication",
            "Ambition, {trait1}, and doesn't take life too seriously",
            "Emotional intelligence and {trait1}",
            "Authenticity and {trait1}"
        ],
        "pet_peeves": [
            "Poor communication and {negative_trait}",
            "{negative_trait} and lack of ambition",
            "Dishonesty and {negative_trait}",
            "Being {negative_trait} and close-minded",
            "Negativity and {negative_trait}"
        ]
    }

    @staticmethod
    def generate_from_template(
        template_type: str,
        user_data: Dict[str, Any]
    ) -> str:
        """Generate bio from template."""
        templates = BioTemplateEngine.TEMPLATES.get(template_type, BioTemplateEngine.TEMPLATES["adventurous"])
        template = random.choice(templates)

        # Fill in placeholders
        bio = template.format(
            profession=user_data.get('profession', 'Professional'),
            activity1=user_data.get('activities', ['exploring'])[0],
            activity2=user_data.get('activities', ['trying new things'])[-1] if len(user_data.get('activities', [])) > 1 else 'traveling',
            hobby=user_data.get('hobbies', ['reading'])[0] if user_data.get('hobbies') else 'reading',
            interest1=user_data.get('interests', ['learning'])[0] if user_data.get('interests') else 'learning',
            interest2=user_data.get('interests', ['growing'])[-1] if len(user_data.get('interests', [])) > 1 else 'growing',
            preference=user_data.get('preferences', ['coffee'])[0] if user_data.get('preferences') else 'good conversation',
            unique_trait=user_data.get('unique_trait', "Let's create memorable experiences together!")
        )

        return bio


class BioAnalyzer:
    """Analyzes existing bios for quality and suggestions."""

    @staticmethod
    def analyze_quality(bio: str) -> Dict[str, Any]:
        """Analyze bio quality."""
        issues = []
        suggestions = []
        score = 100

        # Length check
        if len(bio) < 50:
            issues.append("Bio too short - aim for 100-300 characters")
            score -= 20
        elif len(bio) > 500:
            issues.append("Bio too long - keep it under 300 characters")
            score -= 10

        # Cliché detection
        cliches = [
            "love to laugh", "work hard play hard", "partner in crime",
            "live life to the fullest", "no drama", "good vibes only"
        ]
        for cliche in cliches:
            if cliche.lower() in bio.lower():
                suggestions.append(f"Consider replacing '{cliche}' with something more specific")
                score -= 5

        # Negativity check
        negative_words = ["don't", "hate", "can't stand", "no", "not looking"]
        negative_count = sum(1 for word in negative_words if word in bio.lower())
        if negative_count > 2:
            issues.append("Too much negativity - focus on what you DO want")
            score -= 15

        # Specificity check
        vague_terms = ["fun", "nice", "good", "great", "awesome"]
        vague_count = sum(1 for term in vague_terms if term in bio.lower())
        if vague_count > 3:
            suggestions.append("Be more specific instead of using generic adjectives")
            score -= 10

        # Emoji check
        emoji_count = len(re.findall(r'[^\w\s,.]', bio))
        if emoji_count > 5:
            suggestions.append("Consider reducing emoji usage for better readability")
            score -= 5

        # Unique content check
        word_count = len(bio.split())
        unique_words = len(set(bio.lower().split()))
        if word_count > 10 and unique_words / word_count < 0.7:
            suggestions.append("Add more variety to your word choice")
            score -= 5

        return {
            "score": max(0, score),
            "issues": issues,
            "suggestions": suggestions,
            "stats": {
                "length": len(bio),
                "word_count": word_count,
                "unique_words": unique_words,
                "emoji_count": emoji_count
            }
        }


class BioGenerator:
    """Main service for generating bio and prompt suggestions."""

    def __init__(self, openai_api_key: Optional[str] = None, anthropic_api_key: Optional[str] = None):
        self.openai_client = AsyncOpenAI(api_key=openai_api_key) if openai_api_key else None
        self.anthropic_client = anthropic.AsyncAnthropic(api_key=anthropic_api_key) if anthropic_api_key else None
        self.template_engine = BioTemplateEngine()
        self.analyzer = BioAnalyzer()

    async def initialize(self):
        """Initialize the service."""
        logger.info("Initializing Bio Generator...")
        logger.info("Bio Generator initialized successfully")

    async def close(self):
        """Cleanup resources."""
        logger.info("Closing Bio Generator")

    async def generate_bio_suggestions(
        self,
        user_data: Dict[str, Any],
        count: int = 3,
        use_ai: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Generate bio suggestions for a user.

        Args:
            user_data: User profile data
            count: Number of suggestions to generate
            use_ai: Whether to use AI models or templates

        Returns:
            List of bio suggestions with metadata
        """
        suggestions = []

        try:
            if use_ai and self.openai_client:
                # Use AI for more personalized suggestions
                ai_suggestions = await self._generate_ai_bios(user_data, count)
                suggestions.extend(ai_suggestions)
            else:
                # Use template-based generation
                template_suggestions = await self._generate_template_bios(user_data, count)
                suggestions.extend(template_suggestions)

            # Analyze each suggestion
            for suggestion in suggestions:
                suggestion['analysis'] = self.analyzer.analyze_quality(suggestion['text'])

            # Sort by quality score
            suggestions.sort(key=lambda x: x['analysis']['score'], reverse=True)

            return suggestions[:count]

        except Exception as e:
            logger.error(f"Bio generation failed: {e}")
            raise

    async def _generate_ai_bios(
        self,
        user_data: Dict[str, Any],
        count: int
    ) -> List[Dict[str, Any]]:
        """Generate bios using AI models."""
        suggestions = []

        try:
            prompt = self._build_bio_prompt(user_data)

            response = await self.openai_client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert dating profile writer. Create engaging, authentic, and specific bios that help people stand out."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.8,
                n=count
            )

            for choice in response.choices:
                bio_text = choice.message.content.strip()
                suggestions.append({
                    "text": bio_text,
                    "type": "ai_generated",
                    "model": "gpt-4"
                })

        except Exception as e:
            logger.error(f"AI bio generation failed: {e}")

        return suggestions

    async def _generate_template_bios(
        self,
        user_data: Dict[str, Any],
        count: int
    ) -> List[Dict[str, Any]]:
        """Generate bios using templates."""
        suggestions = []

        # Determine user's personality type
        personality_type = self._infer_personality_type(user_data)

        # Generate bios from templates
        template_types = [personality_type]
        if len(self.template_engine.TEMPLATES) > 1:
            # Add variety with other template types
            other_types = [t for t in self.template_engine.TEMPLATES.keys() if t != personality_type]
            template_types.extend(random.sample(other_types, min(2, len(other_types))))

        for template_type in template_types[:count]:
            bio_text = self.template_engine.generate_from_template(template_type, user_data)
            suggestions.append({
                "text": bio_text,
                "type": "template_based",
                "template_type": template_type
            })

        return suggestions

    def _build_bio_prompt(self, user_data: Dict[str, Any]) -> str:
        """Build prompt for AI bio generation."""
        prompt_parts = [
            "Generate a dating profile bio based on this information:",
            f"- Age: {user_data.get('age', 'N/A')}",
            f"- Profession: {user_data.get('profession', 'N/A')}",
            f"- Interests: {', '.join(user_data.get('interests', []))}",
            f"- Hobbies: {', '.join(user_data.get('hobbies', []))}",
            f"- Activities: {', '.join(user_data.get('activities', []))}",
            "",
            "Requirements:",
            "- 100-250 characters",
            "- Authentic and specific (avoid clichés)",
            "- Positive and engaging",
            "- Shows personality",
            "- Conversation starter potential"
        ]

        return "\n".join(prompt_parts)

    def _infer_personality_type(self, user_data: Dict[str, Any]) -> str:
        """Infer personality type from user data."""
        activities = [a.lower() for a in user_data.get('activities', [])]
        hobbies = [h.lower() for h in user_data.get('hobbies', [])]
        interests = [i.lower() for i in user_data.get('interests', [])]

        all_terms = activities + hobbies + interests

        # Score each personality type
        scores = {
            "adventurous": sum(1 for term in all_terms if any(
                keyword in term for keyword in ['travel', 'hiking', 'adventure', 'explore', 'outdoor']
            )),
            "athletic": sum(1 for term in all_terms if any(
                keyword in term for keyword in ['gym', 'fitness', 'sport', 'running', 'yoga', 'workout']
            )),
            "intellectual": sum(1 for term in all_terms if any(
                keyword in term for keyword in ['reading', 'book', 'learn', 'science', 'art', 'museum']
            )),
            "creative": sum(1 for term in all_terms if any(
                keyword in term for keyword in ['music', 'art', 'photography', 'writing', 'design', 'creative']
            )),
            "social": sum(1 for term in all_terms if any(
                keyword in term for keyword in ['party', 'friends', 'social', 'events', 'networking']
            )),
            "homebody": sum(1 for term in all_terms if any(
                keyword in term for keyword in ['netflix', 'cooking', 'gaming', 'home', 'cozy']
            ))
        }

        # Return type with highest score, default to adventurous
        return max(scores.items(), key=lambda x: x[1])[0] if max(scores.values()) > 0 else "adventurous"

    async def generate_prompt_answers(
        self,
        user_data: Dict[str, Any],
        prompt_type: str,
        count: int = 3
    ) -> List[str]:
        """
        Generate answers for dating app prompts.

        Args:
            user_data: User profile data
            prompt_type: Type of prompt (looking_for, ideal_date, etc.)
            count: Number of answers to generate

        Returns:
            List of prompt answer suggestions
        """
        answers = []

        try:
            if prompt_type in self.template_engine.PROMPT_ANSWERS:
                templates = self.template_engine.PROMPT_ANSWERS[prompt_type]
                selected_templates = random.sample(templates, min(count, len(templates)))

                for template in selected_templates:
                    answer = template.format(
                        activity=user_data.get('activities', ['exploring'])[0],
                        activity1=user_data.get('activities', ['exploring'])[0],
                        activity2=user_data.get('activities', ['trying new things'])[-1] if len(user_data.get('activities', [])) > 1 else 'relaxing',
                        location=user_data.get('location', 'new places'),
                        preference=user_data.get('preferences', ['good food'])[0] if user_data.get('preferences') else 'good conversation',
                        trait=user_data.get('desired_traits', ['kind'])[0] if user_data.get('desired_traits') else 'authentic',
                        trait1=user_data.get('desired_traits', ['kind'])[0] if user_data.get('desired_traits') else 'kind',
                        trait2=user_data.get('desired_traits', ['honest'])[-1] if len(user_data.get('desired_traits', [])) > 1 else 'honest',
                        value=user_data.get('values', ['honesty'])[0] if user_data.get('values') else 'authenticity',
                        negative_trait='flakiness'
                    )
                    answers.append(answer)

        except Exception as e:
            logger.error(f"Prompt answer generation failed: {e}")

        return answers

    async def improve_bio(
        self,
        current_bio: str,
        user_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Analyze and improve an existing bio.

        Args:
            current_bio: Current bio text
            user_data: Optional user data for better suggestions

        Returns:
            Analysis and improvement suggestions
        """
        # Analyze current bio
        analysis = self.analyzer.analyze_quality(current_bio)

        # Generate improved version if AI available
        improved_bio = None
        if self.openai_client:
            try:
                prompt = f"""Improve this dating profile bio while maintaining the person's voice:

Current bio: "{current_bio}"

Issues to address:
{chr(10).join(f"- {issue}" for issue in analysis['issues'])}

Suggestions to incorporate:
{chr(10).join(f"- {suggestion}" for suggestion in analysis['suggestions'])}

Generate an improved version that:
- Fixes the identified issues
- Maintains authenticity
- Is engaging and specific
- 100-250 characters"""

                response = await self.openai_client.chat.completions.create(
                    model="gpt-4",
                    messages=[
                        {
                            "role": "system",
                            "content": "You are an expert dating profile editor."
                        },
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    temperature=0.7
                )

                improved_bio = response.choices[0].message.content.strip()

            except Exception as e:
                logger.error(f"Bio improvement failed: {e}")

        return {
            "original_bio": current_bio,
            "analysis": analysis,
            "improved_bio": improved_bio
        }
