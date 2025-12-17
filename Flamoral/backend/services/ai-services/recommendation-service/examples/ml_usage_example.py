#!/usr/bin/env python3
"""
Example Usage of ML Recommendation System

Demonstrates how to use the various ML components for dating app recommendations.
"""

import asyncio
import json
from datetime import datetime
from typing import List, Dict

# Import ML components
import sys
sys.path.append('..')

from app.ml.models.feature_extractor import FeatureExtractor
from app.ml.models.collaborative_filter import CollaborativeFilter
from app.ml.models.content_based_filter import ContentBasedFilter
from app.ml.models.hybrid_recommender import HybridRecommender
from app.ml.models.behavioral_learner import BehavioralLearner
from app.ml.ab_testing.experiment_manager import ExperimentManager


def example_1_feature_extraction():
    """Example 1: Extracting features from user profiles."""
    print("\n" + "="*80)
    print("EXAMPLE 1: Feature Extraction")
    print("="*80)

    # Create sample profile
    profile = {
        'user_id': 'user123',
        'age': 28,
        'gender': 'female',
        'location': {'latitude': 40.7128, 'longitude': -74.0060},
        'interests': ['hiking', 'reading', 'photography', 'travel'],
        'education': 'bachelors',
        'relationship_goal': 'serious',
        'bio': 'Love outdoor adventures and good books!',
        'photo_count': 5,
        'is_verified': True,
        'is_premium': False,
        'completeness_score': 0.85,
        'created_at': '2024-01-15T10:00:00Z'
    }

    # Initialize feature extractor
    feature_extractor = FeatureExtractor()

    # Extract features
    features = feature_extractor.extract_profile_features(profile)

    print(f"\nProfile: {profile['user_id']}")
    print(f"Total features extracted: {len(features)}")
    print(f"\nFeature vector (first 10): {features[:10]}")

    # Get feature names
    feature_names = feature_extractor.get_feature_names()
    print(f"\nFeature names (first 10): {feature_names[:10]}")


def example_2_collaborative_filtering():
    """Example 2: Training and using collaborative filter."""
    print("\n" + "="*80)
    print("EXAMPLE 2: Collaborative Filtering")
    print("="*80)

    # Sample interaction data
    interactions = [
        {'user_id': 'user1', 'target_user_id': 'user10', 'action': 'like'},
        {'user_id': 'user1', 'target_user_id': 'user11', 'action': 'super_like'},
        {'user_id': 'user1', 'target_user_id': 'user12', 'action': 'pass'},
        {'user_id': 'user2', 'target_user_id': 'user10', 'action': 'like'},
        {'user_id': 'user2', 'target_user_id': 'user11', 'action': 'like'},
        {'user_id': 'user3', 'target_user_id': 'user10', 'action': 'match'},
        {'user_id': 'user3', 'target_user_id': 'user12', 'action': 'like'},
    ]

    # Initialize and train collaborative filter
    cf = CollaborativeFilter(n_factors=10, n_iterations=5)
    cf.fit(interactions, implicit=True)

    print(f"\nTrained on {len(interactions)} interactions")
    print(f"Number of users: {len(cf.user_id_to_index)}")
    print(f"Number of items: {len(cf.item_id_to_index)}")

    # Get prediction
    score = cf.predict_score('user1', 'user12')
    print(f"\nPredicted score for user1 -> user12: {score:.4f}")

    # Get similar users
    similar_users = cf.get_similar_users('user1', n=2)
    print(f"\nUsers similar to user1:")
    for user_id, similarity in similar_users:
        print(f"  {user_id}: {similarity:.4f}")

    # Get recommendations
    candidates = ['user10', 'user11', 'user12']
    recommendations = cf.recommend_for_user('user2', candidates, n=3)
    print(f"\nRecommendations for user2:")
    for user_id, score in recommendations:
        print(f"  {user_id}: {score:.4f}")


def example_3_content_based_filtering():
    """Example 3: Content-based recommendations."""
    print("\n" + "="*80)
    print("EXAMPLE 3: Content-Based Filtering")
    print("="*80)

    # Sample profiles
    user_profile = {
        'user_id': 'user1',
        'age': 28,
        'gender': 'female',
        'location': {'latitude': 40.7128, 'longitude': -74.0060},
        'interests': ['hiking', 'reading', 'yoga'],
        'education': 'masters',
        'relationship_goal': 'serious',
        'preferences': {
            'age_min': 26,
            'age_max': 35,
            'gender_preference': 'male',
            'max_distance_km': 30
        }
    }

    candidate_profiles = [
        {
            'user_id': 'user10',
            'age': 30,
            'gender': 'male',
            'location': {'latitude': 40.7589, 'longitude': -73.9851},
            'interests': ['hiking', 'photography', 'yoga'],
            'education': 'masters',
            'relationship_goal': 'serious'
        },
        {
            'user_id': 'user11',
            'age': 35,
            'gender': 'male',
            'location': {'latitude': 40.6782, 'longitude': -73.9442},
            'interests': ['sports', 'music'],
            'education': 'bachelors',
            'relationship_goal': 'casual'
        }
    ]

    # Initialize content-based filter
    cb_filter = ContentBasedFilter()
    cb_filter.fit([user_profile] + candidate_profiles)

    # Get recommendations
    recommendations = cb_filter.recommend_for_user(
        user_profile,
        candidate_profiles,
        n=2,
        diversity_factor=0.1
    )

    print(f"\nRecommendations for {user_profile['user_id']}:")
    for user_id, score, explanation in recommendations:
        print(f"\n  User: {user_id}")
        print(f"  Score: {score:.4f}")
        print(f"  Factors:")
        for factor in explanation['factors']:
            print(f"    - {factor['description']}")


