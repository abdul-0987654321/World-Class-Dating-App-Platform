"""Smart reply generation service implementation."""

import logging
from typing import List, Dict, Any, Optional
import random

from models import SmartRepliesResponse

logger = logging.getLogger(__name__)


class SmartReplyGeneratorService:
    """Service for generating smart reply suggestions."""

    def __init__(self):
        self.reply_templates = {}

    async def initialize(self):
        """Initialize the service."""
        logger.info("Initializing Smart Reply Generator Service")
        await self._load_reply_templates()

    async def close(self):
        """Cleanup resources."""
        logger.info("Closing Smart Reply Generator Service")

    async def _load_reply_templates(self):
        """Load smart reply templates."""
        # Reply templates based on conversation context
        self.reply_templates = {
            "greeting": [
                "Hey! How's it going?",
                "Hi there! Nice to meet you!",
                "Hello! Thanks for reaching out!",
            ],
            "question": [
                "That's a great question!",
                "Good point! I think...",
                "Interesting! Let me think about that...",
            ],
            "compliment": [
                "Thank you so much!",
                "That's really kind of you to say!",
                "I appreciate that!",
            ],
            "interest": [
                "That sounds really interesting!",
                "I'd love to hear more about that!",
                "Tell me more!",
            ],
            "agreement": [
                "I totally agree!",
                "Exactly my thoughts!",
                "Couldn't have said it better!",
            ],
            "flirty": [
                "You seem really interesting 😊",
                "I'm enjoying our conversation!",
                "You have a great sense of humor!",
            ],
            "activity": [
                "That sounds like fun!",
                "I'd love to try that sometime!",
                "Count me in!",
            ],
            "generic": [
                "That's cool!",
                "Interesting!",
                "Tell me more!",
                "What do you think?",
                "How about you?",
            ]
        }

    async def generate(
        self,
        conversation_history: List[Dict[str, Any]],
        max_suggestions: int = 3
    ) -> SmartRepliesResponse:
        """
        Generate smart reply suggestions.

        Args:
            conversation_history: List of recent messages
            max_suggestions: Maximum number of suggestions to generate

        Returns:
            SmartRepliesResponse with reply suggestions
        """
        if not conversation_history:
            # Return generic greetings
            suggestions = random.sample(
                self.reply_templates["greeting"],
                min(max_suggestions, len(self.reply_templates["greeting"]))
            )
            return SmartRepliesResponse(
                suggestions=suggestions,
                context_summary="No conversation history"
            )

        # Get the last message
        last_message = conversation_history[-1]
        last_text = last_message.get("text", "").lower()

        # Analyze context
        context_type = self._analyze_context(last_text)

        # Generate suggestions based on context
        suggestions = self._generate_contextual_replies(
            context_type,
            last_text,
            max_suggestions
        )

        # Create context summary
        context_summary = f"Context: {context_type}, Messages: {len(conversation_history)}"

        return SmartRepliesResponse(
            suggestions=suggestions,
            context_summary=context_summary
        )

    def _analyze_context(self, text: str) -> str:
        """
        Analyze the context of the message.

        Args:
            text: Message text

        Returns:
            Context type
        """
        # Check for question
        if "?" in text or any(
            text.startswith(q) for q in ["what", "where", "when", "why", "how", "who", "which"]
        ):
            return "question"

        # Check for greeting
        greetings = ["hi", "hello", "hey", "good morning", "good evening"]
        if any(greeting in text for greeting in greetings):
            return "greeting"

        # Check for compliment
        compliments = ["beautiful", "handsome", "cute", "pretty", "gorgeous", "attractive"]
        if any(compliment in text for compliment in compliments):
            return "compliment"

        # Check for activity/plan
        activities = ["want to", "would you like", "let's", "shall we", "how about"]
        if any(activity in text for activity in activities):
            return "activity"

        # Check for agreement
        agreements = ["i agree", "exactly", "totally", "right", "true"]
        if any(agreement in text for agreement in agreements):
            return "agreement"

        # Check for interest/excitement
        interest_words = ["interesting", "cool", "awesome", "amazing", "wow"]
        if any(word in text for word in interest_words):
            return "interest"

        # Check for flirty content
        flirty_words = ["date", "dinner", "coffee", "meet", "see you"]
        if any(word in text for word in flirty_words):
            return "flirty"

        # Default to generic
        return "generic"

    def _generate_contextual_replies(
        self,
        context_type: str,
        message_text: str,
        max_suggestions: int
    ) -> List[str]:
        """
        Generate contextual reply suggestions.

        Args:
            context_type: Type of context
            message_text: Original message text
            max_suggestions: Maximum suggestions

        Returns:
            List of reply suggestions
        """
        # Get templates for context type
        templates = self.reply_templates.get(context_type, self.reply_templates["generic"])

        # Select random suggestions
        suggestions = random.sample(
            templates,
            min(max_suggestions, len(templates))
        )

        # Add some variety with generic responses
        if len(suggestions) < max_suggestions:
            generic = random.sample(
                self.reply_templates["generic"],
                max_suggestions - len(suggestions)
            )
            suggestions.extend(generic)

        return suggestions[:max_suggestions]
