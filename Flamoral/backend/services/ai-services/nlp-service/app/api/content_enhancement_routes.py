"""AI Content Enhancement routes for Bio Generator and Message Assistant."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
import structlog

logger = structlog.get_logger()
router = APIRouter()


# Request/Response Models for Bio Generator
class BioGenerateRequest(BaseModel):
    """Request for generating a dating profile bio."""
    interests: List[str] = Field(..., min_items=1, description="User interests")
    personality_traits: List[str] = Field(..., min_items=1, description="Personality traits")
    style: str = Field("casual", description="Style: witty, romantic, casual, professional, adventurous")
    age: Optional[int] = Field(None, ge=18, le=100)
    occupation: Optional[str] = None
    additional_info: Optional[dict] = None
    max_length: int = Field(150, ge=50, le=300)


class BioImproveRequest(BaseModel):
    """Request for improving an existing bio."""
    current_bio: str = Field(..., min_length=10, max_length=500)
    target_style: Optional[str] = None
    enhancement_focus: Optional[List[str]] = Field(None, description="Focus areas: clarity, engagement, authenticity")


# Request/Response Models for Message Assistant
class ConversationStarterRequest(BaseModel):
    """Request for conversation starters."""
    recipient_profile: dict = Field(..., description="Match's profile information")
    sender_profile: Optional[dict] = None
    count: int = Field(3, ge=1, le=5)
    tone: str = Field("casual", description="Tone: casual, formal, playful, flirty, sincere")


class ReplySuggestionRequest(BaseModel):
    """Request for reply suggestions."""
    conversation_history: List[dict] = Field(..., description="Recent messages")
    recipient_profile: Optional[dict] = None
    tone: str = Field("casual", description="Tone: casual, formal, playful, flirty, sincere")
    count: int = Field(3, ge=1, le=5)


class MessageRewriteRequest(BaseModel):
    """Request for message rewriting."""
    original_message: str = Field(..., min_length=1, max_length=500)
    target_style: str = Field(..., description="Style: flirty, romantic, casual, formal, playful")
    preserve_meaning: bool = True


class ToneAdjustRequest(BaseModel):
    """Request for tone adjustment."""
    message: str = Field(..., min_length=1, max_length=500)
    current_tone: str = Field(..., description="Current tone of the message")
    target_tone: str = Field(..., description="Desired tone")


class MessageAnalysisRequest(BaseModel):
    """Request for message effectiveness analysis."""
    message: str = Field(..., min_length=1, max_length=500)
    context: Optional[dict] = None


# Helper functions for services
def get_bio_generator(request: Request):
    """Get bio generator service from app state."""
    return request.app.state.bio_generator


def get_message_assistant(request: Request):
    """Get message assistant service from app state."""
    return request.app.state.message_assistant


# ===== BIO GENERATOR ROUTES =====

@router.post("/bio/generate")
async def generate_bio(
    request: BioGenerateRequest,
    bio_gen = Depends(get_bio_generator)
):
    """
    Generate a dating profile bio based on interests and personality.

    Features:
    - Multiple style options (witty, romantic, casual, professional, adventurous)
    - Bio variations for different approaches
    - Improvement suggestions
    - Style-specific guidance
    """
    try:
        result = await bio_gen.generate_bio(
            interests=request.interests,
            personality_traits=request.personality_traits,
            style=request.style,
            age=request.age,
            occupation=request.occupation,
            additional_info=request.additional_info,
            max_length=request.max_length
        )
        return {"success": True, "data": result}

    except Exception as e:
        logger.error("Bio generation failed", error=str(e))
        raise HTTPException(status_code=500, detail="Bio generation failed")


@router.post("/bio/improve")
async def improve_bio(
    request: BioImproveRequest,
    bio_gen = Depends(get_bio_generator)
):
    """
    Analyze and improve an existing dating profile bio.

    Provides:
    - Detailed bio analysis
    - Multiple improved versions
    - Specific suggestions for enhancement
    - Strengths and areas for improvement
    """
    try:
        result = await bio_gen.improve_bio(
            current_bio=request.current_bio,
            target_style=request.target_style,
            enhancement_focus=request.enhancement_focus
        )
        return {"success": True, "data": result}

    except Exception as e:
        logger.error("Bio improvement failed", error=str(e))
        raise HTTPException(status_code=500, detail="Bio improvement failed")


# ===== MESSAGE ASSISTANT ROUTES =====

@router.post("/messages/conversation-starters")
async def generate_conversation_starters(
    request: ConversationStarterRequest,
    msg_assistant = Depends(get_message_assistant)
):
    """
    Generate conversation starters based on match profile.

    Creates personalized opening messages based on:
    - Match's interests and bio
    - Desired tone
    - Profile compatibility
    """
    try:
        result = await msg_assistant.generate_conversation_starters(
            recipient_profile=request.recipient_profile,
            sender_profile=request.sender_profile,
            count=request.count,
            tone=request.tone
        )
        return {"success": True, "data": result}

    except Exception as e:
        logger.error("Conversation starter generation failed", error=str(e))
        raise HTTPException(status_code=500, detail="Conversation starter generation failed")


@router.post("/messages/reply-suggestions")
async def generate_reply_suggestions(
    request: ReplySuggestionRequest,
    msg_assistant = Depends(get_message_assistant)
):
    """
    Generate reply suggestions based on conversation context.

    Analyzes conversation and provides:
    - Context-aware reply options
    - Suggested topics to explore
    - Conversation sentiment analysis
    """
    try:
        result = await msg_assistant.generate_reply_suggestions(
            conversation_history=request.conversation_history,
            recipient_profile=request.recipient_profile,
            tone=request.tone,
            count=request.count
        )
        return {"success": True, "data": result}

    except Exception as e:
        logger.error("Reply suggestion generation failed", error=str(e))
        raise HTTPException(status_code=500, detail="Reply suggestion generation failed")


@router.post("/messages/rewrite")
async def rewrite_message(
    request: MessageRewriteRequest,
    msg_assistant = Depends(get_message_assistant)
):
    """
    Rewrite a message in a different style (flirty, romantic, casual, etc.).

    Perfect for:
    - Making messages more engaging
    - Adjusting communication style
    - Adding romantic or playful elements
    """
    try:
        result = await msg_assistant.rewrite_message(
            original_message=request.original_message,
            target_style=request.target_style,
            preserve_meaning=request.preserve_meaning
        )
        return {"success": True, "data": result}

    except Exception as e:
        logger.error("Message rewrite failed", error=str(e))
        raise HTTPException(status_code=500, detail="Message rewrite failed")


@router.post("/messages/adjust-tone")
async def adjust_message_tone(
    request: ToneAdjustRequest,
    msg_assistant = Depends(get_message_assistant)
):
    """
    Adjust the tone of a message (casual, formal, playful, etc.).

    Helps users:
    - Match communication style
    - Adjust formality level
    - Create better rapport
    """
    try:
        result = await msg_assistant.adjust_tone(
            message=request.message,
            current_tone=request.current_tone,
            target_tone=request.target_tone
        )
        return {"success": True, "data": result}

    except Exception as e:
        logger.error("Tone adjustment failed", error=str(e))
        raise HTTPException(status_code=500, detail="Tone adjustment failed")


@router.post("/messages/analyze")
async def analyze_message_effectiveness(
    request: MessageAnalysisRequest,
    msg_assistant = Depends(get_message_assistant)
):
    """
    Analyze how effective a message is likely to be.

    Provides:
    - Overall effectiveness score
    - Detailed analysis (length, engagement, tone, etc.)
    - Specific improvement suggestions
    - Message strengths and weaknesses
    """
    try:
        result = await msg_assistant.analyze_message_effectiveness(
            message=request.message,
            context=request.context
        )
        return {"success": True, "data": result}

    except Exception as e:
        logger.error("Message analysis failed", error=str(e))
        raise HTTPException(status_code=500, detail="Message analysis failed")
