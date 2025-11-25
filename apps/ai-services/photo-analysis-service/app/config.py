"""Configuration settings for the photo analysis service."""

from functools import lru_cache
from typing import List, Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""

    # Service info
    SERVICE_NAME: str = "photo-analysis-service"
    VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8083
    WORKERS: int = 2  # Lower due to GPU memory

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173"]

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    CACHE_TTL: int = 86400  # 24 hours

    # Azure Cognitive Services
    AZURE_FACE_ENDPOINT: Optional[str] = None
    AZURE_FACE_KEY: Optional[str] = None
    AZURE_CONTENT_MODERATOR_ENDPOINT: Optional[str] = None
    AZURE_CONTENT_MODERATOR_KEY: Optional[str] = None

    # Storage
    AZURE_STORAGE_CONNECTION_STRING: Optional[str] = None
    AZURE_STORAGE_CONTAINER: str = "photos"

    # Model settings
    FACE_DETECTION_MODEL: str = "hog"  # "hog" or "cnn"
    FACE_DETECTION_CONFIDENCE: float = 0.6
    NSFW_THRESHOLD: float = 0.7
    DEEPFAKE_THRESHOLD: float = 0.5

    # Photo quality thresholds
    MIN_RESOLUTION: int = 400  # pixels
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
    MIN_FACE_SIZE: int = 100  # pixels
    BLUR_THRESHOLD: float = 100  # Laplacian variance

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
