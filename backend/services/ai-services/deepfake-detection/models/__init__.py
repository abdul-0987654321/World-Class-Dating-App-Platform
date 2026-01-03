"""Model configurations and utilities for deepfake detection."""

from .efficientnet_detector import EfficientNetDeepfakeDetector
from .face_extractor import FaceExtractor

__all__ = ["EfficientNetDeepfakeDetector", "FaceExtractor"]
