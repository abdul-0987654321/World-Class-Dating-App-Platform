"""Main entry point for the Dating Coach Service."""

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

from app.config import settings
from app.api.routes import router
from app.services.ai_provider import AIProviderService
from app.services.icebreaker_service import IcebreakerService
from app.services.response_suggester import ResponseSuggesterService
from app.services.profile_analyzer import ProfileAnalyzerService
from app.services.date_idea_generator import DateIdeaGeneratorService
from app.services.conversation_analyzer import ConversationAnalyzerService
from app.services.rate_limiter import RateLimiterService
from models import HealthResponse

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator:
    """Application lifespan handler."""
    logger.info("Starting Dating Coach Service")

    # Initialize AI provider
    ai_provider = AIProviderService()
    await ai_provider.initialize()
    app.state.ai_provider = ai_provider

    # Initialize rate limiter
    rate_limiter = RateLimiterService()
    await rate_limiter.initialize()
    app.state.rate_limiter = rate_limiter

    # Initialize coaching services
    app.state.icebreaker_service = IcebreakerService(ai_provider)
    app.state.response_suggester = ResponseSuggesterService(ai_provider)
    app.state.profile_analyzer = ProfileAnalyzerService(ai_provider)
    app.state.date_idea_generator = DateIdeaGeneratorService(ai_provider)
    app.state.conversation_analyzer = ConversationAnalyzerService(ai_provider)

    logger.info("All services initialized successfully")
    logger.info(f"Using AI provider: {settings.AI_PROVIDER}")

    yield

    # Cleanup
    logger.info("Shutting down Dating Coach Service")
    await ai_provider.close()
    await rate_limiter.close()


# Create FastAPI app
app = FastAPI(
    title="Dating Coach Service",
    description="AI-powered dating coach providing personalized advice and suggestions",
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


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )


@app.get("/health", response_model=HealthResponse)
async def health_check(request: Request):
    """Health check endpoint."""
    from datetime import datetime

    ai_provider: AIProviderService = request.app.state.ai_provider
    ai_status = ai_provider.get_status()

    dependencies = {
        "database": "ok",
        "redis": "ok",
        "ai_provider": "connected" if ai_status["initialized"] else "disconnected"
    }

    status = "ok" if ai_status["initialized"] else "degraded"

    return HealthResponse(
        status=status,
        service="dating-coach-service",
        version="1.0.0",
        ai_provider=ai_status["provider"],
        ai_status="connected" if ai_status["initialized"] else "disconnected",
        timestamp=datetime.utcnow().isoformat(),
        dependencies=dependencies,
    )


# Include API routes
app.include_router(router, prefix="/api", tags=["Dating Coach"])


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "service": "Dating Coach Service",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "health": "/health",
            "docs": "/docs",
            "icebreakers": "/api/coach/icebreakers",
            "suggest_response": "/api/coach/suggest-response",
            "profile_tips": "/api/coach/profile-tips",
            "date_ideas": "/api/coach/date-ideas",
            "conversation_analysis": "/api/coach/conversation-analysis",
            "usage": "/api/coach/usage",
        },
    }


if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower(),
    )
