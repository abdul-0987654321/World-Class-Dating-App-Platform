"""Configuration settings for the recommendation service."""

from functools import lru_cache
from typing import List, Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""

    # Service info
    SERVICE_NAME: str = "recommendation-service"
    VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8082
    WORKERS: int = 4

    # CORS - Allow all flamoral.com domains and development servers
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:5174",
        "https://flamoral.com",
        "https://www.flamoral.com",
        "https://app.flamoral.com",
        "https://admin.flamoral.com",
        "https://*.flamoral.com",
        "https://*.vercel.app",
    ]

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/heartly"
    MONGODB_URL: str = "mongodb://localhost:27017"
    MONGODB_DATABASE: str = "heartly"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    CACHE_TTL: int = 3600  # 1 hour

    # Pinecone (Vector DB)
    PINECONE_API_KEY: Optional[str] = None
    PINECONE_ENVIRONMENT: str = "us-east-1"
    PINECONE_INDEX_NAME: str = "heartly-profiles"

    # ML Models
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"
    COMPATIBILITY_MODEL_PATH: str = "models/compatibility_model.pkl"
    EMBEDDING_DIMENSION: int = 384

    # Recommendation settings
    DEFAULT_RECOMMENDATION_LIMIT: int = 50
    MAX_RECOMMENDATION_LIMIT: int = 200
    COMPATIBILITY_WEIGHT: float = 0.4
    RECENCY_WEIGHT: float = 0.15
    ACTIVITY_WEIGHT: float = 0.15
    VERIFICATION_WEIGHT: float = 0.1
    ELO_WEIGHT: float = 0.1
    NEW_USER_WEIGHT: float = 0.05
    BOOST_WEIGHT: float = 0.05

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
