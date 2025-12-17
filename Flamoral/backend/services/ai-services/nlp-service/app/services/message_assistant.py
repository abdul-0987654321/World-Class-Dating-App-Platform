"""AI Message Assistant Service for conversation support."""

import asyncio
from typing import Dict, List, Optional, Any
import structlog
from transformers import pipeline, AutoTokenizer, AutoModelForSeq2SeqLM
import random

logger = structlog.get_logger()


class MessageAssistantService:
    """Service for helping users with messaging."""

    def __init__(self, settings):
        """Initialize the message assistant service."""
        self.settings = settings
        self.generator = None
        self.tokenizer = None
        self.model = None
        self.logger = logger

        # Tone presets
        self.tone_presets = {
            "casual": {
                "description": "Relaxed, friendly, and approachable",
                "characteristics": ["relaxed", "friendly", "conversational"]
            },
            "formal": {
                "description": "Professional, polished, and respectful",
                "characteristics": ["professional", "polite", "respectful"]
            },
            "playful": {
                "description": "Fun, lighthearted, and energetic",
                "characteristics": ["fun", "energetic", "lighthearted"]
            },
            "flirty": {
                "description": "Charming, engaging, and subtly romantic",
                "characteristics": ["charming", "engaging", "warm"]
            },
            "sincere": {
                "description": "Genuine, thoughtful, and heartfelt",
                "characteristics": ["genuine", "thoughtful", "honest"]
            }
        }

    async def initialize(self):
        """Initialize models and resources."""
        try:
            self.logger.info("Initializing Message Assistant Service")

            # Use text generation model
            model_name = "google/flan-t5-base"
            self.tokenizer = AutoTokenizer.from_pretrained(model_name)
            self.model = AutoModelForSeq2SeqLM.from_pretrained(model_name)
            self.generator = pipeline(
                "text2text-generation",
                model=self.model,
                tokenizer=self.tokenizer,
                device=-1  # CPU
            )

            self.logger.info("Message Assistant Service initialized successfully")

        except Exception as e:
            self.logger.error("Failed to initialize Message Assistant Service", error=str(e))
            raise

    async def close(self):
        """Cleanup resources."""
        self.logger.info("Closing Message Assistant Service")
        self.generator = None
        self.model = None
        self.tokenizer = None

    async def generate_conversation_starters(
        self,
        recipient_profile: Dict[str, Any],
        sender_profile: Optional[Dict[str, Any]] = None,
        count: int = 3,
        tone: str = "casual"
    ) -> Dict[str, Any]:
        """
        Generate conversation starters based on match profile.

        Args:
            recipient_profile: The match's profile information
            sender_profile: The sender's profile information
            count: Number of starters to generate
            tone: Tone of the starters

        Returns:
            Dictionary with conversation starters
        """
        try:
            self.logger.info("Generating conversation starters", tone=tone)

            # Validate tone
            if tone not in self.tone_presets:
                tone = "casual"

            # Extract relevant info from recipient profile
            interests = recipient_profile.get("interests", [])
            bio = recipient_profile.get("bio", "")
            name = recipient_profile.get("name", "")

            # Generate starters
            starters = []
            context_used = []

            # Generate interest-based starters
            if interests:
                for interest in interests[:count]:
                    prompt = self._build_starter_prompt(
                        interest=interest,
                        tone=tone,
                        name=name
                    )
                    starter = await self._generate_text(prompt, 100)
                    starters.append(starter)
                    context_used.append(f"Interest: {interest}")

            # Generate bio-based starters if needed
            while len(starters) < count and bio:
                prompt = f"Generate a {tone} conversation starter based on this dating profile bio: {bio[:200]}"
                starter = await self._generate_text(prompt, 100)
                starters.append(starter)
                context_used.append("Profile bio")

            # Fill with generic starters if needed
            while len(starters) < count:
                generic_starters = self._get_generic_starters(tone)
                starters.append(random.choice(generic_starters))
                context_used.append("Generic template")

            return {
                "conversation_starters": starters[:count],
                "tone": tone,
                "context_used": context_used[:count],
                "recipient_name": name,
                "tone_info": self.tone_presets[tone]
            }

        except Exception as e:
            self.logger.error("Failed to generate conversation starters", error=str(e))
            raise

    async def generate_reply_suggestions(
        self,
        conversation_history: List[Dict[str, Any]],
        recipient_profile: Optional[Dict[str, Any]] = None,
        tone: str = "casual",
        count: int = 3
    ) -> Dict[str, Any]:
        """
        Generate reply suggestions based on conversation context.

        Args:
            conversation_history: Recent messages in the conversation
            recipient_profile: Optional recipient profile for context
            tone: Desired tone of replies
            count: Number of suggestions to generate

        Returns:
            Dictionary with reply suggestions
        """
        try:
            self.logger.info("Generating reply suggestions", tone=tone)

            # Validate tone
            if tone not in self.tone_presets:
                tone = "casual"

            # Get last few messages for context
            recent_messages = conversation_history[-5:] if len(conversation_history) > 5 else conversation_history

            # Extract last message to reply to
            last_message = recent_messages[-1] if recent_messages else None

            if not last_message:
                return {
                    "suggestions": [],
                    "tone": tone,
                    "context_summary": "No conversation history available"
                }

            # Analyze conversation context
            context_analysis = self._analyze_conversation_context(recent_messages)

            # Generate replies
            suggestions = []
            for i in range(count):
                prompt = self._build_reply_prompt(
                    last_message=last_message,
                    context=context_analysis,
                    tone=tone,
                    variation=i
                )
                reply = await self._generate_text(prompt, 100)
                suggestions.append(reply)

            return {
                "suggestions": suggestions,
                "tone": tone,
                "context_summary": context_analysis.get("summary", ""),
                "suggested_topics": context_analysis.get("topics", []),
                "conversation_sentiment": context_analysis.get("sentiment", "neutral")
            }

        except Exception as e:
            self.logger.error("Failed to generate reply suggestions", error=str(e))
            raise

    async def rewrite_message(
        self,
        original_message: str,
        target_style: str = "flirty",
        preserve_meaning: bool = True
    ) -> Dict[str, Any]:
        """
        Rewrite a message in a different style.

        Args:
            original_message: The original message text
            target_style: Desired style (flirty, romantic, casual, formal, playful)
            preserve_meaning: Whether to preserve the original meaning

        Returns:
            Dictionary with rewritten messages
        """
        try:
            self.logger.info("Rewriting message", target_style=target_style)

            # Map style to tone
            style_to_tone = {
                "flirty": "flirty",
                "romantic": "sincere",
                "casual": "casual",
                "formal": "formal",
                "playful": "playful"
            }

            tone = style_to_tone.get(target_style, "casual")

            # Generate rewritten versions
            rewrites = []

            for i in range(3):
                if preserve_meaning:
                    prompt = f"Rewrite this dating message in a {tone} tone while keeping the same meaning: {original_message}"
                else:
                    prompt = f"Rewrite this dating message in a {tone} tone: {original_message}"

                rewritten = await self._generate_text(prompt, 150)
                rewrites.append(rewritten)

            # Analyze changes
            analysis = self._analyze_rewrites(original_message, rewrites)

            return {
                "original": original_message,
                "rewrites": rewrites,
                "target_style": target_style,
                "tone": tone,
                "analysis": analysis,
                "tone_info": self.tone_presets.get(tone, {})
            }

        except Exception as e:
            self.logger.error("Failed to rewrite message", error=str(e))
            raise

    async def adjust_tone(
        self,
        message: str,
        current_tone: str,
        target_tone: str
    ) -> Dict[str, Any]:
        """
        Adjust the tone of a message.

        Args:
            message: The message to adjust
            current_tone: Current tone of the message
            target_tone: Desired tone

        Returns:
            Dictionary with tone-adjusted message
        """
        try:
            self.logger.info("Adjusting message tone", current_tone=current_tone, target_tone=target_tone)

            # Validate tones
            if target_tone not in self.tone_presets:
                target_tone = "casual"

            # Generate adjusted message
            prompt = f"Change the tone of this dating message from {current_tone} to {target_tone}: {message}"
            adjusted = await self._generate_text(prompt, 150)

            # Generate alternatives
            alternatives = []
            for i in range(2):
                alt_prompt = f"Rewrite in {target_tone} tone: {message}"
                alt = await self._generate_text(alt_prompt, 150)
                alternatives.append(alt)

            return {
                "original": message,
                "adjusted": adjusted,
                "alternatives": alternatives,
                "current_tone": current_tone,
                "target_tone": target_tone,
                "tone_info": self.tone_presets[target_tone],
                "tone_comparison": self._compare_tones(current_tone, target_tone)
            }

        except Exception as e:
            self.logger.error("Failed to adjust tone", error=str(e))
            raise

    async def analyze_message_effectiveness(
        self,
        message: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Analyze how effective a message is likely to be.

        Args:
            message: The message to analyze
            context: Optional conversation context

        Returns:
            Dictionary with effectiveness analysis
        """
        try:
            self.logger.info("Analyzing message effectiveness")

            # Analyze various aspects
            analysis = {
                "length_score": self._score_message_length(message),
                "engagement_score": self._score_engagement(message),
                "tone_analysis": self._detect_tone(message),
                "question_count": message.count("?"),
                "has_emoji": any(char for char in message if ord(char) > 127000),
                "word_count": len(message.split()),
                "character_count": len(message),
                "readability": self._score_readability(message),
                "personalization": self._score_personalization(message, context)
            }

            # Calculate overall effectiveness score
            overall_score = self._calculate_overall_score(analysis)

            # Generate suggestions
            suggestions = self._generate_effectiveness_suggestions(message, analysis)

            return {
                "message": message,
                "overall_score": overall_score,
                "analysis": analysis,
                "suggestions": suggestions,
                "strengths": self._identify_message_strengths(message, analysis),
                "improvements": self._identify_message_improvements(message, analysis)
            }

        except Exception as e:
            self.logger.error("Failed to analyze message effectiveness", error=str(e))
            raise

    def _build_starter_prompt(self, interest: str, tone: str, name: str) -> str:
        """Build a prompt for generating conversation starters."""
        tone_desc = self.tone_presets[tone]["description"]
        if name:
            return f"Generate a {tone_desc} conversation starter about {interest} for someone named {name} on a dating app:"
        return f"Generate a {tone_desc} conversation starter about {interest} for a dating app:"

    def _build_reply_prompt(
        self,
        last_message: Dict[str, Any],
        context: Dict[str, Any],
        tone: str,
        variation: int
    ) -> str:
        """Build a prompt for generating replies."""
        message_text = last_message.get("text", "")
        tone_desc = self.tone_presets[tone]["description"]

        return f"Generate a {tone_desc} reply to this dating app message: '{message_text}'"

    async def _generate_text(self, prompt: str, max_length: int) -> str:
        """Generate text using the language model."""
        try:
            result = self.generator(
                prompt,
                max_length=max_length,
                min_length=10,
                do_sample=True,
                temperature=0.8,
                top_p=0.9,
                num_return_sequences=1
            )
            return result[0]['generated_text'].strip()

        except Exception as e:
            self.logger.warning("Model generation failed, using fallback", error=str(e))
            return self._generate_fallback_message(prompt)

    def _generate_fallback_message(self, prompt: str) -> str:
        """Generate a fallback message when model fails."""
        if "conversation starter" in prompt.lower():
            starters = [
                "I noticed we both enjoy similar things! What got you into that?",
                "Your profile caught my eye! How's your day going?",
                "Hi! I'd love to hear more about your interests. What do you like to do for fun?"
            ]
            return random.choice(starters)
        else:
            replies = [
                "That's interesting! I'd love to hear more about that.",
                "Thanks for sharing! What else do you enjoy?",
                "That sounds great! Tell me more!"
            ]
            return random.choice(replies)

    def _get_generic_starters(self, tone: str) -> List[str]:
        """Get generic conversation starters for a given tone."""
        starters = {
            "casual": [
                "Hey! How's your day going?",
                "Hi! Your profile seems really cool. What do you like to do for fun?",
                "Hey there! I'd love to get to know you better."
            ],
            "formal": [
                "Hello! I found your profile quite interesting and would like to connect.",
                "Good day! I believe we might have some shared interests.",
                "Hello! I would be delighted to start a conversation with you."
            ],
            "playful": [
                "Hey there! Ready for an adventure? ;)",
                "Hi! Something tells me we're going to get along great!",
                "Hey! I have a feeling this could be the start of something fun!"
            ],
            "flirty": [
                "Hey! I couldn't resist saying hi after seeing your profile.",
                "Hi there! Your smile caught my attention. How's your day?",
                "Hey! Something about your profile made me want to reach out. How are you?"
            ],
            "sincere": [
                "Hi! I genuinely enjoyed reading your profile and would love to chat.",
                "Hello! Your profile resonated with me. I'd love to get to know you.",
                "Hi! I appreciate the thoughtfulness in your profile. Let's talk!"
            ]
        }
        return starters.get(tone, starters["casual"])

    def _analyze_conversation_context(self, messages: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze conversation context from recent messages."""
        if not messages:
            return {
                "summary": "No conversation history",
                "topics": [],
                "sentiment": "neutral"
            }

        # Extract text from messages
        texts = [msg.get("text", "") for msg in messages]
        combined_text = " ".join(texts)

        # Simple topic extraction
        common_words = ["what", "how", "when", "where", "why"]
        topics = [word for word in combined_text.lower().split() if word not in common_words and len(word) > 4]

        # Simple sentiment analysis
        positive_words = ["great", "awesome", "love", "nice", "good", "happy", "excited"]
        negative_words = ["bad", "hate", "sad", "angry", "frustrated"]

        positive_count = sum(1 for word in combined_text.lower().split() if word in positive_words)
        negative_count = sum(1 for word in combined_text.lower().split() if word in negative_words)

        if positive_count > negative_count:
            sentiment = "positive"
        elif negative_count > positive_count:
            sentiment = "negative"
        else:
            sentiment = "neutral"

        return {
            "summary": f"Conversation covering {len(messages)} messages",
            "topics": list(set(topics[:5])),
            "sentiment": sentiment,
            "message_count": len(messages)
        }

    def _analyze_rewrites(self, original: str, rewrites: List[str]) -> Dict[str, Any]:
        """Analyze the differences between original and rewritten messages."""
        original_len = len(original.split())
        avg_rewrite_len = sum(len(r.split()) for r in rewrites) / len(rewrites)

        return {
            "length_change": f"{((avg_rewrite_len - original_len) / original_len * 100):.1f}%",
            "original_word_count": original_len,
            "average_rewrite_word_count": int(avg_rewrite_len),
            "tone_shift": "Adjusted to target tone"
        }

    def _compare_tones(self, current: str, target: str) -> Dict[str, Any]:
        """Compare two tones."""
        current_info = self.tone_presets.get(current, {})
        target_info = self.tone_presets.get(target, {})

        return {
            "current_characteristics": current_info.get("characteristics", []),
            "target_characteristics": target_info.get("characteristics", []),
            "adjustment_type": f"Shifting from {current} to {target}"
        }

    def _score_message_length(self, message: str) -> float:
        """Score message based on ideal length."""
        word_count = len(message.split())

        # Ideal range: 10-40 words
        if 10 <= word_count <= 40:
            return 1.0
        elif word_count < 10:
            return word_count / 10
        else:
            return max(0.5, 1.0 - (word_count - 40) / 100)

    def _score_engagement(self, message: str) -> float:
        """Score message based on engagement factors."""
        score = 0.5  # Base score

        # Questions are engaging
        if "?" in message:
            score += 0.2

        # Exclamations show enthusiasm
        if "!" in message:
            score += 0.1

        # Emojis can be engaging
        if any(ord(char) > 127000 for char in message):
            score += 0.1

        # Personal pronouns create connection
        if any(word in message.lower() for word in ["you", "we", "us"]):
            score += 0.1

        return min(1.0, score)

    def _detect_tone(self, message: str) -> Dict[str, float]:
        """Detect the tone of a message."""
        tones = {}

        message_lower = message.lower()

        # Simple keyword-based tone detection
        casual_indicators = ["hey", "yeah", "cool", "nice"]
        formal_indicators = ["hello", "greetings", "pleased", "delighted"]
        playful_indicators = ["haha", "lol", "fun", "!", ";)"]
        flirty_indicators = ["cute", "attractive", "smile", "eyes"]
        sincere_indicators = ["appreciate", "grateful", "honest", "genuine"]

        tones["casual"] = sum(0.2 for word in casual_indicators if word in message_lower)
        tones["formal"] = sum(0.2 for word in formal_indicators if word in message_lower)
        tones["playful"] = sum(0.2 for word in playful_indicators if word in message_lower)
        tones["flirty"] = sum(0.2 for word in flirty_indicators if word in message_lower)
        tones["sincere"] = sum(0.2 for word in sincere_indicators if word in message_lower)

        # Normalize
        total = sum(tones.values()) or 1
        return {k: min(1.0, v / total) for k, v in tones.items()}

    def _score_readability(self, message: str) -> float:
        """Score message readability."""
        words = message.split()
        if not words:
            return 0.0

        # Simple readability based on average word length
        avg_word_length = sum(len(word) for word in words) / len(words)

        # Ideal: 4-6 characters per word
        if 4 <= avg_word_length <= 6:
            return 1.0
        elif avg_word_length < 4:
            return 0.8
        else:
            return max(0.5, 1.0 - (avg_word_length - 6) / 10)

    def _score_personalization(self, message: str, context: Optional[Dict[str, Any]]) -> float:
        """Score how personalized the message is."""
        score = 0.5  # Base score

        # Using "you" makes it personal
        if "you" in message.lower():
            score += 0.2

        # Using context adds personalization
        if context:
            score += 0.2

        # Avoiding generic phrases
        generic_phrases = ["how are you", "what's up", "hey there"]
        if not any(phrase in message.lower() for phrase in generic_phrases):
            score += 0.1

        return min(1.0, score)

    def _calculate_overall_score(self, analysis: Dict[str, Any]) -> float:
        """Calculate overall effectiveness score."""
        scores = [
            analysis.get("length_score", 0.5),
            analysis.get("engagement_score", 0.5),
            analysis.get("readability", 0.5),
            analysis.get("personalization", 0.5)
        ]
        return sum(scores) / len(scores)

    def _generate_effectiveness_suggestions(self, message: str, analysis: Dict[str, Any]) -> List[str]:
        """Generate suggestions to improve message effectiveness."""
        suggestions = []

        if analysis.get("length_score", 1.0) < 0.7:
            word_count = analysis.get("word_count", 0)
            if word_count < 10:
                suggestions.append("Add more details to make your message more engaging")
            else:
                suggestions.append("Consider shortening your message for better impact")

        if analysis.get("engagement_score", 1.0) < 0.7:
            suggestions.append("Add a question to encourage a response")

        if analysis.get("question_count", 0) == 0:
            suggestions.append("Include a question to keep the conversation flowing")

        if not analysis.get("has_emoji", False):
            suggestions.append("Consider adding an emoji to add warmth")

        if analysis.get("personalization", 1.0) < 0.7:
            suggestions.append("Make your message more personal by referencing their profile")

        return suggestions[:5]

    def _identify_message_strengths(self, message: str, analysis: Dict[str, Any]) -> List[str]:
        """Identify strengths in the message."""
        strengths = []

        if analysis.get("length_score", 0) >= 0.8:
            strengths.append("Good message length")

        if analysis.get("engagement_score", 0) >= 0.8:
            strengths.append("Highly engaging content")

        if analysis.get("question_count", 0) > 0:
            strengths.append("Includes questions to encourage dialogue")

        if analysis.get("readability", 0) >= 0.8:
            strengths.append("Easy to read and understand")

        if analysis.get("personalization", 0) >= 0.8:
            strengths.append("Well-personalized message")

        return strengths[:5]

    def _identify_message_improvements(self, message: str, analysis: Dict[str, Any]) -> List[str]:
        """Identify areas for improvement."""
        improvements = []

        if analysis.get("length_score", 1.0) < 0.6:
            improvements.append("Adjust message length")

        if analysis.get("engagement_score", 1.0) < 0.6:
            improvements.append("Make content more engaging")

        if analysis.get("personalization", 1.0) < 0.6:
            improvements.append("Add more personal touches")

        if analysis.get("readability", 1.0) < 0.6:
            improvements.append("Simplify language for better readability")

        return improvements[:4]
