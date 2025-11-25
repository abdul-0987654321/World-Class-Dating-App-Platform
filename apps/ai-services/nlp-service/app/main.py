"""Main entry point for the NLP Service."""

import sentry_sdk
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import make_asgi_app
import structlog

from app.config import get_settings
from app.api.routes import router
from app.services.text_analyzer import TextAnalyzerService
from app.services.conversation_analyzer import ConversationAnalyzerService
from app.services.content_moderator import ContentModeratorService

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
    logger.info("Starting NLP service", version=settings.VERSION)

    # Initialize services
    try:
        # Initialize text analyzer
        app.state.text_analyzer = TextAnalyzerService(settings)
        await app.state.text_analyzer.initialize()

        # Initialize conversation analyzer
        app.state.conversation_analyzer = ConversationAnalyzerService(settings)
        await app.state.conversation_analyzer.initialize()

        # Initialize content moderator
        app.state.content_moderator = ContentModeratorService(settings)
        await app.state.content_moderator.initialize()

        logger.info("All services initialized successfully")
    except Exception as e:
        logger.error("Failed to initialize services", error=str(e))
        raise

    yield

    # Cleanup
    logger.info("Shutting down NLP service")
    await app.state.text_analyzer.close()
    await app.state.conversation_analyzer.close()
    await app.state.content_moderator.close()


# Create FastAPI app
app = FastAPI(
    title="ConnectSphere NLP Service",
    description="AI-powered natural language processing for the ConnectSphere dating platform",
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
    # Check Redis connection
    try:
        await app.state.text_analyzer.redis_client.ping()
    except Exception as e:
        return {"status": "not ready", "error": f"Redis: {str(e)}"}

    # Check MongoDB connection
    try:
        await app.state.conversation_analyzer.db.command("ping")
    except Exception as e:
        return {"status": "not ready", "error": f"MongoDB: {str(e)}"}

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
