"""
Model Configuration for Photo Analysis Service.

Contains all configurable parameters for ML models and analysis thresholds.
"""

import os
from dataclasses import dataclass, field
from typing import Dict, List, Tuple, Optional
from enum import Enum


class Environment(str, Enum):
    """Deployment environment."""
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"


@dataclass
class FaceDetectionConfig:
    """Configuration for face detection models."""
    # Haar Cascade settings
    scale_factor: float = 1.1
    min_neighbors: int = 5
    min_size: Tuple[int, int] = (30, 30)

    # Face size requirements
    min_face_ratio: float = 0.10  # Minimum face area as ratio of image
    max_face_ratio: float = 0.80  # Maximum face area as ratio of image
    optimal_face_ratio: Tuple[float, float] = (0.15, 0.50)

    # Detection confidence thresholds
    min_confidence: float = 0.5
    high_confidence: float = 0.85

    # Eye detection for validation
    detect_eyes: bool = True
    require_eyes: bool = False  # Require eye detection for face validation

    # dlib settings (for production with dlib installed)
    use_dlib: bool = False
    dlib_model_path: Optional[str] = None
    dlib_upsample_times: int = 1


@dataclass
class QualityConfig:
    """Configuration for quality assessment."""
    # Resolution thresholds
    min_resolution: Tuple[int, int] = (400, 400)
    optimal_resolution: Tuple[int, int] = (800, 800)
    max_resolution: Tuple[int, int] = (4096, 4096)

    # Brightness thresholds (0-255)
    brightness_min: int = 60
    brightness_max: int = 200
    brightness_optimal_range: Tuple[int, int] = (80, 180)

    # Sharpness (Laplacian variance)
    blur_threshold: float = 100.0
    sharp_threshold: float = 300.0
    very_sharp_threshold: float = 500.0

    # Noise threshold
    noise_threshold: float = 20.0

    # Quality score weights
    weights: Dict[str, float] = field(default_factory=lambda: {
        "resolution": 0.20,
        "lighting": 0.25,
        "sharpness": 0.25,
        "compression": 0.15,
        "noise": 0.15,
    })

    # Quality level thresholds
    excellent_threshold: float = 85.0
    good_threshold: float = 70.0
    fair_threshold: float = 50.0


@dataclass
class ModerationConfig:
    """Configuration for content moderation."""
    # NSFW thresholds
    nsfw_threshold: float = 0.6
    suggestive_threshold: float = 0.5

    # Skin exposure
    skin_exposure_warning: float = 0.4
    skin_exposure_reject: float = 0.7

    # Violence detection
    violence_threshold: float = 0.6

    # Content categories
    categories: List[str] = field(default_factory=lambda: [
        "nudity",
        "suggestive",
        "violence",
        "hate_symbols",
        "drugs",
        "weapons",
    ])

    # Strict mode multiplier
    strict_mode_multiplier: float = 0.7  # Lower thresholds in strict mode


