"""User clustering service for personalized recommendations."""

import logging
from typing import Dict, Any, List, Optional, Tuple
import numpy as np
from sklearn.cluster import KMeans, DBSCAN, AgglomerativeClustering
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
from sklearn.manifold import TSNE
import torch
import torch.nn as nn
from datetime import datetime
import pickle
import json

logger = logging.getLogger(__name__)


class UserEmbeddingNetwork(nn.Module):
    """Neural network to learn user embeddings."""

    def __init__(self, input_dim: int = 100, embedding_dim: int = 64):
        super().__init__()
        self.encoder = nn.Sequential(
            nn.Linear(input_dim, 256),
            nn.BatchNorm1d(256),
            nn.ReLU(),
            nn.Dropout(0.3),

            nn.Linear(256, 128),
            nn.BatchNorm1d(128),
            nn.ReLU(),
            nn.Dropout(0.2),

            nn.Linear(128, embedding_dim),
        )

    def forward(self, x):
        return self.encoder(x)


class FeatureEngineer:
    """Engineers features for user clustering."""

    @staticmethod
    def extract_demographic_features(user: Dict[str, Any]) -> Dict[str, float]:
        """Extract demographic features."""
        features = {}

        features['age'] = user.get('age', 25) / 100.0  # Normalize
        features['gender_male'] = 1.0 if user.get('gender') == 'male' else 0.0
        features['gender_female'] = 1.0 if user.get('gender') == 'female' else 0.0
        features['gender_other'] = 1.0 if user.get('gender') not in ['male', 'female'] else 0.0

        # Education
        education_map = {'high_school': 0.2, 'some_college': 0.4, 'bachelors': 0.6, 'masters': 0.8, 'doctorate': 1.0}
        features['education_level'] = education_map.get(user.get('education', 'bachelors'), 0.6)

        # Height (normalized)
        if 'height' in user:
            features['height_normalized'] = user['height'] / 200.0
        else:
            features['height_normalized'] = 0.5

        return features

    @staticmethod
    def extract_interest_features(user: Dict[str, Any]) -> Dict[str, float]:
        """Extract interest-based features."""
        features = {}

        # Interest categories
        interest_categories = {
            'sports': ['gym', 'fitness', 'running', 'yoga', 'sports', 'hiking', 'cycling'],
            'arts': ['art', 'music', 'painting', 'photography', 'dance', 'theater'],
            'intellectual': ['reading', 'books', 'science', 'learning', 'museums', 'history'],
            'social': ['parties', 'events', 'socializing', 'networking', 'friends'],
            'outdoor': ['hiking', 'camping', 'nature', 'travel', 'adventure', 'exploring'],
            'tech': ['technology', 'gaming', 'coding', 'gadgets', 'computers'],
            'food': ['cooking', 'foodie', 'restaurants', 'wine', 'coffee', 'baking']
        }

        user_interests = [i.lower() for i in user.get('interests', [])]
        user_hobbies = [h.lower() for h in user.get('hobbies', [])]
        all_user_interests = user_interests + user_hobbies

        for category, keywords in interest_categories.items():
            score = sum(1 for interest in all_user_interests if any(kw in interest for kw in keywords))
            features[f'interest_{category}'] = min(1.0, score / 3.0)  # Normalize

        return features

    @staticmethod
    def extract_lifestyle_features(user: Dict[str, Any]) -> Dict[str, float]:
        """Extract lifestyle features."""
        features = {}

        # Relationship goals
        goal_map = {'casual': 0.2, 'short_term': 0.4, 'long_term': 0.7, 'marriage': 1.0}
        features['relationship_goal'] = goal_map.get(user.get('relationship_goal', 'long_term'), 0.7)

        # Children
        children_map = {'no': 0.0, 'maybe': 0.5, 'yes': 1.0}
        features['wants_children'] = children_map.get(user.get('wants_children', 'maybe'), 0.5)

        # Lifestyle choices
        smoking_map = {'no': 0.0, 'sometimes': 0.5, 'yes': 1.0}
        features['smoking'] = smoking_map.get(user.get('smoking', 'no'), 0.0)

        drinking_map = {'no': 0.0, 'socially': 0.5, 'regularly': 1.0}
        features['drinking'] = drinking_map.get(user.get('drinking', 'socially'), 0.5)

        # Activity level
        activity_map = {'low': 0.2, 'moderate': 0.5, 'high': 1.0}
        features['activity_level'] = activity_map.get(user.get('activity_level', 'moderate'), 0.5)

        return features

    @staticmethod
    def extract_personality_features(user: Dict[str, Any]) -> Dict[str, float]:
        """Extract personality features."""
        features = {}

        # Big Five traits
        personality = user.get('personality', {})
        for trait in ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism']:
            features[f'personality_{trait}'] = personality.get(trait, 0.5)

        return features

    @staticmethod
    def extract_behavioral_features(user: Dict[str, Any]) -> Dict[str, float]:
        """Extract behavioral features."""
        features = {}

        features['response_rate'] = user.get('response_rate', 0.5)
        features['match_rate'] = user.get('match_rate', 0.3)
        features['conversation_rate'] = user.get('conversation_rate', 0.5)
        features['average_conversation_length'] = min(1.0, user.get('average_conversation_length', 10) / 50.0)

        # Account activity
        if 'created_at' in user:
            account_age = (datetime.utcnow() - datetime.fromisoformat(user['created_at'].replace('Z', '+00:00'))).days
            features['account_age_normalized'] = min(1.0, account_age / 365.0)
        else:
            features['account_age_normalized'] = 0.5

        features['daily_active_hours'] = user.get('daily_active_hours', 2) / 24.0
        features['messages_per_day'] = min(1.0, user.get('messages_per_day', 5) / 50.0)

        return features


