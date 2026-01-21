"""API routes for Dating Coach Service."""

import logging
from fastapi import APIRouter, Request, HTTPException, status, Depends
from typing import Dict, Any
from models import (
    IcebreakerRequest,
    IcebreakerResponse,
    ResponseSuggestionRequest,
    ResponseSuggestionResponse,
    ProfileTipsRequest,
    ProfileTipsResponse,
    DateIdeasRequest,
    DateIdeasResponse,
    ConversationAnalysisRequest,
    ConversationAnalysisResponse,
    UsageRequest,
    UsageResponse,
    RealTimeCoachingRequest,
    RealTimeCoachingResponse,
    NextMessageAdviceRequest,
    NextMessageAdviceResponse,
    DateAskCoachingRequest,
    DateAskCoachingResponse,
    SharedExperienceRequest,
    SharedExperienceResponse,
    CustomConversationGameRequest,
    CustomConversationGameResponse,
    ExperienceFeedback,
    ExperienceFeedbackResponse,
    TrajectoryPredictionRequest,
    TrajectoryPredictionResponse,
    # Communication Style Analysis
    StyleAnalysisRequest,
    CommunicationStyleResponse,
    StyleCompatibilityRequest,
    StyleCompatibility,
    CommunicationFrictionRequest,
    CommunicationFrictionResponse,
    # Conflict Mediator
    ConflictDetectionRequest,
    ConflictDetectionResponse,
    ConflictMediationRequest,
    ConflictMediationResponse,
)
from app.api.dependencies import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/coach/icebreakers", response_model=IcebreakerResponse)
async def generate_icebreakers(
    request: IcebreakerRequest,
    app_request: Request,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Generate icebreaker messages for a match.

    Premium Feature: Rate limited based on subscription tier.
    """
    try:
        # Check rate limit
        rate_limiter = app_request.app.state.rate_limiter
        usage_check = await rate_limiter.check_and_increment(
            user_id=current_user["user_id"],
            coaching_type="icebreaker",
            subscription_tier=current_user["subscription_tier"],
        )

        if not usage_check["allowed"]:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "message": "Rate limit exceeded",
                    "remaining": usage_check["remaining_today"],
                    "reset_time": usage_check["reset_time"],
                    "upgrade_message": usage_check["upgrade_message"],
                },
            )

        # Generate icebreakers
        icebreaker_service = app_request.app.state.icebreaker_service
        result = await icebreaker_service.generate_icebreakers(
            match_profile=request.match_profile,
            num_suggestions=request.num_suggestions,
            tone=request.tone,
        )

        return IcebreakerResponse(**result)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Icebreaker generation failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate icebreakers",
        )


@router.post("/coach/suggest-response", response_model=ResponseSuggestionResponse)
async def suggest_response(
    request: ResponseSuggestionRequest,
    app_request: Request,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Suggest responses based on conversation context.

    Premium Feature: Rate limited based on subscription tier.
    """
    try:
        # Check rate limit
        rate_limiter = app_request.app.state.rate_limiter
        usage_check = await rate_limiter.check_and_increment(
            user_id=current_user["user_id"],
            coaching_type="response",
            subscription_tier=current_user["subscription_tier"],
        )

        if not usage_check["allowed"]:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "message": "Rate limit exceeded",
                    "remaining": usage_check["remaining_today"],
                    "reset_time": usage_check["reset_time"],
                    "upgrade_message": usage_check["upgrade_message"],
                },
            )

        # Generate response suggestions
        response_suggester = app_request.app.state.response_suggester
        result = await response_suggester.generate_suggestions(
            conversation_history=request.conversation_history,
            match_profile=request.match_profile,
            user_profile=request.user_profile,
            num_suggestions=request.num_suggestions,
            style=request.style,
        )

        return ResponseSuggestionResponse(**result)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Response suggestion failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate response suggestions",
        )


