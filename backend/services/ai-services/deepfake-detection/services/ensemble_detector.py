"""
Ensemble Deepfake Detection Service.

Combines multiple detection methods for robust deepfake detection:
1. ML Model (EfficientNet)
2. AWS Rekognition face analysis
3. Frequency domain analysis
4. Video temporal analysis (blink, lip sync)
5. Metadata consistency
"""

import io
import logging
import os
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum
import asyncio

import numpy as np
from PIL import Image
import cv2
import torch

# Import local modules
from models.efficientnet_detector import EfficientNetDeepfakeDetector
from models.face_extractor import FaceExtractor
from services.aws_rekognition import AWSRekognitionService, RekognitionAnalysisResult
from services.frequency_analyzer import FrequencyAnalyzer, FrequencyAnalysisResult
from services.video_analyzer import VideoAnalyzer, VideoAnalysisResult
from services.metadata_analyzer import MetadataAnalyzer, MetadataAnalysisResult
from utils.video_utils import extract_frames, get_video_info

logger = logging.getLogger(__name__)


class DetectionMethod(str, Enum):
    """Detection methods used in ensemble."""
    ML_MODEL = "ml_model"
    REKOGNITION = "rekognition"
    FREQUENCY = "frequency"
    VIDEO_TEMPORAL = "video_temporal"
    METADATA = "metadata"
    FACE_ARTIFACTS = "face_artifacts"


@dataclass
class EnsembleWeight:
    """Weights for ensemble scoring."""
    ml_model: float = 0.30
    rekognition: float = 0.20
    frequency: float = 0.20
    video_temporal: float = 0.15
    metadata: float = 0.10
    face_artifacts: float = 0.05


@dataclass
class MethodResult:
    """Result from a single detection method."""
    method: DetectionMethod
    score: float = 0.0
    confidence: float = 0.0
    is_deepfake: bool = False
    indicators: List[str] = field(default_factory=list)
    details: Dict[str, Any] = field(default_factory=dict)
    error: Optional[str] = None
    execution_time_ms: float = 0.0


@dataclass
class DeepfakeResult:
    """Final ensemble detection result."""
    is_deepfake: bool = False
    confidence: float = 0.0
    deepfake_score: float = 0.0
    indicators: List[str] = field(default_factory=list)
    face_count: int = 0
    method_results: List[MethodResult] = field(default_factory=list)
    analysis_details: Dict[str, Any] = field(default_factory=dict)
    detection_reasons: List[str] = field(default_factory=list)


@dataclass
class VideoDeepfakeResult(DeepfakeResult):
    """Result for video analysis."""
    frame_count: int = 0
    suspicious_frames: int = 0
    temporal_consistency_score: float = 1.0
    blink_analysis: Dict[str, Any] = field(default_factory=dict)
    lip_sync_analysis: Dict[str, Any] = field(default_factory=dict)


