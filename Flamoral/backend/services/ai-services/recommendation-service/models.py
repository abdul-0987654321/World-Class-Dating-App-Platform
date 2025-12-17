"""Pydantic models for Recommendation Service."""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum


class GenderPreference(str, Enum):
    """Gender preference options."""
    MALE = "male"
    FEMALE = "female"
    NON_BINARY = "non_binary"
    ALL = "all"


class UserProfile(BaseModel):
    """User profile for recommendation."""
    user_id: str = Field(..., description="User ID")
    age: int = Field(..., ge=18, le=100, description="User age")
    gender: str = Field(..., description="User gender")
    location: Dict[str, float] = Field(..., description="Location coordinates")
    interests: List[str] = Field(default_factory=list, description="User interests")
    preferences: Dict[str, Any] = Field(default_factory=dict, description="User preferences")
    bio: Optional[str] = Field(None, description="User bio")


class RecommendProfilesRequest(BaseModel):
    """Request for profile recommendations."""
    user_id: str = Field(..., description="User ID requesting recommendations")
    user_profile: UserProfile = Field(..., description="User's profile")
    limit: int = Field(10, ge=1, le=100, description="Maximum number of recommendations")
    exclude_user_ids: List[str] = Field(default_factory=list, description="User IDs to exclude")


class CompatibilityRequest(BaseModel):
    """Request for compatibility score calculation."""
    user1_profile: UserProfile = Field(..., description="First user's profile")
    user2_profile: UserProfile = Field(..., description="Second user's profile")


class SimilarProfilesRequest(BaseModel):
    """Request for similar profiles."""
    user_profile: UserProfile = Field(..., description="Reference user's profile")
    limit: int = Field(10, ge=1, le=100, description="Maximum number of similar profiles")


class TopPicksRequest(BaseModel):
    """Request for top picks."""
    user_id: str = Field(..., description="User ID")
    user_profile: UserProfile = Field(..., description="User's profile")
    count: int = Field(5, ge=1, le=20, description="Number of top picks")


class RecommendedProfile(BaseModel):
    """A recommended profile."""
    user_id: str = Field(..., description="Recommended user ID")
    compatibility_score: float = Field(..., ge=0, le=1, description="Compatibility score")
    match_reasons: List[str] = Field(default_factory=list, description="Reasons for match")
    distance_km: Optional[float] = Field(None, description="Distance in kilometers")
    common_interests: List[str] = Field(default_factory=list, description="Common interests")


class RecommendProfilesResponse(BaseModel):
    """Response with profile recommendations."""
    user_id: str = Field(..., description="User ID")
    recommendations: List[RecommendedProfile] = Field(..., description="Recommended profiles")
    total_candidates: int = Field(..., description="Total candidates considered")
    algorithm_version: str = Field(default="1.0", description="Algorithm version")


class CompatibilityResponse(BaseModel):
    """Response with compatibility score."""
    compatibility_score: float = Field(..., ge=0, le=1, description="Compatibility score (0-1)")
    match_factors: Dict[str, float] = Field(..., description="Breakdown of match factors")
    common_interests: List[str] = Field(default_factory=list, description="Common interests")
    compatibility_level: str = Field(..., description="Compatibility level description")


class SimilarProfilesResponse(BaseModel):
    """Response with similar profiles."""
    reference_user_id: str = Field(..., description="Reference user ID")
    similar_profiles: List[RecommendedProfile] = Field(..., description="Similar profiles")
    similarity_metric: str = Field(default="cosine", description="Similarity metric used")


class TopPicksResponse(BaseModel):
    """Response with top picks."""
    user_id: str = Field(..., description="User ID")
    top_picks: List[RecommendedProfile] = Field(..., description="Top picks")
    selection_criteria: str = Field(..., description="Criteria for selection")
    refreshed_at: str = Field(..., description="When picks were last refreshed")
