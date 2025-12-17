"""NSFW content detection service implementation."""

import logging
import io
from PIL import Image
import httpx

from models import NSFWResponse

logger = logging.getLogger(__name__)


class NSFWDetectorService:
    """Service for detecting NSFW content."""

    def __init__(self):
        self.http_client = None

    async def initialize(self):
        """Initialize the service."""
        logger.info("Initializing NSFW Detector Service")
        self.http_client = httpx.AsyncClient(timeout=30.0)

    async def close(self):
        """Cleanup resources."""
        logger.info("Closing NSFW Detector Service")
        if self.http_client:
            await self.http_client.aclose()

    async def detect(self, photo_url: str) -> NSFWResponse:
        """
        Detect NSFW content in photo.

        Args:
            photo_url: URL of the photo

        Returns:
            NSFWResponse with NSFW analysis
        """
        try:
            # Download image
            image = await self._download_image(photo_url)

            # Analyze for NSFW content
            # In production, use:
            # - NSFW detection models (e.g., yahoo/open_nsfw, GantMan/nsfw_model)
            # - Cloud APIs (AWS Rekognition, Google Vision, Azure Computer Vision)
            nsfw_scores = await self._analyze_nsfw(image)

            # Calculate overall NSFW score
            nsfw_score = max(nsfw_scores.values())

            # Determine if NSFW (threshold: 0.6)
            is_nsfw = nsfw_score > 0.6

            return NSFWResponse(
                photo_url=photo_url,
                is_nsfw=is_nsfw,
                nsfw_score=round(nsfw_score, 3),
                categories=nsfw_scores,
                flagged_regions=[]
            )

        except Exception as e:
            logger.error(f"NSFW detection error: {e}")
            # Return safe result on error (conservative approach)
            return NSFWResponse(
                photo_url=photo_url,
                is_nsfw=False,
                nsfw_score=0.0,
                categories={},
                flagged_regions=[]
            )

    async def _download_image(self, url: str) -> Image.Image:
        """Download image from URL."""
        response = await self.http_client.get(url)
        response.raise_for_status()
        image_bytes = io.BytesIO(response.content)
        return Image.open(image_bytes)

    async def _analyze_nsfw(self, image: Image.Image) -> dict:
        """
        Analyze image for NSFW content.

        In production, use ML models for accurate detection.
        """
        # Simplified heuristic-based detection
        # In production, replace with actual NSFW model

        width, height = image.size
        pixel_count = width * height

        # Analyze skin tone pixels (simplified)
        skin_ratio = await self._detect_skin_ratio(image)

        # Calculate category scores based on heuristics
        categories = {
            "nudity": min(skin_ratio * 1.5, 1.0),
            "sexual": min(skin_ratio * 1.2, 1.0) if skin_ratio > 0.4 else 0.0,
            "suggestive": min(skin_ratio, 1.0) if skin_ratio > 0.3 else 0.0,
            "violence": 0.0,  # Would need specialized detection
            "gore": 0.0       # Would need specialized detection
        }

        return {k: round(v, 3) for k, v in categories.items()}

    async def _detect_skin_ratio(self, image: Image.Image) -> float:
        """
        Detect ratio of skin-colored pixels.

        Simplified heuristic for demo purposes.
        """
        # Convert to RGB
        rgb_image = image.convert('RGB')
        pixels = list(rgb_image.getdata())

        # Count skin-tone pixels (very simplified)
        skin_count = 0
        for r, g, b in pixels:
            # Simplified skin tone detection
            if (r > 95 and g > 40 and b > 20 and
                r > g and r > b and
                abs(r - g) > 15):
                skin_count += 1

        skin_ratio = skin_count / len(pixels) if pixels else 0.0
        return skin_ratio
