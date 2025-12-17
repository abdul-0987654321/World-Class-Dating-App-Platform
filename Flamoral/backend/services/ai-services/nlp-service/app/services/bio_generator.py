"""AI Bio Generator Service for creating and improving dating profile bios."""

import asyncio
from typing import Dict, List, Optional, Any
import structlog
from transformers import pipeline, AutoTokenizer, AutoModelForSeq2SeqLM
import random

logger = structlog.get_logger()


class BioGeneratorService:
    """Service for generating and improving dating profile bios."""

    def __init__(self, settings):
        """Initialize the bio generator service."""
        self.settings = settings
        self.generator = None
        self.tokenizer = None
        self.model = None
        self.logger = logger

        # Style templates and guidelines
        self.style_templates = {
            "witty": {
                "tone": "clever, humorous, and playful",
                "examples": [
                    "Looking for someone who can appreciate my terrible puns",
                    "Professional overthinker seeking someone to overthink with",
                    "Part-time adventurer, full-time snack enthusiast"
                ]
            },
            "romantic": {
                "tone": "warm, genuine, and heartfelt",
                "examples": [
                    "Believing in the magic of genuine connections",
                    "Searching for someone to share life's beautiful moments",
                    "Hopeless romantic looking for my perfect match"
                ]
            },
            "casual": {
                "tone": "relaxed, friendly, and easygoing",
                "examples": [
                    "Just here to meet cool people",
                    "Love good conversations and great coffee",
                    "Easy-going person who enjoys life's simple pleasures"
                ]
            },
            "professional": {
                "tone": "polished, mature, and sophisticated",
                "examples": [
                    "Seeking meaningful connections with like-minded individuals",
                    "Career-focused professional looking for a balanced partnership",
                    "Accomplished individual seeking a genuine relationship"
                ]
            },
            "adventurous": {
                "tone": "energetic, bold, and exciting",
                "examples": [
                    "Always up for spontaneous adventures",
                    "Thrill-seeker looking for a partner in crime",
                    "Life's too short to play it safe"
                ]
            }
        }

    async def initialize(self):
        """Initialize models and resources."""
        try:
            self.logger.info("Initializing Bio Generator Service")

            # Use a text generation model (T5 or similar)
            model_name = "google/flan-t5-base"
            self.tokenizer = AutoTokenizer.from_pretrained(model_name)
            self.model = AutoModelForSeq2SeqLM.from_pretrained(model_name)
            self.generator = pipeline(
                "text2text-generation",
                model=self.model,
                tokenizer=self.tokenizer,
                device=-1  # CPU
            )

            self.logger.info("Bio Generator Service initialized successfully")

        except Exception as e:
            self.logger.error("Failed to initialize Bio Generator Service", error=str(e))
            raise

    async def close(self):
        """Cleanup resources."""
        self.logger.info("Closing Bio Generator Service")
        self.generator = None
        self.model = None
        self.tokenizer = None

    async def generate_bio(
        self,
        interests: List[str],
        personality_traits: List[str],
        style: str = "casual",
        age: Optional[int] = None,
        occupation: Optional[str] = None,
        additional_info: Optional[Dict[str, Any]] = None,
        max_length: int = 150
    ) -> Dict[str, Any]:
        """
        Generate a dating profile bio based on user information.

        Args:
            interests: List of user interests
            personality_traits: List of personality traits
            style: Writing style (witty, romantic, casual, professional, adventurous)
            age: User's age
            occupation: User's occupation
            additional_info: Additional user information
            max_length: Maximum bio length

        Returns:
            Dictionary with generated bio and metadata
        """
        try:
            self.logger.info("Generating bio", style=style)

            # Validate style
            if style not in self.style_templates:
                style = "casual"

            # Build prompt based on user info
            prompt = self._build_bio_prompt(
                interests, personality_traits, style, age, occupation, additional_info
            )

            # Generate bio using model
            generated_text = await self._generate_text_from_model(prompt, max_length)

            # Post-process and enhance
            bio = self._post_process_bio(generated_text, style, max_length)

            # Generate variations
            variations = await self._generate_variations(
                interests, personality_traits, style, max_length
            )

            return {
                "bio": bio,
                "style": style,
                "variations": variations[:3],  # Top 3 variations
                "word_count": len(bio.split()),
                "character_count": len(bio),
                "style_info": self.style_templates[style],
                "suggestions": self._get_improvement_suggestions(bio, interests, personality_traits)
            }

        except Exception as e:
            self.logger.error("Bio generation failed", error=str(e))
            raise

    async def improve_bio(
        self,
        current_bio: str,
        target_style: Optional[str] = None,
        enhancement_focus: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Provide suggestions to improve an existing bio.

        Args:
            current_bio: The current bio text
            target_style: Desired style for the bio
            enhancement_focus: Specific areas to improve (clarity, engagement, authenticity, etc.)

        Returns:
            Dictionary with improvement suggestions
        """
        try:
            self.logger.info("Analyzing bio for improvements")

            if enhancement_focus is None:
                enhancement_focus = ["clarity", "engagement", "authenticity"]

            # Analyze current bio
            analysis = self._analyze_bio(current_bio)

            # Generate improved version
            improved_bios = []

            if target_style:
                prompt = f"Rewrite this dating profile bio in a {target_style} style: {current_bio}"
                improved_text = await self._generate_text_from_model(prompt, 150)
                improved_bios.append({
                    "version": improved_text,
                    "style": target_style,
                    "focus": "style_transformation"
                })

            # Generate focused improvements
            for focus in enhancement_focus[:3]:
                prompt = f"Improve this dating profile bio for better {focus}: {current_bio}"
                improved_text = await self._generate_text_from_model(prompt, 150)
                improved_bios.append({
                    "version": improved_text,
                    "style": analysis.get("detected_style", "casual"),
                    "focus": focus
                })

            # Generate specific suggestions
            suggestions = self._generate_detailed_suggestions(current_bio, analysis)

            return {
                "original_bio": current_bio,
                "analysis": analysis,
                "improved_versions": improved_bios[:3],
                "suggestions": suggestions,
                "strengths": self._identify_strengths(current_bio),
                "areas_for_improvement": self._identify_improvements(current_bio, analysis)
            }

        except Exception as e:
            self.logger.error("Bio improvement failed", error=str(e))
            raise

    def _build_bio_prompt(
        self,
        interests: List[str],
        personality_traits: List[str],
        style: str,
        age: Optional[int],
        occupation: Optional[str],
        additional_info: Optional[Dict[str, Any]]
    ) -> str:
        """Build a prompt for bio generation."""

        prompt_parts = [
            f"Write a {style} dating profile bio for someone with these qualities:"
        ]

        if personality_traits:
            traits_str = ", ".join(personality_traits[:5])
            prompt_parts.append(f"Personality: {traits_str}")

        if interests:
            interests_str = ", ".join(interests[:5])
            prompt_parts.append(f"Interests: {interests_str}")

        if age:
            prompt_parts.append(f"Age: {age}")

        if occupation:
            prompt_parts.append(f"Occupation: {occupation}")

        if additional_info:
            if "relationship_goals" in additional_info:
                prompt_parts.append(f"Looking for: {additional_info['relationship_goals']}")

        prompt_parts.append(f"Style: {self.style_templates[style]['tone']}")
        prompt_parts.append("Write an engaging, authentic bio:")

        return " ".join(prompt_parts)

    async def _generate_text_from_model(self, prompt: str, max_length: int) -> str:
        """Generate text using the language model."""
        try:
            result = self.generator(
                prompt,
                max_length=max_length,
                min_length=30,
                do_sample=True,
                temperature=0.8,
                top_p=0.9,
                num_return_sequences=1
            )
            return result[0]['generated_text'].strip()

        except Exception as e:
            self.logger.warning("Model generation failed, using fallback", error=str(e))
            # Fallback to template-based generation
            return self._generate_fallback_bio(prompt)

    def _generate_fallback_bio(self, prompt: str) -> str:
        """Generate a simple bio when model fails."""
        templates = [
            "Looking to connect with someone who shares my interests and values. Let's see where this goes!",
            "Here to meet genuine people and build meaningful connections. Coffee dates are my favorite!",
            "Believer in good vibes and great conversations. Let's chat and see if we click!"
        ]
        return random.choice(templates)

    def _post_process_bio(self, text: str, style: str, max_length: int) -> str:
        """Clean and enhance the generated bio."""
        # Remove any prompt artifacts
        text = text.strip()

        # Ensure proper length
        if len(text) > max_length:
            sentences = text.split('. ')
            text = '. '.join(sentences[:3]) + '.'

        # Ensure it ends properly
        if not text.endswith(('.', '!', '?')):
            text += '.'

        # Capitalize first letter
        if text:
            text = text[0].upper() + text[1:]

        return text

    async def _generate_variations(
        self,
        interests: List[str],
        personality_traits: List[str],
        style: str,
        max_length: int
    ) -> List[str]:
        """Generate alternative bio variations."""
        variations = []

        # Try different combinations of interests/traits
        for i in range(3):
            # Shuffle interests and traits for variety
            shuffled_interests = interests.copy()
            shuffled_traits = personality_traits.copy()
            random.shuffle(shuffled_interests)
            random.shuffle(shuffled_traits)

            prompt = self._build_bio_prompt(
                shuffled_interests[:4],
                shuffled_traits[:4],
                style,
                None,
                None,
                None
            )

            variation = await self._generate_text_from_model(prompt, max_length)
            variations.append(self._post_process_bio(variation, style, max_length))

        return variations

    def _analyze_bio(self, bio: str) -> Dict[str, Any]:
        """Analyze a bio for various qualities."""
        word_count = len(bio.split())
        char_count = len(bio)
        sentence_count = len([s for s in bio.split('.') if s.strip()])

        # Detect style
        detected_style = "casual"
        for style, template in self.style_templates.items():
            if any(keyword in bio.lower() for keyword in template["tone"].split(", ")):
                detected_style = style
                break

        # Check for common issues
        issues = []
        if word_count < 10:
            issues.append("Too short - aim for 20-50 words")
        if word_count > 100:
            issues.append("Too long - keep it concise")
        if not any(char in bio for char in ['.', '!', '?']):
            issues.append("Missing proper punctuation")
        if bio.count('I ') > 5:
            issues.append("Too self-focused - balance with interests and values")

        return {
            "word_count": word_count,
            "character_count": char_count,
            "sentence_count": sentence_count,
            "detected_style": detected_style,
            "issues": issues,
            "engagement_score": self._calculate_engagement_score(bio),
            "authenticity_score": self._calculate_authenticity_score(bio),
            "clarity_score": self._calculate_clarity_score(bio)
        }

    def _calculate_engagement_score(self, bio: str) -> float:
        """Calculate how engaging the bio is."""
        score = 0.5  # Base score

        # Positive factors
        if any(char in bio for char in ['?', '!']):
            score += 0.1
        if len(bio.split()) >= 20 and len(bio.split()) <= 50:
            score += 0.2
        if any(word in bio.lower() for word in ['love', 'enjoy', 'passionate', 'looking for']):
            score += 0.1

        # Negative factors
        if bio.count(',') > 10:
            score -= 0.1
        if len(bio.split()) < 10:
            score -= 0.2

        return max(0.0, min(1.0, score))

    def _calculate_authenticity_score(self, bio: str) -> float:
        """Calculate how authentic the bio seems."""
        score = 0.6  # Base score

        # Check for generic phrases
        generic_phrases = ['love to laugh', 'live life to the fullest', 'work hard play hard']
        if any(phrase in bio.lower() for phrase in generic_phrases):
            score -= 0.2

        # Check for specific details
        if any(char.isdigit() for char in bio):
            score += 0.1

        return max(0.0, min(1.0, score))

    def _calculate_clarity_score(self, bio: str) -> float:
        """Calculate how clear and well-written the bio is."""
        score = 0.5  # Base score

        # Check sentence structure
        sentences = [s.strip() for s in bio.split('.') if s.strip()]
        if 2 <= len(sentences) <= 4:
            score += 0.2

        # Check for proper capitalization
        if bio[0].isupper():
            score += 0.1

        # Check for proper ending
        if bio.endswith(('.', '!', '?')):
            score += 0.1

        return max(0.0, min(1.0, score))

    def _get_improvement_suggestions(
        self,
        bio: str,
        interests: List[str],
        personality_traits: List[str]
    ) -> List[Dict[str, str]]:
        """Generate specific improvement suggestions."""
        suggestions = []

        # Check if interests are mentioned
        mentioned_interests = [i for i in interests if i.lower() in bio.lower()]
        if len(mentioned_interests) < min(2, len(interests)):
            suggestions.append({
                "type": "content",
                "priority": "medium",
                "suggestion": f"Consider mentioning more of your interests: {', '.join(interests[:3])}"
            })

        # Check bio length
        word_count = len(bio.split())
        if word_count < 20:
            suggestions.append({
                "type": "length",
                "priority": "high",
                "suggestion": "Your bio is quite short. Add more details about what makes you unique."
            })
        elif word_count > 80:
            suggestions.append({
                "type": "length",
                "priority": "medium",
                "suggestion": "Your bio might be a bit long. Consider being more concise."
            })

        # Check for personality
        if not any(trait.lower() in bio.lower() for trait in personality_traits):
            suggestions.append({
                "type": "personality",
                "priority": "high",
                "suggestion": "Add some personality traits to help others understand who you are."
            })

        return suggestions

    def _generate_detailed_suggestions(self, bio: str, analysis: Dict[str, Any]) -> List[Dict[str, str]]:
        """Generate detailed improvement suggestions."""
        suggestions = []

        # Based on issues found
        for issue in analysis.get("issues", []):
            suggestions.append({
                "type": "issue",
                "priority": "high",
                "suggestion": issue
            })

        # Based on scores
        if analysis.get("engagement_score", 0) < 0.6:
            suggestions.append({
                "type": "engagement",
                "priority": "high",
                "suggestion": "Make your bio more engaging by adding questions or exclamations"
            })

        if analysis.get("authenticity_score", 0) < 0.6:
            suggestions.append({
                "type": "authenticity",
                "priority": "high",
                "suggestion": "Add specific details about your life to make your bio more authentic"
            })

        if analysis.get("clarity_score", 0) < 0.6:
            suggestions.append({
                "type": "clarity",
                "priority": "medium",
                "suggestion": "Improve sentence structure and punctuation for better clarity"
            })

        return suggestions[:5]  # Return top 5 suggestions

    def _identify_strengths(self, bio: str) -> List[str]:
        """Identify strengths in the bio."""
        strengths = []

        word_count = len(bio.split())
        if 20 <= word_count <= 60:
            strengths.append("Good length - concise yet informative")

        if any(char in bio for char in ['!', '?']):
            strengths.append("Engaging punctuation that adds personality")

        if bio[0].isupper() and bio.endswith(('.', '!', '?')):
            strengths.append("Well-formatted with proper capitalization and punctuation")

        # Check for specific interests or hobbies
        interest_keywords = ['love', 'enjoy', 'passionate', 'fan of', 'into']
        if any(keyword in bio.lower() for keyword in interest_keywords):
            strengths.append("Clearly communicates interests and passions")

        return strengths[:3]  # Return top 3 strengths

    def _identify_improvements(self, bio: str, analysis: Dict[str, Any]) -> List[str]:
        """Identify areas for improvement."""
        improvements = []

        if analysis.get("engagement_score", 0) < 0.7:
            improvements.append("Increase engagement by adding hooks or questions")

        if analysis.get("authenticity_score", 0) < 0.7:
            improvements.append("Add more authentic, specific details about yourself")

        if analysis.get("clarity_score", 0) < 0.7:
            improvements.append("Improve clarity with better sentence structure")

        # Check for overused words
        words = bio.lower().split()
        if len(words) != len(set(words)):
            improvements.append("Avoid repeating words - use synonyms for variety")

        return improvements[:4]  # Return top 4 improvements
