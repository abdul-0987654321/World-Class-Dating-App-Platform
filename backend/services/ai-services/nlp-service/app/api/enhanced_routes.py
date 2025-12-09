"""Enhanced API routes for NLP service."""

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import structlog

logger = structlog.get_logger()

router = APIRouter(prefix="/api/v1/nlp", tags=["nlp-enhanced"])


# Request/Response Models
class BioGenerationRequest(BaseModel):
    user_data: Dict[str, Any] = Field(..., description="User data for bio generation")
    tone: str = Field(default="friendly", description="Desired tone")
    max_length: int = Field(default=500, description="Maximum character length")


class BioEnhancementRequest(BaseModel):
    current_bio: str = Field(..., description="Current bio text")
    enhancement_goals: List[str] = Field(..., description="Enhancement goals")
    preserve_tone: bool = Field(default=True, description="Preserve original tone")


class ProfileAnalysisRequest(BaseModel):
    profile_data: Dict[str, Any] = Field(..., description="Profile data to analyze")


class ProfileOptimizationRequest(BaseModel):
    profile_data: Dict[str, Any] = Field(..., description="Profile data")
    target_audience: Optional[str] = Field(None, description="Target audience")


class CompatibilityAnalysisRequest(BaseModel):
    messages: List[Dict[str, Any]] = Field(..., description="Conversation messages")
    user1_id: str = Field(..., description="First user ID")
    user2_id: str = Field(..., description="Second user ID")
    user1_profile: Optional[Dict[str, Any]] = Field(None, description="User 1 profile")
    user2_profile: Optional[Dict[str, Any]] = Field(None, description="User 2 profile")


class SentimentAnalysisRequest(BaseModel):
    message: str = Field(..., description="Message to analyze")
    context: Optional[List[str]] = Field(None, description="Previous messages for context")


class ConversationSentimentRequest(BaseModel):
    messages: List[Dict[str, Any]] = Field(..., description="Conversation messages")


class TranslationRequest(BaseModel):
    text: str = Field(..., description="Text to translate")
    target_language: str = Field(..., description="Target language code")
    source_language: Optional[str] = Field(None, description="Source language code")


class ConversationTranslationRequest(BaseModel):
    messages: List[Dict[str, Any]] = Field(..., description="Messages to translate")
    target_language: str = Field(..., description="Target language code")


class LanguageDetectionRequest(BaseModel):
    text: str = Field(..., description="Text to analyze")
    include_alternatives: bool = Field(default=False, description="Include alternative predictions")


# Bio Generation Endpoints
@router.post("/bio/generate")
async def generate_bio(request: BioGenerationRequest, app_request: Request):
    """Generate a bio from user data using GPT."""
    try:
        bio_service = app_request.app.state.bio_enhancement
        result = await bio_service.generate_bio(
            request.user_data,
            request.tone,
            request.max_length
        )
        return result
    except Exception as e:
        logger.error("Bio generation failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/bio/enhance")
async def enhance_bio(request: BioEnhancementRequest, app_request: Request):
    """Enhance an existing bio."""
    try:
        bio_service = app_request.app.state.bio_enhancement
        result = await bio_service.enhance_bio(
            request.current_bio,
            request.enhancement_goals,
            request.preserve_tone
        )
        return result
    except Exception as e:
        logger.error("Bio enhancement failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/bio/suggestions")
