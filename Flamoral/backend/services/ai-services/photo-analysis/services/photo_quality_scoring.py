"""Enhanced photo quality scoring with detailed metrics."""

import asyncio
from typing import Dict, List, Optional, Any, Tuple
import numpy as np
from PIL import Image
import io
import httpx
import cv2
import logging

logger = logging.getLogger(__name__)


class PhotoQualityScoringService:
    """Service for comprehensive photo quality scoring."""

    def __init__(self):
        """Initialize the photo quality scoring service."""
        self.client = httpx.AsyncClient(timeout=30.0)

    async def initialize(self):
        """Initialize the service."""
        logger.info("Photo quality scoring service initialized")

    async def close(self):
        """Cleanup resources."""
        await self.client.aclose()

    async def score_photo_quality(
        self,
        photo_url: str
    ) -> Dict[str, Any]:
        """
        Comprehensive photo quality scoring.

        Args:
            photo_url: URL of the photo to analyze

        Returns:
            Detailed quality scores and metrics
        """
        try:
            # Download image
            image = await self._download_image(photo_url)
            if image is None:
                return {
                    "success": False,
                    "error": "Failed to download image"
                }

            # Convert to numpy array for analysis
            img_array = np.array(image)

            # Calculate various quality metrics
            resolution_score = self._score_resolution(image)
            sharpness_score = await self._score_sharpness(img_array)
            brightness_score = self._score_brightness(img_array)
            contrast_score = self._score_contrast(img_array)
            color_balance_score = self._score_color_balance(img_array)
            noise_score = self._score_noise(img_array)
            composition_score = self._score_composition(img_array)

            # Calculate overall quality score
            overall_score = self._calculate_overall_score({
                "resolution": resolution_score,
                "sharpness": sharpness_score,
                "brightness": brightness_score,
                "contrast": contrast_score,
                "color_balance": color_balance_score,
                "noise": noise_score,
                "composition": composition_score
            })

            # Determine quality level
            quality_level = self._determine_quality_level(overall_score)

            # Generate improvement suggestions
            suggestions = self._generate_quality_suggestions({
                "resolution": resolution_score,
                "sharpness": sharpness_score,
                "brightness": brightness_score,
                "contrast": contrast_score,
                "color_balance": color_balance_score,
                "noise": noise_score,
                "composition": composition_score
            })

            # Check if photo meets minimum standards
            meets_standards = overall_score >= 60

            return {
                "success": True,
                "photo_url": photo_url,
                "overall_score": round(overall_score, 1),
                "quality_level": quality_level,
                "meets_standards": meets_standards,
                "metrics": {
                    "resolution": {
                        "score": round(resolution_score, 1),
                        "width": image.width,
                        "height": image.height,
                        "megapixels": round((image.width * image.height) / 1_000_000, 2)
                    },
                    "sharpness": {
                        "score": round(sharpness_score, 1),
                        "level": "sharp" if sharpness_score > 70 else "moderate" if sharpness_score > 50 else "blurry"
                    },
                    "brightness": {
                        "score": round(brightness_score, 1),
                        "level": self._get_brightness_level(brightness_score)
                    },
                    "contrast": {
                        "score": round(contrast_score, 1),
                        "level": "good" if contrast_score > 70 else "moderate" if contrast_score > 50 else "poor"
                    },
                    "color_balance": {
                        "score": round(color_balance_score, 1),
                        "level": "balanced" if color_balance_score > 70 else "needs_adjustment"
                    },
                    "noise": {
                        "score": round(noise_score, 1),
                        "level": "low" if noise_score > 70 else "moderate" if noise_score > 50 else "high"
                    },
                    "composition": {
                        "score": round(composition_score, 1),
                        "level": "good" if composition_score > 70 else "acceptable" if composition_score > 50 else "poor"
                    }
                },
                "suggestions": suggestions,
                "recommended_for_profile": meets_standards and quality_level in ["excellent", "good"]
            }

        except Exception as e:
            logger.error(f"Photo quality scoring failed: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e)
            }

    async def compare_photo_quality(
        self,
        photo_urls: List[str]
    ) -> Dict[str, Any]:
        """
        Compare quality across multiple photos and rank them.

        Args:
            photo_urls: List of photo URLs to compare

        Returns:
            Ranked photos with quality comparisons
        """
        try:
            if not photo_urls:
                return {
                    "success": False,
                    "error": "No photos provided"
                }

            # Score all photos
            scored_photos = []
            for url in photo_urls:
                score_result = await self.score_photo_quality(url)
                if score_result["success"]:
                    scored_photos.append({
                        "url": url,
                        "score": score_result["overall_score"],
                        "quality_level": score_result["quality_level"],
                        "metrics": score_result["metrics"]
                    })

            # Sort by score
            ranked_photos = sorted(scored_photos, key=lambda x: x["score"], reverse=True)

            # Calculate statistics
            scores = [p["score"] for p in scored_photos]
            avg_score = sum(scores) / len(scores) if scores else 0

            return {
                "success": True,
                "photo_count": len(photo_urls),
                "analyzed_count": len(scored_photos),
                "ranked_photos": ranked_photos,
                "statistics": {
                    "average_score": round(avg_score, 1),
                    "highest_score": max(scores) if scores else 0,
                    "lowest_score": min(scores) if scores else 0,
                    "excellent_count": sum(1 for p in scored_photos if p["quality_level"] == "excellent"),
                    "good_count": sum(1 for p in scored_photos if p["quality_level"] == "good"),
                    "fair_count": sum(1 for p in scored_photos if p["quality_level"] == "fair"),
                    "poor_count": sum(1 for p in scored_photos if p["quality_level"] == "poor")
                },
                "recommendations": self._get_comparison_recommendations(ranked_photos)
            }

        except Exception as e:
            logger.error(f"Photo comparison failed: {e}", exc_info=True)
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

    def _score_resolution(self, image: Image.Image) -> float:
        """Score image resolution."""
        width, height = image.size
        pixels = width * height
        megapixels = pixels / 1_000_000

        # Optimal resolution for profile photos: 1-8 megapixels
        if megapixels >= 2 and megapixels <= 8:
            return 100
        elif megapixels >= 1 and megapixels < 2:
            return 80
        elif megapixels >= 0.5 and megapixels < 1:
            return 60
        elif megapixels < 0.5:
            return 40
        else:  # Too high resolution
            return 90

    async def _score_sharpness(self, img_array: np.ndarray) -> float:
        """Score image sharpness using Laplacian variance."""
        try:
            # Convert to grayscale
            if len(img_array.shape) == 3:
                gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
            else:
                gray = img_array

            # Calculate Laplacian variance
            laplacian = cv2.Laplacian(gray, cv2.CV_64F)
            variance = laplacian.var()

            # Normalize variance to 0-100 scale
            # Typical sharp images have variance > 100
            # Blurry images have variance < 100
            if variance > 500:
                return 100
            elif variance > 300:
                return 90
            elif variance > 150:
                return 75
            elif variance > 100:
                return 60
            else:
                return max(0, variance / 2)

        except Exception as e:
            logger.error(f"Sharpness scoring failed: {e}")
            return 50

    def _score_brightness(self, img_array: np.ndarray) -> float:
        """Score image brightness."""
        try:
            # Convert to grayscale
            if len(img_array.shape) == 3:
                gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
            else:
                gray = img_array

            # Calculate mean brightness
            mean_brightness = np.mean(gray)

            # Optimal brightness is around 120-140 (out of 255)
            optimal_min = 100
            optimal_max = 160

            if optimal_min <= mean_brightness <= optimal_max:
                return 100
            elif mean_brightness < optimal_min:
                # Too dark
                return max(0, (mean_brightness / optimal_min) * 100)
            else:
                # Too bright
                excess = mean_brightness - optimal_max
                return max(0, 100 - (excess / 95) * 50)

        except Exception as e:
            logger.error(f"Brightness scoring failed: {e}")
            return 50

    def _score_contrast(self, img_array: np.ndarray) -> float:
        """Score image contrast."""
        try:
            # Convert to grayscale
            if len(img_array.shape) == 3:
                gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
            else:
                gray = img_array

            # Calculate standard deviation as contrast measure
            contrast = np.std(gray)

            # Good contrast is typically 40-80
            if 40 <= contrast <= 80:
                return 100
            elif contrast < 40:
                return max(0, (contrast / 40) * 100)
            else:
                return max(0, 100 - ((contrast - 80) / 175) * 50)

        except Exception as e:
            logger.error(f"Contrast scoring failed: {e}")
            return 50

    def _score_color_balance(self, img_array: np.ndarray) -> float:
        """Score color balance."""
        try:
            if len(img_array.shape) != 3:
                return 70  # Grayscale image

            # Calculate mean for each channel
            r_mean = np.mean(img_array[:, :, 0])
            g_mean = np.mean(img_array[:, :, 1])
            b_mean = np.mean(img_array[:, :, 2])

            # Calculate deviation from balanced (all channels equal)
            avg_mean = (r_mean + g_mean + b_mean) / 3
            r_dev = abs(r_mean - avg_mean)
            g_dev = abs(g_mean - avg_mean)
            b_dev = abs(b_mean - avg_mean)

            max_deviation = max(r_dev, g_dev, b_dev)

            # Well-balanced images have low deviation
            if max_deviation < 10:
                return 100
            elif max_deviation < 20:
                return 90
            elif max_deviation < 30:
                return 75
            elif max_deviation < 50:
                return 60
            else:
                return max(0, 60 - ((max_deviation - 50) / 205) * 60)

        except Exception as e:
            logger.error(f"Color balance scoring failed: {e}")
            return 50

    def _score_noise(self, img_array: np.ndarray) -> float:
        """Score image noise level."""
        try:
            # Convert to grayscale
            if len(img_array.shape) == 3:
                gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
            else:
                gray = img_array

            # Use local standard deviation to detect noise
            # Apply Gaussian blur and subtract from original
            blurred = cv2.GaussianBlur(gray, (5, 5), 0)
            noise = gray - blurred
            noise_level = np.std(noise)

            # Lower noise level is better
            if noise_level < 5:
                return 100
            elif noise_level < 10:
                return 90
            elif noise_level < 15:
                return 75
            elif noise_level < 20:
                return 60
            else:
                return max(0, 60 - ((noise_level - 20) / 235) * 60)

        except Exception as e:
            logger.error(f"Noise scoring failed: {e}")
            return 50

    def _score_composition(self, img_array: np.ndarray) -> float:
        """Score photo composition (basic rule of thirds check)."""
        try:
            height, width = img_array.shape[:2]

            # Divide image into 9 sections (rule of thirds)
            h_third = height // 3
            w_third = width // 3

            # Check if there's interesting content in key intersection points
            # This is a simplified composition check
            # In production, use more sophisticated composition analysis

            # For now, return a moderate score
            # Could be enhanced with face detection positioning,
            # edge detection, etc.
            return 70

        except Exception as e:
            logger.error(f"Composition scoring failed: {e}")
            return 50

    def _calculate_overall_score(self, metrics: Dict[str, float]) -> float:
        """Calculate weighted overall quality score."""
        weights = {
            "resolution": 0.15,
            "sharpness": 0.25,
            "brightness": 0.15,
            "contrast": 0.15,
            "color_balance": 0.10,
            "noise": 0.10,
            "composition": 0.10
        }

        total_score = sum(
            metrics[metric] * weight
            for metric, weight in weights.items()
        )

        return total_score

    def _determine_quality_level(self, score: float) -> str:
        """Determine quality level from score."""
        if score >= 85:
            return "excellent"
        elif score >= 70:
            return "good"
        elif score >= 50:
            return "fair"
        else:
            return "poor"

    def _get_brightness_level(self, score: float) -> str:
        """Get brightness level description."""
        if score >= 90:
            return "optimal"
        elif score >= 70:
            return "good"
        elif score >= 50:
            return "slightly_dark"
        else:
            return "too_dark"

    def _generate_quality_suggestions(self, metrics: Dict[str, float]) -> List[str]:
        """Generate improvement suggestions based on metrics."""
        suggestions = []

        if metrics["resolution"] < 70:
            suggestions.append("Use a higher resolution camera or avoid digital zoom")

        if metrics["sharpness"] < 60:
            suggestions.append("Ensure photo is in focus and avoid camera shake")

        if metrics["brightness"] < 60:
            suggestions.append("Improve lighting conditions or adjust exposure")

        if metrics["contrast"] < 60:
            suggestions.append("Increase contrast or shoot in better lighting")

        if metrics["color_balance"] < 60:
            suggestions.append("Adjust white balance or color temperature")

        if metrics["noise"] < 60:
            suggestions.append("Reduce ISO sensitivity or improve lighting to reduce noise")

        if not suggestions:
            suggestions.append("Photo quality is good!")

        return suggestions

    def _get_comparison_recommendations(self, ranked_photos: List[Dict]) -> List[str]:
        """Get recommendations based on photo comparison."""
        recommendations = []

        if not ranked_photos:
            return recommendations

        best_photo = ranked_photos[0]
        worst_photo = ranked_photos[-1]

        if best_photo["score"] >= 85:
            recommendations.append(f"Your best photo (#{ranked_photos.index(best_photo) + 1}) is excellent - make it your primary photo")

        if worst_photo["score"] < 50:
            recommendations.append(f"Consider replacing photo #{ranked_photos.index(worst_photo) + 1} with higher quality image")

        avg_score = sum(p["score"] for p in ranked_photos) / len(ranked_photos)
        if avg_score < 70:
            recommendations.append("Overall photo quality could be improved - consider retaking photos in better conditions")

        return recommendations
