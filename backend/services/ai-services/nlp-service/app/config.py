"""Configuration settings for the NLP service."""

from functools import lru_cache
from typing import List, Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""

    # Service info
    SERVICE_NAME: str = "nlp-service"
    VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8085
    WORKERS: int = 4

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173"]

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/flamoral"
    MONGODB_URL: str = "mongodb://localhost:27017"
    MONGODB_DATABASE: str = "flamoral"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    CACHE_TTL: int = 3600  # 1 hour

    # ML Models
    SENTIMENT_MODEL: str = "cardiffnlp/twitter-roberta-base-sentiment-latest"
    TOXICITY_MODEL: str = "unitary/toxic-bert"
    INTENT_MODEL: str = "facebook/bart-large-mnli"
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"
    LANGUAGE_MODEL: str = "papluca/xlm-roberta-base-language-detection"

    # NLP Settings
    MAX_TEXT_LENGTH: int = 5000
    MIN_TEXT_LENGTH: int = 1
    TOXICITY_THRESHOLD: float = 0.7
    SPAM_THRESHOLD: float = 0.8
    SUPPORTED_LANGUAGES: List[str] = ["en", "es", "fr", "de", "it", "pt", "nl", "ru", "ja", "ko", "zh"]

    # Conversation Analysis
    SCAM_KEYWORD_THRESHOLD: int = 3
    ROMANCE_SCAM_SCORE_THRESHOLD: float = 0.6

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
