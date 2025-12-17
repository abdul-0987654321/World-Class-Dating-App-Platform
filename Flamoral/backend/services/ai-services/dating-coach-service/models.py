"""Pydantic models for Dating Coach Service."""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum


class SubscriptionTier(str, Enum):
    """Subscription tiers."""
    FREE = "free"
    BASIC = "basic"
    PREMIUM = "premium"
    PREMIUM_PLUS = "premium_plus"


class CoachingType(str, Enum):
    """Types of coaching suggestions."""
    ICEBREAKER = "icebreaker"
    RESPONSE = "response"
    PROFILE_TIP = "profile_tip"
    DATE_IDEA = "date_idea"
    CONVERSATION_ANALYSIS = "conversation_analysis"


# Icebreaker Generation
class IcebreakerRequest(BaseModel):
    """Request for icebreaker suggestions."""
    user_id: str = Field(..., description="User requesting icebreakers")
    match_profile: Dict[str, Any] = Field(..., description="Match's profile data")
    num_suggestions: int = Field(3, ge=1, le=5, description="Number of icebreakers to generate")
    tone: Optional[str] = Field("friendly", description="Tone: friendly, playful, witty, sincere")


class IcebreakerResponse(BaseModel):
    """Response with icebreaker suggestions."""
    icebreakers: List[str] = Field(..., description="Generated icebreaker messages")
    context_used: List[str] = Field(..., description="Profile elements used for context")
    confidence_scores: List[float] = Field(..., description="Confidence score for each icebreaker")


# Response Suggestions
class ResponseSuggestionRequest(BaseModel):
    """Request for response suggestions."""
    user_id: str = Field(..., description="User requesting suggestions")
    conversation_history: List[Dict[str, Any]] = Field(..., description="Recent conversation messages")
    match_profile: Dict[str, Any] = Field(..., description="Match's profile data")
    user_profile: Optional[Dict[str, Any]] = Field(None, description="User's own profile")
    num_suggestions: int = Field(3, ge=1, le=5, description="Number of suggestions")
    style: Optional[str] = Field("balanced", description="Style: balanced, playful, deep, flirty")


class ResponseSuggestionResponse(BaseModel):
    """Response with reply suggestions."""
    suggestions: List[str] = Field(..., description="Generated response suggestions")
    conversation_insights: Dict[str, Any] = Field(..., description="Insights about the conversation")
    suggested_topics: List[str] = Field(..., description="Topics to explore")
    tone_recommendations: str = Field(..., description="Recommended tone for replies")


# Profile Optimization
class ProfileTipsRequest(BaseModel):
    """Request for profile optimization tips."""
    user_id: str = Field(..., description="User requesting tips")
    profile_data: Dict[str, Any] = Field(..., description="User's profile data")
    photos: Optional[List[Dict[str, Any]]] = Field(None, description="User's photos metadata")
    prompts: Optional[List[Dict[str, Any]]] = Field(None, description="User's prompts")


class ProfileTip(BaseModel):
    """Individual profile tip."""
    category: str = Field(..., description="Category: photos, bio, prompts, interests")
    priority: str = Field(..., description="Priority: high, medium, low")
    tip: str = Field(..., description="The actual tip")
    current_value: Optional[str] = Field(None, description="Current value if applicable")
    suggested_improvement: Optional[str] = Field(None, description="Suggested improvement")
    impact_score: float = Field(..., ge=0, le=1, description="Expected impact on profile quality")


class ProfileTipsResponse(BaseModel):
    """Response with profile optimization tips."""
    overall_score: float = Field(..., ge=0, le=100, description="Overall profile score")
    tips: List[ProfileTip] = Field(..., description="List of improvement tips")
    strengths: List[str] = Field(..., description="Profile strengths")
    quick_wins: List[str] = Field(..., description="Easy improvements with high impact")
    profile_completeness: float = Field(..., ge=0, le=1, description="Profile completeness")


