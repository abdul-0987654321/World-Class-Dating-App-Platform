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


# Real-Time Coaching
class RealTimeCoachingRequest(BaseModel):
    """Request for real-time conversation coaching."""
    user_id: str = Field(..., description="User requesting coaching")
    conversation_history: List[Dict[str, Any]] = Field(..., description="Conversation messages")
    user_profile: Dict[str, Any] = Field(..., description="User's profile")
    match_profile: Dict[str, Any] = Field(..., description="Match's profile")
    last_coaching_tips: Optional[List[str]] = Field(None, description="IDs of recently shown tips")


class CoachingTip(BaseModel):
    """Individual coaching tip."""
    id: str = Field(..., description="Unique tip ID")
    type: str = Field(..., description="Tip type")
    title: str = Field(..., description="Tip title")
    message: str = Field(..., description="Tip message")
    example: Optional[str] = Field(None, description="Example message")
    action_text: Optional[str] = Field(None, description="Action button text")
    priority: int = Field(1, description="Priority (1 = highest)")
    dismissable: bool = Field(True, description="Can be dismissed")


class ConversationHealthStatus(BaseModel):
    """Health status of conversation."""
    status: str = Field(..., description="Health: thriving, healthy, needs_attention, at_risk, critical")
    stage: str = Field(..., description="Stage: opening, getting_to_know, building_rapport, ready_for_date")
    score: float = Field(..., ge=0, le=100, description="Health score 0-100")
    strengths: List[str] = Field(default_factory=list)
    areas_to_improve: List[str] = Field(default_factory=list)


class GhostingRisk(BaseModel):
    """Ghosting risk analysis."""
    risk_level: str = Field(..., description="Risk: low, medium, high")
    signals: List[str] = Field(default_factory=list, description="Warning signals")
    recommendation: str = Field(..., description="What to do")


class RealTimeCoachingResponse(BaseModel):
    """Response with real-time coaching."""
    tips: List[CoachingTip] = Field(..., description="Coaching tips")
    health: ConversationHealthStatus = Field(..., description="Conversation health")
    suggested_topics: List[Dict[str, str]] = Field(..., description="Topic suggestions")
    ghosting_risk: GhostingRisk = Field(..., description="Ghosting analysis")
    metrics: Dict[str, Any] = Field(..., description="Conversation metrics")
    ready_to_ask_out: bool = Field(..., description="Whether it's time to suggest a date")


# Next Message Advice
class NextMessageAdviceRequest(BaseModel):
    """Request for next message advice."""
    user_id: str = Field(..., description="User requesting advice")
    conversation_history: List[Dict[str, Any]] = Field(..., description="Conversation messages")
    user_profile: Dict[str, Any] = Field(..., description="User's profile")
    match_profile: Dict[str, Any] = Field(..., description="Match's profile")


class NextMessageAdviceResponse(BaseModel):
    """Response with next message advice."""
    advice: str = Field(..., description="Main advice")
    why: str = Field(..., description="Reasoning behind advice")
    do: List[str] = Field(default_factory=list, description="Things to do")
    dont: List[str] = Field(default_factory=list, description="Things to avoid")
    example_responses: List[str] = Field(default_factory=list, description="Example messages")
    tone_suggestion: str = Field("friendly", description="Suggested tone")


# Date Ask Coaching
class DateAskCoachingRequest(BaseModel):
    """Request for date-asking coaching."""
    user_id: str = Field(..., description="User requesting coaching")
    conversation_history: List[Dict[str, Any]] = Field(..., description="Conversation messages")
    user_profile: Dict[str, Any] = Field(..., description="User's profile")
    match_profile: Dict[str, Any] = Field(..., description="Match's profile")


class DateAskCoachingResponse(BaseModel):
    """Response with date-asking coaching."""
    ready: bool = Field(..., description="Whether it's the right time")
    readiness_score: float = Field(..., ge=0, le=1, description="Readiness score 0-1")
    timing_advice: Optional[str] = Field(None, description="Timing advice")
    why_not_yet: Optional[List[str]] = Field(None, description="Reasons not ready")
    what_to_do_first: Optional[List[str]] = Field(None, description="Prerequisites")
    estimated_messages_until_ready: Optional[int] = Field(None, description="Messages needed")
    approach_suggestions: Optional[List[str]] = Field(None, description="Ways to ask")
    venue_ideas: Optional[List[str]] = Field(None, description="Date venue ideas")
    example_messages: Optional[List[str]] = Field(None, description="Example ask messages")
    what_to_avoid: Optional[List[str]] = Field(None, description="Things to avoid")


