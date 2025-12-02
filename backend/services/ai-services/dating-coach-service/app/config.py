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

    # CORS
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "*")

    # Monitoring
    SENTRY_DSN: Optional[str] = os.getenv("SENTRY_DSN")

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