# Date Ideas
class DateIdeasRequest(BaseModel):
    """Request for date idea suggestions."""
    user_id: str = Field(..., description="User requesting date ideas")
    match_profile: Dict[str, Any] = Field(..., description="Match's profile data")
    user_profile: Dict[str, Any] = Field(..., description="User's profile data")
    location: Optional[str] = Field(None, description="City or location")
    budget: Optional[str] = Field("moderate", description="Budget: low, moderate, high, any")
    date_type: Optional[str] = Field("first", description="Date type: first, second, casual, special")
    num_suggestions: int = Field(3, ge=1, le=5, description="Number of date ideas")


class DateIdea(BaseModel):
    """Individual date idea."""
    title: str = Field(..., description="Date idea title")
    description: str = Field(..., description="Detailed description")
    reasoning: str = Field(..., description="Why this works for both people")
    estimated_cost: str = Field(..., description="Cost estimate")
    duration: str = Field(..., description="Estimated duration")
    conversation_starters: List[str] = Field(..., description="Conversation topics for the date")
    backup_plan: Optional[str] = Field(None, description="Backup plan if main doesn't work")


class DateIdeasResponse(BaseModel):
    """Response with date idea suggestions."""
    date_ideas: List[DateIdea] = Field(..., description="Generated date ideas")
    shared_interests: List[str] = Field(..., description="Shared interests identified")
    compatibility_notes: str = Field(..., description="Notes on compatibility")


# Conversation Analysis
class ConversationAnalysisRequest(BaseModel):
    """Request for conversation flow analysis."""
    user_id: str = Field(..., description="User requesting analysis")
    conversation_history: List[Dict[str, Any]] = Field(..., description="Full conversation history")
    match_profile: Dict[str, Any] = Field(..., description="Match's profile data")


class ConversationMetrics(BaseModel):
    """Metrics about the conversation."""
    engagement_level: str = Field(..., description="Engagement: high, medium, low")
    response_rate: float = Field(..., ge=0, le=1, description="Response rate")
    avg_response_time: Optional[str] = Field(None, description="Average response time")
    sentiment_trend: str = Field(..., description="Sentiment trend: positive, neutral, negative, mixed")
    conversation_balance: float = Field(..., ge=0, le=1, description="Balance of participation (0.5 is perfect)")
    emoji_usage: Dict[str, int] = Field(default_factory=dict, description="Emoji usage statistics")


class ConversationAnalysisResponse(BaseModel):
    """Response with conversation analysis."""
    metrics: ConversationMetrics = Field(..., description="Conversation metrics")
    insights: List[str] = Field(..., description="Key insights about the conversation")
    recommendations: List[str] = Field(..., description="Actionable recommendations")
    red_flags: List[str] = Field(default_factory=list, description="Potential red flags")
    green_flags: List[str] = Field(default_factory=list, description="Positive indicators")
    next_steps: List[str] = Field(..., description="Suggested next steps")
    interest_level: str = Field(..., description="Estimated match interest: high, medium, low, uncertain")


# Rate Limiting
class UsageRequest(BaseModel):
    """Request to check/update usage limits."""
    user_id: str = Field(..., description="User ID")
    coaching_type: CoachingType = Field(..., description="Type of coaching requested")
    subscription_tier: SubscriptionTier = Field(..., description="User's subscription tier")


class UsageResponse(BaseModel):
    """Response with usage information."""
    allowed: bool = Field(..., description="Whether request is allowed")
    remaining_today: int = Field(..., description="Remaining requests for today")
    limit_per_day: int = Field(..., description="Daily limit for user's tier")
    reset_time: str = Field(..., description="When the limit resets")
    upgrade_message: Optional[str] = Field(None, description="Message suggesting upgrade")


# Health Check
class HealthResponse(BaseModel):
    """Health check response."""
    status: str = Field(..., description="Service status")
    service: str = Field(..., description="Service name")
    version: str = Field(..., description="Service version")
    ai_provider: str = Field(..., description="AI provider being used")
    ai_status: str = Field(..., description="AI provider status")
