"""API routes for Content Generator Service."""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

router = APIRouter(tags=["content-generator"])


# Request Models
class IcebreakerRequest(BaseModel):
    match_profile: Dict[str, Any] = Field(..., description="Match profile data")
    user_profile: Optional[Dict[str, Any]] = Field(None, description="User profile")
    count: int = Field(default=5, le=10)
    style: str = Field(default="friendly")


class DateIdeaRequest(BaseModel):
    profile1: Dict[str, Any]
    profile2: Dict[str, Any]
    preferences: Optional[Dict[str, Any]] = None


class GiftRequest(BaseModel):
    recipient_profile: Dict[str, Any]
    occasion: str = Field(default="casual")
    budget: str = Field(default="moderate")
    relationship_stage: str = Field(default="early")


class ComplimentRequest(BaseModel):
    profile: Dict[str, Any]
    compliment_type: str = Field(default="general")
    count: int = Field(default=5, le=10)


class TopicRequest(BaseModel):
    conversation_history: List[Dict[str, Any]]
    profile1: Dict[str, Any]
    profile2: Dict[str, Any]
    conversation_stage: str = Field(default="early")


# Endpoints
@router.post("/icebreakers/generate")
async def generate_icebreakers(request: IcebreakerRequest, app_request: Request):
    """Generate ice-breaker messages."""
    try:
        service = app_request.app.state.icebreaker_generator
        result = await service.generate_icebreakers(
            request.match_profile,
            request.user_profile,
            request.count,
            request.style
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/date-ideas/generate")
async def generate_date_ideas(request: DateIdeaRequest, app_request: Request):
    """Generate date idea suggestions."""
    try:
        service = app_request.app.state.date_idea_generator
        result = await service.generate_date_ideas(
            request.profile1,
            request.profile2,
            request.preferences
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/gifts/recommend")
async def recommend_gifts(request: GiftRequest, app_request: Request):
    """Recommend gifts."""
    try:
        service = app_request.app.state.gift_recommender
        result = await service.recommend_gifts(
            request.recipient_profile,
            request.occasion,
            request.budget,
            request.relationship_stage
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/compliments/generate")
async def generate_compliments(request: ComplimentRequest, app_request: Request):
    """Generate compliments."""
    try:
        service = app_request.app.state.compliment_generator
        result = await service.generate_compliments(
            request.profile,
            request.compliment_type,
            request.count
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/topics/suggest")
async def suggest_topics(request: TopicRequest, app_request: Request):
    """Suggest conversation topics."""
    try:
        service = app_request.app.state.conversation_topic
        result = await service.suggest_topics(
            request.conversation_history,
            request.profile1,
            request.profile2,
            request.conversation_stage
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