# Health Check
class HealthResponse(BaseModel):
    """Health check response."""
    status: str = Field(..., description="Service status")
    service: str = Field(..., description="Service name")
    version: str = Field(..., description="Service version")
    ai_provider: str = Field(..., description="AI provider being used")
    ai_status: str = Field(..., description="AI provider status")


# Shared Experience Generator
class ExperienceType(str, Enum):
    """Types of shared experiences."""
    VIRTUAL_ACTIVITY = "virtual_activity"
    CONVERSATION_GAME = "conversation_game"
    CREATIVE_CHALLENGE = "creative_challenge"
    LEARNING_TOGETHER = "learning_together"
    WATCH_PARTY = "watch_party"


class ExperienceDifficulty(str, Enum):
    """Difficulty levels for shared experiences."""
    EASY = "easy"
    MEDIUM = "medium"
    CHALLENGING = "challenging"


class SharedExperienceRequest(BaseModel):
    """Request for shared experience suggestions."""
    user_id: str = Field(..., description="User requesting experiences")
    user_profile: Dict[str, Any] = Field(..., description="User's profile data")
    match_profile: Dict[str, Any] = Field(..., description="Match's profile data")
    experience_type: Optional[ExperienceType] = Field(None, description="Specific type of experience requested")
    preferences: Optional[Dict[str, Any]] = Field(None, description="Additional preferences")
    count: int = Field(3, ge=1, le=10, description="Number of experiences to generate")
    distance_km: Optional[float] = Field(None, description="Distance between users in km")
    time_of_day: Optional[str] = Field(None, description="Time of day: morning, afternoon, evening, night")


class SharedExperience(BaseModel):
    """Individual shared experience suggestion."""
    id: str = Field(..., description="Unique experience ID")
    title: str = Field(..., description="Experience title")
    description: str = Field(..., description="Detailed description of the activity")
    type: ExperienceType = Field(..., description="Type of experience")
    duration: str = Field(..., description="Estimated duration (e.g., '30 minutes', '1-2 hours')")
    materials_needed: List[str] = Field(default_factory=list, description="Items or apps needed")
    conversation_prompts: List[str] = Field(..., description="Conversation starters related to the activity")
    difficulty: ExperienceDifficulty = Field(..., description="Difficulty level")
    why_it_works: str = Field(..., description="Why this activity works for this match")
    tips_for_success: List[str] = Field(default_factory=list, description="Tips to make the experience better")
    follow_up_ideas: List[str] = Field(default_factory=list, description="Next activities to try after this one")


class SharedExperienceResponse(BaseModel):
    """Response with shared experience suggestions."""
    experiences: List[SharedExperience] = Field(..., description="Generated experiences")
    shared_interests_used: List[str] = Field(..., description="Shared interests identified and used")
    personalization_notes: str = Field(..., description="Notes on how experiences were personalized")


class ConversationGameQuestion(BaseModel):
    """Individual question for conversation games."""
    question: str = Field(..., description="The question text")
    category: str = Field(..., description="Question category: getting_to_know, deeper_connection, playful, hypothetical")
    follow_up: Optional[str] = Field(None, description="Optional follow-up question")
    why_personalized: str = Field(..., description="Why this question was chosen for this match")


class CustomConversationGameRequest(BaseModel):
    """Request for custom conversation game."""
    user_id: str = Field(..., description="User requesting the game")
    user_profile: Dict[str, Any] = Field(..., description="User's profile data")
    match_profile: Dict[str, Any] = Field(..., description="Match's profile data")
    game_type: Optional[str] = Field("36_questions", description="Game type: 36_questions, two_truths, would_you_rather, custom")
    question_count: int = Field(10, ge=5, le=36, description="Number of questions to generate")
    depth_level: Optional[str] = Field("medium", description="Depth: surface, medium, deep")