@router.post("/coach/profile-tips", response_model=ProfileTipsResponse)
async def get_profile_tips(
    request: ProfileTipsRequest,
    app_request: Request,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Analyze profile and provide optimization tips.

    Premium Feature: Rate limited based on subscription tier.
    """
    try:
        # Check rate limit
        rate_limiter = app_request.app.state.rate_limiter
        usage_check = await rate_limiter.check_and_increment(
            user_id=current_user["user_id"],
            coaching_type="profile_tips",
            subscription_tier=current_user["subscription_tier"],
        )

        if not usage_check["allowed"]:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "message": "Rate limit exceeded",
                    "remaining": usage_check["remaining_today"],
                    "reset_time": usage_check["reset_time"],
                    "upgrade_message": usage_check["upgrade_message"],
                },
            )

        # Analyze profile
        profile_analyzer = app_request.app.state.profile_analyzer
        result = await profile_analyzer.analyze_profile(
            profile_data=request.profile_data,
            photos=request.photos,
            prompts=request.prompts,
        )

        return ProfileTipsResponse(**result)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Profile analysis failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to analyze profile",
        )


@router.post("/coach/date-ideas", response_model=DateIdeasResponse)
async def generate_date_ideas(
    request: DateIdeasRequest,
    app_request: Request,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Generate personalized date ideas based on both profiles.

    Premium Feature: Rate limited based on subscription tier.
    """
    try:
        # Check rate limit
        rate_limiter = app_request.app.state.rate_limiter
        usage_check = await rate_limiter.check_and_increment(
            user_id=current_user["user_id"],
            coaching_type="date_ideas",
            subscription_tier=current_user["subscription_tier"],
        )

        if not usage_check["allowed"]:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "message": "Rate limit exceeded",
                    "remaining": usage_check["remaining_today"],
                    "reset_time": usage_check["reset_time"],
                    "upgrade_message": usage_check["upgrade_message"],
                },
            )

        # Generate date ideas
        date_idea_generator = app_request.app.state.date_idea_generator
        result = await date_idea_generator.generate_date_ideas(
            match_profile=request.match_profile,
            user_profile=request.user_profile,
            location=request.location,
            budget=request.budget,
            date_type=request.date_type,
            num_suggestions=request.num_suggestions,
        )

        return DateIdeasResponse(**result)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Date idea generation failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate date ideas",
        )


@router.post("/coach/conversation-analysis", response_model=ConversationAnalysisResponse)
async def analyze_conversation(
    request: ConversationAnalysisRequest,
    app_request: Request,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Analyze conversation flow and provide insights.

    Premium+ Feature: Rate limited based on subscription tier.
    """
    try:
        # Check rate limit
        rate_limiter = app_request.app.state.rate_limiter
        usage_check = await rate_limiter.check_and_increment(
            user_id=current_user["user_id"],
            coaching_type="conversation_analysis",
            subscription_tier=current_user["subscription_tier"],
        )

        if not usage_check["allowed"]:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "message": "Rate limit exceeded",
                    "remaining": usage_check["remaining_today"],
                    "reset_time": usage_check["reset_time"],
                    "upgrade_message": usage_check["upgrade_message"],
                },
            )

        # Analyze conversation
        conversation_analyzer = app_request.app.state.conversation_analyzer
        result = await conversation_analyzer.analyze_conversation(
            conversation_history=request.conversation_history,
            match_profile=request.match_profile,
        )

        return ConversationAnalysisResponse(**result)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Conversation analysis failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to analyze conversation",
        )


@router.post("/coach/usage", response_model=UsageResponse)
async def check_usage(request: UsageRequest, app_request: Request):
    """
    Check current usage limits without incrementing counter.

    This endpoint helps UI show remaining suggestions.
    """
    try:
        rate_limiter = app_request.app.state.rate_limiter
        stats = await rate_limiter.get_usage_stats(
            user_id=request.user_id,
            coaching_type=request.coaching_type.value,
            subscription_tier=request.subscription_tier.value,
        )

        return UsageResponse(
            allowed=stats["remaining_today"] != 0,
            remaining_today=stats["remaining_today"],
            limit_per_day=stats["limit_per_day"],
            reset_time=stats["reset_time"],
            upgrade_message=None
            if stats["remaining_today"] > 0
            else "Upgrade for more suggestions",
        )

    except Exception as e:
        logger.error(f"Usage check failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to check usage",
        )


@router.post("/coach/real-time", response_model=RealTimeCoachingResponse)
async def get_real_time_coaching(
    request: RealTimeCoachingRequest,
    app_request: Request,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get real-time coaching tips for a conversation.

    Premium Feature: Provides contextual coaching as the conversation progresses.
    Includes conversation health, topic suggestions, and ghosting analysis.
    """
    try:
        # Check rate limit
        rate_limiter = app_request.app.state.rate_limiter
        usage_check = await rate_limiter.check_and_increment(
            user_id=current_user["user_id"],
            coaching_type="real_time_coaching",
            subscription_tier=current_user["subscription_tier"],
        )

        if not usage_check["allowed"]:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "message": "Rate limit exceeded",
                    "remaining": usage_check["remaining_today"],
                    "reset_time": usage_check["reset_time"],
                    "upgrade_message": usage_check["upgrade_message"],
                },
            )

        # Get real-time coaching
        conversation_coach = app_request.app.state.conversation_coach
        result = await conversation_coach.get_real_time_coaching(
            conversation_history=request.conversation_history,
            user_profile=request.user_profile,
            match_profile=request.match_profile,
            last_coaching_tips=request.last_coaching_tips,
        )

        return RealTimeCoachingResponse(**result)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Real-time coaching failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get coaching",
        )


