"""Collaborative filtering model for learning from user behavior patterns."""

import numpy as np
from typing import Dict, List, Tuple, Optional, Set
from collections import defaultdict
from sklearn.metrics.pairwise import cosine_similarity
from scipy.sparse import csr_matrix
import pickle
import logging

logger = logging.getLogger(__name__)


class CollaborativeFilter:
    """
    Collaborative filtering recommendation system.

    Learns from user interactions (swipes, matches, messages) to find
    users with similar preferences and recommend profiles accordingly.
    """

    def __init__(
        self,
        n_factors: int = 50,
        learning_rate: float = 0.01,
        regularization: float = 0.02,
        n_iterations: int = 20
    ):
        """
        Initialize collaborative filter.

        Args:
            n_factors: Number of latent factors
            learning_rate: Learning rate for matrix factorization
            regularization: Regularization parameter
            n_iterations: Number of training iterations
        """
        self.n_factors = n_factors
        self.learning_rate = learning_rate
        self.regularization = regularization
        self.n_iterations = n_iterations

        # User-item matrices
        self.user_factors = None
        self.item_factors = None

        # Mappings
        self.user_id_to_index = {}
        self.index_to_user_id = {}
        self.item_id_to_index = {}
        self.index_to_item_id = {}

        # Interaction data
        self.interaction_matrix = None
        self.user_similarities = {}
        self.item_similarities = {}

        # Statistics
        self.global_mean = 0.0
        self.user_biases = {}
        self.item_biases = {}

    def fit(
        self,
        interactions: List[Dict],
        implicit: bool = True
    ):
        """
        Train collaborative filter on interaction data.

        Args:
            interactions: List of interaction dicts with keys:
                - user_id: User who performed action
                - target_user_id: User who received action
                - action: Type of action (like, pass, super_like, message)
                - timestamp: When action occurred
                - weight: Optional explicit weight (default: inferred from action)
            implicit: Whether to use implicit feedback (True) or explicit ratings
        """
        logger.info(f"Training collaborative filter on {len(interactions)} interactions")

        # Build user and item indices
        self._build_indices(interactions)

        # Build interaction matrix
        self._build_interaction_matrix(interactions, implicit)

        # Initialize latent factors
        n_users = len(self.user_id_to_index)
        n_items = len(self.item_id_to_index)

        self.user_factors = np.random.normal(
            0, 0.1, (n_users, self.n_factors)
        ).astype(np.float32)
        self.item_factors = np.random.normal(
            0, 0.1, (n_items, self.n_factors)
        ).astype(np.float32)

        # Calculate biases
        self._calculate_biases()

        # Train using alternating least squares (ALS) or SGD
        if implicit:
            self._train_implicit_als()
        else:
            self._train_sgd()

        # Calculate user and item similarities
        self._calculate_similarities()

        logger.info("Collaborative filter training completed")

    def predict_score(self, user_id: str, target_user_id: str) -> float:
        """
        Predict compatibility score between two users.

        Args:
            user_id: Source user ID
            target_user_id: Target user ID

        Returns:
            Predicted score (0-1)
        """
        # Handle cold start (new users)
        if user_id not in self.user_id_to_index or target_user_id not in self.item_id_to_index:
            return self.global_mean

        user_idx = self.user_id_to_index[user_id]
        item_idx = self.item_id_to_index[target_user_id]

        # Base prediction from latent factors
        score = np.dot(self.user_factors[user_idx], self.item_factors[item_idx])

        # Add biases
        score += self.user_biases.get(user_id, 0.0)
        score += self.item_biases.get(target_user_id, 0.0)
        score += self.global_mean

        # Normalize to 0-1
        return self._sigmoid(score)

    def get_similar_users(
        self,
        user_id: str,
        n: int = 10,
        exclude_ids: Optional[Set[str]] = None
    ) -> List[Tuple[str, float]]:
        """
        Find users with similar preferences.

        Args:
            user_id: User ID to find similar users for
            n: Number of similar users to return
            exclude_ids: Set of user IDs to exclude

        Returns:
            List of (user_id, similarity_score) tuples
        """
        if user_id not in self.user_id_to_index:
            return []

        exclude_ids = exclude_ids or set()
        user_idx = self.user_id_to_index[user_id]

        # Calculate similarities with all other users
        similarities = []
        for other_id, other_idx in self.user_id_to_index.items():
            if other_id == user_id or other_id in exclude_ids:
                continue

            # Cosine similarity between user vectors
            sim = cosine_similarity(
                self.user_factors[user_idx].reshape(1, -1),
                self.user_factors[other_idx].reshape(1, -1)
            )[0, 0]

            similarities.append((other_id, float(sim)))

        # Sort by similarity and return top N
        similarities.sort(key=lambda x: x[1], reverse=True)
        return similarities[:n]

    def recommend_for_user(
        self,
        user_id: str,
        candidate_ids: List[str],
        n: int = 20
    ) -> List[Tuple[str, float]]:
        """
        Recommend top N candidates for a user based on collaborative filtering.

        Args:
            user_id: User ID to get recommendations for
            candidate_ids: List of candidate user IDs to rank
            n: Number of recommendations to return

        Returns:
            List of (user_id, score) tuples sorted by score
        """
        # Calculate scores for all candidates
        scores = []
        for candidate_id in candidate_ids:
            score = self.predict_score(user_id, candidate_id)
            scores.append((candidate_id, score))

        # Sort by score and return top N
        scores.sort(key=lambda x: x[1], reverse=True)
        return scores[:n]

    def get_user_preferences(self, user_id: str) -> Dict[str, float]:
        """
        Get learned preferences for a user.

        Args:
            user_id: User ID

        Returns:
            Dictionary of preference insights
        """
        if user_id not in self.user_id_to_index:
            return {}

        user_idx = self.user_id_to_index[user_id]
        user_vector = self.user_factors[user_idx]

        # Analyze user vector to extract preferences
        preferences = {
            'preference_strength': float(np.linalg.norm(user_vector)),
            'selectivity': self.user_biases.get(user_id, 0.0),
            'factor_weights': user_vector.tolist()
        }

        return preferences

    def _build_indices(self, interactions: List[Dict]):
        """Build user and item index mappings."""
        user_ids = set()
        item_ids = set()

        for interaction in interactions:
            user_ids.add(interaction['user_id'])
            item_ids.add(interaction['target_user_id'])

        # Create bidirectional mappings
        for idx, user_id in enumerate(sorted(user_ids)):
            self.user_id_to_index[user_id] = idx
            self.index_to_user_id[idx] = user_id

        for idx, item_id in enumerate(sorted(item_ids)):
            self.item_id_to_index[item_id] = idx
            self.index_to_item_id[idx] = item_id

        logger.info(f"Built indices: {len(user_ids)} users, {len(item_ids)} items")

    def _build_interaction_matrix(self, interactions: List[Dict], implicit: bool):
        """Build sparse interaction matrix."""
        n_users = len(self.user_id_to_index)
        n_items = len(self.item_id_to_index)

        # Weight mapping for different actions
        action_weights = {
            'pass': -0.5,
            'like': 1.0,
            'super_like': 2.0,
            'match': 3.0,
            'message': 4.0,
            'conversation': 5.0
        }

        # Create dense matrix (will convert to sparse)
        matrix = np.zeros((n_users, n_items), dtype=np.float32)

        for interaction in interactions:
            user_idx = self.user_id_to_index[interaction['user_id']]
            item_idx = self.item_id_to_index[interaction['target_user_id']]

            # Get weight
            if 'weight' in interaction:
                weight = interaction['weight']
            else:
                action = interaction.get('action', 'like')
                weight = action_weights.get(action, 1.0)

            # For implicit feedback, use binary or weighted values
            if implicit:
                weight = max(weight, 0)  # Remove negative weights

            matrix[user_idx, item_idx] = max(matrix[user_idx, item_idx], weight)

        # Convert to sparse matrix for efficiency
        self.interaction_matrix = csr_matrix(matrix)

        logger.info(f"Built interaction matrix: {matrix.shape}, "
                   f"{np.count_nonzero(matrix)} interactions")

    def _calculate_biases(self):
        """Calculate global mean and user/item biases."""
        # Global mean of all interactions
        interactions = self.interaction_matrix.data
        self.global_mean = float(np.mean(interactions)) if len(interactions) > 0 else 0.0

        # User biases (how selective each user is)
        for user_id, user_idx in self.user_id_to_index.items():
            user_ratings = self.interaction_matrix[user_idx].data
            if len(user_ratings) > 0:
                self.user_biases[user_id] = float(np.mean(user_ratings) - self.global_mean)
            else:
                self.user_biases[user_id] = 0.0

        # Item biases (how popular each item is)
        for item_id, item_idx in self.item_id_to_index.items():
            item_ratings = self.interaction_matrix[:, item_idx].data
            if len(item_ratings) > 0:
                self.item_biases[item_id] = float(np.mean(item_ratings) - self.global_mean)
            else:
                self.item_biases[item_id] = 0.0

    def _train_implicit_als(self):
        """Train using Alternating Least Squares for implicit feedback."""
        logger.info("Training using implicit ALS")

        confidence_weight = 40  # Weight for implicit feedback

        for iteration in range(self.n_iterations):
            # Fix item factors, update user factors
            for user_idx in range(len(self.user_id_to_index)):
                # Get user's interactions
                user_items = self.interaction_matrix[user_idx].indices
                user_ratings = self.interaction_matrix[user_idx].data

                if len(user_items) == 0:
                    continue

                # Confidence weighted ALS update
                C = np.diag(confidence_weight * user_ratings)
                Y = self.item_factors[user_items]

                # Update user factors: (Y^T C Y + λI)^-1 Y^T C p
                A = Y.T @ C @ Y + self.regularization * np.eye(self.n_factors)
                b = Y.T @ C @ np.ones(len(user_items))

                try:
                    self.user_factors[user_idx] = np.linalg.solve(A, b)
                except np.linalg.LinAlgError:
                    pass  # Keep previous value if singular

            # Fix user factors, update item factors
            for item_idx in range(len(self.item_id_to_index)):
                # Get users who interacted with this item
                item_users = (self.interaction_matrix[:, item_idx] > 0).nonzero()[0]
                item_ratings = self.interaction_matrix[item_users, item_idx].A.flatten()

                if len(item_users) == 0:
                    continue

                # Confidence weighted ALS update
                C = np.diag(confidence_weight * item_ratings)
                X = self.user_factors[item_users]

                # Update item factors
                A = X.T @ C @ X + self.regularization * np.eye(self.n_factors)
                b = X.T @ C @ np.ones(len(item_users))

                try:
                    self.item_factors[item_idx] = np.linalg.solve(A, b)
                except np.linalg.LinAlgError:
                    pass

            if (iteration + 1) % 5 == 0:
                logger.info(f"Completed iteration {iteration + 1}/{self.n_iterations}")

    def _train_sgd(self):
        """Train using Stochastic Gradient Descent for explicit ratings."""
        logger.info("Training using SGD")

        # Get all non-zero interactions
        rows, cols = self.interaction_matrix.nonzero()
        n_samples = len(rows)

        for iteration in range(self.n_iterations):
            # Shuffle samples
            indices = np.random.permutation(n_samples)

            total_error = 0.0

            for idx in indices:
                user_idx = rows[idx]
                item_idx = cols[idx]
                rating = self.interaction_matrix[user_idx, item_idx]

                # Predict
                prediction = np.dot(
                    self.user_factors[user_idx],
                    self.item_factors[item_idx]
                )

                # Error
                error = rating - prediction
                total_error += error ** 2

                # Update factors
                user_factor_update = error * self.item_factors[item_idx] - \
                                    self.regularization * self.user_factors[user_idx]
                item_factor_update = error * self.user_factors[user_idx] - \
                                    self.regularization * self.item_factors[item_idx]

                self.user_factors[user_idx] += self.learning_rate * user_factor_update
                self.item_factors[item_idx] += self.learning_rate * item_factor_update

            rmse = np.sqrt(total_error / n_samples)
            if (iteration + 1) % 5 == 0:
                logger.info(f"Iteration {iteration + 1}/{self.n_iterations}, RMSE: {rmse:.4f}")

    def _calculate_similarities(self):
        """Pre-calculate user and item similarities."""
        logger.info("Calculating similarity matrices")

        # User similarities
        if self.user_factors is not None:
            user_sim = cosine_similarity(self.user_factors)
            for i, user_id in self.index_to_user_id.items():
                self.user_similarities[user_id] = {
                    self.index_to_user_id[j]: float(user_sim[i, j])
                    for j in range(len(self.index_to_user_id))
                    if i != j
                }

        # Item similarities
        if self.item_factors is not None:
            item_sim = cosine_similarity(self.item_factors)
            for i, item_id in self.index_to_item_id.items():
                self.item_similarities[item_id] = {
                    self.index_to_item_id[j]: float(item_sim[i, j])
                    for j in range(len(self.index_to_item_id))
                    if i != j
                }

    @staticmethod
    def _sigmoid(x: float) -> float:
        """Sigmoid activation to normalize scores to 0-1."""
        return 1.0 / (1.0 + np.exp(-x))

    def save(self, filepath: str):
        """Save model to disk."""
        model_data = {
            'user_factors': self.user_factors,
            'item_factors': self.item_factors,
            'user_id_to_index': self.user_id_to_index,
            'index_to_user_id': self.index_to_user_id,
            'item_id_to_index': self.item_id_to_index,
            'index_to_item_id': self.index_to_item_id,
            'global_mean': self.global_mean,
            'user_biases': self.user_biases,
            'item_biases': self.item_biases,
            'user_similarities': self.user_similarities,
            'item_similarities': self.item_similarities,
        }

        with open(filepath, 'wb') as f:
            pickle.dump(model_data, f)

        logger.info(f"Model saved to {filepath}")

    def load(self, filepath: str):
        """Load model from disk."""
        with open(filepath, 'rb') as f:
            model_data = pickle.load(f)

        self.user_factors = model_data['user_factors']
        self.item_factors = model_data['item_factors']
        self.user_id_to_index = model_data['user_id_to_index']
        self.index_to_user_id = model_data['index_to_user_id']
        self.item_id_to_index = model_data['item_id_to_index']
        self.index_to_item_id = model_data['index_to_item_id']
        self.global_mean = model_data['global_mean']
        self.user_biases = model_data['user_biases']
        self.item_biases = model_data['item_biases']
        self.user_similarities = model_data.get('user_similarities', {})
        self.item_similarities = model_data.get('item_similarities', {})

        logger.info(f"Model loaded from {filepath}")