class CustomConversationGameResponse(BaseModel):
    """Response with custom conversation game."""
    game_title: str = Field(..., description="Title of the game")
    game_description: str = Field(..., description="How to play the game")
    questions: List[ConversationGameQuestion] = Field(..., description="Personalized questions")
    instructions: str = Field(..., description="Instructions for playing")
    estimated_duration: str = Field(..., description="How long the game takes")


class ExperienceFeedback(BaseModel):
    """Feedback for a completed experience."""
    experience_id: str = Field(..., description="ID of the completed experience")
    user_id: str = Field(..., description="User providing feedback")
    match_id: str = Field(..., description="Match involved in the experience")
    rating: int = Field(..., ge=1, le=5, description="Rating 1-5 stars")
    completed: bool = Field(..., description="Whether the experience was completed")
    enjoyment_level: Optional[str] = Field(None, description="Enjoyment: loved_it, liked_it, neutral, not_for_us")
    conversation_quality: Optional[str] = Field(None, description="Conversation quality: great, good, okay, poor")
    would_recommend: Optional[bool] = Field(None, description="Would recommend to others")
    notes: Optional[str] = Field(None, description="Additional feedback")


class ExperienceFeedbackResponse(BaseModel):
    """Response after submitting experience feedback."""
    success: bool = Field(..., description="Whether feedback was recorded")
    next_recommendations: List[str] = Field(default_factory=list, description="Recommended experiences based on feedback")


# ============================================================================
# RELATIONSHIP TRAJECTORY PREDICTION
# ============================================================================

class PredictedOutcome(str, Enum):
    """Predicted relationship trajectory outcomes."""
    STRONG_CONNECTION = "strong_connection"
    BUILDING_INTEREST = "building_interest"
    PLATEAU = "plateau"
    FADING = "fading"
    UNCERTAIN = "uncertain"


class InteractionMetrics(BaseModel):
    """Metrics about interaction patterns between users."""
    total_messages: int = Field(0, ge=0, description="Total messages exchanged")
    user_messages: int = Field(0, ge=0, description="Messages sent by user")
    match_messages: int = Field(0, ge=0, description="Messages sent by match")
    avg_response_time_user: Optional[float] = Field(None, description="User's avg response time in seconds")
    avg_response_time_match: Optional[float] = Field(None, description="Match's avg response time in seconds")
    avg_message_length_user: Optional[float] = Field(None, description="User's avg message length")
    avg_message_length_match: Optional[float] = Field(None, description="Match's avg message length")
    conversation_days: int = Field(0, ge=0, description="Days since first message")
    messages_per_day: Optional[float] = Field(None, description="Average messages per day")
    last_message_hours_ago: Optional[float] = Field(None, description="Hours since last message")
    question_count_user: int = Field(0, ge=0, description="Questions asked by user")
    question_count_match: int = Field(0, ge=0, description="Questions asked by match")
    emoji_count_user: int = Field(0, ge=0, description="Emojis used by user")
    emoji_count_match: int = Field(0, ge=0, description="Emojis used by match")


class TrajectoryPredictionRequest(BaseModel):
    """Request for relationship trajectory prediction."""
    user_id: str = Field(..., description="User requesting prediction")
    match_id: str = Field(..., description="Match ID for the relationship")
    conversation_history: List[Dict[str, Any]] = Field(..., description="Full conversation history")
    user_profile: Dict[str, Any] = Field(..., description="User's profile data")
    match_profile: Dict[str, Any] = Field(..., description="Match's profile data")
    interaction_metrics: Optional[InteractionMetrics] = Field(None, description="Pre-computed interaction metrics")


class TrajectoryFactor(BaseModel):
    """Individual factor contributing to trajectory prediction."""
    name: str = Field(..., description="Factor name")
    score: float = Field(..., ge=0, le=100, description="Factor score 0-100")
    weight: float = Field(..., ge=0, le=1, description="Weight in overall calculation")
    trend: str = Field(..., description="Trend: improving, stable, declining")
    description: str = Field(..., description="Human-readable description")
    impact: str = Field(..., description="Impact level: high, medium, low")


