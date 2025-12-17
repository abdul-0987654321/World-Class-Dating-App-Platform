"""Pydantic models for NLP Service."""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum


class SentimentLabel(str, Enum):
    """Sentiment labels."""
    POSITIVE = "positive"
    NEGATIVE = "negative"
    NEUTRAL = "neutral"


class ToxicityCategory(str, Enum):
    """Toxicity categories."""
    INSULT = "insult"
    THREAT = "threat"
    HARASSMENT = "harassment"
    HATE_SPEECH = "hate_speech"
    PROFANITY = "profanity"
    SEXUAL = "sexual"


class SentimentRequest(BaseModel):
    """Request for sentiment analysis."""
    text: str = Field(..., min_length=1, max_length=5000, description="Text to analyze")


class SentimentResponse(BaseModel):
    """Response from sentiment analysis."""
    text: str = Field(..., description="Original text")
    sentiment: SentimentLabel = Field(..., description="Sentiment label")
    score: float = Field(..., ge=-1, le=1, description="Sentiment score (-1 to 1)")
    confidence: float = Field(..., ge=0, le=1, description="Confidence score")
    emotions: Optional[Dict[str, float]] = Field(None, description="Emotion breakdown")


class ToxicityRequest(BaseModel):
    """Request for toxicity detection."""
    text: str = Field(..., min_length=1, max_length=5000, description="Text to analyze")


class ToxicityResponse(BaseModel):
    """Response from toxicity detection."""
    text: str = Field(..., description="Original text")
    is_toxic: bool = Field(..., description="Whether text is toxic")
    toxicity_score: float = Field(..., ge=0, le=1, description="Overall toxicity score")
    categories: Dict[str, float] = Field(..., description="Category scores")
    flagged_phrases: List[str] = Field(default_factory=list, description="Flagged phrases")


class ScamDetectionRequest(BaseModel):
    """Request for scam message detection."""
    text: str = Field(..., min_length=1, max_length=5000, description="Text to analyze")


class ScamDetectionResponse(BaseModel):
    """Response from scam detection."""
    text: str = Field(..., description="Original text")
    is_scam: bool = Field(..., description="Whether text is a scam")
    scam_score: float = Field(..., ge=0, le=1, description="Scam probability score")
    scam_indicators: List[str] = Field(default_factory=list, description="Detected scam indicators")
    scam_type: Optional[str] = Field(None, description="Type of scam detected")


class LanguageDetectRequest(BaseModel):
    """Request for language detection."""
    text: str = Field(..., min_length=1, max_length=5000, description="Text to analyze")


class LanguageDetectResponse(BaseModel):
    """Response from language detection."""
    text: str = Field(..., description="Original text")
    language: str = Field(..., description="Detected language code")
    confidence: float = Field(..., ge=0, le=1, description="Detection confidence")
    alternatives: List[Dict[str, Any]] = Field(default_factory=list, description="Alternative languages")


class SmartRepliesRequest(BaseModel):
    """Request for smart reply suggestions."""
    conversation_history: List[Dict[str, Any]] = Field(..., description="Recent conversation messages")
    max_suggestions: int = Field(3, ge=1, le=5, description="Maximum number of suggestions")


class SmartRepliesResponse(BaseModel):
    """Response with smart reply suggestions."""
    suggestions: List[str] = Field(..., description="Reply suggestions")
    context_summary: Optional[str] = Field(None, description="Conversation context summary")