@dataclass
class StyleConfig:
    """Configuration for style and feedback analysis."""
    # Base score
    base_style_score: float = 50.0

    # Score adjustments
    good_lighting_bonus: float = 10.0
    natural_smile_bonus: float = 10.0
    well_centered_bonus: float = 5.0
    high_quality_bonus: float = 5.0

    poor_lighting_penalty: float = -10.0
    no_face_penalty: float = -20.0
    multiple_faces_penalty: float = -5.0
    blurry_penalty: float = -15.0

    # Photo type classification
    selfie_face_ratio_min: float = 0.30
    group_face_count_threshold: int = 2

    # Background analysis
    neutral_saturation_threshold: float = 30.0
    busy_hue_std_threshold: float = 30.0

    # Feedback messages
    positive_messages: Dict[str, str] = field(default_factory=lambda: {
        "good_lighting": "Great lighting! Your face is clearly visible.",
        "natural_smile": "Your smile looks natural and inviting!",
        "good_eye_contact": "Great eye contact with the camera.",
        "well_centered": "Nice framing - you're well-centered in the photo.",
        "high_quality": "Excellent photo quality!",
        "authentic": "This looks like an authentic, unfiltered photo.",
        "good_background": "Nice, uncluttered background.",
        "outdoor_natural": "Natural outdoor lighting looks great!",
        "professional_look": "Professional-looking photo!",
        "approachable": "You look approachable and friendly!",
    })

    improvement_messages: Dict[str, str] = field(default_factory=lambda: {
        "poor_lighting": "Consider a photo with better lighting.",
        "blurry": "Try a sharper photo - make sure camera is steady.",
        "too_dark": "This photo is a bit dark. Try better lighting.",
        "too_bright": "Photo is overexposed. Try softer lighting.",
        "face_too_small": "Try a closer shot where your face is more visible.",
        "face_too_large": "Consider stepping back for a better composition.",
        "not_centered": "Try centering yourself in the frame.",
        "no_face": "We couldn't detect a face. Try a clearer photo.",
        "multiple_faces": "Group photos work better as secondary photos.",
        "heavy_filter": "Consider a more natural, unfiltered photo.",
        "low_resolution": "Try uploading a higher resolution photo.",
        "busy_background": "A cleaner background would make you stand out more.",
        "no_smile": "Try a photo where you're smiling!",
        "personality": "Try a photo that shows more of your personality.",
    })


@dataclass
class FilterDetectionConfig:
    """Configuration for filter and editing detection."""
    # Detection thresholds
    filter_confidence_threshold: float = 0.3

    # Saturation analysis
    high_saturation_threshold: float = 180.0
    low_saturation_std_threshold: float = 20.0

    # Smoothness analysis
    smoothness_threshold: float = 5.0  # Very smooth = heavy filter

    # Color temperature
    color_cast_threshold: float = 30.0

    # Contrast
    high_contrast_threshold: float = 70.0
    low_contrast_threshold: float = 30.0

    # Vignette detection
    vignette_threshold: float = 30.0

    # Sharpening artifacts
    sharpening_threshold: float = 30.0


@dataclass
class ModelConfig:
    """Main configuration container."""
    environment: Environment = Environment.DEVELOPMENT

    # Sub-configurations
    face_detection: FaceDetectionConfig = field(default_factory=FaceDetectionConfig)
    quality: QualityConfig = field(default_factory=QualityConfig)
    moderation: ModerationConfig = field(default_factory=ModerationConfig)
    style: StyleConfig = field(default_factory=StyleConfig)
    filter_detection: FilterDetectionConfig = field(default_factory=FilterDetectionConfig)

    # Model paths
    model_cache_dir: str = "/app/models/cache"

    # Processing limits
    max_image_size_mb: float = 20.0
    max_image_dimension: int = 4096

    # Timeouts
    analysis_timeout_seconds: float = 30.0
    download_timeout_seconds: float = 10.0

    # Feature flags
    enable_age_estimation: bool = True
    enable_filter_detection: bool = True
    enable_style_feedback: bool = True
    enable_detailed_moderation: bool = True


def get_config(environment: Optional[str] = None) -> ModelConfig:
    """
    Get model configuration for the specified environment.

    Args:
        environment: Optional environment override (development/staging/production)

    Returns:
        ModelConfig instance configured for the environment
    """
    env_str = environment or os.getenv("ENVIRONMENT", "development")

    try:
        env = Environment(env_str.lower())
    except ValueError:
        env = Environment.DEVELOPMENT

    config = ModelConfig(environment=env)

    # Environment-specific adjustments
    if env == Environment.PRODUCTION:
        # Production: stricter settings
        config.moderation.nsfw_threshold = 0.5  # Stricter
        config.moderation.suggestive_threshold = 0.4
        config.quality.weights["sharpness"] = 0.30  # More weight on sharpness
        config.filter_detection.filter_confidence_threshold = 0.25

    elif env == Environment.STAGING:
        # Staging: similar to production but slightly relaxed
        config.moderation.nsfw_threshold = 0.55

    # Development uses default (relaxed) settings

    return config


# Default configuration instance
default_config = get_config()