class TrajectoryRecommendation(BaseModel):
    """Recommendation for improving relationship trajectory."""
    id: str = Field(..., description="Recommendation ID")
    category: str = Field(..., description="Category: communication, engagement, timing, depth")
    priority: str = Field(..., description="Priority: high, medium, low")
    title: str = Field(..., description="Recommendation title")
    description: str = Field(..., description="Detailed recommendation")
    action_items: List[str] = Field(default_factory=list, description="Specific actions to take")
    expected_impact: str = Field(..., description="Expected impact description")


class TrajectoryInsight(BaseModel):
    """Insight about the relationship trajectory."""
    type: str = Field(..., description="Insight type: strength, concern, opportunity, milestone")
    title: str = Field(..., description="Insight title")
    description: str = Field(..., description="Detailed description")
    confidence: float = Field(..., ge=0, le=1, description="Confidence in this insight")


class TrajectoryPredictionResponse(BaseModel):
    """Response with relationship trajectory prediction."""
    trajectory_score: float = Field(..., ge=0, le=100, description="Overall trajectory score 0-100")
    predicted_outcome: PredictedOutcome = Field(..., description="Predicted relationship outcome")
    confidence: float = Field(..., ge=0, le=1, description="Confidence in prediction")
    factors: List[TrajectoryFactor] = Field(..., description="Factors contributing to prediction")
    recommendations: List[TrajectoryRecommendation] = Field(..., description="Recommendations for improvement")
    insights: List[TrajectoryInsight] = Field(default_factory=list, description="Key insights about trajectory")
    momentum: str = Field(..., description="Current momentum: accelerating, steady, slowing, stalled")
    milestone_progress: Dict[str, Any] = Field(default_factory=dict, description="Progress toward relationship milestones")
    next_milestone: Optional[str] = Field(None, description="Suggested next milestone to achieve")
    risk_factors: List[str] = Field(default_factory=list, description="Potential risk factors identified")
    positive_signals: List[str] = Field(default_factory=list, description="Positive signals detected")


# ============================================================================
# COMMUNICATION STYLE ANALYSIS
# ============================================================================

class HumorStyle(str, Enum):
    """Types of humor styles detected in communication."""
    WITTY = "witty"           # Clever wordplay, intellectual humor
    PLAYFUL = "playful"       # Light-hearted, teasing, fun
    SARCASTIC = "sarcastic"   # Dry wit, ironic comments
    WHOLESOME = "wholesome"   # Warm, kind, genuine humor
    MINIMAL = "minimal"       # Little to no humor used


class ResponsePattern(str, Enum):
    """Response timing and engagement patterns."""
    QUICK_RESPONDER = "quick_responder"       # Responds within minutes
    STEADY_RESPONDER = "steady_responder"     # Consistent response times
    DELAYED_RESPONDER = "delayed_responder"   # Takes time to respond
    BURST_RESPONDER = "burst_responder"       # Long gaps then many messages


class TopicBehavior(str, Enum):
    """Topic initiation vs following behavior."""
    INITIATOR = "initiator"       # Frequently starts new topics
    FOLLOWER = "follower"         # Prefers to follow topics
    BALANCED = "balanced"         # Mix of both behaviors


class CommunicationStyle(BaseModel):
    """Comprehensive communication style profile."""
    # Core dimensions (0-100 scale)
    formality: float = Field(..., ge=0, le=100, description="Casual (0) to formal (100) language usage")
    expressiveness: float = Field(..., ge=0, le=100, description="Emoji, punctuation, and emotional expression usage")
    verbosity: float = Field(..., ge=0, le=100, description="Message length preference - brief (0) to verbose (100)")

    # Behavioral patterns
    humor_style: HumorStyle = Field(..., description="Primary humor style detected")
    humor_frequency: float = Field(..., ge=0, le=100, description="How often humor is used (0=never, 100=constantly)")

    # Engagement patterns
    question_frequency: float = Field(..., ge=0, le=100, description="How often questions are asked (curiosity indicator)")
    response_pattern: ResponsePattern = Field(..., description="Typical response timing pattern")
    topic_behavior: TopicBehavior = Field(..., description="Topic initiation vs following tendency")

    # Vocabulary and language
    vocabulary_richness: float = Field(..., ge=0, le=100, description="Vocabulary diversity and complexity")
    slang_usage: float = Field(..., ge=0, le=100, description="Use of slang, abbreviations, internet speak")

    # Emotional expression
    positivity: float = Field(..., ge=0, le=100, description="Positive vs negative sentiment tendency")
    emotional_depth: float = Field(..., ge=0, le=100, description="Surface level (0) to emotionally deep (100) conversations")

    # Additional insights
    avg_message_length: float = Field(..., description="Average characters per message")
    messages_analyzed: int = Field(..., description="Number of messages used for analysis")
    confidence_score: float = Field(..., ge=0, le=1, description="Confidence in the analysis (higher = more data)")


