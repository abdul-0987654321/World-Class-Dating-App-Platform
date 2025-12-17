"""Pydantic models for Photo Analysis Service."""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, HttpUrl
from enum import Enum


class PhotoQualityLevel(str, Enum):
    """Photo quality levels."""
    EXCELLENT = "excellent"
    GOOD = "good"
    FAIR = "fair"
    POOR = "poor"


class PhotoAnalyzeRequest(BaseModel):
    """Request for full photo analysis."""
    photo_url: str = Field(..., description="URL of the photo to analyze")
    user_id: Optional[str] = Field(None, description="User ID for context")


class FaceDetectRequest(BaseModel):
    """Request for face detection."""
    photo_url: str = Field(..., description="URL of the photo")


class PhotoQualityRequest(BaseModel):
    """Request for photo quality assessment."""
    photo_url: str = Field(..., description="URL of the photo")


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


class FaceInfo(BaseModel):
    """Information about a detected face."""
    bounding_box: Dict[str, float] = Field(..., description="Face bounding box coordinates")
    confidence: float = Field(..., ge=0, le=1, description="Detection confidence")
    landmarks: Optional[Dict[str, Any]] = Field(None, description="Facial landmarks")
    attributes: Optional[Dict[str, Any]] = Field(None, description="Face attributes (age, gender, etc.)")


class FaceDetectResponse(BaseModel):
    """Response from face detection."""
    photo_url: str = Field(..., description="Original photo URL")
    faces_detected: int = Field(..., description="Number of faces detected")
    faces: List[FaceInfo] = Field(default_factory=list, description="Detected faces")
    has_face: bool = Field(..., description="Whether at least one face was detected")


class PhotoQualityResponse(BaseModel):
    """Response from photo quality assessment."""
    photo_url: str = Field(..., description="Original photo URL")
    quality_score: float = Field(..., ge=0, le=100, description="Overall quality score")
    quality_level: PhotoQualityLevel = Field(..., description="Quality level")
    resolution: Dict[str, int] = Field(..., description="Photo resolution")
    issues: List[str] = Field(default_factory=list, description="Detected quality issues")
    details: Dict[str, Any] = Field(default_factory=dict, description="Detailed metrics")


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
    photo_url: str = Field(..., description="Original photo URL")
    analysis_summary: Dict[str, Any] = Field(..., description="Summary of all analyses")
    face_detection: FaceDetectResponse = Field(..., description="Face detection results")
    quality: PhotoQualityResponse = Field(..., description="Quality assessment results")
    nsfw: NSFWResponse = Field(..., description="NSFW detection results")
    deepfake: DeepfakeResponse = Field(..., description="Deepfake detection results")
    approved: bool = Field(..., description="Whether photo is approved for use")
    rejection_reasons: List[str] = Field(default_factory=list, description="Reasons for rejection")
