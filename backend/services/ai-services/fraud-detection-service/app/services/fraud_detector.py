"""Main fraud detection service."""

from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import hashlib
import math
import structlog
import redis.asyncio as redis
from motor.motor_asyncio import AsyncIOMotorClient

from app.config import Settings

logger = structlog.get_logger()


class FraudDetectorService:
    """Main fraud detection service coordinating all fraud checks."""

    def __init__(self, settings: Settings):
        self.settings = settings
        self.redis_client: Optional[redis.Redis] = None
        self.mongo_client: Optional[AsyncIOMotorClient] = None
        self.db = None

        # Known fraud patterns
        self.fraud_patterns = {
            "romance_scam": {
                "keywords": [
                    "investment", "crypto", "bitcoin", "inheritance",
                    "military", "oil rig", "doctor abroad", "send money",
                    "western union", "gift card", "wire transfer"
                ],
                "weight": 0.8
            },
            "advance_fee": {
                "keywords": [
                    "bank account", "transfer", "fee", "loan",
                    "prize", "lottery", "winner", "claim"
                ],
                "weight": 0.7
            },
            "sextortion": {
                "keywords": [
                    "nude", "explicit", "private photos", "video call",
                    "blackmail", "expose"
                ],
                "weight": 0.9
            }
        }

    async def initialize(self):
        """Initialize service connections."""
        try:
            # Connect to Redis
            self.redis_client = redis.from_url(
                self.settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True
            )
            await self.redis_client.ping()
            logger.info("Redis connection established")

            # Connect to MongoDB
            self.mongo_client = AsyncIOMotorClient(self.settings.MONGODB_URL)
            self.db = self.mongo_client[self.settings.MONGODB_DATABASE]
            logger.info("MongoDB connection established")

        except Exception as e:
            logger.error("Failed to initialize fraud detector", error=str(e))
            raise

    async def close(self):
        """Close service connections."""
        if self.redis_client:
            await self.redis_client.close()
        if self.mongo_client:
            self.mongo_client.close()

    async def check_fraud(
        self,
        user_id: str,
        location: Optional[Dict] = None,
        device: Optional[Dict] = None,
        activity: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Perform comprehensive fraud check.

        Args:
            user_id: The user ID to check
            location: Location data
            device: Device information
            activity: Activity being performed

        Returns:
            Fraud check result with risk score and indicators
        """
        risk_factors = []
        risk_score = 0.0

        # Check location anomalies
        if location:
            location_result = await self._check_location_anomaly(user_id, location)
            if location_result["is_anomaly"]:
                risk_factors.append({
                    "type": "location_anomaly",
                    "severity": location_result["severity"],
                    "details": location_result["details"]
                })
                risk_score += location_result["risk_contribution"]

        # Check device
        if device:
            device_result = await self._check_device(user_id, device)
            if device_result["is_suspicious"]:
                risk_factors.append({
                    "type": "device_suspicious",
                    "severity": device_result["severity"],
                    "details": device_result["details"]
                })
                risk_score += device_result["risk_contribution"]

        # Check activity velocity
        if activity:
            velocity_result = await self._check_activity_velocity(
                user_id,
                activity["activity_type"]
            )
            if velocity_result["exceeded"]:
                risk_factors.append({
                    "type": "velocity_exceeded",
                    "severity": "high",
                    "details": velocity_result["details"]
                })
                risk_score += 0.3

        # Get historical risk
        historical_risk = await self._get_historical_risk(user_id)
        risk_score += historical_risk * 0.2

        # Normalize score
        risk_score = min(1.0, risk_score)

        # Determine action
        action = self._determine_action(risk_score)

        # Store the check result
        await self._store_fraud_check(user_id, {
            "risk_score": risk_score,
            "risk_factors": risk_factors,
            "action": action,
            "timestamp": datetime.utcnow().isoformat()
        })

        return {
            "user_id": user_id,
            "risk_score": risk_score,
            "risk_level": self._get_risk_level(risk_score),
            "risk_factors": risk_factors,
            "action": action,
            "should_block": risk_score >= self.settings.HIGH_RISK_THRESHOLD,
            "requires_review": risk_score >= self.settings.FRAUD_SCORE_THRESHOLD
        }

    async def _check_location_anomaly(
        self,
        user_id: str,
        location: Dict
    ) -> Dict[str, Any]:
        """Check for location anomalies like impossible travel."""
        # Get last known location
        last_location = await self.redis_client.hgetall(f"user:location:{user_id}")

        if not last_location:
            # First location, store it
            await self.redis_client.hset(
                f"user:location:{user_id}",
                mapping={
                    "latitude": str(location["latitude"]),
                    "longitude": str(location["longitude"]),
                    "timestamp": datetime.utcnow().isoformat(),
                    "ip_address": location.get("ip_address", "")
                }
            )
            await self.redis_client.expire(
                f"user:location:{user_id}",
                86400 * 7  # 7 days
            )
            return {"is_anomaly": False, "severity": "none", "details": {}, "risk_contribution": 0}

        # Calculate distance
        last_lat = float(last_location["latitude"])
        last_lon = float(last_location["longitude"])
        last_time = datetime.fromisoformat(last_location["timestamp"])

        distance_km = self._haversine_distance(
            last_lat, last_lon,
            location["latitude"], location["longitude"]
        )

        time_diff_hours = (datetime.utcnow() - last_time).total_seconds() / 3600

        # Check for impossible travel (>500km/h is suspicious)
        if time_diff_hours > 0:
            speed_kmh = distance_km / time_diff_hours

            if speed_kmh > 1000:  # Impossible speed
                return {
                    "is_anomaly": True,
                    "severity": "high",
                    "details": {
                        "distance_km": round(distance_km, 2),
                        "time_hours": round(time_diff_hours, 2),
                        "implied_speed_kmh": round(speed_kmh, 2),
                        "reason": "impossible_travel"
                    },
                    "risk_contribution": 0.5
                }
            elif speed_kmh > 500:  # Very fast, might be VPN
                return {
                    "is_anomaly": True,
                    "severity": "medium",
                    "details": {
                        "distance_km": round(distance_km, 2),
                        "time_hours": round(time_diff_hours, 2),
                        "implied_speed_kmh": round(speed_kmh, 2),
                        "reason": "suspicious_travel"
                    },
                    "risk_contribution": 0.3
                }

        # Update location
        await self.redis_client.hset(
            f"user:location:{user_id}",
            mapping={
                "latitude": str(location["latitude"]),
                "longitude": str(location["longitude"]),
                "timestamp": datetime.utcnow().isoformat(),
                "ip_address": location.get("ip_address", "")
            }
        )

        return {"is_anomaly": False, "severity": "none", "details": {}, "risk_contribution": 0}

    async def _check_device(self, user_id: str, device: Dict) -> Dict[str, Any]:
        """Check device for suspicious patterns."""
        # Get known devices
        known_devices_key = f"user:devices:{user_id}"
        known_devices = await self.redis_client.smembers(known_devices_key)

        device_fingerprint = self._generate_device_fingerprint(device)

        if not known_devices:
            # First device
            await self.redis_client.sadd(known_devices_key, device_fingerprint)
            await self.redis_client.expire(known_devices_key, 86400 * 30)  # 30 days
            return {"is_suspicious": False, "severity": "none", "details": {}, "risk_contribution": 0}

        if device_fingerprint in known_devices:
            return {"is_suspicious": False, "severity": "none", "details": {}, "risk_contribution": 0}

        # New device
        num_devices = len(known_devices)

        if num_devices >= 5:
            # Too many devices
            return {
                "is_suspicious": True,
                "severity": "high",
                "details": {
                    "reason": "too_many_devices",
                    "device_count": num_devices + 1
                },
                "risk_contribution": 0.4
            }
        elif num_devices >= 3:
            return {
                "is_suspicious": True,
                "severity": "medium",
                "details": {
                    "reason": "new_device",
                    "device_count": num_devices + 1
                },
                "risk_contribution": 0.2
            }

        # Add new device
        await self.redis_client.sadd(known_devices_key, device_fingerprint)

        return {
            "is_suspicious": True,
            "severity": "low",
            "details": {"reason": "new_device"},
            "risk_contribution": 0.1
        }

    async def _check_activity_velocity(
        self,
        user_id: str,
        action_type: str
    ) -> Dict[str, Any]:
        """Check if user is performing actions too quickly."""
        key = f"velocity:{user_id}:{action_type}"
        window_seconds = self.settings.VELOCITY_WINDOW_MINUTES * 60

        # Get current count
        count = await self.redis_client.get(key)
        count = int(count) if count else 0

        # Get limit for action type
        limits = {
            "message_sent": self.settings.MAX_MESSAGES_PER_HOUR,
            "swipe": self.settings.MAX_SWIPES_PER_HOUR,
            "profile_view": self.settings.MAX_PROFILE_VIEWS_PER_HOUR,
            "login": self.settings.SUSPICIOUS_LOGIN_THRESHOLD
        }

        limit = limits.get(action_type, 100)

        # Increment counter
        pipe = self.redis_client.pipeline()
        pipe.incr(key)
        pipe.expire(key, window_seconds)
        await pipe.execute()

        exceeded = count >= limit

        return {
            "exceeded": exceeded,
            "details": {
                "action_type": action_type,
                "count": count + 1,
                "limit": limit,
                "window_minutes": self.settings.VELOCITY_WINDOW_MINUTES
            }
        }

    async def check_velocity(
        self,
        user_id: str,
        action_type: str,
        window_minutes: int
    ) -> Dict[str, Any]:
        """Public method to check velocity."""
        result = await self._check_activity_velocity(user_id, action_type)
        return {
            "user_id": user_id,
            "action_type": action_type,
            **result
        }

    async def _get_historical_risk(self, user_id: str) -> float:
        """Get historical risk score for user."""
        # Get from MongoDB
        history = await self.db.fraud_history.find_one({"user_id": user_id})

        if not history:
            return 0.0

        # Calculate weighted average of recent checks
        recent_scores = history.get("recent_scores", [])
        if not recent_scores:
            return 0.0

        # More recent scores have higher weight
        total_weight = 0
        weighted_sum = 0
        for i, score in enumerate(recent_scores[-10:]):  # Last 10 scores
            weight = i + 1
            weighted_sum += score * weight
            total_weight += weight

        return weighted_sum / total_weight if total_weight > 0 else 0.0

    async def _store_fraud_check(self, user_id: str, result: Dict):
        """Store fraud check result."""
        # Update MongoDB
        await self.db.fraud_history.update_one(
            {"user_id": user_id},
            {
                "$push": {
                    "recent_scores": {
                        "$each": [result["risk_score"]],
                        "$slice": -20  # Keep last 20 scores
                    }
                },
                "$set": {
                    "last_check": result,
                    "updated_at": datetime.utcnow()
                },
                "$setOnInsert": {
                    "created_at": datetime.utcnow()
                }
            },
            upsert=True
        )

    def _determine_action(self, risk_score: float) -> str:
        """Determine recommended action based on risk score."""
        if risk_score >= self.settings.HIGH_RISK_THRESHOLD:
            return "block"
        elif risk_score >= self.settings.FRAUD_SCORE_THRESHOLD:
            return "review"
        elif risk_score >= 0.5:
            return "monitor"
        else:
            return "allow"

    def _get_risk_level(self, risk_score: float) -> str:
        """Get risk level string from score."""
        if risk_score >= self.settings.HIGH_RISK_THRESHOLD:
            return "critical"
        elif risk_score >= self.settings.FRAUD_SCORE_THRESHOLD:
            return "high"
        elif risk_score >= 0.5:
            return "medium"
        elif risk_score >= 0.3:
            return "low"
        else:
            return "minimal"

    def _haversine_distance(
        self,
        lat1: float, lon1: float,
        lat2: float, lon2: float
    ) -> float:
        """Calculate distance between two points in km."""
        R = 6371  # Earth's radius in km

        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        delta_lat = math.radians(lat2 - lat1)
        delta_lon = math.radians(lon2 - lon1)

        a = (math.sin(delta_lat / 2) ** 2 +
             math.cos(lat1_rad) * math.cos(lat2_rad) *
             math.sin(delta_lon / 2) ** 2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

        return R * c

    def _generate_device_fingerprint(self, device: Dict) -> str:
        """Generate a fingerprint for device identification."""
        fingerprint_data = f"{device.get('device_id', '')}{device.get('device_type', '')}{device.get('os_version', '')}"
        return hashlib.sha256(fingerprint_data.encode()).hexdigest()[:16]

    async def get_risk_score(
        self,
        user_id: str,
        include_history: bool = False
    ) -> Dict[str, Any]:
        """Get current risk score for a user."""
        history = await self.db.fraud_history.find_one({"user_id": user_id})

        if not history:
            return {
                "user_id": user_id,
                "risk_score": 0.0,
                "risk_level": "minimal",
                "last_check": None,
                "history": [] if include_history else None
            }

        last_check = history.get("last_check", {})
        result = {
            "user_id": user_id,
            "risk_score": last_check.get("risk_score", 0.0),
            "risk_level": self._get_risk_level(last_check.get("risk_score", 0.0)),
            "last_check": last_check,
            "reports_count": history.get("reports_count", 0)
        }

        if include_history:
            result["history"] = history.get("recent_scores", [])

        return result

    async def report_fraud(
        self,
        reporter_id: str,
        reported_user_id: str,
        reason: str,
        evidence: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Record a fraud report."""
        report = {
            "reporter_id": reporter_id,
            "reason": reason,
            "evidence": evidence,
            "timestamp": datetime.utcnow()
        }

        # Store report
        await self.db.fraud_reports.insert_one({
            **report,
            "reported_user_id": reported_user_id
        })

        # Update user's fraud history
        result = await self.db.fraud_history.update_one(
            {"user_id": reported_user_id},
            {
                "$push": {"reports": report},
                "$inc": {"reports_count": 1},
                "$set": {"updated_at": datetime.utcnow()}
            },
            upsert=True
        )

        # Check if user should be flagged
        history = await self.db.fraud_history.find_one({"user_id": reported_user_id})
        reports_count = history.get("reports_count", 0) if history else 0

        action = "none"
        if reports_count >= 5:
            action = "auto_suspend"
            # Mark user for suspension
            await self.db.fraud_history.update_one(
                {"user_id": reported_user_id},
                {"$set": {"auto_suspended": True, "suspended_at": datetime.utcnow()}}
            )
        elif reports_count >= 3:
            action = "review_required"

        return {
            "report_id": str(result.upserted_id) if result.upserted_id else "updated",
            "reports_count": reports_count,
            "action_taken": action
        }

    async def bulk_check(self, user_ids: List[str]) -> Dict[str, Any]:
        """Perform bulk fraud checks."""
        checked = []
        flagged = []
        results = {}

        for user_id in user_ids:
            try:
                result = await self.check_fraud(user_id=user_id)
                results[user_id] = result
                checked.append(user_id)

                if result["requires_review"] or result["should_block"]:
                    flagged.append(user_id)

            except Exception as e:
                logger.error("Bulk check failed for user", user_id=user_id, error=str(e))
                results[user_id] = {"error": str(e)}

        return {
            "checked": checked,
            "flagged": flagged,
            "results": results
        }

    async def get_known_patterns(self) -> List[Dict]:
        """Get list of known fraud patterns."""
        return [
            {
                "name": name,
                "keywords": pattern["keywords"],
                "severity_weight": pattern["weight"]
            }
            for name, pattern in self.fraud_patterns.items()
        ]

    async def verify_location(
        self,
        user_id: str,
        location: Dict
    ) -> Dict[str, Any]:
        """Verify if location change is legitimate."""
        result = await self._check_location_anomaly(user_id, location)
        return {
            "user_id": user_id,
            "is_legitimate": not result["is_anomaly"],
            "anomaly_details": result["details"] if result["is_anomaly"] else None,
            "severity": result["severity"]
        }

    async def verify_device(
        self,
        user_id: str,
        device: Dict
    ) -> Dict[str, Any]:
        """Verify if device is legitimate for user."""
        result = await self._check_device(user_id, device)
        return {
            "user_id": user_id,
            "is_known_device": not result["is_suspicious"],
            "device_fingerprint": self._generate_device_fingerprint(device),
            "details": result["details"] if result["is_suspicious"] else None
        }
