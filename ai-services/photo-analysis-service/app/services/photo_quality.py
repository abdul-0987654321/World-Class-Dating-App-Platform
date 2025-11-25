"""Photo quality analysis service."""

from typing import Any, Dict, List
import io
import numpy as np
from PIL import Image
import structlog

from app.config import Settings

logger = structlog.get_logger()


class PhotoQualityService:
    """Service for analyzing photo quality."""

    def __init__(self, settings: Settings):
        self.settings = settings

    async def initialize(self):
        """Initialize quality analysis."""
        logger.info("Photo quality service initialized")

    async def analyze(self, image_data: bytes) -> Dict[str, Any]:
        """
        Analyze photo quality.

        Args:
            image_data: Raw image bytes

        Returns:
            Dict with quality metrics
        """
        try:
            # Load image
            image = Image.open(io.BytesIO(image_data))
            image_np = np.array(image)

            # Calculate metrics
            resolution = self._get_resolution(image)
            brightness = self._calculate_brightness(image_np)
            blur_score = self._calculate_blur_score(image_np)
            contrast = self._calculate_contrast(image_np)

            # Identify issues
            issues = self._identify_issues(
                resolution, brightness, blur_score, contrast, len(image_data)
            )

            # Calculate overall quality score
            quality_score = self._calculate_quality_score(
                resolution, brightness, blur_score, contrast, issues
            )

            is_acceptable = (
                quality_score >= 50 and
                len(issues) <= 1 and
                "No face detected" not in issues
            )

            return {
                "quality_score": round(quality_score, 2),
                "issues": issues,
                "resolution": resolution,
                "brightness": round(brightness, 4),
                "blur_score": round(blur_score, 2),
                "contrast": round(contrast, 2),
                "is_acceptable": is_acceptable
            }

        except Exception as e:
            logger.error("Photo quality analysis failed", error=str(e))
            return {
                "quality_score": 0,
                "issues": ["Failed to analyze image"],
                "resolution": {"width": 0, "height": 0},
                "brightness": 0,
                "blur_score": 0,
                "contrast": 0,
                "is_acceptable": False
            }

    def _get_resolution(self, image: Image.Image) -> Dict[str, int]:
        """Get image resolution."""
        return {
            "width": image.width,
            "height": image.height
        }

    def _calculate_brightness(self, image_np: np.ndarray) -> float:
        """
        Calculate average brightness (0-1).

        Optimal range is 0.4-0.6 for profile photos.
        """
        if len(image_np.shape) == 3:
            # Convert to grayscale using luminosity method
            gray = 0.299 * image_np[:, :, 0] + 0.587 * image_np[:, :, 1] + 0.114 * image_np[:, :, 2]
        else:
            gray = image_np

        return np.mean(gray) / 255.0

    def _calculate_blur_score(self, image_np: np.ndarray) -> float:
        """
        Calculate blur score using Laplacian variance.

        Higher score = sharper image.
        Typical threshold: < 100 is considered blurry.
        """
        try:
            import cv2

            # Convert to grayscale
            if len(image_np.shape) == 3:
                gray = cv2.cvtColor(image_np, cv2.COLOR_RGB2GRAY)
            else:
                gray = image_np

            # Calculate Laplacian variance
            laplacian = cv2.Laplacian(gray, cv2.CV_64F)
            variance = laplacian.var()

            return float(variance)

        except ImportError:
            # Fallback without OpenCV
            if len(image_np.shape) == 3:
                gray = np.mean(image_np, axis=2)
            else:
                gray = image_np

            # Simple edge detection
            dx = np.diff(gray, axis=1)
            dy = np.diff(gray, axis=0)
            variance = np.var(dx) + np.var(dy)

            return float(variance)

    def _calculate_contrast(self, image_np: np.ndarray) -> float:
        """
        Calculate image contrast.

        Returns standard deviation of pixel values.
        """
        if len(image_np.shape) == 3:
            gray = np.mean(image_np, axis=2)
        else:
            gray = image_np

        return float(np.std(gray))

    def _identify_issues(
        self,
        resolution: Dict[str, int],
        brightness: float,
        blur_score: float,
        contrast: float,
        file_size: int
    ) -> List[str]:
        """Identify quality issues with the photo."""
        issues = []

        # Check resolution
        min_dim = min(resolution["width"], resolution["height"])
        if min_dim < self.settings.MIN_RESOLUTION:
            issues.append(f"Resolution too low (minimum {self.settings.MIN_RESOLUTION}px)")

        # Check file size
        if file_size > self.settings.MAX_FILE_SIZE:
            issues.append("File size too large")

        # Check brightness
        if brightness < 0.2:
            issues.append("Photo is too dark")
        elif brightness > 0.85:
            issues.append("Photo is overexposed")

        # Check blur
        if blur_score < self.settings.BLUR_THRESHOLD:
            issues.append("Photo is too blurry")

        # Check contrast
        if contrast < 20:
            issues.append("Photo has low contrast")

        return issues

    def _calculate_quality_score(
        self,
        resolution: Dict[str, int],
        brightness: float,
        blur_score: float,
        contrast: float,
        issues: List[str]
    ) -> float:
        """Calculate overall quality score (0-100)."""
        score = 100.0

        # Resolution score (up to 25 points)
        min_dim = min(resolution["width"], resolution["height"])
        if min_dim < self.settings.MIN_RESOLUTION:
            score -= 25
        elif min_dim < 600:
            score -= 15
        elif min_dim < 800:
            score -= 5

        # Brightness score (up to 25 points)
        if brightness < 0.2 or brightness > 0.85:
            score -= 25
        elif brightness < 0.3 or brightness > 0.75:
            score -= 15
        elif brightness < 0.35 or brightness > 0.7:
            score -= 5

        # Blur score (up to 25 points)
        if blur_score < self.settings.BLUR_THRESHOLD / 2:
            score -= 25
        elif blur_score < self.settings.BLUR_THRESHOLD:
            score -= 15
        elif blur_score < self.settings.BLUR_THRESHOLD * 1.5:
            score -= 5

        # Contrast score (up to 15 points)
        if contrast < 20:
            score -= 15
        elif contrast < 30:
            score -= 10
        elif contrast < 40:
            score -= 5

        # Penalty for number of issues
        score -= len(issues) * 5

        return max(0, min(100, score))

    async def analyze_batch(self, images: list[bytes]) -> list[Dict[str, Any]]:
        """Analyze quality of multiple images."""
        results = []
        for image_data in images:
            result = await self.analyze(image_data)
            results.append(result)
        return results
