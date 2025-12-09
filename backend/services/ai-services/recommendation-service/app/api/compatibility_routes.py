"""AI Compatibility Enhancement Routes."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
import structlog

logger = structlog.get_logger()
router = APIRouter()


# Request/Response Models
class RedFlagAnalysisRequest(BaseModel):
    """Request for red flag analysis."""
    conversation_history: List[dict] = Field(..., description="Conversation messages")
    user_profile: Optional[dict] = None


class RelationshipReadinessRequest(BaseModel):
    """Request for relationship readiness assessment."""
    user_profile: dict = Field(..., description="User profile information")
    behavioral_data: Optional[dict] = Field(None, description="User behavioral data")


class CommunicationStyleRequest(BaseModel):
    """Request for communication style matching."""
    user_a_messages: List[dict] = Field(..., description="User A's messages")
    user_b_messages: List[dict] = Field(..., description="User B's messages")


# Helper function
def get_compatibility_enhancement(request: Request):
    """Get compatibility enhancement service from app state."""
    return request.app.state.compatibility_enhancement


# Routes
@router.post("/compatibility/red-flags")
async def analyze_red_flags(
    request: RedFlagAnalysisRequest,
    service = Depends(get_compatibility_enhancement)
):
    """
    Analyze conversation for red flags and warning signs.

    Detects:
    - Financial scams
    - Manipulation tactics
    - Isolation attempts
    - Rushing behavior
    - Aggression or control
    - Other warning signs

    Provides risk assessment and safety recommendations.
    """
    try:
        result = await service.analyze_red_flags(
            conversation_history=request.conversation_history,
            user_profile=request.user_profile
        )
        return {"success": True, "data": result}

    except Exception as e:
        logger.error("Red flag analysis failed", error=str(e))
        raise HTTPException(status_code=500, detail="Red flag analysis failed")


@router.post("/compatibility/relationship-readiness")
async def assess_relationship_readiness(
    request: RelationshipReadinessRequest,
    service = Depends(get_compatibility_enhancement)
):
    """
    Assess user's readiness for a relationship.

    Analyzes:
    - Profile completeness
    - Goal clarity
    - Emotional readiness
    - Time availability

    Provides personalized recommendations for improvement.
    """
    try:
        result = await service.assess_relationship_readiness(
            user_profile=request.user_profile,
            behavioral_data=request.behavioral_data
        )
        return {"success": True, "data": result}

    except Exception as e:
        logger.error("Relationship readiness assessment failed", error=str(e))
        raise HTTPException(status_code=500, detail="Relationship readiness assessment failed")


@router.post("/compatibility/communication-style")
async def match_communication_styles(
    request: CommunicationStyleRequest,
    service = Depends(get_compatibility_enhancement)
):
    """
    Analyze and match communication styles between two users.

    Identifies:
    - Primary communication styles
    - Style compatibility
    - Potential conflicts
    - Suggestions for better communication

    Helps users understand and adapt to each other's communication preferences.
    """
    try:
        result = await service.match_communication_styles(
            user_a_messages=request.user_a_messages,
            user_b_messages=request.user_b_messages
        )
        return {"success": True, "data": result}

    except Exception as e:
        logger.error("Communication style matching failed", error=str(e))
        raise HTTPException(status_code=500, detail="Communication style matching failed")