class StyleAnalysisRequest(BaseModel):
    """Request for communication style analysis."""
    user_id: str = Field(..., description="User ID for tracking")
    messages: List[Dict[str, Any]] = Field(
        ...,
        description="List of messages to analyze. Each message should have 'text' and optionally 'timestamp'"
    )
    include_evolution: bool = Field(False, description="Whether to include style evolution analysis")


class StyleMatchArea(BaseModel):
    """Area where communication styles match well."""
    dimension: str = Field(..., description="The style dimension that matches")
    user_value: float = Field(..., description="User's value for this dimension")
    match_value: float = Field(..., description="Match's value for this dimension")
    compatibility: float = Field(..., ge=0, le=100, description="Compatibility percentage")
    insight: str = Field(..., description="Explanation of why this is a good match")


class PotentialFriction(BaseModel):
    """Potential communication friction point."""
    dimension: str = Field(..., description="The style dimension causing friction")
    user_value: float = Field(..., description="User's value")
    match_value: float = Field(..., description="Match's value")
    difference: float = Field(..., description="How different the values are")
    risk_level: str = Field(..., description="low, medium, or high")
    explanation: str = Field(..., description="Why this might cause friction")
    mitigation: str = Field(..., description="How to work around this difference")


class AdaptationTip(BaseModel):
    """Tip for adapting communication style."""
    category: str = Field(..., description="Category: timing, tone, content, expression")
    tip: str = Field(..., description="The specific adaptation tip")
    example_before: Optional[str] = Field(None, description="Example of user's typical style")
    example_after: Optional[str] = Field(None, description="Example adapted to match's style")
    priority: str = Field(..., description="high, medium, or low priority")


class StyleCompatibility(BaseModel):
    """Communication style compatibility analysis between two users."""
    overall_score: float = Field(..., ge=0, le=100, description="Overall compatibility score 0-100")
    compatibility_level: str = Field(..., description="excellent, good, moderate, challenging")

    style_match_areas: List[StyleMatchArea] = Field(..., description="Areas of strong style compatibility")
    potential_friction: List[PotentialFriction] = Field(..., description="Potential friction points")
    adaptation_tips: List[AdaptationTip] = Field(..., description="Tips for better communication")

    # Summary insights
    summary: str = Field(..., description="Brief summary of compatibility")
    best_communication_approach: str = Field(..., description="Recommended approach for communicating")
    topics_to_leverage: List[str] = Field(..., description="Topics that work well with both styles")

    # Detailed dimension comparison
    dimension_comparison: Dict[str, Dict[str, float]] = Field(
        ...,
        description="Side-by-side comparison of each style dimension"
    )


class StyleEvolutionPoint(BaseModel):
    """Point in time showing style evolution."""
    period: str = Field(..., description="Time period (e.g., 'first 10 messages', 'messages 11-20')")
    formality: float = Field(..., ge=0, le=100)
    expressiveness: float = Field(..., ge=0, le=100)
    verbosity: float = Field(..., ge=0, le=100)
    positivity: float = Field(..., ge=0, le=100)


class StyleEvolution(BaseModel):
    """Analysis of how communication style has evolved over time."""
    evolution_points: List[StyleEvolutionPoint] = Field(..., description="Style measurements over time")
    trends: Dict[str, str] = Field(..., description="Trend direction for each dimension: increasing, decreasing, stable")
    insights: List[str] = Field(..., description="Key insights about style evolution")
    adaptation_detected: bool = Field(..., description="Whether user appears to be adapting to match")


