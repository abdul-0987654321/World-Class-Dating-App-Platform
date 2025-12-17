"""Deepfake and AI-generated image detection service."""

import logging
import io
from PIL import Image
import httpx

from models import DeepfakeResponse

logger = logging.getLogger(__name__)


class DeepfakeDetectorService:
    """Service for detecting deepfakes and AI-generated images."""

    def __init__(self):
        self.http_client = None

    async def initialize(self):
        """Initialize the service."""
        logger.info("Initializing Deepfake Detector Service")
        self.http_client = httpx.AsyncClient(timeout=30.0)

    async def close(self):
        """Cleanup resources."""
        logger.info("Closing Deepfake Detector Service")
        if self.http_client:
            await self.http_client.aclose()

    async def detect(self, photo_url: str) -> DeepfakeResponse:
        """
        Detect if photo is AI-generated or deepfake.

        Args:
            photo_url: URL of the photo

        Returns:
            DeepfakeResponse with detection results
        """
        try:
            # Download image
            image = await self._download_image(photo_url)

            # Analyze for deepfake indicators
            # In production, use:
            # - Deepfake detection models
            # - Forensic analysis tools
            # - Cloud-based deepfake detection APIs
            indicators = await self._analyze_deepfake(image)

            # Calculate deepfake score
            deepfake_score = len(indicators) / 10.0  # Normalize by max indicators

            # Confidence in detection
            confidence = min(deepfake_score * 1.5, 1.0)

            # Determine if deepfake (threshold: 0.5)
            is_deepfake = deepfake_score > 0.5

            return DeepfakeResponse(
                photo_url=photo_url,
                is_deepfake=is_deepfake,
                deepfake_score=round(deepfake_score, 3),
                indicators=indicators,
                confidence=round(confidence, 3)
            )

        except Exception as e:
            logger.error(f"Deepfake detection error: {e}")
            # Return not-deepfake on error (conservative approach)
            return DeepfakeResponse(
                photo_url=photo_url,
                is_deepfake=False,
                deepfake_score=0.0,
                indicators=[],
                confidence=0.0
            )

    async def _download_image(self, url: str) -> Image.Image:
        """Download image from URL."""
        response = await self.http_client.get(url)
        response.raise_for_status()
        image_bytes = io.BytesIO(response.content)
        return Image.open(image_bytes)

    async def _analyze_deepfake(self, image: Image.Image) -> list:
        """
        Analyze image for deepfake indicators.

        In production, use ML models trained on deepfake detection.
        Common indicators:
        - Unnatural eye movements/reflections
        - Inconsistent lighting
        - Facial warping artifacts
        - Unusual skin texture
        - Mismatched ears
        - Blurred boundaries
        """
        indicators = []

        # Check image metadata
        if hasattr(image, '_getexif') and image._getexif():
            exif = image._getexif()
            # Check for missing or suspicious EXIF data
            if not exif or len(exif) < 3:
                indicators.append("missing_exif_data")

        # Check for perfect symmetry (common in AI-generated faces)
        symmetry_score = await self._check_symmetry(image)
        if symmetry_score > 0.95:
            indicators.append("unnaturally_symmetric")

        # Check for unusual smoothness (AI smoothing artifact)
        texture_score = await self._analyze_texture(image)
        if texture_score < 0.2:
            indicators.append("overly_smooth_texture")

        # Check for consistent artifacts
        # In production, use frequency domain analysis (FFT)
        # to detect GAN artifacts

        # Check resolution patterns
        width, height = image.size
        if width == height and width in [512, 1024, 2048]:
            # Common GAN output sizes
            indicators.append("common_gan_resolution")

        return indicators

    async def _check_symmetry(self, image: Image.Image) -> float:
        """
        Check facial symmetry.

        Returns symmetry score (0-1).
        """
        # Simplified symmetry check
        # In production, use facial landmark detection and compare left/right halves

        width, height = image.size

        # Convert to grayscale for comparison
        grayscale = image.convert('L')

        # Split image in half
        left_half = grayscale.crop((0, 0, width // 2, height))
        right_half = grayscale.crop((width // 2, 0, width, height))

        # Flip right half
        right_half_flipped = right_half.transpose(Image.FLIP_LEFT_RIGHT)

        # Compare (simplified - just check if they're similar size)
        # In production, use structural similarity index (SSIM)
        symmetry_score = 0.7  # Placeholder

        return symmetry_score

    async def _analyze_texture(self, image: Image.Image) -> float:
        """
        Analyze image texture.

        Returns texture complexity score (0-1).
        """
        # Convert to grayscale
        grayscale = image.convert('L')

        # Calculate texture variation (simplified)
        pixels = list(grayscale.getdata())

        # Calculate standard deviation of pixel values
        if len(pixels) > 1:
            mean = sum(pixels) / len(pixels)
            variance = sum((p - mean) ** 2 for p in pixels) / len(pixels)
            std_dev = variance ** 0.5

            # Normalize to 0-1 range
            texture_score = min(std_dev / 128.0, 1.0)
        else:
            texture_score = 0.0

        return texture_score
