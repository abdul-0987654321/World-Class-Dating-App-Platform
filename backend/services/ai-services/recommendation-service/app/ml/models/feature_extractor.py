"""Feature extraction from user profiles for ML models."""

import numpy as np
from typing import Dict, List, Any, Optional
from datetime import datetime
import hashlib
from sklearn.preprocessing import StandardScaler, LabelEncoder
from collections import Counter


class FeatureExtractor:
    """Extract and engineer features from user profiles for ML models."""

    def __init__(self):
        """Initialize feature extractor."""
        self.interest_encoder = {}
        self.interest_index = 0
        self.scaler = StandardScaler()
        self.is_fitted = False

    def extract_profile_features(self, profile: Dict[str, Any]) -> np.ndarray:
        """
        Extract comprehensive features from user profile.

        Args:
            profile: User profile dictionary

        Returns:
            Feature vector as numpy array
        """
        features = []

        # Demographic features
        features.extend(self._extract_demographic_features(profile))

        # Location features
        features.extend(self._extract_location_features(profile))

        # Interest features
        features.extend(self._extract_interest_features(profile))

        # Profile completeness features
        features.extend(self._extract_completeness_features(profile))

        # Behavioral features (if available)
        features.extend(self._extract_behavioral_features(profile))

        # Text features (bio analysis)
        features.extend(self._extract_text_features(profile))

        return np.array(features, dtype=np.float32)

    def extract_interaction_features(
        self,
        user1_profile: Dict[str, Any],
        user2_profile: Dict[str, Any],
        interaction_history: Optional[Dict[str, Any]] = None
    ) -> np.ndarray:
        """
        Extract features representing interaction between two users.

        Args:
            user1_profile: First user's profile
            user2_profile: Second user's profile
            interaction_history: Optional past interaction data

        Returns:
            Interaction feature vector
        """
        features = []

        # Similarity features
        features.extend(self._calculate_similarity_features(user1_profile, user2_profile))

        # Compatibility features
        features.extend(self._calculate_compatibility_features(user1_profile, user2_profile))

        # Distance features
        features.extend(self._calculate_distance_features(user1_profile, user2_profile))

        # Interaction history features
        if interaction_history:
            features.extend(self._extract_history_features(interaction_history))
        else:
            features.extend([0.0] * 10)  # Placeholder for no history

        return np.array(features, dtype=np.float32)

    def _extract_demographic_features(self, profile: Dict[str, Any]) -> List[float]:
        """Extract demographic features."""
        features = []

        # Age (normalized)
        age = profile.get('age', 25)
        features.append(age / 100.0)
        features.append((age ** 2) / 10000.0)  # Age squared for non-linear patterns

        # Gender (one-hot encoding)
        gender = profile.get('gender', 'other')
        features.extend([
            1.0 if gender == 'male' else 0.0,
            1.0 if gender == 'female' else 0.0,
            1.0 if gender == 'non_binary' else 0.0,
            1.0 if gender == 'other' else 0.0
        ])

        # Relationship goals (one-hot)
        relationship_goal = profile.get('relationship_goal', 'casual')
        features.extend([
            1.0 if relationship_goal == 'serious' else 0.0,
            1.0 if relationship_goal == 'casual' else 0.0,
            1.0 if relationship_goal == 'friendship' else 0.0,
            1.0 if relationship_goal == 'open' else 0.0
        ])

        # Education level
        education = profile.get('education', 'unknown')
        education_map = {
            'high_school': 1, 'some_college': 2, 'bachelors': 3,
            'masters': 4, 'phd': 5, 'unknown': 0
        }
        features.append(education_map.get(education, 0) / 5.0)

        return features

    def _extract_location_features(self, profile: Dict[str, Any]) -> List[float]:
        """Extract location-based features."""
        features = []

        location = profile.get('location', {})

        # Latitude and longitude (normalized)
        lat = location.get('latitude', 0.0)
        lon = location.get('longitude', 0.0)
        features.append(lat / 90.0)
        features.append(lon / 180.0)

        # City/urban indicator (if available)
        city_size = profile.get('city_size', 'medium')
        features.extend([
            1.0 if city_size == 'large' else 0.0,
            1.0 if city_size == 'medium' else 0.0,
            1.0 if city_size == 'small' else 0.0
        ])

        return features

    def _extract_interest_features(self, profile: Dict[str, Any]) -> List[float]:
        """Extract interest-based features using multi-hot encoding."""
        # Common interests vocabulary (expandable)
        interest_categories = {
            'sports': ['hiking', 'running', 'gym', 'yoga', 'cycling', 'swimming', 'sports'],
            'arts': ['music', 'art', 'photography', 'painting', 'drawing', 'dancing'],
            'intellectual': ['reading', 'writing', 'science', 'learning', 'education'],
            'social': ['partying', 'socializing', 'networking', 'events'],
            'entertainment': ['movies', 'tv', 'gaming', 'theater', 'concerts'],
            'food': ['cooking', 'foodie', 'restaurants', 'baking'],
            'travel': ['travel', 'adventure', 'exploring', 'backpacking'],
            'nature': ['outdoors', 'camping', 'nature', 'animals', 'pets'],
            'technology': ['tech', 'coding', 'gadgets', 'engineering'],
            'wellness': ['meditation', 'mindfulness', 'wellness', 'health']
        }

        user_interests = set([i.lower() for i in profile.get('interests', [])])

        # Category-level features
        features = []
        for category, keywords in interest_categories.items():
            # Check if user has interests in this category
            has_interest = any(interest in user_interests for interest in keywords)
            features.append(1.0 if has_interest else 0.0)

        # Interest count (normalized)
        features.append(min(len(user_interests), 20) / 20.0)

        # Interest diversity (number of different categories)
        categories_count = sum(features[:-1])
        features.append(categories_count / len(interest_categories))

        return features

    def _extract_completeness_features(self, profile: Dict[str, Any]) -> List[float]:
        """Extract profile completeness features."""
        features = []

        # Bio completeness
        bio = profile.get('bio', '')
        features.append(min(len(bio), 500) / 500.0)
        features.append(1.0 if len(bio) > 50 else 0.0)

        # Photo count (assuming this data is available)
        photo_count = profile.get('photo_count', 0)
        features.append(min(photo_count, 9) / 9.0)

        # Profile verification
        features.append(1.0 if profile.get('is_verified', False) else 0.0)

        # Premium status
        features.append(1.0 if profile.get('is_premium', False) else 0.0)

        # Profile completeness score
        completeness_score = profile.get('completeness_score', 0.5)
        features.append(completeness_score)

        # Account age (days since creation, normalized)
        created_at = profile.get('created_at')
        if created_at:
            if isinstance(created_at, str):
                created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
            days_since_creation = (datetime.now() - created_at).days
            features.append(min(days_since_creation, 365) / 365.0)
        else:
            features.append(0.0)

        return features

    def _extract_behavioral_features(self, profile: Dict[str, Any]) -> List[float]:
        """Extract behavioral and activity features."""
        features = []

        # Activity level
        last_active = profile.get('last_active_at')
        if last_active:
            if isinstance(last_active, str):
                last_active = datetime.fromisoformat(last_active.replace('Z', '+00:00'))
            hours_since_active = (datetime.now() - last_active).total_seconds() / 3600
            # Normalize: 0 = just now, 1 = >7 days ago
            features.append(min(hours_since_active, 168) / 168.0)
        else:
            features.append(1.0)

        # Response rate (if available)
        response_rate = profile.get('response_rate', 0.5)
        features.append(response_rate)

        # Average response time (normalized to hours)
        avg_response_time = profile.get('avg_response_time_minutes', 120)
        features.append(min(avg_response_time, 1440) / 1440.0)

        # Selectivity (like rate)
        like_rate = profile.get('like_rate', 0.3)
        features.append(like_rate)

        # Match conversion rate
        match_rate = profile.get('match_rate', 0.1)
        features.append(match_rate)

        return features

    def _extract_text_features(self, profile: Dict[str, Any]) -> List[float]:
        """Extract text-based features from bio."""
        features = []

        bio = profile.get('bio', '').lower()

        # Sentiment indicators (simple keyword matching)
        positive_keywords = ['love', 'enjoy', 'passionate', 'excited', 'happy', 'fun']
        negative_keywords = ['don\'t', 'not', 'hate', 'dislike', 'avoid']

        positive_count = sum(1 for word in positive_keywords if word in bio)
        negative_count = sum(1 for word in negative_keywords if word in bio)

        features.append(min(positive_count, 5) / 5.0)
        features.append(min(negative_count, 5) / 5.0)

        # Bio length categories
        bio_length = len(bio)
        features.extend([
            1.0 if bio_length < 50 else 0.0,
            1.0 if 50 <= bio_length < 200 else 0.0,
            1.0 if bio_length >= 200 else 0.0
        ])

        # Emoji usage
        emoji_count = sum(1 for char in bio if ord(char) > 127000)
        features.append(min(emoji_count, 10) / 10.0)

        return features

    def _calculate_similarity_features(
        self,
        profile1: Dict[str, Any],
        profile2: Dict[str, Any]
    ) -> List[float]:
        """Calculate similarity features between two profiles."""
        features = []

        # Interest overlap (Jaccard similarity)
        interests1 = set([i.lower() for i in profile1.get('interests', [])])
        interests2 = set([i.lower() for i in profile2.get('interests', [])])

        if interests1 or interests2:
            jaccard = len(interests1 & interests2) / len(interests1 | interests2)
        else:
            jaccard = 0.0
        features.append(jaccard)

        # Common interest count
        features.append(len(interests1 & interests2) / 20.0)

        # Age similarity
        age1 = profile1.get('age', 25)
        age2 = profile2.get('age', 25)
        age_diff = abs(age1 - age2)
        features.append(1.0 - min(age_diff, 20) / 20.0)

        # Education similarity
        education1 = profile1.get('education', 'unknown')
        education2 = profile2.get('education', 'unknown')
        features.append(1.0 if education1 == education2 else 0.0)

        return features

    def _calculate_compatibility_features(
        self,
        profile1: Dict[str, Any],
        profile2: Dict[str, Any]
    ) -> List[float]:
        """Calculate compatibility features based on preferences."""
        features = []

        prefs1 = profile1.get('preferences', {})
        prefs2 = profile2.get('preferences', {})

        # Age preference match
        age1 = profile1.get('age', 25)
        age2 = profile2.get('age', 25)

        age_min1 = prefs1.get('age_min', 18)
        age_max1 = prefs1.get('age_max', 99)
        age_min2 = prefs2.get('age_min', 18)
        age_max2 = prefs2.get('age_max', 99)

        features.append(1.0 if age_min1 <= age2 <= age_max1 else 0.0)
        features.append(1.0 if age_min2 <= age1 <= age_max2 else 0.0)

        # Gender preference match
        gender1 = profile1.get('gender', 'other')
        gender2 = profile2.get('gender', 'other')

        gender_pref1 = prefs1.get('gender_preference', 'all')
        gender_pref2 = prefs2.get('gender_preference', 'all')

        features.append(1.0 if gender_pref1 == 'all' or gender2 == gender_pref1 else 0.0)
        features.append(1.0 if gender_pref2 == 'all' or gender1 == gender_pref2 else 0.0)

        # Relationship goal compatibility
        goal1 = profile1.get('relationship_goal', 'casual')
        goal2 = profile2.get('relationship_goal', 'casual')
        features.append(1.0 if goal1 == goal2 else 0.0)

        return features

    def _calculate_distance_features(
        self,
        profile1: Dict[str, Any],
        profile2: Dict[str, Any]
    ) -> List[float]:
        """Calculate distance-based features."""
        features = []

        loc1 = profile1.get('location', {})
        loc2 = profile2.get('location', {})

        if loc1 and loc2:
            distance = self._haversine_distance(
                loc1.get('latitude', 0),
                loc1.get('longitude', 0),
                loc2.get('latitude', 0),
                loc2.get('longitude', 0)
            )

            # Distance in km (normalized)
            features.append(min(distance, 500) / 500.0)

            # Distance buckets
            features.extend([
                1.0 if distance < 5 else 0.0,
                1.0 if 5 <= distance < 25 else 0.0,
                1.0 if 25 <= distance < 100 else 0.0,
                1.0 if distance >= 100 else 0.0
            ])

            # Distance preference check
            max_dist1 = profile1.get('preferences', {}).get('max_distance_km', 100)
            max_dist2 = profile2.get('preferences', {}).get('max_distance_km', 100)

            features.append(1.0 if distance <= max_dist1 else 0.0)
            features.append(1.0 if distance <= max_dist2 else 0.0)
        else:
            features.extend([0.0] * 7)

        return features

    def _extract_history_features(self, interaction_history: Dict[str, Any]) -> List[float]:
        """Extract features from interaction history."""
        features = []

        # Previous swipe actions
        features.append(1.0 if interaction_history.get('previous_swipe') == 'like' else 0.0)
        features.append(1.0 if interaction_history.get('previous_swipe') == 'super_like' else 0.0)

        # Message history
        message_count = interaction_history.get('message_count', 0)
        features.append(min(message_count, 100) / 100.0)

        # Average message length
        avg_msg_length = interaction_history.get('avg_message_length', 0)
        features.append(min(avg_msg_length, 500) / 500.0)

        # Response time
        avg_response_time = interaction_history.get('avg_response_time_minutes', 0)
        features.append(min(avg_response_time, 1440) / 1440.0)

        # Conversation quality indicators
        features.append(interaction_history.get('emoji_usage', 0.0))
        features.append(interaction_history.get('question_ratio', 0.0))

        # Match duration (if matched)
        match_duration_days = interaction_history.get('match_duration_days', 0)
        features.append(min(match_duration_days, 90) / 90.0)

        # Interaction frequency
        interactions_per_day = interaction_history.get('interactions_per_day', 0)
        features.append(min(interactions_per_day, 50) / 50.0)

        # Mutual engagement
        features.append(interaction_history.get('mutual_engagement_score', 0.0))

        return features

    @staticmethod
    def _haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate distance between two coordinates in kilometers."""
        from math import radians, sin, cos, sqrt, atan2

        R = 6371.0  # Earth's radius in kilometers

        lat1_rad = radians(lat1)
        lon1_rad = radians(lon1)
        lat2_rad = radians(lat2)
        lon2_rad = radians(lon2)

        dlat = lat2_rad - lat1_rad
        dlon = lon2_rad - lon1_rad

        a = sin(dlat / 2)**2 + cos(lat1_rad) * cos(lat2_rad) * sin(dlon / 2)**2
        c = 2 * atan2(sqrt(a), sqrt(1 - a))

        return R * c

    def fit(self, profiles: List[Dict[str, Any]]):
        """
        Fit the feature extractor on a dataset of profiles.

        Args:
            profiles: List of user profiles
        """
        # Extract features from all profiles
        features_list = [self.extract_profile_features(p) for p in profiles]
        features_array = np.array(features_list)

        # Fit scaler
        self.scaler.fit(features_array)
        self.is_fitted = True

    def transform(self, features: np.ndarray) -> np.ndarray:
        """
        Transform features using fitted scaler.

        Args:
            features: Raw features

        Returns:
            Scaled features
        """
        if not self.is_fitted:
            return features
        return self.scaler.transform(features.reshape(1, -1)).flatten()

    def get_feature_names(self) -> List[str]:
        """Get names of all extracted features."""
        return [
            # Demographic (13)
            'age_normalized', 'age_squared',
            'gender_male', 'gender_female', 'gender_non_binary', 'gender_other',
            'relationship_serious', 'relationship_casual', 'relationship_friendship', 'relationship_open',
            'education_level',
            # Location (5)
            'latitude', 'longitude',
            'city_large', 'city_medium', 'city_small',
            # Interests (12)
            'interest_sports', 'interest_arts', 'interest_intellectual', 'interest_social',
            'interest_entertainment', 'interest_food', 'interest_travel', 'interest_nature',
            'interest_technology', 'interest_wellness',
            'interest_count', 'interest_diversity',
            # Completeness (7)
            'bio_length', 'bio_substantial',
            'photo_count', 'is_verified', 'is_premium',
            'completeness_score', 'account_age',
            # Behavioral (5)
            'hours_since_active', 'response_rate', 'avg_response_time',
            'like_rate', 'match_rate',
            # Text features (6)
            'positive_sentiment', 'negative_sentiment',
            'bio_short', 'bio_medium', 'bio_long',
            'emoji_usage'
        ]
