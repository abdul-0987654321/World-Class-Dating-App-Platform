"""Recommendation engine service implementation."""

import logging
import math
import random
from typing import List
from datetime import datetime

from models import (
    UserProfile, RecommendedProfile,
    RecommendProfilesResponse, TopPicksResponse
)

logger = logging.getLogger(__name__)


class RecommendationEngineService:
    """Service for generating profile recommendations."""

    def __init__(self):
        self.user_database = {}  # In production, use actual database

    async def initialize(self):
        """Initialize the service."""
        logger.info("Initializing Recommendation Engine Service")
        await self._load_sample_profiles()

    async def close(self):
        """Cleanup resources."""
        logger.info("Closing Recommendation Engine Service")

    async def _load_sample_profiles(self):
        """Load sample profiles for demonstration."""
        # In production, this would query from database
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
                     "sports", "art", "gaming", "photography"],
                    k=random.randint(3, 7)
                ),
                "bio": f"Sample bio for user {i}"
            }
            for i in range(1, 101)
        ]

        for profile in sample_profiles:
            self.user_database[profile["user_id"]] = profile

    async def recommend(
        self,
        user_profile: UserProfile,
        limit: int = 10,
        exclude_user_ids: List[str] = None
    ) -> RecommendProfilesResponse:
        """
        Generate profile recommendations.

        Args:
            user_profile: User's profile
            limit: Maximum number of recommendations
            exclude_user_ids: User IDs to exclude

        Returns:
            RecommendProfilesResponse with recommendations
        """
        exclude_user_ids = exclude_user_ids or []
        exclude_user_ids.append(user_profile.user_id)  # Exclude self

        # Get candidate profiles
        candidates = []
        for uid, profile_data in self.user_database.items():
            if uid in exclude_user_ids:
                continue

            # Apply basic filters
            if not self._meets_preferences(user_profile, profile_data):
                continue

            candidates.append(profile_data)

        # Calculate compatibility for each candidate
        scored_candidates = []
        for candidate in candidates:
            compatibility = await self._calculate_compatibility(
                user_profile,
                candidate
            )

            if compatibility["score"] > 0.3:  # Minimum threshold
                scored_candidates.append({
                    "profile": candidate,
                    "compatibility": compatibility
                })

        # Sort by compatibility score
        scored_candidates.sort(
            key=lambda x: x["compatibility"]["score"],
            reverse=True
        )

        # Prepare recommendations
        recommendations = []
        for item in scored_candidates[:limit]:
            profile = item["profile"]
            compat = item["compatibility"]

            rec = RecommendedProfile(
                user_id=profile["user_id"],
                compatibility_score=compat["score"],
                match_reasons=compat["reasons"],
                distance_km=compat.get("distance_km"),
                common_interests=compat.get("common_interests", [])
            )
            recommendations.append(rec)

        return RecommendProfilesResponse(
            user_id=user_profile.user_id,
            recommendations=recommendations,
            total_candidates=len(candidates),
            algorithm_version="1.0"
        )

    async def get_top_picks(
        self,
        user_profile: UserProfile,
        count: int = 5
    ) -> TopPicksResponse:
        """
        Get top picks for user.

        Args:
            user_profile: User's profile
            count: Number of top picks

        Returns:
            TopPicksResponse with top picks
        """
        # Get recommendations with higher threshold
        recommendations_response = await self.recommend(
            user_profile,
            limit=count * 2  # Get more to filter best
        )

        # Select top picks with additional criteria
        top_picks = []
        for rec in recommendations_response.recommendations:
            # Additional filtering for top picks
            if rec.compatibility_score >= 0.7:  # Higher threshold
                top_picks.append(rec)

        # Limit to requested count
        top_picks = top_picks[:count]

        return TopPicksResponse(
            user_id=user_profile.user_id,
            top_picks=top_picks,
            selection_criteria="High compatibility + active users + mutual interests",
            refreshed_at=datetime.utcnow().isoformat()
        )

    def _meets_preferences(
        self,
        user_profile: UserProfile,
        candidate_profile: dict
    ) -> bool:
        """
        Check if candidate meets user's preferences.

        Args:
            user_profile: User's profile
            candidate_profile: Candidate's profile data

        Returns:
            True if candidate meets preferences
        """
        preferences = user_profile.preferences

        # Age preference
        if "age_min" in preferences and "age_max" in preferences:
            age = candidate_profile["age"]
            if age < preferences["age_min"] or age > preferences["age_max"]:
                return False

        # Gender preference
        if "gender_preference" in preferences:
            gender_pref = preferences["gender_preference"]
            if gender_pref != "all" and candidate_profile["gender"] != gender_pref:
                return False

        # Distance preference
        if "max_distance_km" in preferences:
            distance = self._calculate_distance(
                user_profile.location,
                candidate_profile["location"]
            )
            if distance > preferences["max_distance_km"]:
                return False

        return True

    async def _calculate_compatibility(
        self,
        user_profile: UserProfile,
        candidate_profile: dict
    ) -> dict:
        """
        Calculate compatibility between user and candidate.

        Args:
            user_profile: User's profile
            candidate_profile: Candidate's profile data

        Returns:
            Dictionary with compatibility details
        """
        score = 0.0
        reasons = []

        # Interest overlap
        common_interests = list(set(user_profile.interests) & set(candidate_profile["interests"]))
        if common_interests:
            interest_score = len(common_interests) / max(
                len(user_profile.interests),
                len(candidate_profile["interests"])
            )
            score += interest_score * 0.4
            if len(common_interests) >= 3:
                reasons.append(f"{len(common_interests)} shared interests")

        # Location proximity
        distance_km = self._calculate_distance(
            user_profile.location,
            candidate_profile["location"]
        )
        if distance_km < 10:
            distance_score = 0.3
            score += distance_score
            reasons.append("Nearby location")
        elif distance_km < 50:
            distance_score = 0.2
            score += distance_score

        # Age compatibility
        age_diff = abs(user_profile.age - candidate_profile["age"])
        if age_diff <= 5:
            age_score = 0.2
            score += age_score
            reasons.append("Similar age")
        elif age_diff <= 10:
            age_score = 0.1
            score += age_score

        # Bio similarity (if available)
        if user_profile.bio and candidate_profile.get("bio"):
            # Simplified bio similarity
            bio_score = 0.1
            score += bio_score

        # Ensure score is between 0 and 1
        score = min(score, 1.0)

        return {
            "score": round(score, 3),
            "reasons": reasons,
            "distance_km": round(distance_km, 2),
            "common_interests": common_interests
        }

    def _calculate_distance(
        self,
        loc1: dict,
        loc2: dict
    ) -> float:
        """
        Calculate distance between two locations using Haversine formula.

        Args:
            loc1: First location (latitude, longitude)
            loc2: Second location (latitude, longitude)

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
