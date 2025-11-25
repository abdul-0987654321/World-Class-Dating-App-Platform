"""Behavior analysis service for fraud detection."""

from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from collections import Counter
import statistics
import structlog
import redis.asyncio as redis
from motor.motor_asyncio import AsyncIOMotorClient

from app.config import Settings

logger = structlog.get_logger()


class BehaviorAnalyzerService:
    """Analyzes user behavior patterns for fraud detection."""

    def __init__(self, settings: Settings):
        self.settings = settings
        self.redis_client: Optional[redis.Redis] = None
        self.mongo_client: Optional[AsyncIOMotorClient] = None
        self.db = None

        # Bot detection patterns
        self.bot_indicators = {
            "uniform_timing": 0.3,  # Actions at regular intervals
            "no_reading_time": 0.4,  # Instant replies
            "mass_messaging": 0.5,  # Many messages to different users
            "repetitive_content": 0.4,  # Same message content
            "unusual_hours": 0.2,  # Active at unusual hours consistently
            "superhuman_speed": 0.5  # Impossible action speed
        }

    async def initialize(self):
        """Initialize service connections."""
        try:
            self.redis_client = redis.from_url(
                self.settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True
            )
            await self.redis_client.ping()

            self.mongo_client = AsyncIOMotorClient(self.settings.MONGODB_URL)
            self.db = self.mongo_client[self.settings.MONGODB_DATABASE]

            logger.info("BehaviorAnalyzer initialized")
        except Exception as e:
            logger.error("Failed to initialize behavior analyzer", error=str(e))
            raise

    async def close(self):
        """Close connections."""
        if self.redis_client:
            await self.redis_client.close()
        if self.mongo_client:
            self.mongo_client.close()

    async def analyze_behavior(
        self,
        user_id: str,
        activities: List[Dict],
        time_range_hours: int = 24
    ) -> Dict[str, Any]:
        """
        Analyze user behavior for fraud patterns.

        Args:
            user_id: User to analyze
            activities: List of recent activities
            time_range_hours: Time range for analysis

        Returns:
            Analysis results with risk indicators
        """
        if not activities:
            return {
                "user_id": user_id,
                "risk_score": 0.0,
                "risk_factors": [],
                "is_bot": False,
                "is_suspicious": False
            }

        risk_factors = []
        risk_score = 0.0

        # Analyze timing patterns
        timing_result = self._analyze_timing_patterns(activities)
        if timing_result["is_suspicious"]:
            risk_factors.append({
                "type": "timing_anomaly",
                "severity": timing_result["severity"],
                "details": timing_result["details"]
            })
            risk_score += timing_result["risk_contribution"]

        # Analyze message patterns
        message_activities = [a for a in activities if a.get("activity_type") == "message_sent"]
        if message_activities:
            message_result = await self._analyze_message_patterns(user_id, message_activities)
            if message_result["is_suspicious"]:
                risk_factors.append({
                    "type": "message_pattern",
                    "severity": message_result["severity"],
                    "details": message_result["details"]
                })
                risk_score += message_result["risk_contribution"]

        # Analyze swipe patterns
        swipe_activities = [a for a in activities if a.get("activity_type") == "swipe"]
        if swipe_activities:
            swipe_result = self._analyze_swipe_patterns(swipe_activities)
            if swipe_result["is_suspicious"]:
                risk_factors.append({
                    "type": "swipe_pattern",
                    "severity": swipe_result["severity"],
                    "details": swipe_result["details"]
                })
                risk_score += swipe_result["risk_contribution"]

        # Analyze activity volume
        volume_result = self._analyze_activity_volume(activities, time_range_hours)
        if volume_result["is_suspicious"]:
            risk_factors.append({
                "type": "activity_volume",
                "severity": volume_result["severity"],
                "details": volume_result["details"]
            })
            risk_score += volume_result["risk_contribution"]

        # Check for bot behavior
        bot_result = self._detect_bot_behavior(activities)
        is_bot = bot_result["is_bot"]
        if is_bot:
            risk_factors.append({
                "type": "bot_detected",
                "severity": "critical",
                "details": bot_result["indicators"]
            })
            risk_score += 0.5

        # Normalize score
        risk_score = min(1.0, risk_score)

        # Store analysis
        await self._store_behavior_analysis(user_id, {
            "risk_score": risk_score,
            "risk_factors": risk_factors,
            "activities_analyzed": len(activities),
            "timestamp": datetime.utcnow().isoformat()
        })

        return {
            "user_id": user_id,
            "risk_score": risk_score,
            "risk_level": self._get_risk_level(risk_score),
            "risk_factors": risk_factors,
            "is_bot": is_bot,
            "is_suspicious": risk_score >= 0.5,
            "activities_analyzed": len(activities),
            "analysis_period_hours": time_range_hours
        }

    def _analyze_timing_patterns(self, activities: List[Dict]) -> Dict[str, Any]:
        """Analyze timing patterns for bot-like behavior."""
        if len(activities) < 3:
            return {"is_suspicious": False, "risk_contribution": 0}

        # Parse timestamps
        timestamps = []
        for activity in activities:
            ts = activity.get("timestamp")
            if isinstance(ts, str):
                ts = datetime.fromisoformat(ts.replace("Z", "+00:00"))
            timestamps.append(ts)

        timestamps.sort()

        # Calculate intervals
        intervals = []
        for i in range(1, len(timestamps)):
            interval = (timestamps[i] - timestamps[i-1]).total_seconds()
            intervals.append(interval)

        if not intervals:
            return {"is_suspicious": False, "risk_contribution": 0}

        # Check for uniform intervals (bot behavior)
        mean_interval = statistics.mean(intervals)
        if len(intervals) >= 3:
            try:
                stdev = statistics.stdev(intervals)
                cv = stdev / mean_interval if mean_interval > 0 else 0

                # Very low coefficient of variation suggests automation
                if cv < 0.1 and mean_interval < 10:  # <10 seconds, very regular
                    return {
                        "is_suspicious": True,
                        "severity": "high",
                        "details": {
                            "reason": "uniform_timing",
                            "mean_interval_seconds": round(mean_interval, 2),
                            "coefficient_of_variation": round(cv, 4)
                        },
                        "risk_contribution": 0.4
                    }
                elif cv < 0.2 and mean_interval < 30:
                    return {
                        "is_suspicious": True,
                        "severity": "medium",
                        "details": {
                            "reason": "regular_timing",
                            "mean_interval_seconds": round(mean_interval, 2),
                            "coefficient_of_variation": round(cv, 4)
                        },
                        "risk_contribution": 0.2
                    }
            except statistics.StatisticsError:
                pass

        # Check for superhuman speed
        min_interval = min(intervals)
        if min_interval < 0.5:  # Less than 500ms between actions
            return {
                "is_suspicious": True,
                "severity": "high",
                "details": {
                    "reason": "superhuman_speed",
                    "min_interval_seconds": round(min_interval, 3)
                },
                "risk_contribution": 0.5
            }

        return {"is_suspicious": False, "risk_contribution": 0}

    async def _analyze_message_patterns(
        self,
        user_id: str,
        messages: List[Dict]
    ) -> Dict[str, Any]:
        """Analyze messaging patterns for spam/scam behavior."""
        if len(messages) < 5:
            return {"is_suspicious": False, "risk_contribution": 0}

        # Count unique recipients
        recipients = set()
        for msg in messages:
            target = msg.get("target_user_id")
            if target:
                recipients.add(target)

        # High volume to many different users = spam
        messages_per_recipient = len(messages) / len(recipients) if recipients else len(messages)

        if len(recipients) > 20 and messages_per_recipient < 2:
            return {
                "is_suspicious": True,
                "severity": "high",
                "details": {
                    "reason": "mass_messaging",
                    "unique_recipients": len(recipients),
                    "total_messages": len(messages),
                    "messages_per_recipient": round(messages_per_recipient, 2)
                },
                "risk_contribution": 0.4
            }

        # Check for repetitive content (would need message content from metadata)
        # This is a simplified check
        metadata_hashes = []
        for msg in messages:
            if msg.get("metadata"):
                metadata_hashes.append(str(msg["metadata"]))

        if metadata_hashes:
            most_common = Counter(metadata_hashes).most_common(1)
            if most_common and most_common[0][1] > len(messages) * 0.7:
                return {
                    "is_suspicious": True,
                    "severity": "high",
                    "details": {
                        "reason": "repetitive_content",
                        "repetition_rate": round(most_common[0][1] / len(messages), 2)
                    },
                    "risk_contribution": 0.4
                }

        return {"is_suspicious": False, "risk_contribution": 0}

    def _analyze_swipe_patterns(self, swipes: List[Dict]) -> Dict[str, Any]:
        """Analyze swiping patterns for suspicious behavior."""
        if len(swipes) < 10:
            return {"is_suspicious": False, "risk_contribution": 0}

        # Check swipe direction distribution
        right_swipes = sum(1 for s in swipes if s.get("metadata", {}).get("direction") == "right")
        left_swipes = len(swipes) - right_swipes

        # All right swipes = likely spam/bot
        if len(swipes) > 50 and right_swipes / len(swipes) > 0.95:
            return {
                "is_suspicious": True,
                "severity": "high",
                "details": {
                    "reason": "all_right_swipes",
                    "right_swipe_rate": round(right_swipes / len(swipes), 2),
                    "total_swipes": len(swipes)
                },
                "risk_contribution": 0.3
            }

        # Very high swipe rate
        if len(swipes) > 100:
            # Parse timestamps and check rate
            timestamps = []
            for swipe in swipes:
                ts = swipe.get("timestamp")
                if isinstance(ts, str):
                    ts = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                timestamps.append(ts)

            if timestamps:
                time_span = (max(timestamps) - min(timestamps)).total_seconds() / 3600  # hours
                if time_span > 0:
                    swipes_per_hour = len(swipes) / time_span
                    if swipes_per_hour > 500:  # More than 8 per minute
                        return {
                            "is_suspicious": True,
                            "severity": "high",
                            "details": {
                                "reason": "excessive_swipe_rate",
                                "swipes_per_hour": round(swipes_per_hour, 2)
                            },
                            "risk_contribution": 0.4
                        }

        return {"is_suspicious": False, "risk_contribution": 0}

    def _analyze_activity_volume(
        self,
        activities: List[Dict],
        time_range_hours: int
    ) -> Dict[str, Any]:
        """Analyze overall activity volume."""
        if time_range_hours <= 0:
            return {"is_suspicious": False, "risk_contribution": 0}

        activity_rate = len(activities) / time_range_hours

        # More than 200 actions per hour is suspicious
        if activity_rate > 200:
            return {
                "is_suspicious": True,
                "severity": "high",
                "details": {
                    "reason": "excessive_activity",
                    "activities_per_hour": round(activity_rate, 2),
                    "total_activities": len(activities),
                    "time_range_hours": time_range_hours
                },
                "risk_contribution": 0.3
            }
        elif activity_rate > 100:
            return {
                "is_suspicious": True,
                "severity": "medium",
                "details": {
                    "reason": "high_activity",
                    "activities_per_hour": round(activity_rate, 2)
                },
                "risk_contribution": 0.15
            }

        return {"is_suspicious": False, "risk_contribution": 0}

    def _detect_bot_behavior(self, activities: List[Dict]) -> Dict[str, Any]:
        """Detect if behavior patterns indicate a bot."""
        bot_score = 0.0
        indicators = []

        if len(activities) < 5:
            return {"is_bot": False, "indicators": []}

        # Check timing regularity
        timing_result = self._analyze_timing_patterns(activities)
        if timing_result.get("is_suspicious"):
            reason = timing_result.get("details", {}).get("reason", "")
            if reason in ["uniform_timing", "superhuman_speed"]:
                bot_score += self.bot_indicators.get(reason, 0.3)
                indicators.append(reason)

        # Check for 24/7 activity
        hours_active = set()
        for activity in activities:
            ts = activity.get("timestamp")
            if isinstance(ts, str):
                ts = datetime.fromisoformat(ts.replace("Z", "+00:00"))
            hours_active.add(ts.hour)

        # Active in many hours of the day suggests bot
        if len(hours_active) >= 20:  # Active in 20+ different hours
            bot_score += 0.3
            indicators.append("24_7_activity")

        # High volume in short time
        if len(activities) > 1000:
            bot_score += 0.4
            indicators.append("extreme_volume")

        return {
            "is_bot": bot_score >= 0.6,
            "bot_score": round(bot_score, 2),
            "indicators": indicators
        }

    def _get_risk_level(self, score: float) -> str:
        """Get risk level from score."""
        if score >= 0.85:
            return "critical"
        elif score >= 0.7:
            return "high"
        elif score >= 0.5:
            return "medium"
        elif score >= 0.3:
            return "low"
        else:
            return "minimal"

    async def _store_behavior_analysis(self, user_id: str, analysis: Dict):
        """Store behavior analysis results."""
        await self.db.behavior_analysis.update_one(
            {"user_id": user_id},
            {
                "$push": {
                    "analyses": {
                        "$each": [analysis],
                        "$slice": -50  # Keep last 50 analyses
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
