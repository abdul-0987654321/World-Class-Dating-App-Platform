"""Relationship Trajectory Prediction Service.

ML-based compatibility forecasting that analyzes conversation patterns,
response times, and engagement metrics to predict relationship trajectory.
"""

import logging
import json
import uuid
import re
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timezone
from collections import defaultdict

from app.services.ai_provider import AIProviderService

logger = logging.getLogger(__name__)


class RelationshipTrajectoryService:
    """Service for predicting relationship trajectory based on interaction patterns."""

    # Factor weights for trajectory calculation
    FACTOR_WEIGHTS = {
        "message_frequency": 0.15,
        "response_time": 0.15,
        "conversation_depth": 0.20,
        "mutual_interest": 0.20,
        "engagement_reciprocity": 0.15,
        "topic_diversity": 0.15,
    }

    # Thresholds for outcome classification
    TRAJECTORY_THRESHOLDS = {
        "strong_connection": 75,
        "building_interest": 55,
        "plateau": 40,
        "fading": 25,
    }

    # Relationship milestones
    MILESTONES = [
        "first_message",
        "mutual_questions",
        "shared_interests_discovered",
        "consistent_communication",
        "deeper_conversations",
        "date_planning",
        "exchanged_contacts",
    ]

    def __init__(self, ai_provider: Optional[AIProviderService] = None):
        """Initialize relationship trajectory service.

        Args:
            ai_provider: Optional AI provider for enhanced predictions
        """
        self.ai_provider = ai_provider

    async def predict_trajectory(
        self,
        conversation_history: List[Dict[str, Any]],
        user_profile: Dict[str, Any],
        match_profile: Dict[str, Any],
        interaction_metrics: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Predict relationship trajectory based on conversation and engagement patterns.

        Args:
            conversation_history: Full conversation history
            user_profile: User's profile data
            match_profile: Match's profile data
            interaction_metrics: Optional pre-computed interaction metrics

        Returns:
            Dictionary with trajectory prediction results
        """
        try:
            # Calculate metrics if not provided
            if interaction_metrics is None:
                interaction_metrics = self._compute_interaction_metrics(conversation_history)

            # Identify trajectory factors
            factors = self._identify_trajectory_factors(
                conversation_history,
                interaction_metrics,
                user_profile,
                match_profile,
            )

            # Calculate overall trajectory score
            trajectory_score = self._calculate_trajectory_score(factors)

            # Determine predicted outcome
            predicted_outcome = self._determine_outcome(trajectory_score, factors)

            # Calculate confidence
            confidence = self._calculate_confidence(
                conversation_history,
                factors,
                interaction_metrics,
            )

            # Determine momentum
            momentum = self._determine_momentum(conversation_history, factors)

            # Get milestone progress
            milestone_progress = self._calculate_milestone_progress(
                conversation_history,
                interaction_metrics,
            )

            # Generate recommendations
            recommendations = self._generate_recommendations(
                predicted_outcome,
                factors,
                milestone_progress,
                user_profile,
                match_profile,
            )

            # Generate insights
            insights = self._generate_insights(
                factors,
                predicted_outcome,
                momentum,
                conversation_history,
            )

            # Identify risk factors and positive signals
            risk_factors = self._identify_risk_factors(factors, interaction_metrics)
            positive_signals = self._identify_positive_signals(factors, interaction_metrics)

            # Determine next milestone
            next_milestone = self._determine_next_milestone(milestone_progress)

            # Try AI enhancement if available
            if self.ai_provider:
                try:
                    ai_insights = await self._get_ai_enhanced_insights(
                        conversation_history,
                        user_profile,
                        match_profile,
                        factors,
                        predicted_outcome,
                    )
                    if ai_insights:
                        insights.extend(ai_insights.get("insights", []))
                        recommendations.extend(ai_insights.get("recommendations", []))
                except Exception as e:
                    logger.warning(f"AI enhancement failed, using rule-based only: {e}")

            return {
                "trajectory_score": round(trajectory_score, 1),
                "predicted_outcome": predicted_outcome,
                "confidence": round(confidence, 2),
                "factors": factors,
                "recommendations": recommendations[:5],  # Limit to top 5
                "insights": insights[:5],  # Limit to top 5
                "momentum": momentum,
                "milestone_progress": milestone_progress,
                "next_milestone": next_milestone,
                "risk_factors": risk_factors[:3],  # Top 3 risks
                "positive_signals": positive_signals[:3],  # Top 3 positives
            }

        except Exception as e:
            logger.error(f"Failed to predict trajectory: {e}", exc_info=True)
            return self._get_fallback_prediction()

    def _compute_interaction_metrics(
        self,
        history: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Compute interaction metrics from conversation history."""
        if not history:
            return {
                "total_messages": 0,
                "user_messages": 0,
                "match_messages": 0,
                "avg_response_time_user": None,
                "avg_response_time_match": None,
                "avg_message_length_user": None,
                "avg_message_length_match": None,
                "conversation_days": 0,
                "messages_per_day": None,
                "last_message_hours_ago": None,
                "question_count_user": 0,
                "question_count_match": 0,
                "emoji_count_user": 0,
                "emoji_count_match": 0,
            }

        user_messages = [m for m in history if not m.get("is_match", False)]
        match_messages = [m for m in history if m.get("is_match", False)]

        # Calculate response times
        user_response_times = []
        match_response_times = []

        for i in range(1, len(history)):
            current = history[i]
            previous = history[i - 1]

            if current.get("timestamp") and previous.get("timestamp"):
                time_diff = self._calculate_time_diff(
                    previous.get("timestamp"),
                    current.get("timestamp"),
                )
                if time_diff is not None and time_diff > 0:
                    # Only count responses (not same sender)
                    if current.get("is_match") != previous.get("is_match"):
                        if current.get("is_match"):
                            match_response_times.append(time_diff)
                        else:
                            user_response_times.append(time_diff)

        # Calculate message lengths
        user_lengths = [len(m.get("text", "")) for m in user_messages if m.get("text")]
        match_lengths = [len(m.get("text", "")) for m in match_messages if m.get("text")]

        # Calculate conversation duration
        conversation_days = 0
        first_timestamp = history[0].get("timestamp") if history else None
        last_timestamp = history[-1].get("timestamp") if history else None

        if first_timestamp and last_timestamp:
            try:
                first_dt = self._parse_timestamp(first_timestamp)
                last_dt = self._parse_timestamp(last_timestamp)
                if first_dt and last_dt:
                    conversation_days = max(1, (last_dt - first_dt).days + 1)
            except Exception:
                conversation_days = 1

        # Calculate hours since last message
        last_message_hours_ago = None
        if last_timestamp:
            try:
                last_dt = self._parse_timestamp(last_timestamp)
                if last_dt:
                    now = datetime.now(timezone.utc)
                    last_message_hours_ago = (now - last_dt).total_seconds() / 3600
            except Exception:
                pass

        # Count questions
        question_count_user = sum(
            1 for m in user_messages
            if "?" in m.get("text", "")
        )
        question_count_match = sum(
            1 for m in match_messages
            if "?" in m.get("text", "")
        )

        # Count emojis (simple heuristic)
        emoji_pattern = re.compile(
            "["
            "\U0001F600-\U0001F64F"  # emoticons
            "\U0001F300-\U0001F5FF"  # symbols & pictographs
            "\U0001F680-\U0001F6FF"  # transport & map symbols
            "\U0001F1E0-\U0001F1FF"  # flags
            "\U00002702-\U000027B0"
            "\U000024C2-\U0001F251"
            "]+",
            flags=re.UNICODE,
        )

        emoji_count_user = sum(
            len(emoji_pattern.findall(m.get("text", "")))
            for m in user_messages
        )
        emoji_count_match = sum(
            len(emoji_pattern.findall(m.get("text", "")))
            for m in match_messages
        )

        total_messages = len(history)

        return {
            "total_messages": total_messages,
            "user_messages": len(user_messages),
            "match_messages": len(match_messages),
            "avg_response_time_user": (
                sum(user_response_times) / len(user_response_times)
                if user_response_times else None
            ),
            "avg_response_time_match": (
                sum(match_response_times) / len(match_response_times)
                if match_response_times else None
            ),
            "avg_message_length_user": (
                sum(user_lengths) / len(user_lengths) if user_lengths else None
            ),
            "avg_message_length_match": (
                sum(match_lengths) / len(match_lengths) if match_lengths else None
            ),
            "conversation_days": conversation_days,
            "messages_per_day": (
                total_messages / conversation_days if conversation_days > 0 else None
            ),
            "last_message_hours_ago": last_message_hours_ago,
            "question_count_user": question_count_user,
            "question_count_match": question_count_match,
            "emoji_count_user": emoji_count_user,
            "emoji_count_match": emoji_count_match,
        }

    def _identify_trajectory_factors(
        self,
        history: List[Dict[str, Any]],
        metrics: Dict[str, Any],
        user_profile: Dict[str, Any],
        match_profile: Dict[str, Any],
    ) -> List[Dict[str, Any]]:
        """Identify and score factors contributing to trajectory prediction."""
        factors = []

        # 1. Message Frequency Factor
        frequency_score, frequency_trend = self._analyze_message_frequency(history, metrics)
        factors.append({
            "name": "message_frequency",
            "score": frequency_score,
            "weight": self.FACTOR_WEIGHTS["message_frequency"],
            "trend": frequency_trend,
            "description": self._get_frequency_description(frequency_score, metrics),
            "impact": self._get_impact_level(frequency_score),
        })

        # 2. Response Time Factor
        response_score, response_trend = self._analyze_response_times(history, metrics)
        factors.append({
            "name": "response_time",
            "score": response_score,
            "weight": self.FACTOR_WEIGHTS["response_time"],
            "trend": response_trend,
            "description": self._get_response_time_description(response_score, metrics),
            "impact": self._get_impact_level(response_score),
        })

        # 3. Conversation Depth Factor
        depth_score, depth_trend = self._analyze_conversation_depth(history, metrics)
        factors.append({
            "name": "conversation_depth",
            "score": depth_score,
            "weight": self.FACTOR_WEIGHTS["conversation_depth"],
            "trend": depth_trend,
            "description": self._get_depth_description(depth_score, history),
            "impact": self._get_impact_level(depth_score),
        })

        # 4. Mutual Interest Factor
        interest_score, interest_trend = self._analyze_mutual_interest(
            history, metrics, user_profile, match_profile
        )
        factors.append({
            "name": "mutual_interest",
            "score": interest_score,
            "weight": self.FACTOR_WEIGHTS["mutual_interest"],
            "trend": interest_trend,
            "description": self._get_interest_description(interest_score, metrics),
            "impact": self._get_impact_level(interest_score),
        })

        # 5. Engagement Reciprocity Factor
        reciprocity_score, reciprocity_trend = self._analyze_engagement_reciprocity(
            history, metrics
        )
        factors.append({
            "name": "engagement_reciprocity",
            "score": reciprocity_score,
            "weight": self.FACTOR_WEIGHTS["engagement_reciprocity"],
            "trend": reciprocity_trend,
            "description": self._get_reciprocity_description(reciprocity_score, metrics),
            "impact": self._get_impact_level(reciprocity_score),
        })

        # 6. Topic Diversity Factor
        diversity_score, diversity_trend = self._analyze_topic_diversity(history)
        factors.append({
            "name": "topic_diversity",
            "score": diversity_score,
            "weight": self.FACTOR_WEIGHTS["topic_diversity"],
            "trend": diversity_trend,
            "description": self._get_diversity_description(diversity_score),
            "impact": self._get_impact_level(diversity_score),
        })

        return factors

    def _calculate_trajectory_score(self, factors: List[Dict[str, Any]]) -> float:
        """Calculate overall trajectory score from weighted factors."""
        if not factors:
            return 50.0

        weighted_sum = sum(
            factor["score"] * factor["weight"]
            for factor in factors
        )
        total_weight = sum(factor["weight"] for factor in factors)

        return weighted_sum / total_weight if total_weight > 0 else 50.0

    def _determine_outcome(
        self,
        score: float,
        factors: List[Dict[str, Any]],
    ) -> str:
        """Determine predicted outcome based on score and factors."""
        # Check for specific patterns that might override score
        declining_count = sum(1 for f in factors if f["trend"] == "declining")
        improving_count = sum(1 for f in factors if f["trend"] == "improving")

        # Adjust outcome based on trends
        if declining_count >= 4 and score > self.TRAJECTORY_THRESHOLDS["plateau"]:
            # Many declining factors, might be fading despite decent score
            score = min(score, self.TRAJECTORY_THRESHOLDS["plateau"] + 5)

        if improving_count >= 4 and score < self.TRAJECTORY_THRESHOLDS["building_interest"]:
            # Many improving factors, might be building despite low score
            score = max(score, self.TRAJECTORY_THRESHOLDS["fading"] + 5)

        # Classify based on thresholds
        if score >= self.TRAJECTORY_THRESHOLDS["strong_connection"]:
            return "strong_connection"
        elif score >= self.TRAJECTORY_THRESHOLDS["building_interest"]:
            return "building_interest"
        elif score >= self.TRAJECTORY_THRESHOLDS["plateau"]:
            return "plateau"
        elif score >= self.TRAJECTORY_THRESHOLDS["fading"]:
            return "fading"
        else:
            return "uncertain"

    def _calculate_confidence(
        self,
        history: List[Dict[str, Any]],
        factors: List[Dict[str, Any]],
        metrics: Dict[str, Any],
    ) -> float:
        """Calculate confidence in the prediction."""
        confidence = 0.5  # Base confidence

        # More messages = higher confidence
        total_messages = metrics.get("total_messages", 0)
        if total_messages >= 50:
            confidence += 0.2
        elif total_messages >= 20:
            confidence += 0.15
        elif total_messages >= 10:
            confidence += 0.1
        elif total_messages >= 5:
            confidence += 0.05

        # More conversation days = higher confidence
        conversation_days = metrics.get("conversation_days", 0)
        if conversation_days >= 7:
            confidence += 0.1
        elif conversation_days >= 3:
            confidence += 0.05

        # Factor consistency increases confidence
        trends = [f["trend"] for f in factors]
        if trends.count(trends[0]) >= 4:  # Most factors agree on trend
            confidence += 0.1

        # High factor variance decreases confidence
        scores = [f["score"] for f in factors]
        if scores:
            variance = sum((s - sum(scores) / len(scores)) ** 2 for s in scores) / len(scores)
            if variance > 400:  # High variance
                confidence -= 0.1
            elif variance < 100:  # Low variance
                confidence += 0.05

        return min(0.95, max(0.3, confidence))

    def _determine_momentum(
        self,
        history: List[Dict[str, Any]],
        factors: List[Dict[str, Any]],
    ) -> str:
        """Determine current relationship momentum."""
        improving_count = sum(1 for f in factors if f["trend"] == "improving")
        declining_count = sum(1 for f in factors if f["trend"] == "declining")
        stable_count = sum(1 for f in factors if f["trend"] == "stable")

        # Check recent activity
        if not history:
            return "stalled"

        # Check if conversation is stalled
        recent_messages = history[-5:] if len(history) >= 5 else history
        if len(recent_messages) < 2:
            return "stalled"

        if improving_count >= 4:
            return "accelerating"
        elif declining_count >= 4:
            return "slowing"
        elif stable_count >= 4:
            return "steady"
        elif improving_count > declining_count:
            return "steady"
        elif declining_count > improving_count:
            return "slowing"
        else:
            return "steady"

    def _calculate_milestone_progress(
        self,
        history: List[Dict[str, Any]],
        metrics: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Calculate progress toward relationship milestones."""
        progress = {}

        # First message milestone
        progress["first_message"] = {
            "achieved": len(history) > 0,
            "achieved_at": history[0].get("timestamp") if history else None,
        }

        # Mutual questions milestone
        questions_both = (
            metrics.get("question_count_user", 0) > 0 and
            metrics.get("question_count_match", 0) > 0
        )
        progress["mutual_questions"] = {
            "achieved": questions_both,
            "user_questions": metrics.get("question_count_user", 0),
            "match_questions": metrics.get("question_count_match", 0),
        }

        # Consistent communication
        messages_per_day = metrics.get("messages_per_day")
        conversation_days = metrics.get("conversation_days", 0)
        consistent = (
            messages_per_day is not None and
            messages_per_day >= 3 and
            conversation_days >= 3
        )
        progress["consistent_communication"] = {
            "achieved": consistent,
            "messages_per_day": messages_per_day,
            "conversation_days": conversation_days,
        }

        # Deeper conversations (message length and question depth)
        avg_length_user = metrics.get("avg_message_length_user") or 0
        avg_length_match = metrics.get("avg_message_length_match") or 0
        deep_conversations = (
            avg_length_user > 100 and
            avg_length_match > 100 and
            metrics.get("total_messages", 0) >= 20
        )
        progress["deeper_conversations"] = {
            "achieved": deep_conversations,
            "avg_message_length": (avg_length_user + avg_length_match) / 2,
        }

        # Date planning (check for date-related keywords)
        date_keywords = ["date", "meet", "coffee", "dinner", "drinks", "hang out", "get together"]
        date_mentioned = any(
            any(kw in m.get("text", "").lower() for kw in date_keywords)
            for m in history
        )
        progress["date_planning"] = {
            "achieved": date_mentioned,
            "mentioned": date_mentioned,
        }

        # Contact exchange (check for phone/social media mentions)
        contact_keywords = ["number", "phone", "instagram", "ig", "snap", "snapchat", "whatsapp", "text me"]
        contacts_mentioned = any(
            any(kw in m.get("text", "").lower() for kw in contact_keywords)
            for m in history
        )
        progress["exchanged_contacts"] = {
            "achieved": contacts_mentioned,
            "mentioned": contacts_mentioned,
        }

        # Calculate overall milestone progress
        achieved_count = sum(
            1 for v in progress.values()
            if isinstance(v, dict) and v.get("achieved", False)
        )
        progress["overall_progress"] = {
            "achieved": achieved_count,
            "total": len(self.MILESTONES),
            "percentage": round(achieved_count / len(self.MILESTONES) * 100, 1),
        }

        return progress

    def _generate_recommendations(
        self,
        predicted_outcome: str,
        factors: List[Dict[str, Any]],
        milestone_progress: Dict[str, Any],
        user_profile: Dict[str, Any],
        match_profile: Dict[str, Any],
    ) -> List[Dict[str, Any]]:
        """Generate personalized recommendations for improving trajectory."""
        recommendations = []

        # Find weakest factors
        sorted_factors = sorted(factors, key=lambda f: f["score"])
        weak_factors = [f for f in sorted_factors if f["score"] < 60]

        for factor in weak_factors[:3]:
            rec = self._get_recommendation_for_factor(factor, milestone_progress)
            if rec:
                recommendations.append(rec)

        # Add outcome-specific recommendations
        outcome_recs = self._get_outcome_recommendations(
            predicted_outcome,
            milestone_progress,
            user_profile,
            match_profile,
        )
        recommendations.extend(outcome_recs)

        # Add milestone-based recommendations
        milestone_recs = self._get_milestone_recommendations(milestone_progress)
        recommendations.extend(milestone_recs)

        # Deduplicate and prioritize
        seen_ids = set()
        unique_recs = []
        for rec in recommendations:
            if rec["id"] not in seen_ids:
                seen_ids.add(rec["id"])
                unique_recs.append(rec)

        # Sort by priority
        priority_order = {"high": 0, "medium": 1, "low": 2}
        unique_recs.sort(key=lambda r: priority_order.get(r["priority"], 1))

        return unique_recs

    def _generate_insights(
        self,
        factors: List[Dict[str, Any]],
        predicted_outcome: str,
        momentum: str,
        history: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """Generate insights about the relationship trajectory."""
        insights = []

        # Strength insights (high-scoring factors)
        strong_factors = [f for f in factors if f["score"] >= 70]
        for factor in strong_factors[:2]:
            insights.append({
                "type": "strength",
                "title": f"Strong {factor['name'].replace('_', ' ').title()}",
                "description": factor["description"],
                "confidence": 0.8,
            })

        # Concern insights (low-scoring factors)
        weak_factors = [f for f in factors if f["score"] < 40]
        for factor in weak_factors[:2]:
            insights.append({
                "type": "concern",
                "title": f"Area for Improvement: {factor['name'].replace('_', ' ').title()}",
                "description": factor["description"],
                "confidence": 0.7,
            })

        # Momentum insight
        momentum_descriptions = {
            "accelerating": "Your connection is gaining momentum with increasing engagement",
            "steady": "Your conversation maintains a stable, healthy pace",
            "slowing": "Communication has slowed down recently - consider re-engaging",
            "stalled": "The conversation has stalled - a thoughtful message could restart things",
        }
        insights.append({
            "type": "milestone",
            "title": f"Momentum: {momentum.title()}",
            "description": momentum_descriptions.get(momentum, ""),
            "confidence": 0.75,
        })

        # Opportunity insights based on patterns
        if len(history) >= 10:
            insights.append({
                "type": "opportunity",
                "title": "Building Foundation",
                "description": "You've exchanged enough messages to establish rapport. Consider suggesting a video call or meetup.",
                "confidence": 0.65,
            })

        return insights

    def _identify_risk_factors(
        self,
        factors: List[Dict[str, Any]],
        metrics: Dict[str, Any],
    ) -> List[str]:
        """Identify potential risk factors for the relationship."""
        risks = []

        # Check for declining factors
        declining = [f for f in factors if f["trend"] == "declining"]
        if len(declining) >= 3:
            risks.append("Multiple engagement metrics are declining")

        # Check response time imbalance
        user_rt = metrics.get("avg_response_time_user")
        match_rt = metrics.get("avg_response_time_match")
        if user_rt and match_rt:
            if match_rt > user_rt * 3:
                risks.append("Match is taking significantly longer to respond")

        # Check message imbalance
        user_msgs = metrics.get("user_messages", 0)
        match_msgs = metrics.get("match_messages", 0)
        if user_msgs > 0 and match_msgs > 0:
            ratio = user_msgs / match_msgs
            if ratio > 2:
                risks.append("You're sending significantly more messages than receiving")
            elif ratio < 0.5:
                risks.append("Communication is heavily one-sided from match")

        # Check for stalled conversation
        last_hours = metrics.get("last_message_hours_ago")
        if last_hours and last_hours > 72:
            risks.append("No messages exchanged in over 3 days")

        # Check question imbalance
        user_questions = metrics.get("question_count_user", 0)
        match_questions = metrics.get("question_count_match", 0)
        if user_questions >= 5 and match_questions == 0:
            risks.append("Match hasn't asked any questions about you")

        return risks

    def _identify_positive_signals(
        self,
        factors: List[Dict[str, Any]],
        metrics: Dict[str, Any],
    ) -> List[str]:
        """Identify positive signals in the relationship."""
        signals = []

        # Check for improving factors
        improving = [f for f in factors if f["trend"] == "improving"]
        if len(improving) >= 3:
            signals.append("Multiple engagement metrics are improving")

        # Check response time engagement
        match_rt = metrics.get("avg_response_time_match")
        if match_rt and match_rt < 3600:  # Under 1 hour
            signals.append("Match responds quickly (under an hour on average)")

        # Check message balance
        user_msgs = metrics.get("user_messages", 0)
        match_msgs = metrics.get("match_messages", 0)
        if user_msgs > 0 and match_msgs > 0:
            ratio = user_msgs / match_msgs
            if 0.7 <= ratio <= 1.4:
                signals.append("Conversation is well-balanced between both parties")

        # Check question engagement
        match_questions = metrics.get("question_count_match", 0)
        if match_questions >= 3:
            signals.append("Match is showing interest by asking questions")

        # Check emoji usage
        match_emojis = metrics.get("emoji_count_match", 0)
        if match_emojis >= 5:
            signals.append("Match uses emojis frequently, indicating positive engagement")

        # Check message depth
        avg_length = metrics.get("avg_message_length_match")
        if avg_length and avg_length > 100:
            signals.append("Match sends thoughtful, longer messages")

        return signals

    def _determine_next_milestone(
        self,
        milestone_progress: Dict[str, Any],
    ) -> Optional[str]:
        """Determine the next milestone to work toward."""
        milestone_descriptions = {
            "first_message": "Start the conversation",
            "mutual_questions": "Ask and answer questions to learn about each other",
            "shared_interests_discovered": "Discover shared interests and hobbies",
            "consistent_communication": "Establish consistent daily communication",
            "deeper_conversations": "Have deeper, more meaningful conversations",
            "date_planning": "Suggest meeting up or having a date",
            "exchanged_contacts": "Exchange phone numbers or social media",
        }

        for milestone in self.MILESTONES:
            if milestone in milestone_progress:
                if not milestone_progress[milestone].get("achieved", False):
                    return milestone_descriptions.get(milestone, milestone)

        return "Continue building your connection"

    # =========================================================================
    # Helper methods for factor analysis
    # =========================================================================

    def _analyze_message_frequency(
        self,
        history: List[Dict[str, Any]],
        metrics: Dict[str, Any],
    ) -> Tuple[float, str]:
        """Analyze message frequency patterns."""
        messages_per_day = metrics.get("messages_per_day")
        total_messages = metrics.get("total_messages", 0)

        if messages_per_day is None or total_messages < 5:
            return 50.0, "stable"

        # Score based on messages per day
        if messages_per_day >= 10:
            score = 90
        elif messages_per_day >= 5:
            score = 75
        elif messages_per_day >= 2:
            score = 60
        elif messages_per_day >= 1:
            score = 45
        else:
            score = 30

        # Determine trend by comparing recent vs earlier frequency
        if len(history) >= 10:
            mid = len(history) // 2
            earlier = history[:mid]
            recent = history[mid:]

            earlier_days = max(1, self._get_conversation_days(earlier))
            recent_days = max(1, self._get_conversation_days(recent))

            earlier_freq = len(earlier) / earlier_days
            recent_freq = len(recent) / recent_days

            if recent_freq > earlier_freq * 1.2:
                trend = "improving"
            elif recent_freq < earlier_freq * 0.8:
                trend = "declining"
            else:
                trend = "stable"
        else:
            trend = "stable"

        return score, trend

    def _analyze_response_times(
        self,
        history: List[Dict[str, Any]],
        metrics: Dict[str, Any],
    ) -> Tuple[float, str]:
        """Analyze response time patterns."""
        user_rt = metrics.get("avg_response_time_user")
        match_rt = metrics.get("avg_response_time_match")

        if match_rt is None:
            return 50.0, "stable"

        # Score based on match's response time
        if match_rt < 300:  # Under 5 minutes
            score = 95
        elif match_rt < 1800:  # Under 30 minutes
            score = 85
        elif match_rt < 3600:  # Under 1 hour
            score = 75
        elif match_rt < 7200:  # Under 2 hours
            score = 65
        elif match_rt < 21600:  # Under 6 hours
            score = 50
        elif match_rt < 86400:  # Under 1 day
            score = 35
        else:
            score = 20

        # Analyze trend (simplified)
        trend = "stable"
        if len(history) >= 10:
            # Compare early vs recent response times
            early_rts = []
            recent_rts = []
            mid = len(history) // 2

            for i in range(1, mid):
                if (history[i].get("timestamp") and history[i-1].get("timestamp") and
                    history[i].get("is_match") != history[i-1].get("is_match") and
                    history[i].get("is_match")):
                    td = self._calculate_time_diff(
                        history[i-1].get("timestamp"),
                        history[i].get("timestamp")
                    )
                    if td:
                        early_rts.append(td)

            for i in range(mid + 1, len(history)):
                if (history[i].get("timestamp") and history[i-1].get("timestamp") and
                    history[i].get("is_match") != history[i-1].get("is_match") and
                    history[i].get("is_match")):
                    td = self._calculate_time_diff(
                        history[i-1].get("timestamp"),
                        history[i].get("timestamp")
                    )
                    if td:
                        recent_rts.append(td)

            if early_rts and recent_rts:
                early_avg = sum(early_rts) / len(early_rts)
                recent_avg = sum(recent_rts) / len(recent_rts)

                if recent_avg < early_avg * 0.7:
                    trend = "improving"
                elif recent_avg > early_avg * 1.5:
                    trend = "declining"

        return score, trend

    def _analyze_conversation_depth(
        self,
        history: List[Dict[str, Any]],
        metrics: Dict[str, Any],
    ) -> Tuple[float, str]:
        """Analyze conversation depth and quality."""
        if not history:
            return 50.0, "stable"

        # Indicators of depth
        avg_length_user = metrics.get("avg_message_length_user") or 0
        avg_length_match = metrics.get("avg_message_length_match") or 0
        avg_length = (avg_length_user + avg_length_match) / 2

        questions_user = metrics.get("question_count_user", 0)
        questions_match = metrics.get("question_count_match", 0)
        total_questions = questions_user + questions_match

        # Deep conversation keywords
        deep_keywords = [
            "feel", "think", "believe", "dream", "goal", "hope", "love",
            "family", "future", "important", "meaningful", "passion",
            "experience", "learned", "afraid", "happy", "excited",
        ]

        deep_message_count = sum(
            1 for m in history
            if any(kw in m.get("text", "").lower() for kw in deep_keywords)
        )

        # Calculate score
        score = 40.0

        # Message length contribution
        if avg_length >= 150:
            score += 20
        elif avg_length >= 100:
            score += 15
        elif avg_length >= 50:
            score += 10

        # Questions contribution
        questions_per_message = total_questions / max(1, len(history))
        if questions_per_message >= 0.3:
            score += 15
        elif questions_per_message >= 0.15:
            score += 10

        # Deep topics contribution
        deep_ratio = deep_message_count / max(1, len(history))
        if deep_ratio >= 0.2:
            score += 15
        elif deep_ratio >= 0.1:
            score += 10

        score = min(100, score)

        # Trend analysis
        trend = "stable"
        if len(history) >= 10:
            mid = len(history) // 2
            early_lengths = [
                len(m.get("text", ""))
                for m in history[:mid]
                if m.get("text")
            ]
            recent_lengths = [
                len(m.get("text", ""))
                for m in history[mid:]
                if m.get("text")
            ]

            if early_lengths and recent_lengths:
                early_avg = sum(early_lengths) / len(early_lengths)
                recent_avg = sum(recent_lengths) / len(recent_lengths)

                if recent_avg > early_avg * 1.3:
                    trend = "improving"
                elif recent_avg < early_avg * 0.7:
                    trend = "declining"

        return score, trend

    def _analyze_mutual_interest(
        self,
        history: List[Dict[str, Any]],
        metrics: Dict[str, Any],
        user_profile: Dict[str, Any],
        match_profile: Dict[str, Any],
    ) -> Tuple[float, str]:
        """Analyze mutual interest indicators."""
        if not history:
            return 50.0, "stable"

        score = 50.0

        # Question reciprocity
        user_questions = metrics.get("question_count_user", 0)
        match_questions = metrics.get("question_count_match", 0)

        if match_questions >= 3:
            score += 15
        if user_questions >= 3 and match_questions >= 3:
            score += 10

        # Response consistency
        user_msgs = metrics.get("user_messages", 0)
        match_msgs = metrics.get("match_messages", 0)

        if user_msgs > 0 and match_msgs > 0:
            balance = min(user_msgs, match_msgs) / max(user_msgs, match_msgs)
            if balance >= 0.8:
                score += 15
            elif balance >= 0.6:
                score += 10
            elif balance < 0.4:
                score -= 10

        # Emoji and enthusiasm indicators
        match_emojis = metrics.get("emoji_count_match", 0)
        if match_emojis >= 10:
            score += 10
        elif match_emojis >= 5:
            score += 5

        # Check for enthusiasm markers
        enthusiasm_markers = ["!", "haha", "lol", "omg", "awesome", "amazing", "love"]
        match_messages = [m for m in history if m.get("is_match", False)]
        enthusiasm_count = sum(
            1 for m in match_messages
            if any(marker in m.get("text", "").lower() for marker in enthusiasm_markers)
        )

        if enthusiasm_count >= 5:
            score += 10
        elif enthusiasm_count >= 3:
            score += 5

        score = min(100, max(0, score))

        # Trend analysis
        trend = "stable"
        if len(history) >= 10:
            mid = len(history) // 2
            early_match = [m for m in history[:mid] if m.get("is_match")]
            recent_match = [m for m in history[mid:] if m.get("is_match")]

            if len(recent_match) > len(early_match) * 1.2:
                trend = "improving"
            elif len(recent_match) < len(early_match) * 0.8:
                trend = "declining"

        return score, trend

    def _analyze_engagement_reciprocity(
        self,
        history: List[Dict[str, Any]],
        metrics: Dict[str, Any],
    ) -> Tuple[float, str]:
        """Analyze engagement balance and reciprocity."""
        user_msgs = metrics.get("user_messages", 0)
        match_msgs = metrics.get("match_messages", 0)

        if user_msgs == 0 or match_msgs == 0:
            return 30.0, "stable"

        # Calculate message balance
        total = user_msgs + match_msgs
        user_ratio = user_msgs / total

        # Perfect balance is 0.5
        balance_score = 100 - abs(0.5 - user_ratio) * 200
        balance_score = max(0, min(100, balance_score))

        # Factor in message length balance
        user_length = metrics.get("avg_message_length_user") or 0
        match_length = metrics.get("avg_message_length_match") or 0

        if user_length > 0 and match_length > 0:
            length_ratio = min(user_length, match_length) / max(user_length, match_length)
            length_score = length_ratio * 100
        else:
            length_score = 50

        # Combine scores
        score = balance_score * 0.6 + length_score * 0.4

        # Trend analysis
        trend = "stable"
        if len(history) >= 10:
            mid = len(history) // 2
            early_user = sum(1 for m in history[:mid] if not m.get("is_match"))
            early_match = sum(1 for m in history[:mid] if m.get("is_match"))
            recent_user = sum(1 for m in history[mid:] if not m.get("is_match"))
            recent_match = sum(1 for m in history[mid:] if m.get("is_match"))

            if early_user > 0 and early_match > 0:
                early_ratio = early_match / early_user
                recent_ratio = recent_match / recent_user if recent_user > 0 else 0

                if recent_ratio > early_ratio * 1.2:
                    trend = "improving"
                elif recent_ratio < early_ratio * 0.8:
                    trend = "declining"

        return score, trend

    def _analyze_topic_diversity(
        self,
        history: List[Dict[str, Any]],
    ) -> Tuple[float, str]:
        """Analyze diversity of conversation topics."""
        if not history:
            return 50.0, "stable"

        # Topic categories and keywords
        topic_categories = {
            "personal": ["i", "my", "me", "myself", "life", "family", "friend"],
            "work": ["work", "job", "career", "office", "boss", "colleague"],
            "hobbies": ["hobby", "fun", "play", "game", "sport", "music", "movie", "book"],
            "travel": ["travel", "trip", "vacation", "visit", "country", "city"],
            "food": ["food", "eat", "restaurant", "cook", "dinner", "lunch", "breakfast"],
            "plans": ["plan", "weekend", "tomorrow", "tonight", "next"],
            "feelings": ["feel", "happy", "excited", "love", "enjoy", "miss"],
            "questions": ["what", "how", "why", "when", "where", "who"],
        }

        # Count topics mentioned
        topics_found = defaultdict(int)
        for msg in history:
            text = msg.get("text", "").lower()
            for topic, keywords in topic_categories.items():
                if any(kw in text for kw in keywords):
                    topics_found[topic] += 1

        # Calculate diversity score
        topics_discussed = len([t for t in topics_found if topics_found[t] >= 2])
        max_topics = len(topic_categories)

        diversity_ratio = topics_discussed / max_topics
        score = diversity_ratio * 100

        # Boost for deep personal topics
        if topics_found.get("feelings", 0) >= 3:
            score += 10
        if topics_found.get("personal", 0) >= 5:
            score += 10

        score = min(100, score)

        # Trend (check if new topics being introduced)
        trend = "stable"
        if len(history) >= 10:
            mid = len(history) // 2
            early_topics = set()
            recent_topics = set()

            for msg in history[:mid]:
                text = msg.get("text", "").lower()
                for topic, keywords in topic_categories.items():
                    if any(kw in text for kw in keywords):
                        early_topics.add(topic)

            for msg in history[mid:]:
                text = msg.get("text", "").lower()
                for topic, keywords in topic_categories.items():
                    if any(kw in text for kw in keywords):
                        recent_topics.add(topic)

            new_topics = recent_topics - early_topics
            if len(new_topics) >= 2:
                trend = "improving"
            elif len(recent_topics) < len(early_topics) * 0.5:
                trend = "declining"

        return score, trend

    # =========================================================================
    # Description generators
    # =========================================================================

    def _get_frequency_description(
        self,
        score: float,
        metrics: Dict[str, Any],
    ) -> str:
        """Get description for message frequency factor."""
        mpd = metrics.get("messages_per_day")
        if mpd is None:
            return "Not enough data to analyze message frequency"

        if score >= 75:
            return f"Excellent communication frequency with {mpd:.1f} messages per day"
        elif score >= 50:
            return f"Moderate communication with {mpd:.1f} messages per day"
        else:
            return f"Low communication frequency at {mpd:.1f} messages per day"

    def _get_response_time_description(
        self,
        score: float,
        metrics: Dict[str, Any],
    ) -> str:
        """Get description for response time factor."""
        match_rt = metrics.get("avg_response_time_match")
        if match_rt is None:
            return "Not enough data to analyze response times"

        if match_rt < 3600:
            time_str = f"{int(match_rt / 60)} minutes"
        elif match_rt < 86400:
            time_str = f"{match_rt / 3600:.1f} hours"
        else:
            time_str = f"{match_rt / 86400:.1f} days"

        if score >= 75:
            return f"Match responds quickly, averaging {time_str}"
        elif score >= 50:
            return f"Match responds at a reasonable pace, averaging {time_str}"
        else:
            return f"Match takes a while to respond, averaging {time_str}"

    def _get_depth_description(
        self,
        score: float,
        history: List[Dict[str, Any]],
    ) -> str:
        """Get description for conversation depth factor."""
        if score >= 75:
            return "Conversations are deep and meaningful with substantial exchanges"
        elif score >= 50:
            return "Conversations have moderate depth with room for deeper connection"
        else:
            return "Conversations are surface-level - try exploring deeper topics"

    def _get_interest_description(
        self,
        score: float,
        metrics: Dict[str, Any],
    ) -> str:
        """Get description for mutual interest factor."""
        match_questions = metrics.get("question_count_match", 0)

        if score >= 75:
            return f"Strong mutual interest shown - match has asked {match_questions} questions"
        elif score >= 50:
            return "Moderate interest levels from both sides"
        else:
            return "Interest levels seem imbalanced - match shows limited curiosity"

    def _get_reciprocity_description(
        self,
        score: float,
        metrics: Dict[str, Any],
    ) -> str:
        """Get description for engagement reciprocity factor."""
        user_msgs = metrics.get("user_messages", 0)
        match_msgs = metrics.get("match_messages", 0)

        if score >= 75:
            return f"Well-balanced conversation ({user_msgs} vs {match_msgs} messages)"
        elif score >= 50:
            return f"Somewhat balanced exchange ({user_msgs} vs {match_msgs} messages)"
        else:
            return f"Imbalanced conversation ({user_msgs} vs {match_msgs} messages)"

    def _get_diversity_description(self, score: float) -> str:
        """Get description for topic diversity factor."""
        if score >= 75:
            return "Rich variety of conversation topics explored"
        elif score >= 50:
            return "Decent range of topics discussed"
        else:
            return "Limited topic variety - try branching out to new subjects"

    def _get_impact_level(self, score: float) -> str:
        """Determine impact level based on score."""
        if score >= 70:
            return "high"
        elif score >= 40:
            return "medium"
        else:
            return "low"

    # =========================================================================
    # Recommendation generators
    # =========================================================================

    def _get_recommendation_for_factor(
        self,
        factor: Dict[str, Any],
        milestone_progress: Dict[str, Any],
    ) -> Optional[Dict[str, Any]]:
        """Get recommendation for a specific weak factor."""
        factor_recommendations = {
            "message_frequency": {
                "id": "rec_frequency",
                "category": "timing",
                "priority": "medium",
                "title": "Increase Communication Frequency",
                "description": "More regular messages help build momentum and connection.",
                "action_items": [
                    "Send a good morning or good evening message",
                    "Share interesting things from your day",
                    "Respond promptly when you can",
                ],
                "expected_impact": "More consistent communication builds familiarity and comfort",
            },
            "response_time": {
                "id": "rec_response",
                "category": "timing",
                "priority": "low",
                "title": "Be Mindful of Response Patterns",
                "description": "Response time affects conversation flow and engagement.",
                "action_items": [
                    "Try to respond within a few hours when possible",
                    "If busy, send a quick acknowledgment",
                    "Match their response timing generally",
                ],
                "expected_impact": "Better response timing maintains conversation momentum",
            },
            "conversation_depth": {
                "id": "rec_depth",
                "category": "depth",
                "priority": "high",
                "title": "Deepen Your Conversations",
                "description": "Moving beyond surface-level chat builds real connection.",
                "action_items": [
                    "Ask thoughtful follow-up questions",
                    "Share personal stories and experiences",
                    "Discuss dreams, goals, and values",
                ],
                "expected_impact": "Deeper conversations create stronger emotional bonds",
            },
            "mutual_interest": {
                "id": "rec_interest",
                "category": "engagement",
                "priority": "high",
                "title": "Show Genuine Curiosity",
                "description": "Demonstrating interest encourages reciprocation.",
                "action_items": [
                    "Ask about their interests and passions",
                    "Remember and reference previous topics",
                    "Express enthusiasm about shared interests",
                ],
                "expected_impact": "Showing genuine interest often leads to reciprocated curiosity",
            },
            "engagement_reciprocity": {
                "id": "rec_reciprocity",
                "category": "communication",
                "priority": "medium",
                "title": "Balance the Conversation",
                "description": "Healthy conversations have balanced participation.",
                "action_items": [
                    "If you're messaging more, give space for them to initiate",
                    "If they're messaging more, engage more actively",
                    "Aim for roughly equal message counts",
                ],
                "expected_impact": "Balanced conversations feel more natural and sustainable",
            },
            "topic_diversity": {
                "id": "rec_topics",
                "category": "depth",
                "priority": "medium",
                "title": "Explore New Topics",
                "description": "Variety keeps conversations fresh and interesting.",
                "action_items": [
                    "Ask about their weekend plans or recent activities",
                    "Share something new you learned or experienced",
                    "Discuss hypothetical scenarios or dreams",
                ],
                "expected_impact": "Topic variety reveals more about each other and prevents stagnation",
            },
        }

        return factor_recommendations.get(factor["name"])

    def _get_outcome_recommendations(
        self,
        outcome: str,
        milestone_progress: Dict[str, Any],
        user_profile: Dict[str, Any],
        match_profile: Dict[str, Any],
    ) -> List[Dict[str, Any]]:
        """Get recommendations based on predicted outcome."""
        recommendations = []

        if outcome == "strong_connection":
            recommendations.append({
                "id": "rec_meetup",
                "category": "depth",
                "priority": "high",
                "title": "Take It to the Next Level",
                "description": "Your connection is strong - consider moving forward!",
                "action_items": [
                    "Suggest a video call if you haven't yet",
                    "Propose meeting up in person",
                    "Exchange phone numbers for easier communication",
                ],
                "expected_impact": "Meeting in person solidifies strong online connections",
            })

        elif outcome == "building_interest":
            recommendations.append({
                "id": "rec_maintain",
                "category": "engagement",
                "priority": "medium",
                "title": "Keep the Momentum Going",
                "description": "Interest is building - maintain consistency.",
                "action_items": [
                    "Continue your current communication pattern",
                    "Start introducing slightly deeper topics",
                    "Look for natural opportunities to suggest meeting",
                ],
                "expected_impact": "Consistent effort during building phase leads to stronger connection",
            })

        elif outcome == "plateau":
            recommendations.append({
                "id": "rec_spark",
                "category": "engagement",
                "priority": "high",
                "title": "Reignite the Spark",
                "description": "The conversation has plateaued - try something new.",
                "action_items": [
                    "Share something exciting from your life",
                    "Ask a creative or unexpected question",
                    "Suggest a fun activity to do together (virtual or in-person)",
                ],
                "expected_impact": "Breaking routine patterns can revitalize stalled connections",
            })

        elif outcome == "fading":
            recommendations.append({
                "id": "rec_revive",
                "category": "communication",
                "priority": "high",
                "title": "Make a Meaningful Reconnection",
                "description": "The connection is fading - decisive action needed.",
                "action_items": [
                    "Send a thoughtful message referencing something specific",
                    "Be direct about wanting to continue the conversation",
                    "Suggest a specific date or activity",
                ],
                "expected_impact": "A genuine reconnection attempt can turn things around",
            })

        return recommendations

    def _get_milestone_recommendations(
        self,
        milestone_progress: Dict[str, Any],
    ) -> List[Dict[str, Any]]:
        """Get recommendations based on milestone progress."""
        recommendations = []

        if not milestone_progress.get("mutual_questions", {}).get("achieved"):
            recommendations.append({
                "id": "rec_questions",
                "category": "engagement",
                "priority": "high",
                "title": "Ask Engaging Questions",
                "description": "Questions show interest and drive conversations forward.",
                "action_items": [
                    "Ask about their interests, hobbies, or recent activities",
                    "Follow up on things they've mentioned",
                    "Ask open-ended questions that invite detailed responses",
                ],
                "expected_impact": "Questions demonstrate genuine interest and encourage sharing",
            })

        if not milestone_progress.get("consistent_communication", {}).get("achieved"):
            recommendations.append({
                "id": "rec_consistency",
                "category": "timing",
                "priority": "medium",
                "title": "Build Communication Consistency",
                "description": "Regular communication builds familiarity and trust.",
                "action_items": [
                    "Try to exchange messages daily",
                    "Find a rhythm that works for both of you",
                    "Don't let days go by without reaching out",
                ],
                "expected_impact": "Consistency creates a foundation for deeper connection",
            })

        return recommendations

    # =========================================================================
    # AI Enhancement (optional)
    # =========================================================================

    async def _get_ai_enhanced_insights(
        self,
        history: List[Dict[str, Any]],
        user_profile: Dict[str, Any],
        match_profile: Dict[str, Any],
        factors: List[Dict[str, Any]],
        predicted_outcome: str,
    ) -> Optional[Dict[str, Any]]:
        """Get AI-enhanced insights for the prediction."""
        if not self.ai_provider:
            return None

        try:
            # Build prompt for AI
            system_prompt = """You are an expert relationship coach analyzing conversation patterns.
            Provide 2-3 specific insights and 1-2 actionable recommendations based on the data.
            Be encouraging but honest. Focus on specific patterns you notice."""

            # Format recent conversation
            recent_messages = history[-15:] if len(history) > 15 else history
            conv_str = "\n".join([
                f"{'Match' if m.get('is_match') else 'User'}: {m.get('text', '')[:100]}"
                for m in recent_messages
            ])

            factor_summary = "\n".join([
                f"- {f['name']}: {f['score']:.0f}/100 ({f['trend']})"
                for f in factors
            ])

            user_prompt = f"""Analyze this relationship trajectory:

PREDICTED OUTCOME: {predicted_outcome}

FACTOR SCORES:
{factor_summary}

RECENT CONVERSATION:
{conv_str}

Return JSON with:
{{
    "insights": [
        {{"type": "insight_type", "title": "title", "description": "description", "confidence": 0.8}}
    ],
    "recommendations": [
        {{"id": "rec_ai_1", "category": "category", "priority": "priority", "title": "title", "description": "desc", "action_items": ["item"], "expected_impact": "impact"}}
    ]
}}"""

            response = await self.ai_provider.generate_structured_completion(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                output_format="json",
                temperature=0.7,
            )

            return json.loads(response)

        except Exception as e:
            logger.warning(f"AI enhancement failed: {e}")
            return None

    # =========================================================================
    # Utility methods
    # =========================================================================

    def _calculate_time_diff(
        self,
        start: Any,
        end: Any,
    ) -> Optional[float]:
        """Calculate time difference in seconds."""
        try:
            start_dt = self._parse_timestamp(start)
            end_dt = self._parse_timestamp(end)
            if start_dt and end_dt:
                return (end_dt - start_dt).total_seconds()
        except Exception:
            pass
        return None

    def _parse_timestamp(self, ts: Any) -> Optional[datetime]:
        """Parse various timestamp formats."""
        if isinstance(ts, datetime):
            return ts if ts.tzinfo else ts.replace(tzinfo=timezone.utc)
        if isinstance(ts, (int, float)):
            return datetime.fromtimestamp(ts, tz=timezone.utc)
        if isinstance(ts, str):
            try:
                dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
            except ValueError:
                pass
        return None

    def _get_conversation_days(self, history: List[Dict[str, Any]]) -> int:
        """Get conversation duration in days."""
        if len(history) < 2:
            return 1
        first_ts = history[0].get("timestamp")
        last_ts = history[-1].get("timestamp")
        if first_ts and last_ts:
            first_dt = self._parse_timestamp(first_ts)
            last_dt = self._parse_timestamp(last_ts)
            if first_dt and last_dt:
                return max(1, (last_dt - first_dt).days + 1)
        return 1

    def _get_fallback_prediction(self) -> Dict[str, Any]:
        """Return fallback prediction when analysis fails."""
        return {
            "trajectory_score": 50.0,
            "predicted_outcome": "uncertain",
            "confidence": 0.3,
            "factors": [
                {
                    "name": "analysis_unavailable",
                    "score": 50.0,
                    "weight": 1.0,
                    "trend": "stable",
                    "description": "Unable to fully analyze conversation patterns",
                    "impact": "medium",
                }
            ],
            "recommendations": [
                {
                    "id": "rec_fallback",
                    "category": "communication",
                    "priority": "medium",
                    "title": "Keep Engaging",
                    "description": "Continue the conversation to build more data for analysis.",
                    "action_items": [
                        "Exchange more messages",
                        "Ask questions to learn about each other",
                    ],
                    "expected_impact": "More conversation enables better trajectory prediction",
                }
            ],
            "insights": [
                {
                    "type": "milestone",
                    "title": "Early Stage",
                    "description": "Not enough conversation history for detailed analysis yet.",
                    "confidence": 0.5,
                }
            ],
            "momentum": "steady",
            "milestone_progress": {
                "overall_progress": {"achieved": 0, "total": 7, "percentage": 0.0}
            },
            "next_milestone": "Continue building your conversation",
            "risk_factors": [],
            "positive_signals": [],
        }
