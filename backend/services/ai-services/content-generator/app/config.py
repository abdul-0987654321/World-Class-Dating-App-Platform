"""Configuration settings for the Content Generator Service."""

from functools import lru_cache
from typing import Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""

    # Service info
    SERVICE_NAME: str = "content-generator"
    VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8087
    WORKERS: int = 2

    # CORS
    CORS_ORIGINS: str = "*"

    # OpenAI/GPT Settings
    OPENAI_API_KEY: Optional[str] = None
    GPT_MODEL: str = "gpt-4-turbo-preview"
    GPT_MAX_TOKENS: int = 1000
    GPT_TEMPERATURE: float = 0.8

    # Content Generation Settings
    MAX_ICEBREAKERS: int = 10
    MAX_DATE_IDEAS: int = 10
    MAX_GIFTS: int = 10
    MAX_COMPLIMENTS: int = 10
    MAX_TOPICS: int = 10

    # Rate Limiting
    RATE_LIMIT_PER_USER: int = 50  # per hour

    # JWT
    JWT_SECRET: str = "your-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"

    # Monitoring
    SENTRY_DSN: Optional[str] = None
    LOG_LEVEL: str = "INFO"

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()
