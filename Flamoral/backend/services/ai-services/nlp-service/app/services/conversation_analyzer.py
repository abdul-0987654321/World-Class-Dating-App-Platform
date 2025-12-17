"""Conversation analysis service for detecting patterns and generating suggestions."""

from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import re
import random
import structlog
import redis.asyncio as redis
from motor.motor_asyncio import AsyncIOMotorClient

from app.config import Settings

logger = structlog.get_logger()


class ConversationAnalyzerService:
    """Service for analyzing conversations and generating suggestions."""

    def __init__(self, settings: Settings):
        self.settings = settings
        self.redis_client: Optional[redis.Redis] = None
        self.mongo_client: Optional[AsyncIOMotorClient] = None
        self.db = None

        # Scam conversation patterns
        self.scam_patterns = {
            "romance_scam": {
                "early_stage": [
                    "love at first sight", "soulmate", "destiny", "meant to be",
                    "never felt this way", "strong connection", "god brought us together"
                ],
                "mid_stage": [
                    "trust me", "prove your love", "if you really loved me",
                    "don't tell anyone", "keep this between us", "only you understand"
                ],
                "late_stage": [
                    "need money", "emergency", "hospital", "stranded",
                    "investment opportunity", "wire transfer", "gift card",
                    "western union", "bitcoin", "crypto"
                ]
            },
            "manipulation": {
                "guilt_tripping": [
                    "after all i've done", "you don't care", "i thought you",
                    "you're making me sad", "i'm so disappointed"
                ],
                "love_bombing": [
                    "you're perfect", "you're the only one", "can't live without you",
                    "you're my everything", "you complete me"
                ],
                "isolation": [
                    "your friends don't understand", "they're jealous",
                    "you don't need them", "i'm the only one who cares"
                ]
            }
        }

        # Icebreaker templates
        self.icebreaker_templates = [
            "I noticed you're into {interest}! What got you started with that?",
            "Your photo at {location} looks amazing! Have you traveled there recently?",
            "Fellow {interest} enthusiast here! What's your favorite {interest_specific}?",
            "I see you love {interest}. Have you tried {suggestion}?",
            "Your profile really caught my attention! Tell me more about {interest}.",
            "I have a feeling we'd have great conversations about {interest}!",
            "What's the story behind your interest in {interest}?",
            "I'd love to hear your take on {topic}!"
        ]

        # Smart reply templates based on context
        self.reply_templates = {
            "greeting": [
                "Hey! Great to hear from you! How's your day going?",
                "Hi there! I'm doing well, thanks for asking! How about you?",
                "Hello! Nice to match with you! What brings you here?"
            ],
            "question": [
                "That's a great question! I'd say {topic_related}",
                "Hmm, let me think... I'd go with {topic_related}",
                "Good question! For me, it's definitely {topic_related}"
            ],
            "compliment": [
                "That's so kind of you to say! I really appreciate it.",
                "Aww, thank you! That made my day!",
                "Thanks! That's really sweet of you!"
            ],
            "interest_shared": [
                "No way, I love {interest} too! What's your favorite {specific}?",
                "That's awesome! We definitely have something in common!",
                "Same here! Have you ever {related_activity}?"
            ],
            "date_suggestion": [
                "That sounds like fun! When were you thinking?",
                "I'd love that! What day works best for you?",
                "Great idea! I'm free {availability}"
            ]
        }

    async def initialize(self):
        """Initialize the service."""
        try:
            self.redis_client = redis.from_url(
                self.settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True
            )
            await self.redis_client.ping()

            self.mongo_client = AsyncIOMotorClient(self.settings.MONGODB_URL)
            self.db = self.mongo_client[self.settings.MONGODB_DATABASE]

            logger.info("ConversationAnalyzer initialized")
        except Exception as e:
            logger.error("Failed to initialize conversation analyzer", error=str(e))
            raise

    async def close(self):
        """Close service connections."""
        if self.redis_client:
            await self.redis_client.close()
        if self.mongo_client:
            self.mongo_client.close()

    async def analyze_conversation(
        self,
        conversation_id: str,
        messages: List[Dict],
        user_id: str
    ) -> Dict[str, Any]:
        """
        Analyze a conversation for patterns and red flags.

        Args:
            conversation_id: Conversation ID
            messages: List of messages
            user_id: User to analyze

        Returns:
            Conversation analysis results
        """
        if not messages:
            return {
                "conversation_id": conversation_id,
                "risk_score": 0.0,
                "red_flags": [],
                "engagement_quality": "unknown",
                "summary": {}
            }

        # Filter messages from target user
        user_messages = [m for m in messages if m.get("sender_id") == user_id]
        other_messages = [m for m in messages if m.get("sender_id") != user_id]

        risk_factors = []
        risk_score = 0.0

        # Check for scam patterns
        scam_result = self._detect_scam_patterns(user_messages)
        if scam_result["detected"]:
            risk_factors.extend(scam_result["factors"])
            risk_score += scam_result["risk_contribution"]

        # Check for manipulation patterns
        manipulation_result = self._detect_manipulation(user_messages)
        if manipulation_result["detected"]:
            risk_factors.extend(manipulation_result["factors"])
            risk_score += manipulation_result["risk_contribution"]

        # Analyze response patterns
        response_analysis = self._analyze_response_patterns(messages, user_id)

        # Analyze conversation flow
        flow_analysis = self._analyze_conversation_flow(messages, user_id)

        # Calculate engagement quality
        engagement = self._calculate_engagement_quality(
            user_messages,
            other_messages,
            response_analysis
        )

        # Normalize risk score
        risk_score = min(1.0, risk_score)

        # Store analysis
        await self._store_conversation_analysis(conversation_id, user_id, {
            "risk_score": risk_score,
            "risk_factors": risk_factors,
            "engagement": engagement,
            "timestamp": datetime.utcnow().isoformat()
        })

        return {
            "conversation_id": conversation_id,
            "user_id": user_id,
            "risk_score": round(risk_score, 3),
            "risk_level": self._get_risk_level(risk_score),
            "red_flags": risk_factors,
            "engagement_quality": engagement["quality"],
            "engagement_details": engagement,
            "response_patterns": response_analysis,
            "flow_analysis": flow_analysis,
            "recommended_action": self._get_recommended_action(risk_score, risk_factors)
        }

    def _detect_scam_patterns(self, messages: List[Dict]) -> Dict[str, Any]:
        """Detect romance scam patterns in messages."""
        factors = []
        risk_contribution = 0.0

        # Combine all message text
        all_text = " ".join([m.get("text", "").lower() for m in messages])

        # Check each scam stage
        for stage, keywords in self.scam_patterns["romance_scam"].items():
            matches = [kw for kw in keywords if kw in all_text]
            if matches:
                severity = "high" if stage == "late_stage" else "medium" if stage == "mid_stage" else "low"
                contribution = 0.4 if stage == "late_stage" else 0.2 if stage == "mid_stage" else 0.1

                factors.append({
                    "type": f"scam_pattern_{stage}",
                    "severity": severity,
                    "matched_phrases": matches
                })
                risk_contribution += contribution

        return {
            "detected": len(factors) > 0,
            "factors": factors,
            "risk_contribution": risk_contribution
        }

    def _detect_manipulation(self, messages: List[Dict]) -> Dict[str, Any]:
        """Detect manipulation tactics in messages."""
        factors = []
        risk_contribution = 0.0

        all_text = " ".join([m.get("text", "").lower() for m in messages])

        for tactic, keywords in self.scam_patterns["manipulation"].items():
            matches = [kw for kw in keywords if kw in all_text]
            if matches:
                factors.append({
                    "type": f"manipulation_{tactic}",
                    "severity": "medium",
                    "matched_phrases": matches
                })
                risk_contribution += 0.15

        return {
            "detected": len(factors) > 0,
            "factors": factors,
            "risk_contribution": risk_contribution
        }

    def _analyze_response_patterns(
        self,
        messages: List[Dict],
        user_id: str
    ) -> Dict[str, Any]:
        """Analyze response time and patterns."""
        if len(messages) < 2:
            return {"avg_response_time": None, "pattern": "insufficient_data"}

        # Sort messages by timestamp
        sorted_messages = sorted(
            messages,
            key=lambda x: x.get("timestamp") if isinstance(x.get("timestamp"), datetime)
            else datetime.fromisoformat(str(x.get("timestamp")).replace("Z", "+00:00"))
        )

        response_times = []
        last_sender = None
        last_time = None

        for msg in sorted_messages:
            sender = msg.get("sender_id")
            ts = msg.get("timestamp")
            if isinstance(ts, str):
                ts = datetime.fromisoformat(ts.replace("Z", "+00:00"))

            if last_sender and sender == user_id and last_sender != user_id:
                # User responding to other
                if last_time:
                    response_time = (ts - last_time).total_seconds()
                    if response_time > 0:
                        response_times.append(response_time)

            last_sender = sender
            last_time = ts

        if not response_times:
            return {"avg_response_time": None, "pattern": "no_responses"}

        avg_response = sum(response_times) / len(response_times)

        # Determine pattern
        if avg_response < 10:
            pattern = "instant_responder"
        elif avg_response < 60:
            pattern = "quick_responder"
        elif avg_response < 300:
            pattern = "moderate_responder"
        elif avg_response < 3600:
            pattern = "slow_responder"
        else:
            pattern = "delayed_responder"

        return {
            "avg_response_time_seconds": round(avg_response, 2),
            "response_count": len(response_times),
            "pattern": pattern,
            "fastest_response": round(min(response_times), 2),
            "slowest_response": round(max(response_times), 2)
        }

    def _analyze_conversation_flow(
        self,
        messages: List[Dict],
        user_id: str
    ) -> Dict[str, Any]:
        """Analyze the flow and balance of conversation."""
        user_messages = [m for m in messages if m.get("sender_id") == user_id]
        other_messages = [m for m in messages if m.get("sender_id") != user_id]

        user_word_count = sum(len(m.get("text", "").split()) for m in user_messages)
        other_word_count = sum(len(m.get("text", "").split()) for m in other_messages)

        # Calculate balance
        total_words = user_word_count + other_word_count
        user_ratio = user_word_count / total_words if total_words > 0 else 0.5

        # Determine flow type
        if 0.4 <= user_ratio <= 0.6:
            flow_type = "balanced"
        elif user_ratio > 0.6:
            flow_type = "user_dominant"
        else:
            flow_type = "other_dominant"

        # Check for question asking
        user_questions = sum(1 for m in user_messages if "?" in m.get("text", ""))
        other_questions = sum(1 for m in other_messages if "?" in m.get("text", ""))

        return {
            "message_ratio": {
                "user": len(user_messages),
                "other": len(other_messages)
            },
            "word_ratio": {
                "user": user_word_count,
                "other": other_word_count
            },
            "user_contribution_percent": round(user_ratio * 100, 1),
            "flow_type": flow_type,
            "questions_asked": {
                "user": user_questions,
                "other": other_questions
            }
        }

    def _calculate_engagement_quality(
        self,
        user_messages: List[Dict],
        other_messages: List[Dict],
        response_analysis: Dict
    ) -> Dict[str, Any]:
        """Calculate overall engagement quality."""
        if not user_messages:
            return {"quality": "unknown", "score": 0}

        score = 0.5  # Start neutral

        # Response time factor
        pattern = response_analysis.get("pattern", "")
        if pattern == "quick_responder":
            score += 0.15
        elif pattern == "moderate_responder":
            score += 0.1
        elif pattern == "instant_responder":
            score += 0.05  # Might be bot-like
        elif pattern == "slow_responder":
            score -= 0.1
        elif pattern == "delayed_responder":
            score -= 0.2

        # Message length factor
        avg_length = sum(len(m.get("text", "").split()) for m in user_messages) / len(user_messages)
        if avg_length > 20:
            score += 0.15
        elif avg_length > 10:
            score += 0.1
        elif avg_length < 3:
            score -= 0.1

        # Question asking shows interest
        questions = sum(1 for m in user_messages if "?" in m.get("text", ""))
        if questions > 0:
            score += min(0.2, questions * 0.05)

        # Determine quality level
        score = max(0, min(1, score))

        if score >= 0.7:
            quality = "excellent"
        elif score >= 0.5:
            quality = "good"
        elif score >= 0.3:
            quality = "fair"
        else:
            quality = "poor"

        return {
            "quality": quality,
            "score": round(score, 3),
            "factors": {
                "response_pattern": response_analysis.get("pattern", "unknown"),
                "avg_message_length": round(avg_length, 1),
                "questions_asked": questions
            }
        }

    def _get_risk_level(self, score: float) -> str:
        """Get risk level from score."""
        if score >= 0.8:
            return "critical"
        elif score >= 0.6:
            return "high"
        elif score >= 0.4:
            return "medium"
        elif score >= 0.2:
            return "low"
        else:
            return "minimal"

    def _get_recommended_action(
        self,
        risk_score: float,
        risk_factors: List[Dict]
    ) -> str:
        """Get recommended action based on analysis."""
        if risk_score >= 0.8:
            return "block_and_review"
        elif risk_score >= 0.6:
            return "warn_user"
        elif risk_score >= 0.4:
            return "monitor"

        # Check for specific high-severity factors
        high_severity = any(f.get("severity") == "high" for f in risk_factors)
        if high_severity:
            return "review"

        return "none"

    async def generate_icebreakers(
        self,
        sender_profile: Dict,
        recipient_profile: Dict,
        count: int = 3
    ) -> Dict[str, Any]:
        """
        Generate personalized icebreaker suggestions.

        Args:
            sender_profile: Sender's profile
            recipient_profile: Recipient's profile
            count: Number of icebreakers to generate

        Returns:
            List of icebreaker suggestions
        """
        icebreakers = []

        # Find common interests
        sender_interests = set(sender_profile.get("interests", []))
        recipient_interests = set(recipient_profile.get("interests", []))
        common_interests = sender_interests & recipient_interests

        # Generate based on common interests
        for interest in list(common_interests)[:2]:
            template = random.choice(self.icebreaker_templates)
            icebreaker = template.format(
                interest=interest,
                interest_specific="aspect",
                suggestion="something new",
                location="that place",
                topic=interest
            )
            icebreakers.append({
                "text": icebreaker,
                "type": "common_interest",
                "based_on": interest
            })

        # Generate based on recipient's unique interests
        unique_interests = list(recipient_interests - sender_interests)
        for interest in unique_interests[:2]:
            template = random.choice(self.icebreaker_templates[:4])
            icebreaker = template.format(
                interest=interest,
                interest_specific="type",
                suggestion="something different",
                location="somewhere",
                topic=interest
            )
            icebreakers.append({
                "text": icebreaker,
                "type": "their_interest",
                "based_on": interest
            })

        # Add generic openers if needed
        generic_openers = [
            "Hey! Your profile really caught my eye. What's something interesting about yourself that's not in your bio?",
            "Hi there! I love your vibe. If you could travel anywhere right now, where would you go?",
            "Hey! I'm curious - what's the best thing that happened to you this week?"
        ]

        while len(icebreakers) < count:
            opener = random.choice(generic_openers)
            if not any(ib["text"] == opener for ib in icebreakers):
                icebreakers.append({
                    "text": opener,
                    "type": "generic",
                    "based_on": None
                })

        return {
            "icebreakers": icebreakers[:count],
            "common_interests": list(common_interests),
            "personalization_level": "high" if common_interests else "low"
        }

    async def generate_smart_replies(
        self,
        conversation_history: List[Dict],
        user_id: str,
        max_replies: int = 3
    ) -> Dict[str, Any]:
        """
        Generate smart reply suggestions.

        Args:
            conversation_history: Recent messages
            user_id: User requesting replies
            max_replies: Maximum number of replies

        Returns:
            List of reply suggestions
        """
        if not conversation_history:
            return {"replies": [], "context": "no_history"}

        # Get last message from other person
        other_messages = [m for m in conversation_history if m.get("sender_id") != user_id]
        if not other_messages:
            return {"replies": [], "context": "no_received_messages"}

        last_message = other_messages[-1].get("text", "")
        last_message_lower = last_message.lower()

        # Determine context
        context = "general"
        if "?" in last_message:
            context = "question"
        elif any(greeting in last_message_lower for greeting in ["hi", "hey", "hello", "how are you"]):
            context = "greeting"
        elif any(word in last_message_lower for word in ["thanks", "appreciate", "kind", "sweet", "cute", "amazing"]):
            context = "compliment"
        elif any(word in last_message_lower for word in ["meet", "coffee", "dinner", "date", "hang out"]):
            context = "date_suggestion"

        # Get appropriate replies
        templates = self.reply_templates.get(context, self.reply_templates["greeting"])
        replies = []

        for template in templates[:max_replies]:
            # Simple placeholder replacement
            reply = template.replace("{topic_related}", "it depends on the situation")
            reply = reply.replace("{interest}", "that")
            reply = reply.replace("{specific}", "part")
            reply = reply.replace("{related_activity}", "tried that before")
            reply = reply.replace("{availability}", "this weekend")
            replies.append({
                "text": reply,
                "context": context
            })

        return {
            "replies": replies,
            "context": context,
            "last_message_preview": last_message[:50] + "..." if len(last_message) > 50 else last_message
        }

    async def get_scam_patterns(self) -> List[Dict]:
        """Get known scam patterns for admin use."""
        patterns = []

        for category, stages in self.scam_patterns.items():
            for stage, keywords in stages.items():
                patterns.append({
                    "category": category,
                    "stage": stage,
                    "keywords": keywords,
                    "severity": "high" if "late" in stage else "medium" if "mid" in stage else "low"
                })

        return patterns

    async def _store_conversation_analysis(
        self,
        conversation_id: str,
        user_id: str,
        analysis: Dict
    ):
        """Store conversation analysis."""
        await self.db.conversation_analysis.update_one(
            {"conversation_id": conversation_id, "user_id": user_id},
            {
                "$push": {
                    "analyses": {
                        "$each": [analysis],
                        "$slice": -20
                    }
                },
                "$set": {
                    "latest_analysis": analysis,
                    "updated_at": datetime.utcnow()
                },
                "$setOnInsert": {
                    "created_at": datetime.utcnow()
                }
            },
            upsert=True
        )