def example_4_hybrid_recommender():
    """Example 4: Hybrid recommendation system."""
    print("\n" + "="*80)
    print("EXAMPLE 4: Hybrid Recommender")
    print("="*80)

    # Sample data
    profiles = [
        {'user_id': 'user1', 'age': 28, 'gender': 'female',
         'interests': ['hiking', 'reading'], 'location': {'latitude': 40.7, 'longitude': -74.0}},
        {'user_id': 'user2', 'age': 30, 'gender': 'male',
         'interests': ['hiking', 'photography'], 'location': {'latitude': 40.7, 'longitude': -74.0}},
        {'user_id': 'user3', 'age': 32, 'gender': 'male',
         'interests': ['sports', 'music'], 'location': {'latitude': 40.6, 'longitude': -73.9}}
    ]

    interactions = [
        {'user_id': 'user1', 'target_user_id': 'user2', 'action': 'like'},
        {'user_id': 'user1', 'target_user_id': 'user3', 'action': 'pass'},
    ]

    # Initialize and train hybrid recommender
    hybrid = HybridRecommender(
        collaborative_weight=0.5,
        content_weight=0.5,
        min_interactions_for_cf=1
    )
    hybrid.fit(profiles, interactions, user_interactions={})

    # Get prediction
    user_profile = profiles[0]
    target_profile = profiles[1]
    score, explanation = hybrid.predict_score(
        'user1',
        user_profile,
        target_profile
    )

    print(f"\nCompatibility prediction:")
    print(f"User: {user_profile['user_id']} -> Target: {target_profile['user_id']}")
    print(f"Score: {score:.4f}")
    print(f"\nExplanation:")
    print(f"  Method: {explanation['method']}")
    print(f"  Collaborative score: {explanation['collaborative_score']:.4f}")
    print(f"  Content score: {explanation['content_score']:.4f}")
    print(f"  Weights: {explanation['weights']}")


def example_5_behavioral_learning():
    """Example 5: Learning from user behavior."""
    print("\n" + "="*80)
    print("EXAMPLE 5: Behavioral Learning")
    print("="*80)

    # Initialize behavioral learner
    learner = BehavioralLearner()

    # Simulate user interactions
    user_id = 'user1'

    # Learn from swipes
    for i in range(10):
        target_profile = {
            'user_id': f'user{i+10}',
            'age': 25 + i,
            'interests': ['hiking', 'reading'] if i % 2 == 0 else ['sports'],
            'education': 'bachelors' if i < 5 else 'masters'
        }

        action = 'like' if i % 2 == 0 else 'pass'

        learner.learn_from_swipe(
            user_id=user_id,
            target_user_id=target_profile['user_id'],
            action=action,
            target_profile=target_profile
        )

    # Get learned preferences
    preferences = learner.get_user_preferences(user_id)
    print(f"\nLearned preferences for {user_id}:")
    print(json.dumps(preferences, indent=2, default=str))

    # Get behavioral insights
    insights = learner.get_insights(user_id)
    print(f"\nBehavioral insights:")
    print(f"  Profile type: {insights.get('profile_type')}")
    print(f"  Selectivity: {insights.get('selectivity', 0):.2f}")
    print(f"  Engagement level: {insights.get('engagement_level')}")

    # Predict swipe
    new_profile = {
        'user_id': 'user50',
        'age': 28,
        'interests': ['hiking', 'reading', 'photography'],
        'education': 'masters'
    }

    predicted_action, confidence = learner.predict_swipe(user_id, new_profile)
    print(f"\nSwipe prediction for new profile:")
    print(f"  Predicted action: {predicted_action}")
    print(f"  Confidence: {confidence:.2f}")


