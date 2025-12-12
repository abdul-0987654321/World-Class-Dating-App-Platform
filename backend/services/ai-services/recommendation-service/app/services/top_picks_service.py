"""
Top Picks Service - Daily curated high-quality matches
Premium feature that provides personalized daily recommendations
"""

import asyncio
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple
import structlog
import redis.asyncio as redis
from app.services.recommendation import RecommendationService
from app.ml.models.deep_matching_network import ImprovedRecommendationEngine

logger = structlog.get_logger()


class TopPicksService:
    """
    Service for generating and managing daily Top Picks

    Top Picks are curated daily matches selected based on:
    - High compatibility scores
    - Mutual preferences alignment
    - Activity patterns (likely to respond)
    - Profile quality (complete profiles, verified)
    - Diversity (different types of matches)
    """

    def __init__(
        self,
        recommendation_service: RecommendationService,
        redis_client: Optional[redis.Redis] = None
    ):
        self.recommendation_service = recommendation_service
        self.redis_client = redis_client
        self.ml_engine = ImprovedRecommendationEngine()

        # Configuration
        self.TOP_PICKS_PER_DAY = 10
        self.MIN_COMPATIBILITY_SCORE = 70
        self.CACHE_TTL = 86400  # 24 hours
        self.DIVERSITY_THRESHOLD = 0.3

    async def get_top_picks(
        self,
        user_id: str,
        location: Tuple[float, float],
        preferences: Optional[Dict[str, Any]] = None,
        force_refresh: bool = False
    ) -> Dict[str, Any]:
        """
        Get today's Top Picks for a user

        Args:
            user_id: User requesting Top Picks
            location: User's current location
            preferences: User preferences for filtering
            force_refresh: Force regeneration of Top Picks

        Returns:
            Dict containing Top Picks and metadata
        """
        logger.info("Getting Top Picks", user_id=user_id)

        # Check cache first
        if not force_refresh:
            cached_picks = await self._get_cached_picks(user_id)
            if cached_picks:
                logger.info("Returning cached Top Picks", user_id=user_id)
                return cached_picks

        # Generate new Top Picks
        top_picks = await self._generate_top_picks(
            user_id=user_id,
            location=location,
            preferences=preferences
        )

        # Cache results
        await self._cache_picks(user_id, top_picks)

        return {
            "picks": top_picks,
            "generated_at": datetime.utcnow().isoformat(),
            "expires_at": (datetime.utcnow() + timedelta(days=1)).isoformat(),
            "count": len(top_picks),
            "refreshes_in_hours": 24
        }

    async def _generate_top_picks(
        self,
        user_id: str,
        location: Tuple[float, float],
        preferences: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """Generate fresh Top Picks for the day"""

        # Get user profile
        user_profile = await self._get_user_profile(user_id)

        # Get a large candidate pool (3x what we need for diversity)
        candidate_pool_size = self.TOP_PICKS_PER_DAY * 3

        # Get base recommendations with high compatibility
        base_recommendations = await self.recommendation_service.get_recommendations(
            user_id=user_id,
            location=location,
            preferences=preferences,
            limit=candidate_pool_size,
            exclude_ids=await self._get_excluded_user_ids(user_id)
        )

        candidates = base_recommendations.get('profiles', [])

        if not candidates:
            logger.warning("No candidates found for Top Picks", user_id=user_id)
            return []

        # Filter by minimum compatibility score
        high_quality_candidates = [
            c for c in candidates
            if c.get('compatibility_score', 0) >= self.MIN_COMPATIBILITY_SCORE
        ]

        # Get detailed profiles for ML scoring
        detailed_profiles = await self._get_detailed_profiles(
            [c['user_id'] for c in high_quality_candidates]
        )

        # Use ML model for enhanced scoring
        ml_scores = self.ml_engine.predict_compatibility(
            user_profile=user_profile,
            candidate_profiles=detailed_profiles
        )

        # Merge ML scores with existing data
        ml_score_map = dict(ml_scores)
        for candidate in high_quality_candidates:
            candidate['ml_score'] = ml_score_map.get(candidate['user_id'], 0)

        # Calculate final scores with multiple factors
        scored_candidates = self._calculate_final_scores(
            candidates=high_quality_candidates,
            user_profile=user_profile
        )

        # Apply diversity selection
        top_picks = self._select_diverse_picks(
            candidates=scored_candidates,
            num_picks=self.TOP_PICKS_PER_DAY
        )

        # Enrich with insights and reasons
        enriched_picks = await self._enrich_picks(user_id, top_picks)

        logger.info(
            f"Generated {len(enriched_picks)} Top Picks for user {user_id}"
        )

        return enriched_picks

    def _calculate_final_scores(
        self,
        candidates: List[Dict[str, Any]],
        user_profile: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Calculate comprehensive final scores

        Factors:
        - ML compatibility score (40%)
        - Profile quality score (20%)
        - Activity likelihood (20%)
        - Mutual preference alignment (15%)
        - Freshness/newness (5%)
        """
        now = datetime.utcnow()

        for candidate in candidates:
            scores = {
                'ml_score': candidate.get('ml_score', 0) * 0.40,
                'profile_quality': self._calculate_profile_quality(candidate) * 0.20,
                'activity_score': candidate.get('activity_score', 50) * 0.20,
                'mutual_preference': self._calculate_mutual_preference(
                    user_profile, candidate
                ) * 0.15,
                'freshness': self._calculate_freshness(candidate, now) * 0.05
            }

            # Calculate final score
            final_score = sum(scores.values())

            candidate['final_score'] = final_score
            candidate['score_breakdown'] = scores

        # Sort by final score
        candidates.sort(key=lambda x: x['final_score'], reverse=True)

        return candidates

    def _calculate_profile_quality(self, profile: Dict[str, Any]) -> float:
        """
        Calculate profile quality score (0-100)

        Factors:
        - Profile completeness
        - Number of photos
        - Bio length
        - Verification status
        - Prompt answers
        """
        score = 0

        # Profile completeness
        score += profile.get('profile_completeness', 0.5) * 30

        # Photos (up to 6)
        num_photos = len(profile.get('photos', []))
        score += min(num_photos / 6.0, 1.0) * 20

        # Bio quality
        bio = profile.get('bio', '')
        if bio:
            bio_score = min(len(bio) / 200.0, 1.0) * 15
            score += bio_score

        # Verification
        if profile.get('is_verified'):
            score += 20

        # Prompts
        num_prompts = len(profile.get('prompts', []))
        score += min(num_prompts / 3.0, 1.0) * 15

        return min(score, 100)

    def _calculate_mutual_preference(
        self,
        user_profile: Dict[str, Any],
        candidate: Dict[str, Any]
    ) -> float:
        """
        Calculate how well profiles match each other's preferences (0-100)
        """
        score = 0

        user_prefs = user_profile.get('preferences', {})
        candidate_prefs = candidate.get('preferences', {})

        # Age compatibility
        user_age = user_profile.get('age', 0)
        candidate_age = candidate.get('age', 0)

        user_in_candidate_age_range = (
            candidate_prefs.get('min_age', 0) <= user_age <= candidate_prefs.get('max_age', 99)
        )
        candidate_in_user_age_range = (
            user_prefs.get('min_age', 0) <= candidate_age <= user_prefs.get('max_age', 99)
        )

        if user_in_candidate_age_range and candidate_in_user_age_range:
            score += 40
        elif user_in_candidate_age_range or candidate_in_user_age_range:
            score += 20

        # Gender preference match
        user_gender = user_profile.get('gender', '')
        candidate_gender = candidate.get('gender', '')

        user_matches_candidate_pref = (
            user_gender in candidate_prefs.get('genders', []) or
            'all' in candidate_prefs.get('genders', [])
        )
        candidate_matches_user_pref = (
            candidate_gender in user_prefs.get('genders', []) or
            'all' in user_prefs.get('genders', [])
        )

        if user_matches_candidate_pref and candidate_matches_user_pref:
            score += 40
        elif user_matches_candidate_pref or candidate_matches_user_pref:
            score += 20

        # Distance preference
        distance_km = candidate.get('distance_km', 999)
        if distance_km <= user_prefs.get('max_distance', 50):
            score += 20

        return score

    def _calculate_freshness(self, candidate: Dict[str, Any], now: datetime) -> float:
        """
        Calculate freshness score - boost new users (0-100)
        """
        created_at = candidate.get('created_at')
        if not created_at:
            return 50

        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))

        days_old = (now - created_at).days

        # New users get boost (first 30 days)
        if days_old <= 7:
            return 100
        elif days_old <= 30:
            return 100 - ((days_old - 7) * 2)
        else:
            return 50

    def _select_diverse_picks(
        self,
        candidates: List[Dict[str, Any]],
        num_picks: int
    ) -> List[Dict[str, Any]]:
        """
        Select diverse picks to avoid echo chamber

        Ensures variety in:
        - Interests
        - Backgrounds
        - Personality types
        """
        if len(candidates) <= num_picks:
            return candidates

        selected = []
        selected.append(candidates[0])  # Always include top match

        # Use diversity selection for remaining picks
        for candidate in candidates[1:]:
            if len(selected) >= num_picks:
                break

            # Check diversity against selected picks
            is_diverse = self._is_diverse_candidate(candidate, selected)

            if is_diverse or len(selected) >= num_picks - 2:
                # Always fill last 2 spots even if not diverse
                selected.append(candidate)

        return selected

    def _is_diverse_candidate(
        self,
        candidate: Dict[str, Any],
        selected: List[Dict[str, Any]]
    ) -> bool:
        """
        Check if candidate adds diversity to selected picks
        """
        candidate_interests = set(candidate.get('interests', []))

        for selected_candidate in selected:
            selected_interests = set(selected_candidate.get('interests', []))

            if not candidate_interests or not selected_interests:
                continue

            # Calculate Jaccard similarity
            intersection = candidate_interests & selected_interests
            union = candidate_interests | selected_interests
            similarity = len(intersection) / len(union) if union else 0

            # If too similar to any selected candidate, not diverse
            if similarity > (1 - self.DIVERSITY_THRESHOLD):
                return False

        return True

    async def _enrich_picks(
        self,
        user_id: str,
        picks: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Enrich picks with additional insights and metadata
        """
        enriched = []

        for i, pick in enumerate(picks):
            # Generate personalized insights
            insights = await self._generate_insights(user_id, pick)

            # Add ranking
            enriched_pick = {
                **pick,
                'rank': i + 1,
                'insights': insights,
                'top_pick_reason': self._get_top_pick_reason(pick),
                'suggested_opener': await self._generate_suggested_opener(pick)
            }

            enriched.append(enriched_pick)

        return enriched

    async def _generate_insights(
        self,
        user_id: str,
        pick: Dict[str, Any]
    ) -> List[str]:
        """Generate personalized insights about the pick"""
        insights = []

        # Compatibility insights
        if pick.get('compatibility_score', 0) >= 85:
            insights.append("Exceptional compatibility match")

        # Common interests
        common_interests = pick.get('common_interests', [])
        if len(common_interests) >= 3:
            insights.append(f"You share {len(common_interests)} interests")

        # Activity insights
        if pick.get('last_active_hours', 999) < 24:
            insights.append("Recently active")

        # Profile quality
        if pick.get('is_verified'):
            insights.append("Verified profile")

        # Distance
        distance = pick.get('distance_km', 999)
        if distance < 5:
            insights.append("Lives nearby")

        # Score breakdown highlights
        score_breakdown = pick.get('score_breakdown', {})
        if score_breakdown.get('mutual_preference', 0) >= 80:
            insights.append("Strong mutual preference match")

        return insights

    def _get_top_pick_reason(self, pick: Dict[str, Any]) -> str:
        """Get the primary reason this is a Top Pick"""
        score_breakdown = pick.get('score_breakdown', {})

        # Find highest scoring factor
        if not score_breakdown:
            return "High overall compatibility"

        max_factor = max(score_breakdown.items(), key=lambda x: x[1])

        reason_map = {
            'ml_score': "Exceptional compatibility match",
            'profile_quality': "High-quality complete profile",
            'activity_score': "Active and engaged user",
            'mutual_preference': "Perfect match for your preferences",
            'freshness': "New to the platform"
        }

        return reason_map.get(max_factor[0], "High overall compatibility")

    async def _generate_suggested_opener(self, pick: Dict[str, Any]) -> str:
        """Generate a suggested conversation opener"""
        common_interests = pick.get('common_interests', [])

        if common_interests:
            interest = common_interests[0]
            return f"I noticed you're into {interest}! What got you interested in that?"

        bio = pick.get('bio', '')
        if bio and len(bio) > 20:
            # Extract first interesting fact
            return "I loved reading your profile! What's your favorite thing about..."

        return "Hey! I'd love to get to know you better. What's been the highlight of your week?"

    async def _get_excluded_user_ids(self, user_id: str) -> List[str]:
        """Get list of users to exclude (already swiped, matched, blocked)"""
        # This would query the swipes and matches tables
        # For now, return empty list
        return []

    async def _get_user_profile(self, user_id: str) -> Dict[str, Any]:
        """Get detailed user profile"""
        # This would fetch from user service
        return {
            'user_id': user_id,
            'age': 28,
            'gender': 'male',
            'interests': ['hiking', 'photography', 'travel'],
            'preferences': {
                'min_age': 24,
                'max_age': 34,
                'genders': ['female'],
                'max_distance': 50
            }
        }

    async def _get_detailed_profiles(self, user_ids: List[str]) -> List[Dict[str, Any]]:
        """Get detailed profiles for multiple users"""
        # This would fetch from user service
        return [
            {'user_id': uid, 'age': 27, 'interests': ['music', 'art']}
            for uid in user_ids
        ]

    async def _get_cached_picks(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get cached Top Picks if available"""
        if not self.redis_client:
            return None

        cache_key = f"top_picks:{user_id}:{datetime.utcnow().date()}"

        try:
            cached = await self.redis_client.get(cache_key)
            if cached:
                import json
                return json.loads(cached)
        except Exception as e:
            logger.error("Failed to get cached picks", error=str(e))

        return None

    async def _cache_picks(self, user_id: str, picks: List[Dict[str, Any]]):
        """Cache Top Picks for the day"""
        if not self.redis_client:
            return

        cache_key = f"top_picks:{user_id}:{datetime.utcnow().date()}"

        try:
            import json
            await self.redis_client.setex(
                cache_key,
                self.CACHE_TTL,
                json.dumps(picks, default=str)
            )
        except Exception as e:
            logger.error("Failed to cache picks", error=str(e))

    async def mark_pick_viewed(self, user_id: str, pick_user_id: str):
        """Mark a Top Pick as viewed"""
        logger.info(f"User {user_id} viewed Top Pick {pick_user_id}")
        # Track analytics
        pass

    async def get_top_picks_stats(self, user_id: str) -> Dict[str, Any]:
        """Get statistics about user's Top Picks usage"""
        # Return stats about views, likes, matches from Top Picks
        return {
            'total_picks_received': 0,
            'picks_viewed': 0,
            'picks_liked': 0,
            'matches_from_picks': 0,
            'match_rate': 0.0
        }
