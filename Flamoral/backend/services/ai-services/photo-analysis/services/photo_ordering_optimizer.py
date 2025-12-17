"""Photo ordering optimization service for profile photo sequence."""

import asyncio
from typing import Dict, List, Optional, Any, Tuple
import logging

logger = logging.getLogger(__name__)


class PhotoOrderingOptimizerService:
    """Service for optimizing photo order in profiles."""

    def __init__(self):
        """Initialize the photo ordering optimizer service."""
        pass

    async def initialize(self):
        """Initialize the service."""
        logger.info("Photo ordering optimizer service initialized")

    async def close(self):
        """Cleanup resources."""
        pass

    async def optimize_photo_order(
        self,
        photos: List[Dict[str, Any]],
        user_preferences: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Optimize photo order for maximum profile effectiveness.

        Args:
            photos: List of photos with metadata (quality, type, etc.)
            user_preferences: Optional user preferences

        Returns:
            Optimized photo order with reasoning
        """
        try:
            if not photos:
                return {
                    "success": False,
                    "error": "No photos provided"
                }

            # Score each photo for primary position
            scored_photos = []
            for idx, photo in enumerate(photos):
                score = self._calculate_primary_score(photo)
                scored_photos.append({
                    "original_index": idx,
                    "photo": photo,
                    "primary_score": score,
                    "type": photo.get("type", "unknown")
                })

            # Determine optimal order
            ordered_photos = self._determine_optimal_order(scored_photos)

            # Generate reasoning for the order
            reasoning = self._generate_ordering_reasoning(ordered_photos)

            # Calculate overall profile strength
            profile_strength = self._calculate_profile_strength(ordered_photos)

            return {
                "success": True,
                "original_order": [p["photo"] for p in scored_photos],
                "optimized_order": [p["photo"] for p in ordered_photos],
                "order_changes": self._get_order_changes(scored_photos, ordered_photos),
                "reasoning": reasoning,
                "profile_strength": profile_strength,
                "recommendations": self._get_ordering_recommendations(ordered_photos)
            }

        except Exception as e:
            logger.error(f"Photo ordering optimization failed: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e)
            }

    def _calculate_primary_score(self, photo: Dict[str, Any]) -> float:
        """Calculate score for primary photo position."""
        score = 50.0  # Base score

        # Quality score (most important for primary)
        quality = photo.get("quality_score", 70)
        score += (quality - 70) * 0.5

        # Photo type
        photo_type = photo.get("type", "")
        if photo_type == "portrait":
            score += 20
        elif photo_type == "headshot":
            score += 25
        elif photo_type == "full_body":
            score += 10

        # Face visibility
        if photo.get("face_detected", False):
            score += 15

        # Smile detection
        if photo.get("smiling", False):
            score += 10

        # Appropriate background
        if photo.get("background_appropriate", True):
            score += 5

        return min(score, 100)

    def _determine_optimal_order(
        self,
        scored_photos: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Determine optimal photo order using proven dating app principles."""
        ordered = []

        # 1. Primary photo: Best quality portrait/headshot with face
        portraits = [p for p in scored_photos if p["type"] in ["portrait", "headshot"]]
        if portraits:
            primary = max(portraits, key=lambda x: x["primary_score"])
            ordered.append(primary)
            scored_photos = [p for p in scored_photos if p != primary]

        # 2. Full body photo (if available)
        full_body = [p for p in scored_photos if p["type"] == "full_body"]
        if full_body:
            second = max(full_body, key=lambda x: x["photo"].get("quality_score", 0))
            ordered.append(second)
            scored_photos = [p for p in scored_photos if p != second]

        # 3. Activity/hobby photo (shows personality)
        activity = [p for p in scored_photos if p["type"] in ["activity", "hobby"]]
        if activity:
            third = activity[0]
            ordered.append(third)
            scored_photos = [p for p in scored_photos if p != third]

        # 4. Social/group photo (shows social life)
        social = [p for p in scored_photos if p["type"] == "group"]
        if social:
            fourth = social[0]
            ordered.append(fourth)
            scored_photos = [p for p in scored_photos if p != fourth]

        # 5. Travel/adventure photo (shows lifestyle)
        travel = [p for p in scored_photos if p["type"] in ["travel", "outdoor"]]
        if travel:
            fifth = travel[0]
            ordered.append(fifth)
            scored_photos = [p for p in scored_photos if p != fifth]

        # Add remaining photos by quality score
        remaining = sorted(scored_photos, key=lambda x: x["photo"].get("quality_score", 0), reverse=True)
        ordered.extend(remaining)

        return ordered

    def _generate_ordering_reasoning(
        self,
        ordered_photos: List[Dict[str, Any]]
    ) -> List[str]:
        """Generate reasoning for photo order."""
        reasoning = []

        if len(ordered_photos) > 0:
            photo = ordered_photos[0]
            reasoning.append(
                f"Primary: {photo['type']} photo - clear face visibility is essential for first impression"
            )

        if len(ordered_photos) > 1:
            photo = ordered_photos[1]
            reasoning.append(
                f"Second: {photo['type']} photo - shows full context and body language"
            )

        if len(ordered_photos) > 2:
            photo = ordered_photos[2]
            reasoning.append(
                f"Third: {photo['type']} photo - demonstrates interests and personality"
            )

        reasoning.append(
            "Remaining photos ordered to maximize variety and show different aspects of life"
        )

        return reasoning

    def _calculate_profile_strength(
        self,
        ordered_photos: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Calculate overall profile strength based on photo order."""
        if not ordered_photos:
            return {"score": 0, "level": "poor"}

        # Check for key photo types
        has_primary_portrait = ordered_photos[0]["type"] in ["portrait", "headshot"] if ordered_photos else False
        has_full_body = any(p["type"] == "full_body" for p in ordered_photos)
        has_activity = any(p["type"] in ["activity", "hobby"] for p in ordered_photos)
        has_variety = len(set(p["type"] for p in ordered_photos)) >= 3

        # Calculate strength score
        score = 0
        if has_primary_portrait:
            score += 30
        if has_full_body:
            score += 20
        if has_activity:
            score += 20
        if has_variety:
            score += 20
        if len(ordered_photos) >= 4:
            score += 10

        level = (
            "excellent" if score >= 85 else
            "good" if score >= 70 else
            "fair" if score >= 50 else
            "needs_improvement"
        )

        return {
            "score": score,
            "level": level,
            "has_primary_portrait": has_primary_portrait,
            "has_full_body": has_full_body,
            "has_activity": has_activity,
            "has_variety": has_variety,
            "photo_count": len(ordered_photos)
        }

    def _get_order_changes(
        self,
        original: List[Dict[str, Any]],
        optimized: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Get list of order changes made."""
        changes = []

        for new_idx, photo_data in enumerate(optimized):
            old_idx = photo_data["original_index"]
            if old_idx != new_idx:
                changes.append({
                    "from_position": old_idx + 1,
                    "to_position": new_idx + 1,
                    "reason": self._get_change_reason(new_idx, photo_data["type"])
                })

        return changes

    def _get_change_reason(self, position: int, photo_type: str) -> str:
        """Get reason for position change."""
        if position == 0:
            return f"{photo_type} works best as primary photo for first impression"
        elif position == 1:
            return f"{photo_type} provides important context as second photo"
        elif position == 2:
            return f"{photo_type} shows personality and interests"
        else:
            return f"Optimized position for variety and engagement"

    def _get_ordering_recommendations(
        self,
        ordered_photos: List[Dict[str, Any]]
    ) -> List[str]:
        """Get recommendations for photo ordering."""
        recommendations = []

        # Check photo types
        types = [p["type"] for p in ordered_photos]

        if "portrait" not in types and "headshot" not in types:
            recommendations.append("Add a clear portrait/headshot as your primary photo")

        if "full_body" not in types:
            recommendations.append("Include a full-body photo to give complete picture")

        if "activity" not in types and "hobby" not in types:
            recommendations.append("Add photos showing your hobbies or activities")

        if len(ordered_photos) < 4:
            recommendations.append(f"Add {4 - len(ordered_photos)} more photos (aim for 4-6 total)")

        if len(ordered_photos) > 6:
            recommendations.append("Consider removing lower quality photos (6 is optimal)")

        # Check for variety
        if len(set(types)) < 3:
            recommendations.append("Add more variety in photo types")

        if not recommendations:
            recommendations.append("Your photo order is well optimized!")

        return recommendations