class UserClustering:
    """Main user clustering service."""

    def __init__(self, n_clusters: int = 10, embedding_dim: int = 64):
        self.n_clusters = n_clusters
        self.embedding_dim = embedding_dim

        self.embedding_network: Optional[UserEmbeddingNetwork] = None
        self.kmeans: Optional[KMeans] = None
        self.scaler: Optional[StandardScaler] = None
        self.pca: Optional[PCA] = None

        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.feature_engineer = FeatureEngineer()

        self.cluster_profiles: Dict[int, Dict[str, Any]] = {}
        self.user_clusters: Dict[str, int] = {}

    async def initialize(self):
        """Initialize clustering models."""
        logger.info("Initializing User Clustering...")

        try:
            # Initialize embedding network
            self.embedding_network = UserEmbeddingNetwork(
                input_dim=100,
                embedding_dim=self.embedding_dim
            )
            self.embedding_network.to(self.device)
            self.embedding_network.eval()

            # Initialize clustering algorithm
            self.kmeans = KMeans(
                n_clusters=self.n_clusters,
                random_state=42,
                n_init=10,
                max_iter=300
            )

            # Initialize scaler and PCA
            self.scaler = StandardScaler()
            self.pca = PCA(n_components=50)

            # Try to load pre-trained models
            try:
                self._load_models()
                logger.info("Loaded pre-trained clustering models")
            except FileNotFoundError:
                logger.warning("Pre-trained models not found, using initialized models")

            logger.info("User Clustering initialized successfully")

        except Exception as e:
            logger.error(f"Failed to initialize user clustering: {e}")
            raise

    async def close(self):
        """Cleanup resources."""
        logger.info("Closing User Clustering")
        if self.embedding_network:
            del self.embedding_network
            self.embedding_network = None

    async def cluster_users(
        self,
        users: List[Dict[str, Any]],
        method: str = "kmeans"
    ) -> Dict[str, Any]:
        """
        Cluster users into groups.

        Args:
            users: List of user profiles
            method: Clustering method (kmeans, dbscan, hierarchical)

        Returns:
            Clustering results with assignments and profiles
        """
        try:
            if not users:
                return {"clusters": {}, "assignments": {}}

            # Extract features for all users
            user_features = []
            user_ids = []

            for user in users:
                features = self._extract_all_features(user)
                user_features.append(features)
                user_ids.append(user.get('user_id', ''))

            # Convert to numpy array
            feature_matrix = self._features_to_matrix(user_features)

            # Scale features
            scaled_features = self.scaler.fit_transform(feature_matrix)

            # Reduce dimensionality
            reduced_features = self.pca.fit_transform(scaled_features)

            # Get embeddings from neural network
            embeddings = await self._get_embeddings(reduced_features)

            # Perform clustering
            if method == "kmeans":
                cluster_labels = self._cluster_kmeans(embeddings)
            elif method == "dbscan":
                cluster_labels = self._cluster_dbscan(embeddings)
            elif method == "hierarchical":
                cluster_labels = self._cluster_hierarchical(embeddings)
            else:
                raise ValueError(f"Unknown clustering method: {method}")

            # Build cluster profiles
            cluster_profiles = self._build_cluster_profiles(
                users,
                cluster_labels,
                embeddings
            )

            # Store assignments
            self.user_clusters = {
                user_id: int(label)
                for user_id, label in zip(user_ids, cluster_labels)
            }
            self.cluster_profiles = cluster_profiles

            return {
                "n_clusters": len(set(cluster_labels)),
                "clusters": cluster_profiles,
                "assignments": self.user_clusters,
                "method": method,
                "timestamp": datetime.utcnow().isoformat()
            }

        except Exception as e:
            logger.error(f"User clustering failed: {e}")
            raise

    async def get_cluster_recommendations(
        self,
        user_id: str,
        limit: int = 10,
        exclude_user_ids: Optional[List[str]] = None
    ) -> List[str]:
        """
        Get user recommendations based on cluster membership.

        Args:
            user_id: Target user ID
            limit: Number of recommendations
            exclude_user_ids: User IDs to exclude

        Returns:
            List of recommended user IDs from same cluster
        """
        exclude_user_ids = exclude_user_ids or []

        # Get user's cluster
        cluster_id = self.user_clusters.get(user_id)

        if cluster_id is None:
            logger.warning(f"User {user_id} not found in clusters")
            return []

        # Get users in same cluster
        same_cluster_users = [
            uid for uid, cid in self.user_clusters.items()
            if cid == cluster_id and uid != user_id and uid not in exclude_user_ids
        ]

        # Return random sample (in practice, would rank by additional criteria)
        import random
        random.shuffle(same_cluster_users)

        return same_cluster_users[:limit]

    async def get_similar_users(
        self,
        user_profile: Dict[str, Any],
        all_users: List[Dict[str, Any]],
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Find similar users based on feature similarity.

        Args:
            user_profile: Target user profile
            all_users: Pool of all users
            limit: Number of similar users to return

        Returns:
            List of similar users with similarity scores
        """
        try:
            # Extract features for target user
            target_features = self._extract_all_features(user_profile)
            target_vector = self._features_to_matrix([target_features])[0]

            # Extract features for all users
            user_features = []
            for user in all_users:
                if user.get('user_id') != user_profile.get('user_id'):
                    features = self._extract_all_features(user)
                    user_features.append((user, features))

            # Calculate similarities
            similarities = []
            for user, features in user_features:
                feature_vector = self._features_to_matrix([features])[0]
                similarity = self._cosine_similarity(target_vector, feature_vector)

                similarities.append({
                    "user_id": user.get('user_id'),
                    "similarity_score": float(similarity),
                    "user_data": user
                })

            # Sort by similarity
            similarities.sort(key=lambda x: x['similarity_score'], reverse=True)

            return similarities[:limit]

        except Exception as e:
            logger.error(f"Similar user search failed: {e}")
            raise

    def _extract_all_features(self, user: Dict[str, Any]) -> Dict[str, float]:
        """Extract all features for a user."""
        all_features = {}

        all_features.update(self.feature_engineer.extract_demographic_features(user))
        all_features.update(self.feature_engineer.extract_interest_features(user))
        all_features.update(self.feature_engineer.extract_lifestyle_features(user))
        all_features.update(self.feature_engineer.extract_personality_features(user))
        all_features.update(self.feature_engineer.extract_behavioral_features(user))

        return all_features

    def _features_to_matrix(self, feature_dicts: List[Dict[str, float]]) -> np.ndarray:
        """Convert list of feature dictionaries to numpy matrix."""
        if not feature_dicts:
            return np.array([])

        # Get all unique feature names
        all_features = set()
        for features in feature_dicts:
            all_features.update(features.keys())

        feature_names = sorted(all_features)

        # Build matrix
        matrix = []
        for features in feature_dicts:
            row = [features.get(name, 0.0) for name in feature_names]
            matrix.append(row)

        return np.array(matrix)

    async def _get_embeddings(self, features: np.ndarray) -> np.ndarray:
        """Get embeddings from neural network."""
        try:
            # Convert to tensor
            feature_tensor = torch.FloatTensor(features).to(self.device)

            # Get embeddings
            with torch.no_grad():
                embeddings = self.embedding_network(feature_tensor)
                return embeddings.cpu().numpy()

        except Exception as e:
            logger.warning(f"Embedding generation failed: {e}, using raw features")
            return features

    def _cluster_kmeans(self, features: np.ndarray) -> np.ndarray:
        """Perform K-Means clustering."""
        labels = self.kmeans.fit_predict(features)
        return labels

    def _cluster_dbscan(self, features: np.ndarray) -> np.ndarray:
        """Perform DBSCAN clustering."""
        dbscan = DBSCAN(eps=0.5, min_samples=5)
        labels = dbscan.fit_predict(features)
        return labels

    def _cluster_hierarchical(self, features: np.ndarray) -> np.ndarray:
        """Perform hierarchical clustering."""
        hierarchical = AgglomerativeClustering(n_clusters=self.n_clusters)
        labels = hierarchical.fit_predict(features)
        return labels

    def _build_cluster_profiles(
        self,
        users: List[Dict[str, Any]],
        labels: np.ndarray,
        embeddings: np.ndarray
    ) -> Dict[int, Dict[str, Any]]:
        """Build profiles for each cluster."""
        profiles = {}

        unique_labels = set(labels)

        for label in unique_labels:
            if label == -1:  # Noise cluster in DBSCAN
                continue

            # Get users in this cluster
            cluster_users = [
                users[i] for i, l in enumerate(labels) if l == label
            ]

            # Calculate cluster statistics
            cluster_embeddings = embeddings[labels == label]
            centroid = np.mean(cluster_embeddings, axis=0)

            # Extract common characteristics
            profile = {
                "cluster_id": int(label),
                "size": len(cluster_users),
                "centroid": centroid.tolist(),
                "characteristics": self._extract_cluster_characteristics(cluster_users)
            }

            profiles[int(label)] = profile

        return profiles

    def _extract_cluster_characteristics(
        self,
        users: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Extract common characteristics of cluster members."""
        if not users:
            return {}

        characteristics = {}

        # Average age
        ages = [u.get('age', 25) for u in users]
        characteristics['average_age'] = round(np.mean(ages), 1)

        # Dominant gender
        genders = [u.get('gender', 'unknown') for u in users]
        from collections import Counter
        gender_counts = Counter(genders)
        characteristics['dominant_gender'] = gender_counts.most_common(1)[0][0]

        # Common interests
        all_interests = []
        for u in users:
            all_interests.extend(u.get('interests', []))
        interest_counts = Counter(all_interests)
        characteristics['top_interests'] = [i for i, _ in interest_counts.most_common(5)]

        # Relationship goals
        goals = [u.get('relationship_goal', 'long_term') for u in users]
        goal_counts = Counter(goals)
        characteristics['dominant_relationship_goal'] = goal_counts.most_common(1)[0][0]

        return characteristics

    def _cosine_similarity(self, vec1: np.ndarray, vec2: np.ndarray) -> float:
        """Calculate cosine similarity between two vectors."""
        dot_product = np.dot(vec1, vec2)
        norm1 = np.linalg.norm(vec1)
        norm2 = np.linalg.norm(vec2)

        if norm1 == 0 or norm2 == 0:
            return 0.0

        return dot_product / (norm1 * norm2)

    def _load_models(self):
        """Load pre-trained models."""
        # Load embedding network
        nn_path = "models/user_embedding.pth"
        self.embedding_network.load_state_dict(torch.load(nn_path, map_location=self.device))

        # Load KMeans
        kmeans_path = "models/user_kmeans.pkl"
        with open(kmeans_path, 'rb') as f:
            self.kmeans = pickle.load(f)

        # Load scaler
        scaler_path = "models/user_scaler.pkl"
        with open(scaler_path, 'rb') as f:
            self.scaler = pickle.load(f)

        # Load PCA
        pca_path = "models/user_pca.pkl"
        with open(pca_path, 'rb') as f:
            self.pca = pickle.load(f)

        # Load cluster profiles
        profiles_path = "models/cluster_profiles.json"
        with open(profiles_path, 'r') as f:
            self.cluster_profiles = json.load(f)

    def save_models(self):
        """Save models to disk."""
        # Save embedding network
        torch.save(self.embedding_network.state_dict(), "models/user_embedding.pth")

        # Save KMeans
        with open("models/user_kmeans.pkl", 'wb') as f:
            pickle.dump(self.kmeans, f)

        # Save scaler
        with open("models/user_scaler.pkl", 'wb') as f:
            pickle.dump(self.scaler, f)

        # Save PCA
        with open("models/user_pca.pkl", 'wb') as f:
            pickle.dump(self.pca, f)

        # Save cluster profiles
        with open("models/cluster_profiles.json", 'w') as f:
            # Convert numpy arrays to lists for JSON serialization
            profiles_serializable = {}
            for cluster_id, profile in self.cluster_profiles.items():
                profiles_serializable[cluster_id] = {
                    k: v if not isinstance(v, np.ndarray) else v.tolist()
                    for k, v in profile.items()
                }
            json.dump(profiles_serializable, f)

        logger.info("User clustering models saved successfully")