class CommunicationStyleResponse(BaseModel):
    """Full response for communication style analysis."""
    user_style: CommunicationStyle = Field(..., description="User's communication style profile")
    style_summary: str = Field(..., description="Human-readable summary of communication style")
    strengths: List[str] = Field(..., description="Communication strengths")
    growth_areas: List[str] = Field(..., description="Areas for potential improvement")

    # Optional fields
    style_evolution: Optional[StyleEvolution] = Field(None, description="Style evolution if requested")

    # Compatibility (if match style provided)
    compatibility: Optional[StyleCompatibility] = Field(None, description="Compatibility with match if provided")


class StyleCompatibilityRequest(BaseModel):
    """Request for compatibility analysis between two styles."""
    user_id: str = Field(..., description="User requesting analysis")
    user_messages: List[Dict[str, Any]] = Field(..., description="User's messages for style extraction")
    match_messages: List[Dict[str, Any]] = Field(..., description="Match's messages for style extraction")
    generate_tips: bool = Field(True, description="Whether to generate adaptation tips")


class CommunicationFrictionRequest(BaseModel):
    """Request for predicting communication friction."""
    user_id: str = Field(..., description="User ID")
    user_style: CommunicationStyle = Field(..., description="User's communication style")
    match_style: CommunicationStyle = Field(..., description="Match's communication style")


class CommunicationFrictionResponse(BaseModel):
    """Response with predicted communication friction points."""
    friction_points: List[PotentialFriction] = Field(..., description="List of potential friction points")
    overall_risk: str = Field(..., description="Overall friction risk: low, medium, high")
    prevention_strategies: List[str] = Field(..., description="Strategies to prevent misunderstandings")
    conversation_guidelines: List[str] = Field(..., description="Guidelines for smooth communication")


# ============================================================================
# AI CONFLICT MEDIATOR
# ============================================================================

class ConflictType(str, Enum):
    """Types of conflicts that can occur in conversations."""
    MISCOMMUNICATION = "miscommunication"          # Meaning lost in text
    EXPECTATION_MISMATCH = "expectation_mismatch"  # Different expectations about relationship/pace
    BOUNDARY_ISSUE = "boundary_issue"              # Personal boundary crossed
    TONE_MISREAD = "tone_misread"                  # Sarcasm/humor misinterpreted
    UNINTENTIONAL_OFFENSE = "unintentional_offense"  # Said something hurtful without realizing
    VALUE_DIFFERENCE = "value_difference"          # Fundamental value clash
    TIMING_CONFLICT = "timing_conflict"            # Bad timing for certain topics


class ConflictSeverity(str, Enum):
    """Severity levels of detected conflicts."""
    MINOR = "minor"          # Small misunderstanding, easily resolved
    MODERATE = "moderate"    # Requires attention but recoverable
    SIGNIFICANT = "significant"  # Serious tension, needs careful handling
    SEVERE = "severe"        # Major conflict, may need to step back
    CRITICAL = "critical"    # Safety concern - escalate to safety team


class SafetyEscalationReason(str, Enum):
    """Reasons for escalating to safety team."""
    ABUSE_DETECTED = "abuse_detected"
    HARASSMENT = "harassment"
    THREATS = "threats"
    MANIPULATION = "manipulation"
    COERCION = "coercion"
    STALKING_BEHAVIOR = "stalking_behavior"


class ConflictAnalysisRequest(BaseModel):
    """Request for conflict analysis."""
    user_id: str = Field(..., description="User requesting mediation")
    match_id: str = Field(..., description="Match involved in the conflict")
    conversation_history: List[Dict[str, Any]] = Field(
        ...,
        description="Full conversation history with timestamps and sender info"
    )
    conflict_start_index: Optional[int] = Field(
        None,
        description="Index where the user believes conflict started (0-indexed)"
    )
    user_perspective: Optional[str] = Field(
        None,
        description="User's explanation of what they think went wrong"
    )
    match_perspective: Optional[str] = Field(
        None,
        description="Match's explanation if available (from their mediation request)"
    )


