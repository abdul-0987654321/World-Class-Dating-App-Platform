"""Main entry point for the Dating Coach Service."""

import logging
import time
import asyncio
from contextlib import asynccontextmanager
from typing import AsyncGenerator, Dict, Any, Optional
from datetime import datetime, timezone
from enum import Enum

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse
from pydantic import BaseModel, Field
import uvicorn

from app.config import settings
from app.api.routes import router
from app.services.ai_provider import AIProviderService
from app.services.icebreaker_service import IcebreakerService
from app.services.response_suggester import ResponseSuggesterService
from app.services.profile_analyzer import ProfileAnalyzerService
from app.services.date_idea_generator import DateIdeaGeneratorService
from app.services.conversation_analyzer import ConversationAnalyzerService
from app.services.conversation_coach import ConversationCoachService
from app.services.rate_limiter import RateLimiterService
from app.services.shared_experience import SharedExperienceService
from app.services.relationship_trajectory import RelationshipTrajectoryService
from app.services.communication_style import CommunicationStyleService
from app.services.conflict_mediator import ConflictMediatorService

from app.monitoring import metrics, metrics_collector
from app.middleware import (
    RequestTrackingMiddleware,
    ResponseHeaderMiddleware,
    get_request_id,
)
from app.structured_logging import setup_logging, log_error

# Configure structured logging
logger = setup_logging(
    level=settings.LOG_LEVEL,
    json_format=settings.LOG_FORMAT == "json",
    service_name=settings.SERVICE_NAME,
    log_file=settings.LOG_FILE,
)
logger = logging.getLogger(__name__)


# ============================================================================
# HEALTH CHECK MODELS
# ============================================================================

class HealthStatus(str, Enum):
    """Health check status values."""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"


class DependencyHealth(BaseModel):
    """Health status of a dependency."""
    name: str
    status: HealthStatus
    latency_ms: Optional[float] = None
    message: Optional[str] = None
    last_check: str


class DetailedHealthResponse(BaseModel):
    """Detailed health check response."""
    status: HealthStatus = Field(..., description="Overall service health status")
    service: str = Field(..., description="Service name")
    version: str = Field(..., description="Service version")
    environment: str = Field(..., description="Deployment environment")
    uptime_seconds: float = Field(..., description="Service uptime in seconds")
    timestamp: str = Field(..., description="Health check timestamp")

    # Dependency health
    dependencies: Dict[str, DependencyHealth] = Field(
        default_factory=dict,
        description="Health status of dependencies"
    )

    # AI Provider specific
    ai_provider: str = Field(..., description="Configured AI provider")
    ai_status: str = Field(..., description="AI provider connection status")

    # Metrics summary
    metrics_summary: Optional[Dict[str, Any]] = Field(
        None,
        description="Summary of key metrics"
    )


class ReadinessResponse(BaseModel):
    """Readiness probe response."""
    ready: bool
    checks: Dict[str, bool]
    message: Optional[str] = None


class LivenessResponse(BaseModel):
    """Liveness probe response."""
    alive: bool
    timestamp: str


# Track service start time for uptime calculation
_service_start_time: float = 0.0


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator:
    """Application lifespan handler."""
    global _service_start_time
    _service_start_time = time.time()

    logger.info(
        "Starting Dating Coach Service",
        extra={
            "version": settings.VERSION,
            "environment": settings.ENVIRONMENT,
            "ai_provider": settings.AI_PROVIDER,
        }
    )

    # Initialize AI provider
    ai_provider = AIProviderService()
    try:
        await ai_provider.initialize()
        app.state.ai_provider = ai_provider
        metrics.gauge_set("ai_provider_healthy", 1.0, {"provider": settings.AI_PROVIDER})
    except Exception as e:
        logger.error(f"Failed to initialize AI provider: {e}", exc_info=True)
        metrics.gauge_set("ai_provider_healthy", 0.0, {"provider": settings.AI_PROVIDER})
        raise

    # Initialize rate limiter
    rate_limiter = RateLimiterService()
    try:
        await rate_limiter.initialize()
        app.state.rate_limiter = rate_limiter
        metrics.gauge_set("redis_connected", 1.0 if rate_limiter.redis_client else 0.0)
    except Exception as e:
        logger.warning(f"Rate limiter initialization warning: {e}")
        app.state.rate_limiter = rate_limiter
        metrics.gauge_set("redis_connected", 0.0)

    # Initialize coaching services
    app.state.icebreaker_service = IcebreakerService(ai_provider)
    app.state.response_suggester = ResponseSuggesterService(ai_provider)
    app.state.profile_analyzer = ProfileAnalyzerService(ai_provider)
    app.state.date_idea_generator = DateIdeaGeneratorService(ai_provider)
    app.state.conversation_analyzer = ConversationAnalyzerService(ai_provider)
    app.state.conversation_coach = ConversationCoachService(ai_provider)
    app.state.shared_experience_service = SharedExperienceService(ai_provider)
    app.state.trajectory_service = RelationshipTrajectoryService(ai_provider)

    # Communication Style Matcher (Feature Flag: 0% rollout)
    app.state.communication_style_service = CommunicationStyleService(ai_provider)

    # Conflict Mediator (Feature Flag: 0% rollout - Research)
    app.state.conflict_mediator = ConflictMediatorService(ai_provider)

    logger.info(
        "All services initialized successfully",
        extra={
            "ai_provider": settings.AI_PROVIDER,
            "redis_connected": rate_limiter.redis_client is not None,
        }
    )

    yield

    # Cleanup
    logger.info("Shutting down Dating Coach Service")
    await ai_provider.close()
    await rate_limiter.close()


