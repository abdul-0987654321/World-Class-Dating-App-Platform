"""
AI Conflict Mediator Service
Provides dispute resolution and miscommunication repair for dating conversations.

This is a research feature (0% rollout) that helps users navigate tense situations
in their conversations. It provides:
- Conflict detection and analysis
- Perspective explanation for both parties
- Mediation suggestions and de-escalation templates
- Apology crafting assistance
- Conversation reset strategies
- Graceful exit options when needed

CRITICAL SAFETY GUARDRAILS:
- Never mediate abuse - escalate to safety team
- Recognize when to suggest ending conversation
- Never blame the victim
- Prioritize user safety above reconciliation
"""

import logging
import json
import uuid
import re
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
from enum import Enum

from app.services.ai_provider import AIProviderService

logger = logging.getLogger(__name__)


# ============================================================================
# ABUSE DETECTION PATTERNS
# ============================================================================

# These patterns indicate potential abuse and should trigger safety escalation
ABUSE_INDICATORS = {
    "threats": [
        r"\b(kill|hurt|harm|destroy)\s+(you|your)",
        r"\bi('ll|'m going to|will)\s+(find|come for|get)\s+you",
        r"\byou('ll|'re going to)\s+(regret|pay|suffer)",
        r"\bi know where you (live|work)",
    ],
    "harassment": [
        r"\b(slut|whore|bitch|cunt|skank)\b",
        r"(ugly|fat|disgusting)\s+(bitch|whore|slut)",
        r"\bnobody will ever (love|want|date) you\b",
        r"\byou('re| are)\s+(worthless|nothing|garbage)",
    ],
    "manipulation": [
        r"\bif you (loved|cared about) me you would",
        r"\byou('re| are) making me (hurt|angry|do this)",
        r"\bi('ll|'m going to)\s+(hurt myself|kill myself)\s+(if|because|unless)",
        r"\bno one else will (want|love|have) you",
    ],
    "coercion": [
        r"\bi('ll|'m going to)\s+tell everyone",
        r"\bi('ll|'m going to)\s+share (your|those) (pics|photos|nudes)",
        r"\byou owe me",
        r"\byou have to (do|give|send|meet)",
    ],
    "stalking": [
        r"\bi('ve|'m) (been )?(watching|following) you",
        r"\bi saw you (at|with|going)",
        r"\bi know (everything|all) about you",
        r"you can('t| not) hide from me",
    ],
}

# Patterns that indicate the user may be the victim (never blame them)
VICTIM_INDICATORS = [
    r"\bthey('re| are) (scaring|threatening|harassing) me",
    r"\bthey won('t| not) (leave me alone|stop)",
    r"\bi('m| am) (scared|afraid|frightened)",
    r"\bthey('re| are) (pressuring|forcing|making) me",
    r"\bi (said|told them) (no|stop|leave me alone)",
]