@router.post("/coach/next-message", response_model=NextMessageAdviceResponse)
async def get_next_message_advice(
    request: NextMessageAdviceRequest,
    app_request: Request,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get specific advice for the next message to send.

    Premium Feature: Helps users craft better replies with do's, don'ts, and examples.
    """
    try:
        # Check rate limit
        rate_limiter = app_request.app.state.rate_limiter
        usage_check = await rate_limiter.check_and_increment(
            user_id=current_user["user_id"],
            coaching_type="next_message",
            subscription_tier=current_user["subscription_tier"],
        )

        if not usage_check["allowed"]:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "message": "Rate limit exceeded",
                    "remaining": usage_check["remaining_today"],
                    "reset_time": usage_check["reset_time"],
                    "upgrade_message": usage_check["upgrade_message"],
                },
            )

        # Get next message advice
        conversation_coach = app_request.app.state.conversation_coach
        result = await conversation_coach.get_next_message_advice(
            conversation_history=request.conversation_history,
            user_profile=request.user_profile,
            match_profile=request.match_profile,
        )

        return NextMessageAdviceResponse(**result)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Next message advice failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get advice",
        )


@router.post("/coach/date-ask", response_model=DateAskCoachingResponse)
async def get_date_ask_coaching(
    request: DateAskCoachingRequest,
    app_request: Request,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get coaching for asking match on a date.

    Premium Feature: Provides timing advice, scripts, and venue suggestions.
    """
    try:
        # Check rate limit
        rate_limiter = app_request.app.state.rate_limiter
        usage_check = await rate_limiter.check_and_increment(
            user_id=current_user["user_id"],
            coaching_type="date_ask",
            subscription_tier=current_user["subscription_tier"],
        )

        if not usage_check["allowed"]:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "message": "Rate limit exceeded",
                    "remaining": usage_check["remaining_today"],
                    "reset_time": usage_check["reset_time"],
                    "upgrade_message": usage_check["upgrade_message"],
                },
            )

        # Get date ask coaching
        conversation_coach = app_request.app.state.conversation_coach
        result = await conversation_coach.get_date_ask_coaching(
            conversation_history=request.conversation_history,
            user_profile=request.user_profile,
            match_profile=request.match_profile,
        )

        return DateAskCoachingResponse(**result)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Date ask coaching failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get date coaching",
        )