class PerspectiveAnalysis(BaseModel):
    """Analysis of one party's perspective in the conflict."""
    likely_intent: str = Field(..., description="What they likely meant to communicate")
    perceived_as: str = Field(..., description="How it was likely received")
    emotional_state: str = Field(..., description="Likely emotional state during the exchange")
    valid_concerns: List[str] = Field(default_factory=list, description="Valid points from this perspective")
    potential_blind_spots: List[str] = Field(default_factory=list, description="Things they may not realize")


class MisunderstandingPoint(BaseModel):
    """A specific point where misunderstanding occurred."""
    message_index: int = Field(..., description="Index of the problematic message")
    original_text: str = Field(..., description="The actual message text")
    likely_intended_meaning: str = Field(..., description="What the sender probably meant")
    likely_perceived_meaning: str = Field(..., description="How it was probably received")
    why_misunderstood: str = Field(..., description="Explanation of why miscommunication occurred")
    contributing_factors: List[str] = Field(default_factory=list, description="Factors that contributed")


class ConflictAnalysis(BaseModel):
    """Comprehensive analysis of the conflict."""
    conflict_type: ConflictType = Field(..., description="Primary type of conflict identified")
    secondary_types: List[ConflictType] = Field(default_factory=list, description="Additional conflict types")
    severity: ConflictSeverity = Field(..., description="Severity level of the conflict")

    trigger_message_index: int = Field(..., description="Index of message that triggered the conflict")
    trigger_explanation: str = Field(..., description="Why this message triggered tension")

    misunderstanding_points: List[MisunderstandingPoint] = Field(
        default_factory=list,
        description="Specific points where miscommunication occurred"
    )

    user_perspective: PerspectiveAnalysis = Field(..., description="Analysis of user's perspective")
    match_perspective: PerspectiveAnalysis = Field(..., description="Analysis of match's perspective")

    common_ground: List[str] = Field(default_factory=list, description="Points both parties likely agree on")
    core_issue: str = Field(..., description="The fundamental issue at the heart of the conflict")

    recoverable: bool = Field(..., description="Whether this conflict seems recoverable")
    recovery_likelihood: float = Field(..., ge=0, le=1, description="Probability of successful resolution")

    # Safety flags
    safety_concern_detected: bool = Field(False, description="Whether a safety concern was detected")
    safety_escalation_reason: Optional[SafetyEscalationReason] = Field(
        None,
        description="Reason for safety escalation if detected"
    )


class MediationSuggestion(BaseModel):
    """A mediation suggestion for resolving the conflict."""
    id: str = Field(..., description="Unique suggestion ID")
    for_user: bool = Field(..., description="True if this suggestion is for the requesting user")

    suggestion_type: str = Field(
        ...,
        description="Type: apology, clarification, acknowledgment, boundary_setting, conversation_reset"
    )

    message_template: str = Field(..., description="Template message the user can send")
    personalized_message: Optional[str] = Field(
        None,
        description="Personalized version based on context"
    )

    explanation: str = Field(..., description="Why this approach helps")
    tone_guidance: str = Field(..., description="How to deliver this message")

    timing_advice: Optional[str] = Field(None, description="When to send this message")

    expected_response: Optional[str] = Field(None, description="Likely response to expect")
    if_response_negative: Optional[str] = Field(None, description="What to do if they react negatively")

    priority: int = Field(1, ge=1, le=5, description="Priority ranking (1=highest)")


class DeEscalationTemplate(BaseModel):
    """Template for de-escalating a tense situation."""
    template_type: str = Field(..., description="Type: cooling_off, acknowledgment, bridge_building")
    message: str = Field(..., description="The de-escalation message")
    explanation: str = Field(..., description="Why this helps")
    when_to_use: str = Field(..., description="Best timing for this message")


class ApologyTemplate(BaseModel):
    """Template for crafting an appropriate apology."""
    apology_message: str = Field(..., description="The apology message")
    what_to_acknowledge: List[str] = Field(..., description="Specific things to acknowledge")
    what_not_to_say: List[str] = Field(..., description="Things to avoid saying")
    follow_up_action: Optional[str] = Field(None, description="Suggested follow-up action")
    explanation: str = Field(..., description="Why this apology structure works")


