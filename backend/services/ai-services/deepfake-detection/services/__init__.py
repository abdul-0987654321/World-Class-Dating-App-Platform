"""
Deepfake Detection Services.

This module provides comprehensive deepfake detection capabilities:
- AWS Rekognition integration for face analysis
- Frequency domain analysis for GAN artifact detection
- Video temporal analysis (blink, lip sync)
- Metadata consistency checking
- Ensemble detection combining all methods
"""

from services.aws_rekognition import (
    AWSRekognitionService,
    RekognitionAnalysisResult,
    FaceQualityMetrics,
    RekognitionQualityLevel,
    rekognition_service,
)

from services.frequency_analyzer import (
    FrequencyAnalyzer,
    FrequencyAnalysisResult,
    frequency_analyzer,
)

from services.video_analyzer import (
    VideoAnalyzer,
    VideoAnalysisResult,
    BlinkAnalysisResult,
    LipSyncResult,
    TemporalConsistencyResult,
    BlinkPattern,
    video_analyzer,
)

from services.metadata_analyzer import (
    MetadataAnalyzer,
    MetadataAnalysisResult,
    MetadataAnomalyType,
    metadata_analyzer,
)

from services.ensemble_detector import (
    EnsembleDeepfakeDetector,
    DeepfakeResult,
    VideoDeepfakeResult,
    MethodResult,
    DetectionMethod,
    EnsembleWeight,
    ensemble_detector,
)

__all__ = [
    # AWS Rekognition
    "AWSRekognitionService",
    "RekognitionAnalysisResult",
    "FaceQualityMetrics",
    "RekognitionQualityLevel",
    "rekognition_service",
    # Frequency Analysis
    "FrequencyAnalyzer",
    "FrequencyAnalysisResult",
    "frequency_analyzer",
    # Video Analysis
    "VideoAnalyzer",
    "VideoAnalysisResult",
    "BlinkAnalysisResult",
    "LipSyncResult",
    "TemporalConsistencyResult",
    "BlinkPattern",
    "video_analyzer",
    # Metadata Analysis
    "MetadataAnalyzer",
    "MetadataAnalysisResult",
    "MetadataAnomalyType",
    "metadata_analyzer",
    # Ensemble Detection
    "EnsembleDeepfakeDetector",
    "DeepfakeResult",
    "VideoDeepfakeResult",
    "MethodResult",
    "DetectionMethod",
    "EnsembleWeight",
    "ensemble_detector",
]