@router.post("/coach/shared-experiences", response_model=SharedExperienceResponse)
async def generate_shared_experiences(
    request: SharedExperienceRequest,
    app_request: Request,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Generate AI-curated shared experiences for matches.

    Tier 3 Feature (0% rollout): Creates personalized virtual activities,
    conversation games, creative challenges, and learning experiences
    that matches can do together.

    Experience types:
    - virtual_activity: Online games, virtual museum tours, cooking together
    - conversation_game: 36 Questions, Two Truths, Would You Rather
    - creative_challenge: Draw each other, playlist exchange, photo challenges
    - learning_together: Language exchange, skill sharing, documentary discussion
    - watch_party: Movies, shows, concerts together virtually
    """
    try:
        # Check feature flag (Tier 3 - 0% rollout)
        # In production, this would check the feature flag service
        # feature_enabled = await app_request.app.state.feature_flags.is_enabled(
        #     "engagementFeatures",
        #     "sharedExperienceGenerator",
        #     {"userId": current_user["user_id"]}
        # )
        # if not feature_enabled:
        #     raise HTTPException(
        #         status_code=status.HTTP_403_FORBIDDEN,
        #         detail="This feature is not yet available for your account",
        #     )

        # Check rate limit
        rate_limiter = app_request.app.state.rate_limiter
        usage_check = await rate_limiter.check_and_increment(
            user_id=current_user["user_id"],
            coaching_type="shared_experiences",
            subscription_tier=current_user["subscription_tier"],
        )

        if not usage_check["allowed"]:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "message": "Rate limit exceeded",
                    "remaining": usage_check["remaining_today"],
                    "reset_time": usage_check["reset_time"],
                    "upgrade_message": usage_check["upgrade_message"],
                },
            )

        # Generate shared experiences
        shared_experience_service = app_request.app.state.shared_experience_service
        result = await shared_experience_service.generate_experiences(
            user_profile=request.user_profile,
            match_profile=request.match_profile,
            count=request.count,
            experience_type=request.experience_type.value if request.experience_type else None,
            preferences=request.preferences,
            distance_km=request.distance_km,
            time_of_day=request.time_of_day,
        )

        return SharedExperienceResponse(**result)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Shared experience generation failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate shared experiences",
        )


@router.post("/coach/shared-experiences/conversation-game", response_model=CustomConversationGameResponse)
async def create_conversation_game(
    request: CustomConversationGameRequest,
    app_request: Request,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Create a personalized conversation game for a match.

    Tier 3 Feature (0% rollout): Generates custom question sets based on
    both profiles for games like:
    - 36 Questions to Fall in Love
    - Two Truths and a Lie
    - Would You Rather
    - Custom conversation starters
    """
    try:
        # Check rate limit
        rate_limiter = app_request.app.state.rate_limiter
        usage_check = await rate_limiter.check_and_increment(
            user_id=current_user["user_id"],
            coaching_type="shared_experiences",
            subscription_tier=current_user["subscription_tier"],
        )

        if not usage_check["allowed"]:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "message": "Rate limit exceeded",
                    "remaining": usage_check["remaining_today"],
                    "reset_time": usage_check["reset_time"],
                    "upgrade_message": usage_check["upgrade_message"],
                },
            )

        # Create conversation game
        shared_experience_service = app_request.app.state.shared_experience_service
        result = await shared_experience_service.create_custom_conversation_game(
            user_profile=request.user_profile,
            match_profile=request.match_profile,
            game_type=request.game_type,
            question_count=request.question_count,
            depth_level=request.depth_level,
        )

        return CustomConversationGameResponse(**result)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Conversation game creation failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create conversation game",
        )


@router.post("/coach/shared-experiences/feedback", response_model=ExperienceFeedbackResponse)
async def submit_experience_feedback(
    request: ExperienceFeedback,
    app_request: Request,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Submit feedback for a completed shared experience.

    Tracks engagement metrics and provides personalized recommendations
    for future experiences based on the feedback.
    """
    try:
        # Track experience completion
        shared_experience_service = app_request.app.state.shared_experience_service
        result = await shared_experience_service.track_experience_completion(
            experience_id=request.experience_id,
            user_id=request.user_id,
            match_id=request.match_id,
            feedback={
                "rating": request.rating,
                "completed": request.completed,
                "enjoyment_level": request.enjoyment_level,
                "conversation_quality": request.conversation_quality,
                "would_recommend": request.would_recommend,
                "notes": request.notes,
            },
        )

        return ExperienceFeedbackResponse(**result)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Experience feedback submission failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit feedback",
        )


@router.post("/coach/trajectory", response_model=TrajectoryPredictionResponse)
async def predict_relationship_trajectory(
    request: TrajectoryPredictionRequest,
    app_request: Request,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Predict relationship trajectory based on conversation patterns and engagement.

    Innovative Feature (0% rollout): ML-based compatibility forecasting that
    analyzes conversation patterns, response times, and engagement metrics
    to predict relationship trajectory and provide actionable insights.

    Analyzes:
    - Message frequency trends
    - Response time patterns
    - Conversation depth progression
    - Mutual interest indicators
    - Engagement reciprocity
    - Topic diversity

    Returns:
    - Trajectory score (0-100)
    - Predicted outcome (strong_connection, building_interest, plateau, fading, uncertain)
    - Key factors driving the prediction
    - Personalized recommendations for improvement
    - Milestone progress tracking
    - Risk factors and positive signals
    """
    try:
        # Check feature flag (Innovative Feature - 0% rollout initially)
        # In production, this would check the feature flag service
        # feature_enabled = await app_request.app.state.feature_flags.is_enabled(
        #     "innovativeFeatures",
        #     "relationshipTrajectory",
        #     {"userId": current_user["user_id"], "userSegment": current_user.get("subscription_tier")}
        # )
        # if not feature_enabled:
        #     raise HTTPException(
        #         status_code=status.HTTP_403_FORBIDDEN,
        #         detail="This feature is not yet available for your account",
        #     )

        # Check rate limit
        rate_limiter = app_request.app.state.rate_limiter
        usage_check = await rate_limiter.check_and_increment(
            user_id=current_user["user_id"],
            coaching_type="trajectory_prediction",
            subscription_tier=current_user["subscription_tier"],
        )

        if not usage_check["allowed"]:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "message": "Rate limit exceeded",
                    "remaining": usage_check["remaining_today"],
                    "reset_time": usage_check["reset_time"],
                    "upgrade_message": usage_check["upgrade_message"],
                },
            )

        # Predict trajectory
        trajectory_service = app_request.app.state.trajectory_service
        result = await trajectory_service.predict_trajectory(
            conversation_history=request.conversation_history,
            user_profile=request.user_profile,
            match_profile=request.match_profile,
            interaction_metrics=request.interaction_metrics.dict() if request.interaction_metrics else None,
        )

        return TrajectoryPredictionResponse(**result)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Trajectory prediction failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to predict relationship trajectory",
        )


