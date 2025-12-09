"""Enhanced configuration settings for the NLP service."""

from functools import lru_cache
from typing import List, Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""

    # Service info
    SERVICE_NAME: str = "nlp-service"
    VERSION: str = "2.0.0"
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
    EMOTION_MODEL: str = "j-hartmann/emotion-english-distilroberta-base"

    # OpenAI/GPT Settings
    OPENAI_API_KEY: Optional[str] = None
    GPT_MODEL: str = "gpt-4-turbo-preview"
    GPT_MAX_TOKENS: int = 2000
    GPT_TEMPERATURE: float = 0.7

    # Translation API Settings (configure based on chosen provider)
    TRANSLATION_API_KEY: Optional[str] = None
    TRANSLATION_PROVIDER: str = "google"  # google, deepl, azure
    DEEPL_API_KEY: Optional[str] = None
    AZURE_TRANSLATOR_KEY: Optional[str] = None
    GOOGLE_TRANSLATE_API_KEY: Optional[str] = None

    # NLP Settings
    MAX_TEXT_LENGTH: int = 5000
    MIN_TEXT_LENGTH: int = 1
    TOXICITY_THRESHOLD: float = 0.7
    SPAM_THRESHOLD: float = 0.8
    SUPPORTED_LANGUAGES: List[str] = [
        "en", "es", "fr", "de", "it", "pt", "nl", "ru",
        "ja", "ko", "zh", "ar", "hi", "tr", "pl"
    ]

    # Conversation Analysis
    SCAM_KEYWORD_THRESHOLD: int = 3
    ROMANCE_SCAM_SCORE_THRESHOLD: float = 0.6
    MIN_MESSAGES_FOR_COMPATIBILITY: int = 3

    # Bio Generation Settings
    BIO_MIN_LENGTH: int = 50
    BIO_MAX_LENGTH: int = 500
    BIO_OPTIMAL_LENGTH: int = 150

    # Profile Optimization Settings
    OPTIMAL_PHOTO_COUNT: int = 5
    OPTIMAL_INTEREST_COUNT: int = 6
    OPTIMAL_PROMPT_COUNT: int = 3

    # JWT
    JWT_SECRET: str = "your-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"

    # Rate Limiting
    RATE_LIMIT_BIO_GENERATION: int = 10  # per hour
    RATE_LIMIT_TRANSLATION: int = 100  # per hour
    RATE_LIMIT_ANALYSIS: int = 50  # per hour

    # Monitoring
    SENTRY_DSN: Optional[str] = None
    LOG_LEVEL: str = "INFO"

    # Feature Flags
    ENABLE_BIO_GENERATION: bool = True
    ENABLE_PROFILE_OPTIMIZATION: bool = True
    ENABLE_COMPATIBILITY_ANALYSIS: bool = True
    ENABLE_SENTIMENT_ANALYSIS: bool = True
    ENABLE_TRANSLATION: bool = True

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
