"""Pydantic models for Photo Analysis Service API."""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum


# ============================================================================
# Enums
# ============================================================================

class PhotoQualityLevel(str, Enum):
    """Photo quality levels."""
    EXCELLENT = "excellent"
    GOOD = "good"
    FAIR = "fair"
    POOR = "poor"


class FacePositionEnum(str, Enum):
    """Face position in the image."""
    CENTERED = "centered"
    LEFT = "left"
    RIGHT = "right"
    TOP = "top"
    BOTTOM = "bottom"
    NOT_DETECTED = "not_detected"


# ============================================================================
# Request Models
# ============================================================================

class PhotoAnalyzeRequest(BaseModel):
    """Request for full photo analysis."""
    photo_url: Optional[str] = Field(None, description="URL of the photo to analyze")
    photo_base64: Optional[str] = Field(None, description="Base64 encoded photo data")
    user_id: Optional[str] = Field(None, description="User ID for context")
    is_primary: bool = Field(False, description="Whether this is the primary profile photo")

    class Config:
        json_schema_extra = {
            "example": {
                "photo_url": "https://cdn.example.com/photos/user123/photo1.jpg",
                "user_id": "user_123",
                "is_primary": True
            }
        }


class FaceDetectRequest(BaseModel):
    """Request for face detection."""
    photo_url: Optional[str] = Field(None, description="URL of the photo")
    photo_base64: Optional[str] = Field(None, description="Base64 encoded photo data")


class PhotoQualityRequest(BaseModel):
    """Request for photo quality assessment."""
    photo_url: Optional[str] = Field(None, description="URL of the photo")
    photo_base64: Optional[str] = Field(None, description="Base64 encoded photo data")


class ContentModerationRequest(BaseModel):
    """Request for content moderation check."""
    photo_url: Optional[str] = Field(None, description="URL of the photo")
    photo_base64: Optional[str] = Field(None, description="Base64 encoded photo data")
    strict_mode: bool = Field(False, description="Enable stricter moderation thresholds")


class StyleFeedbackRequest(BaseModel):
    """Request for style feedback."""
    photo_url: Optional[str] = Field(None, description="URL of the photo")
    photo_base64: Optional[str] = Field(None, description="Base64 encoded photo data")
    is_primary: bool = Field(False, description="Whether this is the primary photo")


class NSFWRequest(BaseModel):
    """Request for NSFW detection."""
    photo_url: str = Field(..., description="URL of the photo")


class DeepfakeRequest(BaseModel):
    """Request for deepfake detection."""
    photo_url: str = Field(..., description="URL of the photo")


class SelfieVerifyRequest(BaseModel):
    """Request for selfie verification."""
    selfie_url: str = Field(..., description="URL of the selfie")
    profile_photo_urls: List[str] = Field(..., description="URLs of profile photos")
    user_id: str = Field(..., description="User ID")


# ============================================================================
# Response Models - Sub-components
# ============================================================================

class FaceInfo(BaseModel):
    """Information about a detected face."""
    bounding_box: Dict[str, float] = Field(..., description="Face bounding box coordinates")
    confidence: float = Field(..., ge=0, le=1, description="Detection confidence")
    landmarks: Optional[Dict[str, Any]] = Field(None, description="Facial landmarks")
    attributes: Optional[Dict[str, Any]] = Field(None, description="Face attributes")
    estimated_age: Optional[int] = Field(None, description="Estimated age")
    expression: Optional[str] = Field(None, description="Detected expression")
    smile_score: Optional[float] = Field(None, ge=0, le=1, description="Smile confidence")


class QualityMetrics(BaseModel):
    """Detailed quality metrics."""
    resolution_score: float = Field(..., ge=0, le=100, description="Resolution quality score")
    lighting_score: float = Field(..., ge=0, le=100, description="Lighting quality score")
    blur_score: float = Field(..., ge=0, le=100, description="Sharpness score (higher = sharper)")
    compression_score: float = Field(..., ge=0, le=100, description="Compression quality score")
    noise_score: float = Field(..., ge=0, le=100, description="Noise level score (higher = less noise)")
    width: int = Field(..., description="Image width in pixels")
    height: int = Field(..., description="Image height in pixels")
    megapixels: float = Field(..., description="Image size in megapixels")


