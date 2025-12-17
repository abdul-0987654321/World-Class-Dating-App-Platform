"""Compatibility calculation service implementation."""

import logging
import math
from typing import List

from models import UserProfile, CompatibilityResponse

logger = logging.getLogger(__name__)


class CompatibilityCalculatorService:
    """Service for calculating compatibility between users."""

    def __init__(self):
        pass

    async def initialize(self):
        """Initialize the service."""
        logger.info("Initializing Compatibility Calculator Service")

    async def close(self):
        """Cleanup resources."""
        logger.info("Closing Compatibility Calculator Service")

    async def calculate(
        self,
        user1_profile: UserProfile,
        user2_profile: UserProfile
    ) -> CompatibilityResponse:
        """
        Calculate compatibility score between two users.

        Args:
            user1_profile: First user's profile
            user2_profile: Second user's profile

        Returns:
            CompatibilityResponse with detailed compatibility breakdown
        """
        match_factors = {}

        # 1. Interest compatibility (weight: 30%)
        interest_score = self._calculate_interest_compatibility(
            user1_profile.interests,
            user2_profile.interests
        )
        match_factors["interests"] = round(interest_score, 3)

        # 2. Age compatibility (weight: 15%)
        age_score = self._calculate_age_compatibility(
            user1_profile.age,
            user2_profile.age
        )
        match_factors["age"] = round(age_score, 3)

        # 3. Location compatibility (weight: 25%)
        location_score = self._calculate_location_compatibility(
            user1_profile.location,
            user2_profile.location
        )
        match_factors["location"] = round(location_score, 3)

        # 4. Preference compatibility (weight: 20%)
        preference_score = self._calculate_preference_compatibility(
            user1_profile,
            user2_profile
        )
        match_factors["preferences"] = round(preference_score, 3)

        # 5. Lifestyle compatibility (weight: 10%)
        lifestyle_score = self._calculate_lifestyle_compatibility(
            user1_profile,
            user2_profile
        )
        match_factors["lifestyle"] = round(lifestyle_score, 3)

        # Calculate weighted overall score
        overall_score = (
            interest_score * 0.30 +
            age_score * 0.15 +
            location_score * 0.25 +
            preference_score * 0.20 +
            lifestyle_score * 0.10
        )

        # Find common interests
        common_interests = list(
            set(user1_profile.interests) & set(user2_profile.interests)
        )

        # Determine compatibility level
        if overall_score >= 0.8:
            compatibility_level = "Excellent Match"
        elif overall_score >= 0.6:
            compatibility_level = "Great Match"
        elif overall_score >= 0.4:
            compatibility_level = "Good Match"
        elif overall_score >= 0.2:
            compatibility_level = "Fair Match"
        else:
            compatibility_level = "Low Compatibility"

        return CompatibilityResponse(
            compatibility_score=round(overall_score, 3),
            match_factors=match_factors,
            common_interests=common_interests,
            compatibility_level=compatibility_level
        )

    def _calculate_interest_compatibility(
        self,
        interests1: List[str],
        interests2: List[str]
    ) -> float:
        """
        Calculate interest compatibility using Jaccard similarity.

        Args:
            interests1: First user's interests
            interests2: Second user's interests

        Returns:
            Interest compatibility score (0-1)
        """
        if not interests1 or not interests2:
            return 0.0

        set1 = set(interests1)
        set2 = set(interests2)

        intersection = len(set1 & set2)
        union = len(set1 | set2)

        if union == 0:
            return 0.0

        # Jaccard similarity
        jaccard = intersection / union

        return jaccard

    def _calculate_age_compatibility(
        self,
        age1: int,
        age2: int
    ) -> float:
        """
        Calculate age compatibility.

        Args:
            age1: First user's age
            age2: Second user's age

        Returns:
            Age compatibility score (0-1)
        """
        age_diff = abs(age1 - age2)

        # Perfect score for same age or within 2 years
        if age_diff <= 2:
            return 1.0
        # Good score for within 5 years
        elif age_diff <= 5:
            return 0.8
        # Fair score for within 10 years
        elif age_diff <= 10:
            return 0.6
        # Declining score for larger gaps
        else:
            score = max(0, 1.0 - (age_diff - 10) / 20)
            return score

    def _calculate_location_compatibility(
        self,
        location1: dict,
        location2: dict
    ) -> float:
        """
        Calculate location compatibility based on distance.

        Args:
            location1: First user's location
            location2: Second user's location

        Returns:
            Location compatibility score (0-1)
        """
        distance_km = self._calculate_distance(location1, location2)

        # Perfect score for very close (< 5 km)
        if distance_km < 5:
            return 1.0
        # Great score for nearby (< 25 km)
        elif distance_km < 25:
            return 0.8
        # Good score for same city (< 50 km)
        elif distance_km < 50:
            return 0.6
        # Fair score for nearby cities (< 100 km)
        elif distance_km < 100:
            return 0.4
        # Low score for far away
        else:
            score = max(0, 1.0 - distance_km / 500)
            return score

    def _calculate_preference_compatibility(
        self,
        user1_profile: UserProfile,
        user2_profile: UserProfile
    ) -> float:
        """
        Calculate preference compatibility.

        Args:
            user1_profile: First user's profile
            user2_profile: Second user's profile

        Returns:
            Preference compatibility score (0-1)
        """
        score = 0.0
        checks = 0

        prefs1 = user1_profile.preferences
        prefs2 = user2_profile.preferences

        # Check gender preferences
        if "gender_preference" in prefs1:
            checks += 1
            if (prefs1["gender_preference"] == "all" or
                prefs1["gender_preference"] == user2_profile.gender):
                score += 1.0

        if "gender_preference" in prefs2:
            checks += 1
            if (prefs2["gender_preference"] == "all" or
                prefs2["gender_preference"] == user1_profile.gender):
                score += 1.0

        # Check age range preferences
        if "age_min" in prefs1 and "age_max" in prefs1:
            checks += 1
            if prefs1["age_min"] <= user2_profile.age <= prefs1["age_max"]:
                score += 1.0

        if "age_min" in prefs2 and "age_max" in prefs2:
            checks += 1
            if prefs2["age_min"] <= user1_profile.age <= prefs2["age_max"]:
                score += 1.0

        if checks == 0:
            return 0.5  # Neutral if no preferences set

        return score / checks

    def _calculate_lifestyle_compatibility(
        self,
        user1_profile: UserProfile,
        user2_profile: UserProfile
    ) -> float:
        """
        Calculate lifestyle compatibility.

        Args:
            user1_profile: First user's profile
            user2_profile: Second user's profile

        Returns:
            Lifestyle compatibility score (0-1)
        """
        # In production, analyze lifestyle factors like:
        # - Activity level
        # - Relationship goals
        # - Education level
        # - Career/occupation
        # - Hobbies and pastimes

        # Simplified for demo
        return 0.7  # Default moderate compatibility

    def _calculate_distance(
        self,
        loc1: dict,
        loc2: dict
    ) -> float:
        """
        Calculate distance between two locations using Haversine formula.

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
