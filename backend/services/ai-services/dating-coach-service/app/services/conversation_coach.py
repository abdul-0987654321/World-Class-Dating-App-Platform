"""
AI Conversation Coach Service
Provides real-time coaching during conversations.

This is a premium feature that gives users actionable,
contextual advice as they chat with their matches.

Features:
- Real-time coaching tips based on conversation flow
- Conversation health monitoring
- Topic suggestions based on shared interests
- Ghosting/fading detection with recovery tips
- Timing advice (when to ask for date, etc.)
- Personalized communication style coaching
"""

import logging
import json
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from enum import Enum
from dataclasses import dataclass
from app.services.ai_provider import AIProviderService

logger = logging.getLogger(__name__)


class CoachingTipType(str, Enum):
    """Types of coaching tips."""
    CONVERSATION_STARTER = "conversation_starter"
    TOPIC_SUGGESTION = "topic_suggestion"
    ENGAGEMENT_BOOST = "engagement_boost"
    ASK_QUESTION = "ask_question"
    SHARE_ABOUT_SELF = "share_about_self"
    FLIRTING_TIP = "flirting_tip"
    DATE_TIMING = "date_timing"
    RECOVERY_TIP = "recovery_tip"
    SLOW_DOWN = "slow_down"
    BALANCE_TIP = "balance_tip"
    GENERAL = "general"


class ConversationStage(str, Enum):
    """Stages of a conversation."""
    OPENING = "opening"              # First few messages
    GETTING_TO_KNOW = "getting_to_know"  # Building rapport
    BUILDING_RAPPORT = "building_rapport"  # Deeper connection
    READY_FOR_DATE = "ready_for_date"  # Time to ask out
    DATE_PLANNING = "date_planning"   # Planning the date
    STALLED = "stalled"              # Conversation has stalled
    FADING = "fading"                # Match may be losing interest


class ConversationHealth(str, Enum):
    """Health status of conversation."""
    THRIVING = "thriving"       # Great engagement, strong connection
    HEALTHY = "healthy"         # Good progress, balanced
    NEEDS_ATTENTION = "needs_attention"  # Could use improvement
    AT_RISK = "at_risk"         # Showing warning signs
    CRITICAL = "critical"       # Urgent intervention needed


@dataclass
class CoachingTip:
    """A single coaching tip."""
    id: str
    type: CoachingTipType
    title: str
    message: str
    action_text: Optional[str] = None
    example: Optional[str] = None
    priority: int = 1  # 1 = highest priority
    dismissable: bool = True


@dataclass
class ConversationHealthReport:
    """Health report for a conversation."""
    status: ConversationHealth
    stage: ConversationStage
    score: float  # 0-100
    strengths: List[str]
    areas_to_improve: List[str]
    risk_factors: List[str]
    predicted_outcome: str