# ============================================================================
# COMMUNICATION STYLE ANALYSIS ENDPOINTS
# ============================================================================

@router.post("/coach/communication-style", response_model=CommunicationStyleResponse)
async def analyze_communication_style(
    request: StyleAnalysisRequest,
    app_request: Request,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Analyze communication style from message history.

    Innovative Feature (0% rollout): NLP-based communication style analysis
    that extracts comprehensive communication patterns including:

    Style Dimensions:
    - Formality (0-100): casual to formal language
    - Expressiveness (0-100): emoji/punctuation usage
    - Verbosity (0-100): message length preferences
    - Question frequency: curiosity indicator
    - Response speed patterns
    - Topic initiation vs following

    Behavioral Analysis:
    - Humor style detection (witty, playful, sarcastic, wholesome, minimal)
    - Vocabulary richness measurement
    - Emotional depth assessment
    - Positivity/negativity tendency

    Use Cases:
    - Understand your own communication patterns
    - Get personalized tips to improve messaging
    - Track how your style evolves over conversations
    """
    try:
        # Check feature flag (Innovative Feature - 0% rollout initially)
        # In production, this would check the feature flag service
        # feature_enabled = await app_request.app.state.feature_flags.is_enabled(
        #     "innovativeFeatures",
        #     "communicationStyleMatcher",
        #     {"userId": current_user["user_id"]}
        # )
        # if not feature_enabled:
        #     raise HTTPException(
        #         status_code=status.HTTP_403_FORBIDDEN,
        #         detail="This feature is not yet available for your account",
        #     )

        # Check rate limit
        rate_limiter = app_request.app.state.rate_limiter
        usage_check = await rate_limiter.check_and_increment(
            user_id=current_user["user_id"],
            coaching_type="communication_style",
            subscription_tier=current_user["subscription_tier"],
        )

        if not usage_check["allowed"]:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "message": "Rate limit exceeded",
                    "remaining": usage_check["remaining_today"],
                    "reset_time": usage_check["reset_time"],
                    "upgrade_message": usage_check["upgrade_message"],
                },
            )

        # Analyze communication style
        communication_style_service = app_request.app.state.communication_style_service
        result = await communication_style_service.analyze_style(
            messages=request.messages,
            include_evolution=request.include_evolution,
        )

        return CommunicationStyleResponse(**result)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Communication style analysis failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to analyze communication style",
        )


@router.post("/coach/communication-style/compatibility", response_model=StyleCompatibility)
async def calculate_style_compatibility(
    request: StyleCompatibilityRequest,
    app_request: Request,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Calculate communication style compatibility between two users.

    Innovative Feature (0% rollout): Compares communication styles and provides:

    Compatibility Analysis:
    - Overall compatibility score (0-100)
    - Style match areas (dimensions that align well)
    - Potential friction points (where styles differ significantly)
    - Adaptation tips (how to communicate better with this match)

    Compatibility Logic:
    - Similar formality = higher compatibility
    - Complementary expressiveness can work
    - Very different verbosity = potential friction
    - Humor style compatibility matrix

    Returns personalized insights and actionable tips for better communication.
    """
    try:
        # Check feature flag
        # feature_enabled = await app_request.app.state.feature_flags.is_enabled(
        #     "innovativeFeatures",
        #     "communicationStyleMatcher",
        #     {"userId": current_user["user_id"]}
        # )
        # if not feature_enabled:
        #     raise HTTPException(
        #         status_code=status.HTTP_403_FORBIDDEN,
        #         detail="This feature is not yet available for your account",
        #     )

        # Check rate limit
        rate_limiter = app_request.app.state.rate_limiter
        usage_check = await rate_limiter.check_and_increment(
            user_id=current_user["user_id"],
            coaching_type="communication_style",
            subscription_tier=current_user["subscription_tier"],
        )

        if not usage_check["allowed"]:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "message": "Rate limit exceeded",
                    "remaining": usage_check["remaining_today"],
                    "reset_time": usage_check["reset_time"],
                    "upgrade_message": usage_check["upgrade_message"],
                },
            )

        # First analyze both users' styles
        communication_style_service = app_request.app.state.communication_style_service

        user_style_result = await communication_style_service.analyze_style(
            messages=request.user_messages,
            include_evolution=False,
        )
        match_style_result = await communication_style_service.analyze_style(
            messages=request.match_messages,
            include_evolution=False,
        )

        # Calculate compatibility
        result = await communication_style_service.calculate_style_compatibility(
            style1=user_style_result["user_style"],
            style2=match_style_result["user_style"],
            generate_tips=request.generate_tips,
        )

        return StyleCompatibility(**result)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Style compatibility calculation failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to calculate style compatibility",
        )