class ModerationScores(BaseModel):
    """Content moderation scores."""
    nudity_score: float = Field(..., ge=0, le=1, description="Nudity probability")
    suggestive_score: float = Field(..., ge=0, le=1, description="Suggestive content probability")
    violence_score: float = Field(..., ge=0, le=1, description="Violence probability")
    skin_exposure: float = Field(..., ge=0, le=1, description="Skin exposure ratio")


class FilterInfo(BaseModel):
    """Filter detection information."""
    filter_detected: bool = Field(..., description="Whether a filter was detected")
    filter_type: Optional[str] = Field(None, description="Type of filter detected")
    filter_confidence: float = Field(..., ge=0, le=1, description="Filter detection confidence")
    authenticity_score: float = Field(..., ge=0, le=100, description="Photo authenticity score")
    editing_indicators: List[str] = Field(default_factory=list, description="List of editing indicators")


class StyleInfo(BaseModel):
    """Style feedback information."""
    style_score: float = Field(..., ge=0, le=100, description="Overall style score")
    photo_type: str = Field(..., description="Detected photo type (selfie, portrait, group, etc.)")
    lighting_quality: str = Field(..., description="Lighting quality assessment")
    background_type: str = Field(..., description="Background type classification")
    positive_aspects: List[str] = Field(default_factory=list, description="Positive aspects of the photo")
    improvement_suggestions: List[str] = Field(default_factory=list, description="Suggestions for improvement")


# ============================================================================
# Response Models - Main
# ============================================================================

class FaceDetectResponse(BaseModel):
    """Response from face detection."""
    photo_url: Optional[str] = Field(None, description="Original photo URL")
    faces_detected: int = Field(..., description="Number of faces detected")
    faces: List[FaceInfo] = Field(default_factory=list, description="Detected faces")
    has_face: bool = Field(..., description="Whether at least one face was detected")
    primary_face_position: str = Field(
        FacePositionEnum.NOT_DETECTED.value,
        description="Position of the primary face"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "photo_url": "https://cdn.example.com/photo.jpg",
                "faces_detected": 1,
                "faces": [{
                    "bounding_box": {"x": 100, "y": 50, "width": 200, "height": 250},
                    "confidence": 0.95,
                    "estimated_age": 28,
                    "smile_score": 0.8
                }],
                "has_face": True,
                "primary_face_position": "centered"
            }
        }


class PhotoQualityResponse(BaseModel):
    """Response from photo quality assessment."""
    photo_url: Optional[str] = Field(None, description="Original photo URL")
    quality_score: float = Field(..., ge=0, le=100, description="Overall quality score")
    quality_level: PhotoQualityLevel = Field(..., description="Quality level")
    resolution: Dict[str, int] = Field(..., description="Photo resolution")
    issues: List[str] = Field(default_factory=list, description="Detected quality issues")
    details: Dict[str, Any] = Field(default_factory=dict, description="Detailed metrics")
    recommendations: List[str] = Field(default_factory=list, description="Quality improvement recommendations")

    class Config:
        json_schema_extra = {
            "example": {
                "photo_url": "https://cdn.example.com/photo.jpg",
                "quality_score": 85.5,
                "quality_level": "excellent",
                "resolution": {"width": 1920, "height": 1080},
                "issues": [],
                "details": {
                    "resolution_score": 100,
                    "lighting_score": 90,
                    "blur_score": 85,
                    "compression_score": 80,
                    "noise_score": 72
                },
                "recommendations": ["Great photo quality!"]
            }
        }


