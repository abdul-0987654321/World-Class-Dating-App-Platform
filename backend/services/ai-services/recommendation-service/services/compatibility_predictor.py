"""Advanced compatibility prediction model using machine learning."""

import logging
from typing import Dict, Any, List, Optional, Tuple
import numpy as np
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.preprocessing import StandardScaler
import torch
import torch.nn as nn
import pickle
import json
from datetime import datetime

logger = logging.getLogger(__name__)


class CompatibilityNeuralNetwork(nn.Module):
    """Neural network for compatibility prediction."""

    def __init__(self, input_dim: int = 100):
        super().__init__()
        self.network = nn.Sequential(
            nn.Linear(input_dim, 256),
            nn.BatchNorm1d(256),
            nn.ReLU(),
            nn.Dropout(0.3),

            nn.Linear(256, 128),
            nn.BatchNorm1d(128),
            nn.ReLU(),
            nn.Dropout(0.2),

            nn.Linear(128, 64),
            nn.BatchNorm1d(64),
            nn.ReLU(),
            nn.Dropout(0.1),

            nn.Linear(64, 32),
            nn.ReLU(),

            nn.Linear(32, 1),
            nn.Sigmoid()  # Output 0-1 probability
        )

    def forward(self, x):
        return self.network(x)


class FeatureExtractor:
    """Extracts and engineers features for compatibility prediction."""

    @staticmethod
    def extract_demographic_features(
        user1: Dict[str, Any],
        user2: Dict[str, Any]
    ) -> Dict[str, float]:
        """Extract demographic compatibility features."""
        features = {}

        # Age difference
        age1 = user1.get('age', 25)
        age2 = user2.get('age', 25)
        features['age_difference'] = abs(age1 - age2)
        features['age_ratio'] = min(age1, age2) / max(age1, age2) if max(age1, age2) > 0 else 0

        # Age range compatibility
        age_range1 = user1.get('preferred_age_range', {'min': 18, 'max': 99})
        age_range2 = user2.get('preferred_age_range', {'min': 18, 'max': 99})

        features['user1_in_user2_range'] = 1.0 if age_range2['min'] <= age1 <= age_range2['max'] else 0.0
        features['user2_in_user1_range'] = 1.0 if age_range1['min'] <= age2 <= age_range1['max'] else 0.0

        # Height compatibility (if provided)
        if 'height' in user1 and 'height' in user2:
            features['height_difference'] = abs(user1['height'] - user2['height'])
        else:
            features['height_difference'] = 0

        # Education level
        education_levels = {
            'high_school': 1,
            'some_college': 2,
            'bachelors': 3,
            'masters': 4,
            'doctorate': 5
        }

        edu1 = education_levels.get(user1.get('education', 'bachelors'), 3)
        edu2 = education_levels.get(user2.get('education', 'bachelors'), 3)
        features['education_difference'] = abs(edu1 - edu2)
        features['education_similarity'] = 1.0 / (1.0 + features['education_difference'])

        return features

    @staticmethod
    def extract_interest_features(
        user1: Dict[str, Any],
        user2: Dict[str, Any]
    ) -> Dict[str, float]:
        """Extract interest-based compatibility features."""
        features = {}

        # Common interests
        interests1 = set(user1.get('interests', []))
        interests2 = set(user2.get('interests', []))

        if interests1 and interests2:
            common = interests1.intersection(interests2)
            total = interests1.union(interests2)

            features['common_interests_count'] = len(common)
            features['jaccard_similarity_interests'] = len(common) / len(total) if total else 0
            features['interest_overlap_ratio'] = len(common) / min(len(interests1), len(interests2)) if interests1 and interests2 else 0
        else:
            features['common_interests_count'] = 0
            features['jaccard_similarity_interests'] = 0
            features['interest_overlap_ratio'] = 0

        # Common hobbies
        hobbies1 = set(user1.get('hobbies', []))
        hobbies2 = set(user2.get('hobbies', []))

        if hobbies1 and hobbies2:
            common_hobbies = hobbies1.intersection(hobbies2)
            features['common_hobbies_count'] = len(common_hobbies)
            features['hobby_similarity'] = len(common_hobbies) / min(len(hobbies1), len(hobbies2))
        else:
            features['common_hobbies_count'] = 0
            features['hobby_similarity'] = 0

        # Music taste similarity
        music1 = set(user1.get('music_genres', []))
        music2 = set(user2.get('music_genres', []))

        if music1 and music2:
            common_music = music1.intersection(music2)
            features['music_similarity'] = len(common_music) / min(len(music1), len(music2))
        else:
            features['music_similarity'] = 0

        return features

    @staticmethod
    def extract_lifestyle_features(
        user1: Dict[str, Any],
        user2: Dict[str, Any]
    ) -> Dict[str, float]:
        """Extract lifestyle compatibility features."""
        features = {}

        # Relationship goals alignment
        goals_compatibility = {
            ('casual', 'casual'): 1.0,
            ('casual', 'short_term'): 0.7,
            ('casual', 'long_term'): 0.2,
            ('casual', 'marriage'): 0.1,
            ('short_term', 'short_term'): 1.0,
            ('short_term', 'long_term'): 0.6,
            ('short_term', 'marriage'): 0.3,
            ('long_term', 'long_term'): 1.0,
            ('long_term', 'marriage'): 0.9,
            ('marriage', 'marriage'): 1.0
        }

        goal1 = user1.get('relationship_goal', 'long_term')
        goal2 = user2.get('relationship_goal', 'long_term')
        key = tuple(sorted([goal1, goal2]))
        features['relationship_goal_compatibility'] = goals_compatibility.get(key, 0.5)

        # Children preferences
        children1 = user1.get('wants_children', 'maybe')
        children2 = user2.get('wants_children', 'maybe')

        children_compatibility = {
            ('yes', 'yes'): 1.0,
            ('yes', 'maybe'): 0.7,
            ('yes', 'no'): 0.0,
            ('maybe', 'maybe'): 0.9,
            ('maybe', 'no'): 0.6,
            ('no', 'no'): 1.0
        }

        key = tuple(sorted([children1, children2]))
        features['children_preference_compatibility'] = children_compatibility.get(key, 0.5)

        # Lifestyle preferences
        lifestyle_attrs = ['smoking', 'drinking', 'exercise_frequency', 'pet_preference']

        for attr in lifestyle_attrs:
            val1 = user1.get(attr, 'unknown')
            val2 = user2.get(attr, 'unknown')
            features[f'{attr}_match'] = 1.0 if val1 == val2 else 0.5

        # Activity level
        activity_levels = {'low': 1, 'moderate': 2, 'high': 3}
        activity1 = activity_levels.get(user1.get('activity_level', 'moderate'), 2)
        activity2 = activity_levels.get(user2.get('activity_level', 'moderate'), 2)
        features['activity_level_difference'] = abs(activity1 - activity2)

        return features

    @staticmethod
    def extract_location_features(
        user1: Dict[str, Any],
        user2: Dict[str, Any]
    ) -> Dict[str, float]:
        """Extract location-based compatibility features."""
        features = {}

        # Calculate distance
        if 'location' in user1 and 'location' in user2:
            # Simplified distance calculation
            # Real implementation would use proper geospatial calculations
            lat1, lon1 = user1['location'].get('lat', 0), user1['location'].get('lon', 0)
            lat2, lon2 = user2['location'].get('lat', 0), user2['location'].get('lon', 0)

            # Haversine formula approximation
            distance = np.sqrt((lat2 - lat1)**2 + (lon2 - lon1)**2) * 111  # Rough km conversion

            features['distance_km'] = distance
            features['distance_score'] = max(0, 1.0 - (distance / 100))  # Penalty for >100km
        else:
            features['distance_km'] = 50
            features['distance_score'] = 0.5

        # City match
        city1 = user1.get('location', {}).get('city', '')
        city2 = user2.get('location', {}).get('city', '')
        features['same_city'] = 1.0 if city1 and city1 == city2 else 0.0

        return features

    @staticmethod
    def extract_personality_features(
        user1: Dict[str, Any],
        user2: Dict[str, Any]
    ) -> Dict[str, float]:
        """Extract personality-based compatibility features."""
        features = {}

        # Big Five personality traits (if available)
        big_five = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism']

        for trait in big_five:
            val1 = user1.get('personality', {}).get(trait, 0.5)
            val2 = user2.get('personality', {}).get(trait, 0.5)

            # Some traits are better when similar, others when complementary
            if trait in ['openness', 'agreeableness']:
                # Similar is better
                features[f'{trait}_similarity'] = 1.0 - abs(val1 - val2)
            elif trait == 'extraversion':
                # Can be complementary
                features[f'{trait}_balance'] = 1.0 - abs((val1 + val2) / 2 - 0.5)
            else:
                features[f'{trait}_score'] = (val1 + val2) / 2

        # Communication style
        comm_style1 = user1.get('communication_style', 'balanced')
        comm_style2 = user2.get('communication_style', 'balanced')
        features['communication_match'] = 1.0 if comm_style1 == comm_style2 else 0.6

        return features

    @staticmethod
    def extract_behavioral_features(
        user1: Dict[str, Any],
        user2: Dict[str, Any]
    ) -> Dict[str, float]:
        """Extract behavioral compatibility features."""
        features = {}

        # Response rate
        features['user1_response_rate'] = user1.get('response_rate', 0.5)
        features['user2_response_rate'] = user2.get('response_rate', 0.5)
        features['avg_response_rate'] = (features['user1_response_rate'] + features['user2_response_rate']) / 2

        # Activity patterns
        features['user1_daily_active_hours'] = user1.get('daily_active_hours', 8)
        features['user2_daily_active_hours'] = user2.get('daily_active_hours', 8)

        # Success history
        features['user1_match_rate'] = user1.get('match_rate', 0.3)
        features['user2_match_rate'] = user2.get('match_rate', 0.3)

        features['user1_conversation_rate'] = user1.get('conversation_rate', 0.5)
        features['user2_conversation_rate'] = user2.get('conversation_rate', 0.5)

        return features