@router.post("/coach/communication-style/friction", response_model=CommunicationFrictionResponse)
async def predict_communication_friction(
    request: CommunicationFrictionRequest,
    app_request: Request,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Predict potential communication friction points between two styles.

    Innovative Feature (0% rollout): Analyzes style differences to predict
    potential misunderstandings and provides prevention strategies.

    Analysis Includes:
    - Specific friction points with risk levels
    - Explanations of why friction might occur
    - Mitigation strategies for each friction point
    - Overall friction risk assessment
    - Prevention strategies
    - Conversation guidelines

    Use this after getting both users' communication styles to understand
    potential challenges and how to navigate them proactively.
    """
    try:
        # Check feature flag
        # feature_enabled = await app_request.app.state.feature_flags.is_enabled(
        #     "innovativeFeatures",
        #     "communicationStyleMatcher",
        #     {"userId": current_user["user_id"]}
        # )
        # if not feature_enabled:
        #     raise HTTPException(
        #         status_code=status.HTTP_403_FORBIDDEN,
        #         detail="This feature is not yet available for your account",
        #     )

        # Check rate limit
        rate_limiter = app_request.app.state.rate_limiter
        usage_check = await rate_limiter.check_and_increment(
            user_id=current_user["user_id"],
            coaching_type="communication_style",
            subscription_tier=current_user["subscription_tier"],
        )

        if not usage_check["allowed"]:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "message": "Rate limit exceeded",
                    "remaining": usage_check["remaining_today"],
                    "reset_time": usage_check["reset_time"],
                    "upgrade_message": usage_check["upgrade_message"],
                },
            )

        # Predict friction
        communication_style_service = app_request.app.state.communication_style_service
        result = await communication_style_service.predict_communication_friction(
            user_style=request.user_style.dict(),
            match_style=request.match_style.dict(),
        )

        return CommunicationFrictionResponse(**result)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Communication friction prediction failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to predict communication friction",
        )


# ============================================================================
# AI CONFLICT MEDIATOR ENDPOINTS
# ============================================================================

@router.post("/coach/mediate/detect", response_model=ConflictDetectionResponse)
async def detect_conflict(
    request: ConflictDetectionRequest,
    app_request: Request,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Detect if there's conflict or tension in a conversation.

    Research Feature (0% rollout): Quick conflict detection that can be called
    frequently to catch issues early before they escalate.

    Analysis Includes:
    - Conflict detection with confidence score
    - Conflict type classification (if detected)
    - Severity assessment
    - Trigger point identification
    - Early warning signs
    - Sentiment shift detection
    - Safety concern flagging

    SAFETY: This endpoint includes abuse detection. If abusive patterns are
    detected, the response will include safety information and escalation
    guidance. We NEVER mediate abuse - we protect users.

    Sensitivity levels:
    - low: Only flag obvious conflicts
    - normal: Balanced detection (default)
    - high: Flag early signs of tension
    """
    try:
        # Check feature flag (Research Feature - 0% rollout initially)
        # In production, this would check the feature flag service
        # feature_enabled = await app_request.app.state.feature_flags.is_enabled(
        #     "engagementFeatures",
        #     "conflictMediator",
        #     {"userId": current_user["user_id"]}
        # )
        # if not feature_enabled:
        #     raise HTTPException(
        #         status_code=status.HTTP_403_FORBIDDEN,
        #         detail="This feature is not yet available for your account",
        #     )

        # Check rate limit
        rate_limiter = app_request.app.state.rate_limiter
        usage_check = await rate_limiter.check_and_increment(
            user_id=current_user["user_id"],
            coaching_type="conflict_mediation",
            subscription_tier=current_user["subscription_tier"],
        )

        if not usage_check["allowed"]:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "message": "Rate limit exceeded",
                    "remaining": usage_check["remaining_today"],
                    "reset_time": usage_check["reset_time"],
                    "upgrade_message": usage_check["upgrade_message"],
                },
            )

        # Detect conflict
        conflict_mediator = app_request.app.state.conflict_mediator
        result = await conflict_mediator.detect_conflict(
            conversation_history=request.conversation_history,
            sensitivity=request.sensitivity,
        )

        return ConflictDetectionResponse(**result)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Conflict detection failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to detect conflict",
        )