async def get_bio_suggestions(request: BioGenerationRequest, app_request: Request):
    """Get suggestions for improving a bio."""
    try:
        bio_service = app_request.app.state.bio_enhancement
        result = await bio_service.get_bio_suggestions(
            request.user_data.get("bio", "")
        )
        return result
    except Exception as e:
        logger.error("Bio suggestions failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


# Profile Optimization Endpoints
@router.post("/profile/analyze-completeness")
async def analyze_profile_completeness(request: ProfileAnalysisRequest, app_request: Request):
    """Analyze profile completeness and suggest improvements."""
    try:
        optimizer_service = app_request.app.state.profile_optimizer
        result = await optimizer_service.analyze_profile_completeness(
            request.profile_data
        )
        return result
    except Exception as e:
        logger.error("Profile analysis failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/profile/optimize-visibility")
async def optimize_profile_visibility(request: ProfileOptimizationRequest, app_request: Request):
    """Get recommendations to optimize profile visibility."""
    try:
        optimizer_service = app_request.app.state.profile_optimizer
        result = await optimizer_service.optimize_profile_visibility(
            request.profile_data,
            request.target_audience
        )
        return result
    except Exception as e:
        logger.error("Profile optimization failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/profile/insights")
async def generate_profile_insights(request: ProfileAnalysisRequest, app_request: Request):
    """Generate insights about profile performance."""
    try:
        optimizer_service = app_request.app.state.profile_optimizer
        result = await optimizer_service.generate_profile_insights(
            request.profile_data
        )
        return result
    except Exception as e:
        logger.error("Profile insights generation failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/profile/compare")
async def compare_with_successful_profiles(request: ProfileAnalysisRequest, app_request: Request):
    """Compare profile with successful profiles."""
    try:
        optimizer_service = app_request.app.state.profile_optimizer
        demographic = request.profile_data.get("demographic", "general")
        result = await optimizer_service.compare_with_successful_profiles(
            request.profile_data,
            demographic
        )
        return result
    except Exception as e:
        logger.error("Profile comparison failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


# Compatibility Analysis Endpoints
@router.post("/compatibility/analyze")
async def analyze_conversation_compatibility(request: CompatibilityAnalysisRequest, app_request: Request):
    """Analyze compatibility based on conversation patterns."""
    try:
        compatibility_service = app_request.app.state.compatibility_analyzer
        result = await compatibility_service.analyze_conversation_compatibility(
            request.messages,
            request.user1_id,
            request.user2_id,
            request.user1_profile,
            request.user2_profile
        )
        return result
    except Exception as e:
        logger.error("Compatibility analysis failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/compatibility/predict-success")
async def predict_conversation_success(request: CompatibilityAnalysisRequest, app_request: Request):
    """Predict likelihood of successful long-term conversation."""
    try:
        compatibility_service = app_request.app.state.compatibility_analyzer
        result = await compatibility_service.predict_conversation_success(
            request.messages,
            request.user1_profile or {},
            request.user2_profile or {}
        )
        return result
    except Exception as e:
        logger.error("Success prediction failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


# Sentiment Analysis Endpoints
@router.post("/sentiment/analyze-message")
async def analyze_message_tone(request: SentimentAnalysisRequest, app_request: Request):
    """Analyze the tone and sentiment of a message."""
    try:
        sentiment_service = app_request.app.state.sentiment_analysis
        result = await sentiment_service.analyze_message_tone(
            request.message,
            request.context
        )
        return result
    except Exception as e:
        logger.error("Message tone analysis failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sentiment/analyze-conversation")
async def analyze_conversation_sentiment_flow(request: ConversationSentimentRequest, app_request: Request):
    """Analyze sentiment flow across entire conversation."""
    try:
        sentiment_service = app_request.app.state.sentiment_analysis
        result = await sentiment_service.analyze_conversation_sentiment_flow(
            request.messages
        )
        return result
    except Exception as e:
        logger.error("Conversation sentiment analysis failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sentiment/detect-emotional-state")
async def detect_emotional_state(request: ConversationSentimentRequest, app_request: Request):
    """Detect emotional state from recent messages."""
    try:
        sentiment_service = app_request.app.state.sentiment_analysis
        user_id = request.messages[0].get("sender_id") if request.messages else "unknown"
        messages_text = [m.get("content", "") for m in request.messages]
        result = await sentiment_service.detect_emotional_state(
            messages_text,
            user_id
        )
        return result
    except Exception as e:
        logger.error("Emotional state detection failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


# Translation Endpoints
@router.post("/translation/translate")
async def translate_text(request: TranslationRequest, app_request: Request):
    """Translate text to target language."""
    try:
        translation_service = app_request.app.state.translation
        result = await translation_service.translate_text(
            request.text,
            request.target_language,
            request.source_language
        )
        return result
    except Exception as e:
        logger.error("Translation failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/translation/translate-conversation")
async def translate_conversation(request: ConversationTranslationRequest, app_request: Request):
    """Translate entire conversation to target language."""
    try:
        translation_service = app_request.app.state.translation
        result = await translation_service.translate_conversation(
            request.messages,
            request.target_language
        )
        return result
    except Exception as e:
        logger.error("Conversation translation failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/translation/detect-language")
async def detect_language(request: LanguageDetectionRequest, app_request: Request):
    """Detect language of text."""
    try:
        translation_service = app_request.app.state.translation
        result = await translation_service.detect_language(
            request.text,
            request.include_alternatives
        )
        return result
    except Exception as e:
        logger.error("Language detection failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/translation/analyze-multilingual-profile")
async def analyze_multilingual_profile(request: ProfileAnalysisRequest, app_request: Request):
    """Analyze language usage in profile."""
    try:
        translation_service = app_request.app.state.translation
        result = await translation_service.analyze_multilingual_profile(
            request.profile_data
        )
        return result
    except Exception as e:
        logger.error("Multilingual profile analysis failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/translation/suggestions/{user_lang}/{match_lang}")
async def get_translation_suggestions(user_lang: str, match_lang: str, app_request: Request):
    """Get suggestions for cross-language communication."""
    try:
        translation_service = app_request.app.state.translation
        result = await translation_service.get_translation_suggestions(
            user_lang,
            match_lang
        )
        return result
    except Exception as e:
        logger.error("Translation suggestions failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))
