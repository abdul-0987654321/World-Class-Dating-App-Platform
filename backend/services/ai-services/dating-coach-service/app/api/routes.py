"""API routes for Dating Coach Service."""

import logging
from fastapi import APIRouter, Request, HTTPException, status
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
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/coach/icebreakers", response_model=IcebreakerResponse)
async def generate_icebreakers(request: IcebreakerRequest, app_request: Request):
    """
    Generate icebreaker messages for a match.

    Premium Feature: Rate limited based on subscription tier.
    """
    try:
        # Check rate limit
        rate_limiter = app_request.app.state.rate_limiter
        usage_check = await rate_limiter.check_and_increment(
            user_id=request.user_id,
            coaching_type="icebreaker",
            subscription_tier="premium",  # TODO: Get from user context
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
async def suggest_response(request: ResponseSuggestionRequest, app_request: Request):
    """
    Suggest responses based on conversation context.

    Premium Feature: Rate limited based on subscription tier.
    """
    try:
        # Check rate limit
        rate_limiter = app_request.app.state.rate_limiter
        usage_check = await rate_limiter.check_and_increment(
            user_id=request.user_id,
            coaching_type="response",
            subscription_tier="premium",  # TODO: Get from user context
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
async def get_profile_tips(request: ProfileTipsRequest, app_request: Request):
    """
    Analyze profile and provide optimization tips.

    Premium Feature: Rate limited based on subscription tier.
    """
    try:
        # Check rate limit
        rate_limiter = app_request.app.state.rate_limiter
        usage_check = await rate_limiter.check_and_increment(
            user_id=request.user_id,
            coaching_type="profile_tips",
            subscription_tier="premium",  # TODO: Get from user context
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
async def generate_date_ideas(request: DateIdeasRequest, app_request: Request):
    """
    Generate personalized date ideas based on both profiles.

    Premium Feature: Rate limited based on subscription tier.
    """
    try:
        # Check rate limit
        rate_limiter = app_request.app.state.rate_limiter
        usage_check = await rate_limiter.check_and_increment(
            user_id=request.user_id,
            coaching_type="date_ideas",
            subscription_tier="premium",  # TODO: Get from user context
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
async def analyze_conversation(request: ConversationAnalysisRequest, app_request: Request):
    """
    Analyze conversation flow and provide insights.

    Premium+ Feature: Rate limited based on subscription tier.
    """
    try:
        # Check rate limit
        rate_limiter = app_request.app.state.rate_limiter
        usage_check = await rate_limiter.check_and_increment(
            user_id=request.user_id,
            coaching_type="conversation_analysis",
            subscription_tier="premium",  # TODO: Get from user context
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