def example_6_ab_testing():
    """Example 6: A/B testing framework."""
    print("\n" + "="*80)
    print("EXAMPLE 6: A/B Testing")
    print("="*80)

    # Initialize experiment manager
    exp_manager = ExperimentManager()

    # Create experiment
    experiment = exp_manager.create_experiment(
        experiment_id="algo_weights_test",
        name="Algorithm Weights Test",
        description="Test different weights for hybrid recommender",
        hypothesis="Higher content-based weight improves match quality",
        variants=[
            {
                'id': 'control',
                'name': 'Balanced Weights',
                'traffic_allocation': 0.5,
                'config': {'cf_weight': 0.5, 'cb_weight': 0.5}
            },
            {
                'id': 'treatment',
                'name': 'Content-Heavy Weights',
                'traffic_allocation': 0.5,
                'config': {'cf_weight': 0.3, 'cb_weight': 0.7}
            }
        ],
        minimum_sample_size=100,
        confidence_level=0.95
    )

    print(f"\nCreated experiment: {experiment.name}")
    print(f"Status: {experiment.status.value}")
    print(f"Variants: {len(experiment.variants)}")

    # Start experiment
    exp_manager.start_experiment("algo_weights_test")
    print(f"\nExperiment started")

    # Assign users to variants
    users = [f'user{i}' for i in range(10)]
    assignments = {}

    for user_id in users:
        variant = exp_manager.assign_variant(user_id, "algo_weights_test")
        assignments[user_id] = variant.id if variant else None

    print(f"\nUser assignments:")
    for user_id, variant_id in assignments.items():
        print(f"  {user_id}: {variant_id}")

    # Simulate tracking events
    for user_id in users[:5]:
        exp_manager.track_event(user_id, "algo_weights_test", "impression")
        exp_manager.track_event(user_id, "algo_weights_test", "like")

        if int(user_id.replace('user', '')) % 2 == 0:
            exp_manager.track_event(user_id, "algo_weights_test", "match")

    print(f"\nTracked events for {len(users[:5])} users")

    # Get experiment results
    results = exp_manager.get_experiment_results("algo_weights_test")
    print(f"\nExperiment results:")
    print(f"  Status: {results['status']}")
    print(f"  Variants tested: {len(results['variants'])}")

    for variant_result in results['variants']:
        print(f"\n  Variant: {variant_result['name']}")
        print(f"    Impressions: {variant_result['metrics']['impressions']}")
        print(f"    Likes: {variant_result['metrics']['likes']}")
        print(f"    Matches: {variant_result['metrics']['matches']}")


def example_7_complete_workflow():
    """Example 7: Complete recommendation workflow."""
    print("\n" + "="*80)
    print("EXAMPLE 7: Complete Workflow")
    print("="*80)

    print("\nScenario: New user gets personalized recommendations")
    print("-" * 80)

    # Step 1: User profile
    user = {
        'user_id': 'new_user',
        'age': 29,
        'gender': 'female',
        'location': {'latitude': 40.7128, 'longitude': -74.0060},
        'interests': ['hiking', 'yoga', 'reading', 'travel'],
        'education': 'masters',
        'relationship_goal': 'serious',
        'bio': 'Looking for someone to explore the world with!',
        'preferences': {
            'age_min': 27,
            'age_max': 38,
            'gender_preference': 'male',
            'max_distance_km': 50
        }
    }

    print(f"\n1. User Profile: {user['user_id']}")
    print(f"   Age: {user['age']}, Interests: {', '.join(user['interests'][:3])}")

    # Step 2: Get candidate profiles (simulated)
    candidates = [
        {
            'user_id': f'candidate_{i}',
            'age': 28 + i,
            'gender': 'male',
            'location': {'latitude': 40.7 + i*0.01, 'longitude': -74.0 + i*0.01},
            'interests': ['hiking', 'travel'] if i % 2 == 0 else ['reading', 'cooking'],
            'education': 'masters' if i < 3 else 'bachelors',
            'relationship_goal': 'serious'
        }
        for i in range(5)
    ]

    print(f"\n2. Candidate Pool: {len(candidates)} profiles")

    # Step 3: Get recommendations using content-based (new user)
    cb_filter = ContentBasedFilter()
    cb_filter.fit([user] + candidates)

    recommendations = cb_filter.recommend_for_user(
        user,
        candidates,
        n=3,
        diversity_factor=0.1
    )

    print(f"\n3. Top Recommendations:")
    for rank, (user_id, score, explanation) in enumerate(recommendations, 1):
        print(f"\n   #{rank} {user_id} (Score: {score:.3f})")
        for factor in explanation['factors'][:2]:
            print(f"      - {factor['description']}")

    # Step 4: User interacts
    print(f"\n4. User Interactions:")
    learner = BehavioralLearner()

    learner.learn_from_swipe('new_user', 'candidate_0', 'like', candidates[0])
    print(f"   - Liked candidate_0")

    learner.learn_from_swipe('new_user', 'candidate_1', 'pass', candidates[1])
    print(f"   - Passed candidate_1")

    learner.learn_from_swipe('new_user', 'candidate_2', 'super_like', candidates[2])
    print(f"   - Super liked candidate_2")

    # Step 5: Updated recommendations
    print(f"\n5. System learns preferences and improves future recommendations")


def main():
    """Run all examples."""
    print("\n" + "="*80)
    print("ML RECOMMENDATION SYSTEM - USAGE EXAMPLES")
    print("="*80)

    try:
        example_1_feature_extraction()
        example_2_collaborative_filtering()
        example_3_content_based_filtering()
        example_4_hybrid_recommender()
        example_5_behavioral_learning()
        example_6_ab_testing()
        example_7_complete_workflow()

        print("\n" + "="*80)
        print("All examples completed successfully!")
        print("="*80 + "\n")

    except Exception as e:
        print(f"\nError running examples: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    main()
