#!/usr/bin/env python3
"""
Model Evaluation Script for Recommendation System

Evaluates model performance using standard metrics:
- Precision@K
- Recall@K
- NDCG (Normalized Discounted Cumulative Gain)
- Coverage
- Diversity
- Hit Rate
- MRR (Mean Reciprocal Rank)

Usage:
    python evaluate_model.py --model-dir /path/to/models --test-data /path/to/test/data
"""

import argparse
import json
import logging
import sys
from pathlib import Path
from typing import Dict, List, Tuple, Set

import numpy as np
import pandas as pd
from collections import defaultdict

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class RecommendationEvaluator:
    """Evaluates recommendation system performance."""

    def __init__(self, k_values: List[int] = None):
        """
        Initialize evaluator.

        Args:
            k_values: List of K values for precision@K and recall@K
        """
        self.k_values = k_values or [5, 10, 20, 50]
        self.metrics = defaultdict(dict)

    def load_test_data(self, test_data_path: str) -> Dict:
        """Load test data from JSON file."""
        logger.info(f"Loading test data from {test_data_path}")

        with open(test_data_path, 'r') as f:
            data = json.load(f)

        logger.info(f"Loaded test data: {len(data.get('test_interactions', []))} test interactions")
        return data

    def calculate_precision_at_k(
        self,
        recommendations: List[str],
        relevant_items: Set[str],
        k: int
    ) -> float:
        """
        Calculate Precision@K.

        Args:
            recommendations: Ordered list of recommended item IDs
            relevant_items: Set of relevant (ground truth) item IDs
            k: Number of top recommendations to consider

        Returns:
            Precision@K score
        """
        if k <= 0 or not recommendations:
            return 0.0

        top_k = recommendations[:k]
        relevant_recommended = sum(1 for item in top_k if item in relevant_items)

        return relevant_recommended / k

    def calculate_recall_at_k(
        self,
        recommendations: List[str],
        relevant_items: Set[str],
        k: int
    ) -> float:
        """
        Calculate Recall@K.

        Args:
            recommendations: Ordered list of recommended item IDs
            relevant_items: Set of relevant (ground truth) item IDs
            k: Number of top recommendations to consider

        Returns:
            Recall@K score
        """
        if not relevant_items or k <= 0:
            return 0.0

        top_k = recommendations[:k]
        relevant_recommended = sum(1 for item in top_k if item in relevant_items)

        return relevant_recommended / len(relevant_items)

    def calculate_f1_at_k(
        self,
        recommendations: List[str],
        relevant_items: Set[str],
        k: int
    ) -> float:
        """Calculate F1 score at K."""
        precision = self.calculate_precision_at_k(recommendations, relevant_items, k)
        recall = self.calculate_recall_at_k(recommendations, relevant_items, k)

        if precision + recall == 0:
            return 0.0

        return 2 * (precision * recall) / (precision + recall)

    def calculate_ndcg_at_k(
        self,
        recommendations: List[str],
        relevant_items: Dict[str, float],
        k: int
    ) -> float:
        """
        Calculate NDCG@K (Normalized Discounted Cumulative Gain).

        Args:
            recommendations: Ordered list of recommended item IDs
            relevant_items: Dict mapping item IDs to relevance scores
            k: Number of top recommendations to consider

        Returns:
            NDCG@K score
        """
        def dcg_at_k(scores: List[float], k: int) -> float:
            """Calculate DCG@K."""
            scores = scores[:k]
            return sum(
                (2 ** rel - 1) / np.log2(idx + 2)
                for idx, rel in enumerate(scores)
            )

        if k <= 0 or not recommendations:
            return 0.0

        # Get relevance scores for recommendations
        rec_scores = [relevant_items.get(item, 0.0) for item in recommendations[:k]]

        # Calculate DCG
        dcg = dcg_at_k(rec_scores, k)

        # Calculate ideal DCG (IDCG)
        ideal_scores = sorted(relevant_items.values(), reverse=True)
        idcg = dcg_at_k(ideal_scores, k)

        if idcg == 0:
            return 0.0

        return dcg / idcg

    def calculate_hit_rate_at_k(
        self,
        recommendations: List[str],
        relevant_items: Set[str],
        k: int
    ) -> float:
        """
        Calculate Hit Rate@K (whether any relevant item appears in top K).

        Args:
            recommendations: Ordered list of recommended item IDs
            relevant_items: Set of relevant item IDs
            k: Number of top recommendations to consider

        Returns:
            1.0 if hit, 0.0 otherwise
        """
        top_k = set(recommendations[:k])
        return 1.0 if len(top_k & relevant_items) > 0 else 0.0

    def calculate_mrr(
        self,
        recommendations: List[str],
        relevant_items: Set[str]
    ) -> float:
        """
        Calculate MRR (Mean Reciprocal Rank).

        Args:
            recommendations: Ordered list of recommended item IDs
            relevant_items: Set of relevant item IDs

        Returns:
            Reciprocal rank of first relevant item
        """
        for idx, item in enumerate(recommendations):
            if item in relevant_items:
                return 1.0 / (idx + 1)
        return 0.0

    def calculate_coverage(
        self,
        all_recommendations: List[List[str]],
        catalog_items: Set[str]
    ) -> float:
        """
        Calculate catalog coverage (percentage of items ever recommended).

        Args:
            all_recommendations: List of recommendation lists for all users
            catalog_items: Set of all available items

        Returns:
            Coverage percentage (0-1)
        """
        recommended_items = set()
        for recs in all_recommendations:
            recommended_items.update(recs)

        if not catalog_items:
            return 0.0

        return len(recommended_items) / len(catalog_items)

    def calculate_diversity(
        self,
        all_recommendations: List[List[str]],
        item_features: Dict[str, List]
    ) -> float:
        """
        Calculate average intra-list diversity (using Jaccard distance).

        Args:
            all_recommendations: List of recommendation lists for all users
            item_features: Dict mapping item IDs to feature vectors

        Returns:
            Average diversity score
        """
        diversity_scores = []

        for recs in all_recommendations:
            if len(recs) < 2:
                continue

            # Calculate pairwise diversity
            pairwise_distances = []
            for i in range(len(recs)):
                for j in range(i + 1, len(recs)):
                    item1_features = set(item_features.get(recs[i], []))
                    item2_features = set(item_features.get(recs[j], []))

                    if item1_features or item2_features:
                        # Jaccard distance
                        intersection = len(item1_features & item2_features)
                        union = len(item1_features | item2_features)
                        similarity = intersection / union if union > 0 else 0
                        distance = 1 - similarity
                        pairwise_distances.append(distance)

            if pairwise_distances:
                diversity_scores.append(np.mean(pairwise_distances))

        return np.mean(diversity_scores) if diversity_scores else 0.0

    def calculate_novelty(
        self,
        recommendations: List[str],
        item_popularity: Dict[str, int],
        total_interactions: int
    ) -> float:
        """
        Calculate recommendation novelty (how unpopular the recommended items are).

        Args:
            recommendations: List of recommended item IDs
            item_popularity: Dict mapping item IDs to interaction counts
            total_interactions: Total number of interactions

        Returns:
            Novelty score (higher = more novel/less popular items)
        """
        if not recommendations or total_interactions == 0:
            return 0.0

        novelty_scores = []
        for item in recommendations:
            popularity = item_popularity.get(item, 1)
            probability = popularity / total_interactions
            # Information content: -log2(probability)
            novelty = -np.log2(probability) if probability > 0 else 0
            novelty_scores.append(novelty)

        return np.mean(novelty_scores)

    def evaluate_user(
        self,
        user_id: str,
        recommendations: List[str],
        ground_truth: Dict,
        item_popularity: Dict[str, int],
        total_interactions: int
    ) -> Dict:
        """
        Evaluate recommendations for a single user.

        Args:
            user_id: User ID
            recommendations: Ordered list of recommendations
            ground_truth: Ground truth data (liked items, ratings, etc.)
            item_popularity: Item popularity counts
            total_interactions: Total interactions for novelty calculation

        Returns:
            Dict of metrics for this user
        """
        relevant_items = set(ground_truth.get('liked_items', []))
        relevance_scores = ground_truth.get('relevance_scores', {})

        user_metrics = {
            'user_id': user_id,
            'n_recommendations': len(recommendations),
            'n_relevant': len(relevant_items)
        }

        # Calculate metrics at different K values
        for k in self.k_values:
            user_metrics[f'precision@{k}'] = self.calculate_precision_at_k(
                recommendations, relevant_items, k
            )
            user_metrics[f'recall@{k}'] = self.calculate_recall_at_k(
                recommendations, relevant_items, k
            )
            user_metrics[f'f1@{k}'] = self.calculate_f1_at_k(
                recommendations, relevant_items, k
            )
            user_metrics[f'hit_rate@{k}'] = self.calculate_hit_rate_at_k(
                recommendations, relevant_items, k
            )

            if relevance_scores:
                user_metrics[f'ndcg@{k}'] = self.calculate_ndcg_at_k(
                    recommendations, relevance_scores, k
                )

        # MRR
        user_metrics['mrr'] = self.calculate_mrr(recommendations, relevant_items)

        # Novelty
        user_metrics['novelty'] = self.calculate_novelty(
            recommendations, item_popularity, total_interactions
        )

        return user_metrics

    def evaluate_all_users(
        self,
        user_recommendations: Dict[str, List[str]],
        ground_truth_data: Dict[str, Dict],
        all_items: Set[str],
        item_features: Dict[str, List],
        item_popularity: Dict[str, int]
    ) -> Dict:
        """
        Evaluate recommendations for all users.

        Args:
            user_recommendations: Dict mapping user IDs to recommendation lists
            ground_truth_data: Dict mapping user IDs to ground truth data
            all_items: Set of all available items
            item_features: Dict mapping item IDs to feature vectors
            item_popularity: Dict mapping item IDs to popularity counts

        Returns:
            Dict of aggregated metrics
        """
        logger.info(f"Evaluating recommendations for {len(user_recommendations)} users")

        total_interactions = sum(item_popularity.values())
        user_metrics_list = []

        for user_id, recommendations in user_recommendations.items():
            if user_id not in ground_truth_data:
                continue

            ground_truth = ground_truth_data[user_id]

            user_metrics = self.evaluate_user(
                user_id=user_id,
                recommendations=recommendations,
                ground_truth=ground_truth,
                item_popularity=item_popularity,
                total_interactions=total_interactions
            )

            user_metrics_list.append(user_metrics)

        # Aggregate metrics across all users
        aggregated_metrics = self._aggregate_metrics(user_metrics_list)

        # Calculate coverage
        all_recommendations = list(user_recommendations.values())
        aggregated_metrics['coverage'] = self.calculate_coverage(
            all_recommendations, all_items
        )

        # Calculate diversity
        aggregated_metrics['diversity'] = self.calculate_diversity(
            all_recommendations, item_features
        )

        logger.info("Evaluation complete")
        return aggregated_metrics

    def _aggregate_metrics(self, user_metrics_list: List[Dict]) -> Dict:
        """Aggregate user-level metrics to overall metrics."""
        if not user_metrics_list:
            return {}

        aggregated = {
            'n_users': len(user_metrics_list)
        }

        # Get all metric keys (excluding user_id)
        metric_keys = [
            k for k in user_metrics_list[0].keys()
            if k not in ['user_id', 'n_recommendations', 'n_relevant']
        ]

        # Calculate mean for each metric
        for metric in metric_keys:
            values = [um[metric] for um in user_metrics_list if metric in um]
            if values:
                aggregated[f'{metric}_mean'] = np.mean(values)
                aggregated[f'{metric}_std'] = np.std(values)
                aggregated[f'{metric}_median'] = np.median(values)

        return aggregated

    def print_metrics(self, metrics: Dict):
        """Pretty print evaluation metrics."""
        print("\n" + "="*80)
        print("EVALUATION RESULTS")
        print("="*80)

        print(f"\nNumber of users evaluated: {metrics.get('n_users', 0)}")

        print("\nPrecision@K:")
        for k in self.k_values:
            mean = metrics.get(f'precision@{k}_mean', 0)
            print(f"  @{k:2d}: {mean:.4f}")

        print("\nRecall@K:")
        for k in self.k_values:
            mean = metrics.get(f'recall@{k}_mean', 0)
            print(f"  @{k:2d}: {mean:.4f}")

        print("\nF1@K:")
        for k in self.k_values:
            mean = metrics.get(f'f1@{k}_mean', 0)
            print(f"  @{k:2d}: {mean:.4f}")

        print("\nNDCG@K:")
        for k in self.k_values:
            mean = metrics.get(f'ndcg@{k}_mean', 0)
            if mean > 0:
                print(f"  @{k:2d}: {mean:.4f}")

        print(f"\nHit Rate@10: {metrics.get('hit_rate@10_mean', 0):.4f}")
        print(f"MRR: {metrics.get('mrr_mean', 0):.4f}")
        print(f"\nCoverage: {metrics.get('coverage', 0):.4f}")
        print(f"Diversity: {metrics.get('diversity', 0):.4f}")
        print(f"Novelty: {metrics.get('novelty_mean', 0):.4f}")

        print("\n" + "="*80 + "\n")

    def save_metrics(self, metrics: Dict, output_path: str):
        """Save metrics to JSON file."""
        with open(output_path, 'w') as f:
            json.dump(metrics, f, indent=2)
        logger.info(f"Metrics saved to {output_path}")


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Evaluate recommendation system performance'
    )
    parser.add_argument(
        '--test-data',
        type=str,
        required=True,
        help='Path to test data JSON file'
    )
    parser.add_argument(
        '--recommendations',
        type=str,
        required=True,
        help='Path to recommendations JSON file'
    )
    parser.add_argument(
        '--output',
        type=str,
        default='evaluation_results.json',
        help='Path to save evaluation results'
    )

    args = parser.parse_args()

    # Initialize evaluator
    evaluator = RecommendationEvaluator(k_values=[5, 10, 20, 50])

    # Load data
    logger.info("Loading test data and recommendations...")
    test_data = evaluator.load_test_data(args.test_data)

    with open(args.recommendations, 'r') as f:
        recommendations_data = json.load(f)

    # Extract required data
    user_recommendations = recommendations_data.get('user_recommendations', {})
    ground_truth = test_data.get('ground_truth', {})
    all_items = set(test_data.get('all_items', []))
    item_features = test_data.get('item_features', {})
    item_popularity = test_data.get('item_popularity', {})

    # Evaluate
    metrics = evaluator.evaluate_all_users(
        user_recommendations=user_recommendations,
        ground_truth_data=ground_truth,
        all_items=all_items,
        item_features=item_features,
        item_popularity=item_popularity
    )

    # Print results
    evaluator.print_metrics(metrics)

    # Save results
    evaluator.save_metrics(metrics, args.output)


if __name__ == '__main__':
    main()