class EnsembleDeepfakeDetector:
    """
    Production-grade ensemble deepfake detector.

    Combines multiple detection methods with configurable weights
    for robust detection across different types of deepfakes:
    - Face swaps (DeepFaceLab, FaceSwap)
    - Face reenactment (Face2Face, NeuralTextures)
    - Full synthesis (StyleGAN, DALL-E)
    - Audio-driven (Wav2Lip)
    """

    def __init__(
        self,
        model_path: Optional[str] = None,
        device: Optional[str] = None,
        detection_threshold: float = 0.5,
        weights: Optional[EnsembleWeight] = None,
        aws_region: str = "us-east-1",
        enable_rekognition: bool = True,
        enable_video_analysis: bool = True,
    ):
        """
        Initialize ensemble detector.

        Args:
            model_path: Path to ML model weights
            device: PyTorch device ('cuda' or 'cpu')
            detection_threshold: Threshold for deepfake classification
            weights: Custom ensemble weights
            aws_region: AWS region for Rekognition
            enable_rekognition: Whether to use AWS Rekognition
            enable_video_analysis: Whether to enable video-specific analysis
        """
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.detection_threshold = detection_threshold
        self.weights = weights or EnsembleWeight()
        self.model_path = model_path

        # Configuration flags
        self.enable_rekognition = enable_rekognition
        self.enable_video_analysis = enable_video_analysis

        # Initialize components (lazy loading)
        self._ml_model: Optional[EfficientNetDeepfakeDetector] = None
        self._face_extractor: Optional[FaceExtractor] = None
        self._rekognition: Optional[AWSRekognitionService] = None
        self._frequency_analyzer: Optional[FrequencyAnalyzer] = None
        self._video_analyzer: Optional[VideoAnalyzer] = None
        self._metadata_analyzer: Optional[MetadataAnalyzer] = None

        self._aws_region = aws_region
        self._initialized = False

    async def initialize(self) -> None:
        """Initialize all detection components."""
        if self._initialized:
            return

        logger.info(f"Initializing EnsembleDeepfakeDetector on device: {self.device}")

        # Initialize face extractor
        self._face_extractor = FaceExtractor(
            min_face_size=80,
            margin=0.3,
            selection_method="largest",
            device=self.device,
        )

        # Initialize ML model
        self._ml_model = EfficientNetDeepfakeDetector(
            model_name="efficientnet_b4",
            pretrained=True,
            dropout_rate=0.3,
        )
        self._ml_model.to_device(torch.device(self.device))

        if self.model_path and os.path.exists(self.model_path):
            self._ml_model.load_weights(self.model_path)
            logger.info(f"Loaded model weights from {self.model_path}")

        self._ml_model.eval()

        # Initialize frequency analyzer
        self._frequency_analyzer = FrequencyAnalyzer()

        # Initialize metadata analyzer
        self._metadata_analyzer = MetadataAnalyzer()

        # Initialize AWS Rekognition (if enabled)
        if self.enable_rekognition:
            self._rekognition = AWSRekognitionService(aws_region=self._aws_region)
            if not self._rekognition.initialize():
                logger.warning("AWS Rekognition initialization failed, continuing without it")
                self._rekognition = None

        # Initialize video analyzer
        if self.enable_video_analysis:
            self._video_analyzer = VideoAnalyzer()

        self._initialized = True
        logger.info("EnsembleDeepfakeDetector initialized successfully")

    async def close(self) -> None:
        """Cleanup resources."""
        logger.info("Closing EnsembleDeepfakeDetector")
        self._ml_model = None
        self._face_extractor = None
        self._rekognition = None
        self._frequency_analyzer = None
        self._video_analyzer = None
        self._metadata_analyzer = None
        self._initialized = False

    async def analyze_image(
        self,
        image_bytes: bytes,
        filename: Optional[str] = None,
    ) -> DeepfakeResult:
        """
        Analyze an image for deepfake indicators using ensemble methods.

        Args:
            image_bytes: Raw image bytes
            filename: Optional filename for metadata analysis

        Returns:
            DeepfakeResult with comprehensive analysis
        """
        if not self._initialized:
            await self.initialize()

        import time
        start_time = time.time()

        try:
            # Load image
            image = Image.open(io.BytesIO(image_bytes))
            if image.mode != "RGB":
                image = image.convert("RGB")

            method_results: List[MethodResult] = []
            all_indicators: List[str] = []
            detection_reasons: List[str] = []

            # Run all detection methods in parallel
            tasks = [
                self._run_ml_analysis(image),
                self._run_frequency_analysis(image),
                self._run_metadata_analysis(image_bytes, filename),
                self._run_face_artifact_analysis(image),
            ]

            # Add Rekognition if available
            if self._rekognition:
                tasks.append(self._run_rekognition_analysis(image_bytes))

            # Execute all tasks concurrently
            results = await asyncio.gather(*tasks, return_exceptions=True)

            # Process results
            for result in results:
                if isinstance(result, Exception):
                    logger.error(f"Detection method failed: {result}")
                    continue
                if isinstance(result, MethodResult):
                    method_results.append(result)
                    all_indicators.extend(result.indicators)

            # Calculate ensemble score
            ensemble_score, method_contributions = self._calculate_ensemble_score(method_results)

            # Determine if deepfake
            is_deepfake = ensemble_score >= self.detection_threshold

            # Generate detection reasons
            if is_deepfake:
                detection_reasons = self._generate_detection_reasons(method_results, ensemble_score)

            # Calculate confidence
            confidence = self._calculate_ensemble_confidence(method_results, ensemble_score)

            # Get face count
            face_count = 0
            for result in method_results:
                if result.details.get("face_count"):
                    face_count = result.details["face_count"]
                    break

            # Compile analysis details
            analysis_details = {
                "ensemble_score": round(ensemble_score, 4),
                "method_contributions": method_contributions,
                "total_indicators": len(all_indicators),
                "processing_time_ms": round((time.time() - start_time) * 1000, 2),
                "methods_used": [r.method.value for r in method_results],
            }

            return DeepfakeResult(
                is_deepfake=is_deepfake,
                confidence=round(confidence, 4),
                deepfake_score=round(ensemble_score, 4),
                indicators=list(set(all_indicators)),
                face_count=face_count,
                method_results=method_results,
                analysis_details=analysis_details,
                detection_reasons=detection_reasons,
            )

        except Exception as e:
            logger.error(f"Error analyzing image: {e}", exc_info=True)
            return DeepfakeResult(
                is_deepfake=False,
                confidence=0.0,
                deepfake_score=0.0,
                indicators=["analysis_error"],
                analysis_details={"error": str(e)},
            )

    async def analyze_video(
        self,
        video_bytes: bytes,
        max_frames: int = 300,
        sample_fps: float = 2.0,
    ) -> VideoDeepfakeResult:
        """
        Analyze a video for deepfake indicators.

        Args:
            video_bytes: Raw video bytes
            max_frames: Maximum frames to analyze
            sample_fps: Frames per second to sample

        Returns:
            VideoDeepfakeResult with comprehensive analysis
        """
        if not self._initialized:
            await self.initialize()

        import time
        start_time = time.time()

        try:
            # Get video info
            video_info = get_video_info(video_bytes)
            if not video_info:
                return VideoDeepfakeResult(
                    indicators=["invalid_video_format"],
                    analysis_details={"error": "Could not read video"},
                )

            # Extract frames
            frames = extract_frames(video_bytes, max_frames=max_frames, fps_sample=sample_fps)
            if not frames:
                return VideoDeepfakeResult(
                    indicators=["no_frames_extracted"],
                    analysis_details={"error": "Could not extract frames"},
                )

            method_results: List[MethodResult] = []
            all_indicators: List[str] = []
            detection_reasons: List[str] = []

            # 1. Sample frame analysis (use multiple frames)
            sample_indices = np.linspace(0, len(frames) - 1, min(10, len(frames)), dtype=int)
            frame_results = []

            for idx in sample_indices:
                frame = frames[idx]
                # Convert to PIL Image
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                pil_image = Image.fromarray(rgb_frame)

                # Quick ML analysis
                ml_result = await self._run_ml_analysis(pil_image)
                frame_results.append(ml_result)

            # Aggregate frame results
            avg_ml_score = np.mean([r.score for r in frame_results])
            ml_indicators = []
            for r in frame_results:
                ml_indicators.extend(r.indicators)

            method_results.append(MethodResult(
                method=DetectionMethod.ML_MODEL,
                score=avg_ml_score,
                confidence=np.mean([r.confidence for r in frame_results]),
                is_deepfake=avg_ml_score > self.detection_threshold,
                indicators=list(set(ml_indicators)),
                details={"frames_analyzed": len(frame_results)},
            ))

            # 2. Video temporal analysis
            if self._video_analyzer:
                video_result = await self._video_analyzer.analyze_video(frames)

                method_results.append(MethodResult(
                    method=DetectionMethod.VIDEO_TEMPORAL,
                    score=video_result.deepfake_score,
                    confidence=video_result.confidence,
                    is_deepfake=video_result.is_deepfake,
                    indicators=video_result.indicators,
                    details={
                        "blink_analysis": {
                            "blink_count": video_result.blink_analysis.blink_count,
                            "blink_rate": video_result.blink_analysis.blink_rate_per_minute,
                            "pattern": video_result.blink_analysis.blink_pattern.value,
                            "is_anomalous": video_result.blink_analysis.is_anomalous,
                        },
                        "lip_sync": {
                            "sync_score": video_result.lip_sync_analysis.sync_score,
                            "is_synchronized": video_result.lip_sync_analysis.is_synchronized,
                        },
                        "temporal_consistency": video_result.temporal_analysis.consistency_score,
                    },
                ))

                all_indicators.extend(video_result.indicators)

            # 3. Frequency analysis on key frames
            freq_scores = []
            for idx in sample_indices[:5]:  # Analyze fewer frames for speed
                frame = frames[idx]
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                pil_image = Image.fromarray(rgb_frame)

                freq_result = await self._frequency_analyzer.analyze(pil_image)
                freq_scores.append(freq_result.confidence if freq_result.is_synthetic else 0)

            avg_freq_score = np.mean(freq_scores) if freq_scores else 0

            method_results.append(MethodResult(
                method=DetectionMethod.FREQUENCY,
                score=avg_freq_score,
                confidence=0.7 if freq_scores else 0.0,
                is_deepfake=avg_freq_score > 0.5,
                indicators=[],
                details={"frames_analyzed": len(freq_scores)},
            ))

            # Calculate ensemble score
            ensemble_score, method_contributions = self._calculate_ensemble_score(method_results)

            is_deepfake = ensemble_score >= self.detection_threshold

            if is_deepfake:
                detection_reasons = self._generate_detection_reasons(method_results, ensemble_score)

            confidence = self._calculate_ensemble_confidence(method_results, ensemble_score)

            # Get blink and lip sync details
            blink_analysis = {}
            lip_sync_analysis = {}
            temporal_consistency = 1.0
            suspicious_frames = 0

            for result in method_results:
                if result.method == DetectionMethod.VIDEO_TEMPORAL:
                    blink_analysis = result.details.get("blink_analysis", {})
                    lip_sync_analysis = result.details.get("lip_sync", {})
                    temporal_consistency = result.details.get("temporal_consistency", 1.0)
                    suspicious_frames = result.details.get("suspicious_frames", 0)

            analysis_details = {
                "ensemble_score": round(ensemble_score, 4),
                "method_contributions": method_contributions,
                "video_info": video_info,
                "processing_time_ms": round((time.time() - start_time) * 1000, 2),
            }

            return VideoDeepfakeResult(
                is_deepfake=is_deepfake,
                confidence=round(confidence, 4),
                deepfake_score=round(ensemble_score, 4),
                indicators=list(set(all_indicators)),
                face_count=1,  # Assume single face for video
                method_results=method_results,
                analysis_details=analysis_details,
                detection_reasons=detection_reasons,
                frame_count=len(frames),
                suspicious_frames=suspicious_frames,
                temporal_consistency_score=temporal_consistency,
                blink_analysis=blink_analysis,
                lip_sync_analysis=lip_sync_analysis,
            )

        except Exception as e:
            logger.error(f"Error analyzing video: {e}", exc_info=True)
            return VideoDeepfakeResult(
                indicators=["analysis_error"],
                analysis_details={"error": str(e)},
            )

    def get_confidence_score(self, result: DeepfakeResult) -> float:
        """Get confidence score from a result."""
        return result.confidence

    def get_detection_reasons(self, result: DeepfakeResult) -> List[str]:
        """Get detection reasons from a result."""
        return result.detection_reasons

    async def _run_ml_analysis(self, image: Image.Image) -> MethodResult:
        """Run ML model analysis."""
        import time
        start = time.time()

        try:
            if self._ml_model is None or self._face_extractor is None:
                return MethodResult(
                    method=DetectionMethod.ML_MODEL,
                    error="ML model not initialized",
                )

            # Extract face
            faces = self._face_extractor.extract_faces(image)

            if not faces:
                # Analyze full image if no face detected
                input_tensor = self._ml_model.preprocess_image(image)
                with torch.no_grad():
                    logits, attention = self._ml_model(input_tensor)
                    probs = torch.nn.functional.softmax(logits, dim=1)
                    fake_prob = probs[0, 1].item()

                return MethodResult(
                    method=DetectionMethod.ML_MODEL,
                    score=fake_prob,
                    confidence=0.5,  # Lower confidence without face
                    is_deepfake=fake_prob > self.detection_threshold,
                    details={"face_count": 0, "analysis_type": "full_image"},
                    execution_time_ms=(time.time() - start) * 1000,
                )

            # Analyze primary face
            primary_face = self._face_extractor.select_face(faces, (image.width, image.height))

            if primary_face and primary_face.face_image:
                input_tensor = self._ml_model.preprocess_image(primary_face.face_image)

                with torch.no_grad():
                    logits, attention = self._ml_model(input_tensor)
                    probs = torch.nn.functional.softmax(logits, dim=1)
                    fake_prob = probs[0, 1].item()

                return MethodResult(
                    method=DetectionMethod.ML_MODEL,
                    score=fake_prob,
                    confidence=0.85,
                    is_deepfake=fake_prob > self.detection_threshold,
                    details={
                        "face_count": len(faces),
                        "analysis_type": "face",
                        "face_confidence": primary_face.confidence,
                    },
                    execution_time_ms=(time.time() - start) * 1000,
                )

            return MethodResult(
                method=DetectionMethod.ML_MODEL,
                score=0.0,
                confidence=0.0,
                error="Could not extract face",
            )

        except Exception as e:
            logger.error(f"ML analysis error: {e}")
            return MethodResult(
                method=DetectionMethod.ML_MODEL,
                error=str(e),
            )

    async def _run_rekognition_analysis(self, image_bytes: bytes) -> MethodResult:
        """Run AWS Rekognition analysis."""
        import time
        start = time.time()

        try:
            if self._rekognition is None:
                return MethodResult(
                    method=DetectionMethod.REKOGNITION,
                    error="Rekognition not available",
                )

            result = await self._rekognition.analyze_face(image_bytes)

            if result.error:
                return MethodResult(
                    method=DetectionMethod.REKOGNITION,
                    error=result.error,
                )

            # Convert Rekognition indicators to score
            indicator_score = len(result.deepfake_indicators) * 0.15
            score = min(indicator_score + (1 - result.confidence_score) * 0.3, 1.0)

            return MethodResult(
                method=DetectionMethod.REKOGNITION,
                score=score,
                confidence=result.confidence_score,
                is_deepfake=score > self.detection_threshold,
                indicators=result.deepfake_indicators,
                details={
                    "face_detected": result.face_detected,
                    "face_count": result.face_count,
                    "quality_metrics": {
                        "brightness": result.primary_face.brightness if result.primary_face else 0,
                        "sharpness": result.primary_face.sharpness if result.primary_face else 0,
                    } if result.primary_face else {},
                },
                execution_time_ms=(time.time() - start) * 1000,
            )

        except Exception as e:
            logger.error(f"Rekognition analysis error: {e}")
            return MethodResult(
                method=DetectionMethod.REKOGNITION,
                error=str(e),
            )

    async def _run_frequency_analysis(self, image: Image.Image) -> MethodResult:
        """Run frequency domain analysis."""
        import time
        start = time.time()

        try:
            if self._frequency_analyzer is None:
                return MethodResult(
                    method=DetectionMethod.FREQUENCY,
                    error="Frequency analyzer not initialized",
                )

            result = await self._frequency_analyzer.analyze(image)

            # Convert to score
            score = (
                0.3 * result.gan_fingerprint_score +
                0.3 * result.spectral_anomaly_score +
                0.2 * result.periodic_artifact_score +
                0.2 * result.confidence
            )

            return MethodResult(
                method=DetectionMethod.FREQUENCY,
                score=score,
                confidence=result.confidence,
                is_deepfake=result.is_synthetic,
                indicators=result.indicators,
                details=result.details,
                execution_time_ms=(time.time() - start) * 1000,
            )

        except Exception as e:
            logger.error(f"Frequency analysis error: {e}")
            return MethodResult(
                method=DetectionMethod.FREQUENCY,
                error=str(e),
            )

    async def _run_metadata_analysis(
        self,
        image_bytes: bytes,
        filename: Optional[str]
    ) -> MethodResult:
        """Run metadata analysis."""
        import time
        start = time.time()

        try:
            if self._metadata_analyzer is None:
                return MethodResult(
                    method=DetectionMethod.METADATA,
                    error="Metadata analyzer not initialized",
                )

            result = await self._metadata_analyzer.analyze(image_bytes, filename)

            return MethodResult(
                method=DetectionMethod.METADATA,
                score=result.anomaly_score,
                confidence=result.confidence,
                is_deepfake=result.anomaly_score > 0.6,
                indicators=result.indicators,
                details={
                    "has_metadata": result.has_metadata,
                    "anomalies": [a.value for a in result.anomalies],
                },
                execution_time_ms=(time.time() - start) * 1000,
            )

        except Exception as e:
            logger.error(f"Metadata analysis error: {e}")
            return MethodResult(
                method=DetectionMethod.METADATA,
                error=str(e),
            )

    async def _run_face_artifact_analysis(self, image: Image.Image) -> MethodResult:
        """Run face artifact analysis."""
        import time
        start = time.time()

        try:
            if self._face_extractor is None:
                return MethodResult(
                    method=DetectionMethod.FACE_ARTIFACTS,
                    error="Face extractor not initialized",
                )

            # Extract faces
            faces = self._face_extractor.extract_faces(image)

            if not faces:
                return MethodResult(
                    method=DetectionMethod.FACE_ARTIFACTS,
                    score=0.0,
                    confidence=0.3,
                    details={"face_count": 0},
                    execution_time_ms=(time.time() - start) * 1000,
                )

            indicators = []
            artifact_score = 0.0

            primary_face = self._face_extractor.select_face(faces, (image.width, image.height))

            if primary_face and primary_face.face_image:
                face_array = np.array(primary_face.face_image)
                full_array = np.array(image)

                # Check for boundary artifacts
                boundary_score = self._check_boundary_artifacts(primary_face.bbox, full_array)
                if boundary_score > 0.5:
                    indicators.append("face_boundary_artifacts")
                    artifact_score += boundary_score * 0.3

                # Check symmetry
                gray_face = cv2.cvtColor(face_array, cv2.COLOR_RGB2GRAY)
                symmetry_score = self._check_symmetry(gray_face)
                if symmetry_score > 0.95:
                    indicators.append("unnatural_symmetry")
                    artifact_score += 0.3

                # Check texture
                texture_score = self._check_texture(gray_face)
                if texture_score < 100:
                    indicators.append("skin_texture_anomaly")
                    artifact_score += 0.2

            return MethodResult(
                method=DetectionMethod.FACE_ARTIFACTS,
                score=min(artifact_score, 1.0),
                confidence=0.7 if faces else 0.3,
                is_deepfake=artifact_score > 0.5,
                indicators=indicators,
                details={"face_count": len(faces)},
                execution_time_ms=(time.time() - start) * 1000,
            )

        except Exception as e:
            logger.error(f"Face artifact analysis error: {e}")
            return MethodResult(
                method=DetectionMethod.FACE_ARTIFACTS,
                error=str(e),
            )

    def _check_boundary_artifacts(
        self,
        bbox: Tuple[int, int, int, int],
        image: np.ndarray
    ) -> float:
        """Check for artifacts at face boundaries."""
        x1, y1, x2, y2 = bbox
        h, w = image.shape[:2]
        boundary_width = 10

        try:
            # Get boundary regions
            if (y1 - boundary_width >= 0 and y2 + boundary_width < h and
                x1 - boundary_width >= 0 and x2 + boundary_width < w):

                inner = image[y1:y2, x1:x2]
                outer_top = image[max(0, y1-boundary_width):y1, x1:x2]
                outer_bottom = image[y2:min(h, y2+boundary_width), x1:x2]

                if outer_top.size > 0 and outer_bottom.size > 0:
                    inner_mean = np.mean(inner, axis=(0, 1))
                    top_mean = np.mean(outer_top, axis=(0, 1))
                    bottom_mean = np.mean(outer_bottom, axis=(0, 1))

                    top_diff = np.linalg.norm(inner_mean - top_mean)
                    bottom_diff = np.linalg.norm(inner_mean - bottom_mean)

                    max_diff = max(top_diff, bottom_diff)
                    return min(max_diff / 100, 1.0)

        except Exception:
            pass

        return 0.0

    def _check_symmetry(self, gray_face: np.ndarray) -> float:
        """Check facial symmetry."""
        h, w = gray_face.shape
        left_half = gray_face[:, :w//2]
        right_half = cv2.flip(gray_face[:, w//2:], 1)

        min_w = min(left_half.shape[1], right_half.shape[1])
        left_half = left_half[:, :min_w]
        right_half = right_half[:, :min_w]

        diff = np.abs(left_half.astype(float) - right_half.astype(float))
        symmetry = 1 - (np.mean(diff) / 255.0)

        return symmetry

    def _check_texture(self, gray_face: np.ndarray) -> float:
        """Check skin texture variance."""
        laplacian = cv2.Laplacian(gray_face, cv2.CV_64F)
        return laplacian.var()

    def _calculate_ensemble_score(
        self,
        method_results: List[MethodResult]
    ) -> Tuple[float, Dict[str, float]]:
        """
        Calculate weighted ensemble score.

        Args:
            method_results: Results from all methods

        Returns:
            Tuple of (ensemble_score, method_contributions)
        """
        method_weights = {
            DetectionMethod.ML_MODEL: self.weights.ml_model,
            DetectionMethod.REKOGNITION: self.weights.rekognition,
            DetectionMethod.FREQUENCY: self.weights.frequency,
            DetectionMethod.VIDEO_TEMPORAL: self.weights.video_temporal,
            DetectionMethod.METADATA: self.weights.metadata,
            DetectionMethod.FACE_ARTIFACTS: self.weights.face_artifacts,
        }

        total_weight = 0.0
        weighted_sum = 0.0
        contributions = {}

        for result in method_results:
            if result.error:
                continue

            weight = method_weights.get(result.method, 0.1)

            # Adjust weight by confidence
            adjusted_weight = weight * result.confidence
            total_weight += adjusted_weight

            contribution = result.score * adjusted_weight
            weighted_sum += contribution
            contributions[result.method.value] = round(contribution, 4)

        if total_weight > 0:
            ensemble_score = weighted_sum / total_weight
        else:
            ensemble_score = 0.0

        return ensemble_score, contributions

    def _calculate_ensemble_confidence(
        self,
        method_results: List[MethodResult],
        ensemble_score: float
    ) -> float:
        """Calculate confidence in ensemble result."""
        # Average method confidence
        valid_results = [r for r in method_results if not r.error]
        if not valid_results:
            return 0.0

        avg_confidence = np.mean([r.confidence for r in valid_results])

        # Agreement between methods increases confidence
        deepfake_votes = sum(1 for r in valid_results if r.is_deepfake)
        total_votes = len(valid_results)
        agreement = max(deepfake_votes, total_votes - deepfake_votes) / total_votes

        # Distance from threshold
        distance_from_threshold = abs(ensemble_score - self.detection_threshold)
        threshold_confidence = min(distance_from_threshold * 2, 0.3)

        confidence = (
            0.4 * avg_confidence +
            0.3 * agreement +
            0.3 * (0.5 + threshold_confidence)
        )

        return min(max(confidence, 0.0), 1.0)

    def _generate_detection_reasons(
        self,
        method_results: List[MethodResult],
        ensemble_score: float
    ) -> List[str]:
        """Generate human-readable detection reasons."""
        reasons = []

        # Sort by score contribution
        sorted_results = sorted(
            [r for r in method_results if not r.error and r.is_deepfake],
            key=lambda r: r.score,
            reverse=True
        )

        for result in sorted_results[:3]:  # Top 3 contributing methods
            if result.method == DetectionMethod.ML_MODEL:
                reasons.append(f"ML model detected deepfake patterns (score: {result.score:.2f})")
            elif result.method == DetectionMethod.REKOGNITION:
                reasons.append(f"Face analysis detected anomalies: {', '.join(result.indicators[:3])}")
            elif result.method == DetectionMethod.FREQUENCY:
                reasons.append(f"Frequency analysis detected GAN artifacts")
            elif result.method == DetectionMethod.VIDEO_TEMPORAL:
                reasons.append(f"Video analysis detected temporal inconsistencies")
            elif result.method == DetectionMethod.METADATA:
                reasons.append(f"Metadata analysis detected manipulation indicators")
            elif result.method == DetectionMethod.FACE_ARTIFACTS:
                reasons.append(f"Face boundary artifacts detected")

        if ensemble_score > 0.8:
            reasons.insert(0, "High confidence deepfake detection")

        return reasons


# Create singleton instance
ensemble_detector = EnsembleDeepfakeDetector()