class CompatibilityPredictor:
    """Advanced compatibility prediction service."""

    def __init__(self):
        self.nn_model: Optional[CompatibilityNeuralNetwork] = None
        self.ensemble_model: Optional[GradientBoostingRegressor] = None
        self.scaler: Optional[StandardScaler] = None
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.feature_extractor = FeatureExtractor()
        self.feature_names: List[str] = []

    async def initialize(self):
        """Initialize models and resources."""
        logger.info("Initializing Compatibility Predictor...")

        try:
            # Initialize scaler
            self.scaler = StandardScaler()

            # Initialize neural network
            self.nn_model = CompatibilityNeuralNetwork(input_dim=100)
            self.nn_model.to(self.device)
            self.nn_model.eval()

            # Initialize ensemble model
            self.ensemble_model = GradientBoostingRegressor(
                n_estimators=100,
                learning_rate=0.1,
                max_depth=5,
                random_state=42
            )

            # Try to load pre-trained models
            try:
                self._load_models()
                logger.info("Loaded pre-trained compatibility models")
            except FileNotFoundError:
                logger.warning("Pre-trained models not found, using initialized models")

            logger.info("Compatibility Predictor initialized successfully")

        except Exception as e:
            logger.error(f"Failed to initialize compatibility predictor: {e}")
            raise

    async def close(self):
        """Cleanup resources."""
        logger.info("Closing Compatibility Predictor")
        if self.nn_model:
            del self.nn_model
            self.nn_model = None

    async def predict_compatibility(
        self,
        user1_profile: Dict[str, Any],
        user2_profile: Dict[str, Any],
        include_breakdown: bool = True
    ) -> Dict[str, Any]:
        """
        Predict compatibility between two users.

        Args:
            user1_profile: First user's profile
            user2_profile: Second user's profile
            include_breakdown: Whether to include detailed breakdown

        Returns:
            Compatibility prediction with score and analysis
        """
        try:
            # Extract features
            features = self._extract_all_features(user1_profile, user2_profile)

            # Get predictions from multiple models
            nn_score = await self._predict_nn(features)
            ensemble_score = await self._predict_ensemble(features)

            # Combine predictions (weighted average)
            final_score = (nn_score * 0.6) + (ensemble_score * 0.4)

            # Calculate confidence
            confidence = self._calculate_confidence(nn_score, ensemble_score, features)

            # Generate breakdown if requested
            breakdown = None
            if include_breakdown:
                breakdown = self._generate_breakdown(features, final_score)

            # Determine compatibility level
            level = self._get_compatibility_level(final_score)

            # Generate insights
            insights = self._generate_insights(features, final_score)

            return {
                "compatibility_score": round(final_score * 100, 2),  # Convert to 0-100
                "confidence": round(confidence, 2),
                "level": level,
                "nn_score": round(nn_score * 100, 2),
                "ensemble_score": round(ensemble_score * 100, 2),
                "breakdown": breakdown,
                "insights": insights,
                "prediction_timestamp": datetime.utcnow().isoformat()
            }

        except Exception as e:
            logger.error(f"Compatibility prediction failed: {e}")
            raise

    def _extract_all_features(
        self,
        user1: Dict[str, Any],
        user2: Dict[str, Any]
    ) -> Dict[str, float]:
        """Extract all features for compatibility prediction."""
        all_features = {}

        # Extract different feature categories
        all_features.update(self.feature_extractor.extract_demographic_features(user1, user2))
        all_features.update(self.feature_extractor.extract_interest_features(user1, user2))
        all_features.update(self.feature_extractor.extract_lifestyle_features(user1, user2))
        all_features.update(self.feature_extractor.extract_location_features(user1, user2))
        all_features.update(self.feature_extractor.extract_personality_features(user1, user2))
        all_features.update(self.feature_extractor.extract_behavioral_features(user1, user2))

        return all_features

    async def _predict_nn(self, features: Dict[str, float]) -> float:
        """Get prediction from neural network."""
        try:
            # Convert features to tensor
            feature_vector = self._features_to_vector(features, target_dim=100)
            feature_tensor = torch.FloatTensor(feature_vector).unsqueeze(0).to(self.device)

            # Get prediction
            with torch.no_grad():
                score = self.nn_model(feature_tensor)
                return float(score.item())

        except Exception as e:
            logger.warning(f"Neural network prediction failed: {e}")
            return 0.5  # Default score

    async def _predict_ensemble(self, features: Dict[str, float]) -> float:
        """Get prediction from ensemble model."""
        try:
            # Convert features to vector
            feature_vector = self._features_to_vector(features)

            # Reshape for sklearn
            feature_array = np.array(feature_vector).reshape(1, -1)

            # Scale features
            if self.scaler:
                feature_array = self.scaler.transform(feature_array)

            # Get prediction
            score = self.ensemble_model.predict(feature_array)[0]
            return float(np.clip(score, 0, 1))

        except Exception as e:
            logger.warning(f"Ensemble prediction failed: {e}")
            return 0.5  # Default score

    def _features_to_vector(
        self,
        features: Dict[str, float],
        target_dim: Optional[int] = None
    ) -> List[float]:
        """Convert feature dictionary to vector."""
        # Ensure consistent ordering
        if not self.feature_names:
            self.feature_names = sorted(features.keys())

        vector = [features.get(name, 0.0) for name in self.feature_names]

        # Pad or truncate to target dimension if specified
        if target_dim:
            if len(vector) < target_dim:
                vector.extend([0.0] * (target_dim - len(vector)))
            elif len(vector) > target_dim:
                vector = vector[:target_dim]

        return vector

    def _calculate_confidence(
        self,
        nn_score: float,
        ensemble_score: float,
        features: Dict[str, float]
    ) -> float:
        """Calculate confidence in prediction."""
        # Lower confidence when models disagree
        model_agreement = 1.0 - abs(nn_score - ensemble_score)

        # Lower confidence when features are sparse
        feature_completeness = min(1.0, len(features) / 50)

        # Combined confidence
        confidence = (model_agreement * 0.6) + (feature_completeness * 0.4)

        return max(0.3, min(1.0, confidence))

    def _generate_breakdown(
        self,
        features: Dict[str, float],
        overall_score: float
    ) -> Dict[str, Any]:
        """Generate detailed compatibility breakdown."""
        breakdown = {
            "categories": {},
            "top_matches": [],
            "potential_challenges": []
        }

        # Category scores
        category_features = {
            "interests": [k for k in features.keys() if 'interest' in k or 'hobby' in k or 'music' in k],
            "lifestyle": [k for k in features.keys() if 'lifestyle' in k or 'goal' in k or 'children' in k],
            "demographics": [k for k in features.keys() if 'age' in k or 'education' in k or 'height' in k],
            "location": [k for k in features.keys() if 'distance' in k or 'city' in k],
            "personality": [k for k in features.keys() if 'personality' in k or 'communication' in k]
        }

        for category, feature_keys in category_features.items():
            if feature_keys:
                category_values = [features[k] for k in feature_keys if k in features]
                if category_values:
                    breakdown["categories"][category] = {
                        "score": round(np.mean(category_values) * 100, 2),
                        "weight": len(category_values) / len(features)
                    }

        # Identify top matches
        high_features = {k: v for k, v in features.items() if v > 0.7}
        breakdown["top_matches"] = sorted(high_features.keys(), key=high_features.get, reverse=True)[:5]

        # Identify potential challenges
        low_features = {k: v for k, v in features.items() if v < 0.3}
        breakdown["potential_challenges"] = sorted(low_features.keys(), key=low_features.get)[:5]

        return breakdown

    def _get_compatibility_level(self, score: float) -> str:
        """Get compatibility level description."""
        if score >= 0.85:
            return "exceptional"
        elif score >= 0.75:
            return "very_high"
        elif score >= 0.65:
            return "high"
        elif score >= 0.55:
            return "good"
        elif score >= 0.45:
            return "moderate"
        else:
            return "low"

    def _generate_insights(
        self,
        features: Dict[str, float],
        score: float
    ) -> List[str]:
        """Generate human-readable insights."""
        insights = []

        # Interest-based insights
        if features.get('common_interests_count', 0) >= 3:
            insights.append(f"You share {int(features['common_interests_count'])} common interests")

        # Lifestyle insights
        if features.get('relationship_goal_compatibility', 0) >= 0.8:
            insights.append("Your relationship goals are well aligned")

        # Location insights
        if features.get('same_city', 0) == 1.0:
            insights.append("You're both in the same city")
        elif features.get('distance_km', 100) > 50:
            insights.append(f"Distance may be a factor ({int(features.get('distance_km', 0))} km apart)")

        # Personality insights
        personality_sim = features.get('openness_similarity', 0)
        if personality_sim >= 0.8:
            insights.append("Your personalities complement each other well")

        # Overall assessment
        if score >= 0.75:
            insights.append("Strong potential for a meaningful connection")
        elif score >= 0.55:
            insights.append("Good compatibility with room to discover more")
        else:
            insights.append("Some differences to navigate, but could work with effort")

        return insights

    def _load_models(self):
        """Load pre-trained models from disk."""
        # Load neural network weights
        nn_path = "models/compatibility_nn.pth"
        self.nn_model.load_state_dict(torch.load(nn_path, map_location=self.device))

        # Load ensemble model
        ensemble_path = "models/compatibility_ensemble.pkl"
        with open(ensemble_path, 'rb') as f:
            self.ensemble_model = pickle.load(f)

        # Load scaler
        scaler_path = "models/compatibility_scaler.pkl"
        with open(scaler_path, 'rb') as f:
            self.scaler = pickle.load(f)

        # Load feature names
        features_path = "models/compatibility_features.json"
        with open(features_path, 'r') as f:
            self.feature_names = json.load(f)

    def save_models(self):
        """Save models to disk."""
        # Save neural network
        torch.save(self.nn_model.state_dict(), "models/compatibility_nn.pth")

        # Save ensemble model
        with open("models/compatibility_ensemble.pkl", 'wb') as f:
            pickle.dump(self.ensemble_model, f)

        # Save scaler
        with open("models/compatibility_scaler.pkl", 'wb') as f:
            pickle.dump(self.scaler, f)

        # Save feature names
        with open("models/compatibility_features.json", 'w') as f:
            json.dump(self.feature_names, f)

        logger.info("Models saved successfully")
