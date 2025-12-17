"""Hybrid recommendation engine combining collaborative and content-based filtering."""

import numpy as np
from typing import Dict, List, Tuple, Optional
from .collaborative_filter import CollaborativeFilter
from .content_based_filter import ContentBasedFilter
from .feature_extractor import FeatureExtractor
import logging

logger = logging.getLogger(__name__)


class HybridRecommender:
    """
    Hybrid recommendation system combining multiple approaches.

    Integrates:
    - Collaborative filtering (learn from user behavior)
    - Content-based filtering (profile similarity)
    - Cold-start handling (for new users)
    - Personalized weighting based on user data availability
    """

    def __init__(
        self,
        collaborative_weight: float = 0.5,
        content_weight: float = 0.5,
        min_interactions_for_cf: int = 5
    ):
        """
        Initialize hybrid recommender.

        Args:
            collaborative_weight: Weight for collaborative filtering
            content_weight: Weight for content-based filtering
            min_interactions_for_cf: Minimum interactions needed to use CF
        """
        self.collaborative_weight = collaborative_weight
        self.content_weight = content_weight
        self.min_interactions_for_cf = min_interactions_for_cf

        # Initialize components
        self.feature_extractor = FeatureExtractor()
        self.collaborative_filter = CollaborativeFilter()
        self.content_filter = ContentBasedFilter(self.feature_extractor)

        # User interaction counts for adaptive weighting
        self.user_interaction_counts = {}

        # Performance tracking for dynamic weight adjustment
        self.model_performance = {
            'collaborative': {'total': 0, 'successful': 0},
            'content': {'total': 0, 'successful': 0}
        }

    def fit(
        self,
        profiles: List[Dict],
        interactions: List[Dict],
        user_interactions: Optional[Dict] = None
    ):
        """
        Train hybrid recommender on profile and interaction data.

        Args:
            profiles: List of user profiles
            interactions: List of all interactions for collaborative filtering
            user_interactions: Dict of user_id -> interactions for content-based learning
        """
        logger.info(f"Training hybrid recommender on {len(profiles)} profiles, "
                   f"{len(interactions)} interactions")

        # Count interactions per user
        for interaction in interactions:
            user_id = interaction['user_id']
            self.user_interaction_counts[user_id] = \
                self.user_interaction_counts.get(user_id, 0) + 1

        # Train collaborative filter
        logger.info("Training collaborative filter...")
        self.collaborative_filter.fit(interactions, implicit=True)

        # Train content-based filter
        logger.info("Training content-based filter...")
        self.content_filter.fit(profiles, user_interactions)

        logger.info("Hybrid recommender training completed")

    def predict_score(
        self,
        user_id: str,
        user_profile: Dict,
        target_profile: Dict,
        user_history: Optional[List[Dict]] = None
    ) -> Tuple[float, Dict]:
        """
        Predict compatibility score using hybrid approach.

        Args:
            user_id: User ID
            user_profile: User's profile
            target_profile: Target user's profile
            user_history: Optional interaction history

        Returns:
            Tuple of (score, explanation_dict)
        """
        # Determine adaptive weights based on user's interaction history
        weights = self._calculate_adaptive_weights(user_id)

        # Get collaborative filtering score
        cf_score = 0.0
        if weights['collaborative'] > 0:
            try:
                cf_score = self.collaborative_filter.predict_score(
                    user_id,
                    target_profile['user_id']
                )
            except Exception as e:
                logger.warning(f"Collaborative filtering failed: {e}")
                cf_score = 0.5  # Fallback to neutral

        # Get content-based score
        cb_score = self.content_filter.predict_score(
            user_profile,
            target_profile,
            user_history
        )

        # Combine scores
        final_score = (
            weights['collaborative'] * cf_score +
            weights['content'] * cb_score
        )

        # Generate explanation
        explanation = {
            'final_score': float(final_score),
            'collaborative_score': float(cf_score),
            'content_score': float(cb_score),
            'weights': weights,
            'method': 'hybrid',
            'components': []
        }

        # Add detailed explanations
        if weights['collaborative'] > 0:
            explanation['components'].append({
                'type': 'collaborative',
                'weight': weights['collaborative'],
                'score': float(cf_score),
                'description': 'Based on similar users\' preferences'
            })

        if weights['content'] > 0:
            cb_explanation = self.content_filter._generate_explanation(
                user_profile, target_profile, cb_score
            )
            explanation['components'].append({
                'type': 'content',
                'weight': weights['content'],
                'score': float(cb_score),
                'description': 'Based on profile similarity',
                'factors': cb_explanation.get('factors', [])
            })

        return final_score, explanation

    def recommend(
        self,
        user_id: str,
        user_profile: Dict,
        candidate_profiles: List[Dict],
        n: int = 20,
        diversity_factor: float = 0.1,
        exclude_ids: Optional[List[str]] = None
    ) -> List[Dict]:
        """
        Generate top N recommendations using hybrid approach.

        Args:
            user_id: User ID
            user_profile: User's profile
            candidate_profiles: List of candidate profiles
            n: Number of recommendations
            diversity_factor: Diversity promotion factor
            exclude_ids: User IDs to exclude

        Returns:
            List of recommendation dicts with scores and explanations
        """
        exclude_ids = set(exclude_ids or [])
        exclude_ids.add(user_id)  # Always exclude self

        # Filter candidates
        filtered_candidates = [
            p for p in candidate_profiles
            if p['user_id'] not in exclude_ids
        ]

        # Apply deal-breaker filtering
        filtered_candidates = self._apply_dealbreakers(
            user_profile,
            filtered_candidates
        )

        if not filtered_candidates:
            return []

        # Score all candidates
        scored_candidates = []
        for candidate in filtered_candidates:
            score, explanation = self.predict_score(
                user_id,
                user_profile,
                candidate
            )

            scored_candidates.append({
                'user_id': candidate['user_id'],
                'score': score,
                'explanation': explanation,
                'profile': candidate
            })

        # Sort by score
        scored_candidates.sort(key=lambda x: x['score'], reverse=True)

        # Apply diversity if requested
        if diversity_factor > 0:
            scored_candidates = self._apply_diversity(
                scored_candidates,
                diversity_factor
            )

        # Apply personalized ranking adjustments
        scored_candidates = self._apply_personalized_ranking(
            user_profile,
            scored_candidates
        )

        # Return top N
        recommendations = scored_candidates[:n]

        # Remove profile data from response (keep only metadata)
        for rec in recommendations:
            rec.pop('profile', None)

        return recommendations

    def get_top_picks(
        self,
        user_id: str,
        user_profile: Dict,
        candidate_profiles: List[Dict],
        count: int = 5
    ) -> List[Dict]:
        """
        Get top picks (highest quality matches) for a user.

        Args:
            user_id: User ID
            user_profile: User's profile
            candidate_profiles: Candidate profiles
            count: Number of top picks

        Returns:
            List of top pick recommendations
        """
        # Get recommendations with stricter filtering
        recommendations = self.recommend(
            user_id,
            user_profile,
            candidate_profiles,
            n=count * 3,  # Get more to filter from
            diversity_factor=0.2  # More diversity for top picks
        )

        # Filter for high scores only
        high_quality = [
            rec for rec in recommendations
            if rec['score'] >= 0.7  # Minimum threshold for top picks
        ]

        # Additional quality signals
        for rec in high_quality:
            rec['top_pick_score'] = self._calculate_top_pick_score(rec)

        # Sort by top pick score
        high_quality.sort(key=lambda x: x['top_pick_score'], reverse=True)

        # Return top count
        return high_quality[:count]

    def update_from_feedback(
        self,
        user_id: str,
        target_user_id: str,
        action: str,
        success: bool = False
    ):
        """
        Update model performance tracking from user feedback.

        Args:
            user_id: User who performed action
            target_user_id: Target of action
            action: Action type (like, pass, match, etc.)
            success: Whether recommendation led to positive outcome
        """
        # Track which model would have scored this higher
        try:
            cf_score = self.collaborative_filter.predict_score(user_id, target_user_id)
        except:
            cf_score = 0.5

        # Update performance stats
        if action in ['like', 'super_like', 'match']:
            if cf_score > 0.6:
                self.model_performance['collaborative']['total'] += 1
                if success:
                    self.model_performance['collaborative']['successful'] += 1

        # Increment user interaction count
        self.user_interaction_counts[user_id] = \
            self.user_interaction_counts.get(user_id, 0) + 1

    def _calculate_adaptive_weights(self, user_id: str) -> Dict[str, float]:
        """
        Calculate adaptive weights based on user's interaction history.

        New users get more content-based filtering.
        Experienced users get more collaborative filtering.
        """
        interaction_count = self.user_interaction_counts.get(user_id, 0)

        # Cold start: use only content-based
        if interaction_count < self.min_interactions_for_cf:
            return {
                'collaborative': 0.0,
                'content': 1.0
            }

        # Gradual transition to collaborative filtering
        # Sigmoid function for smooth transition
        max_interactions = 50  # Full weight at 50 interactions
        cf_weight = 1 / (1 + np.exp(-0.1 * (interaction_count - 25)))

        # Adjust based on model performance
        cf_performance = self._get_model_performance('collaborative')
        cb_performance = self._get_model_performance('content')

        if cf_performance > 0 and cb_performance > 0:
            # Boost better performing model
            performance_ratio = cf_performance / (cf_performance + cb_performance)
            cf_weight = 0.3 * cf_weight + 0.7 * performance_ratio

        # Normalize weights
        cf_weight = np.clip(cf_weight, 0.0, 1.0)
        cb_weight = 1.0 - cf_weight

        # Apply base weights
        cf_weight *= self.collaborative_weight / (self.collaborative_weight + self.content_weight)
        cb_weight *= self.content_weight / (self.collaborative_weight + self.content_weight)

        return {
            'collaborative': cf_weight,
            'content': cb_weight
        }

    def _apply_dealbreakers(
        self,
        user_profile: Dict,
        candidates: List[Dict]
    ) -> List[Dict]:
        """Filter out candidates that violate user's deal-breakers."""
        preferences = user_profile.get('preferences', {})
        dealbreakers = preferences.get('dealbreakers', [])

        if not dealbreakers:
            return candidates

        filtered = []
        for candidate in candidates:
            candidate_attrs = set(candidate.get('attributes', []))

            # Check if any dealbreaker is present
            has_dealbreaker = any(db in candidate_attrs for db in dealbreakers)

            if not has_dealbreaker:
                filtered.append(candidate)

        logger.info(f"Dealbreaker filtering: {len(candidates)} -> {len(filtered)} candidates")
        return filtered

    def _apply_diversity(
        self,
        scored_candidates: List[Dict],
        diversity_factor: float
    ) -> List[Dict]:
        """Apply diversity to avoid filter bubble using MMR."""
        if len(scored_candidates) <= 1:
            return scored_candidates

        # Extract features for all candidates
        candidate_features = {}
        for item in scored_candidates:
            features = self.feature_extractor.extract_profile_features(
                item.get('profile', {})
            )
            candidate_features[item['user_id']] = features

        # Maximal Marginal Relevance
        diversified = []
        remaining = list(scored_candidates)

        # Add highest scoring first
        diversified.append(remaining.pop(0))

        while remaining:
            best_mmr_score = -float('inf')
            best_idx = 0

            for idx, item in enumerate(remaining):
                user_id = item['user_id']
                relevance = item['score']

                # Calculate max similarity to selected items
                max_similarity = 0.0
                for selected in diversified:
                    selected_id = selected['user_id']

                    if user_id in candidate_features and selected_id in candidate_features:
                        from sklearn.metrics.pairwise import cosine_similarity
                        similarity = cosine_similarity(
                            candidate_features[user_id].reshape(1, -1),
                            candidate_features[selected_id].reshape(1, -1)
                        )[0, 0]
                        max_similarity = max(max_similarity, similarity)

                # MMR score
                mmr_score = relevance - diversity_factor * max_similarity

                if mmr_score > best_mmr_score:
                    best_mmr_score = mmr_score
                    best_idx = idx

            diversified.append(remaining.pop(best_idx))

        return diversified

    def _apply_personalized_ranking(
        self,
        user_profile: Dict,
        candidates: List[Dict]
    ) -> List[Dict]:
        """
        Apply personalized ranking adjustments based on user preferences.

        Boosts/penalties based on:
        - Activity level (boost active users)
        - Verification status
        - Response rate
        - Photo quality/count
        """
        for candidate in candidates:
            profile = candidate.get('profile', {})
            boost_factor = 1.0

            # Boost verified profiles slightly
            if profile.get('is_verified', False):
                boost_factor *= 1.05

            # Boost recently active users
            last_active = profile.get('last_active_at')
            if last_active:
                # Would need actual date parsing here
                boost_factor *= 1.03

            # Boost high response rate
            response_rate = profile.get('response_rate', 0.5)
            if response_rate > 0.7:
                boost_factor *= 1.02

            # Boost complete profiles
            completeness = profile.get('completeness_score', 0.5)
            boost_factor *= (0.95 + 0.1 * completeness)

            # Penalty for low photo count
            photo_count = profile.get('photo_count', 1)
            if photo_count < 3:
                boost_factor *= 0.95

            # Apply boost
            candidate['score'] *= boost_factor
            candidate['ranking_boost'] = boost_factor

        # Re-sort after boosts
        candidates.sort(key=lambda x: x['score'], reverse=True)

        return candidates

    def _calculate_top_pick_score(self, recommendation: Dict) -> float:
        """Calculate special score for top picks."""
        base_score = recommendation['score']

        # Bonus factors for top picks
        bonus = 0.0

        explanation = recommendation.get('explanation', {})
        factors = explanation.get('components', [])

        # Bonus for strong collaborative signal
        for factor in factors:
            if factor['type'] == 'collaborative' and factor['score'] > 0.75:
                bonus += 0.1

        # Bonus for many match factors
        content_factors = next(
            (f for f in factors if f['type'] == 'content'),
            {}
        )
        if len(content_factors.get('factors', [])) >= 3:
            bonus += 0.05

        return base_score + bonus

    def _get_model_performance(self, model_name: str) -> float:
        """Get performance score for a model."""
        stats = self.model_performance.get(model_name, {})
        total = stats.get('total', 0)
        successful = stats.get('successful', 0)

        if total == 0:
            return 0.5  # Default neutral performance

        return successful / total

    def get_stats(self) -> Dict:
        """Get statistics about the hybrid recommender."""
        return {
            'total_users': len(self.user_interaction_counts),
            'avg_interactions_per_user': np.mean(list(self.user_interaction_counts.values())) \
                if self.user_interaction_counts else 0,
            'cold_start_users': sum(
                1 for count in self.user_interaction_counts.values()
                if count < self.min_interactions_for_cf
            ),
            'model_performance': self.model_performance,
            'collaborative_weight': self.collaborative_weight,
            'content_weight': self.content_weight
        }
