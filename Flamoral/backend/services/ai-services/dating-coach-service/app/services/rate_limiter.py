"""Rate limiting service for dating coach."""

import logging
from typing import Dict, Any
from datetime import datetime, timedelta
from redis import Redis
from app.config import settings, RATE_LIMITS

logger = logging.getLogger(__name__)


class RateLimiterService:
    """Service for managing rate limits per subscription tier."""

    def __init__(self):
        """Initialize rate limiter."""
        self.redis_client: Redis = None

    async def initialize(self):
        """Initialize Redis connection."""
        try:
            self.redis_client = Redis(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                db=settings.REDIS_DB,
                password=settings.REDIS_PASSWORD,
                decode_responses=True,
            )
            self.redis_client.ping()
            logger.info("Rate limiter Redis connection initialized")
        except Exception as e:
            logger.error(f"Failed to initialize Redis: {e}")
            # Continue without Redis - will use in-memory fallback
            self.redis_client = None

    async def close(self):
        """Close Redis connection."""
        if self.redis_client:
            self.redis_client.close()

    async def check_and_increment(
        self,
        user_id: str,
        coaching_type: str,
        subscription_tier: str,
    ) -> Dict[str, Any]:
        """
        Check if user can make request and increment counter.

        Args:
            user_id: User ID
            coaching_type: Type of coaching request
            subscription_tier: User's subscription tier

        Returns:
            Dictionary with allowed status and usage info
        """
        # Get rate limit for tier
        limit = RATE_LIMITS.get(subscription_tier, RATE_LIMITS["free"])

        # Unlimited for premium_plus
        if limit == -1:
            return {
                "allowed": True,
                "remaining_today": -1,
                "limit_per_day": -1,
                "reset_time": "N/A - Unlimited",
                "upgrade_message": None,
            }

        # Get current usage
        key = self._get_redis_key(user_id, coaching_type)
        current_usage = await self._get_usage(key)

        # Check if limit exceeded
        if current_usage >= limit:
            return {
                "allowed": False,
                "remaining_today": 0,
                "limit_per_day": limit,
                "reset_time": self._get_reset_time(),
                "upgrade_message": self._get_upgrade_message(subscription_tier),
            }

        # Increment usage
        await self._increment_usage(key)

        return {
            "allowed": True,
            "remaining_today": limit - current_usage - 1,
            "limit_per_day": limit,
            "reset_time": self._get_reset_time(),
            "upgrade_message": None,
        }

    async def get_usage_stats(
        self,
        user_id: str,
        coaching_type: str,
        subscription_tier: str,
    ) -> Dict[str, Any]:
        """
        Get current usage statistics without incrementing.

        Args:
            user_id: User ID
            coaching_type: Type of coaching
            subscription_tier: User's subscription tier

        Returns:
            Dictionary with usage stats
        """
        limit = RATE_LIMITS.get(subscription_tier, RATE_LIMITS["free"])

        if limit == -1:
            return {
                "remaining_today": -1,
                "limit_per_day": -1,
                "reset_time": "N/A - Unlimited",
            }

        key = self._get_redis_key(user_id, coaching_type)
        current_usage = await self._get_usage(key)

        return {
            "remaining_today": max(0, limit - current_usage),
            "limit_per_day": limit,
            "reset_time": self._get_reset_time(),
        }

    def _get_redis_key(self, user_id: str, coaching_type: str) -> str:
        """Generate Redis key for user and coaching type."""
        today = datetime.utcnow().strftime("%Y-%m-%d")
        return f"coach:ratelimit:{user_id}:{coaching_type}:{today}"

    async def _get_usage(self, key: str) -> int:
        """Get current usage count from Redis."""
        if not self.redis_client:
            return 0

        try:
            value = self.redis_client.get(key)
            return int(value) if value else 0
        except Exception as e:
            logger.error(f"Failed to get usage from Redis: {e}")
            return 0

    async def _increment_usage(self, key: str):
        """Increment usage counter in Redis."""
        if not self.redis_client:
            return

        try:
            # Increment counter
            self.redis_client.incr(key)

            # Set expiry to end of day
            tomorrow = datetime.utcnow().replace(
                hour=0, minute=0, second=0, microsecond=0
            ) + timedelta(days=1)
            seconds_until_tomorrow = int((tomorrow - datetime.utcnow()).total_seconds())
            self.redis_client.expire(key, seconds_until_tomorrow)
        except Exception as e:
            logger.error(f"Failed to increment usage in Redis: {e}")

    def _get_reset_time(self) -> str:
        """Get reset time (midnight UTC)."""
        tomorrow = datetime.utcnow().replace(
            hour=0, minute=0, second=0, microsecond=0
        ) + timedelta(days=1)
        return tomorrow.strftime("%Y-%m-%d %H:%M:%S UTC")

    def _get_upgrade_message(self, current_tier: str) -> str:
        """Get upgrade message based on current tier."""
        messages = {
            "free": "Upgrade to Premium to get 10 AI coaching suggestions per day!",
            "basic": "Upgrade to Premium to get 10 AI coaching suggestions per day!",
            "premium": "Upgrade to Premium+ for unlimited AI coaching!",
        }
        return messages.get(current_tier, "Upgrade for more AI coaching suggestions!")
