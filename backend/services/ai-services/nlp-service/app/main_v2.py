"""Enhanced main entry point for the NLP Service v2.0."""

import sentry_sdk
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import make_asgi_app
import structlog

from app.config_enhanced import get_settings
from app.api.routes import router as base_router
from app.api.enhanced_routes import router as enhanced_router

# Import existing services
from app.services.text_analyzer import TextAnalyzerService
from app.services.conversation_analyzer import ConversationAnalyzerService
from app.services.content_moderator import ContentModeratorService

# Import new enhanced services
from app.services.bio_enhancement import BioEnhancementService
from app.services.profile_optimizer import ProfileOptimizerService
from app.services.compatibility_analyzer import CompatibilityAnalyzerService
from app.services.sentiment_service import SentimentAnalysisService
from app.services.translation_service import TranslationService

# Configure structured logging
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
    logger.info("Starting NLP service v2.0", version=settings.VERSION)

    # Initialize existing services
    try:
        app.state.text_analyzer = TextAnalyzerService(settings)
        await app.state.text_analyzer.initialize()

        app.state.conversation_analyzer = ConversationAnalyzerService(settings)
        await app.state.conversation_analyzer.initialize()

        app.state.content_moderator = ContentModeratorService(settings)
        await app.state.content_moderator.initialize()

        logger.info("Base services initialized successfully")
    except Exception as e:
        logger.error("Failed to initialize base services", error=str(e))
        raise

    # Initialize enhanced services
    try:
        # Bio Enhancement
        if settings.ENABLE_BIO_GENERATION:
            app.state.bio_enhancement = BioEnhancementService(settings)
            await app.state.bio_enhancement.initialize()
            logger.info("Bio enhancement service initialized")

        # Profile Optimizer
        if settings.ENABLE_PROFILE_OPTIMIZATION:
            app.state.profile_optimizer = ProfileOptimizerService(settings)
            await app.state.profile_optimizer.initialize()
            logger.info("Profile optimizer service initialized")

        # Compatibility Analyzer
        if settings.ENABLE_COMPATIBILITY_ANALYSIS:
            app.state.compatibility_analyzer = CompatibilityAnalyzerService(settings)
            await app.state.compatibility_analyzer.initialize()
            logger.info("Compatibility analyzer service initialized")

        # Sentiment Analysis
        if settings.ENABLE_SENTIMENT_ANALYSIS:
            app.state.sentiment_analysis = SentimentAnalysisService(settings)
            await app.state.sentiment_analysis.initialize()
            logger.info("Sentiment analysis service initialized")

        # Translation
        if settings.ENABLE_TRANSLATION:
            app.state.translation = TranslationService(settings)
            await app.state.translation.initialize()
            logger.info("Translation service initialized")

        logger.info("All enhanced services initialized successfully")
    except Exception as e:
        logger.error("Failed to initialize enhanced services", error=str(e))
        logger.warning("Continuing with limited functionality")

    yield

    # Cleanup
    logger.info("Shutting down NLP service")

    # Cleanup base services
    await app.state.text_analyzer.close()
    await app.state.conversation_analyzer.close()
    await app.state.content_moderator.close()

    # Cleanup enhanced services
    if settings.ENABLE_BIO_GENERATION:
        await app.state.bio_enhancement.close()
    if settings.ENABLE_PROFILE_OPTIMIZATION:
        await app.state.profile_optimizer.close()
    if settings.ENABLE_COMPATIBILITY_ANALYSIS:
        await app.state.compatibility_analyzer.close()
    if settings.ENABLE_SENTIMENT_ANALYSIS:
        await app.state.sentiment_analysis.close()
    if settings.ENABLE_TRANSLATION:
        await app.state.translation.close()


# Create FastAPI app
app = FastAPI(
    title="Flamoral NLP Service",
    description="Enhanced AI-powered natural language processing for the Flamoral dating platform",
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
app.include_router(base_router, prefix="/api/v1")
app.include_router(enhanced_router)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": settings.SERVICE_NAME,
        "version": settings.VERSION,
        "features": {
            "bio_generation": settings.ENABLE_BIO_GENERATION,
            "profile_optimization": settings.ENABLE_PROFILE_OPTIMIZATION,
            "compatibility_analysis": settings.ENABLE_COMPATIBILITY_ANALYSIS,
            "sentiment_analysis": settings.ENABLE_SENTIMENT_ANALYSIS,
            "translation": settings.ENABLE_TRANSLATION
        }
    }


@app.get("/ready")
async def readiness_check():
    """Readiness check endpoint."""
    checks = {}

    # Check Redis connection
    try:
        await app.state.text_analyzer.redis_client.ping()
        checks["redis"] = "ok"
    except Exception as e:
        checks["redis"] = f"error: {str(e)}"

    # Check MongoDB connection
    try:
        await app.state.conversation_analyzer.db.command("ping")
        checks["mongodb"] = "ok"
    except Exception as e:
        checks["mongodb"] = f"error: {str(e)}"

    # Check if all services are ready
    all_ready = all(status == "ok" for status in checks.values())

    return {
        "status": "ready" if all_ready else "not ready",
        "checks": checks
    }


@app.get("/features")
async def list_features():
    """List available features and their status."""
    return {
        "service": settings.SERVICE_NAME,
        "version": settings.VERSION,
        "features": {
            "base_features": {
                "text_analysis": True,
                "conversation_analysis": True,
                "content_moderation": True
            },
            "enhanced_features": {
                "bio_generation": {
                    "enabled": settings.ENABLE_BIO_GENERATION,
                    "requires_api_key": True
                },
                "profile_optimization": {
                    "enabled": settings.ENABLE_PROFILE_OPTIMIZATION,
                    "requires_api_key": False
                },
                "compatibility_analysis": {
                    "enabled": settings.ENABLE_COMPATIBILITY_ANALYSIS,
                    "requires_api_key": False
                },
                "sentiment_analysis": {
                    "enabled": settings.ENABLE_SENTIMENT_ANALYSIS,
                    "requires_api_key": False
                },
                "translation": {
                    "enabled": settings.ENABLE_TRANSLATION,
                    "supported_languages": settings.SUPPORTED_LANGUAGES
                }
            }
        }
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main_v2:app",
        host=settings.HOST,
        port=settings.PORT,
        workers=settings.WORKERS,
        reload=settings.DEBUG,
    )
