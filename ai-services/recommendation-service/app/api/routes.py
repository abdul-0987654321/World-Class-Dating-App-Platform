"""API routes for the recommendation service."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
import structlog

from app.services.recommendation import RecommendationService

logger = structlog.get_logger()
router = APIRouter()


# Request/Response Models

class PreferencesFilter(BaseModel):
    """User preferences for filtering recommendations."""
    min_age: Optional[int] = Field(None, ge=18, le=100)
    max_age: Optional[int] = Field(None, ge=18, le=100)
    max_distance: Optional[float] = Field(None, ge=0, le=500)  # km
    genders: Optional[List[str]] = None
    relationship_goals: Optional[List[str]] = None
    interests: Optional[List[str]] = None
    verified_only: Optional[bool] = False


class LocationInput(BaseModel):
    """User location."""
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)


class RecommendationRequest(BaseModel):
    """Request body for getting recommendations."""
    user_id: str
    location: LocationInput
    preferences: Optional[PreferencesFilter] = None
    limit: int = Field(50, ge=1, le=200)
    offset: int = Field(0, ge=0)
    exclude_ids: Optional[List[str]] = Field(default_factory=list)


class ProfileRecommendation(BaseModel):
    """A recommended profile."""
    user_id: str
    compatibility_score: float
    distance_km: Optional[float]
    common_interests: List[str]
    match_reasons: List[str]


class RecommendationResponse(BaseModel):
    """Response with recommendations."""
    success: bool
    data: List[ProfileRecommendation]
    total: int
    has_more: bool


class CompatibilityRequest(BaseModel):
    """Request for compatibility score between two users."""
    user_id_a: str
    user_id_b: str


class CompatibilityResponse(BaseModel):
    """Compatibility score response."""
    success: bool
    data: dict


class EmbeddingRequest(BaseModel):
    """Request to update user embedding."""
    user_id: str
    profile_data: dict


# Helper to get recommendation service

def get_recommendation_service(request: Request) -> RecommendationService:
    """Get recommendation service from app state."""
    return request.app.state.recommendation_service


# Routes

@router.post("/recommendations", response_model=RecommendationResponse)
async def get_recommendations(
    request: RecommendationRequest,
    service: RecommendationService = Depends(get_recommendation_service)
):
    """
    Get personalized profile recommendations for a user.

    This endpoint returns a list of recommended profiles based on:
    - Compatibility scoring (interests, lifestyle, values)
    - Location proximity
    - User preferences
    - Activity level
    - Verification status
    """
    try:
        recommendations = await service.get_recommendations(
            user_id=request.user_id,
            location=(request.location.latitude, request.location.longitude),
            preferences=request.preferences.model_dump() if request.preferences else None,
            limit=request.limit,
            offset=request.offset,
            exclude_ids=request.exclude_ids
        )

        return RecommendationResponse(
            success=True,
            data=recommendations["profiles"],
            total=recommendations["total"],
            has_more=recommendations["has_more"]
        )

    except Exception as e:
        logger.error("Failed to get recommendations", error=str(e), user_id=request.user_id)
        raise HTTPException(status_code=500, detail="Failed to get recommendations")


@router.post("/compatibility", response_model=CompatibilityResponse)
async def get_compatibility_score(
    request: CompatibilityRequest,
    service: RecommendationService = Depends(get_recommendation_service)
):
    """
    Calculate compatibility score between two users.

    Returns a detailed breakdown of compatibility factors.
    """
    try:
        score = await service.calculate_compatibility(
            user_id_a=request.user_id_a,
            user_id_b=request.user_id_b
        )

        return CompatibilityResponse(
            success=True,
            data=score
        )

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error("Failed to calculate compatibility", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to calculate compatibility")


@router.post("/embeddings/update")
async def update_user_embedding(
    request: EmbeddingRequest,
    service: RecommendationService = Depends(get_recommendation_service)
):
    """
    Update a user's profile embedding in the vector store.

    Should be called when a user updates their profile.
    """
    try:
        await service.update_user_embedding(
            user_id=request.user_id,
            profile_data=request.profile_data
        )

        return {"success": True, "message": "Embedding updated successfully"}

    except Exception as e:
        logger.error("Failed to update embedding", error=str(e), user_id=request.user_id)
        raise HTTPException(status_code=500, detail="Failed to update embedding")


@router.delete("/embeddings/{user_id}")
async def delete_user_embedding(
    user_id: str,
    service: RecommendationService = Depends(get_recommendation_service)
):
    """
    Delete a user's embedding from the vector store.

    Should be called when a user deletes their account.
    """
    try:
        await service.delete_user_embedding(user_id)
        return {"success": True, "message": "Embedding deleted successfully"}

    except Exception as e:
        logger.error("Failed to delete embedding", error=str(e), user_id=user_id)
        raise HTTPException(status_code=500, detail="Failed to delete embedding")


@router.get("/similar/{user_id}")
async def get_similar_profiles(
    user_id: str,
    limit: int = Query(10, ge=1, le=50),
    service: RecommendationService = Depends(get_recommendation_service)
):
    """
    Get profiles similar to a given user.

    Useful for "Users like you also liked" features.
    """
    try:
        similar = await service.find_similar_profiles(user_id, limit)
        return {"success": True, "data": similar}

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error("Failed to find similar profiles", error=str(e), user_id=user_id)
        raise HTTPException(status_code=500, detail="Failed to find similar profiles")


@router.post("/batch/update")
async def batch_update_embeddings(
    user_ids: List[str],
    service: RecommendationService = Depends(get_recommendation_service)
):
    """
    Batch update embeddings for multiple users.

    Used for bulk operations and maintenance.
    """
    try:
        results = await service.batch_update_embeddings(user_ids)
        return {
            "success": True,
            "updated": results["updated"],
            "failed": results["failed"]
        }

    except Exception as e:
        logger.error("Failed to batch update embeddings", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to batch update embeddings")
