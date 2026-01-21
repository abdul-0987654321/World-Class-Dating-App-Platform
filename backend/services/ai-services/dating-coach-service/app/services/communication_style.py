"""
Communication Style Matcher Service

NLP-based communication compatibility analysis that analyzes how users communicate
(formal/casual, emoji usage, message length, humor style) to improve matching.

Features:
- Analyze communication style from message history
- Calculate style compatibility between two users
- Generate adaptation tips for better communication
- Detect style evolution over time
- Predict potential communication friction points
"""

import logging
import json
import re
import math
from typing import List, Dict, Any, Optional, Tuple
from collections import Counter
from datetime import datetime
from dataclasses import dataclass

from app.services.ai_provider import AIProviderService

logger = logging.getLogger(__name__)


# Common slang terms and internet speak patterns
SLANG_PATTERNS = {
    "lol", "lmao", "rofl", "omg", "omfg", "wtf", "wth", "idk", "ikr", "tbh",
    "ngl", "imo", "imho", "btw", "fyi", "brb", "ttyl", "afk", "smh", "fomo",
    "yolo", "bae", "fam", "lit", "slay", "vibe", "lowkey", "highkey", "sus",
    "goat", "flex", "salty", "ghosting", "chill", "dope", "fire", "cap",
    "no cap", "bussin", "bet", "deadass", "periodt", "stan", "simp", "rn",
    "fr", "ong", "wbu", "hbu", "u", "ur", "r", "y", "bc", "cuz", "tho",
    "gonna", "wanna", "gotta", "kinda", "sorta", "prolly", "ppl", "w/",
    "w/o", "b4", "2day", "2nite", "gr8", "l8r", "thx", "plz", "msg"
}

# Formal language indicators
FORMAL_INDICATORS = {
    "furthermore", "however", "therefore", "moreover", "nevertheless",
    "consequently", "additionally", "subsequently", "accordingly",
    "regarding", "concerning", "pertaining", "appreciate", "sincerely",
    "respectfully", "kindly", "would you", "could you", "please",
    "thank you", "pardon", "excuse me", "i apologize", "i appreciate"
}

# Humor indicators by type
HUMOR_INDICATORS = {
    "witty": ["clever", "actually", "technically", "ironically", "paradoxically", "pun", "wordplay"],
    "playful": ["haha", "hehe", "lol", "lmao", "jk", "kidding", "teasing", ":p", ":d", "xd"],
    "sarcastic": ["sure", "obviously", "totally", "right...", "oh great", "wow", "shocking", "/s"],
    "wholesome": ["aww", "cute", "sweet", "lovely", "wonderful", "blessed", "grateful", "kind"],
}

# Positive sentiment words
POSITIVE_WORDS = {
    "love", "great", "amazing", "wonderful", "fantastic", "awesome", "excellent",
    "happy", "excited", "thrilled", "joy", "delighted", "pleased", "glad",
    "beautiful", "gorgeous", "stunning", "incredible", "perfect", "brilliant",
    "fun", "enjoy", "like", "adore", "appreciate", "grateful", "thankful"
}

# Negative sentiment words
NEGATIVE_WORDS = {
    "hate", "terrible", "awful", "horrible", "bad", "worst", "angry",
    "sad", "upset", "disappointed", "frustrated", "annoyed", "irritated",
    "boring", "dull", "ugly", "stupid", "dumb", "lame", "sucks",
    "unfortunately", "sadly", "regret", "sorry", "problem", "issue"
}

# Emotional depth indicators
EMOTIONAL_DEPTH_WORDS = {
    "feel", "feeling", "felt", "emotion", "emotional", "deeply", "truly",
    "honestly", "sincerely", "genuine", "authentic", "vulnerable", "open",
    "scared", "afraid", "anxious", "worried", "hopeful", "dream", "wish",
    "believe", "trust", "care", "matter", "important", "meaningful",
    "connection", "bond", "relationship", "understand", "empathy"
}


@dataclass
class StyleDimensions:
    """Raw style dimension scores before normalization."""
    formality: float
    expressiveness: float
    verbosity: float
    humor_frequency: float
    question_frequency: float
    vocabulary_richness: float
    slang_usage: float
    positivity: float
    emotional_depth: float
    avg_message_length: float