# Create FastAPI app
app = FastAPI(
    title="Dating Coach Service",
    description="AI-powered dating coach providing personalized advice and suggestions",
    version=settings.VERSION,
    lifespan=lifespan
)

# Add monitoring middleware (order matters - first added = outermost)
app.add_middleware(ResponseHeaderMiddleware)
app.add_middleware(RequestTrackingMiddleware)

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
    """Global exception handler with monitoring."""
    request_id = get_request_id()

    log_error(
        logger,
        exc,
        operation="request_handling",
        request_id=request_id,
        path=request.url.path,
        method=request.method,
    )

    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "request_id": request_id,
        },
        headers={"X-Request-ID": request_id},
    )


# ============================================================================
# HEALTH CHECK ENDPOINTS
# ============================================================================

@app.get("/health", response_model=DetailedHealthResponse, tags=["Health"])
async def health_check(request: Request):
    """
    Detailed health check endpoint.

    Returns comprehensive health information including:
    - Overall service status
    - Dependency health (Redis, AI provider)
    - Uptime and version info
    - Key metrics summary
    """
    ai_provider: AIProviderService = request.app.state.ai_provider
    rate_limiter: RateLimiterService = request.app.state.rate_limiter
    ai_status = ai_provider.get_status()

    # Check dependencies
    dependencies = {}

    # Check AI provider
    ai_healthy = ai_status["initialized"]
    dependencies["ai_provider"] = DependencyHealth(
        name=ai_status["provider"],
        status=HealthStatus.HEALTHY if ai_healthy else HealthStatus.UNHEALTHY,
        message=f"Model: {ai_status['model']}" if ai_healthy else "Not initialized",
        last_check=datetime.now(timezone.utc).isoformat(),
    )

    # Check Redis
    redis_healthy = await _check_redis_health(rate_limiter)
    dependencies["redis"] = DependencyHealth(
        name="redis",
        status=HealthStatus.HEALTHY if redis_healthy else HealthStatus.DEGRADED,
        message="Connected" if redis_healthy else "Using in-memory fallback",
        last_check=datetime.now(timezone.utc).isoformat(),
    )

    # Determine overall status
    if not ai_healthy:
        overall_status = HealthStatus.UNHEALTHY
    elif not redis_healthy:
        overall_status = HealthStatus.DEGRADED
    else:
        overall_status = HealthStatus.HEALTHY

    # Update metrics
    metrics.gauge_set("ai_provider_healthy", 1.0 if ai_healthy else 0.0, {"provider": settings.AI_PROVIDER})
    metrics.gauge_set("redis_connected", 1.0 if redis_healthy else 0.0)

    # Get metrics summary
    metrics_summary = None
    if settings.METRICS_ENABLED:
        try:
            metrics_summary = metrics.get_metrics_summary()
        except Exception as e:
            logger.warning(f"Failed to get metrics summary: {e}")

    return DetailedHealthResponse(
        status=overall_status,
        service=settings.SERVICE_NAME,
        version=settings.VERSION,
        environment=settings.ENVIRONMENT,
        uptime_seconds=time.time() - _service_start_time,
        timestamp=datetime.now(timezone.utc).isoformat(),
        dependencies=dependencies,
        ai_provider=ai_status["provider"],
        ai_status="connected" if ai_healthy else "disconnected",
        metrics_summary=metrics_summary,
    )


