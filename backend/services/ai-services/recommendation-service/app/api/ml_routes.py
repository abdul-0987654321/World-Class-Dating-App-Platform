"""
Enhanced ML Routes for Advanced Recommendation Features

Provides endpoints for:
- ML-based profile matching
- Behavioral insights
- A/B testing
- Model training feedback
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from datetime import datetime
import logging

from ..ml.models.hybrid_recommender import HybridRecommender
from ..ml.models.behavioral_learner import BehavioralLearner
from ..ml.ab_testing.experiment_manager import ExperimentManager, Variant

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ml", tags=["ml-recommendations"])

# Global instances (in production, use dependency injection)
hybrid_recommender = HybridRecommender()
behavioral_learner = BehavioralLearner()
experiment_manager = ExperimentManager()


# ============================================================================
# Request/Response Models
# ============================================================================

class ProfileData(BaseModel):
    """User profile data model."""
    user_id: str
    age: int
    gender: str
    location: Dict[str, float]
    interests: List[str] = []
    education: Optional[str] = None
    relationship_goal: Optional[str] = None
    bio: str = ""
    photo_count: int = 1
    is_verified: bool = False
    is_premium: bool = False
    completeness_score: float = 0.5
    preferences: Dict[str, Any] = {}


class RecommendationRequest(BaseModel):
    """Request for personalized recommendations."""
    user_profile: ProfileData
    candidate_profiles: List[ProfileData]
    n: int = Field(default=20, ge=1, le=100)
    diversity_factor: float = Field(default=0.1, ge=0.0, le=1.0)
    exclude_user_ids: List[str] = []
    use_ab_test: bool = False
    experiment_id: Optional[str] = None


class RecommendationResponse(BaseModel):
    """Response with personalized recommendations."""
    recommendations: List[Dict[str, Any]]
    metadata: Dict[str, Any]
    experiment_info: Optional[Dict[str, Any]] = None


class SwipeEventRequest(BaseModel):
    """Swipe event for behavioral learning."""
    user_id: str
    target_user_id: str
    action: str  # like, pass, super_like
    target_profile: ProfileData
    timestamp: Optional[datetime] = None
    context: Optional[Dict[str, Any]] = None


class MatchEventRequest(BaseModel):
    """Match event for learning."""
    user_id: str
    matched_user_id: str
    matched_profile: ProfileData
    match_quality_score: Optional[float] = None


class BehavioralInsightsRequest(BaseModel):
    """Request for behavioral insights."""
    user_id: str


class BehavioralInsightsResponse(BaseModel):
    """Response with behavioral insights."""
    user_id: str
    insights: Dict[str, Any]
    preferences: Dict[str, Any]
    recommendations: List[str]


class ExperimentRequest(BaseModel):
    """Request to create A/B test experiment."""
    experiment_id: str
    name: str
    description: str
    hypothesis: str
    variants: List[Dict[str, Any]]
    minimum_sample_size: int = 1000
    confidence_level: float = 0.95


class ExperimentResultsResponse(BaseModel):
    """Response with experiment results."""
    experiment_id: str
    name: str
    status: str
    results: Dict[str, Any]


# ============================================================================
# Recommendation Endpoints
# ============================================================================

@router.post("/recommend", response_model=RecommendationResponse)
async def get_ml_recommendations(
    request: RecommendationRequest,
    background_tasks: BackgroundTasks
):
    """
    Get ML-powered personalized recommendations.

    Uses hybrid approach combining:
    - Collaborative filtering (similar users' preferences)
    - Content-based filtering (profile attributes)
    - Behavioral patterns (learned preferences)

    Supports A/B testing for algorithm variants.
    """
    try:
        user_profile = request.user_profile.dict()
        candidate_profiles = [p.dict() for p in request.candidate_profiles]

        # Check if using A/B test
        experiment_variant = None
        if request.use_ab_test and request.experiment_id:
            experiment_variant = experiment_manager.get_variant_for_user(
                request.user_profile.user_id,
                request.experiment_id
            )

            if experiment_variant:
                # Track impression event
                background_tasks.add_task(
                    experiment_manager.track_event,
                    request.user_profile.user_id,
                    request.experiment_id,
                    'impression'
                )

        # Get recommendations using hybrid approach
        recommendations = hybrid_recommender.recommend(
            user_id=request.user_profile.user_id,
            user_profile=user_profile,
            candidate_profiles=candidate_profiles,
            n=request.n,
            diversity_factor=request.diversity_factor,
            exclude_ids=request.exclude_user_ids
        )

        # Get behavioral insights for personalization
        user_preferences = behavioral_learner.get_user_preferences(
            request.user_profile.user_id
        )

        response = RecommendationResponse(
            recommendations=recommendations,
            metadata={
                'algorithm': 'hybrid',
                'n_candidates': len(candidate_profiles),
                'n_recommendations': len(recommendations),
                'user_preferences_available': bool(user_preferences),
                'timestamp': datetime.now().isoformat()
            },
            experiment_info={
                'experiment_id': request.experiment_id,
                'variant_id': experiment_variant.id if experiment_variant else None,
                'variant_name': experiment_variant.name if experiment_variant else None
            } if experiment_variant else None
        )

        return response

    except Exception as e:
        logger.error(f"Recommendation generation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/predict-compatibility")
async def predict_compatibility(
    user_id: str,
    user_profile: ProfileData,
    target_profile: ProfileData
):
    """
    Predict compatibility score between two users.

    Returns detailed compatibility score and explanation.
    """
    try:
        score, explanation = hybrid_recommender.predict_score(
            user_id=user_id,
            user_profile=user_profile.dict(),
            target_profile=target_profile.dict()
        )

        return {
            'user_id': user_id,
            'target_user_id': target_profile.user_id,
            'compatibility_score': score,
            'explanation': explanation,
            'timestamp': datetime.now().isoformat()
        }

    except Exception as e:
        logger.error(f"Compatibility prediction failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Behavioral Learning Endpoints
# ============================================================================

@router.post("/behavioral/swipe")
async def record_swipe_event(event: SwipeEventRequest):
    """
    Record swipe event for behavioral learning.

    Learns user preferences from swipe patterns.
    """
    try:
        behavioral_learner.learn_from_swipe(
            user_id=event.user_id,
            target_user_id=event.target_user_id,
            action=event.action,
            target_profile=event.target_profile.dict(),
            context=event.context
        )

        return {
            'status': 'success',
            'message': 'Swipe event recorded',
            'user_id': event.user_id
        }

    except Exception as e:
        logger.error(f"Swipe event recording failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/behavioral/match")
async def record_match_event(event: MatchEventRequest):
    """
    Record match event for behavioral learning.

    Learns from successful matches to improve recommendations.
    """
    try:
        behavioral_learner.learn_from_match(
            user_id=event.user_id,
            matched_user_id=event.matched_user_id,
            matched_profile=event.matched_profile.dict(),
            match_quality_score=event.match_quality_score
        )

        return {
            'status': 'success',
            'message': 'Match event recorded',
            'user_id': event.user_id
        }

    except Exception as e:
        logger.error(f"Match event recording failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/behavioral/insights", response_model=BehavioralInsightsResponse)
async def get_behavioral_insights(request: BehavioralInsightsRequest):
    """
    Get behavioral insights and learned preferences for a user.

    Returns:
    - User behavior profile type
    - Learned preferences
    - Engagement metrics
    - Personalized recommendations
    """
    try:
        insights = behavioral_learner.get_insights(request.user_id)
        preferences = behavioral_learner.get_user_preferences(request.user_id)

        # Get optimal recommendation timing
        timing = behavioral_learner.get_optimal_recommendation_time(request.user_id)
        insights['optimal_timing'] = timing

        # Get photo preferences
        photo_prefs = behavioral_learner.get_photo_preferences(request.user_id)
        insights['photo_preferences'] = photo_prefs

        response = BehavioralInsightsResponse(
            user_id=request.user_id,
            insights=insights,
            preferences=preferences,
            recommendations=insights.get('recommendations', [])
        )

        return response

    except Exception as e:
        logger.error(f"Behavioral insights retrieval failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/behavioral/engagement-metrics/{user_id}")
async def get_engagement_metrics(user_id: str):
    """
    Get detailed engagement metrics for a user.

    Includes swipe patterns, match rates, and conversation metrics.
    """
    try:
        metrics = behavioral_learner.get_engagement_metrics(user_id)

        return {
            'user_id': user_id,
            'metrics': metrics,
            'timestamp': datetime.now().isoformat()
        }

    except Exception as e:
        logger.error(f"Engagement metrics retrieval failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/behavioral/predict-swipe")
async def predict_swipe_action(
    user_id: str,
    target_profile: ProfileData
):
    """
    Predict likely swipe action for a profile.

    Returns predicted action and confidence level.
    """
    try:
        action, confidence = behavioral_learner.predict_swipe(
            user_id=user_id,
            target_profile=target_profile.dict()
        )

        return {
            'user_id': user_id,
            'target_user_id': target_profile.user_id,
            'predicted_action': action,
            'confidence': confidence,
            'timestamp': datetime.now().isoformat()
        }

    except Exception as e:
        logger.error(f"Swipe prediction failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# A/B Testing Endpoints
# ============================================================================

@router.post("/experiments/create")
async def create_experiment(request: ExperimentRequest):
    """
    Create a new A/B test experiment.

    Allows testing different algorithm variants.
    """
    try:
        experiment = experiment_manager.create_experiment(
            experiment_id=request.experiment_id,
            name=request.name,
            description=request.description,
            hypothesis=request.hypothesis,
            variants=request.variants,
            minimum_sample_size=request.minimum_sample_size,
            confidence_level=request.confidence_level
        )

        return {
            'status': 'success',
            'experiment_id': experiment.id,
            'message': f'Experiment "{experiment.name}" created successfully'
        }

    except Exception as e:
        logger.error(f"Experiment creation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/experiments/{experiment_id}/start")
async def start_experiment(experiment_id: str):
    """Start an A/B test experiment."""
    try:
        experiment_manager.start_experiment(experiment_id)

        return {
            'status': 'success',
            'experiment_id': experiment_id,
            'message': 'Experiment started'
        }

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Experiment start failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/experiments/{experiment_id}/pause")
async def pause_experiment(experiment_id: str):
    """Pause an A/B test experiment."""
    try:
        experiment_manager.pause_experiment(experiment_id)

        return {
            'status': 'success',
            'experiment_id': experiment_id,
            'message': 'Experiment paused'
        }

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Experiment pause failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/experiments/{experiment_id}/complete")
async def complete_experiment(experiment_id: str):
    """Complete an A/B test experiment."""
    try:
        experiment_manager.complete_experiment(experiment_id)

        return {
            'status': 'success',
            'experiment_id': experiment_id,
            'message': 'Experiment completed'
        }

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Experiment completion failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/experiments/{experiment_id}/results", response_model=ExperimentResultsResponse)
async def get_experiment_results(experiment_id: str):
    """
    Get comprehensive results for an A/B test experiment.

    Includes:
    - Variant performance metrics
    - Statistical significance analysis
    - Winner determination
    - Recommendations
    """
    try:
        results = experiment_manager.get_experiment_results(experiment_id)

        return ExperimentResultsResponse(
            experiment_id=results['experiment_id'],
            name=results['name'],
            status=results['status'],
            results=results
        )

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Experiment results retrieval failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/experiments/active")
async def get_active_experiments():
    """Get list of active A/B test experiments."""
    try:
        experiments = experiment_manager.get_active_experiments()

        return {
            'active_experiments': experiments,
            'count': len(experiments)
        }

    except Exception as e:
        logger.error(f"Active experiments retrieval failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/experiments/all")
async def get_all_experiments():
    """Get list of all A/B test experiments."""
    try:
        experiments = experiment_manager.get_all_experiments()

        return {
            'experiments': experiments,
            'count': len(experiments)
        }

    except Exception as e:
        logger.error(f"Experiments retrieval failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/experiments/{experiment_id}/track")
async def track_experiment_event(
    experiment_id: str,
    user_id: str,
    event_type: str,
    value: Optional[float] = None
):
    """
    Track an event for A/B test experiment.

    Event types: impression, like, match, conversation_start, etc.
    """
    try:
        experiment_manager.track_event(
            user_id=user_id,
            experiment_id=experiment_id,
            event_type=event_type,
            value=value
        )

        return {
            'status': 'success',
            'message': 'Event tracked',
            'experiment_id': experiment_id,
            'user_id': user_id,
            'event_type': event_type
        }

    except Exception as e:
        logger.error(f"Event tracking failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Model Management Endpoints
# ============================================================================

@router.get("/models/stats")
async def get_model_stats():
    """
    Get statistics about trained models.

    Returns performance metrics and model information.
    """
    try:
        stats = {
            'hybrid_recommender': hybrid_recommender.get_stats(),
            'behavioral_learner': {
                'total_users': len(behavioral_learner.user_behaviors),
                'total_swipes': sum(
                    p['total_swipes']
                    for p in behavioral_learner.swipe_patterns.values()
                )
            }
        }

        return stats

    except Exception as e:
        logger.error(f"Model stats retrieval failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/models/update-feedback")
async def update_model_feedback(
    user_id: str,
    target_user_id: str,
    action: str,
    success: bool = False
):
    """
    Update models with user feedback.

    Helps models learn from user actions to improve recommendations.
    """
    try:
        hybrid_recommender.update_from_feedback(
            user_id=user_id,
            target_user_id=target_user_id,
            action=action,
            success=success
        )

        return {
            'status': 'success',
            'message': 'Feedback recorded'
        }

    except Exception as e:
        logger.error(f"Feedback update failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        'status': 'healthy',
        'service': 'ml-recommendation-service',
        'timestamp': datetime.now().isoformat()
    }
