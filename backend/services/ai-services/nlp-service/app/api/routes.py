"""API routes for the NLP service."""

from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
import structlog

from app.services.text_analyzer import TextAnalyzerService
from app.services.conversation_analyzer import ConversationAnalyzerService
from app.services.content_moderator import ContentModeratorService

logger = structlog.get_logger()
router = APIRouter()


# Request/Response Models

class TextInput(BaseModel):
    """Text input for analysis."""
    text: str = Field(..., min_length=1, max_length=5000)
    language: Optional[str] = None


class SentimentRequest(BaseModel):
    """Request for sentiment analysis."""
    text: str = Field(..., min_length=1, max_length=5000)
    include_emotions: bool = False


class SentimentResponse(BaseModel):
    """Response from sentiment analysis."""
    success: bool
    data: dict


class ToxicityRequest(BaseModel):
    """Request for toxicity analysis."""
    text: str = Field(..., min_length=1, max_length=5000)
    include_categories: bool = True


class MessageContext(BaseModel):
    """Message in a conversation."""
    message_id: str
    sender_id: str
    text: str
    timestamp: datetime


class ConversationAnalysisRequest(BaseModel):
    """Request for conversation analysis."""
    conversation_id: str
    messages: List[MessageContext]
    user_id: str  # The user to analyze


class ContentModerationRequest(BaseModel):
    """Request for content moderation."""
    content: str = Field(..., min_length=1, max_length=5000)
    content_type: str = Field(..., pattern="^(message|bio|profile_text|comment)$")
    user_id: Optional[str] = None


class IcebreakerRequest(BaseModel):
    """Request for icebreaker suggestions."""
    sender_profile: dict
    recipient_profile: dict
    count: int = Field(3, ge=1, le=10)


class SmartReplyRequest(BaseModel):
    """Request for smart reply suggestions."""
    conversation_history: List[MessageContext]
    user_id: str
    max_replies: int = Field(3, ge=1, le=5)


class LanguageDetectionRequest(BaseModel):
    """Request for language detection."""
    text: str = Field(..., min_length=1, max_length=5000)


class TextSimilarityRequest(BaseModel):
    """Request for text similarity."""
    text1: str = Field(..., min_length=1, max_length=5000)
    text2: str = Field(..., min_length=1, max_length=5000)


class BulkModerationRequest(BaseModel):
    """Request for bulk content moderation."""
    items: List[ContentModerationRequest]


# Helper to get services

def get_text_analyzer(request: Request) -> TextAnalyzerService:
    """Get text analyzer service from app state."""
    return request.app.state.text_analyzer


def get_conversation_analyzer(request: Request) -> ConversationAnalyzerService:
    """Get conversation analyzer service from app state."""
    return request.app.state.conversation_analyzer


def get_content_moderator(request: Request) -> ContentModeratorService:
    """Get content moderator service from app state."""
    return request.app.state.content_moderator


# Routes

@router.post("/sentiment", response_model=SentimentResponse)
async def analyze_sentiment(
    request: SentimentRequest,
    analyzer: TextAnalyzerService = Depends(get_text_analyzer)
):
    """
    Analyze sentiment of text.

    Returns:
    - Sentiment label (positive, negative, neutral)
    - Confidence scores
    - Optional emotion breakdown
    """
    try:
        result = await analyzer.analyze_sentiment(
            text=request.text,
            include_emotions=request.include_emotions
        )
        return SentimentResponse(success=True, data=result)

    except Exception as e:
        logger.error("Sentiment analysis failed", error=str(e))
        raise HTTPException(status_code=500, detail="Sentiment analysis failed")


@router.post("/toxicity")
async def analyze_toxicity(
    request: ToxicityRequest,
    analyzer: TextAnalyzerService = Depends(get_text_analyzer)
):
    """
    Analyze text for toxic content.

    Returns:
    - Overall toxicity score
    - Category breakdown (hate, harassment, violence, etc.)
    - Flagged phrases
    """
    try:
        result = await analyzer.analyze_toxicity(
            text=request.text,
            include_categories=request.include_categories
        )
        return {"success": True, "data": result}

    except Exception as e:
        logger.error("Toxicity analysis failed", error=str(e))
        raise HTTPException(status_code=500, detail="Toxicity analysis failed")


@router.post("/conversation/analyze")
async def analyze_conversation(
    request: ConversationAnalysisRequest,
    analyzer: ConversationAnalyzerService = Depends(get_conversation_analyzer)
):
    """
    Analyze a conversation for patterns.

    Detects:
    - Romance scam indicators
    - Manipulation tactics
    - Unhealthy communication patterns
    - Engagement quality
    """
    try:
        messages = [m.model_dump() for m in request.messages]
        result = await analyzer.analyze_conversation(
            conversation_id=request.conversation_id,
            messages=messages,
            user_id=request.user_id
        )
        return {"success": True, "data": result}

    except Exception as e:
        logger.error("Conversation analysis failed", error=str(e))
        raise HTTPException(status_code=500, detail="Conversation analysis failed")