class ConversationResetSuggestion(BaseModel):
    """Suggestion for resetting/restarting the conversation."""
    reset_type: str = Field(
        ...,
        description="Type: fresh_start, topic_change, break_then_return, acknowledgment_reset"
    )
    suggested_message: str = Field(..., description="Message to send for the reset")
    waiting_period: Optional[str] = Field(None, description="How long to wait before sending")
    new_topic_suggestions: List[str] = Field(default_factory=list, description="Topics to pivot to")
    explanation: str = Field(..., description="Why this reset approach works")


class GracefulExitSuggestion(BaseModel):
    """Suggestion for gracefully ending the conversation when needed."""
    exit_message: str = Field(..., description="Graceful exit message")
    reasoning: str = Field(..., description="Why exiting might be the right choice")
    preserves_dignity: bool = Field(True, description="Whether this preserves both parties' dignity")
    leaves_door_open: bool = Field(False, description="Whether this leaves room for future reconnection")


class ConflictMediationRequest(BaseModel):
    """Request for full conflict mediation."""
    user_id: str = Field(..., description="User requesting mediation")
    match_id: str = Field(..., description="Match involved in the conflict")
    conversation_history: List[Dict[str, Any]] = Field(
        ...,
        description="Full conversation history"
    )
    user_perspective: Optional[str] = Field(
        None,
        description="User's explanation of the situation"
    )
    desired_outcome: Optional[str] = Field(
        None,
        description="What the user hopes to achieve: reconcile, understand, end_gracefully"
    )


class ConflictMediationResponse(BaseModel):
    """Full response for conflict mediation."""
    analysis: ConflictAnalysis = Field(..., description="Analysis of the conflict")

    mediation_suggestions: List[MediationSuggestion] = Field(
        ...,
        description="Prioritized mediation suggestions"
    )

    de_escalation_templates: List[DeEscalationTemplate] = Field(
        default_factory=list,
        description="De-escalation message templates"
    )

    apology_template: Optional[ApologyTemplate] = Field(
        None,
        description="Apology template if appropriate"
    )

    conversation_reset: Optional[ConversationResetSuggestion] = Field(
        None,
        description="Conversation reset suggestion"
    )

    graceful_exit: Optional[GracefulExitSuggestion] = Field(
        None,
        description="Graceful exit option if needed"
    )

    perspective_explanation: str = Field(
        ...,
        description="Explanation of the other person's likely perspective"
    )

    immediate_action: str = Field(..., description="What to do right now")
    things_to_avoid: List[str] = Field(..., description="What not to do")

    follow_up_recommendations: List[str] = Field(
        default_factory=list,
        description="Recommendations for after initial mediation"
    )

    # Safety information
    safety_alert: bool = Field(False, description="Whether this situation has safety concerns")
    safety_resources: Optional[List[str]] = Field(
        None,
        description="Safety resources if safety_alert is True"
    )


class ConflictDetectionRequest(BaseModel):
    """Request to detect if there's conflict in a conversation."""
    user_id: str = Field(..., description="User ID for tracking")
    conversation_history: List[Dict[str, Any]] = Field(
        ...,
        description="Conversation history to analyze"
    )
    sensitivity: str = Field(
        "normal",
        description="Detection sensitivity: low, normal, high"
    )


class ConflictDetectionResponse(BaseModel):
    """Response indicating whether conflict is detected."""
    conflict_detected: bool = Field(..., description="Whether tension/conflict was detected")
    confidence: float = Field(..., ge=0, le=1, description="Confidence in detection")

    conflict_type: Optional[ConflictType] = Field(None, description="Type of conflict if detected")
    severity: Optional[ConflictSeverity] = Field(None, description="Severity if detected")

    trigger_message_index: Optional[int] = Field(
        None,
        description="Index where conflict appears to start"
    )

    early_warning_signs: List[str] = Field(
        default_factory=list,
        description="Early signs of tension before full conflict"
    )

    sentiment_shift_detected: bool = Field(
        False,
        description="Whether a negative sentiment shift was detected"
    )

    recommendation: str = Field(..., description="Recommended action")

    # Safety
    safety_concern: bool = Field(False, description="Whether safety team should be notified")
    safety_reason: Optional[str] = Field(None, description="Reason for safety concern")