class ConversationCoachService:
    """Service for real-time conversation coaching."""

    def __init__(self, ai_provider: AIProviderService):
        """Initialize conversation coach service."""
        self.ai_provider = ai_provider
        self._tip_id_counter = 0

    async def get_real_time_coaching(
        self,
        conversation_history: List[Dict[str, Any]],
        user_profile: Dict[str, Any],
        match_profile: Dict[str, Any],
        last_coaching_tips: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Get real-time coaching tips for the current conversation state.

        This is the main entry point for the coaching feature.
        Called whenever user opens a conversation or sends/receives a message.

        Args:
            conversation_history: List of messages with sender info
            user_profile: Current user's profile
            match_profile: Match's profile
            last_coaching_tips: IDs of recently shown tips (to avoid repetition)

        Returns:
            Dictionary with tips, health report, and suggested topics
        """
        try:
            # Calculate conversation metrics
            metrics = self._calculate_metrics(conversation_history)

            # Determine conversation stage
            stage = self._determine_stage(conversation_history, metrics)

            # Get health report
            health_report = self._assess_health(conversation_history, metrics, stage)

            # Generate coaching tips
            tips = await self._generate_tips(
                conversation_history,
                user_profile,
                match_profile,
                metrics,
                stage,
                health_report,
                last_coaching_tips or [],
            )

            # Generate topic suggestions
            topics = self._suggest_topics(user_profile, match_profile, conversation_history)

            # Check for ghosting signals
            ghosting_analysis = self._analyze_ghosting_risk(conversation_history, metrics)

            return {
                "tips": [self._tip_to_dict(tip) for tip in tips[:3]],  # Top 3 tips
                "health": {
                    "status": health_report.status.value,
                    "stage": health_report.stage.value,
                    "score": health_report.score,
                    "strengths": health_report.strengths,
                    "areas_to_improve": health_report.areas_to_improve,
                },
                "suggested_topics": topics[:5],
                "ghosting_risk": ghosting_analysis,
                "metrics": metrics,
                "ready_to_ask_out": stage == ConversationStage.READY_FOR_DATE,
            }

        except Exception as e:
            logger.error(f"Real-time coaching failed: {e}", exc_info=True)
            return self._get_fallback_coaching(conversation_history)

    async def get_next_message_advice(
        self,
        conversation_history: List[Dict[str, Any]],
        user_profile: Dict[str, Any],
        match_profile: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Get specific advice for the next message to send.

        Called when user taps "Help me reply" button.
        """
        try:
            last_message = conversation_history[-1] if conversation_history else None

            if not last_message or not last_message.get("is_match"):
                # User sent last message - wait for reply
                return {
                    "advice": "Wait for their response before sending another message.",
                    "why": "Sending multiple messages in a row can come across as too eager.",
                    "alternatives": [
                        "If it's been more than 24 hours, a light follow-up is okay.",
                        "Use this time to think of interesting topics to discuss.",
                    ],
                }

            # Match sent last message - provide reply advice
            system_prompt = self._build_reply_advice_prompt()
            user_prompt = self._build_reply_context(
                conversation_history, user_profile, match_profile
            )

            response = await self.ai_provider.generate_structured_completion(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                output_format="json",
                temperature=0.7,
            )

            result = json.loads(response)

            return {
                "advice": result.get("advice", ""),
                "why": result.get("reasoning", ""),
                "do": result.get("do", []),
                "dont": result.get("dont", []),
                "example_responses": result.get("examples", []),
                "tone_suggestion": result.get("tone", "friendly"),
            }

        except Exception as e:
            logger.error(f"Next message advice failed: {e}")
            return {
                "advice": "Respond to what they said and ask a follow-up question.",
                "why": "This shows you're interested and keeps the conversation flowing.",
                "do": ["Acknowledge their message", "Ask about their interests"],
                "dont": ["Give one-word answers", "Only talk about yourself"],
                "example_responses": [],
            }

    async def get_date_ask_coaching(
        self,
        conversation_history: List[Dict[str, Any]],
        user_profile: Dict[str, Any],
        match_profile: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Get coaching for asking match on a date.

        Provides timing advice, script suggestions, and venue ideas.
        """
        try:
            metrics = self._calculate_metrics(conversation_history)
            stage = self._determine_stage(conversation_history, metrics)

            # Check if it's the right time
            readiness = self._assess_date_readiness(conversation_history, metrics)

            if readiness["score"] < 0.5:
                return {
                    "ready": False,
                    "readiness_score": readiness["score"],
                    "why_not_yet": readiness["reasons"],
                    "what_to_do_first": readiness["prerequisites"],
                    "estimated_messages_until_ready": readiness["messages_needed"],
                }

            # Generate date ask suggestions
            system_prompt = self._build_date_ask_prompt()
            user_prompt = self._build_date_context(
                conversation_history, user_profile, match_profile
            )

            response = await self.ai_provider.generate_structured_completion(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                output_format="json",
                temperature=0.8,
            )

            result = json.loads(response)

            return {
                "ready": True,
                "readiness_score": readiness["score"],
                "timing_advice": result.get("timing", "Now is a good time to ask!"),
                "approach_suggestions": result.get("approaches", []),
                "venue_ideas": result.get("venues", []),
                "example_messages": result.get("examples", []),
                "what_to_avoid": result.get("avoid", []),
            }

        except Exception as e:
            logger.error(f"Date ask coaching failed: {e}")
            return self._get_fallback_date_coaching()

    def _calculate_metrics(self, history: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculate conversation metrics."""
        if not history:
            return {
                "message_count": 0,
                "user_messages": 0,
                "match_messages": 0,
                "balance": 0.5,
                "avg_message_length_user": 0,
                "avg_message_length_match": 0,
                "question_ratio_user": 0,
                "question_ratio_match": 0,
                "response_time_avg_minutes": None,
                "last_message_hours_ago": None,
                "conversation_days": 0,
            }

        user_msgs = [m for m in history if not m.get("is_match", False)]
        match_msgs = [m for m in history if m.get("is_match", False)]

        total = len(history)
        user_count = len(user_msgs)
        match_count = len(match_msgs)

        # Balance (0.5 = perfect)
        balance = user_count / total if total > 0 else 0.5

        # Average message length
        user_avg_len = (
            sum(len(m.get("text", "")) for m in user_msgs) / user_count
            if user_count > 0 else 0
        )
        match_avg_len = (
            sum(len(m.get("text", "")) for m in match_msgs) / match_count
            if match_count > 0 else 0
        )

        # Question ratio
        user_questions = sum(
            1 for m in user_msgs if "?" in m.get("text", "")
        )
        match_questions = sum(
            1 for m in match_msgs if "?" in m.get("text", "")
        )

        user_q_ratio = user_questions / user_count if user_count > 0 else 0
        match_q_ratio = match_questions / match_count if match_count > 0 else 0

        # Time-based metrics
        last_msg_hours = None
        conv_days = 0
        response_time = None

        if history[-1].get("timestamp"):
            last_ts = history[-1]["timestamp"]
            if isinstance(last_ts, (int, float)):
                last_msg_hours = (datetime.now().timestamp() - last_ts) / 3600

            first_ts = history[0].get("timestamp")
            if first_ts:
                conv_days = (last_ts - first_ts) / 86400

        return {
            "message_count": total,
            "user_messages": user_count,
            "match_messages": match_count,
            "balance": round(balance, 2),
            "avg_message_length_user": round(user_avg_len),
            "avg_message_length_match": round(match_avg_len),
            "question_ratio_user": round(user_q_ratio, 2),
            "question_ratio_match": round(match_q_ratio, 2),
            "response_time_avg_minutes": response_time,
            "last_message_hours_ago": round(last_msg_hours, 1) if last_msg_hours else None,
            "conversation_days": round(conv_days, 1),
        }

    def _determine_stage(
        self, history: List[Dict[str, Any]], metrics: Dict[str, Any]
    ) -> ConversationStage:
        """Determine the current stage of the conversation."""
        msg_count = metrics["message_count"]
        last_hours = metrics.get("last_message_hours_ago")

        # Check for stalled/fading
        if last_hours and last_hours > 48:
            return ConversationStage.STALLED
        if last_hours and last_hours > 24 and msg_count > 5:
            return ConversationStage.FADING

        # Stage based on message count and content
        if msg_count < 4:
            return ConversationStage.OPENING
        elif msg_count < 10:
            return ConversationStage.GETTING_TO_KNOW
        elif msg_count < 20:
            return ConversationStage.BUILDING_RAPPORT
        else:
            # Check for date-related keywords
            recent_text = " ".join(
                m.get("text", "").lower() for m in history[-10:]
            )
            date_keywords = ["meet", "date", "coffee", "drink", "dinner", "hang out", "plans"]
            if any(kw in recent_text for kw in date_keywords):
                return ConversationStage.DATE_PLANNING
            return ConversationStage.READY_FOR_DATE

    def _assess_health(
        self,
        history: List[Dict[str, Any]],
        metrics: Dict[str, Any],
        stage: ConversationStage,
    ) -> ConversationHealthReport:
        """Assess the health of the conversation."""
        score = 70  # Start at 70 (healthy baseline)
        strengths = []
        areas = []
        risks = []

        # Balance check
        balance = metrics["balance"]
        if 0.4 <= balance <= 0.6:
            score += 10
            strengths.append("Good conversation balance")
        elif balance < 0.3 or balance > 0.7:
            score -= 15
            areas.append("Conversation is one-sided")
            if balance < 0.3:
                risks.append("You may be sending too few messages")
            else:
                risks.append("You may be over-messaging")

        # Response rate (if match is responding)
        if metrics["match_messages"] > 0:
            response_rate = metrics["match_messages"] / max(metrics["user_messages"], 1)
            if response_rate > 0.8:
                score += 10
                strengths.append("Match is engaged and responsive")
            elif response_rate < 0.5:
                score -= 10
                risks.append("Match response rate is low")

        # Question asking
        if metrics["question_ratio_user"] > 0.3:
            strengths.append("You're showing interest by asking questions")
        elif metrics["question_ratio_user"] < 0.1 and metrics["message_count"] > 5:
            score -= 5
            areas.append("Try asking more questions")

        if metrics["question_ratio_match"] > 0.2:
            score += 5
            strengths.append("Match is asking about you")

        # Message length
        if metrics["avg_message_length_match"] > 50:
            score += 5
            strengths.append("Match sends thoughtful messages")
        elif metrics["avg_message_length_match"] < 20 and metrics["match_messages"] > 3:
            score -= 10
            risks.append("Match may be giving short, disengaged responses")

        # Stage-based adjustments
        if stage == ConversationStage.STALLED:
            score -= 20
            risks.append("Conversation has gone quiet")
        elif stage == ConversationStage.FADING:
            score -= 10
            risks.append("Response times are increasing")
        elif stage == ConversationStage.READY_FOR_DATE:
            if metrics["message_count"] > 30:
                areas.append("Consider suggesting a meetup soon")

        # Determine status
        if score >= 85:
            status = ConversationHealth.THRIVING
            outcome = "Strong potential for a real connection"
        elif score >= 70:
            status = ConversationHealth.HEALTHY
            outcome = "Good progress, keep the momentum going"
        elif score >= 55:
            status = ConversationHealth.NEEDS_ATTENTION
            outcome = "Some improvements could help"
        elif score >= 40:
            status = ConversationHealth.AT_RISK
            outcome = "Conversation may need a reset or boost"
        else:
            status = ConversationHealth.CRITICAL
            outcome = "Consider if this match is right for you"

        return ConversationHealthReport(
            status=status,
            stage=stage,
            score=max(0, min(100, score)),
            strengths=strengths,
            areas_to_improve=areas,
            risk_factors=risks,
            predicted_outcome=outcome,
        )

    async def _generate_tips(
        self,
        history: List[Dict[str, Any]],
        user_profile: Dict[str, Any],
        match_profile: Dict[str, Any],
        metrics: Dict[str, Any],
        stage: ConversationStage,
        health: ConversationHealthReport,
        excluded_tip_ids: List[str],
    ) -> List[CoachingTip]:
        """Generate contextual coaching tips."""
        tips = []

        # Stage-based tips
        if stage == ConversationStage.OPENING:
            tips.append(self._create_tip(
                CoachingTipType.CONVERSATION_STARTER,
                "Start with curiosity",
                "Reference something specific from their profile to show genuine interest.",
                example=f"I noticed you're into {match_profile.get('interests', ['hiking'])[0]}! What got you started?",
                priority=1,
            ))

        elif stage == ConversationStage.GETTING_TO_KNOW:
            if metrics["question_ratio_user"] < 0.2:
                tips.append(self._create_tip(
                    CoachingTipType.ASK_QUESTION,
                    "Show more curiosity",
                    "Ask open-ended questions about their experiences and passions.",
                    example="What's the best trip you've ever taken?",
                    priority=1,
                ))

        elif stage == ConversationStage.BUILDING_RAPPORT:
            tips.append(self._create_tip(
                CoachingTipType.SHARE_ABOUT_SELF,
                "Share a story",
                "Vulnerability builds connection. Share something personal but light.",
                priority=2,
            ))

        elif stage == ConversationStage.READY_FOR_DATE:
            tips.append(self._create_tip(
                CoachingTipType.DATE_TIMING,
                "Great time to suggest meeting!",
                "You've built rapport. Suggest a casual, low-pressure date idea.",
                example="I've really enjoyed chatting with you! Would you want to grab coffee sometime this week?",
                action_text="Get date ideas",
                priority=1,
            ))

        elif stage == ConversationStage.STALLED:
            tips.append(self._create_tip(
                CoachingTipType.RECOVERY_TIP,
                "Revive the conversation",
                "It's been quiet - try a fun, low-pressure message to restart.",
                example="Hey! Just saw [something relevant] and thought of you. How's your week going?",
                priority=1,
            ))

        elif stage == ConversationStage.FADING:
            tips.append(self._create_tip(
                CoachingTipType.RECOVERY_TIP,
                "Keep the momentum",
                "Responses are slowing down. Try engaging with something they're passionate about.",
                priority=1,
            ))

        # Health-based tips
        if health.status == ConversationHealth.NEEDS_ATTENTION:
            if metrics["balance"] > 0.6:
                tips.append(self._create_tip(
                    CoachingTipType.SLOW_DOWN,
                    "Match their energy",
                    "You're sending more messages. Wait for their replies before sending more.",
                    priority=2,
                ))

        # Filter out recently shown tips
        tips = [t for t in tips if t.id not in excluded_tip_ids]

        # Sort by priority
        tips.sort(key=lambda t: t.priority)

        return tips

    def _suggest_topics(
        self,
        user_profile: Dict[str, Any],
        match_profile: Dict[str, Any],
        history: List[Dict[str, Any]],
    ) -> List[Dict[str, str]]:
        """Suggest conversation topics based on profiles."""
        topics = []

        # Find shared interests
        user_interests = set(i.lower() for i in user_profile.get("interests", []))
        match_interests = set(i.lower() for i in match_profile.get("interests", []))
        shared = user_interests & match_interests

        for interest in list(shared)[:3]:
            topics.append({
                "topic": interest.title(),
                "type": "shared_interest",
                "prompt": f"You both love {interest}! Ask about their favorite aspect.",
            })

        # Match's unique interests
        match_unique = match_interests - user_interests
        for interest in list(match_unique)[:2]:
            topics.append({
                "topic": interest.title(),
                "type": "learn_about_them",
                "prompt": f"They're into {interest}. Ask them to tell you more!",
            })

        # Check what's been discussed
        discussed = set()
        for msg in history:
            text = msg.get("text", "").lower()
            for interest in match_interests:
                if interest in text:
                    discussed.add(interest)

        # Prioritize undiscussed topics
        undiscussed = [t for t in topics if t["topic"].lower() not in discussed]

        if not topics:
            # Default topics
            topics = [
                {"topic": "Weekend plans", "type": "general", "prompt": "Ask about their upcoming weekend!"},
                {"topic": "Favorite places", "type": "general", "prompt": "Ask about their favorite local spots."},
                {"topic": "Travel dreams", "type": "general", "prompt": "Ask where they'd love to visit."},
            ]

        return undiscussed if undiscussed else topics

    def _analyze_ghosting_risk(
        self, history: List[Dict[str, Any]], metrics: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Analyze risk of being ghosted."""
        risk_level = "low"
        signals = []

        last_hours = metrics.get("last_message_hours_ago")

        # Time-based signals
        if last_hours:
            if last_hours > 72:
                risk_level = "high"
                signals.append("No response in over 3 days")
            elif last_hours > 48:
                risk_level = "medium"
                signals.append("No response in over 2 days")
            elif last_hours > 24:
                signals.append("Longer than usual response time")

        # Message length declining
        if metrics["match_messages"] >= 3:
            match_msgs = [m for m in history if m.get("is_match")][-5:]
            if len(match_msgs) >= 3:
                lengths = [len(m.get("text", "")) for m in match_msgs]
                if lengths[-1] < lengths[0] * 0.5:
                    signals.append("Match's messages getting shorter")
                    if risk_level == "low":
                        risk_level = "medium"

        # Question ratio dropping
        if metrics["question_ratio_match"] < 0.1 and metrics["match_messages"] > 5:
            signals.append("Match stopped asking questions")
            if risk_level == "low":
                risk_level = "medium"

        # One-word responses
        recent_match = [m for m in history[-5:] if m.get("is_match")]
        short_replies = sum(1 for m in recent_match if len(m.get("text", "")) < 10)
        if short_replies >= 2:
            signals.append("Match giving very short replies")
            risk_level = "high" if risk_level == "medium" else "medium"

        return {
            "risk_level": risk_level,
            "signals": signals,
            "recommendation": self._get_ghosting_recommendation(risk_level, signals),
        }

    def _get_ghosting_recommendation(
        self, risk_level: str, signals: List[str]
    ) -> str:
        """Get recommendation based on ghosting risk."""
        if risk_level == "high":
            return (
                "Consider sending one light, fun message. If no response, "
                "it might be time to focus on other matches."
            )
        elif risk_level == "medium":
            return (
                "Try engaging with a question about something they're passionate about. "
                "Avoid double-texting."
            )
        return "Things look good! Keep being your authentic self."

    def _assess_date_readiness(
        self, history: List[Dict[str, Any]], metrics: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Assess if it's the right time to ask for a date."""
        score = 0.0
        reasons = []
        prerequisites = []

        msg_count = metrics["message_count"]

        # Message count threshold
        if msg_count >= 15:
            score += 0.3
        elif msg_count >= 10:
            score += 0.2
        else:
            reasons.append(f"Only {msg_count} messages exchanged")
            prerequisites.append("Exchange a few more messages first")

        # Mutual engagement
        if metrics["balance"] >= 0.4 and metrics["balance"] <= 0.6:
            score += 0.2
        else:
            reasons.append("Conversation balance is off")

        # Match asking questions (shows interest)
        if metrics["question_ratio_match"] >= 0.2:
            score += 0.2
        else:
            prerequisites.append("Try to get them more curious about you")

        # Good response rate
        if metrics["match_messages"] > 0:
            rate = metrics["match_messages"] / max(metrics["user_messages"], 1)
            if rate >= 0.8:
                score += 0.2
            elif rate < 0.5:
                reasons.append("Match isn't responding consistently")

        # Recent activity
        last_hours = metrics.get("last_message_hours_ago")
        if last_hours and last_hours < 24:
            score += 0.1
        elif last_hours and last_hours > 48:
            reasons.append("Conversation has gone quiet")

        return {
            "score": min(1.0, score),
            "reasons": reasons,
            "prerequisites": prerequisites,
            "messages_needed": max(0, 15 - msg_count) if msg_count < 15 else 0,
        }

    def _create_tip(
        self,
        tip_type: CoachingTipType,
        title: str,
        message: str,
        example: Optional[str] = None,
        action_text: Optional[str] = None,
        priority: int = 1,
    ) -> CoachingTip:
        """Create a coaching tip."""
        self._tip_id_counter += 1
        return CoachingTip(
            id=f"tip_{tip_type.value}_{self._tip_id_counter}",
            type=tip_type,
            title=title,
            message=message,
            example=example,
            action_text=action_text,
            priority=priority,
        )

    def _tip_to_dict(self, tip: CoachingTip) -> Dict[str, Any]:
        """Convert CoachingTip to dictionary."""
        return {
            "id": tip.id,
            "type": tip.type.value,
            "title": tip.title,
            "message": tip.message,
            "example": tip.example,
            "action_text": tip.action_text,
            "priority": tip.priority,
            "dismissable": tip.dismissable,
        }

    def _build_reply_advice_prompt(self) -> str:
        """Build system prompt for reply advice."""
        return """You are an expert dating coach helping someone craft the perfect reply.

Analyze the conversation and provide:
1. ADVICE: What they should do in their reply (1-2 sentences)
2. REASONING: Why this approach works
3. DO: 2-3 things to include
4. DONT: 2-3 things to avoid
5. EXAMPLES: 2 example responses they could send
6. TONE: Suggested tone (friendly/playful/sincere/curious)

Be specific, actionable, and authentic. Avoid generic advice."""

    def _build_reply_context(
        self,
        history: List[Dict[str, Any]],
        user_profile: Dict[str, Any],
        match_profile: Dict[str, Any],
    ) -> str:
        """Build context for reply advice."""
        conv_str = ""
        for msg in history[-10:]:
            sender = "Match" if msg.get("is_match") else "You"
            conv_str += f"{sender}: {msg.get('text', '')}\n"

        return f"""CONVERSATION:
{conv_str}

MATCH'S PROFILE:
- Interests: {', '.join(match_profile.get('interests', [])[:5])}
- Bio: {match_profile.get('bio', 'N/A')[:100]}

YOUR PROFILE:
- Interests: {', '.join(user_profile.get('interests', [])[:5])}

The match just sent the last message. Help craft a great reply.

Return JSON:
{{"advice": "...", "reasoning": "...", "do": [...], "dont": [...], "examples": [...], "tone": "..."}}"""

    def _build_date_ask_prompt(self) -> str:
        """Build system prompt for date ask coaching."""
        return """You are a dating coach helping someone ask their match out.

Provide:
1. TIMING: Whether now is a good time and why
2. APPROACHES: 3 different ways to ask (casual, direct, creative)
3. VENUES: 3 date ideas based on shared interests
4. EXAMPLES: 2 example messages to send
5. AVOID: What NOT to do when asking

Be specific to their conversation and shared interests."""

    def _build_date_context(
        self,
        history: List[Dict[str, Any]],
        user_profile: Dict[str, Any],
        match_profile: Dict[str, Any],
    ) -> str:
        """Build context for date ask coaching."""
        shared = set(user_profile.get("interests", [])) & set(match_profile.get("interests", []))

        return f"""CONVERSATION SUMMARY:
- {len(history)} messages exchanged
- Shared interests: {', '.join(shared) if shared else 'None identified'}
- Match's interests: {', '.join(match_profile.get('interests', [])[:5])}

Recent messages:
{chr(10).join(f"{'Match' if m.get('is_match') else 'You'}: {m.get('text', '')}" for m in history[-5:])}

Return JSON:
{{"timing": "...", "approaches": [...], "venues": [...], "examples": [...], "avoid": [...]}}"""

    def _get_fallback_coaching(self, history: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Return fallback coaching if AI fails."""
        msg_count = len(history)

        tips = []
        if msg_count < 5:
            tips.append({
                "id": "fallback_opening",
                "type": "conversation_starter",
                "title": "Start with curiosity",
                "message": "Ask about something from their profile!",
                "priority": 1,
            })
        else:
            tips.append({
                "id": "fallback_engage",
                "type": "engagement_boost",
                "title": "Keep the momentum",
                "message": "Ask follow-up questions about their answers.",
                "priority": 1,
            })

        return {
            "tips": tips,
            "health": {
                "status": "healthy",
                "stage": "getting_to_know" if msg_count < 10 else "building_rapport",
                "score": 70,
                "strengths": [],
                "areas_to_improve": [],
            },
            "suggested_topics": [
                {"topic": "Weekend plans", "type": "general", "prompt": "Ask about their weekend!"},
            ],
            "ghosting_risk": {"risk_level": "low", "signals": [], "recommendation": ""},
            "metrics": {"message_count": msg_count},
            "ready_to_ask_out": msg_count >= 20,
        }

    def _get_fallback_date_coaching(self) -> Dict[str, Any]:
        """Return fallback date coaching."""
        return {
            "ready": True,
            "readiness_score": 0.7,
            "timing_advice": "If the conversation is flowing well, it's a good time to suggest meeting!",
            "approach_suggestions": [
                "Casual: Mention an activity you both enjoy and suggest doing it together",
                "Direct: Simply ask if they'd like to grab coffee sometime",
                "Creative: Reference something from your conversation as a date idea",
            ],
            "venue_ideas": [
                "Coffee shop - low pressure, easy to chat",
                "Walk in the park - casual and relaxed",
                "Activity-based - mini golf, bowling, etc.",
            ],
            "example_messages": [
                "I've really enjoyed chatting with you! Would you want to grab coffee sometime this week?",
                "This conversation has been great - want to continue it in person over drinks?",
            ],
            "what_to_avoid": [
                "Don't be vague - suggest a specific activity",
                "Don't pressure them - keep it light",
                "Don't wait too long - momentum matters",
            ],
        }
