"""Profile matching service implementation."""

import logging
import math
import random
from typing import List

from models import UserProfile, RecommendedProfile, SimilarProfilesResponse

logger = logging.getLogger(__name__)


class ProfileMatcherService:
    """Service for finding similar profiles."""

    def __init__(self):
        self.user_database = {}

    async def initialize(self):
        """Initialize the service."""
        logger.info("Initializing Profile Matcher Service")
        await self._load_sample_profiles()

    async def close(self):
        """Cleanup resources."""
        logger.info("Closing Profile Matcher Service")

    async def _load_sample_profiles(self):
        """Load sample profiles."""
        # Sample profiles for demonstration
        sample_profiles = [
            {
                "user_id": f"user_{i}",
                "age": random.randint(22, 45),
                "gender": random.choice(["male", "female", "non_binary"]),
                "location": {
                    "latitude": 40.7128 + random.uniform(-1, 1),
                    "longitude": -74.0060 + random.uniform(-1, 1)
                },
                "interests": random.sample(
                    ["hiking", "reading", "movies", "cooking", "travel", "music",
                     "sports", "art", "gaming", "photography", "yoga", "dancing"],
                    k=random.randint(3, 7)
                ),
                "bio": f"Sample bio for user {i}"
            }
            for i in range(1, 101)
        ]

        for profile in sample_profiles:
            self.user_database[profile["user_id"]] = profile

    async def find_similar(
        self,
        user_profile: UserProfile,
        limit: int = 10
    ) -> SimilarProfilesResponse:
        """
        Find profiles similar to the given user.

        Args:
            user_profile: Reference user's profile
            limit: Maximum number of similar profiles

        Returns:
            SimilarProfilesResponse with similar profiles
        """
        # Calculate similarity with each profile in database
        similarities = []

        for uid, profile_data in self.user_database.items():
            if uid == user_profile.user_id:
                continue  # Skip self

            similarity = await self._calculate_similarity(
                user_profile,
                profile_data
            )

            if similarity["score"] > 0.3:  # Minimum similarity threshold
                similarities.append({
                    "profile": profile_data,
                    "similarity": similarity
                })

        # Sort by similarity score
        similarities.sort(
            key=lambda x: x["similarity"]["score"],
            reverse=True
        )

        # Prepare similar profiles
        similar_profiles = []
        for item in similarities[:limit]:
            profile = item["profile"]
            sim = item["similarity"]

            similar_profile = RecommendedProfile(
                user_id=profile["user_id"],
                compatibility_score=sim["score"],
                match_reasons=sim["reasons"],
                distance_km=sim.get("distance_km"),
                common_interests=sim.get("common_interests", [])
            )
            similar_profiles.append(similar_profile)

        return SimilarProfilesResponse(
            reference_user_id=user_profile.user_id,
            similar_profiles=similar_profiles,
            similarity_metric="cosine"
        )

    async def _calculate_similarity(
        self,
        user_profile: UserProfile,
        candidate_profile: dict
    ) -> dict:
        """
        Calculate similarity between profiles.

        Uses multiple similarity metrics:
        - Interest overlap (Jaccard similarity)
        - Age similarity
        - Location proximity
        - Cosine similarity of feature vectors

        Args:
            user_profile: Reference user profile
            candidate_profile: Candidate profile data

        Returns:
            Dictionary with similarity details
        """
        scores = []
        reasons = []

        # 1. Interest similarity (Jaccard)
        interest_sim = self._jaccard_similarity(
            set(user_profile.interests),
            set(candidate_profile["interests"])
        )
        scores.append(interest_sim * 0.4)  # Weight: 40%

        common_interests = list(
            set(user_profile.interests) & set(candidate_profile["interests"])
        )
        if len(common_interests) >= 2:
            reasons.append(f"{len(common_interests)} shared interests")

        # 2. Age similarity
        age_diff = abs(user_profile.age - candidate_profile["age"])
        age_sim = max(0, 1 - age_diff / 20)
        scores.append(age_sim * 0.2)  # Weight: 20%

        if age_diff <= 3:
            reasons.append("Similar age")

        # 3. Location proximity
        distance_km = self._calculate_distance(
            user_profile.location,
            candidate_profile["location"]
        )
        location_sim = max(0, 1 - distance_km / 100)
        scores.append(location_sim * 0.3)  # Weight: 30%

        if distance_km < 25:
            reasons.append("Nearby")

        # 4. Feature vector similarity (simplified)
        # In production, use actual embeddings from user behavior/preferences
        feature_sim = 0.7  # Placeholder
        scores.append(feature_sim * 0.1)  # Weight: 10%

        # Overall similarity score
        overall_score = sum(scores)

        return {
            "score": round(overall_score, 3),
            "reasons": reasons,
            "distance_km": round(distance_km, 2),
            "common_interests": common_interests
        }

    def _jaccard_similarity(self, set1: set, set2: set) -> float:
        """
        Calculate Jaccard similarity between two sets.

        Args:
            set1: First set
            set2: Second set

        Returns:
            Jaccard similarity (0-1)
        """
        if not set1 or not set2:
            return 0.0

        intersection = len(set1 & set2)
        union = len(set1 | set2)

        if union == 0:
            return 0.0

        return intersection / union

    def _calculate_distance(
        self,
        loc1: dict,
        loc2: dict
    ) -> float:
        """
        Calculate distance using Haversine formula.

        Args:
            loc1: First location
            loc2: Second location

        Returns:
            Distance in kilometers
        """
        lat1 = loc1["latitude"]
        lon1 = loc1["longitude"]
        lat2 = loc2["latitude"]
        lon2 = loc2["longitude"]

        # Earth's radius in kilometers
        R = 6371.0

        # Convert to radians
        lat1_rad = math.radians(lat1)
        lon1_rad = math.radians(lon1)
        lat2_rad = math.radians(lat2)
        lon2_rad = math.radians(lon2)

        # Haversine formula
        dlat = lat2_rad - lat1_rad
        dlon = lon2_rad - lon1_rad

        a = math.sin(dlat / 2)**2 + \
            math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

        distance = R * c
        return distance
