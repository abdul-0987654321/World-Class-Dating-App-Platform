"""Configuration for Dating Coach Service."""

import os
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings."""

    # Service settings
    SERVICE_NAME: str = "dating-coach-service"
    VERSION: str = "1.0.0"
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

    # API settings
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8004"))

    # AI Provider settings
    AI_PROVIDER: str = os.getenv("AI_PROVIDER", "openai")  # openai or anthropic
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY")
    ANTHROPIC_API_KEY: Optional[str] = os.getenv("ANTHROPIC_API_KEY")

    # Model settings
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4-turbo-preview")
    ANTHROPIC_MODEL: str = os.getenv("ANTHROPIC_MODEL", "claude-3-opus-20240229")
    MAX_TOKENS: int = int(os.getenv("MAX_TOKENS", "1000"))
    TEMPERATURE: float = float(os.getenv("TEMPERATURE", "0.7"))

    # Redis settings
    REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))
    REDIS_DB: int = int(os.getenv("REDIS_DB", "2"))
    REDIS_PASSWORD: Optional[str] = os.getenv("REDIS_PASSWORD")

    # Rate limiting settings (requests per day)
    RATE_LIMIT_FREE: int = int(os.getenv("RATE_LIMIT_FREE", "3"))
    RATE_LIMIT_BASIC: int = int(os.getenv("RATE_LIMIT_BASIC", "3"))
    RATE_LIMIT_PREMIUM: int = int(os.getenv("RATE_LIMIT_PREMIUM", "10"))
    RATE_LIMIT_PREMIUM_PLUS: int = int(os.getenv("RATE_LIMIT_PREMIUM_PLUS", "-1"))  # -1 = unlimited

    # MongoDB settings
    MONGODB_URI: Optional[str] = os.getenv("MONGODB_URI")
    MONGODB_DB: str = os.getenv("MONGODB_DB", "dating_coach")

    # Logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    LOG_FORMAT: str = os.getenv("LOG_FORMAT", "json")  # json or human
    LOG_FILE: Optional[str] = os.getenv("LOG_FILE")

    # CORS
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "*")

    # Monitoring
    SENTRY_DSN: Optional[str] = os.getenv("SENTRY_DSN")

    # Metrics & Monitoring
    METRICS_ENABLED: bool = os.getenv("METRICS_ENABLED", "true").lower() == "true"
    METRICS_PATH: str = os.getenv("METRICS_PATH", "/metrics")
    HEALTH_CHECK_TIMEOUT: int = int(os.getenv("HEALTH_CHECK_TIMEOUT", "5"))

    # Alert thresholds
    ALERT_ERROR_RATE_THRESHOLD: float = float(os.getenv("ALERT_ERROR_RATE_THRESHOLD", "5.0"))  # 5%
    ALERT_LATENCY_P99_THRESHOLD: float = float(os.getenv("ALERT_LATENCY_P99_THRESHOLD", "5.0"))  # 5 seconds
    ALERT_AI_FAILURE_THRESHOLD: int = int(os.getenv("ALERT_AI_FAILURE_THRESHOLD", "3"))  # 3 failures
    ALERT_WINDOW_SECONDS: int = int(os.getenv("ALERT_WINDOW_SECONDS", "300"))  # 5 minutes

    # Request tracking
    REQUEST_ID_HEADER: str = os.getenv("REQUEST_ID_HEADER", "X-Request-ID")
    ENABLE_REQUEST_LOGGING: bool = os.getenv("ENABLE_REQUEST_LOGGING", "true").lower() == "true"

    class Config:
        """Pydantic config."""
        env_file = ".env"
        case_sensitive = True


# Create global settings instance
settings = Settings()


# Rate limit tiers
RATE_LIMITS = {
    "free": settings.RATE_LIMIT_FREE,
    "basic": settings.RATE_LIMIT_BASIC,
    "premium": settings.RATE_LIMIT_PREMIUM,
    "premium_plus": settings.RATE_LIMIT_PREMIUM_PLUS,
}


# Feature Flags Configuration
# These control the rollout of new features
# Values are percentages (0-100) of users who should see the feature
FEATURE_FLAGS = {
    "innovativeFeatures": {
        # Communication Style Matcher - NLP-based communication compatibility analysis
        # Analyzes formality, emoji usage, message length, humor style to improve matching
        "communicationStyleMatcher": {
            "enabled": True,  # Feature is enabled in code
            "rollout_percentage": 0,  # 0% rollout initially
            "description": "NLP-based communication style analysis for matching",
            "segments": {
                "premium_plus": 0,  # Percentage for premium_plus users
                "premium": 0,  # Percentage for premium users
                "basic": 0,  # Percentage for basic users
                "free": 0,  # Percentage for free users
            },
            "beta_users": [],  # List of user IDs for beta testing
        },
        # Relationship Trajectory Prediction
        "relationshipTrajectory": {
            "enabled": True,
            "rollout_percentage": 0,
            "description": "ML-based compatibility forecasting",
            "segments": {
                "premium_plus": 0,
                "premium": 0,
                "basic": 0,
                "free": 0,
            },
            "beta_users": [],
        },
    },
    "engagementFeatures": {
        # Shared Experience Generator
        "sharedExperienceGenerator": {
            "enabled": True,
            "rollout_percentage": 0,
            "description": "AI-curated shared experiences for matches",
            "segments": {
                "premium_plus": 0,
                "premium": 0,
                "basic": 0,
                "free": 0,
            },
            "beta_users": [],
        },
    },
}
