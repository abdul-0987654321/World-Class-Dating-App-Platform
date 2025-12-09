"""Background analysis service for profile photos."""

import asyncio
from typing import Dict, List, Optional, Any
import numpy as np
from PIL import Image
import io
import httpx
import cv2
import logging

logger = logging.getLogger(__name__)


class BackgroundAnalyzerService:
    """Service for analyzing photo backgrounds."""

    def __init__(self):
        """Initialize the background analyzer service."""
        self.client = httpx.AsyncClient(timeout=30.0)

    async def initialize(self):
        """Initialize the service."""
        logger.info("Background analyzer service initialized")

    async def close(self):
        """Cleanup resources."""
        await self.client.aclose()

    async def analyze_background(
        self,
        photo_url: str
    ) -> Dict[str, Any]:
        """
        Analyze photo background.

        Args:
            photo_url: URL of the photo to analyze

        Returns:
            Background analysis with suggestions
        """
        try:
            # Download image
            image = await self._download_image(photo_url)
            if image is None:
                return {
                    "success": False,
                    "error": "Failed to download image"
                }

            # Convert to numpy array
            img_array = np.array(image)

            # Analyze background characteristics
            background_type = self._detect_background_type(img_array)
            background_quality = self._assess_background_quality(img_array)
            distraction_level = self._assess_distraction_level(img_array)
            setting_type = self._determine_setting_type(img_array)
            color_analysis = self._analyze_background_colors(img_array)

            # Check if background is appropriate for dating profile
            is_appropriate = self._check_background_appropriateness(
                background_type,
                background_quality,
                distraction_level
            )

            # Generate suggestions
            suggestions = self._generate_background_suggestions(
                background_type,
                background_quality,
                distraction_level,
                setting_type
            )

            return {
                "success": True,
                "photo_url": photo_url,
                "background_type": background_type,
                "background_quality": background_quality,
                "distraction_level": distraction_level,
                "setting_type": setting_type,
                "color_analysis": color_analysis,
                "is_appropriate": is_appropriate,
                "suggestions": suggestions,
                "recommended_changes": self._get_recommended_changes(
                    background_type,
                    is_appropriate
                )
            }

        except Exception as e:
            logger.error(f"Background analysis failed: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e)
            }

    async def suggest_background_improvements(
        self,
        photo_url: str
    ) -> Dict[str, Any]:
        """
        Suggest specific background improvements.

        Args:
            photo_url: URL of the photo

        Returns:
            Specific improvement suggestions
        """
        try:
            analysis = await self.analyze_background(photo_url)

            if not analysis["success"]:
                return analysis

            improvements = []

            # Based on background type
            bg_type = analysis["background_type"]
            if bg_type == "cluttered":
                improvements.append({
                    "issue": "Cluttered background",
                    "suggestion": "Choose a cleaner, simpler background",
                    "priority": "high",
                    "examples": ["Plain wall", "Natural outdoor setting", "Blurred background"]
                })

            elif bg_type == "indoor_messy":
                improvements.append({
                    "issue": "Messy indoor background",
                    "suggestion": "Tidy up the area or choose a different location",
                    "priority": "high",
                    "examples": ["Clean room", "Cafe", "Professional setting"]
                })

            # Based on distraction level
            if analysis["distraction_level"] == "high":
                improvements.append({
                    "issue": "Distracting background elements",
                    "suggestion": "Use portrait mode or blur background",
                    "priority": "medium",
                    "examples": ["Use depth effect", "Choose simpler background"]
                })

            # Based on setting
            setting = analysis["setting_type"]
            if setting == "inappropriate":
                improvements.append({
                    "issue": "Inappropriate setting",
                    "suggestion": "Choose a more suitable location",
                    "priority": "high",
                    "examples": ["Outdoor nature", "Urban setting", "Home environment"]
                })

            # If no specific issues, provide general tips
            if not improvements:
                improvements.append({
                    "issue": "None - background looks good",
                    "suggestion": "Consider these alternatives for variety",
                    "priority": "low",
                    "examples": [
                        "Travel photos with interesting backgrounds",
                        "Activity photos showing hobbies",
                        "Natural outdoor settings"
                    ]
                })

            return {
                "success": True,
                "photo_url": photo_url,
                "current_analysis": analysis,
                "improvements": improvements,
                "quick_tips": [
                    "Natural outdoor backgrounds are universally appealing",
                    "Ensure you remain the focal point",
                    "Avoid messy or cluttered spaces",
                    "Use depth-of-field to blur busy backgrounds",
                    "Show context that reflects your personality"
                ]
            }

        except Exception as e:
            logger.error(f"Background improvement suggestions failed: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e)
            }

    async def compare_backgrounds(
        self,
        photo_urls: List[str]
    ) -> Dict[str, Any]:
        """
        Compare backgrounds across multiple photos.

        Args:
            photo_urls: List of photo URLs

        Returns:
            Background comparison and variety analysis
        """
        try:
            if not photo_urls:
                return {
                    "success": False,
                    "error": "No photos provided"
                }

            # Analyze all backgrounds
            analyses = []
            for url in photo_urls:
                analysis = await self.analyze_background(url)
                if analysis["success"]:
                    analyses.append({
                        "url": url,
                        "background_type": analysis["background_type"],
                        "setting_type": analysis["setting_type"],
                        "quality": analysis["background_quality"],
                        "is_appropriate": analysis["is_appropriate"]
                    })

            # Assess variety
            background_types = [a["background_type"] for a in analyses]
            setting_types = [a["setting_type"] for a in analyses]

            variety_score = len(set(background_types)) / len(analyses) * 100 if analyses else 0

            # Count appropriate vs inappropriate
            appropriate_count = sum(1 for a in analyses if a["is_appropriate"])

            return {
                "success": True,
                "photo_count": len(photo_urls),
                "analyzed_count": len(analyses),
                "backgrounds": analyses,
                "variety": {
                    "score": round(variety_score, 1),
                    "level": "excellent" if variety_score > 70 else "good" if variety_score > 50 else "limited",
                    "background_types": list(set(background_types)),
                    "setting_types": list(set(setting_types))
                },
                "quality": {
                    "appropriate_count": appropriate_count,
                    "inappropriate_count": len(analyses) - appropriate_count,
                    "percentage_appropriate": round((appropriate_count / len(analyses) * 100), 1) if analyses else 0
                },
                "recommendations": self._get_variety_recommendations(
                    background_types,
                    setting_types,
                    variety_score
                )
            }

        except Exception as e:
            logger.error(f"Background comparison failed: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e)
            }

    async def _download_image(self, url: str) -> Optional[Image.Image]:
        """Download image from URL."""
        try:
            response = await self.client.get(url)
            response.raise_for_status()
            return Image.open(io.BytesIO(response.content))
        except Exception as e:
            logger.error(f"Failed to download image: {e}")
            return None

    def _detect_background_type(self, img_array: np.ndarray) -> str:
        """Detect the type of background."""
        # Simplified background type detection
        # In production, use semantic segmentation or ML model

        # Calculate edge density as proxy for complexity
        gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
        edges = cv2.Canny(gray, 50, 150)
        edge_density = np.sum(edges > 0) / edges.size

        # Calculate color variance
        color_variance = np.std(img_array)

        if edge_density > 0.15 and color_variance > 50:
            return "cluttered"
        elif edge_density > 0.10:
            return "busy"
        elif edge_density < 0.05 and color_variance < 30:
            return "plain"
        elif color_variance < 40:
            return "simple"
        else:
            return "moderate"

    def _assess_background_quality(self, img_array: np.ndarray) -> str:
        """Assess overall background quality."""
        # Calculate focus on background (blur detection)
        gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
        laplacian = cv2.Laplacian(gray, cv2.CV_64F)
        variance = laplacian.var()

        if variance < 100:
            return "nicely_blurred"
        elif variance < 300:
            return "good"
        elif variance < 500:
            return "moderate"
        else:
            return "too_sharp"

    def _assess_distraction_level(self, img_array: np.ndarray) -> str:
        """Assess how distracting the background is."""
        # Based on edge density and color complexity
        gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
        edges = cv2.Canny(gray, 50, 150)
        edge_density = np.sum(edges > 0) / edges.size

        if edge_density > 0.2:
            return "high"
        elif edge_density > 0.1:
            return "moderate"
        else:
            return "low"

    def _determine_setting_type(self, img_array: np.ndarray) -> str:
        """Determine the type of setting/location."""
        # Simplified setting detection
        # In production, use scene classification model

        # Analyze colors to guess setting
        avg_color = np.mean(img_array, axis=(0, 1))
        r, g, b = avg_color

        # Green-heavy might be outdoor/nature
        if g > r * 1.2 and g > b * 1.2:
            return "outdoor_nature"
        # Blue-heavy might be sky/water
        elif b > r * 1.2 and b > g * 1.1:
            return "outdoor_sky_water"
        # Warm tones might be indoor
        elif r > b * 1.2:
            return "indoor_warm"
        else:
            return "general"

    def _analyze_background_colors(self, img_array: np.ndarray) -> Dict[str, Any]:
        """Analyze background color palette."""
        # Calculate dominant colors
        avg_color = np.mean(img_array, axis=(0, 1))
        std_color = np.std(img_array, axis=(0, 1))

        return {
            "average_rgb": avg_color.tolist(),
            "color_variance": std_color.tolist(),
            "color_diversity": "high" if np.mean(std_color) > 50 else "moderate" if np.mean(std_color) > 30 else "low",
            "dominant_tone": self._get_dominant_tone(avg_color)
        }

    def _get_dominant_tone(self, avg_color: np.ndarray) -> str:
        """Get dominant color tone."""
        r, g, b = avg_color

        if g > max(r, b) * 1.2:
            return "green"
        elif b > max(r, g) * 1.2:
            return "blue"
        elif r > max(g, b) * 1.2:
            return "red/warm"
        elif min(r, g, b) > 200:
            return "bright/white"
        elif max(r, g, b) < 100:
            return "dark"
        else:
            return "neutral"

    def _check_background_appropriateness(
        self,
        background_type: str,
        background_quality: str,
        distraction_level: str
    ) -> bool:
        """Check if background is appropriate for dating profile."""
        inappropriate_types = ["cluttered", "indoor_messy"]
        high_distraction = distraction_level == "high"

        return (
            background_type not in inappropriate_types and
            not high_distraction
        )

    def _generate_background_suggestions(
        self,
        background_type: str,
        background_quality: str,
        distraction_level: str,
        setting_type: str
    ) -> List[str]:
        """Generate background-specific suggestions."""
        suggestions = []

        if background_type == "cluttered":
            suggestions.append("Choose a simpler, less cluttered background")

        if background_type == "plain":
            suggestions.append("Consider a background with some visual interest")

        if distraction_level == "high":
            suggestions.append("Use portrait mode to blur the background")

        if background_quality == "too_sharp":
            suggestions.append("Blur the background to keep focus on you")

        if setting_type == "indoor_warm":
            suggestions.append("Add variety with outdoor or activity photos")

        if not suggestions:
            suggestions.append("Background looks good!")

        return suggestions

    def _get_recommended_changes(
        self,
        background_type: str,
        is_appropriate: bool
    ) -> List[str]:
        """Get recommended changes if needed."""
        if is_appropriate:
            return ["No changes needed - background is appropriate"]

        changes = []

        if background_type == "cluttered":
            changes.append("Retake photo with cleaner background")
            changes.append("Use portrait mode to blur background")

        if background_type == "indoor_messy":
            changes.append("Tidy up the space before taking photo")
            changes.append("Choose a different location")

        return changes if changes else ["Consider retaking with better background"]

    def _get_variety_recommendations(
        self,
        background_types: List[str],
        setting_types: List[str],
        variety_score: float
    ) -> List[str]:
        """Get recommendations for background variety."""
        recommendations = []

        if variety_score < 50:
            recommendations.append("Add more variety to your photo backgrounds")

        # Check for specific missing types
        if "outdoor_nature" not in setting_types:
            recommendations.append("Consider adding outdoor/nature photos")

        if len(set(background_types)) < 3:
            recommendations.append("Show different aspects of your life with varied backgrounds")

        if all(bg == "plain" for bg in background_types):
            recommendations.append("Add photos with more interesting backgrounds")

        if not recommendations:
            recommendations.append("Good background variety across your photos!")

        return recommendations