class CommunicationStyleService:
    """Service for analyzing and comparing communication styles."""

    def __init__(self, ai_provider: AIProviderService):
        """Initialize communication style service."""
        self.ai_provider = ai_provider

    async def analyze_style(
        self,
        messages: List[Dict[str, Any]],
        include_evolution: bool = False
    ) -> Dict[str, Any]:
        """
        Analyze communication style from a list of messages.

        Args:
            messages: List of message dictionaries with 'text' field
            include_evolution: Whether to analyze style evolution over time

        Returns:
            Complete communication style profile
        """
        if not messages:
            return self._get_empty_style_response()

        try:
            # Extract text content from messages
            texts = [m.get("text", "") for m in messages if m.get("text")]

            if not texts:
                return self._get_empty_style_response()

            # Calculate raw style dimensions
            dimensions = self._calculate_dimensions(texts, messages)

            # Detect humor style
            humor_style = self._detect_humor_style(texts)

            # Detect response pattern
            response_pattern = self._detect_response_pattern(messages)

            # Detect topic behavior
            topic_behavior = self._detect_topic_behavior(messages)

            # Calculate confidence based on sample size
            confidence = self._calculate_confidence(len(texts))

            # Build the communication style object
            style = {
                "formality": round(dimensions.formality, 1),
                "expressiveness": round(dimensions.expressiveness, 1),
                "verbosity": round(dimensions.verbosity, 1),
                "humor_style": humor_style,
                "humor_frequency": round(dimensions.humor_frequency, 1),
                "question_frequency": round(dimensions.question_frequency, 1),
                "response_pattern": response_pattern,
                "topic_behavior": topic_behavior,
                "vocabulary_richness": round(dimensions.vocabulary_richness, 1),
                "slang_usage": round(dimensions.slang_usage, 1),
                "positivity": round(dimensions.positivity, 1),
                "emotional_depth": round(dimensions.emotional_depth, 1),
                "avg_message_length": round(dimensions.avg_message_length, 1),
                "messages_analyzed": len(texts),
                "confidence_score": round(confidence, 2),
            }

            # Generate style summary using AI
            summary = await self._generate_style_summary(style)

            # Identify strengths and growth areas
            strengths, growth_areas = self._identify_strengths_and_growth(style)

            response = {
                "user_style": style,
                "style_summary": summary,
                "strengths": strengths,
                "growth_areas": growth_areas,
            }

            # Add style evolution if requested
            if include_evolution and len(messages) >= 20:
                evolution = self._analyze_evolution(messages)
                response["style_evolution"] = evolution

            return response

        except Exception as e:
            logger.error(f"Failed to analyze communication style: {e}", exc_info=True)
            return self._get_fallback_style_response(messages)

    async def calculate_style_compatibility(
        self,
        style1: Dict[str, Any],
        style2: Dict[str, Any],
        generate_tips: bool = True
    ) -> Dict[str, Any]:
        """
        Calculate compatibility score between two communication styles.

        Args:
            style1: First user's communication style
            style2: Second user's communication style
            generate_tips: Whether to generate adaptation tips

        Returns:
            Compatibility analysis with score, match areas, friction points, and tips
        """
        try:
            # Calculate individual dimension compatibility
            dimension_scores = {}
            match_areas = []
            friction_points = []

            # Define dimension weights for overall score
            dimension_weights = {
                "formality": 0.15,  # Similar formality is important
                "expressiveness": 0.10,  # Complementary can work
                "verbosity": 0.12,  # Very different can cause friction
                "humor_frequency": 0.08,
                "question_frequency": 0.08,
                "vocabulary_richness": 0.07,
                "slang_usage": 0.08,
                "positivity": 0.12,  # Similar positivity helps
                "emotional_depth": 0.10,
            }

            # Calculate compatibility for each dimension
            for dim, weight in dimension_weights.items():
                val1 = style1.get(dim, 50)
                val2 = style2.get(dim, 50)

                # Calculate difference
                diff = abs(val1 - val2)

                # Special handling for expressiveness (complementary can work)
                if dim == "expressiveness":
                    # Less expressive + more expressive can balance well
                    compat = 100 - (diff * 0.5)  # Reduced penalty for difference
                else:
                    # For most dimensions, similarity is good
                    compat = 100 - diff

                compat = max(0, min(100, compat))

                dimension_scores[dim] = {
                    "user": val1,
                    "match": val2,
                    "difference": diff,
                    "compatibility": compat,
                }

                # Categorize as match area or friction point
                if compat >= 75:
                    match_areas.append({
                        "dimension": dim.replace("_", " ").title(),
                        "user_value": val1,
                        "match_value": val2,
                        "compatibility": compat,
                        "insight": self._get_match_insight(dim, val1, val2),
                    })
                elif compat < 50:
                    friction_points.append({
                        "dimension": dim.replace("_", " ").title(),
                        "user_value": val1,
                        "match_value": val2,
                        "difference": diff,
                        "risk_level": "high" if compat < 30 else "medium",
                        "explanation": self._get_friction_explanation(dim, val1, val2),
                        "mitigation": self._get_friction_mitigation(dim, val1, val2),
                    })

            # Handle humor style compatibility
            humor_compat = self._calculate_humor_compatibility(
                style1.get("humor_style", "minimal"),
                style2.get("humor_style", "minimal")
            )

            # Calculate weighted overall score
            overall_score = sum(
                dimension_scores[dim]["compatibility"] * weight
                for dim, weight in dimension_weights.items()
            )
            overall_score = (overall_score * 0.85) + (humor_compat * 0.15)
            overall_score = round(overall_score, 1)

            # Determine compatibility level
            if overall_score >= 80:
                compat_level = "excellent"
            elif overall_score >= 65:
                compat_level = "good"
            elif overall_score >= 50:
                compat_level = "moderate"
            else:
                compat_level = "challenging"

            # Generate adaptation tips if requested
            adaptation_tips = []
            if generate_tips:
                adaptation_tips = await self._generate_adaptation_tips(
                    style1, style2, friction_points
                )

            # Generate summary
            summary = self._generate_compatibility_summary(
                overall_score, compat_level, match_areas, friction_points
            )

            # Best communication approach
            approach = self._determine_best_approach(style1, style2)

            # Topics that work well with both styles
            topics = self._suggest_compatible_topics(style1, style2)

            return {
                "overall_score": overall_score,
                "compatibility_level": compat_level,
                "style_match_areas": match_areas[:5],  # Top 5 matches
                "potential_friction": friction_points[:3],  # Top 3 friction points
                "adaptation_tips": adaptation_tips[:5],  # Top 5 tips
                "summary": summary,
                "best_communication_approach": approach,
                "topics_to_leverage": topics,
                "dimension_comparison": dimension_scores,
            }

        except Exception as e:
            logger.error(f"Failed to calculate style compatibility: {e}", exc_info=True)
            return self._get_fallback_compatibility()

    async def generate_adaptation_tips(
        self,
        user_style: Dict[str, Any],
        match_style: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Generate tips for adapting communication style to better match with someone.

        Args:
            user_style: User's communication style
            match_style: Match's communication style

        Returns:
            List of adaptation tips
        """
        try:
            tips = []

            # Formality adaptation
            formality_diff = match_style.get("formality", 50) - user_style.get("formality", 50)
            if abs(formality_diff) > 20:
                if formality_diff > 0:
                    tips.append({
                        "category": "tone",
                        "tip": "Try using slightly more formal language to match their style",
                        "example_before": "hey whats up! wanna grab coffee?",
                        "example_after": "Hi! Would you like to grab coffee sometime?",
                        "priority": "high" if abs(formality_diff) > 40 else "medium",
                    })
                else:
                    tips.append({
                        "category": "tone",
                        "tip": "Feel free to be more casual - they seem relaxed in their communication",
                        "example_before": "I would be interested in meeting up if you are available.",
                        "example_after": "Would love to meet up! When works for you?",
                        "priority": "medium",
                    })

            # Expressiveness adaptation
            expr_diff = match_style.get("expressiveness", 50) - user_style.get("expressiveness", 50)
            if expr_diff > 25:
                tips.append({
                    "category": "expression",
                    "tip": "Add more emojis and expressive punctuation to match their energy",
                    "example_before": "That sounds fun",
                    "example_after": "That sounds so fun! :)",
                    "priority": "medium",
                })
            elif expr_diff < -25:
                tips.append({
                    "category": "expression",
                    "tip": "Your match uses fewer emojis - consider toning down the expressiveness slightly",
                    "example_before": "Omg that's amazing!!! :D :D",
                    "example_after": "That's really cool!",
                    "priority": "low",
                })

            # Verbosity adaptation
            verb_diff = match_style.get("verbosity", 50) - user_style.get("verbosity", 50)
            if abs(verb_diff) > 30:
                if verb_diff > 0:
                    tips.append({
                        "category": "content",
                        "tip": "Try expanding your messages a bit - they seem to appreciate detailed responses",
                        "example_before": "Cool!",
                        "example_after": "That's really cool! Tell me more about how you got into that.",
                        "priority": "medium",
                    })
                else:
                    tips.append({
                        "category": "content",
                        "tip": "Keep messages concise - they tend to write shorter messages",
                        "example_before": "I was thinking we could maybe try that new restaurant downtown, I heard it has amazing food and the atmosphere is supposed to be really nice too.",
                        "example_after": "Want to try that new restaurant downtown? I heard it's great!",
                        "priority": "medium",
                    })

            # Question frequency
            q_diff = match_style.get("question_frequency", 50) - user_style.get("question_frequency", 50)
            if q_diff > 20:
                tips.append({
                    "category": "content",
                    "tip": "Your match asks lots of questions - try asking more to show you're equally curious about them",
                    "example_before": "I love hiking too.",
                    "example_after": "I love hiking too! What's your favorite trail?",
                    "priority": "high",
                })

            # Response timing
            user_pattern = user_style.get("response_pattern", "steady_responder")
            match_pattern = match_style.get("response_pattern", "steady_responder")

            if user_pattern == "quick_responder" and match_pattern == "delayed_responder":
                tips.append({
                    "category": "timing",
                    "tip": "Your match takes time to respond - don't worry if they don't reply immediately, it's just their style",
                    "example_before": None,
                    "example_after": None,
                    "priority": "medium",
                })
            elif user_pattern == "delayed_responder" and match_pattern == "quick_responder":
                tips.append({
                    "category": "timing",
                    "tip": "Your match tends to reply quickly - try to respond a bit faster to maintain momentum",
                    "example_before": None,
                    "example_after": None,
                    "priority": "medium",
                })

            # Humor style alignment
            user_humor = user_style.get("humor_style", "minimal")
            match_humor = match_style.get("humor_style", "minimal")

            if user_humor != match_humor and match_humor != "minimal":
                humor_tips = {
                    "witty": "Try incorporating clever wordplay or observations",
                    "playful": "Keep things light and fun with playful teasing",
                    "sarcastic": "A bit of dry humor might resonate well",
                    "wholesome": "Focus on warm, positive humor",
                }
                if match_humor in humor_tips:
                    tips.append({
                        "category": "tone",
                        "tip": f"They have a {match_humor} sense of humor - {humor_tips[match_humor]}",
                        "example_before": None,
                        "example_after": None,
                        "priority": "low",
                    })

            # Sort by priority
            priority_order = {"high": 0, "medium": 1, "low": 2}
            tips.sort(key=lambda x: priority_order.get(x["priority"], 2))

            return tips[:5]  # Return top 5 tips

        except Exception as e:
            logger.error(f"Failed to generate adaptation tips: {e}")
            return []

    def detect_style_evolution(
        self,
        message_history: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Detect how communication style has evolved over a conversation history.

        Args:
            message_history: Chronological list of messages

        Returns:
            Style evolution analysis
        """
        return self._analyze_evolution(message_history)

    async def predict_communication_friction(
        self,
        user_style: Dict[str, Any],
        match_style: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Predict potential communication misunderstandings and friction points.

        Args:
            user_style: User's communication style
            match_style: Match's communication style

        Returns:
            Friction analysis with prevention strategies
        """
        try:
            friction_points = []
            prevention_strategies = []
            guidelines = []

            # Analyze each dimension for friction
            dimensions_to_check = [
                ("formality", "Formality mismatch"),
                ("expressiveness", "Expression level difference"),
                ("verbosity", "Message length mismatch"),
                ("question_frequency", "Question asking imbalance"),
                ("positivity", "Emotional tone difference"),
                ("emotional_depth", "Emotional depth mismatch"),
            ]

            total_risk_score = 0

            for dim, name in dimensions_to_check:
                val1 = user_style.get(dim, 50)
                val2 = match_style.get(dim, 50)
                diff = abs(val1 - val2)

                if diff > 35:
                    risk_level = "high" if diff > 50 else "medium"
                    total_risk_score += diff

                    friction_points.append({
                        "dimension": name,
                        "user_value": val1,
                        "match_value": val2,
                        "difference": diff,
                        "risk_level": risk_level,
                        "explanation": self._get_friction_explanation(dim, val1, val2),
                        "mitigation": self._get_friction_mitigation(dim, val1, val2),
                    })

            # Determine overall risk
            num_friction_points = len(friction_points)
            avg_risk = total_risk_score / max(len(dimensions_to_check), 1)

            if num_friction_points >= 3 or avg_risk > 45:
                overall_risk = "high"
            elif num_friction_points >= 2 or avg_risk > 30:
                overall_risk = "medium"
            else:
                overall_risk = "low"

            # Generate prevention strategies
            if overall_risk == "high":
                prevention_strategies = [
                    "Be patient and give each other time to adapt",
                    "Explicitly discuss communication preferences early",
                    "Don't assume intent - ask for clarification when unsure",
                    "Acknowledge that you communicate differently and that's okay",
                ]
            elif overall_risk == "medium":
                prevention_strategies = [
                    "Pay attention to how they respond and adjust accordingly",
                    "If something feels off, address it openly",
                    "Mirror their communication style when appropriate",
                ]
            else:
                prevention_strategies = [
                    "Your communication styles align well - be yourself!",
                    "Small adjustments can help maintain great connection",
                ]

            # Generate conversation guidelines
            guidelines = self._generate_guidelines(user_style, match_style, friction_points)

            return {
                "friction_points": friction_points,
                "overall_risk": overall_risk,
                "prevention_strategies": prevention_strategies,
                "conversation_guidelines": guidelines,
            }

        except Exception as e:
            logger.error(f"Failed to predict communication friction: {e}")
            return {
                "friction_points": [],
                "overall_risk": "unknown",
                "prevention_strategies": ["Be yourself and communicate openly"],
                "conversation_guidelines": ["Keep conversations balanced and engaging"],
            }

    # =========================================================================
    # Private helper methods
    # =========================================================================

    def _calculate_dimensions(
        self,
        texts: List[str],
        messages: List[Dict[str, Any]]
    ) -> StyleDimensions:
        """Calculate raw style dimensions from message texts."""
        all_text = " ".join(texts).lower()
        all_words = re.findall(r'\b\w+\b', all_text)
        word_count = len(all_words)

        # Calculate average message length
        avg_length = sum(len(t) for t in texts) / len(texts) if texts else 0

        # Formality: Check for formal vs casual indicators
        formal_count = sum(1 for word in all_words if word in FORMAL_INDICATORS)
        slang_count = sum(1 for word in all_words if word in SLANG_PATTERNS)

        formal_ratio = formal_count / max(word_count, 1) * 100
        slang_ratio = slang_count / max(word_count, 1) * 100

        # Formality score: high formal words + low slang = formal
        formality = min(100, max(0, 50 + (formal_ratio * 10) - (slang_ratio * 10)))

        # Expressiveness: emojis, punctuation marks, caps
        emoji_count = sum(1 for char in all_text if ord(char) > 127000 or char in "😀😃😄😁😆😅🤣😂🙂😊")
        exclaim_count = all_text.count("!")
        caps_ratio = sum(1 for c in all_text if c.isupper()) / max(len(all_text), 1)

        expressiveness = min(100, (emoji_count * 3) + (exclaim_count * 2) + (caps_ratio * 50))

        # Verbosity: based on average message length
        # Short messages (< 50 chars) = low, long messages (> 200 chars) = high
        verbosity = min(100, max(0, (avg_length - 50) / 1.5))

        # Humor frequency
        humor_words = sum(
            1 for word in all_words
            if word in HUMOR_INDICATORS["playful"]
            or word in HUMOR_INDICATORS["witty"]
            or word in HUMOR_INDICATORS["sarcastic"]
            or word in HUMOR_INDICATORS["wholesome"]
        )
        humor_frequency = min(100, humor_words / len(texts) * 30) if texts else 0

        # Question frequency
        question_count = sum(1 for t in texts if "?" in t)
        question_frequency = min(100, (question_count / len(texts)) * 100) if texts else 0

        # Vocabulary richness: unique words / total words
        unique_words = len(set(all_words))
        vocab_richness = min(100, (unique_words / max(word_count, 1)) * 150)

        # Slang usage
        slang_usage = min(100, slang_ratio * 20)

        # Positivity
        positive_count = sum(1 for word in all_words if word in POSITIVE_WORDS)
        negative_count = sum(1 for word in all_words if word in NEGATIVE_WORDS)
        total_sentiment = positive_count + negative_count
        if total_sentiment > 0:
            positivity = (positive_count / total_sentiment) * 100
        else:
            positivity = 50  # Neutral if no sentiment words

        # Emotional depth
        emotional_words = sum(1 for word in all_words if word in EMOTIONAL_DEPTH_WORDS)
        emotional_depth = min(100, emotional_words / len(texts) * 25) if texts else 0

        return StyleDimensions(
            formality=formality,
            expressiveness=expressiveness,
            verbosity=verbosity,
            humor_frequency=humor_frequency,
            question_frequency=question_frequency,
            vocabulary_richness=vocab_richness,
            slang_usage=slang_usage,
            positivity=positivity,
            emotional_depth=emotional_depth,
            avg_message_length=avg_length,
        )

    def _detect_humor_style(self, texts: List[str]) -> str:
        """Detect the primary humor style from messages."""
        all_text = " ".join(texts).lower()

        humor_scores = {
            "witty": 0,
            "playful": 0,
            "sarcastic": 0,
            "wholesome": 0,
        }

        for humor_type, indicators in HUMOR_INDICATORS.items():
            for indicator in indicators:
                humor_scores[humor_type] += all_text.count(indicator)

        # Find the dominant humor style
        max_score = max(humor_scores.values())

        if max_score < 2:
            return "minimal"

        for style, score in humor_scores.items():
            if score == max_score:
                return style

        return "minimal"

    def _detect_response_pattern(self, messages: List[Dict[str, Any]]) -> str:
        """Detect response timing pattern from messages."""
        if len(messages) < 3:
            return "steady_responder"

        timestamps = []
        for msg in messages:
            ts = msg.get("timestamp")
            if ts:
                if isinstance(ts, (int, float)):
                    timestamps.append(ts)
                elif isinstance(ts, str):
                    try:
                        dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                        timestamps.append(dt.timestamp())
                    except ValueError:
                        pass

        if len(timestamps) < 3:
            return "steady_responder"

        # Calculate response time intervals
        intervals = []
        for i in range(1, len(timestamps)):
            intervals.append(timestamps[i] - timestamps[i-1])

        if not intervals:
            return "steady_responder"

        avg_interval = sum(intervals) / len(intervals)
        std_dev = math.sqrt(sum((x - avg_interval) ** 2 for x in intervals) / len(intervals))

        # Classify based on average and variance
        if avg_interval < 300:  # < 5 minutes average
            return "quick_responder"
        elif avg_interval > 7200:  # > 2 hours average
            return "delayed_responder"
        elif std_dev > avg_interval:  # High variance
            return "burst_responder"
        else:
            return "steady_responder"

    def _detect_topic_behavior(self, messages: List[Dict[str, Any]]) -> str:
        """Detect topic initiation vs following behavior."""
        if len(messages) < 5:
            return "balanced"

        # Look for topic initiations (questions, new subjects)
        topic_indicators = ["what", "how", "why", "have you", "do you", "anyway", "so"]
        initiations = 0
        follows = 0

        for msg in messages:
            text = msg.get("text", "").lower()
            if any(ind in text for ind in topic_indicators):
                initiations += 1
            else:
                follows += 1

        ratio = initiations / max(follows, 1)

        if ratio > 1.5:
            return "initiator"
        elif ratio < 0.5:
            return "follower"
        else:
            return "balanced"

    def _calculate_confidence(self, num_messages: int) -> float:
        """Calculate confidence score based on sample size."""
        # Confidence increases with more messages, plateaus around 50
        if num_messages < 5:
            return 0.2
        elif num_messages < 10:
            return 0.4
        elif num_messages < 20:
            return 0.6
        elif num_messages < 50:
            return 0.8
        else:
            return 0.95

    def _identify_strengths_and_growth(
        self,
        style: Dict[str, Any]
    ) -> Tuple[List[str], List[str]]:
        """Identify communication strengths and growth areas."""
        strengths = []
        growth_areas = []

        # High question frequency = curious
        if style.get("question_frequency", 0) > 60:
            strengths.append("You show genuine curiosity by asking questions")
        elif style.get("question_frequency", 0) < 20:
            growth_areas.append("Try asking more questions to show interest")

        # Balanced expressiveness
        expr = style.get("expressiveness", 50)
        if 30 <= expr <= 70:
            strengths.append("Your expressiveness is well-balanced")
        elif expr > 80:
            growth_areas.append("Consider toning down expressions for some contexts")

        # Positivity
        if style.get("positivity", 0) > 70:
            strengths.append("Your positive communication creates a welcoming vibe")
        elif style.get("positivity", 0) < 40:
            growth_areas.append("Adding more positive language could help connections")

        # Emotional depth
        if style.get("emotional_depth", 0) > 60:
            strengths.append("You communicate with meaningful emotional depth")
        elif style.get("emotional_depth", 0) < 25:
            growth_areas.append("Opening up more emotionally can deepen connections")

        # Vocabulary richness
        if style.get("vocabulary_richness", 0) > 70:
            strengths.append("Your diverse vocabulary makes conversations engaging")

        # Humor
        if style.get("humor_frequency", 0) > 40 and style.get("humor_style") != "minimal":
            strengths.append(f"Your {style.get('humor_style', 'playful')} humor adds fun to conversations")

        # Ensure we have at least one of each
        if not strengths:
            strengths.append("You have a consistent communication style")
        if not growth_areas:
            growth_areas.append("Continue being authentic in your communication")

        return strengths[:4], growth_areas[:3]

    async def _generate_style_summary(self, style: Dict[str, Any]) -> str:
        """Generate a human-readable summary of communication style."""
        try:
            # Build a simple summary based on key dimensions
            formality = style.get("formality", 50)
            expr = style.get("expressiveness", 50)
            verbosity = style.get("verbosity", 50)
            humor = style.get("humor_style", "minimal")

            formality_desc = "formal" if formality > 65 else "casual" if formality < 35 else "balanced"
            expr_desc = "expressive" if expr > 65 else "reserved" if expr < 35 else "moderately expressive"
            verbosity_desc = "detailed" if verbosity > 65 else "concise" if verbosity < 35 else "balanced"

            summary_parts = [
                f"You have a {formality_desc} communication style",
                f"are {expr_desc} with emojis and punctuation",
                f"and tend to write {verbosity_desc} messages",
            ]

            if humor != "minimal":
                summary_parts.append(f"Your {humor} humor adds personality to your conversations")

            return ". ".join(summary_parts) + "."

        except Exception as e:
            logger.warning(f"Failed to generate style summary: {e}")
            return "You have a unique communication style that evolves with your conversations."

    def _analyze_evolution(self, messages: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze how communication style has evolved over message history."""
        if len(messages) < 20:
            return {
                "evolution_points": [],
                "trends": {},
                "insights": ["Not enough messages to detect evolution patterns"],
                "adaptation_detected": False,
            }

        # Split messages into periods
        chunk_size = len(messages) // 4
        periods = []

        for i in range(4):
            start = i * chunk_size
            end = start + chunk_size if i < 3 else len(messages)
            period_messages = messages[start:end]

            texts = [m.get("text", "") for m in period_messages if m.get("text")]
            if texts:
                dims = self._calculate_dimensions(texts, period_messages)
                periods.append({
                    "period": f"Messages {start + 1}-{end}",
                    "formality": round(dims.formality, 1),
                    "expressiveness": round(dims.expressiveness, 1),
                    "verbosity": round(dims.verbosity, 1),
                    "positivity": round(dims.positivity, 1),
                })

        # Calculate trends
        trends = {}
        insights = []

        if len(periods) >= 2:
            first = periods[0]
            last = periods[-1]

            for dim in ["formality", "expressiveness", "verbosity", "positivity"]:
                diff = last[dim] - first[dim]
                if diff > 10:
                    trends[dim] = "increasing"
                elif diff < -10:
                    trends[dim] = "decreasing"
                else:
                    trends[dim] = "stable"

            # Generate insights
            if trends.get("expressiveness") == "increasing":
                insights.append("You've become more expressive as the conversation progressed")
            if trends.get("formality") == "decreasing":
                insights.append("Your communication has become more casual over time")
            if trends.get("positivity") == "increasing":
                insights.append("The conversation has grown more positive")

        # Detect adaptation
        adaptation_detected = any(t in ["increasing", "decreasing"] for t in trends.values())

        return {
            "evolution_points": periods,
            "trends": trends,
            "insights": insights if insights else ["Your communication style has remained consistent"],
            "adaptation_detected": adaptation_detected,
        }

    def _calculate_humor_compatibility(self, humor1: str, humor2: str) -> float:
        """Calculate compatibility between two humor styles."""
        compatibility_matrix = {
            ("witty", "witty"): 95,
            ("witty", "playful"): 75,
            ("witty", "sarcastic"): 80,
            ("witty", "wholesome"): 60,
            ("witty", "minimal"): 50,
            ("playful", "playful"): 95,
            ("playful", "sarcastic"): 65,
            ("playful", "wholesome"): 85,
            ("playful", "minimal"): 55,
            ("sarcastic", "sarcastic"): 90,
            ("sarcastic", "wholesome"): 40,
            ("sarcastic", "minimal"): 45,
            ("wholesome", "wholesome"): 95,
            ("wholesome", "minimal"): 60,
            ("minimal", "minimal"): 70,
        }

        key = tuple(sorted([humor1, humor2]))
        return compatibility_matrix.get(key, 50)

    def _get_match_insight(self, dimension: str, val1: float, val2: float) -> str:
        """Get insight for a dimension that matches well."""
        insights = {
            "formality": "You both communicate with similar formality levels, making conversations feel natural",
            "expressiveness": "Your expression styles complement each other well",
            "verbosity": "You match well in how much detail you include in messages",
            "humor_frequency": "You share a similar sense of when to use humor",
            "question_frequency": "You're both equally curious about each other",
            "vocabulary_richness": "Your vocabulary levels match, making conversations flow easily",
            "slang_usage": "You speak the same 'language' when it comes to casual expressions",
            "positivity": "Your positive energy levels are well aligned",
            "emotional_depth": "You connect at similar emotional depths",
        }
        return insights.get(dimension, "This dimension aligns well between you")

    def _get_friction_explanation(self, dimension: str, val1: float, val2: float) -> str:
        """Get explanation for a potential friction point."""
        diff = val1 - val2
        explanations = {
            "formality": (
                "You're more formal while they're casual" if diff > 0
                else "You're more casual while they're formal"
            ),
            "expressiveness": (
                "You use more emojis/expressions than they do" if diff > 0
                else "They're more expressive with emojis than you"
            ),
            "verbosity": (
                "You tend to write longer messages than they do" if diff > 0
                else "They write longer messages than you typically do"
            ),
            "question_frequency": (
                "You ask more questions than they do" if diff > 0
                else "They ask more questions than you"
            ),
            "positivity": (
                "Your messages tend to be more upbeat than theirs" if diff > 0
                else "Their messages are more positive than yours"
            ),
            "emotional_depth": (
                "You communicate with more emotional depth" if diff > 0
                else "They go deeper emotionally in conversations"
            ),
        }
        return explanations.get(
            dimension,
            "There's a notable difference in this communication aspect"
        )

    def _get_friction_mitigation(self, dimension: str, val1: float, val2: float) -> str:
        """Get mitigation strategy for a friction point."""
        diff = val1 - val2
        mitigations = {
            "formality": (
                "Try loosening up a bit - they'll appreciate it"
                if diff > 0 else "Match their professional tone when needed"
            ),
            "expressiveness": (
                "Scale back slightly on emojis"
                if diff > 0 else "Add a few more emojis to match their energy"
            ),
            "verbosity": (
                "Try being more concise sometimes"
                if diff > 0 else "Expand your responses with more detail"
            ),
            "question_frequency": (
                "Give them space to ask questions too"
                if diff > 0 else "Show more curiosity by asking questions"
            ),
            "positivity": (
                "It's okay to balance positivity with realness"
                if diff > 0 else "Try adding more positive framing"
            ),
            "emotional_depth": (
                "Start with lighter topics and let depth develop naturally"
                if diff > 0 else "Don't be afraid to share more of your feelings"
            ),
        }
        return mitigations.get(
            dimension,
            "Be aware of this difference and adapt gradually"
        )

    def _generate_compatibility_summary(
        self,
        score: float,
        level: str,
        matches: List[Dict],
        friction: List[Dict]
    ) -> str:
        """Generate a human-readable compatibility summary."""
        if level == "excellent":
            base = "Your communication styles are highly compatible!"
        elif level == "good":
            base = "You communicate in complementary ways."
        elif level == "moderate":
            base = "Your styles differ but can work well with some adjustment."
        else:
            base = "Your communication styles are quite different, but that can add variety."

        details = []
        if matches:
            top_match = matches[0]["dimension"].lower()
            details.append(f"You align particularly well in {top_match}")

        if friction:
            top_friction = friction[0]["dimension"].lower()
            details.append(f"Pay attention to differences in {top_friction}")

        if details:
            return f"{base} {'. '.join(details)}."
        return base

    def _determine_best_approach(
        self,
        style1: Dict[str, Any],
        style2: Dict[str, Any]
    ) -> str:
        """Determine the best communication approach for this pair."""
        approaches = []

        # Formality approach
        avg_formality = (style1.get("formality", 50) + style2.get("formality", 50)) / 2
        if avg_formality > 60:
            approaches.append("Keep conversations respectful and thoughtful")
        else:
            approaches.append("Keep things light and casual")

        # Expressiveness approach
        min_expr = min(style1.get("expressiveness", 50), style2.get("expressiveness", 50))
        if min_expr < 40:
            approaches.append("Use emojis sparingly")
        elif max(style1.get("expressiveness", 50), style2.get("expressiveness", 50)) > 60:
            approaches.append("Don't be afraid to show enthusiasm")

        # Depth approach
        avg_depth = (style1.get("emotional_depth", 50) + style2.get("emotional_depth", 50)) / 2
        if avg_depth > 60:
            approaches.append("Feel free to have deeper conversations")
        else:
            approaches.append("Build connection through shared interests first")

        return ". ".join(approaches[:2]) + "." if approaches else "Be authentic and responsive."

    def _suggest_compatible_topics(
        self,
        style1: Dict[str, Any],
        style2: Dict[str, Any]
    ) -> List[str]:
        """Suggest conversation topics that work well with both styles."""
        topics = []

        avg_depth = (style1.get("emotional_depth", 50) + style2.get("emotional_depth", 50)) / 2
        avg_humor = (style1.get("humor_frequency", 50) + style2.get("humor_frequency", 50)) / 2
        avg_positivity = (style1.get("positivity", 50) + style2.get("positivity", 50)) / 2

        if avg_humor > 50:
            topics.extend(["Funny stories and experiences", "Light-hearted observations"])

        if avg_depth > 50:
            topics.extend(["Dreams and aspirations", "Meaningful life experiences"])
        else:
            topics.extend(["Hobbies and interests", "Travel and food"])

        if avg_positivity > 60:
            topics.extend(["Exciting plans", "Things you're grateful for"])

        # Always safe topics
        topics.extend(["Weekend plans", "Shared interests"])

        return list(dict.fromkeys(topics))[:5]  # Remove duplicates, return top 5

    def _generate_guidelines(
        self,
        user_style: Dict[str, Any],
        match_style: Dict[str, Any],
        friction_points: List[Dict]
    ) -> List[str]:
        """Generate conversation guidelines based on styles and friction points."""
        guidelines = []

        # Basic guidelines
        guidelines.append("Match their response timing when possible")
        guidelines.append("Pay attention to how they respond and adjust accordingly")

        # Based on friction points
        for friction in friction_points[:2]:
            dim = friction["dimension"].lower()
            if "formality" in dim:
                guidelines.append("Find a comfortable middle ground in your tone")
            elif "verbosity" in dim:
                guidelines.append("Notice their message length and occasionally match it")
            elif "question" in dim:
                guidelines.append("Balance asking questions with sharing about yourself")

        # Based on match's style
        if match_style.get("humor_frequency", 0) > 50:
            guidelines.append("They appreciate humor - don't be afraid to be playful")

        if match_style.get("emotional_depth", 0) > 60:
            guidelines.append("They value deeper conversations - share authentic thoughts")

        return list(dict.fromkeys(guidelines))[:5]

    async def _generate_adaptation_tips(
        self,
        style1: Dict[str, Any],
        style2: Dict[str, Any],
        friction_points: List[Dict]
    ) -> List[Dict[str, Any]]:
        """Generate adaptation tips using the dedicated method."""
        return await self.generate_adaptation_tips(style1, style2)

    def _get_empty_style_response(self) -> Dict[str, Any]:
        """Return empty style response when no messages provided."""
        return {
            "user_style": {
                "formality": 50,
                "expressiveness": 50,
                "verbosity": 50,
                "humor_style": "minimal",
                "humor_frequency": 0,
                "question_frequency": 50,
                "response_pattern": "steady_responder",
                "topic_behavior": "balanced",
                "vocabulary_richness": 50,
                "slang_usage": 50,
                "positivity": 50,
                "emotional_depth": 50,
                "avg_message_length": 0,
                "messages_analyzed": 0,
                "confidence_score": 0,
            },
            "style_summary": "Not enough messages to analyze communication style.",
            "strengths": [],
            "growth_areas": ["Send more messages to get style analysis"],
        }

    def _get_fallback_style_response(
        self,
        messages: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Return fallback style response on error."""
        num_messages = len(messages)
        return {
            "user_style": {
                "formality": 50,
                "expressiveness": 50,
                "verbosity": 50,
                "humor_style": "minimal",
                "humor_frequency": 30,
                "question_frequency": 40,
                "response_pattern": "steady_responder",
                "topic_behavior": "balanced",
                "vocabulary_richness": 50,
                "slang_usage": 30,
                "positivity": 60,
                "emotional_depth": 40,
                "avg_message_length": 50,
                "messages_analyzed": num_messages,
                "confidence_score": 0.3,
            },
            "style_summary": "Your communication style shows a balanced approach.",
            "strengths": ["Consistent communication patterns"],
            "growth_areas": ["Continue developing your unique style"],
        }

    def _get_fallback_compatibility(self) -> Dict[str, Any]:
        """Return fallback compatibility response on error."""
        return {
            "overall_score": 65,
            "compatibility_level": "moderate",
            "style_match_areas": [],
            "potential_friction": [],
            "adaptation_tips": [
                {
                    "category": "general",
                    "tip": "Be yourself and communicate openly",
                    "example_before": None,
                    "example_after": None,
                    "priority": "medium",
                }
            ],
            "summary": "Unable to analyze compatibility in detail. Focus on authentic communication.",
            "best_communication_approach": "Be genuine and pay attention to how they respond.",
            "topics_to_leverage": ["Shared interests", "Weekend plans"],
            "dimension_comparison": {},
        }
