"""Content-based filtering using profile attributes and preferences."""

import numpy as np
from typing import Dict, List, Tuple, Optional
from sklearn.metrics.pairwise import cosine_similarity
from .feature_extractor import FeatureExtractor
import logging

logger = logging.getLogger(__name__)


class ContentBasedFilter:
    """
    Content-based filtering recommendation system.

    Recommends profiles based on similarity to user's preferences
    and past interactions using profile attributes.
    """

    def __init__(self, feature_extractor: Optional[FeatureExtractor] = None):
        """
        Initialize content-based filter.

        Args:
            feature_extractor: Feature extractor instance (creates new if None)
        """
        self.feature_extractor = feature_extractor or FeatureExtractor()
        self.profile_features = {}  # Cache of profile features
        self.user_preference_profiles = {}  # Learned user preferences

    def fit(self, profiles: List[Dict], user_interactions: Optional[Dict] = None):
        """
        Train content-based filter.

        Args:
            profiles: List of user profiles
            user_interactions: Optional dict of user_id -> list of interactions
                               to learn preferences from
        """
        logger.info(f"Training content-based filter on {len(profiles)} profiles")

        # Fit feature extractor
        self.feature_extractor.fit(profiles)

        # Extract and cache features for all profiles
        for profile in profiles:
            user_id = profile['user_id']
            features = self.feature_extractor.extract_profile_features(profile)
            self.profile_features[user_id] = features

        # Learn user preference profiles from interactions
        if user_interactions:
            self._learn_user_preferences(user_interactions)

        logger.info("Content-based filter training completed")

    def predict_score(
        self,
        user_profile: Dict,
        target_profile: Dict,
        user_history: Optional[List[Dict]] = None
    ) -> float:
        """
        Predict compatibility score between user and target.

        Args:
            user_profile: Source user's profile
            target_profile: Target user's profile
            user_history: Optional interaction history for personalization

        Returns:
            Predicted compatibility score (0-1)
        """
        # Extract features
        user_features = self.feature_extractor.extract_profile_features(user_profile)
        target_features = self.feature_extractor.extract_profile_features(target_profile)

        # Calculate base similarity
        base_score = self._calculate_profile_similarity(user_features, target_features)

        # Calculate preference match
        preference_score = self._calculate_preference_match(user_profile, target_profile)

        # Calculate interaction features if history available
        interaction_score = 0.0
        if user_history:
            interaction_features = self.feature_extractor.extract_interaction_features(
                user_profile, target_profile
            )
            interaction_score = self._score_interaction_features(interaction_features)

        # Weighted combination
        weights = {
            'base_similarity': 0.3,
            'preference_match': 0.5,
            'interaction': 0.2
        }

        final_score = (
            weights['base_similarity'] * base_score +
            weights['preference_match'] * preference_score +
            weights['interaction'] * interaction_score
        )

        return np.clip(final_score, 0.0, 1.0)

    def recommend_for_user(
        self,
        user_profile: Dict,
        candidate_profiles: List[Dict],
        n: int = 20,
        diversity_factor: float = 0.1
    ) -> List[Tuple[str, float, Dict]]:
        """
        Recommend top N profiles for a user.

        Args:
            user_profile: User's profile
            candidate_profiles: List of candidate profiles to rank
            n: Number of recommendations
            diversity_factor: How much to promote diversity (0-1)

        Returns:
            List of (user_id, score, explanation) tuples
        """
        # Score all candidates
        scored_candidates = []
        for candidate in candidate_profiles:
            score = self.predict_score(user_profile, candidate)

            # Generate explanation
            explanation = self._generate_explanation(user_profile, candidate, score)

            scored_candidates.append((
                candidate['user_id'],
                score,
                explanation
            ))

        # Sort by score
        scored_candidates.sort(key=lambda x: x[1], reverse=True)

        # Apply diversity if requested
        if diversity_factor > 0:
            scored_candidates = self._diversify_recommendations(
                scored_candidates,
                candidate_profiles,
                diversity_factor
            )

        return scored_candidates[:n]

    def find_similar_profiles(
        self,
        reference_profile: Dict,
        candidate_profiles: List[Dict],
        n: int = 10
    ) -> List[Tuple[str, float]]:
        """
        Find profiles most similar to a reference profile.

        Args:
            reference_profile: Reference profile
            candidate_profiles: Candidates to compare against
            n: Number of results

        Returns:
            List of (user_id, similarity_score) tuples
        """
        ref_features = self.feature_extractor.extract_profile_features(reference_profile)

        similarities = []
        for candidate in candidate_profiles:
            if candidate['user_id'] == reference_profile['user_id']:
                continue

            cand_features = self.feature_extractor.extract_profile_features(candidate)
            similarity = self._calculate_profile_similarity(ref_features, cand_features)

            similarities.append((candidate['user_id'], similarity))

        similarities.sort(key=lambda x: x[1], reverse=True)
        return similarities[:n]

    def update_user_preference_profile(
        self,
        user_id: str,
        interactions: List[Dict]
    ):
        """
        Update learned preference profile for a user based on interactions.

        Args:
            user_id: User ID
            interactions: List of interaction dicts with:
                - target_user_id: Who they interacted with
                - action: Type of action (like, pass, etc.)
                - target_profile: Target user's profile
        """
        if not interactions:
            return

        # Separate positive and negative interactions
        positive_profiles = []
        negative_profiles = []

        for interaction in interactions:
            action = interaction.get('action', 'like')
            target_profile = interaction.get('target_profile')

            if not target_profile:
                continue

            if action in ['like', 'super_like', 'match', 'message']:
                positive_profiles.append(target_profile)
            elif action == 'pass':
                negative_profiles.append(target_profile)

        # Extract features for positive and negative examples
        positive_features = [
            self.feature_extractor.extract_profile_features(p)
            for p in positive_profiles
        ]
        negative_features = [
            self.feature_extractor.extract_profile_features(p)
            for p in negative_profiles
        ]

        # Create preference profile as difference between liked and passed
        if positive_features:
            positive_mean = np.mean(positive_features, axis=0)
        else:
            positive_mean = np.zeros(len(positive_features[0]) if positive_features else 48)

        if negative_features:
            negative_mean = np.mean(negative_features, axis=0)
        else:
            negative_mean = np.zeros_like(positive_mean)

        # Preference profile emphasizes what user likes vs dislikes
        preference_profile = positive_mean - 0.3 * negative_mean

        self.user_preference_profiles[user_id] = {
            'profile': preference_profile,
            'positive_count': len(positive_profiles),
            'negative_count': len(negative_profiles),
            'updated_at': np.datetime64('now')
        }

        logger.info(f"Updated preference profile for user {user_id}: "
                   f"{len(positive_profiles)} positive, {len(negative_profiles)} negative")

    def get_user_preferences(self, user_id: str) -> Optional[Dict]:
        """Get learned preference profile for a user."""
        return self.user_preference_profiles.get(user_id)

    def _calculate_profile_similarity(
        self,
        features1: np.ndarray,
        features2: np.ndarray
    ) -> float:
        """Calculate cosine similarity between profile features."""
        similarity = cosine_similarity(
            features1.reshape(1, -1),
            features2.reshape(1, -1)
        )[0, 0]

        # Normalize to 0-1
        return (similarity + 1) / 2

    def _calculate_preference_match(
        self,
        user_profile: Dict,
        target_profile: Dict
    ) -> float:
        """
        Calculate how well target matches user's stated preferences.

        Returns score from 0-1 based on deal-breakers and preferences.
        """
        score = 1.0
        preferences = user_profile.get('preferences', {})

        # Age preference (critical)
        age_min = preferences.get('age_min', 18)
        age_max = preferences.get('age_max', 99)
        target_age = target_profile.get('age', 25)

        if not (age_min <= target_age <= age_max):
            score *= 0.2  # Heavy penalty for age mismatch
        else:
            # Bonus for being in optimal range
            age_range = age_max - age_min
            distance_from_center = abs(target_age - (age_min + age_max) / 2)
            age_score = 1.0 - (distance_from_center / (age_range / 2))
            score *= (0.7 + 0.3 * age_score)

        # Gender preference (critical)
        gender_pref = preferences.get('gender_preference', 'all')
        target_gender = target_profile.get('gender', 'other')

        if gender_pref != 'all' and target_gender != gender_pref:
            score *= 0.1  # Heavy penalty for gender mismatch

        # Distance preference
        max_distance = preferences.get('max_distance_km', 100)
        actual_distance = self._calculate_distance(
            user_profile.get('location', {}),
            target_profile.get('location', {})
        )

        if actual_distance > max_distance:
            score *= 0.3  # Penalty for being too far
        else:
            # Bonus for being close
            distance_score = 1.0 - (actual_distance / max_distance)
            score *= (0.8 + 0.2 * distance_score)

        # Interest overlap preference
        min_shared_interests = preferences.get('min_shared_interests', 0)
        user_interests = set(user_profile.get('interests', []))
        target_interests = set(target_profile.get('interests', []))
        shared_interests = len(user_interests & target_interests)

        if shared_interests < min_shared_interests:
            score *= 0.5

        # Deal-breakers
        dealbreakers = preferences.get('dealbreakers', [])
        target_attributes = set(target_profile.get('attributes', []))

        if any(db in target_attributes for db in dealbreakers):
            score *= 0.1  # Heavy penalty for deal-breaker match

        # Required attributes
        required_attrs = preferences.get('required_attributes', [])
        if required_attrs:
            matches = sum(1 for attr in required_attrs if attr in target_attributes)
            score *= (matches / len(required_attrs))

        return np.clip(score, 0.0, 1.0)

    def _score_interaction_features(self, features: np.ndarray) -> float:
        """Score interaction features."""
        # Simplified scoring - in production, use trained model
        # High-value features: similarity, common interests, mutual preferences
        if len(features) >= 4:
            similarity_score = features[0]  # Interest similarity
            common_interests = features[1]  # Common interest count
            age_similarity = features[2]  # Age similarity

            return (similarity_score + common_interests + age_similarity) / 3

        return 0.5

    def _generate_explanation(
        self,
        user_profile: Dict,
        target_profile: Dict,
        score: float
    ) -> Dict:
        """Generate explanation for recommendation."""
        explanation = {
            'score': float(score),
            'factors': []
        }

        # Common interests
        user_interests = set(user_profile.get('interests', []))
        target_interests = set(target_profile.get('interests', []))
        common = user_interests & target_interests

        if common:
            explanation['factors'].append({
                'type': 'interests',
                'value': len(common),
                'description': f"{len(common)} shared interests"
            })

        # Distance
        distance = self._calculate_distance(
            user_profile.get('location', {}),
            target_profile.get('location', {})
        )
        if distance < 10:
            explanation['factors'].append({
                'type': 'distance',
                'value': distance,
                'description': 'Very close location'
            })
        elif distance < 25:
            explanation['factors'].append({
                'type': 'distance',
                'value': distance,
                'description': 'Nearby location'
            })

        # Age compatibility
        age_diff = abs(user_profile.get('age', 25) - target_profile.get('age', 25))
        if age_diff <= 3:
            explanation['factors'].append({
                'type': 'age',
                'value': age_diff,
                'description': 'Similar age'
            })

        # Education match
        if user_profile.get('education') == target_profile.get('education'):
            explanation['factors'].append({
                'type': 'education',
                'value': 1.0,
                'description': 'Same education level'
            })

        # Relationship goals
        if user_profile.get('relationship_goal') == target_profile.get('relationship_goal'):
            explanation['factors'].append({
                'type': 'goals',
                'value': 1.0,
                'description': 'Same relationship goals'
            })

        return explanation

    def _diversify_recommendations(
        self,
        scored_candidates: List[Tuple[str, float, Dict]],
        all_profiles: List[Dict],
        diversity_factor: float
    ) -> List[Tuple[str, float, Dict]]:
        """
        Apply diversity to recommendations to avoid filter bubble.

        Uses Maximal Marginal Relevance (MMR) approach.
        """
        if diversity_factor == 0 or len(scored_candidates) <= 1:
            return scored_candidates

        # Create profile lookup
        profile_lookup = {p['user_id']: p for p in all_profiles}

        # Extract features for all candidates
        candidate_features = {}
        for user_id, _, _ in scored_candidates:
            if user_id in profile_lookup:
                features = self.feature_extractor.extract_profile_features(
                    profile_lookup[user_id]
                )
                candidate_features[user_id] = features

        # MMR: select items that are relevant but dissimilar to already selected
        diversified = []
        remaining = list(scored_candidates)

        # Add highest scoring item first
        diversified.append(remaining.pop(0))

        while remaining and len(diversified) < len(scored_candidates):
            best_mmr_score = -float('inf')
            best_idx = 0

            for idx, (user_id, relevance, explanation) in enumerate(remaining):
                if user_id not in candidate_features:
                    continue

                # Calculate max similarity to already selected items
                max_similarity = 0.0
                for selected_id, _, _ in diversified:
                    if selected_id not in candidate_features:
                        continue

                    similarity = cosine_similarity(
                        candidate_features[user_id].reshape(1, -1),
                        candidate_features[selected_id].reshape(1, -1)
                    )[0, 0]
                    max_similarity = max(max_similarity, similarity)

                # MMR score: relevance - diversity_factor * max_similarity
                mmr_score = relevance - diversity_factor * max_similarity

                if mmr_score > best_mmr_score:
                    best_mmr_score = mmr_score
                    best_idx = idx

            diversified.append(remaining.pop(best_idx))

        return diversified

    def _learn_user_preferences(self, user_interactions: Dict):
        """Learn user preference profiles from interaction history."""
        for user_id, interactions in user_interactions.items():
            self.update_user_preference_profile(user_id, interactions)

    @staticmethod
    def _calculate_distance(loc1: Dict, loc2: Dict) -> float:
        """Calculate distance between two locations in kilometers."""
        if not loc1 or not loc2:
            return 999.0

        from math import radians, sin, cos, sqrt, atan2

        lat1 = loc1.get('latitude', 0)
        lon1 = loc1.get('longitude', 0)
        lat2 = loc2.get('latitude', 0)
        lon2 = loc2.get('longitude', 0)

        R = 6371.0  # Earth's radius in km

        lat1_rad = radians(lat1)
        lon1_rad = radians(lon1)
        lat2_rad = radians(lat2)
        lon2_rad = radians(lon2)

        dlat = lat2_rad - lat1_rad
        dlon = lon2_rad - lon1_rad

        a = sin(dlat / 2)**2 + cos(lat1_rad) * cos(lat2_rad) * sin(dlon / 2)**2
        c = 2 * atan2(sqrt(a), sqrt(1 - a))

        return R * c