@app.get("/healthz", response_model=LivenessResponse, tags=["Health"])
@app.get("/live", response_model=LivenessResponse, tags=["Health"])
async def liveness_probe():
    """
    Kubernetes liveness probe.

    Simple check to verify the service is running.
    This should ONLY fail if the service should be restarted.
    """
    return LivenessResponse(
        alive=True,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


@app.get("/ready", response_model=ReadinessResponse, tags=["Health"])
async def readiness_probe(request: Request):
    """
    Kubernetes readiness probe.

    Checks if the service is ready to accept traffic.
    Returns not ready if critical dependencies are unavailable.
    """
    ai_provider: AIProviderService = request.app.state.ai_provider
    rate_limiter: RateLimiterService = request.app.state.rate_limiter

    checks = {}

    # Check AI provider (critical)
    ai_status = ai_provider.get_status()
    checks["ai_provider"] = ai_status["initialized"]

    # Check Redis (non-critical, has fallback)
    checks["redis"] = await _check_redis_health(rate_limiter)

    # Service is ready if AI provider is available
    # Redis is nice-to-have but not required
    is_ready = checks["ai_provider"]

    message = None
    if not is_ready:
        message = "AI provider not initialized"
    elif not checks["redis"]:
        message = "Running with degraded rate limiting (Redis unavailable)"

    return ReadinessResponse(
        ready=is_ready,
        checks=checks,
        message=message,
    )


async def _check_redis_health(rate_limiter: RateLimiterService) -> bool:
    """Check Redis connection health."""
    try:
        if rate_limiter.redis_client:
            rate_limiter.redis_client.ping()
            return True
    except Exception:
        pass
    return False


# ============================================================================
# METRICS ENDPOINT
# ============================================================================

@app.get("/metrics", tags=["Monitoring"])
async def prometheus_metrics():
    """
    Prometheus-compatible metrics endpoint.

    Returns metrics in Prometheus text exposition format.
    """
    if not settings.METRICS_ENABLED:
        return PlainTextResponse(
            content="# Metrics disabled\n",
            media_type="text/plain; version=0.0.4; charset=utf-8",
        )

    try:
        metrics_output = metrics.get_metrics_output()
        return PlainTextResponse(
            content=metrics_output,
            media_type="text/plain; version=0.0.4; charset=utf-8",
        )
    except Exception as e:
        logger.error(f"Failed to generate metrics: {e}", exc_info=True)
        return PlainTextResponse(
            content=f"# Error generating metrics: {e}\n",
            media_type="text/plain; version=0.0.4; charset=utf-8",
            status_code=500,
        )


@app.get("/metrics/summary", tags=["Monitoring"])
async def metrics_summary():
    """
    Get a JSON summary of current metrics.

    Useful for debugging and dashboards that prefer JSON.
    """
    if not settings.METRICS_ENABLED:
        return {"enabled": False, "message": "Metrics are disabled"}

    try:
        summary = metrics.get_metrics_summary()
        error_rate = metrics_collector.get_error_rate()

        return {
            "enabled": True,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "error_rate_percent": round(error_rate, 2),
            "summary": summary,
        }
    except Exception as e:
        logger.error(f"Failed to get metrics summary: {e}", exc_info=True)
        return {"enabled": True, "error": str(e)}


# ============================================================================
# API ROUTES
# ============================================================================

# Include API routes
app.include_router(router, prefix="/api", tags=["Dating Coach"])


@app.get("/", tags=["Info"])
async def root():
    """Root endpoint with service information."""
    return {
        "service": settings.SERVICE_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "status": "running",
        "uptime_seconds": round(time.time() - _service_start_time, 2),
        "endpoints": {
            "health": "/health",
            "ready": "/ready",
            "live": "/live",
            "metrics": "/metrics",
            "docs": "/docs",
            "api": {
                "icebreakers": "/api/coach/icebreakers",
                "suggest_response": "/api/coach/suggest-response",
                "profile_tips": "/api/coach/profile-tips",
                "date_ideas": "/api/coach/date-ideas",
                "conversation_analysis": "/api/coach/conversation-analysis",
                "usage": "/api/coach/usage",
                "real_time_coaching": "/api/coach/real-time-coaching",
                "next_message_advice": "/api/coach/next-message-advice",
                "date_ask_coaching": "/api/coach/date-ask-coaching",
                "shared_experiences": "/api/coach/shared-experiences",
                "conversation_game": "/api/coach/shared-experiences/conversation-game",
                "experience_feedback": "/api/coach/shared-experiences/feedback",
                "trajectory": "/api/coach/trajectory",
                "communication_style": "/api/coach/communication-style",
                "communication_style_compatibility": "/api/coach/communication-style/compatibility",
                "communication_style_friction": "/api/coach/communication-style/friction",
                "conflict_detect": "/api/coach/mediate/detect",
                "conflict_mediate": "/api/coach/mediate",
            },
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
