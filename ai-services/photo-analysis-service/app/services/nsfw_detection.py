"""NSFW content detection service."""

from typing import Any, Dict
import io
import numpy as np
from PIL import Image
import structlog

from app.config import Settings

logger = structlog.get_logger()


class NSFWDetectionService:
    """Service for detecting NSFW content in images."""

    def __init__(self, settings: Settings):
        self.settings = settings
        self._classifier = None
        self._use_azure = bool(settings.AZURE_CONTENT_MODERATOR_ENDPOINT)

    async def initialize(self):
        """Initialize NSFW detection models."""
        if self._use_azure:
            logger.info("Using Azure Content Moderator for NSFW detection")
        else:
            logger.info("Loading local NSFW detection model")
            try:
                from nudenet import NudeClassifier
                self._classifier = NudeClassifier()
                logger.info("NudeNet classifier loaded")
            except ImportError:
                logger.warning("NudeNet not available, NSFW detection disabled")
                self._classifier = None

    async def detect(self, image_data: bytes) -> Dict[str, Any]:
        """
        Detect NSFW content in an image.

        Args:
            image_data: Raw image bytes

        Returns:
            Dict with NSFW detection results
        """
        if self._use_azure:
            return await self._detect_azure(image_data)
        else:
            return await self._detect_local(image_data)

    async def _detect_local(self, image_data: bytes) -> Dict[str, Any]:
        """Detect NSFW content using local model."""
        if self._classifier is None:
            # Return safe result if no classifier available
            return {
                "is_nsfw": False,
                "nsfw_score": 0.0,
                "categories": {
                    "safe": 1.0,
                    "unsafe": 0.0
                }
            }

        try:
            # Save temporarily for NudeNet (it needs file path)
            import tempfile
            import os

            with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as f:
                f.write(image_data)
                temp_path = f.name

            try:
                # Run classification
                result = self._classifier.classify(temp_path)

                # Parse results
                if temp_path in result:
                    scores = result[temp_path]

                    # NudeNet returns unsafe probability
                    unsafe_score = scores.get('unsafe', 0)
                    safe_score = scores.get('safe', 1)

                    is_nsfw = unsafe_score > self.settings.NSFW_THRESHOLD

                    return {
                        "is_nsfw": is_nsfw,
                        "nsfw_score": round(unsafe_score, 4),
                        "categories": {
                            "safe": round(safe_score, 4),
                            "unsafe": round(unsafe_score, 4)
                        }
                    }
            finally:
                os.unlink(temp_path)

        except Exception as e:
            logger.error("NSFW detection failed", error=str(e))

        return {
            "is_nsfw": False,
            "nsfw_score": 0.0,
            "categories": {
                "safe": 1.0,
                "unsafe": 0.0,
                "error": "Detection failed"
            }
        }

    async def _detect_azure(self, image_data: bytes) -> Dict[str, Any]:
        """Detect NSFW content using Azure Content Moderator."""
        try:
            from azure.cognitiveservices.vision.contentmoderator import ContentModeratorClient
            from msrest.authentication import CognitiveServicesCredentials

            client = ContentModeratorClient(
                self.settings.AZURE_CONTENT_MODERATOR_ENDPOINT,
                CognitiveServicesCredentials(self.settings.AZURE_CONTENT_MODERATOR_KEY)
            )

            # Evaluate image
            evaluation = client.image_moderation.evaluate_file_input(
                io.BytesIO(image_data),
                cache_image=False
            )

            # Parse results
            is_adult = evaluation.is_image_adult_classified
            adult_score = evaluation.adult_classification_score or 0
            is_racy = evaluation.is_image_racy_classified
            racy_score = evaluation.racy_classification_score or 0

            # Combined NSFW score
            nsfw_score = max(adult_score, racy_score)
            is_nsfw = is_adult or (nsfw_score > self.settings.NSFW_THRESHOLD)

            return {
                "is_nsfw": is_nsfw,
                "nsfw_score": round(nsfw_score, 4),
                "categories": {
                    "adult": round(adult_score, 4),
                    "racy": round(racy_score, 4),
                    "is_adult_classified": is_adult,
                    "is_racy_classified": is_racy
                }
            }

        except Exception as e:
            logger.error("Azure content moderation failed", error=str(e))
            return await self._detect_local(image_data)

    async def detect_batch(self, images: list[bytes]) -> list[Dict[str, Any]]:
        """Detect NSFW content in multiple images."""
        results = []
        for image_data in images:
            result = await self.detect(image_data)
            results.append(result)
        return results
