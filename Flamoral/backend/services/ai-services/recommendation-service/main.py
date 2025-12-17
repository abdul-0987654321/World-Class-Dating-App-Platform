"""Main entry point for the Recommendation Service."""

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator
from datetime import datetime

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

from models import (
    RecommendProfilesRequest, RecommendProfilesResponse,
    CompatibilityRequest, CompatibilityResponse,
    SimilarProfilesRequest, SimilarProfilesResponse,
    TopPicksRequest, TopPicksResponse
)
from services.recommendation_engine import RecommendationEngineService
from services.compatibility_calculator import CompatibilityCalculatorService
from services.profile_matcher import ProfileMatcherService

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator:
    """Application lifespan handler."""
    logger.info("Starting Recommendation Service")

    # Initialize services
    app.state.recommendation_engine = RecommendationEngineService()
    app.state.compatibility_calculator = CompatibilityCalculatorService()
    app.state.profile_matcher = ProfileMatcherService()

    await app.state.recommendation_engine.initialize()
    await app.state.compatibility_calculator.initialize()
    await app.state.profile_matcher.initialize()

    logger.info("All services initialized successfully")

    yield

    # Cleanup
    logger.info("Shutting down Recommendation Service")
    await app.state.recommendation_engine.close()
    await app.state.compatibility_calculator.close()
    await app.state.profile_matcher.close()


# Create FastAPI app
app = FastAPI(
    title="Recommendation Service",
    description="AI-powered recommendation engine for dating platform",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    from datetime import datetime
    import time
    import psutil

    dependencies = {
        "database": "ok",
        "redis": "ok",
    }

    # Check database (if you have one configured)
    # Uncomment and adjust based on your database setup
    # try:
    #     await db.execute("SELECT 1")
    # except Exception as e:
    #     dependencies["database"] = "error"

    # Check Redis (if you have it configured)
    # Uncomment and adjust based on your Redis setup
    # try:
    #     await redis.ping()
    # except Exception as e:
    #     dependencies["redis"] = "error"

    # For now, mark as ok since we don't have direct DB/Redis in this service
    # You can add actual checks when you integrate these dependencies

    status = "ok"
    if dependencies.get("database") == "error" or dependencies.get("redis") == "error":
        status = "degraded"

    return {
        "status": status,
        "service": "recommendation-service",
        "timestamp": datetime.utcnow().isoformat(),
        "dependencies": dependencies,
        "version": "1.0.0"
    }


@app.post("/api/recommend/profiles", response_model=RecommendProfilesResponse)
async def recommend_profiles(request: RecommendProfilesRequest, app_request: Request):
    """
    Get recommended profiles for a user.

    Uses collaborative filtering and content-based filtering
    to suggest compatible matches.
    """
    try:
        engine: RecommendationEngineService = app_request.app.state.recommendation_engine
        result = await engine.recommend(
            request.user_profile,
            request.limit,
            request.exclude_user_ids
        )
        return result
    except Exception as e:
        logger.error(f"Profile recommendation failed: {e}", exc_info=True)
        raise


@app.post("/api/recommend/compatibility", response_model=CompatibilityResponse)
async def calculate_compatibility(request: CompatibilityRequest, app_request: Request):
    """
    Calculate compatibility score between two users.

    Analyzes multiple factors including interests, preferences,
    location, and lifestyle compatibility.
    """
    try:
        calculator: CompatibilityCalculatorService = app_request.app.state.compatibility_calculator
        result = await calculator.calculate(
            request.user1_profile,
            request.user2_profile
        )
        return result
    except Exception as e:
        logger.error(f"Compatibility calculation failed: {e}", exc_info=True)
        raise


@app.post("/api/recommend/similar", response_model=SimilarProfilesResponse)
async def find_similar_profiles(request: SimilarProfilesRequest, app_request: Request):
    """
    Find profiles similar to a given user.

    Uses vector similarity and feature matching to find
    users with similar characteristics.
    """
    try:
        matcher: ProfileMatcherService = app_request.app.state.profile_matcher
        result = await matcher.find_similar(
            request.user_profile,
            request.limit
        )
        return result
    except Exception as e:
        logger.error(f"Similar profile search failed: {e}", exc_info=True)
        raise


@app.post("/api/recommend/top-picks", response_model=TopPicksResponse)
async def get_top_picks(request: TopPicksRequest, app_request: Request):
    """
    Get top picks for a user.

    Selects the best matches based on compatibility,
    activity level, and mutual interests.
    """
    try:
        engine: RecommendationEngineService = app_request.app.state.recommendation_engine
        result = await engine.get_top_picks(
            request.user_profile,
            request.count
        )
        return result
    except Exception as e:
        logger.error(f"Top picks generation failed: {e}", exc_info=True)
        raise


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8004,
        reload=True,
        log_level="info"
    )
