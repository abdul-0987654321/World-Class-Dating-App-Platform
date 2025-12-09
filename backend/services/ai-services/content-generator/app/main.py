"""Main entry point for the Content Generator Service."""

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import make_asgi_app
import uvicorn

from app.config import settings
from app.api.routes import router
from app.services.icebreaker_generator import IcebreakerGeneratorService
from app.services.content_services import (
    DateIdeaGeneratorService,
    GiftRecommendationService,
    ComplimentGeneratorService,
    ConversationTopicService
)

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator:
    """Application lifespan handler."""
    logger.info("Starting Content Generator Service")

    # Initialize services
    app.state.icebreaker_generator = IcebreakerGeneratorService(settings)
    await app.state.icebreaker_generator.initialize()

    app.state.date_idea_generator = DateIdeaGeneratorService(settings)
    await app.state.date_idea_generator.initialize()

    app.state.gift_recommender = GiftRecommendationService(settings)
    await app.state.gift_recommender.initialize()

    app.state.compliment_generator = ComplimentGeneratorService(settings)
    await app.state.compliment_generator.initialize()

    app.state.conversation_topic = ConversationTopicService(settings)
    await app.state.conversation_topic.initialize()

    logger.info("All services initialized successfully")

    yield

    # Cleanup
    logger.info("Shutting down Content Generator Service")
    await app.state.icebreaker_generator.close()
    await app.state.date_idea_generator.close()
    await app.state.gift_recommender.close()
    await app.state.compliment_generator.close()
    await app.state.conversation_topic.close()


# Create FastAPI app
app = FastAPI(
    title="Content Generator Service",
    description="AI-powered content generation for dating platform",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(",") if settings.CORS_ORIGINS != "*" else ["*"],
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
        "service": "content-generator",
        "version": "1.0.0"
    }


@app.get("/ready")
async def readiness_check():
    """Readiness check endpoint."""
    return {"status": "ready"}


if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower()
    )