class ContentModerationResponse(BaseModel):
    """Response from content moderation check."""
    photo_url: Optional[str] = Field(None, description="Original photo URL")
    is_appropriate: bool = Field(..., description="Whether photo meets guidelines")
    flags: List[str] = Field(default_factory=list, description="Moderation flags")
    scores: ModerationScores = Field(..., description="Detailed moderation scores")
    should_reject: bool = Field(..., description="Whether photo should be rejected")
    rejection_reason: Optional[str] = Field(None, description="Reason for rejection if applicable")

    class Config:
        json_schema_extra = {
            "example": {
                "photo_url": "https://cdn.example.com/photo.jpg",
                "is_appropriate": True,
                "flags": [],
                "scores": {
                    "nudity_score": 0.05,
                    "suggestive_score": 0.1,
                    "violence_score": 0.0,
                    "skin_exposure": 0.2
                },
                "should_reject": False,
                "rejection_reason": None
            }
        }


class StyleFeedbackResponse(BaseModel):
    """Response from style feedback analysis."""
    photo_url: Optional[str] = Field(None, description="Original photo URL")
    style_score: float = Field(..., ge=0, le=100, description="Overall style score")
    style_info: StyleInfo = Field(..., description="Detailed style information")
    feedback: List[str] = Field(default_factory=list, description="All feedback items")
    primary_recommendation: Optional[str] = Field(None, description="Main recommendation")

    class Config:
        json_schema_extra = {
            "example": {
                "photo_url": "https://cdn.example.com/photo.jpg",
                "style_score": 78.5,
                "style_info": {
                    "photo_type": "portrait",
                    "lighting_quality": "natural",
                    "background_type": "outdoor",
                    "positive_aspects": ["Great lighting!", "Nice smile!"],
                    "improvement_suggestions": []
                },
                "feedback": ["Great lighting!", "Nice smile!"],
                "primary_recommendation": "Consider this for your primary photo!"
            }
        }


class NSFWResponse(BaseModel):
    """Response from NSFW detection."""
    photo_url: str = Field(..., description="Original photo URL")
    is_nsfw: bool = Field(..., description="Whether photo is NSFW")
    nsfw_score: float = Field(..., ge=0, le=1, description="NSFW probability score")
    categories: Dict[str, float] = Field(default_factory=dict, description="NSFW category scores")
    flagged_regions: List[Dict[str, Any]] = Field(default_factory=list, description="Flagged regions")


class DeepfakeResponse(BaseModel):
    """Response from deepfake detection."""
    photo_url: str = Field(..., description="Original photo URL")
    is_deepfake: bool = Field(..., description="Whether photo is likely AI-generated")
    deepfake_score: float = Field(..., ge=0, le=1, description="Deepfake probability score")
    indicators: List[str] = Field(default_factory=list, description="Deepfake indicators")
    confidence: float = Field(..., ge=0, le=1, description="Detection confidence")


class SelfieVerifyResponse(BaseModel):
    """Response from selfie verification."""
    user_id: str = Field(..., description="User ID")
    is_match: bool = Field(..., description="Whether selfie matches profile photos")
    match_score: float = Field(..., ge=0, le=1, description="Match confidence score")
    matched_photos: List[str] = Field(default_factory=list, description="Matched profile photo URLs")
    details: Dict[str, Any] = Field(default_factory=dict, description="Verification details")


