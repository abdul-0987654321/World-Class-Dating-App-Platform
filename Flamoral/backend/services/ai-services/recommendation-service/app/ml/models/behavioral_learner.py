"""Behavioral learning system for user swipe patterns and engagement signals."""

import numpy as np
from typing import Dict, List, Optional, Tuple
from collections import defaultdict, Counter
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


class BehavioralLearner:
    """
    Learn from user behavior patterns to improve recommendations.

    Analyzes:
    - Swipe patterns (likes, passes, super likes)
    - Message engagement (response rate, conversation quality)
    - Match success indicators
    - Photo preference analysis
    - Temporal patterns (time of day, day of week)
    """

    def __init__(self):
        """Initialize behavioral learner."""
        # User behavior profiles
        self.user_behaviors = {}

        # Aggregate patterns
        self.swipe_patterns = defaultdict(lambda: {
            'total_swipes': 0,
            'likes': 0,
            'passes': 0,
            'super_likes': 0,
            'like_rate': 0.0
        })

        self.engagement_patterns = defaultdict(lambda: {
            'matches': 0,
            'messages_sent': 0,
            'messages_received': 0,
            'response_rate': 0.0,
            'avg_conversation_length': 0.0,
            'successful_matches': 0
        })

        self.photo_preferences = defaultdict(lambda: {
            'liked_photo_positions': Counter(),
            'total_photos_viewed': 0,
            'avg_photos_per_profile': 0.0
        })

        self.temporal_patterns = defaultdict(lambda: {
            'active_hours': Counter(),
            'active_days': Counter(),
            'swipe_velocity': []  # Swipes per session
        })

    def learn_from_swipe(
        self,
        user_id: str,
        target_user_id: str,
        action: str,
        target_profile: Dict,
        context: Optional[Dict] = None
    ):
        """
        Learn from a swipe action.

        Args:
            user_id: User who swiped
            target_user_id: User who was swiped on
            action: Type of swipe (like, pass, super_like)
            target_profile: Profile of target user
            context: Additional context (time, photo position, etc.)
        """
        # Update swipe patterns
        patterns = self.swipe_patterns[user_id]
        patterns['total_swipes'] += 1

        if action == 'like':
            patterns['likes'] += 1
        elif action == 'pass':
            patterns['passes'] += 1
        elif action == 'super_like':
            patterns['super_likes'] += 1

        patterns['like_rate'] = patterns['likes'] / patterns['total_swipes']

        # Initialize user behavior profile if needed
        if user_id not in self.user_behaviors:
            self.user_behaviors[user_id] = {
                'liked_profiles': [],
                'passed_profiles': [],
                'liked_features': defaultdict(int),
                'passed_features': defaultdict(int),
                'preferences_learned': {}
            }

        behavior = self.user_behaviors[user_id]

        # Store profile for pattern analysis
        if action in ['like', 'super_like']:
            behavior['liked_profiles'].append(target_profile)
            self._extract_liked_features(behavior, target_profile)
        elif action == 'pass':
            behavior['passed_profiles'].append(target_profile)
            self._extract_passed_features(behavior, target_profile)

        # Learn photo preferences if context available
        if context and 'photo_position' in context:
            photo_prefs = self.photo_preferences[user_id]
            photo_prefs['total_photos_viewed'] += 1

            if action in ['like', 'super_like']:
                photo_prefs['liked_photo_positions'][context['photo_position']] += 1

        # Learn temporal patterns
        if context and 'timestamp' in context:
            self._update_temporal_patterns(user_id, context['timestamp'])

        # Periodically update learned preferences
        if patterns['total_swipes'] % 10 == 0:
            self._update_learned_preferences(user_id)

    def learn_from_match(
        self,
        user_id: str,
        matched_user_id: str,
        matched_profile: Dict,
        match_quality_score: Optional[float] = None
    ):
        """
        Learn from successful match.

        Args:
            user_id: User ID
            matched_user_id: ID of matched user
            matched_profile: Profile of matched user
            match_quality_score: Optional quality score
        """
        engagement = self.engagement_patterns[user_id]
        engagement['matches'] += 1

        # Store successful match profile for learning
        if user_id in self.user_behaviors:
            behavior = self.user_behaviors[user_id]
            behavior['liked_profiles'].append(matched_profile)
            self._extract_liked_features(behavior, matched_profile, weight=2.0)

    def learn_from_message(
        self,
        user_id: str,
        matched_user_id: str,
        is_sender: bool,
        message_data: Dict
    ):
        """
        Learn from messaging behavior.

        Args:
            user_id: User ID
            matched_user_id: ID of other user
            is_sender: Whether user sent or received message
            message_data: Message metadata (length, time, etc.)
        """
        engagement = self.engagement_patterns[user_id]

        if is_sender:
            engagement['messages_sent'] += 1
        else:
            engagement['messages_received'] += 1

        # Update response rate
        if engagement['messages_received'] > 0:
            engagement['response_rate'] = \
                engagement['messages_sent'] / engagement['messages_received']

    def learn_from_conversation(
        self,
        user_id: str,
        matched_user_id: str,
        conversation_metrics: Dict
    ):
        """
        Learn from conversation quality metrics.

        Args:
            user_id: User ID
            matched_user_id: ID of other user
            conversation_metrics: Metrics like message count, duration, etc.
        """
        engagement = self.engagement_patterns[user_id]

        message_count = conversation_metrics.get('message_count', 0)

        # Update average conversation length
        prev_avg = engagement['avg_conversation_length']
        total_convs = engagement['successful_matches'] + 1

        engagement['avg_conversation_length'] = \
            (prev_avg * engagement['successful_matches'] + message_count) / total_convs

        # Determine if conversation was successful
        if message_count >= 10:  # Threshold for successful conversation
            engagement['successful_matches'] += 1

    def get_user_preferences(self, user_id: str) -> Dict:
        """
        Get learned preferences for a user.

        Args:
            user_id: User ID

        Returns:
            Dictionary of learned preferences
        """
        if user_id not in self.user_behaviors:
            return {}

        behavior = self.user_behaviors[user_id]
        return behavior.get('preferences_learned', {})

    def predict_swipe(
        self,
        user_id: str,
        target_profile: Dict
    ) -> Tuple[str, float]:
        """
        Predict likely swipe action for a profile.

        Args:
            user_id: User ID
            target_profile: Profile to predict swipe for

        Returns:
            Tuple of (predicted_action, confidence)
        """
        if user_id not in self.user_behaviors:
            return 'like', 0.5  # Default for new users

        behavior = self.user_behaviors[user_id]
        preferences = behavior.get('preferences_learned', {})

        # Calculate match score with learned preferences
        score = 0.0
        factors = 0

        # Age preference
        if 'preferred_age_range' in preferences:
            age = target_profile.get('age', 25)
            age_min, age_max = preferences['preferred_age_range']
            if age_min <= age <= age_max:
                score += 1.0
            factors += 1

        # Interest alignment
        if 'preferred_interests' in preferences:
            target_interests = set(target_profile.get('interests', []))
            preferred_interests = preferences['preferred_interests']

            overlap = len(target_interests & preferred_interests)
            if overlap > 0:
                score += min(overlap / 3, 1.0)
            factors += 1

        # Education preference
        if 'preferred_education' in preferences:
            if target_profile.get('education') in preferences['preferred_education']:
                score += 1.0
            factors += 1

        # Height preference (if available)
        if 'preferred_height_range' in preferences and 'height' in target_profile:
            height = target_profile['height']
            height_min, height_max = preferences['preferred_height_range']
            if height_min <= height <= height_max:
                score += 1.0
            factors += 1

        # Calculate confidence
        if factors > 0:
            normalized_score = score / factors
            confidence = min(len(behavior['liked_profiles']) / 20, 1.0)  # Confidence grows with data

            # Predict action based on score
            if normalized_score > 0.7:
                return 'like', confidence
            elif normalized_score > 0.9:
                return 'super_like', confidence
            else:
                return 'pass', confidence
        else:
            return 'like', 0.3

    def get_engagement_metrics(self, user_id: str) -> Dict:
        """Get engagement metrics for a user."""
        return {
            'swipe_patterns': dict(self.swipe_patterns.get(user_id, {})),
            'engagement': dict(self.engagement_patterns.get(user_id, {})),
            'photo_preferences': {
                k: dict(v) if isinstance(v, Counter) else v
                for k, v in self.photo_preferences.get(user_id, {}).items()
            },
            'temporal_patterns': {
                k: dict(v) if isinstance(v, Counter) else v
                for k, v in self.temporal_patterns.get(user_id, {}).items()
            }
        }

    def get_photo_preferences(self, user_id: str) -> Dict:
        """
        Get learned photo preferences.

        Returns insights like:
        - Which photo positions get most likes
        - Average photos viewed per profile
        """
        if user_id not in self.photo_preferences:
            return {}

        prefs = self.photo_preferences[user_id]
        position_counter = prefs['liked_photo_positions']

        if not position_counter:
            return {}

        total_position_likes = sum(position_counter.values())

        return {
            'favorite_positions': position_counter.most_common(3),
            'position_distribution': {
                pos: count / total_position_likes
                for pos, count in position_counter.items()
            },
            'avg_photos_viewed': prefs['total_photos_viewed'] / max(
                self.swipe_patterns[user_id]['total_swipes'], 1
            )
        }

    def get_optimal_recommendation_time(self, user_id: str) -> Dict:
        """
        Get optimal time to send recommendations based on user activity.

        Returns:
            Dictionary with optimal hours and days
        """
        if user_id not in self.temporal_patterns:
            return {
                'optimal_hours': [19, 20, 21],  # Default evening hours
                'optimal_days': ['friday', 'saturday', 'sunday']
            }

        patterns = self.temporal_patterns[user_id]

        # Get top 3 most active hours
        optimal_hours = [hour for hour, _ in patterns['active_hours'].most_common(3)]

        # Get top 3 most active days
        optimal_days = [day for day, _ in patterns['active_days'].most_common(3)]

        return {
            'optimal_hours': optimal_hours,
            'optimal_days': optimal_days,
            'activity_pattern': dict(patterns['active_hours'])
        }

    def calculate_match_success_probability(
        self,
        user_id: str,
        target_profile: Dict
    ) -> float:
        """
        Calculate probability of successful match (leading to conversation).

        Args:
            user_id: User ID
            target_profile: Target profile

        Returns:
            Probability score (0-1)
        """
        if user_id not in self.user_behaviors:
            return 0.5  # Default for new users

        engagement = self.engagement_patterns[user_id]
        behavior = self.user_behaviors[user_id]

        # Base probability from historical match rate
        matches = engagement['matches']
        swipes = self.swipe_patterns[user_id]['likes']

        if swipes > 0:
            match_rate = matches / swipes
        else:
            match_rate = 0.1  # Default

        # Adjust based on conversation success rate
        if matches > 0:
            conversation_rate = engagement['successful_matches'] / matches
        else:
            conversation_rate = 0.5

        # Adjust based on profile similarity to past successful matches
        similarity_score = self._calculate_similarity_to_successful_matches(
            user_id, target_profile
        )

        # Weighted combination
        probability = (
            0.3 * match_rate +
            0.3 * conversation_rate +
            0.4 * similarity_score
        )

        return np.clip(probability, 0.0, 1.0)

    def _extract_liked_features(
        self,
        behavior: Dict,
        profile: Dict,
        weight: float = 1.0
    ):
        """Extract and weight features from liked profiles."""
        liked_features = behavior['liked_features']

        # Age
        age = profile.get('age')
        if age:
            liked_features[f'age_{age//5*5}'] += weight  # Age buckets

        # Interests
        for interest in profile.get('interests', []):
            liked_features[f'interest_{interest}'] += weight

        # Education
        education = profile.get('education')
        if education:
            liked_features[f'education_{education}'] += weight

        # Height (if available)
        height = profile.get('height')
        if height:
            liked_features[f'height_{height//10*10}'] += weight  # Height buckets

        # Location type
        city_size = profile.get('city_size')
        if city_size:
            liked_features[f'city_{city_size}'] += weight

    def _extract_passed_features(self, behavior: Dict, profile: Dict):
        """Extract features from passed profiles."""
        passed_features = behavior['passed_features']

        # Similar to liked features but for passes
        age = profile.get('age')
        if age:
            passed_features[f'age_{age//5*5}'] += 1

        for interest in profile.get('interests', []):
            passed_features[f'interest_{interest}'] += 1

        education = profile.get('education')
        if education:
            passed_features[f'education_{education}'] += 1

    def _update_learned_preferences(self, user_id: str):
        """Update learned preferences based on accumulated behavior."""
        if user_id not in self.user_behaviors:
            return

        behavior = self.user_behaviors[user_id]
        liked_features = behavior['liked_features']
        passed_features = behavior['passed_features']

        preferences = {}

        # Learn age preference
        age_likes = {
            int(k.split('_')[1]): v
            for k, v in liked_features.items()
            if k.startswith('age_')
        }

        if age_likes:
            # Find age range with most likes
            sorted_ages = sorted(age_likes.items())
            if sorted_ages:
                ages = [age for age, _ in sorted_ages]
                preferences['preferred_age_range'] = (min(ages), max(ages) + 5)

        # Learn interest preferences
        interest_likes = {
            k.split('_', 1)[1]: v
            for k, v in liked_features.items()
            if k.startswith('interest_')
        }

        if interest_likes:
            # Top interests (appeared in at least 30% of likes)
            total_likes = len(behavior['liked_profiles'])
            threshold = total_likes * 0.3

            preferred_interests = {
                interest for interest, count in interest_likes.items()
                if count >= threshold
            }
            preferences['preferred_interests'] = preferred_interests

        # Learn education preferences
        education_likes = {
            k.split('_', 1)[1]: v
            for k, v in liked_features.items()
            if k.startswith('education_')
        }

        if education_likes:
            preferences['preferred_education'] = set(education_likes.keys())

        # Learn height preferences
        height_likes = {
            int(k.split('_')[1]): v
            for k, v in liked_features.items()
            if k.startswith('height_')
        }

        if height_likes:
            heights = [h for h, _ in height_likes.items()]
            preferences['preferred_height_range'] = (min(heights), max(heights) + 10)

        behavior['preferences_learned'] = preferences

        logger.info(f"Updated preferences for user {user_id}: {len(preferences)} preferences learned")

    def _update_temporal_patterns(self, user_id: str, timestamp: datetime):
        """Update temporal activity patterns."""
        patterns = self.temporal_patterns[user_id]

        # Extract hour and day
        hour = timestamp.hour
        day = timestamp.strftime('%A').lower()

        patterns['active_hours'][hour] += 1
        patterns['active_days'][day] += 1

    def _calculate_similarity_to_successful_matches(
        self,
        user_id: str,
        target_profile: Dict
    ) -> float:
        """Calculate similarity to profiles that led to successful conversations."""
        if user_id not in self.user_behaviors:
            return 0.5

        behavior = self.user_behaviors[user_id]
        liked_profiles = behavior['liked_profiles']

        if not liked_profiles:
            return 0.5

        # Simple similarity based on feature overlap
        target_interests = set(target_profile.get('interests', []))
        target_age = target_profile.get('age', 25)

        similarities = []
        for liked_profile in liked_profiles[-20:]:  # Last 20 likes
            # Interest overlap
            liked_interests = set(liked_profile.get('interests', []))
            interest_sim = len(target_interests & liked_interests) / \
                          max(len(target_interests | liked_interests), 1)

            # Age similarity
            liked_age = liked_profile.get('age', 25)
            age_diff = abs(target_age - liked_age)
            age_sim = max(0, 1 - age_diff / 20)

            # Combined similarity
            similarities.append(0.6 * interest_sim + 0.4 * age_sim)

        return np.mean(similarities) if similarities else 0.5

    def get_insights(self, user_id: str) -> Dict:
        """
        Get behavioral insights for a user.

        Returns comprehensive insights about user's dating behavior.
        """
        if user_id not in self.user_behaviors:
            return {'status': 'insufficient_data'}

        swipe_data = self.swipe_patterns[user_id]
        engagement_data = self.engagement_patterns[user_id]
        preferences = self.get_user_preferences(user_id)

        insights = {
            'profile_type': self._classify_user_type(user_id),
            'selectivity': swipe_data['like_rate'],
            'engagement_level': self._calculate_engagement_level(user_id),
            'match_success_rate': engagement_data['matches'] / max(swipe_data['likes'], 1),
            'conversation_success_rate': engagement_data['successful_matches'] / \
                                        max(engagement_data['matches'], 1),
            'learned_preferences': preferences,
            'recommendations': self._generate_behavioral_recommendations(user_id)
        }

        return insights

    def _classify_user_type(self, user_id: str) -> str:
        """Classify user based on behavior patterns."""
        swipe_data = self.swipe_patterns[user_id]
        engagement_data = self.engagement_patterns[user_id]

        like_rate = swipe_data['like_rate']
        response_rate = engagement_data['response_rate']

        if like_rate > 0.7:
            return 'explorer'  # Likes most profiles
        elif like_rate < 0.3:
            return 'selective'  # Very picky
        elif response_rate > 0.8:
            return 'engaged'  # Highly engaged
        else:
            return 'balanced'  # Normal behavior

    def _calculate_engagement_level(self, user_id: str) -> str:
        """Calculate overall engagement level."""
        engagement_data = self.engagement_patterns[user_id]

        messages_sent = engagement_data['messages_sent']
        successful_matches = engagement_data['successful_matches']

        if messages_sent > 50 and successful_matches > 5:
            return 'high'
        elif messages_sent > 20 and successful_matches > 2:
            return 'medium'
        else:
            return 'low'

    def _generate_behavioral_recommendations(self, user_id: str) -> List[str]:
        """Generate recommendations to improve user's success."""
        recommendations = []

        swipe_data = self.swipe_patterns[user_id]
        engagement_data = self.engagement_patterns[user_id]

        # Too selective
        if swipe_data['like_rate'] < 0.2:
            recommendations.append(
                "Consider being more open-minded - you might miss great matches!"
            )

        # Not selective enough
        if swipe_data['like_rate'] > 0.8:
            recommendations.append(
                "Being more selective could lead to higher quality matches"
            )

        # Low response rate
        if engagement_data['response_rate'] < 0.5:
            recommendations.append(
                "Try responding more to messages to increase your match success"
            )

        # Low conversation success
        conv_rate = engagement_data['successful_matches'] / max(engagement_data['matches'], 1)
        if conv_rate < 0.3 and engagement_data['matches'] > 5:
            recommendations.append(
                "Starting conversations with personalized messages could help engagement"
            )

        return recommendations
