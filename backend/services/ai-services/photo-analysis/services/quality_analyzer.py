"""Photo quality analysis service implementation."""

import logging
import io
from PIL import Image
import httpx

from models import PhotoQualityResponse, PhotoQualityLevel

logger = logging.getLogger(__name__)


class QualityAnalyzerService:
    """Service for analyzing photo quality."""

    def __init__(self):
        self.http_client = None

    async def initialize(self):
        """Initialize the service."""
        logger.info("Initializing Quality Analyzer Service")
        self.http_client = httpx.AsyncClient(timeout=30.0)

    async def close(self):
        """Cleanup resources."""
        logger.info("Closing Quality Analyzer Service")
        if self.http_client:
            await self.http_client.aclose()

    async def analyze(self, photo_url: str) -> PhotoQualityResponse:
        """
        Analyze photo quality.

        Args:
            photo_url: URL of the photo

        Returns:
            PhotoQualityResponse with quality assessment
        """
        try:
            # Download image
            image = await self._download_image(photo_url)

            # Get resolution
            width, height = image.size
            resolution = {"width": width, "height": height}

            # Analyze quality factors
            issues = []
            quality_score = 100.0

            # Check resolution
            if width < 400 or height < 400:
                issues.append("low_resolution")
                quality_score -= 30
            elif width < 800 or height < 800:
                issues.append("medium_resolution")
                quality_score -= 15

            # Check aspect ratio
            aspect_ratio = width / height
            if aspect_ratio < 0.5 or aspect_ratio > 2.0:
                issues.append("unusual_aspect_ratio")
                quality_score -= 10

            # Check file size (estimate quality from dimensions)
            pixel_count = width * height
            if pixel_count < 160000:  # Less than 400x400
                issues.append("low_pixel_count")
                quality_score -= 20

            # Analyze brightness (simplified)
            brightness_score = await self._analyze_brightness(image)
            if brightness_score < 30:
                issues.append("too_dark")
                quality_score -= 20
            elif brightness_score > 230:
                issues.append("too_bright")
                quality_score -= 15

            # Ensure score is between 0 and 100
            quality_score = max(0, min(100, quality_score))

            # Determine quality level
            if quality_score >= 80:
                quality_level = PhotoQualityLevel.EXCELLENT
            elif quality_score >= 60:
                quality_level = PhotoQualityLevel.GOOD
            elif quality_score >= 40:
                quality_level = PhotoQualityLevel.FAIR
            else:
                quality_level = PhotoQualityLevel.POOR

            details = {
                "pixel_count": pixel_count,
                "aspect_ratio": round(aspect_ratio, 2),
                "brightness_score": round(brightness_score, 2)
            }

            return PhotoQualityResponse(
                photo_url=photo_url,
                quality_score=round(quality_score, 2),
                quality_level=quality_level,
                resolution=resolution,
                issues=issues,
                details=details
            )

        except Exception as e:
            logger.error(f"Quality analysis error: {e}")
            # Return poor quality on error
            return PhotoQualityResponse(
                photo_url=photo_url,
                quality_score=0.0,
                quality_level=PhotoQualityLevel.POOR,
                resolution={"width": 0, "height": 0},
                issues=["analysis_failed"],
                details={"error": str(e)}
            )

    async def _download_image(self, url: str) -> Image.Image:
        """Download image from URL."""
        response = await self.http_client.get(url)
        response.raise_for_status()
        image_bytes = io.BytesIO(response.content)
        return Image.open(image_bytes)

    async def _analyze_brightness(self, image: Image.Image) -> float:
        """
        Analyze image brightness.

        Returns average brightness (0-255).
        """
        # Convert to grayscale
        grayscale = image.convert('L')

        # Calculate average brightness
        pixels = list(grayscale.getdata())
        avg_brightness = sum(pixels) / len(pixels)

        return avg_brightness
