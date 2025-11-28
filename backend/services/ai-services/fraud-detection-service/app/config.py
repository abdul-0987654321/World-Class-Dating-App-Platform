"""Configuration settings for the fraud detection service."""

from functools import lru_cache
from typing import List, Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""

    # Service info
    SERVICE_NAME: str = "fraud-detection-service"
    VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8084
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
    BEHAVIOR_MODEL_PATH: str = "models/behavior_fraud_model.pkl"
    PROFILE_MODEL_PATH: str = "models/profile_fraud_model.pkl"
    TEXT_MODEL_PATH: str = "models/text_fraud_model.pkl"

    # Fraud Detection Thresholds
    FRAUD_SCORE_THRESHOLD: float = 0.7
    HIGH_RISK_THRESHOLD: float = 0.85
    VELOCITY_WINDOW_MINUTES: int = 60
    MAX_MESSAGES_PER_HOUR: int = 100
    MAX_SWIPES_PER_HOUR: int = 200
    MAX_PROFILE_VIEWS_PER_HOUR: int = 300
    SUSPICIOUS_LOGIN_THRESHOLD: int = 5

    # GeoIP
    GEOIP_DATABASE_PATH: str = "data/GeoLite2-City.mmdb"
    MAX_LOCATION_JUMP_KM: float = 500.0  # Impossible travel detection
    LOCATION_JUMP_WINDOW_HOURS: int = 2

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