@router.post("/coach/mediate", response_model=ConflictMediationResponse)
async def mediate_conflict(
    request: ConflictMediationRequest,
    app_request: Request,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get full conflict mediation assistance.

    Research Feature (0% rollout): AI-powered mediation for dating conversation
    conflicts. Provides dispute resolution and miscommunication repair.

    This is the main entry point for the mediation feature. It provides:

    Analysis:
    - Comprehensive conflict analysis
    - Both perspectives explained empathetically
    - Misunderstanding points identified
    - Root cause determination

    Suggestions:
    - Prioritized mediation suggestions with message templates
    - De-escalation templates
    - Apology guidance (when appropriate)
    - Conversation reset options
    - Graceful exit suggestions (when needed)

    Safety:
    - Abuse detection and safety escalation
    - Victim support (never blame victims)
    - Safety resources when needed

    CRITICAL SAFETY GUARDRAILS:
    - We NEVER mediate abuse - we escalate to safety team
    - We recognize when to suggest ending the conversation
    - We NEVER blame the victim
    - User safety is always the top priority

    Desired outcomes:
    - "reconcile": Focus on repairing and moving forward
    - "understand": Focus on gaining clarity about what happened
    - "end_gracefully": Focus on dignified exit
    """
    try:
        # Check feature flag (Research Feature - 0% rollout initially)
        # In production, this would check the feature flag service
        # feature_enabled = await app_request.app.state.feature_flags.is_enabled(
        #     "engagementFeatures",
        #     "conflictMediator",
        #     {"userId": current_user["user_id"]}
        # )
        # if not feature_enabled:
        #     raise HTTPException(
        #         status_code=status.HTTP_403_FORBIDDEN,
        #         detail="This feature is not yet available for your account",
        #     )

        # Check rate limit
        rate_limiter = app_request.app.state.rate_limiter
        usage_check = await rate_limiter.check_and_increment(
            user_id=current_user["user_id"],
            coaching_type="conflict_mediation",
            subscription_tier=current_user["subscription_tier"],
        )

        if not usage_check["allowed"]:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "message": "Rate limit exceeded",
                    "remaining": usage_check["remaining_today"],
                    "reset_time": usage_check["reset_time"],
                    "upgrade_message": usage_check["upgrade_message"],
                },
            )

        # Perform mediation
        conflict_mediator = app_request.app.state.conflict_mediator
        result = await conflict_mediator.mediate(
            conversation_history=request.conversation_history,
            user_perspective=request.user_perspective,
            desired_outcome=request.desired_outcome or "reconcile",
        )

        return ConflictMediationResponse(**result)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Conflict mediation failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to mediate conflict",
        )
