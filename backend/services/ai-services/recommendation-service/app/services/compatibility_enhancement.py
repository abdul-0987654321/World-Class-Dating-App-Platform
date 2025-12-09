"""AI Compatibility Predictor Enhancement Service."""

import asyncio
from typing import Dict, List, Optional, Any
import structlog
from datetime import datetime
import re

logger = structlog.get_logger()


class CompatibilityEnhancementService:
    """Enhanced compatibility prediction with red-flag analysis and communication matching."""

    def __init__(self, settings):
        """Initialize the compatibility enhancement service."""
        self.settings = settings
        self.logger = logger

        # Red flag indicators
        self.red_flag_patterns = {
            "inconsistency": {
                "weight": 0.8,
                "indicators": ["contradictions", "changing stories", "avoiding questions"]
            },
            "rushing": {
                "weight": 0.7,
                "indicators": ["too fast", "love bombing", "immediate commitment", "urgent"]
            },
            "isolation": {
                "weight": 0.9,
                "indicators": ["keep secret", "don't tell", "only me", "nobody else"]
            },
            "financial_requests": {
                "weight": 1.0,
                "indicators": ["money", "loan", "emergency", "transfer", "bitcoin", "crypto"]
            },
            "avoiding_meetup": {
                "weight": 0.6,
                "indicators": ["can't meet", "overseas", "military", "oil rig", "always busy"]
            },
            "excessive_flattery": {
                "weight": 0.5,
                "indicators": ["soulmate", "destiny", "meant to be", "perfect match"]
            },
            "aggression": {
                "weight": 0.9,
                "indicators": ["threatening", "demanding", "controlling", "possessive"]
            },
            "privacy_invasion": {
                "weight": 0.7,
                "indicators": ["password", "track location", "check phone", "suspicious"]
            }
        }

        # Communication style categories
        self.communication_styles = {
            "expressive": {
                "characteristics": ["emoji usage", "exclamations", "long messages", "detailed"],
                "compatibility": ["expressive", "balanced"]
            },
            "concise": {
                "characteristics": ["short messages", "direct", "to-the-point"],
                "compatibility": ["concise", "balanced"]
            },
            "analytical": {
                "characteristics": ["questions", "logical", "structured"],
                "compatibility": ["analytical", "balanced", "expressive"]
            },
            "emotional": {
                "characteristics": ["feelings", "emotions", "empathy"],
                "compatibility": ["emotional", "expressive", "balanced"]
            },
            "balanced": {
                "characteristics": ["moderate length", "varied content", "appropriate emoticons"],
                "compatibility": ["balanced", "expressive", "concise", "analytical", "emotional"]
            }
        }

    async def initialize(self):
        """Initialize service resources."""
        try:
            self.logger.info("Initializing Compatibility Enhancement Service")
            # Any async initialization needed
            self.logger.info("Compatibility Enhancement Service initialized successfully")
        except Exception as e:
            self.logger.error("Failed to initialize Compatibility Enhancement Service", error=str(e))
            raise

    async def close(self):
        """Cleanup resources."""
        self.logger.info("Closing Compatibility Enhancement Service")

    async def analyze_red_flags(
        self,
        conversation_history: List[Dict[str, Any]],
        user_profile: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Analyze conversation for red flags.

        Args:
            conversation_history: List of messages in the conversation
            user_profile: Optional user profile for additional context

        Returns:
            Dictionary with red flag analysis
        """
        try:
            self.logger.info("Analyzing conversation for red flags")

            if not conversation_history:
                return {
                    "red_flags_detected": [],
                    "risk_level": "unknown",
                    "risk_score": 0.0,
                    "recommendations": ["Not enough conversation data to analyze"]
                }

            # Combine all messages
            all_messages = " ".join([msg.get("text", "").lower() for msg in conversation_history])

            # Detect red flags
            detected_flags = []
            total_risk_score = 0.0

            for flag_type, flag_info in self.red_flag_patterns.items():
                indicators_found = []
                for indicator in flag_info["indicators"]:
                    if indicator.lower() in all_messages:
                        indicators_found.append(indicator)

                if indicators_found:
                    flag_score = flag_info["weight"] * (len(indicators_found) / len(flag_info["indicators"]))
                    total_risk_score += flag_score

                    detected_flags.append({
                        "type": flag_type,
                        "severity": self._get_severity(flag_info["weight"]),
                        "indicators": indicators_found,
                        "score": flag_score,
                        "description": self._get_red_flag_description(flag_type)
                    })

            # Normalize risk score
            max_possible_score = sum(f["weight"] for f in self.red_flag_patterns.values())
            normalized_risk = min(1.0, total_risk_score / max_possible_score)

            # Determine risk level
            risk_level = self._determine_risk_level(normalized_risk)

            # Generate recommendations
            recommendations = self._generate_red_flag_recommendations(detected_flags, risk_level)

            # Additional analysis
            message_patterns = self._analyze_message_patterns(conversation_history)

            return {
                "red_flags_detected": detected_flags,
                "risk_level": risk_level,
                "risk_score": round(normalized_risk, 2),
                "total_flags": len(detected_flags),
                "recommendations": recommendations,
                "message_patterns": message_patterns,
                "conversation_health": self._assess_conversation_health(
                    conversation_history, detected_flags
                ),
                "safety_tips": self._get_safety_tips(risk_level)
            }

        except Exception as e:
            self.logger.error("Red flag analysis failed", error=str(e))
            raise

    async def assess_relationship_readiness(
        self,
        user_profile: Dict[str, Any],
        behavioral_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Assess user's relationship readiness.

        Args:
            user_profile: User's profile information
            behavioral_data: Optional behavioral data (activity, engagement, etc.)

        Returns:
            Dictionary with readiness assessment
        """
        try:
            self.logger.info("Assessing relationship readiness")

            # Analyze profile completeness
            profile_completeness = self._assess_profile_completeness(user_profile)

            # Analyze relationship goals clarity
            goals_clarity = self._assess_goals_clarity(user_profile)

            # Analyze emotional readiness indicators
            emotional_readiness = self._assess_emotional_readiness(user_profile, behavioral_data)

            # Analyze time availability
            time_availability = self._assess_time_availability(user_profile, behavioral_data)

            # Calculate overall readiness score
            readiness_factors = {
                "profile_completeness": profile_completeness,
                "goals_clarity": goals_clarity,
                "emotional_readiness": emotional_readiness,
                "time_availability": time_availability
            }

            overall_score = sum(readiness_factors.values()) / len(readiness_factors)

            # Determine readiness level
            readiness_level = self._determine_readiness_level(overall_score)

            # Generate recommendations
            recommendations = self._generate_readiness_recommendations(readiness_factors)

            return {
                "readiness_level": readiness_level,
                "overall_score": round(overall_score, 2),
                "factors": {
                    "profile_completeness": {
                        "score": round(profile_completeness, 2),
                        "description": "How complete and authentic your profile is"
                    },
                    "goals_clarity": {
                        "score": round(goals_clarity, 2),
                        "description": "How clear you are about what you want"
                    },
                    "emotional_readiness": {
                        "score": round(emotional_readiness, 2),
                        "description": "Your emotional preparation for a relationship"
                    },
                    "time_availability": {
                        "score": round(time_availability, 2),
                        "description": "Your ability to invest time in a relationship"
                    }
                },
                "recommendations": recommendations,
                "strengths": self._identify_readiness_strengths(readiness_factors),
                "areas_for_growth": self._identify_readiness_growth_areas(readiness_factors)
            }

        except Exception as e:
            self.logger.error("Relationship readiness assessment failed", error=str(e))
            raise

    async def match_communication_styles(
        self,
        user_a_messages: List[Dict[str, Any]],
        user_b_messages: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Analyze and match communication styles between two users.

        Args:
            user_a_messages: Messages from user A
            user_b_messages: Messages from user B

        Returns:
            Dictionary with communication style matching analysis
        """
        try:
            self.logger.info("Matching communication styles")

            # Analyze each user's communication style
            style_a = self._analyze_communication_style(user_a_messages)
            style_b = self._analyze_communication_style(user_b_messages)

            # Calculate compatibility
            compatibility_score = self._calculate_style_compatibility(style_a, style_b)

            # Identify potential conflicts
            potential_conflicts = self._identify_style_conflicts(style_a, style_b)

            # Generate suggestions
            suggestions = self._generate_style_suggestions(style_a, style_b, potential_conflicts)

            return {
                "user_a_style": style_a,
                "user_b_style": style_b,
                "compatibility_score": round(compatibility_score, 2),
                "compatibility_level": self._get_compatibility_level(compatibility_score),
                "potential_conflicts": potential_conflicts,
                "suggestions": suggestions,
                "communication_insights": self._get_communication_insights(style_a, style_b)
            }

        except Exception as e:
            self.logger.error("Communication style matching failed", error=str(e))
            raise

    def _get_severity(self, weight: float) -> str:
        """Get severity level from weight."""
        if weight >= 0.8:
            return "critical"
        elif weight >= 0.6:
            return "high"
        elif weight >= 0.4:
            return "medium"
        else:
            return "low"

    def _get_red_flag_description(self, flag_type: str) -> str:
        """Get description for red flag type."""
        descriptions = {
            "inconsistency": "Inconsistent or contradictory statements",
            "rushing": "Rushing the relationship or love bombing",
            "isolation": "Attempting to isolate from friends or family",
            "financial_requests": "Requests for money or financial information",
            "avoiding_meetup": "Consistently avoiding in-person meetings",
            "excessive_flattery": "Excessive or unrealistic compliments",
            "aggression": "Aggressive, controlling, or threatening behavior",
            "privacy_invasion": "Invasive questions about privacy or security"
        }
        return descriptions.get(flag_type, "Unknown red flag type")

    def _determine_risk_level(self, score: float) -> str:
        """Determine risk level from score."""
        if score >= 0.7:
            return "high"
        elif score >= 0.4:
            return "medium"
        elif score >= 0.2:
            return "low"
        else:
            return "minimal"

    def _generate_red_flag_recommendations(self, flags: List[Dict], risk_level: str) -> List[str]:
        """Generate recommendations based on detected red flags."""
        recommendations = []

        if risk_level in ["high", "critical"]:
            recommendations.append("Consider ending this conversation and reporting this user")
            recommendations.append("Never share financial information or send money")
            recommendations.append("Trust your instincts - if something feels wrong, it probably is")

        elif risk_level == "medium":
            recommendations.append("Proceed with caution and watch for additional warning signs")
            recommendations.append("Take your time getting to know this person")
            recommendations.append("Meet in public places and tell friends about your plans")

        elif risk_level == "low":
            recommendations.append("Stay alert and continue monitoring the conversation")
            recommendations.append("Maintain healthy boundaries")

        # Specific recommendations based on flag types
        for flag in flags:
            if flag["type"] == "financial_requests":
                recommendations.append("NEVER send money to someone you met online")
            elif flag["type"] == "isolation":
                recommendations.append("Maintain relationships with friends and family")
            elif flag["type"] == "rushing":
                recommendations.append("Slow down and take time to build trust naturally")

        return list(set(recommendations))[:5]

    def _analyze_message_patterns(self, messages: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze patterns in messages."""
        if not messages:
            return {}

        message_lengths = [len(msg.get("text", "").split()) for msg in messages]
        avg_length = sum(message_lengths) / len(message_lengths) if message_lengths else 0

        # Count question marks
        question_count = sum(msg.get("text", "").count("?") for msg in messages)

        # Time between messages (if timestamps available)
        response_times = []
        for i in range(1, len(messages)):
            if "timestamp" in messages[i] and "timestamp" in messages[i-1]:
                delta = messages[i]["timestamp"] - messages[i-1]["timestamp"]
                response_times.append(delta.total_seconds() if hasattr(delta, 'total_seconds') else 0)

        return {
            "average_message_length": round(avg_length, 1),
            "total_messages": len(messages),
            "question_frequency": round(question_count / len(messages), 2) if messages else 0,
            "avg_response_time_seconds": round(sum(response_times) / len(response_times), 1) if response_times else None
        }

    def _assess_conversation_health(self, messages: List[Dict], flags: List[Dict]) -> str:
        """Assess overall conversation health."""
        if len(flags) >= 3:
            return "unhealthy"
        elif len(flags) >= 1:
            return "concerning"
        elif len(messages) >= 10:
            return "healthy"
        else:
            return "developing"

    def _get_safety_tips(self, risk_level: str) -> List[str]:
        """Get safety tips based on risk level."""
        base_tips = [
            "Never share personal financial information",
            "Meet in public places for first dates",
            "Tell a friend about your plans",
            "Trust your instincts"
        ]

        if risk_level == "high":
            return base_tips + [
                "Consider blocking and reporting this user",
                "Do not continue engaging",
                "Save conversation evidence"
            ]
        elif risk_level == "medium":
            return base_tips + [
                "Proceed with extra caution",
                "Watch for additional red flags"
            ]
        else:
            return base_tips[:3]

    def _assess_profile_completeness(self, profile: Dict[str, Any]) -> float:
        """Assess how complete the profile is."""
        required_fields = ["bio", "interests", "photos", "age", "location"]
        filled_fields = sum(1 for field in required_fields if profile.get(field))

        # Bonus for quality bio
        bio = profile.get("bio", "")
        if len(bio.split()) >= 20:
            filled_fields += 0.5

        # Bonus for multiple photos
        photos = profile.get("photos", [])
        if len(photos) >= 3:
            filled_fields += 0.5

        return min(1.0, filled_fields / len(required_fields))

    def _assess_goals_clarity(self, profile: Dict[str, Any]) -> float:
        """Assess clarity of relationship goals."""
        score = 0.5  # Base score

        # Check for relationship goals field
        if "relationship_goals" in profile:
            score += 0.3

        # Check bio for goal-related keywords
        bio = profile.get("bio", "").lower()
        goal_keywords = ["looking for", "want", "seeking", "hope to", "relationship", "partner"]
        if any(keyword in bio for keyword in goal_keywords):
            score += 0.2

        return min(1.0, score)

    def _assess_emotional_readiness(self, profile: Dict[str, Any], behavioral_data: Optional[Dict]) -> float:
        """Assess emotional readiness indicators."""
        score = 0.6  # Base score

        # Profile indicators
        bio = profile.get("bio", "").lower()

        # Positive indicators
        if "ready" in bio or "excited" in bio:
            score += 0.1

        # Negative indicators
        red_flags = ["just got out of", "recent breakup", "divorce", "complicated"]
        if any(flag in bio for flag in red_flags):
            score -= 0.2

        # Behavioral indicators (if available)
        if behavioral_data:
            # Consistent activity is a good sign
            if behavioral_data.get("active_days", 0) >= 5:
                score += 0.1

        return max(0.0, min(1.0, score))

    def _assess_time_availability(self, profile: Dict[str, Any], behavioral_data: Optional[Dict]) -> float:
        """Assess time availability for a relationship."""
        score = 0.6  # Base score

        # Check profile mentions of schedule
        bio = profile.get("bio", "").lower()

        if "busy" in bio or "workaholic" in bio:
            score -= 0.1
        if "flexible" in bio or "free time" in bio:
            score += 0.1

        # Behavioral data
        if behavioral_data:
            response_rate = behavioral_data.get("message_response_rate", 0.5)
            score += response_rate * 0.3

        return max(0.0, min(1.0, score))

    def _determine_readiness_level(self, score: float) -> str:
        """Determine readiness level from score."""
        if score >= 0.8:
            return "highly_ready"
        elif score >= 0.6:
            return "ready"
        elif score >= 0.4:
            return "somewhat_ready"
        else:
            return "not_ready"

    def _generate_readiness_recommendations(self, factors: Dict[str, float]) -> List[str]:
        """Generate recommendations based on readiness factors."""
        recommendations = []

        if factors["profile_completeness"] < 0.7:
            recommendations.append("Complete your profile with more photos and details about yourself")

        if factors["goals_clarity"] < 0.6:
            recommendations.append("Be clearer about what you're looking for in a relationship")

        if factors["emotional_readiness"] < 0.5:
            recommendations.append("Take time to process past relationships before starting something new")

        if factors["time_availability"] < 0.5:
            recommendations.append("Ensure you have time to invest in building a meaningful connection")

        if not recommendations:
            recommendations.append("You're in a great place to start dating!")

        return recommendations

    def _identify_readiness_strengths(self, factors: Dict[str, float]) -> List[str]:
        """Identify strengths in readiness."""
        strengths = []

        if factors["profile_completeness"] >= 0.8:
            strengths.append("Well-developed profile")

        if factors["goals_clarity"] >= 0.7:
            strengths.append("Clear relationship goals")

        if factors["emotional_readiness"] >= 0.7:
            strengths.append("Emotionally prepared")

        if factors["time_availability"] >= 0.7:
            strengths.append("Good time availability")

        return strengths

    def _identify_readiness_growth_areas(self, factors: Dict[str, float]) -> List[str]:
        """Identify areas for growth in readiness."""
        growth_areas = []

        if factors["profile_completeness"] < 0.6:
            growth_areas.append("Profile completeness")

        if factors["goals_clarity"] < 0.6:
            growth_areas.append("Goal clarity")

        if factors["emotional_readiness"] < 0.6:
            growth_areas.append("Emotional readiness")

        if factors["time_availability"] < 0.6:
            growth_areas.append("Time management")

        return growth_areas

    def _analyze_communication_style(self, messages: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze communication style from messages."""
        if not messages:
            return {"primary_style": "unknown", "characteristics": []}

        # Calculate metrics
        total_messages = len(messages)
        total_words = sum(len(msg.get("text", "").split()) for msg in messages)
        avg_message_length = total_words / total_messages if total_messages > 0 else 0

        # Count characteristics
        emoji_count = sum(len(re.findall(r'[😀-🙏]', msg.get("text", ""))) for msg in messages)
        question_count = sum(msg.get("text", "").count("?") for msg in messages)
        exclamation_count = sum(msg.get("text", "").count("!") for msg in messages)

        # Analyze content
        all_text = " ".join([msg.get("text", "").lower() for msg in messages])

        feeling_words = ["feel", "emotion", "heart", "love", "care", "worry"]
        emotion_count = sum(all_text.count(word) for word in feeling_words)

        # Determine primary style
        style_scores = {
            "expressive": 0,
            "concise": 0,
            "analytical": 0,
            "emotional": 0,
            "balanced": 0
        }

        # Score each style
        if avg_message_length > 30:
            style_scores["expressive"] += 2
        elif avg_message_length < 10:
            style_scores["concise"] += 2
        else:
            style_scores["balanced"] += 1

        if emoji_count / total_messages > 1:
            style_scores["expressive"] += 1
            style_scores["emotional"] += 1

        if question_count / total_messages > 0.3:
            style_scores["analytical"] += 2

        if emotion_count > 5:
            style_scores["emotional"] += 2

        primary_style = max(style_scores.items(), key=lambda x: x[1])[0]

        return {
            "primary_style": primary_style,
            "style_scores": style_scores,
            "characteristics": {
                "avg_message_length": round(avg_message_length, 1),
                "emoji_usage": round(emoji_count / total_messages, 2),
                "question_frequency": round(question_count / total_messages, 2),
                "emotional_expression": "high" if emotion_count > 5 else "moderate" if emotion_count > 2 else "low"
            },
            "message_count": total_messages
        }

    def _calculate_style_compatibility(self, style_a: Dict, style_b: Dict) -> float:
        """Calculate compatibility between communication styles."""
        primary_a = style_a.get("primary_style", "unknown")
        primary_b = style_b.get("primary_style", "unknown")

        if primary_a == "unknown" or primary_b == "unknown":
            return 0.5

        # Check if styles are compatible
        compatible_styles = self.communication_styles.get(primary_a, {}).get("compatibility", [])

        if primary_b in compatible_styles:
            if primary_a == primary_b:
                return 0.9  # Same style, very compatible
            else:
                return 0.75  # Different but compatible styles
        else:
            return 0.5  # Potentially less compatible

    def _identify_style_conflicts(self, style_a: Dict, style_b: Dict) -> List[Dict[str, str]]:
        """Identify potential conflicts between communication styles."""
        conflicts = []

        chars_a = style_a.get("characteristics", {})
        chars_b = style_b.get("characteristics", {})

        # Length mismatch
        if abs(chars_a.get("avg_message_length", 0) - chars_b.get("avg_message_length", 0)) > 30:
            conflicts.append({
                "type": "message_length",
                "description": "Significant difference in message length preferences",
                "severity": "low"
            })

        # Emoji usage mismatch
        emoji_diff = abs(chars_a.get("emoji_usage", 0) - chars_b.get("emoji_usage", 0))
        if emoji_diff > 0.5:
            conflicts.append({
                "type": "emoji_usage",
                "description": "Different preferences for emoji usage",
                "severity": "low"
            })

        # Emotional expression mismatch
        emotion_a = chars_a.get("emotional_expression", "moderate")
        emotion_b = chars_b.get("emotional_expression", "moderate")
        if (emotion_a == "high" and emotion_b == "low") or (emotion_a == "low" and emotion_b == "high"):
            conflicts.append({
                "type": "emotional_expression",
                "description": "Different levels of emotional expression",
                "severity": "medium"
            })

        return conflicts

    def _generate_style_suggestions(self, style_a: Dict, style_b: Dict, conflicts: List[Dict]) -> List[str]:
        """Generate suggestions for improving communication compatibility."""
        suggestions = []

        if not conflicts:
            suggestions.append("Your communication styles are well-matched!")
            return suggestions

        for conflict in conflicts:
            if conflict["type"] == "message_length":
                suggestions.append("Try to balance message lengths - meet somewhere in the middle")

            elif conflict["type"] == "emoji_usage":
                suggestions.append("Be aware of different emoji preferences - match their energy")

            elif conflict["type"] == "emotional_expression":
                suggestions.append("Respect different comfort levels with emotional expression")

        suggestions.append("Good communication means adapting to each other's styles")

        return suggestions[:5]

    def _get_compatibility_level(self, score: float) -> str:
        """Get compatibility level from score."""
        if score >= 0.8:
            return "excellent"
        elif score >= 0.6:
            return "good"
        elif score >= 0.4:
            return "fair"
        else:
            return "challenging"

    def _get_communication_insights(self, style_a: Dict, style_b: Dict) -> List[str]:
        """Get insights about the communication dynamic."""
        insights = []

        primary_a = style_a.get("primary_style", "unknown")
        primary_b = style_b.get("primary_style", "unknown")

        if primary_a == primary_b:
            insights.append(f"Both users have {primary_a} communication styles")

        insights.append(f"User A prefers {primary_a} communication")
        insights.append(f"User B prefers {primary_b} communication")

        # Add specific insights based on characteristics
        chars_a = style_a.get("characteristics", {})
        chars_b = style_b.get("characteristics", {})

        if chars_a.get("emoji_usage", 0) > 0.5 and chars_b.get("emoji_usage", 0) > 0.5:
            insights.append("Both users enjoy expressive communication with emojis")

        if chars_a.get("question_frequency", 0) > 0.3 or chars_b.get("question_frequency", 0) > 0.3:
            insights.append("Active engagement through questions")

        return insights[:5]
