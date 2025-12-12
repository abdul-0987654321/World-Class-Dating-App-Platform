"""
Deep Learning-based Matching Network for Enhanced Recommendations
Uses neural collaborative filtering and attention mechanisms
"""

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from typing import Dict, List, Optional, Tuple
import structlog

logger = structlog.get_logger()


class UserEncoder(nn.Module):
    """Encodes user features into dense embeddings"""

    def __init__(self, input_dim: int, embedding_dim: int = 128):
        super(UserEncoder, self).__init__()
        self.fc1 = nn.Linear(input_dim, 256)
        self.fc2 = nn.Linear(256, 128)
        self.fc3 = nn.Linear(128, embedding_dim)
        self.dropout = nn.Dropout(0.3)
        self.batch_norm1 = nn.BatchNorm1d(256)
        self.batch_norm2 = nn.BatchNorm1d(128)

    def forward(self, x):
        x = F.relu(self.batch_norm1(self.fc1(x)))
        x = self.dropout(x)
        x = F.relu(self.batch_norm2(self.fc2(x)))
        x = self.dropout(x)
        x = self.fc3(x)
        return x


class AttentionLayer(nn.Module):
    """Multi-head attention for feature importance weighting"""

    def __init__(self, embedding_dim: int, num_heads: int = 4):
        super(AttentionLayer, self).__init__()
        self.attention = nn.MultiheadAttention(embedding_dim, num_heads, batch_first=True)
        self.layer_norm = nn.LayerNorm(embedding_dim)

    def forward(self, query, key, value):
        attn_output, attn_weights = self.attention(query, key, value)
        return self.layer_norm(attn_output + query), attn_weights


class DeepMatchingNetwork(nn.Module):
    """
    Deep neural network for compatibility scoring
    Combines user embeddings with attention mechanisms
    """

    def __init__(
        self,
        user_feature_dim: int,
        embedding_dim: int = 128,
        num_attention_heads: int = 4
    ):
        super(DeepMatchingNetwork, self).__init__()

        # User encoders
        self.user_encoder = UserEncoder(user_feature_dim, embedding_dim)

        # Attention mechanism
        self.attention = AttentionLayer(embedding_dim, num_attention_heads)

        # Interaction layers
        self.interaction_fc1 = nn.Linear(embedding_dim * 2, 256)
        self.interaction_fc2 = nn.Linear(256, 128)
        self.interaction_fc3 = nn.Linear(128, 64)

        # Output layer
        self.output = nn.Linear(64, 1)

        self.dropout = nn.Dropout(0.3)
        self.batch_norm1 = nn.BatchNorm1d(256)
        self.batch_norm2 = nn.BatchNorm1d(128)
        self.batch_norm3 = nn.BatchNorm1d(64)

    def forward(self, user_features, candidate_features):
        # Encode users
        user_embedding = self.user_encoder(user_features)
        candidate_embedding = self.user_encoder(candidate_features)

        # Apply attention
        user_attended, _ = self.attention(
            user_embedding.unsqueeze(1),
            candidate_embedding.unsqueeze(1),
            candidate_embedding.unsqueeze(1)
        )
        user_attended = user_attended.squeeze(1)

        # Concatenate embeddings
        combined = torch.cat([user_attended, candidate_embedding], dim=-1)

        # Interaction layers
        x = F.relu(self.batch_norm1(self.interaction_fc1(combined)))
        x = self.dropout(x)
        x = F.relu(self.batch_norm2(self.interaction_fc2(x)))
        x = self.dropout(x)
        x = F.relu(self.batch_norm3(self.interaction_fc3(x)))

        # Output score
        score = torch.sigmoid(self.output(x))

        return score


