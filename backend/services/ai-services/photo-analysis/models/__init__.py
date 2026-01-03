"""
Photo Analysis Model Configurations

This package contains configuration files for ML models used in photo analysis:
- Face detection models (Haar Cascades, dlib)
- Quality assessment configurations
- Content moderation thresholds
- Style analysis parameters
"""

from .config import (
    ModelConfig,
    FaceDetectionConfig,
    QualityConfig,
    ModerationConfig,
    StyleConfig,
    get_config,
)

__all__ = [
    "ModelConfig",
    "FaceDetectionConfig",
    "QualityConfig",
    "ModerationConfig",
    "StyleConfig",
    "get_config",
]