class PhotoAnalyzeResponse(BaseModel):
    """Response from full photo analysis."""
    photo_url: Optional[str] = Field(None, description="Original photo URL")

    # Summary scores
    quality_score: float = Field(..., ge=0, le=100, description="Overall quality score")
    style_score: float = Field(..., ge=0, le=100, description="Style/presentation score")

    # Face information
    face_detected: bool = Field(..., description="Whether a face was detected")
    face_count: int = Field(..., description="Number of faces detected")
    face_position: str = Field(..., description="Primary face position")
    estimated_age: Optional[int] = Field(None, description="Estimated age of primary face")

    # Moderation
    is_appropriate: bool = Field(..., description="Whether photo is appropriate")
    moderation_flags: List[str] = Field(default_factory=list, description="Moderation flags")

    # Filter detection
    filter_detected: bool = Field(..., description="Whether heavy filters detected")
    filter_type: Optional[str] = Field(None, description="Type of filter if detected")

    # Feedback
    style_feedback: List[str] = Field(default_factory=list, description="Style feedback items")
    recommendations: List[str] = Field(default_factory=list, description="Overall recommendations")

    # Approval decision
    approved: bool = Field(..., description="Whether photo is approved for use")
    rejection_reasons: List[str] = Field(default_factory=list, description="Reasons for rejection")

    # Detailed results (optional)
    quality_details: Optional[Dict[str, Any]] = Field(None, description="Detailed quality metrics")
    face_details: List[FaceInfo] = Field(default_factory=list, description="Detailed face information")
    moderation_details: Optional[Dict[str, Any]] = Field(None, description="Detailed moderation info")
    style_details: Optional[StyleInfo] = Field(None, description="Detailed style information")
    filter_details: Optional[FilterInfo] = Field(None, description="Detailed filter information")

    # Metadata
    analysis_version: str = Field("2.0.0", description="Analysis engine version")
    processing_time_ms: Optional[int] = Field(None, description="Processing time in milliseconds")

    class Config:
        json_schema_extra = {
            "example": {
                "photo_url": "https://cdn.example.com/photo.jpg",
                "quality_score": 85.0,
                "style_score": 78.5,
                "face_detected": True,
                "face_count": 1,
                "face_position": "centered",
                "estimated_age": 28,
                "is_appropriate": True,
                "moderation_flags": [],
                "filter_detected": False,
                "filter_type": None,
                "style_feedback": [
                    "Great lighting! Your face is clearly visible.",
                    "Your smile looks natural and inviting!"
                ],
                "recommendations": [
                    "Great photo choice! This looks like a winner."
                ],
                "approved": True,
                "rejection_reasons": [],
                "analysis_version": "2.0.0",
                "processing_time_ms": 245
            }
        }


# ============================================================================
# Health Check Models
# ============================================================================

class HealthResponse(BaseModel):
    """Health check response."""
    status: str = Field(..., description="Service status")
    service: str = Field(..., description="Service name")
    version: str = Field(..., description="Service version")
    models_loaded: bool = Field(..., description="Whether ML models are loaded")
    uptime_seconds: Optional[float] = Field(None, description="Service uptime in seconds")

    class Config:
        json_schema_extra = {
            "example": {
                "status": "healthy",
                "service": "photo-analysis",
                "version": "2.0.0",
                "models_loaded": True,
                "uptime_seconds": 3600.5
            }
        }


# ============================================================================
# Batch Processing Models
# ============================================================================

class BatchPhotoAnalyzeRequest(BaseModel):
    """Request for batch photo analysis."""
    photo_urls: List[str] = Field(..., description="List of photo URLs to analyze")
    user_id: Optional[str] = Field(None, description="User ID for context")

    class Config:
        json_schema_extra = {
            "example": {
                "photo_urls": [
                    "https://cdn.example.com/photo1.jpg",
                    "https://cdn.example.com/photo2.jpg"
                ],
                "user_id": "user_123"
            }
        }


class BatchPhotoAnalyzeResponse(BaseModel):
    """Response from batch photo analysis."""
    results: List[PhotoAnalyzeResponse] = Field(..., description="Analysis results for each photo")
    total_photos: int = Field(..., description="Total photos analyzed")
    approved_count: int = Field(..., description="Number of approved photos")
    rejected_count: int = Field(..., description="Number of rejected photos")
    best_photo_index: Optional[int] = Field(None, description="Index of the best photo")
    processing_time_ms: Optional[int] = Field(None, description="Total processing time")


class PhotoRankingResponse(BaseModel):
    """Response with ranked photos for profile optimization."""
    ranked_photos: List[Dict[str, Any]] = Field(..., description="Photos ranked by quality and appeal")
    recommended_primary: Optional[str] = Field(None, description="Recommended primary photo URL")
    profile_score: float = Field(..., ge=0, le=100, description="Overall profile photo score")
    suggestions: List[str] = Field(default_factory=list, description="Profile improvement suggestions")