class ImprovedRecommendationEngine:
    """
    Enhanced recommendation engine using deep learning
    """

    def __init__(self, model_path: Optional[str] = None):
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.model = None
        self.feature_dim = 100  # Adjust based on your feature engineering

        if model_path:
            self.load_model(model_path)
        else:
            self.model = DeepMatchingNetwork(
                user_feature_dim=self.feature_dim,
                embedding_dim=128,
                num_attention_heads=4
            ).to(self.device)

        logger.info(f"Initialized improved recommendation engine on {self.device}")

    def extract_features(self, user_profile: Dict) -> np.ndarray:
        """
        Extract features from user profile

        Features include:
        - Demographics (age, gender, location)
        - Interests (one-hot encoded)
        - Behavioral patterns
        - Profile completeness
        - Activity metrics
        """
        features = []

        # Demographic features
        features.append(user_profile.get('age', 25) / 100.0)  # Normalized

        # Gender encoding (one-hot)
        gender = user_profile.get('gender', 'other')
        features.extend([
            1.0 if gender == 'male' else 0.0,
            1.0 if gender == 'female' else 0.0,
            1.0 if gender == 'non_binary' else 0.0
        ])

        # Location features (latitude, longitude normalized)
        location = user_profile.get('location', {})
        features.append(location.get('latitude', 0) / 90.0)
        features.append(location.get('longitude', 0) / 180.0)

        # Interest features (top 50 common interests)
        interest_vector = self._encode_interests(user_profile.get('interests', []))
        features.extend(interest_vector)

        # Lifestyle features
        lifestyle = user_profile.get('lifestyle', {})
        features.extend(self._encode_lifestyle(lifestyle))

        # Values features
        values = user_profile.get('values', {})
        features.extend(self._encode_values(values))

        # Behavioral features
        features.extend([
            user_profile.get('profile_completeness', 0.5),
            user_profile.get('response_rate', 0.5),
            user_profile.get('days_active', 0) / 365.0,
            1.0 if user_profile.get('is_verified') else 0.0,
            1.0 if user_profile.get('is_premium') else 0.0
        ])

        # Pad or truncate to feature_dim
        features_array = np.array(features, dtype=np.float32)
        if len(features_array) < self.feature_dim:
            features_array = np.pad(
                features_array,
                (0, self.feature_dim - len(features_array)),
                mode='constant'
            )
        else:
            features_array = features_array[:self.feature_dim]

        return features_array

    def _encode_interests(self, interests: List[str]) -> List[float]:
        """Encode interests as binary vector"""
        common_interests = [
            'travel', 'music', 'movies', 'fitness', 'hiking', 'reading',
            'cooking', 'photography', 'art', 'gaming', 'sports', 'yoga',
            'dancing', 'wine', 'coffee', 'food', 'nature', 'pets',
            'technology', 'fashion', 'writing', 'cycling', 'running',
            'swimming', 'climbing', 'camping', 'meditation', 'volunteering',
            'theater', 'concerts', 'festivals', 'languages', 'comedy',
            'crafts', 'gardening', 'anime', 'politics', 'environmentalism',
            'astrology', 'surfing', 'skiing', 'skateboarding', 'fishing',
            'basketball', 'soccer', 'tennis', 'golf', 'volleyball', 'baseball'
        ]

        interest_vector = [
            1.0 if interest in interests else 0.0
            for interest in common_interests
        ]

        return interest_vector

    def _encode_lifestyle(self, lifestyle: Dict) -> List[float]:
        """Encode lifestyle choices"""
        features = []

        # Smoking
        smoking = lifestyle.get('smoking', 'unknown')
        features.extend([
            1.0 if smoking == 'never' else 0.0,
            1.0 if smoking == 'sometimes' else 0.0,
            1.0 if smoking == 'regularly' else 0.0
        ])

        # Drinking
        drinking = lifestyle.get('drinking', 'unknown')
        features.extend([
            1.0 if drinking == 'never' else 0.0,
            1.0 if drinking == 'socially' else 0.0,
            1.0 if drinking == 'regularly' else 0.0
        ])

        # Exercise
        exercise = lifestyle.get('exercise', 'unknown')
        features.extend([
            1.0 if exercise == 'never' else 0.0,
            1.0 if exercise == 'sometimes' else 0.0,
            1.0 if exercise == 'active' else 0.0
        ])

        # Pets
        features.append(1.0 if lifestyle.get('has_pets') else 0.0)

        # Children
        children = lifestyle.get('children', 'unknown')
        features.extend([
            1.0 if children == 'none' else 0.0,
            1.0 if children == 'has_children' else 0.0,
            1.0 if children == 'wants_children' else 0.0
        ])

        return features

    def _encode_values(self, values: Dict) -> List[float]:
        """Encode personal values"""
        features = []

        # Religion
        religion = values.get('religion', 'unknown')
        features.extend([
            1.0 if religion == 'atheist' else 0.0,
            1.0 if religion == 'agnostic' else 0.0,
            1.0 if religion == 'spiritual' else 0.0,
            1.0 if religion == 'religious' else 0.0
        ])

        # Education
        education = values.get('education', 'unknown')
        features.extend([
            1.0 if education == 'high_school' else 0.0,
            1.0 if education == 'bachelors' else 0.0,
            1.0 if education == 'masters' else 0.0,
            1.0 if education == 'phd' else 0.0
        ])

        # Politics
        politics = values.get('politics', 'unknown')
        features.extend([
            1.0 if politics == 'liberal' else 0.0,
            1.0 if politics == 'moderate' else 0.0,
            1.0 if politics == 'conservative' else 0.0
        ])

        return features

    def predict_compatibility(
        self,
        user_profile: Dict,
        candidate_profiles: List[Dict]
    ) -> List[Tuple[str, float]]:
        """
        Predict compatibility scores for candidates

        Returns:
            List of (user_id, score) tuples sorted by score descending
        """
        if not self.model:
            raise ValueError("Model not initialized")

        self.model.eval()

        # Extract user features
        user_features = self.extract_features(user_profile)
        user_tensor = torch.tensor(user_features, dtype=torch.float32).unsqueeze(0).to(self.device)

        results = []

        with torch.no_grad():
            for candidate in candidate_profiles:
                # Extract candidate features
                candidate_features = self.extract_features(candidate)
                candidate_tensor = torch.tensor(candidate_features, dtype=torch.float32).unsqueeze(0).to(self.device)

                # Predict score
                score = self.model(user_tensor, candidate_tensor)
                score_value = score.item() * 100  # Scale to 0-100

                results.append((candidate['user_id'], score_value))

        # Sort by score descending
        results.sort(key=lambda x: x[1], reverse=True)

        return results

    def train_step(
        self,
        user_features: torch.Tensor,
        candidate_features: torch.Tensor,
        labels: torch.Tensor,
        optimizer: torch.optim.Optimizer
    ) -> float:
        """Single training step"""
        self.model.train()
        optimizer.zero_grad()

        predictions = self.model(user_features, candidate_features)
        loss = F.binary_cross_entropy(predictions, labels)

        loss.backward()
        optimizer.step()

        return loss.item()

    def save_model(self, path: str):
        """Save model to disk"""
        torch.save({
            'model_state_dict': self.model.state_dict(),
            'feature_dim': self.feature_dim
        }, path)
        logger.info(f"Model saved to {path}")

    def load_model(self, path: str):
        """Load model from disk"""
        checkpoint = torch.load(path, map_location=self.device)
        self.feature_dim = checkpoint.get('feature_dim', 100)

        self.model = DeepMatchingNetwork(
            user_feature_dim=self.feature_dim,
            embedding_dim=128,
            num_attention_heads=4
        ).to(self.device)

        self.model.load_state_dict(checkpoint['model_state_dict'])
        logger.info(f"Model loaded from {path}")
