#!/usr/bin/env python3
"""
Model Training Script for Dating App Recommendation System

This script trains all ML models on historical data:
- Collaborative filtering
- Content-based filtering
- Hybrid recommender
- Behavioral learner

Usage:
    python train_model.py --data-path /path/to/data --output-dir /path/to/models
"""

import argparse
import json
import logging
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List

import numpy as np
import pandas as pd
from app.ml.models.feature_extractor import FeatureExtractor
from app.ml.models.collaborative_filter import CollaborativeFilter
from app.ml.models.content_based_filter import ContentBasedFilter
from app.ml.models.hybrid_recommender import HybridRecommender
from app.ml.models.behavioral_learner import BehavioralLearner

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(f'training_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log')
    ]
)
logger = logging.getLogger(__name__)


class ModelTrainer:
    """Orchestrates training of all recommendation models."""

    def __init__(self, data_path: str, output_dir: str):
        """
        Initialize model trainer.

        Args:
            data_path: Path to training data directory
            output_dir: Path to save trained models
        """
        self.data_path = Path(data_path)
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

        # Initialize models
        self.feature_extractor = FeatureExtractor()
        self.collaborative_filter = CollaborativeFilter(
            n_factors=50,
            learning_rate=0.01,
            regularization=0.02,
            n_iterations=20
        )
        self.content_filter = ContentBasedFilter(self.feature_extractor)
        self.hybrid_recommender = HybridRecommender(
            collaborative_weight=0.5,
            content_weight=0.5,
            min_interactions_for_cf=5
        )
        self.behavioral_learner = BehavioralLearner()

        # Training metadata
        self.training_metadata = {
            'training_date': datetime.now().isoformat(),
            'data_path': str(data_path),
            'model_versions': {}
        }

    def load_data(self) -> Dict[str, any]:
        """
        Load training data from files.

        Expected files:
        - profiles.json: User profiles
        - interactions.json: Swipe/match/message interactions
        - user_interactions.json: Per-user interaction history

        Returns:
            Dictionary containing loaded data
        """
        logger.info("Loading training data...")

        data = {}

        # Load profiles
        profiles_file = self.data_path / 'profiles.json'
        if profiles_file.exists():
            with open(profiles_file, 'r') as f:
                data['profiles'] = json.load(f)
            logger.info(f"Loaded {len(data['profiles'])} profiles")
        else:
            logger.warning(f"Profiles file not found: {profiles_file}")
            data['profiles'] = []

        # Load interactions
        interactions_file = self.data_path / 'interactions.json'
        if interactions_file.exists():
            with open(interactions_file, 'r') as f:
                data['interactions'] = json.load(f)
            logger.info(f"Loaded {len(data['interactions'])} interactions")
        else:
            logger.warning(f"Interactions file not found: {interactions_file}")
            data['interactions'] = []

        # Load user-specific interactions
        user_interactions_file = self.data_path / 'user_interactions.json'
        if user_interactions_file.exists():
            with open(user_interactions_file, 'r') as f:
                data['user_interactions'] = json.load(f)
            logger.info(f"Loaded interactions for {len(data['user_interactions'])} users")
        else:
            logger.warning(f"User interactions file not found: {user_interactions_file}")
            data['user_interactions'] = {}

        return data

    def generate_synthetic_data(self, n_users: int = 1000, n_interactions: int = 10000):
        """
        Generate synthetic training data for testing.

        Args:
            n_users: Number of synthetic users
            n_interactions: Number of synthetic interactions
        """
        logger.info(f"Generating synthetic data: {n_users} users, {n_interactions} interactions")

        # Generate synthetic profiles
        profiles = []
        for i in range(n_users):
            profile = {
                'user_id': f'user_{i}',
                'age': np.random.randint(18, 60),
                'gender': np.random.choice(['male', 'female', 'non_binary']),
                'location': {
                    'latitude': np.random.uniform(-90, 90),
                    'longitude': np.random.uniform(-180, 180)
                },
                'interests': list(np.random.choice(
                    ['hiking', 'reading', 'music', 'travel', 'sports', 'cooking',
                     'art', 'technology', 'gaming', 'fitness', 'photography'],
                    size=np.random.randint(2, 6),
                    replace=False
                )),
                'education': np.random.choice(['high_school', 'bachelors', 'masters', 'phd']),
                'relationship_goal': np.random.choice(['serious', 'casual', 'friendship']),
                'bio': f'This is a synthetic bio for user {i}',
                'photo_count': np.random.randint(1, 9),
                'is_verified': np.random.choice([True, False], p=[0.3, 0.7]),
                'is_premium': np.random.choice([True, False], p=[0.2, 0.8]),
                'completeness_score': np.random.uniform(0.5, 1.0),
                'created_at': datetime.now().isoformat(),
                'preferences': {
                    'age_min': np.random.randint(18, 35),
                    'age_max': np.random.randint(35, 60),
                    'gender_preference': np.random.choice(['male', 'female', 'all']),
                    'max_distance_km': np.random.randint(10, 100)
                }
            }
            profiles.append(profile)

        # Generate synthetic interactions
        interactions = []
        user_interactions = {f'user_{i}': [] for i in range(n_users)}

        for i in range(n_interactions):
            user_idx = np.random.randint(0, n_users)
            target_idx = np.random.randint(0, n_users)

            if user_idx == target_idx:
                continue

            action = np.random.choice(
                ['like', 'pass', 'super_like', 'match', 'message'],
                p=[0.3, 0.4, 0.05, 0.15, 0.1]
            )

            interaction = {
                'user_id': f'user_{user_idx}',
                'target_user_id': f'user_{target_idx}',
                'action': action,
                'timestamp': datetime.now().isoformat()
            }

            interactions.append(interaction)
            user_interactions[f'user_{user_idx}'].append({
                **interaction,
                'target_profile': profiles[target_idx]
            })

        return {
            'profiles': profiles,
            'interactions': interactions,
            'user_interactions': user_interactions
        }

    def train_collaborative_filter(self, interactions: List[Dict]):
        """Train collaborative filtering model."""
        logger.info("Training collaborative filter...")

        try:
            self.collaborative_filter.fit(interactions, implicit=True)

            # Save model
            model_path = self.output_dir / 'collaborative_filter.pkl'
            self.collaborative_filter.save(str(model_path))
            logger.info(f"Collaborative filter saved to {model_path}")

            self.training_metadata['model_versions']['collaborative_filter'] = {
                'model_path': str(model_path),
                'n_interactions': len(interactions),
                'n_users': len(self.collaborative_filter.user_id_to_index),
                'n_items': len(self.collaborative_filter.item_id_to_index),
                'n_factors': self.collaborative_filter.n_factors
            }

            return True
        except Exception as e:
            logger.error(f"Collaborative filter training failed: {e}", exc_info=True)
            return False

    def train_content_filter(self, profiles: List[Dict], user_interactions: Dict):
        """Train content-based filtering model."""
        logger.info("Training content-based filter...")

        try:
            self.content_filter.fit(profiles, user_interactions)

            # Content filter doesn't have a traditional save method,
            # but we can save the feature extractor
            logger.info("Content-based filter trained successfully")

            self.training_metadata['model_versions']['content_filter'] = {
                'n_profiles': len(profiles),
                'n_users_with_history': len(user_interactions)
            }

            return True
        except Exception as e:
            logger.error(f"Content filter training failed: {e}", exc_info=True)
            return False

    def train_hybrid_recommender(
        self,
        profiles: List[Dict],
        interactions: List[Dict],
        user_interactions: Dict
    ):
        """Train hybrid recommendation model."""
        logger.info("Training hybrid recommender...")

        try:
            self.hybrid_recommender.fit(profiles, interactions, user_interactions)
            logger.info("Hybrid recommender trained successfully")

            self.training_metadata['model_versions']['hybrid_recommender'] = {
                'n_profiles': len(profiles),
                'n_interactions': len(interactions),
                'collaborative_weight': self.hybrid_recommender.collaborative_weight,
                'content_weight': self.hybrid_recommender.content_weight
            }

            return True
        except Exception as e:
            logger.error(f"Hybrid recommender training failed: {e}", exc_info=True)
            return False

    def train_behavioral_learner(self, interactions: List[Dict], profiles_dict: Dict):
        """Train behavioral learning system."""
        logger.info("Training behavioral learner...")

        try:
            # Process interactions to learn behavior patterns
            for interaction in interactions:
                user_id = interaction['user_id']
                target_user_id = interaction['target_user_id']
                action = interaction.get('action', 'like')

                # Get target profile
                target_profile = profiles_dict.get(target_user_id, {})

                # Learn from interaction
                self.behavioral_learner.learn_from_swipe(
                    user_id=user_id,
                    target_user_id=target_user_id,
                    action=action,
                    target_profile=target_profile
                )

            logger.info("Behavioral learner trained successfully")

            self.training_metadata['model_versions']['behavioral_learner'] = {
                'n_users': len(self.behavioral_learner.user_behaviors),
                'total_swipes': sum(
                    p['total_swipes']
                    for p in self.behavioral_learner.swipe_patterns.values()
                )
            }

            return True
        except Exception as e:
            logger.error(f"Behavioral learner training failed: {e}", exc_info=True)
            return False

    def evaluate_models(self, test_data: Dict) -> Dict:
        """
        Evaluate trained models on test data.

        Args:
            test_data: Test dataset

        Returns:
            Dictionary of evaluation metrics
        """
        logger.info("Evaluating models...")

        metrics = {
            'collaborative_filter': {},
            'content_filter': {},
            'hybrid_recommender': {},
            'behavioral_learner': {}
        }

        profiles = test_data.get('profiles', [])
        interactions = test_data.get('interactions', [])
        user_interactions = test_data.get('user_interactions', {})

        if not profiles or not interactions:
            logger.warning("Insufficient test data for evaluation")
            return metrics

        # Create profile lookup
        profiles_dict = {p['user_id']: p for p in profiles}

        # Split interactions into test pairs
        test_pairs = [(i['user_id'], i['target_user_id'], i.get('action', 'like'))
                      for i in interactions[:1000]]  # Limit to 1000 for performance

        # Evaluation parameters
        k_values = [5, 10, 20]

        try:
            # Evaluate Collaborative Filter
            if hasattr(self.collaborative_filter, 'user_id_to_index'):
                cf_metrics = self._evaluate_recommender(
                    self.collaborative_filter,
                    test_pairs,
                    profiles_dict,
                    k_values,
                    'collaborative'
                )
                metrics['collaborative_filter'] = cf_metrics

            # Evaluate Content-Based Filter
            cb_metrics = self._evaluate_recommender(
                self.content_filter,
                test_pairs,
                profiles_dict,
                k_values,
                'content'
            )
            metrics['content_filter'] = cb_metrics

            # Evaluate Hybrid Recommender
            hybrid_metrics = self._evaluate_recommender(
                self.hybrid_recommender,
                test_pairs,
                profiles_dict,
                k_values,
                'hybrid'
            )
            metrics['hybrid_recommender'] = hybrid_metrics

            # Calculate coverage and diversity
            metrics['overall'] = {
                'total_test_interactions': len(test_pairs),
                'unique_users_tested': len(set(p[0] for p in test_pairs)),
                'unique_targets_tested': len(set(p[1] for p in test_pairs))
            }

        except Exception as e:
            logger.error(f"Error during evaluation: {e}", exc_info=True)

        logger.info("Model evaluation completed")
        return metrics

    def _evaluate_recommender(
        self,
        recommender: any,
        test_pairs: List,
        profiles_dict: Dict,
        k_values: List[int],
        model_type: str
    ) -> Dict:
        """
        Evaluate a specific recommender model.

        Args:
            recommender: The recommender model to evaluate
            test_pairs: List of (user_id, target_id, action) tuples
            profiles_dict: Dictionary of user profiles
            k_values: List of K values for Precision@K and Recall@K
            model_type: Type of model being evaluated

        Returns:
            Dictionary of evaluation metrics
        """
        metrics = {}

        # Initialize metric accumulators
        precision_at_k = {k: [] for k in k_values}
        recall_at_k = {k: [] for k in k_values}
        ndcg_at_k = {k: [] for k in k_values}
        recommended_items = set()

        # Group test pairs by user
        user_test_data = {}
        for user_id, target_id, action in test_pairs:
            if user_id not in user_test_data:
                user_test_data[user_id] = []
            # Only consider positive interactions (likes, matches)
            if action in ['like', 'super_like', 'match']:
                user_test_data[user_id].append(target_id)

        # Evaluate for each user
        evaluated_users = 0
        for user_id, relevant_items in user_test_data.items():
            if not relevant_items:
                continue

            try:
                # Get candidate profiles (all profiles except the user)
                candidate_profiles = [p for p in profiles_dict.values()
                                     if p['user_id'] != user_id]

                if not candidate_profiles:
                    continue

                # Get recommendations
                if model_type == 'collaborative':
                    recommendations = recommender.recommend(
                        user_id=user_id,
                        k=max(k_values),
                        exclude_seen=True
                    )
                elif model_type == 'content':
                    user_profile = profiles_dict.get(user_id, {})
                    recommendations = recommender.recommend(
                        user_id=user_id,
                        user_profile=user_profile,
                        candidate_profiles=candidate_profiles[:100],  # Limit candidates
                        k=max(k_values)
                    )
                elif model_type == 'hybrid':
                    user_profile = profiles_dict.get(user_id, {})
                    recommendations = recommender.recommend(
                        user_id=user_id,
                        user_profile=user_profile,
                        candidate_profiles=candidate_profiles[:100],
                        k=max(k_values)
                    )
                else:
                    continue

                # Extract recommended user IDs
                if isinstance(recommendations, list) and len(recommendations) > 0:
                    if isinstance(recommendations[0], dict):
                        recommended_ids = [r.get('user_id') for r in recommendations]
                    else:
                        recommended_ids = recommendations
                else:
                    recommended_ids = []

                # Calculate metrics for each K
                for k in k_values:
                    top_k_recs = recommended_ids[:k]

                    # Precision@K: proportion of recommended items that are relevant
                    if top_k_recs:
                        hits = len(set(top_k_recs) & set(relevant_items))
                        precision = hits / len(top_k_recs)
                        precision_at_k[k].append(precision)

                        # Recall@K: proportion of relevant items that are recommended
                        recall = hits / len(relevant_items) if relevant_items else 0
                        recall_at_k[k].append(recall)

                        # NDCG@K: Normalized Discounted Cumulative Gain
                        dcg = sum([1 / np.log2(i + 2) if rec in relevant_items else 0
                                  for i, rec in enumerate(top_k_recs)])
                        idcg = sum([1 / np.log2(i + 2)
                                   for i in range(min(len(relevant_items), k))])
                        ndcg = dcg / idcg if idcg > 0 else 0
                        ndcg_at_k[k].append(ndcg)

                # Track coverage
                recommended_items.update(recommended_ids)
                evaluated_users += 1

            except Exception as e:
                logger.warning(f"Error evaluating user {user_id}: {e}")
                continue

        # Calculate average metrics
        for k in k_values:
            metrics[f'precision@{k}'] = np.mean(precision_at_k[k]) if precision_at_k[k] else 0
            metrics[f'recall@{k}'] = np.mean(recall_at_k[k]) if recall_at_k[k] else 0
            metrics[f'ndcg@{k}'] = np.mean(ndcg_at_k[k]) if ndcg_at_k[k] else 0

        # Calculate coverage (percentage of items that were recommended at least once)
        total_items = len(profiles_dict)
        metrics['coverage'] = len(recommended_items) / total_items if total_items > 0 else 0

        # Calculate diversity (average pairwise distance between recommendations)
        # Simplified diversity measure based on unique recommendations
        metrics['diversity'] = len(recommended_items) / (evaluated_users * max(k_values)) if evaluated_users > 0 else 0

        metrics['evaluated_users'] = evaluated_users

        return metrics

    def save_metadata(self):
        """Save training metadata."""
        metadata_path = self.output_dir / 'training_metadata.json'
        with open(metadata_path, 'w') as f:
            json.dump(self.training_metadata, f, indent=2)
        logger.info(f"Training metadata saved to {metadata_path}")

    def train_all(self, use_synthetic: bool = False):
        """
        Train all models.

        Args:
            use_synthetic: Whether to use synthetic data instead of loading from files
        """
        logger.info("="*80)
        logger.info("Starting model training pipeline")
        logger.info("="*80)

        # Load or generate data
        if use_synthetic:
            data = self.generate_synthetic_data(n_users=1000, n_interactions=10000)
        else:
            data = self.load_data()

        profiles = data.get('profiles', [])
        interactions = data.get('interactions', [])
        user_interactions = data.get('user_interactions', {})

        if not profiles or not interactions:
            logger.error("Insufficient data for training")
            return False

        # Create profile lookup
        profiles_dict = {p['user_id']: p for p in profiles}

        # Train each model
        success_count = 0

        if self.train_collaborative_filter(interactions):
            success_count += 1

        if self.train_content_filter(profiles, user_interactions):
            success_count += 1

        if self.train_hybrid_recommender(profiles, interactions, user_interactions):
            success_count += 1

        if self.train_behavioral_learner(interactions, profiles_dict):
            success_count += 1

        # Save metadata
        self.training_metadata['training_success'] = success_count == 4
        self.training_metadata['models_trained'] = success_count
        self.save_metadata()

        logger.info("="*80)
        logger.info(f"Training complete: {success_count}/4 models trained successfully")
        logger.info("="*80)

        return success_count == 4


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Train recommendation models for dating app'
    )
    parser.add_argument(
        '--data-path',
        type=str,
        default='./data',
        help='Path to training data directory'
    )
    parser.add_argument(
        '--output-dir',
        type=str,
        default='./models',
        help='Directory to save trained models'
    )
    parser.add_argument(
        '--synthetic',
        action='store_true',
        help='Use synthetic data for training'
    )

    args = parser.parse_args()

    # Create trainer
    trainer = ModelTrainer(
        data_path=args.data_path,
        output_dir=args.output_dir
    )

    # Train models
    success = trainer.train_all(use_synthetic=args.synthetic)

    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
