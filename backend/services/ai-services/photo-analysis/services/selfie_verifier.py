"""Selfie verification service implementation."""

import logging
import io
from typing import List
from PIL import Image
import httpx

from models import SelfieVerifyResponse

logger = logging.getLogger(__name__)


class SelfieVerifierService:
    """Service for verifying selfies against profile photos."""

    def __init__(self):
        self.http_client = None

    async def initialize(self):
        """Initialize the service."""
        logger.info("Initializing Selfie Verifier Service")
        self.http_client = httpx.AsyncClient(timeout=30.0)

    async def close(self):
        """Cleanup resources."""
        logger.info("Closing Selfie Verifier Service")
        if self.http_client:
            await self.http_client.aclose()

    async def verify(
        self,
        selfie_url: str,
        profile_photo_urls: List[str],
        user_id: str
    ) -> SelfieVerifyResponse:
        """
        Verify selfie matches profile photos.

        Args:
            selfie_url: URL of the selfie
            profile_photo_urls: URLs of profile photos
            user_id: User ID

        Returns:
            SelfieVerifyResponse with verification results
        """
        try:
            # Download selfie
            selfie_image = await self._download_image(selfie_url)

            # Download profile photos
            profile_images = []
            for url in profile_photo_urls:
                try:
                    img = await self._download_image(url)
                    profile_images.append((url, img))
                except Exception as e:
                    logger.warning(f"Failed to download profile photo {url}: {e}")

            if not profile_images:
                return SelfieVerifyResponse(
                    user_id=user_id,
                    is_match=False,
                    match_score=0.0,
                    matched_photos=[],
                    details={"error": "No profile photos could be loaded"}
                )

            # Compare selfie to each profile photo
            # In production, use:
            # - face_recognition library
            # - DeepFace
            # - Azure Face API, AWS Rekognition, or Google Vision API
            matched_photos = []
            match_scores = []

            for photo_url, photo_image in profile_images:
                similarity = await self._compare_faces(selfie_image, photo_image)

                if similarity > 0.6:  # Match threshold
                    matched_photos.append(photo_url)
                    match_scores.append(similarity)

            # Overall match score
            match_score = max(match_scores) if match_scores else 0.0

            # Determine if match (threshold: 0.7)
            is_match = match_score > 0.7

            details = {
                "selfie_analyzed": True,
                "profile_photos_analyzed": len(profile_images),
                "matches_found": len(matched_photos),
                "highest_similarity": round(match_score, 3)
            }

            return SelfieVerifyResponse(
                user_id=user_id,
                is_match=is_match,
                match_score=round(match_score, 3),
                matched_photos=matched_photos,
                details=details
            )

        except Exception as e:
            logger.error(f"Selfie verification error: {e}")
            return SelfieVerifyResponse(
                user_id=user_id,
                is_match=False,
                match_score=0.0,
                matched_photos=[],
                details={"error": str(e)}
            )

    async def _download_image(self, url: str) -> Image.Image:
        """Download image from URL."""
        response = await self.http_client.get(url)
        response.raise_for_status()
        image_bytes = io.BytesIO(response.content)
        return Image.open(image_bytes)

    async def _compare_faces(
        self,
        image1: Image.Image,
        image2: Image.Image
    ) -> float:
        """
        Compare two faces for similarity.

        In production, use facial recognition:
        1. Extract face embeddings using deep learning model
        2. Calculate cosine similarity between embeddings
        3. Return similarity score

        Returns similarity score (0-1).
        """
        # Simplified comparison using image histogram similarity
        # In production, use proper facial recognition

        # Convert to RGB
        img1_rgb = image1.convert('RGB')
        img2_rgb = image2.convert('RGB')

        # Resize to same size for comparison
        size = (256, 256)
        img1_resized = img1_rgb.resize(size)
        img2_resized = img2_rgb.resize(size)

        # Calculate histogram similarity
        hist1 = img1_resized.histogram()
        hist2 = img2_resized.histogram()

        # Calculate correlation (simplified)
        sum_squared_diff = sum((h1 - h2) ** 2 for h1, h2 in zip(hist1, hist2))
        max_possible_diff = len(hist1) * (255 ** 2)

        # Convert to similarity score
        similarity = 1.0 - (sum_squared_diff / max_possible_diff)

        # Boost similarity for demo (in production, proper face matching would be more accurate)
        similarity = min(similarity * 1.5, 1.0)

        return similarity