class ConflictMediatorService:
    """
    Service for mediating conflicts and repairing miscommunication in dating conversations.

    This service is designed with safety as the top priority. It:
    1. Detects abuse and escalates to safety team (never mediates abuse)
    2. Identifies the victim and never places blame on them
    3. Provides empathetic, actionable guidance for genuine misunderstandings
    4. Suggests graceful exits when reconciliation isn't appropriate
    """

    def __init__(self, ai_provider: AIProviderService):
        """Initialize conflict mediator service."""
        self.ai_provider = ai_provider
        self._suggestion_counter = 0

    # ========================================================================
    # MAIN ENTRY POINTS
    # ========================================================================

    async def detect_conflict(
        self,
        conversation_history: List[Dict[str, Any]],
        sensitivity: str = "normal",
    ) -> Dict[str, Any]:
        """
        Detect if there's conflict or tension in a conversation.

        This is a quick check that can be called frequently to catch
        issues early before they escalate.

        Args:
            conversation_history: List of messages with sender info
            sensitivity: Detection sensitivity (low, normal, high)

        Returns:
            Dictionary with conflict detection results
        """
        try:
            # SAFETY FIRST: Check for abuse patterns
            safety_check = self._check_for_abuse(conversation_history)
            if safety_check["is_abusive"]:
                logger.warning(
                    f"Abuse detected in conversation: {safety_check['reason']}"
                )
                return {
                    "conflict_detected": True,
                    "confidence": 0.95,
                    "conflict_type": "abuse",
                    "severity": "critical",
                    "trigger_message_index": safety_check.get("message_index"),
                    "early_warning_signs": [],
                    "sentiment_shift_detected": True,
                    "recommendation": (
                        "This conversation contains concerning behavior. "
                        "Your safety is our priority. Consider blocking this user "
                        "and reporting them to our safety team."
                    ),
                    "safety_concern": True,
                    "safety_reason": safety_check["reason"],
                }

            # Analyze conversation for tension
            tension_analysis = self._analyze_tension(conversation_history)

            # If tension detected, get AI analysis for more context
            if tension_analysis["has_tension"] or sensitivity == "high":
                ai_analysis = await self._ai_conflict_detection(
                    conversation_history, sensitivity
                )
                return self._merge_detection_results(tension_analysis, ai_analysis)

            return {
                "conflict_detected": False,
                "confidence": 0.85,
                "conflict_type": None,
                "severity": None,
                "trigger_message_index": None,
                "early_warning_signs": tension_analysis.get("early_signs", []),
                "sentiment_shift_detected": tension_analysis.get("sentiment_shifted", False),
                "recommendation": "No significant tension detected. Keep the conversation going!",
                "safety_concern": False,
                "safety_reason": None,
            }

        except Exception as e:
            logger.error(f"Conflict detection failed: {e}", exc_info=True)
            return self._get_fallback_detection()

    async def analyze_conflict(
        self,
        conversation_history: List[Dict[str, Any]],
        conflict_start_index: Optional[int] = None,
        user_perspective: Optional[str] = None,
        match_perspective: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Perform deep analysis of a conflict to understand both perspectives.

        Args:
            conversation_history: Full conversation history
            conflict_start_index: Where user thinks conflict started
            user_perspective: User's explanation of what happened
            match_perspective: Match's explanation (if available)

        Returns:
            Comprehensive conflict analysis
        """
        try:
            # SAFETY FIRST: Check for abuse
            safety_check = self._check_for_abuse(conversation_history)
            if safety_check["is_abusive"]:
                return self._get_abuse_analysis(safety_check, conversation_history)

            # Find the trigger point if not provided
            if conflict_start_index is None:
                conflict_start_index = self._find_trigger_point(conversation_history)

            # Get AI-powered deep analysis
            analysis = await self._ai_conflict_analysis(
                conversation_history,
                conflict_start_index,
                user_perspective,
                match_perspective,
            )

            return analysis

        except Exception as e:
            logger.error(f"Conflict analysis failed: {e}", exc_info=True)
            return self._get_fallback_analysis(conversation_history)

    async def generate_mediation_suggestions(
        self,
        analysis: Dict[str, Any],
        desired_outcome: str = "reconcile",
    ) -> List[Dict[str, Any]]:
        """
        Generate mediation suggestions based on conflict analysis.

        Args:
            analysis: Result from analyze_conflict
            desired_outcome: What user wants (reconcile, understand, end_gracefully)

        Returns:
            List of prioritized mediation suggestions
        """
        try:
            # Don't provide mediation for abuse - only safety resources
            if analysis.get("safety_concern_detected"):
                return self._get_safety_suggestions()

            suggestions = []

            # Generate suggestions based on conflict type
            conflict_type = analysis.get("conflict_type", "miscommunication")
            severity = analysis.get("severity", "moderate")

            # Get AI-generated personalized suggestions
            ai_suggestions = await self._ai_mediation_suggestions(
                analysis, desired_outcome
            )
            suggestions.extend(ai_suggestions)

            # Add appropriate templates based on conflict type
            if conflict_type in ["miscommunication", "tone_misread"]:
                suggestions.extend(self._get_clarification_suggestions(analysis))
            elif conflict_type == "boundary_issue":
                suggestions.extend(self._get_boundary_suggestions(analysis))
            elif conflict_type == "unintentional_offense":
                suggestions.extend(self._get_apology_suggestions(analysis))
            elif conflict_type == "expectation_mismatch":
                suggestions.extend(self._get_alignment_suggestions(analysis))

            # If desired outcome is to end gracefully, prioritize exit suggestions
            if desired_outcome == "end_gracefully":
                suggestions = self._prioritize_exit_suggestions(suggestions)

            # Sort by priority and return top suggestions
            suggestions.sort(key=lambda s: s.get("priority", 5))
            return suggestions[:5]

        except Exception as e:
            logger.error(f"Mediation suggestion generation failed: {e}", exc_info=True)
            return self._get_fallback_suggestions()

    async def create_apology_template(
        self,
        conflict_type: str,
        context: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Create a personalized apology template.

        Args:
            conflict_type: Type of conflict that occurred
            context: Conversation context and what was said

        Returns:
            Apology template with guidance
        """
        try:
            system_prompt = self._build_apology_system_prompt()
            user_prompt = self._build_apology_user_prompt(conflict_type, context)

            response = await self.ai_provider.generate_structured_completion(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                output_format="json",
                temperature=0.7,
            )

            result = json.loads(response)

            return {
                "apology_message": result.get("apology", ""),
                "what_to_acknowledge": result.get("acknowledge", []),
                "what_not_to_say": result.get("avoid", []),
                "follow_up_action": result.get("follow_up"),
                "explanation": result.get("explanation", ""),
            }

        except Exception as e:
            logger.error(f"Apology template creation failed: {e}", exc_info=True)
            return self._get_generic_apology_template(conflict_type)

    async def suggest_conversation_reset(
        self,
        analysis: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Suggest ways to reset the conversation and start fresh.

        Args:
            analysis: Conflict analysis result

        Returns:
            Conversation reset suggestion
        """
        try:
            severity = analysis.get("severity", "moderate")
            conflict_type = analysis.get("conflict_type", "miscommunication")

            # For severe conflicts, suggest a longer break
            if severity in ["severe", "significant"]:
                return {
                    "reset_type": "break_then_return",
                    "suggested_message": (
                        "Hey, I think we both got a bit heated there. "
                        "How about we take a breather and talk again in a day or two? "
                        "I do value getting to know you."
                    ),
                    "waiting_period": "24-48 hours",
                    "new_topic_suggestions": [
                        "Start with something light and positive",
                        "Reference something good from earlier conversation",
                        "Ask about their day/week without going deep",
                    ],
                    "explanation": (
                        "Taking a break allows both people to cool down and "
                        "reflect. Coming back with a fresh perspective often "
                        "helps reset the dynamic."
                    ),
                }

            # For moderate conflicts, acknowledge and pivot
            if severity == "moderate":
                return {
                    "reset_type": "acknowledgment_reset",
                    "suggested_message": (
                        "I think we might have gotten our wires crossed there. "
                        "Can we hit reset? I'd love to keep getting to know you."
                    ),
                    "waiting_period": None,
                    "new_topic_suggestions": await self._get_safe_topics(analysis),
                    "explanation": (
                        "Acknowledging the miscommunication without dwelling on it "
                        "shows maturity and allows you both to move forward."
                    ),
                }

            # For minor conflicts, simple topic change
            return {
                "reset_type": "topic_change",
                "suggested_message": (
                    "Anyway! Tell me more about [shared interest or recent topic]. "
                    "I was curious about that."
                ),
                "waiting_period": None,
                "new_topic_suggestions": await self._get_safe_topics(analysis),
                "explanation": (
                    "For minor misunderstandings, a natural topic change "
                    "can smoothly redirect the conversation."
                ),
            }

        except Exception as e:
            logger.error(f"Conversation reset suggestion failed: {e}", exc_info=True)
            return self._get_fallback_reset()

    async def mediate(
        self,
        conversation_history: List[Dict[str, Any]],
        user_perspective: Optional[str] = None,
        desired_outcome: str = "reconcile",
    ) -> Dict[str, Any]:
        """
        Full mediation flow: detect, analyze, and suggest resolution.

        This is the main entry point for the mediation feature.

        Args:
            conversation_history: Full conversation history
            user_perspective: User's explanation of the situation
            desired_outcome: What user wants (reconcile, understand, end_gracefully)

        Returns:
            Complete mediation response
        """
        try:
            # SAFETY FIRST: Check for abuse
            safety_check = self._check_for_abuse(conversation_history)
            if safety_check["is_abusive"]:
                return self._get_safety_response(safety_check, conversation_history)

            # Check if this person might be a victim
            victim_check = self._check_if_victim(conversation_history, user_perspective)
            if victim_check["is_victim"]:
                return self._get_victim_support_response(victim_check)

            # Analyze the conflict
            analysis = await self.analyze_conflict(
                conversation_history,
                user_perspective=user_perspective,
            )

            # Generate mediation suggestions
            suggestions = await self.generate_mediation_suggestions(
                analysis, desired_outcome
            )

            # Get de-escalation templates
            de_escalation = self._get_de_escalation_templates(analysis)

            # Get apology template if appropriate
            apology = None
            if self._should_apologize(analysis):
                apology = await self.create_apology_template(
                    analysis.get("conflict_type", "miscommunication"),
                    {"analysis": analysis, "history": conversation_history[-10:]},
                )

            # Get conversation reset suggestion
            reset = await self.suggest_conversation_reset(analysis)

            # Get graceful exit option
            graceful_exit = self._get_graceful_exit(analysis, desired_outcome)

            # Build perspective explanation
            perspective_explanation = self._build_perspective_explanation(analysis)

            # Determine immediate action
            immediate_action = self._determine_immediate_action(analysis, desired_outcome)

            return {
                "analysis": analysis,
                "mediation_suggestions": suggestions,
                "de_escalation_templates": de_escalation,
                "apology_template": apology,
                "conversation_reset": reset,
                "graceful_exit": graceful_exit,
                "perspective_explanation": perspective_explanation,
                "immediate_action": immediate_action,
                "things_to_avoid": self._get_things_to_avoid(analysis),
                "follow_up_recommendations": self._get_follow_up_recommendations(analysis),
                "safety_alert": False,
                "safety_resources": None,
            }

        except Exception as e:
            logger.error(f"Mediation failed: {e}", exc_info=True)
            return self._get_fallback_mediation()

    # ========================================================================
    # SAFETY METHODS (CRITICAL - NEVER MEDIATE ABUSE)
    # ========================================================================

    def _check_for_abuse(
        self, conversation_history: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Check conversation for abuse patterns.

        CRITICAL: This is a safety-critical function. We NEVER mediate
        abusive behavior - we escalate to the safety team.
        """
        for i, msg in enumerate(conversation_history):
            text = msg.get("text", "").lower()
            is_match = msg.get("is_match", False)

            # Only check messages from the match (potential abuser)
            if not is_match:
                continue

            for category, patterns in ABUSE_INDICATORS.items():
                for pattern in patterns:
                    if re.search(pattern, text, re.IGNORECASE):
                        return {
                            "is_abusive": True,
                            "reason": category,
                            "message_index": i,
                            "matched_pattern": pattern,
                            "escalate_to_safety": True,
                        }

        return {"is_abusive": False}

    def _check_if_victim(
        self,
        conversation_history: List[Dict[str, Any]],
        user_perspective: Optional[str],
    ) -> Dict[str, Any]:
        """
        Check if the user requesting mediation might be a victim.

        CRITICAL: We never blame victims. If someone appears to be
        a victim of abuse, we provide support resources, not mediation advice.
        """
        # Check user's perspective for victim indicators
        if user_perspective:
            for pattern in VICTIM_INDICATORS:
                if re.search(pattern, user_perspective, re.IGNORECASE):
                    return {
                        "is_victim": True,
                        "reason": "User describes concerning behavior from match",
                    }

        # Check user's messages for signs they're being victimized
        for msg in conversation_history:
            if msg.get("is_match"):
                continue

            text = msg.get("text", "").lower()
            for pattern in VICTIM_INDICATORS:
                if re.search(pattern, text, re.IGNORECASE):
                    return {
                        "is_victim": True,
                        "reason": "User messages indicate potential victimization",
                    }

        return {"is_victim": False}

    def _get_safety_response(
        self,
        safety_check: Dict[str, Any],
        conversation_history: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Return safety-focused response when abuse is detected.

        We DO NOT provide mediation for abusive situations.
        """
        return {
            "analysis": {
                "conflict_type": "abuse",
                "severity": "critical",
                "safety_concern_detected": True,
                "safety_escalation_reason": safety_check["reason"],
                "recoverable": False,
                "recovery_likelihood": 0.0,
                "trigger_message_index": safety_check.get("message_index", 0),
                "trigger_explanation": "This message contains concerning behavior.",
                "misunderstanding_points": [],
                "user_perspective": {
                    "likely_intent": "N/A - Safety concern",
                    "perceived_as": "N/A - Safety concern",
                    "emotional_state": "Potentially unsafe",
                    "valid_concerns": ["Your safety and wellbeing"],
                    "potential_blind_spots": [],
                },
                "match_perspective": {
                    "likely_intent": "N/A - Safety concern",
                    "perceived_as": "N/A - Safety concern",
                    "emotional_state": "Displaying concerning behavior",
                    "valid_concerns": [],
                    "potential_blind_spots": [],
                },
                "common_ground": [],
                "core_issue": "This situation involves potentially harmful behavior.",
            },
            "mediation_suggestions": [],
            "de_escalation_templates": [],
            "apology_template": None,
            "conversation_reset": None,
            "graceful_exit": {
                "exit_message": (
                    "I don't think this is working out. "
                    "I wish you well, but I need to end this conversation."
                ),
                "reasoning": "Your safety is the priority. You don't owe anyone an explanation.",
                "preserves_dignity": True,
                "leaves_door_open": False,
            },
            "perspective_explanation": (
                "This isn't about misunderstanding - the behavior you've experienced "
                "is not okay. You deserve to be treated with respect."
            ),
            "immediate_action": (
                "Consider blocking this person. If you feel unsafe, please reach out "
                "to our safety team or local authorities."
            ),
            "things_to_avoid": [
                "Don't engage further with this person",
                "Don't try to reason with or change them",
                "Don't blame yourself for their behavior",
                "Don't share personal information",
            ],
            "follow_up_recommendations": [
                "Report this user to our safety team",
                "Consider blocking them",
                "Talk to someone you trust about this experience",
                "If you feel unsafe, contact local authorities",
            ],
            "safety_alert": True,
            "safety_resources": [
                "National Domestic Violence Hotline: 1-800-799-7233",
                "Crisis Text Line: Text HOME to 741741",
                "Report this user through Settings > Safety > Report User",
            ],
        }

    def _get_victim_support_response(
        self, victim_check: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Return supportive response when user appears to be a victim.

        We NEVER blame victims or suggest they could have done something differently.
        """
        return {
            "analysis": {
                "conflict_type": "potential_harm",
                "severity": "significant",
                "safety_concern_detected": True,
                "safety_escalation_reason": victim_check["reason"],
                "recoverable": False,
                "recovery_likelihood": 0.0,
                "trigger_message_index": 0,
                "trigger_explanation": "You may be experiencing concerning behavior.",
                "misunderstanding_points": [],
                "user_perspective": {
                    "likely_intent": "Seeking help and understanding",
                    "perceived_as": "Someone who deserves support",
                    "emotional_state": "Possibly distressed",
                    "valid_concerns": ["Your feelings are valid", "Your safety matters"],
                    "potential_blind_spots": [],
                },
                "match_perspective": {
                    "likely_intent": "N/A",
                    "perceived_as": "N/A",
                    "emotional_state": "N/A",
                    "valid_concerns": [],
                    "potential_blind_spots": [],
                },
                "common_ground": [],
                "core_issue": "You may be experiencing treatment that isn't okay.",
            },
            "mediation_suggestions": [],
            "de_escalation_templates": [],
            "apology_template": None,
            "conversation_reset": None,
            "graceful_exit": {
                "exit_message": (
                    "This isn't working for me. Take care."
                ),
                "reasoning": (
                    "You have every right to end a conversation that makes you uncomfortable. "
                    "You don't need to explain yourself."
                ),
                "preserves_dignity": True,
                "leaves_door_open": False,
            },
            "perspective_explanation": (
                "What you're describing sounds difficult. Please know that how "
                "you're being treated isn't your fault. You deserve respect."
            ),
            "immediate_action": (
                "Trust your instincts. If something feels wrong, it probably is. "
                "You can block or report this person at any time."
            ),
            "things_to_avoid": [
                "Don't feel obligated to explain yourself",
                "Don't feel guilty for setting boundaries",
                "Don't blame yourself for their behavior",
            ],
            "follow_up_recommendations": [
                "Trust your feelings - they're valid",
                "Talk to a friend or trusted person",
                "Use our block and report features if needed",
                "Remember: you deserve to feel safe and respected",
            ],
            "safety_alert": True,
            "safety_resources": [
                "National Domestic Violence Hotline: 1-800-799-7233",
                "Crisis Text Line: Text HOME to 741741",
                "Report this user: Settings > Safety > Report User",
            ],
        }

    def _get_safety_suggestions(self) -> List[Dict[str, Any]]:
        """Return safety-focused suggestions (not mediation)."""
        return [
            {
                "id": "safety_block",
                "for_user": True,
                "suggestion_type": "safety",
                "message_template": "Block this user",
                "explanation": (
                    "Your safety is more important than continuing this conversation."
                ),
                "tone_guidance": "Trust your instincts",
                "priority": 1,
            },
            {
                "id": "safety_report",
                "for_user": True,
                "suggestion_type": "safety",
                "message_template": "Report to safety team",
                "explanation": (
                    "Help us protect others by reporting concerning behavior."
                ),
                "tone_guidance": "You're helping make the platform safer",
                "priority": 1,
            },
        ]

    # ========================================================================
    # ANALYSIS METHODS
    # ========================================================================

    def _analyze_tension(
        self, conversation_history: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Analyze conversation for signs of tension without using AI."""
        if len(conversation_history) < 3:
            return {"has_tension": False, "early_signs": [], "sentiment_shifted": False}

        early_signs = []
        has_tension = False
        sentiment_shifted = False

        # Check for negative sentiment indicators
        negative_indicators = [
            "whatever", "fine", "ok", "sure", "...",
            "forget it", "never mind", "nvm", "k",
            "didn't mean", "not what I", "misunderstood",
            "calm down", "relax", "chill",
        ]

        # Check for defensive language
        defensive_indicators = [
            "I didn't say", "that's not what",
            "you're twisting", "stop putting words",
            "I never said", "don't accuse",
        ]

        # Track sentiment shift
        recent_msgs = conversation_history[-5:]
        earlier_msgs = conversation_history[-10:-5] if len(conversation_history) > 5 else []

        # Calculate negative word density
        def get_negativity(msgs):
            total_words = sum(len(m.get("text", "").split()) for m in msgs)
            negative_words = sum(
                1 for m in msgs
                for ind in negative_indicators + defensive_indicators
                if ind in m.get("text", "").lower()
            )
            return negative_words / max(total_words, 1)

        recent_negativity = get_negativity(recent_msgs)
        earlier_negativity = get_negativity(earlier_msgs) if earlier_msgs else 0

        if recent_negativity > earlier_negativity * 1.5 and recent_negativity > 0.05:
            sentiment_shifted = True
            early_signs.append("Negative sentiment has increased recently")

        # Check for specific tension indicators
        for msg in recent_msgs:
            text = msg.get("text", "").lower()

            for indicator in negative_indicators:
                if indicator in text:
                    early_signs.append(f"Detected tension indicator: '{indicator}'")
                    has_tension = True
                    break

            for indicator in defensive_indicators:
                if indicator in text:
                    early_signs.append("Defensive language detected")
                    has_tension = True
                    break

            # Check for short, abrupt responses
            if len(text) < 5 and text not in ["yes", "no", "ok"]:
                early_signs.append("Short, potentially curt responses")

        # Check response time changes (if timestamps available)
        # (Would need timestamp data to implement)

        return {
            "has_tension": has_tension,
            "early_signs": list(set(early_signs))[:3],  # Dedupe and limit
            "sentiment_shifted": sentiment_shifted,
        }

    def _find_trigger_point(
        self, conversation_history: List[Dict[str, Any]]
    ) -> int:
        """Find the message index where conflict likely started."""
        if len(conversation_history) < 3:
            return 0

        # Look for sentiment shift
        for i in range(2, len(conversation_history)):
            prev_msg = conversation_history[i - 1].get("text", "").lower()
            curr_msg = conversation_history[i].get("text", "").lower()

            # Check for defensive responses
            defensive = [
                "that's not what", "i didn't", "you're wrong",
                "stop", "calm down", "excuse me",
            ]

            for phrase in defensive:
                if phrase in curr_msg:
                    return i - 1  # Return the message that triggered defense

        # Default to 1/3 into conversation if no clear trigger
        return max(0, len(conversation_history) // 3)

    async def _ai_conflict_detection(
        self,
        conversation_history: List[Dict[str, Any]],
        sensitivity: str,
    ) -> Dict[str, Any]:
        """Use AI to detect and classify conflict."""
        system_prompt = """You are analyzing a dating conversation for signs of conflict or tension.

Analyze carefully for:
1. Is there genuine conflict or just normal conversation dynamics?
2. If conflict exists, what type? (miscommunication, tone_misread, boundary_issue, expectation_mismatch, unintentional_offense)
3. How severe? (minor, moderate, significant, severe)
4. Where did it start (message index)?
5. What are early warning signs?

Be careful NOT to over-detect conflict. Normal conversations have ups and downs.
Focus on genuine tension, not just disagreement or different opinions.

IMPORTANT: Never blame anyone. Be neutral and empathetic to both sides."""

        conv_text = self._format_conversation(conversation_history[-15:])

        user_prompt = f"""Analyze this conversation for conflict/tension:

{conv_text}

Sensitivity: {sensitivity}

Return JSON:
{{
    "conflict_detected": true/false,
    "confidence": 0.0-1.0,
    "conflict_type": "type or null",
    "severity": "severity or null",
    "trigger_message_index": number or null,
    "early_warning_signs": ["sign1", "sign2"],
    "sentiment_shift_detected": true/false,
    "recommendation": "what to do"
}}"""

        try:
            response = await self.ai_provider.generate_structured_completion(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                output_format="json",
                temperature=0.3,  # Lower temperature for consistent analysis
            )
            return json.loads(response)
        except Exception as e:
            logger.error(f"AI conflict detection failed: {e}")
            return {"conflict_detected": False, "confidence": 0.5}

    async def _ai_conflict_analysis(
        self,
        conversation_history: List[Dict[str, Any]],
        conflict_start_index: int,
        user_perspective: Optional[str],
        match_perspective: Optional[str],
    ) -> Dict[str, Any]:
        """Use AI for deep conflict analysis."""
        system_prompt = """You are an expert relationship mediator analyzing a conflict in a dating conversation.

Your job is to:
1. Understand both perspectives empathetically
2. Identify specific misunderstanding points
3. Find common ground
4. Determine if the conflict is recoverable
5. NEVER blame either party

Key principles:
- Text-based communication loses tone, so misinterpretation is common
- Both people usually have valid feelings
- Focus on understanding, not judging
- Consider cultural and communication style differences

IMPORTANT: Be balanced and fair. Don't take sides."""

        conv_text = self._format_conversation(conversation_history)

        user_prompt = f"""Analyze this conflict:

CONVERSATION:
{conv_text}

Conflict appears to start at message index: {conflict_start_index}

User's perspective: {user_perspective or "Not provided"}
Match's perspective: {match_perspective or "Not provided"}

Provide deep analysis as JSON:
{{
    "conflict_type": "miscommunication/tone_misread/boundary_issue/expectation_mismatch/unintentional_offense/value_difference/timing_conflict",
    "secondary_types": [],
    "severity": "minor/moderate/significant/severe",
    "trigger_message_index": {conflict_start_index},
    "trigger_explanation": "why this triggered tension",
    "misunderstanding_points": [
        {{
            "message_index": number,
            "original_text": "the message",
            "likely_intended_meaning": "what they meant",
            "likely_perceived_meaning": "how it was received",
            "why_misunderstood": "explanation",
            "contributing_factors": ["factor1", "factor2"]
        }}
    ],
    "user_perspective": {{
        "likely_intent": "what user intended",
        "perceived_as": "how match perceived it",
        "emotional_state": "user's likely emotions",
        "valid_concerns": ["concern1", "concern2"],
        "potential_blind_spots": ["blindspot1"]
    }},
    "match_perspective": {{
        "likely_intent": "what match intended",
        "perceived_as": "how user perceived it",
        "emotional_state": "match's likely emotions",
        "valid_concerns": ["concern1", "concern2"],
        "potential_blind_spots": ["blindspot1"]
    }},
    "common_ground": ["shared value1", "shared interest2"],
    "core_issue": "the fundamental issue",
    "recoverable": true/false,
    "recovery_likelihood": 0.0-1.0,
    "safety_concern_detected": false,
    "safety_escalation_reason": null
}}"""

        try:
            response = await self.ai_provider.generate_structured_completion(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                output_format="json",
                temperature=0.5,
            )
            return json.loads(response)
        except Exception as e:
            logger.error(f"AI conflict analysis failed: {e}")
            return self._get_fallback_analysis(conversation_history)

    # ========================================================================
    # SUGGESTION GENERATION METHODS
    # ========================================================================

    async def _ai_mediation_suggestions(
        self,
        analysis: Dict[str, Any],
        desired_outcome: str,
    ) -> List[Dict[str, Any]]:
        """Generate AI-powered mediation suggestions."""
        system_prompt = """You are generating mediation suggestions for a dating conversation conflict.

Create helpful, empathetic suggestions that:
1. Acknowledge feelings without placing blame
2. Provide specific, actionable message templates
3. Consider the other person's perspective
4. Are appropriate for the relationship stage (early dating)

Match the suggestions to the desired outcome:
- "reconcile": Focus on repairing and moving forward
- "understand": Focus on gaining clarity
- "end_gracefully": Focus on dignified exit

NEVER suggest anything that:
- Places blame on either party
- Is passive-aggressive
- Escalates the conflict
- Pressures either party"""

        user_prompt = f"""Conflict analysis:
Type: {analysis.get('conflict_type', 'miscommunication')}
Severity: {analysis.get('severity', 'moderate')}
Core issue: {analysis.get('core_issue', 'misunderstanding')}
User perspective: {json.dumps(analysis.get('user_perspective', {}))}
Match perspective: {json.dumps(analysis.get('match_perspective', {}))}

Desired outcome: {desired_outcome}

Generate 3-4 mediation suggestions as JSON:
[
    {{
        "id": "unique_id",
        "for_user": true,
        "suggestion_type": "apology/clarification/acknowledgment/boundary_setting/conversation_reset",
        "message_template": "The actual message to send",
        "personalized_message": "More specific version if possible",
        "explanation": "Why this helps",
        "tone_guidance": "How to deliver this",
        "timing_advice": "When to send",
        "expected_response": "Likely reaction",
        "if_response_negative": "What to do then",
        "priority": 1-5
    }}
]"""

        try:
            response = await self.ai_provider.generate_structured_completion(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                output_format="json",
                temperature=0.7,
            )
            suggestions = json.loads(response)
            # Ensure IDs are unique
            for i, s in enumerate(suggestions):
                s["id"] = f"ai_suggestion_{self._get_suggestion_id()}_{i}"
            return suggestions
        except Exception as e:
            logger.error(f"AI mediation suggestions failed: {e}")
            return []

    def _get_clarification_suggestions(
        self, analysis: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Get suggestions for clarification-type conflicts."""
        return [
            {
                "id": f"clarify_{self._get_suggestion_id()}",
                "for_user": True,
                "suggestion_type": "clarification",
                "message_template": (
                    "Hey, I think there might have been a miscommunication. "
                    "What I meant was [your intended meaning]. "
                    "I'm sorry if it came across differently!"
                ),
                "explanation": (
                    "Directly addressing the miscommunication while taking "
                    "responsibility for how it was received shows maturity."
                ),
                "tone_guidance": "Warm and genuine, not defensive",
                "priority": 2,
            },
            {
                "id": f"ask_clarify_{self._get_suggestion_id()}",
                "for_user": True,
                "suggestion_type": "clarification",
                "message_template": (
                    "I want to make sure I understood you correctly - "
                    "did you mean [your interpretation]? I don't want to assume!"
                ),
                "explanation": (
                    "Asking for clarification shows you care about "
                    "understanding them correctly."
                ),
                "tone_guidance": "Curious and open, not accusatory",
                "priority": 2,
            },
        ]

    def _get_boundary_suggestions(
        self, analysis: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Get suggestions for boundary-related conflicts."""
        return [
            {
                "id": f"boundary_{self._get_suggestion_id()}",
                "for_user": True,
                "suggestion_type": "boundary_setting",
                "message_template": (
                    "I appreciate you sharing, and I hope you can understand "
                    "that [topic] is something I'm not comfortable discussing yet. "
                    "I'd love to keep getting to know you in other ways though!"
                ),
                "explanation": (
                    "Setting boundaries kindly while showing continued interest "
                    "maintains the connection while protecting yourself."
                ),
                "tone_guidance": "Firm but warm, not accusatory",
                "priority": 1,
            },
            {
                "id": f"boundary_ack_{self._get_suggestion_id()}",
                "for_user": True,
                "suggestion_type": "acknowledgment",
                "message_template": (
                    "I realize I might have pushed a bit too hard on that topic. "
                    "I respect your boundaries and appreciate you letting me know. "
                    "What would you like to talk about instead?"
                ),
                "explanation": (
                    "Acknowledging when you've crossed a boundary and "
                    "giving them control of the topic shows respect."
                ),
                "tone_guidance": "Humble and respectful",
                "priority": 1,
            },
        ]

    def _get_apology_suggestions(
        self, analysis: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Get suggestions for apology-related conflicts."""
        return [
            {
                "id": f"apology_{self._get_suggestion_id()}",
                "for_user": True,
                "suggestion_type": "apology",
                "message_template": (
                    "I've been thinking about what I said, and I realize it "
                    "might have come across as [negative interpretation]. "
                    "That wasn't my intention at all, and I'm sorry. "
                    "What I actually meant was [true intention]."
                ),
                "explanation": (
                    "A good apology acknowledges impact, explains (without excusing), "
                    "and shows you've reflected."
                ),
                "tone_guidance": "Sincere and humble, not defensive",
                "priority": 1,
            },
        ]

    def _get_alignment_suggestions(
        self, analysis: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Get suggestions for expectation mismatch conflicts."""
        return [
            {
                "id": f"align_{self._get_suggestion_id()}",
                "for_user": True,
                "suggestion_type": "clarification",
                "message_template": (
                    "I think we might be on different pages about [topic]. "
                    "I'd love to understand where you're coming from. "
                    "What are you hoping for with this?"
                ),
                "explanation": (
                    "Directly but gently addressing different expectations "
                    "prevents bigger misunderstandings later."
                ),
                "tone_guidance": "Open and curious, not judgmental",
                "priority": 2,
            },
        ]

    def _get_de_escalation_templates(
        self, analysis: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Get de-escalation message templates."""
        severity = analysis.get("severity", "moderate")

        templates = []

        if severity in ["significant", "severe"]:
            templates.append({
                "template_type": "cooling_off",
                "message": (
                    "I think we're both a little heated right now. "
                    "Can we take a breather and come back to this?"
                ),
                "explanation": "Acknowledges emotion and suggests a pause without blame.",
                "when_to_use": "When emotions are running high for both parties",
            })

        templates.append({
            "template_type": "acknowledgment",
            "message": (
                "I hear that you're [frustrated/upset/hurt]. "
                "That wasn't what I intended, and I want to understand your perspective better."
            ),
            "explanation": "Validates their feelings and shows openness.",
            "when_to_use": "When the other person seems upset",
        })

        templates.append({
            "template_type": "bridge_building",
            "message": (
                "I feel like we both want this conversation to go well. "
                "Can we start this part over?"
            ),
            "explanation": "Reminds both parties of shared goals.",
            "when_to_use": "When you want to reset and move forward",
        })

        return templates

    def _get_graceful_exit(
        self,
        analysis: Dict[str, Any],
        desired_outcome: str,
    ) -> Optional[Dict[str, Any]]:
        """Get graceful exit suggestion when appropriate."""
        severity = analysis.get("severity", "moderate")
        recoverable = analysis.get("recoverable", True)

        # Always provide exit option for severe conflicts
        if severity == "severe" or not recoverable or desired_outcome == "end_gracefully":
            leaves_door_open = desired_outcome != "end_gracefully" and recoverable

            if leaves_door_open:
                return {
                    "exit_message": (
                        "I think we might not be the best fit right now. "
                        "I've enjoyed getting to know you though. Take care!"
                    ),
                    "reasoning": (
                        "Sometimes ending gracefully is the mature choice. "
                        "It preserves dignity and leaves a positive impression."
                    ),
                    "preserves_dignity": True,
                    "leaves_door_open": True,
                }
            else:
                return {
                    "exit_message": (
                        "I don't think this is working out. "
                        "I wish you well."
                    ),
                    "reasoning": (
                        "A clear, kind ending is sometimes the best option."
                    ),
                    "preserves_dignity": True,
                    "leaves_door_open": False,
                }

        return None

    # ========================================================================
    # HELPER METHODS
    # ========================================================================

    def _format_conversation(
        self, history: List[Dict[str, Any]]
    ) -> str:
        """Format conversation history for AI analysis."""
        lines = []
        for i, msg in enumerate(history):
            sender = "Match" if msg.get("is_match") else "User"
            text = msg.get("text", "")
            lines.append(f"[{i}] {sender}: {text}")
        return "\n".join(lines)

    def _get_suggestion_id(self) -> str:
        """Generate unique suggestion ID."""
        self._suggestion_counter += 1
        return f"{self._suggestion_counter}_{uuid.uuid4().hex[:8]}"

    def _should_apologize(self, analysis: Dict[str, Any]) -> bool:
        """Determine if an apology is appropriate."""
        conflict_type = analysis.get("conflict_type", "")
        return conflict_type in [
            "unintentional_offense",
            "boundary_issue",
            "tone_misread",
        ]

    def _prioritize_exit_suggestions(
        self, suggestions: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Reorder suggestions to prioritize exit options."""
        exit_suggestions = [
            s for s in suggestions
            if s.get("suggestion_type") in ["exit", "boundary_setting"]
        ]
        other_suggestions = [
            s for s in suggestions
            if s.get("suggestion_type") not in ["exit", "boundary_setting"]
        ]
        return exit_suggestions + other_suggestions

    async def _get_safe_topics(
        self, analysis: Dict[str, Any]
    ) -> List[str]:
        """Get safe topics to pivot to after conflict."""
        common_ground = analysis.get("common_ground", [])
        if common_ground:
            return [f"Shared interest: {topic}" for topic in common_ground[:3]]
        return [
            "Their weekend plans or recent activities",
            "Something light and fun from their profile",
            "A neutral current event or pop culture topic",
        ]

    def _build_perspective_explanation(
        self, analysis: Dict[str, Any]
    ) -> str:
        """Build explanation of the other person's perspective."""
        match_perspective = analysis.get("match_perspective", {})

        intent = match_perspective.get("likely_intent", "unclear")
        emotional_state = match_perspective.get("emotional_state", "unknown")
        valid_concerns = match_perspective.get("valid_concerns", [])

        explanation = f"They might have meant: {intent}. "

        if emotional_state:
            explanation += f"They were likely feeling {emotional_state}. "

        if valid_concerns:
            explanation += f"Their valid concerns include: {', '.join(valid_concerns)}. "

        explanation += (
            "Remember, text-based communication loses tone and nuance, "
            "so misinterpretation is very common."
        )

        return explanation

    def _determine_immediate_action(
        self,
        analysis: Dict[str, Any],
        desired_outcome: str,
    ) -> str:
        """Determine what the user should do right now."""
        severity = analysis.get("severity", "moderate")
        conflict_type = analysis.get("conflict_type", "miscommunication")

        if severity == "severe":
            return (
                "Take a break before responding. If needed, it's okay to step away "
                "from this conversation entirely."
            )

        if severity == "significant":
            return (
                "Pause and take a breath. Consider waiting a few hours before "
                "responding to let emotions settle."
            )

        if conflict_type == "tone_misread":
            return (
                "Consider adding more context or clarifying emojis to help "
                "convey your intended tone."
            )

        if conflict_type == "boundary_issue":
            return (
                "Acknowledge the boundary respectfully and pivot to a "
                "different topic."
            )

        return (
            "Send a message that acknowledges what happened and shows "
            "you want to understand their perspective."
        )

    def _get_things_to_avoid(
        self, analysis: Dict[str, Any]
    ) -> List[str]:
        """Get list of things to avoid doing."""
        things = [
            "Don't get defensive or dismissive",
            "Don't send multiple messages in a row",
            "Don't bring up past issues or keep score",
            "Don't use sarcasm - it often makes things worse in text",
        ]

        conflict_type = analysis.get("conflict_type", "")

        if conflict_type == "boundary_issue":
            things.append("Don't push back on their boundary or ask why")

        if conflict_type == "tone_misread":
            things.append("Don't say 'you're overreacting' or 'calm down'")

        return things

    def _get_follow_up_recommendations(
        self, analysis: Dict[str, Any]
    ) -> List[str]:
        """Get recommendations for after initial mediation."""
        recs = []

        severity = analysis.get("severity", "moderate")

        if severity in ["significant", "severe"]:
            recs.append("Give them space to respond - don't follow up too quickly")

        recs.extend([
            "If they respond positively, focus on rebuilding rapport slowly",
            "Consider suggesting a phone or video call to avoid future text misunderstandings",
            "Reflect on what you learned for future conversations",
        ])

        return recs

    def _merge_detection_results(
        self,
        local_analysis: Dict[str, Any],
        ai_analysis: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Merge local and AI analysis results."""
        return {
            "conflict_detected": (
                local_analysis.get("has_tension", False) or
                ai_analysis.get("conflict_detected", False)
            ),
            "confidence": ai_analysis.get("confidence", 0.5),
            "conflict_type": ai_analysis.get("conflict_type"),
            "severity": ai_analysis.get("severity"),
            "trigger_message_index": ai_analysis.get("trigger_message_index"),
            "early_warning_signs": (
                local_analysis.get("early_signs", []) +
                ai_analysis.get("early_warning_signs", [])
            )[:5],
            "sentiment_shift_detected": (
                local_analysis.get("sentiment_shifted", False) or
                ai_analysis.get("sentiment_shift_detected", False)
            ),
            "recommendation": ai_analysis.get("recommendation", "Monitor the conversation"),
            "safety_concern": False,
            "safety_reason": None,
        }

    # ========================================================================
    # FALLBACK METHODS
    # ========================================================================

    def _get_fallback_detection(self) -> Dict[str, Any]:
        """Return fallback detection result."""
        return {
            "conflict_detected": False,
            "confidence": 0.3,
            "conflict_type": None,
            "severity": None,
            "trigger_message_index": None,
            "early_warning_signs": [],
            "sentiment_shift_detected": False,
            "recommendation": "Continue the conversation naturally",
            "safety_concern": False,
            "safety_reason": None,
        }

    def _get_fallback_analysis(
        self, conversation_history: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Return fallback analysis result."""
        return {
            "conflict_type": "miscommunication",
            "secondary_types": [],
            "severity": "moderate",
            "trigger_message_index": max(0, len(conversation_history) - 3),
            "trigger_explanation": "Unable to determine specific trigger",
            "misunderstanding_points": [],
            "user_perspective": {
                "likely_intent": "Good intentions",
                "perceived_as": "Possibly unclear",
                "emotional_state": "Uncertain",
                "valid_concerns": [],
                "potential_blind_spots": [],
            },
            "match_perspective": {
                "likely_intent": "Good intentions",
                "perceived_as": "Possibly unclear",
                "emotional_state": "Uncertain",
                "valid_concerns": [],
                "potential_blind_spots": [],
            },
            "common_ground": ["Both want the conversation to go well"],
            "core_issue": "Possible miscommunication in text",
            "recoverable": True,
            "recovery_likelihood": 0.7,
            "safety_concern_detected": False,
            "safety_escalation_reason": None,
        }

    def _get_fallback_suggestions(self) -> List[Dict[str, Any]]:
        """Return fallback suggestions."""
        return [
            {
                "id": "fallback_clarify",
                "for_user": True,
                "suggestion_type": "clarification",
                "message_template": (
                    "Hey, I want to make sure we're on the same page - "
                    "could you help me understand what you meant?"
                ),
                "explanation": "Seeking understanding is always a good first step.",
                "tone_guidance": "Curious and genuine",
                "priority": 1,
            },
            {
                "id": "fallback_acknowledge",
                "for_user": True,
                "suggestion_type": "acknowledgment",
                "message_template": (
                    "I feel like we might have gotten our wires crossed. "
                    "I'd like to reset if you're up for it?"
                ),
                "explanation": "Acknowledging the issue without blame shows maturity.",
                "tone_guidance": "Open and warm",
                "priority": 2,
            },
        ]

    def _get_fallback_reset(self) -> Dict[str, Any]:
        """Return fallback reset suggestion."""
        return {
            "reset_type": "acknowledgment_reset",
            "suggested_message": (
                "I think we got our wires crossed somewhere. "
                "Can we start fresh?"
            ),
            "waiting_period": None,
            "new_topic_suggestions": [
                "Ask about something positive from their profile",
                "Share something light and fun about your day",
            ],
            "explanation": "A simple reset often works well for minor misunderstandings.",
        }

    def _get_fallback_mediation(self) -> Dict[str, Any]:
        """Return fallback mediation response."""
        return {
            "analysis": self._get_fallback_analysis([]),
            "mediation_suggestions": self._get_fallback_suggestions(),
            "de_escalation_templates": [
                {
                    "template_type": "acknowledgment",
                    "message": "I hear you, and I want to understand better.",
                    "explanation": "Validates their feelings",
                    "when_to_use": "When they seem upset",
                },
            ],
            "apology_template": None,
            "conversation_reset": self._get_fallback_reset(),
            "graceful_exit": None,
            "perspective_explanation": (
                "Text communication often loses tone and nuance. "
                "Most conflicts in early dating are simple misunderstandings."
            ),
            "immediate_action": (
                "Take a breath, then send a message showing you want to understand."
            ),
            "things_to_avoid": [
                "Don't get defensive",
                "Don't send multiple messages",
                "Don't use sarcasm",
            ],
            "follow_up_recommendations": [
                "Give them time to respond",
                "Focus on understanding, not being right",
            ],
            "safety_alert": False,
            "safety_resources": None,
        }

    def _get_abuse_analysis(
        self,
        safety_check: Dict[str, Any],
        conversation_history: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Return analysis for abusive situation."""
        return {
            "conflict_type": "abuse",
            "secondary_types": [],
            "severity": "critical",
            "trigger_message_index": safety_check.get("message_index", 0),
            "trigger_explanation": "Abusive content detected",
            "misunderstanding_points": [],
            "user_perspective": {
                "likely_intent": "N/A",
                "perceived_as": "N/A",
                "emotional_state": "Potentially unsafe",
                "valid_concerns": ["Personal safety"],
                "potential_blind_spots": [],
            },
            "match_perspective": {
                "likely_intent": "N/A",
                "perceived_as": "Harmful",
                "emotional_state": "N/A",
                "valid_concerns": [],
                "potential_blind_spots": [],
            },
            "common_ground": [],
            "core_issue": "This is not a misunderstanding - the behavior is not acceptable.",
            "recoverable": False,
            "recovery_likelihood": 0.0,
            "safety_concern_detected": True,
            "safety_escalation_reason": safety_check["reason"],
        }

    def _get_generic_apology_template(
        self, conflict_type: str
    ) -> Dict[str, Any]:
        """Return generic apology template."""
        return {
            "apology_message": (
                "I've been thinking about our conversation, and I realize "
                "what I said might have come across wrong. I'm sorry - "
                "that wasn't my intention."
            ),
            "what_to_acknowledge": [
                "The impact of your words, not just your intention",
                "Their feelings are valid",
            ],
            "what_not_to_say": [
                "'I'm sorry you feel that way' (invalidating)",
                "'I'm sorry, but...' (not a real apology)",
                "'You took it the wrong way' (blaming them)",
            ],
            "follow_up_action": "Ask how you can make things better",
            "explanation": (
                "A good apology acknowledges impact, takes responsibility, "
                "and shows you've reflected."
            ),
        }

    def _build_apology_system_prompt(self) -> str:
        """Build system prompt for apology generation."""
        return """You are helping someone craft a sincere apology for a dating conversation conflict.

A good apology:
1. Acknowledges the impact (not just the intention)
2. Takes responsibility without excuses
3. Shows understanding of why it hurt
4. Offers to make things better
5. Doesn't expect immediate forgiveness

A bad apology:
- "I'm sorry you feel that way" (invalidating)
- "I'm sorry, but..." (excusing)
- "You took it wrong" (blaming)
- Demanding forgiveness
- Over-apologizing

Create a sincere, balanced apology that takes responsibility while maintaining dignity."""

    def _build_apology_user_prompt(
        self,
        conflict_type: str,
        context: Dict[str, Any],
    ) -> str:
        """Build user prompt for apology generation."""
        return f"""Conflict type: {conflict_type}
Context: {json.dumps(context, indent=2)}

Generate an apology as JSON:
{{
    "apology": "The apology message itself",
    "acknowledge": ["thing to acknowledge 1", "thing to acknowledge 2"],
    "avoid": ["thing to avoid saying 1", "thing to avoid saying 2"],
    "follow_up": "Suggested follow-up action",
    "explanation": "Why this apology structure works"
}}"""
