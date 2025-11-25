"""Main entry point for the Photo Analysis Service."""

import sentry_sdk
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import make_asgi_app
import structlog

from app.config import get_settings
from app.api.routes import router
from app.services.face_detection import FaceDetectionService
from app.services.nsfw_detection import NSFWDetectionService
from app.services.photo_quality import PhotoQualityService
from app.services.deepfake_detection import DeepfakeDetectionService

# Configure logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer()
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
)

logger = structlog.get_logger()
settings = get_settings()

# Initialize Sentry
if settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.ENVIRONMENT,
        traces_sample_rate=0.1,
    )


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator:
    """Application lifespan handler."""
    logger.info("Starting photo analysis service", version=settings.VERSION)

    # Initialize services
    try:
        app.state.face_detection = FaceDetectionService(settings)
        await app.state.face_detection.initialize()

        app.state.nsfw_detection = NSFWDetectionService(settings)
        await app.state.nsfw_detection.initialize()

        app.state.photo_quality = PhotoQualityService(settings)
        await app.state.photo_quality.initialize()

        app.state.deepfake_detection = DeepfakeDetectionService(settings)
        await app.state.deepfake_detection.initialize()

        logger.info("All services initialized successfully")
    except Exception as e:
        logger.error("Failed to initialize services", error=str(e))
        raise

    yield

    # Cleanup
    logger.info("Shutting down photo analysis service")


# Create FastAPI app
app = FastAPI(
    title="Heartly Photo Analysis Service",
    description="AI-powered photo analysis for the Heartly dating app",
    version=settings.VERSION,
    lifespan=lifespan,
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount prometheus metrics
metrics_app = make_asgi_app()
app.mount("/metrics", metrics_app)

# Include API routes
app.include_router(router, prefix="/api/v1")


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": settings.SERVICE_NAME,
        "version": settings.VERSION
    }


@app.get("/ready")
async def readiness_check():
    """Readiness check endpoint."""
    return {"status": "ready"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        workers=settings.WORKERS,
        reload=settings.DEBUG,
    )