@router.post("/moderate")
async def moderate_content(
    request: ContentModerationRequest,
    moderator: ContentModeratorService = Depends(get_content_moderator)
):
    """
    Moderate user-generated content.

    Checks for:
    - Profanity
    - Spam
    - Inappropriate content
    - Contact information (policy violation)
    - Scam indicators
    """
    try:
        result = await moderator.moderate_content(
            content=request.content,
            content_type=request.content_type,
            user_id=request.user_id
        )
        return {"success": True, "data": result}

    except Exception as e:
        logger.error("Content moderation failed", error=str(e))
        raise HTTPException(status_code=500, detail="Content moderation failed")


@router.post("/icebreakers")
async def generate_icebreakers(
    request: IcebreakerRequest,
    analyzer: ConversationAnalyzerService = Depends(get_conversation_analyzer)
):
    """
    Generate personalized icebreaker suggestions.

    Based on:
    - Common interests
    - Profile information
    - Conversation context
    """
    try:
        result = await analyzer.generate_icebreakers(
            sender_profile=request.sender_profile,
            recipient_profile=request.recipient_profile,
            count=request.count
        )
        return {"success": True, "data": result}

    except Exception as e:
        logger.error("Icebreaker generation failed", error=str(e))
        raise HTTPException(status_code=500, detail="Icebreaker generation failed")


@router.post("/smart-replies")
async def get_smart_replies(
    request: SmartReplyRequest,
    analyzer: ConversationAnalyzerService = Depends(get_conversation_analyzer)
):
    """
    Generate smart reply suggestions.

    Based on:
    - Conversation context
    - User communication style
    - Appropriate responses
    """
    try:
        history = [m.model_dump() for m in request.conversation_history]
        result = await analyzer.generate_smart_replies(
            conversation_history=history,
            user_id=request.user_id,
            max_replies=request.max_replies
        )
        return {"success": True, "data": result}

    except Exception as e:
        logger.error("Smart reply generation failed", error=str(e))
        raise HTTPException(status_code=500, detail="Smart reply generation failed")


@router.post("/language/detect")
async def detect_language(
    request: LanguageDetectionRequest,
    analyzer: TextAnalyzerService = Depends(get_text_analyzer)
):
    """
    Detect the language of text.

    Returns:
    - Detected language code
    - Confidence score
    - Alternative languages
    """
    try:
        result = await analyzer.detect_language(request.text)
        return {"success": True, "data": result}

    except Exception as e:
        logger.error("Language detection failed", error=str(e))
        raise HTTPException(status_code=500, detail="Language detection failed")


@router.post("/similarity")
async def calculate_similarity(
    request: TextSimilarityRequest,
    analyzer: TextAnalyzerService = Depends(get_text_analyzer)
):
    """
    Calculate semantic similarity between two texts.

    Returns similarity score (0-1).
    """
    try:
        result = await analyzer.calculate_similarity(
            request.text1,
            request.text2
        )
        return {"success": True, "data": result}

    except Exception as e:
        logger.error("Similarity calculation failed", error=str(e))
        raise HTTPException(status_code=500, detail="Similarity calculation failed")


@router.post("/extract/keywords")
async def extract_keywords(
    text_input: TextInput,
    analyzer: TextAnalyzerService = Depends(get_text_analyzer)
):
    """
    Extract keywords and key phrases from text.

    Useful for:
    - Profile interest extraction
    - Conversation topic identification
    """
    try:
        result = await analyzer.extract_keywords(
            text=text_input.text,
            language=text_input.language
        )
        return {"success": True, "data": result}

    except Exception as e:
        logger.error("Keyword extraction failed", error=str(e))
        raise HTTPException(status_code=500, detail="Keyword extraction failed")


@router.post("/extract/interests")
async def extract_interests(
    text_input: TextInput,
    analyzer: TextAnalyzerService = Depends(get_text_analyzer)
):
    """
    Extract interests from profile text.

    Returns categorized interests.
    """
    try:
        result = await analyzer.extract_interests(
            text=text_input.text,
            language=text_input.language
        )
        return {"success": True, "data": result}

    except Exception as e:
        logger.error("Interest extraction failed", error=str(e))
        raise HTTPException(status_code=500, detail="Interest extraction failed")


@router.post("/bulk/moderate")
async def bulk_moderate(
    request: BulkModerationRequest,
    moderator: ContentModeratorService = Depends(get_content_moderator)
):
    """
    Moderate multiple pieces of content.

    Efficient for batch processing.
    """
    try:
        results = []
        for item in request.items:
            result = await moderator.moderate_content(
                content=item.content,
                content_type=item.content_type,
                user_id=item.user_id
            )
            results.append(result)

        flagged_count = sum(1 for r in results if r.get("action") != "allow")

        return {
            "success": True,
            "data": {
                "total": len(results),
                "flagged": flagged_count,
                "results": results
            }
        }

    except Exception as e:
        logger.error("Bulk moderation failed", error=str(e))
        raise HTTPException(status_code=500, detail="Bulk moderation failed")


@router.get("/scam/patterns")
async def get_scam_patterns(
    analyzer: ConversationAnalyzerService = Depends(get_conversation_analyzer)
):
    """
    Get known scam conversation patterns.

    For admin dashboards and pattern management.
    """
    try:
        patterns = await analyzer.get_scam_patterns()
        return {"success": True, "data": patterns}

    except Exception as e:
        logger.error("Failed to retrieve scam patterns", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve scam patterns")
