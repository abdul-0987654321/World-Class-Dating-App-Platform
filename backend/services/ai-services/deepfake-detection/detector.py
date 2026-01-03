"""
ML-based Deepfake Detection Service.

Implements comprehensive deepfake detection using:
- EfficientNet-B4 for face forgery classification
- Frequency domain analysis for GAN fingerprints
- Facial consistency checks
- Temporal analysis for video
"""

import io
import logging
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum

import numpy as np
from PIL import Image
import cv2
import torch
import torch.nn.functional as F
from scipy import fftpack

from models.efficientnet_detector import EfficientNetDeepfakeDetector
from models.face_extractor import FaceExtractor, FaceRegion

logger = logging.getLogger(__name__)


class DeepfakeIndicator(str, Enum):
    """Indicators of potential deepfake."""
    FACE_BOUNDARY_ARTIFACTS = "face_boundary_artifacts"
    EYE_BLINKING_ANOMALY = "eye_blinking_anomaly"
    SKIN_TEXTURE_ANOMALY = "skin_texture_anomaly"
    LIGHTING_INCONSISTENCY = "lighting_inconsistency"
    RESOLUTION_MISMATCH = "resolution_mismatch"
    GAN_FINGERPRINT = "gan_fingerprint"
    TEMPORAL_INCONSISTENCY = "temporal_inconsistency"
    UNNATURAL_SYMMETRY = "unnatural_symmetry"
    COMPRESSION_ARTIFACTS = "compression_artifacts"
    FREQUENCY_ANOMALY = "frequency_anomaly"
    MISSING_METADATA = "missing_metadata"
    COMMON_GAN_RESOLUTION = "common_gan_resolution"


@dataclass
class DetectionResult:
    """Result from deepfake detection."""
    is_deepfake: bool
    confidence: float
    deepfake_score: float
    indicators: List[str] = field(default_factory=list)
    face_count: int = 0
    analysis_details: Dict[str, Any] = field(default_factory=dict)


@dataclass
class VideoAnalysisResult:
    """Result from video deepfake detection."""
    is_deepfake: bool
    confidence: float
    deepfake_score: float
    frame_count: int
    suspicious_frames: int
    indicators: List[str] = field(default_factory=list)
    temporal_consistency_score: float = 1.0
    blink_analysis: Dict[str, Any] = field(default_factory=dict)


class DeepfakeDetector:
    """
    ML-based deepfake detector for FLAMORAL dating platform.

    Combines multiple detection techniques:
    1. Deep learning classification (EfficientNet)
    2. Frequency domain analysis
    3. Face artifact detection
    4. Temporal consistency (for video)
    """

    def __init__(
        self,
        model_path: Optional[str] = None,
        device: Optional[str] = None,
        detection_threshold: float = 0.5,
    ):
        """
        Initialize deepfake detector.

        Args:
            model_path: Path to pre-trained model weights
            device: Device to use ('cuda' or 'cpu')
            detection_threshold: Threshold for deepfake classification
        """
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.detection_threshold = detection_threshold
        self.model_path = model_path

        # Initialize components
        self.model: Optional[EfficientNetDeepfakeDetector] = None
        self.face_extractor: Optional[FaceExtractor] = None
        self._initialized = False

    async def initialize(self) -> None:
        """Initialize the detector with models."""
        if self._initialized:
            return

        logger.info(f"Initializing DeepfakeDetector on device: {self.device}")

        # Initialize face extractor
        self.face_extractor = FaceExtractor(
            min_face_size=80,
            margin=0.3,
            selection_method="largest",
            device=self.device,
        )

        # Initialize EfficientNet model
        self.model = EfficientNetDeepfakeDetector(
            model_name="efficientnet_b4",
            pretrained=True,
            dropout_rate=0.3,
        )
        self.model.to_device(torch.device(self.device))

        # Load weights if available
        if self.model_path:
            self.model.load_weights(self.model_path)

        self.model.eval()
        self._initialized = True
        logger.info("DeepfakeDetector initialized successfully")

    async def close(self) -> None:
        """Cleanup resources."""
        logger.info("Closing DeepfakeDetector")
        self.model = None
        self.face_extractor = None
        self._initialized = False

    async def analyze_image(self, image_bytes: bytes) -> DetectionResult:
        """
        Analyze an image for deepfake indicators.

        Args:
            image_bytes: Raw image bytes

        Returns:
            DetectionResult with analysis results
        """
        if not self._initialized:
            await self.initialize()

        try:
            # Load image
            image = Image.open(io.BytesIO(image_bytes))
            if image.mode != "RGB":
                image = image.convert("RGB")

            indicators = []
            analysis_details = {}

            # 1. Extract faces
            faces = self.face_extractor.extract_faces(image)
            face_count = len(faces)
            analysis_details["face_count"] = face_count

            if face_count == 0:
                # No face detected - run full image analysis
                ml_score, ml_indicators = await self._analyze_full_image(image)
                indicators.extend(ml_indicators)
                analysis_details["ml_analysis"] = {"type": "full_image", "score": ml_score}
            else:
                # Analyze primary face
                primary_face = self.face_extractor.select_face(faces, (image.width, image.height))
                if primary_face and primary_face.face_image:
                    # ML model prediction
                    ml_score, ml_indicators = await self._analyze_face(primary_face)
                    indicators.extend(ml_indicators)
                    analysis_details["ml_analysis"] = {"type": "face", "score": ml_score}

                    # Face quality and artifact analysis
                    artifact_indicators = await self._check_face_artifacts(primary_face, image)
                    indicators.extend(artifact_indicators)
                else:
                    ml_score = 0.0

            # 2. Frequency domain analysis
            freq_score, freq_indicators = await self._frequency_analysis(image)
            indicators.extend(freq_indicators)
            analysis_details["frequency_analysis"] = {"score": freq_score}

            # 3. Metadata analysis
            meta_indicators = await self._analyze_metadata(image)
            indicators.extend(meta_indicators)

            # 4. Resolution pattern check
            resolution_indicators = await self._check_resolution_patterns(image)
            indicators.extend(resolution_indicators)

            # 5. Texture analysis
            texture_score, texture_indicators = await self._analyze_texture(image)
            indicators.extend(texture_indicators)
            analysis_details["texture_analysis"] = {"score": texture_score}

            # 6. Lighting consistency
            lighting_score, lighting_indicators = await self._analyze_lighting(image)
            indicators.extend(lighting_indicators)
            analysis_details["lighting_analysis"] = {"score": lighting_score}

            # Calculate final score
            deepfake_score = self._calculate_combined_score(
                ml_score=analysis_details.get("ml_analysis", {}).get("score", 0.0),
                freq_score=freq_score,
                texture_score=texture_score,
                lighting_score=lighting_score,
                num_indicators=len(indicators),
            )

            # Determine if deepfake
            is_deepfake = deepfake_score >= self.detection_threshold

            # Calculate confidence
            confidence = self._calculate_confidence(
                deepfake_score=deepfake_score,
                num_indicators=len(indicators),
                face_count=face_count,
            )

            return DetectionResult(
                is_deepfake=is_deepfake,
                confidence=round(confidence, 4),
                deepfake_score=round(deepfake_score, 4),
                indicators=list(set(indicators)),
                face_count=face_count,
                analysis_details=analysis_details,
            )

        except Exception as e:
            logger.error(f"Error analyzing image: {e}", exc_info=True)
            # Return safe default on error
            return DetectionResult(
                is_deepfake=False,
                confidence=0.0,
                deepfake_score=0.0,
                indicators=["analysis_error"],
                face_count=0,
                analysis_details={"error": str(e)},
            )

    async def analyze_video_frame(self, frame: np.ndarray) -> DetectionResult:
        """
        Analyze a single video frame.

        Args:
            frame: Video frame as numpy array (BGR format from OpenCV)

        Returns:
            DetectionResult
        """
        # Convert BGR to RGB PIL Image
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        image = Image.fromarray(rgb_frame)

        # Convert to bytes and use image analysis
        buffer = io.BytesIO()
        image.save(buffer, format="JPEG", quality=95)
        return await self.analyze_image(buffer.getvalue())

    async def check_facial_consistency(self, frames: List[np.ndarray]) -> VideoAnalysisResult:
        """
        Check temporal consistency across video frames.

        Args:
            frames: List of video frames (BGR numpy arrays)

        Returns:
            VideoAnalysisResult with temporal analysis
        """
        if not self._initialized:
            await self.initialize()

        if len(frames) < 2:
            return VideoAnalysisResult(
                is_deepfake=False,
                confidence=0.0,
                deepfake_score=0.0,
                frame_count=len(frames),
                suspicious_frames=0,
            )

        indicators = []
        frame_results = []
        suspicious_count = 0

        # Analyze individual frames
        for i, frame in enumerate(frames):
            result = await self.analyze_video_frame(frame)
            frame_results.append(result)
            if result.is_deepfake:
                suspicious_count += 1

        # Temporal consistency analysis
        temporal_score, temporal_indicators = await self._analyze_temporal_consistency(frames)
        indicators.extend(temporal_indicators)

        # Eye blinking analysis
        blink_analysis = await self._analyze_blinking(frames)
        if blink_analysis.get("is_anomalous", False):
            indicators.append(DeepfakeIndicator.EYE_BLINKING_ANOMALY.value)

        # Calculate aggregate scores
        avg_deepfake_score = np.mean([r.deepfake_score for r in frame_results])
        max_deepfake_score = np.max([r.deepfake_score for r in frame_results])

        # Combine temporal and frame-level scores
        combined_score = (
            0.4 * avg_deepfake_score +
            0.3 * max_deepfake_score +
            0.2 * (1 - temporal_score) +
            0.1 * (len(indicators) / 10)
        )

        is_deepfake = combined_score >= self.detection_threshold or (
            suspicious_count / len(frames) > 0.3
        )

        confidence = self._calculate_confidence(
            combined_score,
            len(indicators),
            face_count=1,
        )

        return VideoAnalysisResult(
            is_deepfake=is_deepfake,
            confidence=round(confidence, 4),
            deepfake_score=round(combined_score, 4),
            frame_count=len(frames),
            suspicious_frames=suspicious_count,
            indicators=list(set(indicators)),
            temporal_consistency_score=round(temporal_score, 4),
            blink_analysis=blink_analysis,
        )

    async def _analyze_face(self, face: FaceRegion) -> Tuple[float, List[str]]:
        """Analyze face using ML model."""
        indicators = []

        if face.face_image is None or self.model is None:
            return 0.0, indicators

        try:
            # Preprocess face image
            input_tensor = self.model.preprocess_image(face.face_image)

            # Run inference
            with torch.no_grad():
                logits, attention = self.model(input_tensor)
                probs = F.softmax(logits, dim=1)

            # Class 1 is 'fake'
            fake_prob = probs[0, 1].item()

            return fake_prob, indicators

        except Exception as e:
            logger.error(f"Error in face ML analysis: {e}")
            return 0.0, indicators

    async def _analyze_full_image(self, image: Image.Image) -> Tuple[float, List[str]]:
        """Analyze full image when no face detected."""
        indicators = []

        if self.model is None:
            return 0.0, indicators

        try:
            input_tensor = self.model.preprocess_image(image)

            with torch.no_grad():
                logits, _ = self.model(input_tensor)
                probs = F.softmax(logits, dim=1)

            fake_prob = probs[0, 1].item()
            return fake_prob, indicators

        except Exception as e:
            logger.error(f"Error in full image analysis: {e}")
            return 0.0, indicators

    async def _check_face_artifacts(self, face: FaceRegion, full_image: Image.Image) -> List[str]:
        """Check for face boundary and blending artifacts."""
        indicators = []

        if face.face_image is None:
            return indicators

        try:
            # Convert to numpy for analysis
            face_array = np.array(face.face_image)
            full_array = np.array(full_image)

            # Check face boundary
            x1, y1, x2, y2 = face.bbox
            boundary_width = 10

            # Extract boundary region
            if (y1 - boundary_width >= 0 and y2 + boundary_width < full_array.shape[0] and
                x1 - boundary_width >= 0 and x2 + boundary_width < full_array.shape[1]):

                # Check for color discontinuity at boundaries
                inner_region = full_array[y1:y2, x1:x2]
                outer_top = full_array[max(0, y1-boundary_width):y1, x1:x2]
                outer_bottom = full_array[y2:min(full_array.shape[0], y2+boundary_width), x1:x2]

                if outer_top.size > 0 and outer_bottom.size > 0:
                    inner_mean = np.mean(inner_region, axis=(0, 1))
                    outer_top_mean = np.mean(outer_top, axis=(0, 1))
                    outer_bottom_mean = np.mean(outer_bottom, axis=(0, 1))

                    # Large color difference at boundary suggests manipulation
                    top_diff = np.linalg.norm(inner_mean - outer_top_mean)
                    bottom_diff = np.linalg.norm(inner_mean - outer_bottom_mean)

                    if top_diff > 50 or bottom_diff > 50:
                        indicators.append(DeepfakeIndicator.FACE_BOUNDARY_ARTIFACTS.value)

            # Check for unnatural symmetry
            gray_face = cv2.cvtColor(face_array, cv2.COLOR_RGB2GRAY)
            h, w = gray_face.shape
            left_half = gray_face[:, :w//2]
            right_half = cv2.flip(gray_face[:, w//2:], 1)

            # Resize to same shape if needed
            min_w = min(left_half.shape[1], right_half.shape[1])
            left_half = left_half[:, :min_w]
            right_half = right_half[:, :min_w]

            # Calculate structural similarity
            diff = np.abs(left_half.astype(float) - right_half.astype(float))
            symmetry_score = 1 - (np.mean(diff) / 255.0)

            if symmetry_score > 0.95:  # Unnaturally symmetric
                indicators.append(DeepfakeIndicator.UNNATURAL_SYMMETRY.value)

            # Check skin texture
            laplacian = cv2.Laplacian(gray_face, cv2.CV_64F)
            texture_variance = laplacian.var()

            if texture_variance < 100:  # Overly smooth
                indicators.append(DeepfakeIndicator.SKIN_TEXTURE_ANOMALY.value)

        except Exception as e:
            logger.error(f"Error checking face artifacts: {e}")

        return indicators

    async def _frequency_analysis(self, image: Image.Image) -> Tuple[float, List[str]]:
        """
        Analyze image in frequency domain for GAN fingerprints.

        GAN-generated images often show specific patterns in frequency space.
        """
        indicators = []

        try:
            # Convert to grayscale
            gray = np.array(image.convert("L"))

            # Apply FFT
            fft = fftpack.fft2(gray)
            fft_shifted = fftpack.fftshift(fft)
            magnitude = np.abs(fft_shifted)

            # Log transform for better visualization
            magnitude_log = np.log1p(magnitude)

            # Analyze frequency distribution
            h, w = magnitude_log.shape
            center = (h // 2, w // 2)

            # Check for unusual periodic patterns (GAN artifacts)
            # Sample radial profile
            max_radius = min(h, w) // 2
            radial_profile = []

            for r in range(1, max_radius):
                # Sample points on circle
                angles = np.linspace(0, 2 * np.pi, 36)
                values = []
                for angle in angles:
                    x = int(center[1] + r * np.cos(angle))
                    y = int(center[0] + r * np.sin(angle))
                    if 0 <= x < w and 0 <= y < h:
                        values.append(magnitude_log[y, x])
                if values:
                    radial_profile.append(np.mean(values))

            radial_profile = np.array(radial_profile)

            # Check for unusual spikes (GAN fingerprint)
            if len(radial_profile) > 10:
                # Smooth profile
                smooth = np.convolve(radial_profile, np.ones(5)/5, mode='valid')
                # Calculate derivative
                diff = np.diff(smooth)
                # Check for spikes
                spike_threshold = np.std(diff) * 3
                spikes = np.sum(np.abs(diff) > spike_threshold)

                if spikes > 3:
                    indicators.append(DeepfakeIndicator.GAN_FINGERPRINT.value)

                # High frequency energy ratio
                mid_point = len(radial_profile) // 2
                low_freq_energy = np.sum(radial_profile[:mid_point])
                high_freq_energy = np.sum(radial_profile[mid_point:])

                if low_freq_energy > 0:
                    freq_ratio = high_freq_energy / low_freq_energy
                    # Unusual frequency distribution
                    if freq_ratio < 0.05 or freq_ratio > 2.0:
                        indicators.append(DeepfakeIndicator.FREQUENCY_ANOMALY.value)

                    # Return normalized score
                    freq_score = min(spikes / 10, 1.0) * 0.5 + min(abs(freq_ratio - 0.5) / 2, 0.5)
                    return freq_score, indicators

        except Exception as e:
            logger.error(f"Error in frequency analysis: {e}")

        return 0.0, indicators

    async def _analyze_metadata(self, image: Image.Image) -> List[str]:
        """Analyze image metadata for authenticity."""
        indicators = []

        try:
            # Check EXIF data
            exif_data = image._getexif() if hasattr(image, '_getexif') else None

            if exif_data is None or len(exif_data) < 3:
                indicators.append(DeepfakeIndicator.MISSING_METADATA.value)

        except Exception as e:
            logger.debug(f"Could not read EXIF data: {e}")
            indicators.append(DeepfakeIndicator.MISSING_METADATA.value)

        return indicators

    async def _check_resolution_patterns(self, image: Image.Image) -> List[str]:
        """Check for common GAN output resolutions."""
        indicators = []

        width, height = image.size

        # Common GAN output sizes
        gan_sizes = [256, 512, 1024, 2048, 4096]

        if width == height and width in gan_sizes:
            indicators.append(DeepfakeIndicator.COMMON_GAN_RESOLUTION.value)

        return indicators

    async def _analyze_texture(self, image: Image.Image) -> Tuple[float, List[str]]:
        """Analyze image texture for anomalies."""
        indicators = []

        try:
            gray = np.array(image.convert("L"))

            # Calculate texture metrics
            laplacian = cv2.Laplacian(gray, cv2.CV_64F)
            texture_var = laplacian.var()

            # Normalize score (lower variance = more suspicious)
            normalized_score = min(texture_var / 500, 1.0)

            if texture_var < 80:
                indicators.append(DeepfakeIndicator.SKIN_TEXTURE_ANOMALY.value)

            return 1 - normalized_score, indicators

        except Exception as e:
            logger.error(f"Error in texture analysis: {e}")
            return 0.0, indicators

    async def _analyze_lighting(self, image: Image.Image) -> Tuple[float, List[str]]:
        """Analyze lighting consistency."""
        indicators = []

        try:
            # Convert to LAB color space
            rgb_array = np.array(image)
            lab = cv2.cvtColor(rgb_array, cv2.COLOR_RGB2LAB)

            # Analyze L channel (lightness)
            l_channel = lab[:, :, 0]

            # Divide image into quadrants
            h, w = l_channel.shape
            quadrants = [
                l_channel[:h//2, :w//2],  # Top-left
                l_channel[:h//2, w//2:],  # Top-right
                l_channel[h//2:, :w//2],  # Bottom-left
                l_channel[h//2:, w//2:],  # Bottom-right
            ]

            # Calculate mean brightness for each quadrant
            means = [np.mean(q) for q in quadrants]
            brightness_std = np.std(means)

            # High variance might indicate lighting inconsistency
            if brightness_std > 40:
                indicators.append(DeepfakeIndicator.LIGHTING_INCONSISTENCY.value)

            # Normalize score
            score = min(brightness_std / 60, 1.0)
            return score, indicators

        except Exception as e:
            logger.error(f"Error in lighting analysis: {e}")
            return 0.0, indicators

    async def _analyze_temporal_consistency(self, frames: List[np.ndarray]) -> Tuple[float, List[str]]:
        """Analyze temporal consistency across video frames."""
        indicators = []

        if len(frames) < 2:
            return 1.0, indicators

        try:
            # Calculate optical flow between consecutive frames
            prev_gray = cv2.cvtColor(frames[0], cv2.COLOR_BGR2GRAY)
            flow_magnitudes = []

            for i in range(1, min(len(frames), 30)):  # Limit to first 30 frames
                curr_gray = cv2.cvtColor(frames[i], cv2.COLOR_BGR2GRAY)

                # Calculate dense optical flow
                flow = cv2.calcOpticalFlowFarneback(
                    prev_gray, curr_gray, None,
                    pyr_scale=0.5, levels=3, winsize=15,
                    iterations=3, poly_n=5, poly_sigma=1.2, flags=0
                )

                magnitude = np.sqrt(flow[:, :, 0]**2 + flow[:, :, 1]**2)
                flow_magnitudes.append(np.mean(magnitude))

                prev_gray = curr_gray

            # Check for temporal inconsistencies
            if len(flow_magnitudes) > 1:
                flow_std = np.std(flow_magnitudes)
                flow_mean = np.mean(flow_magnitudes)

                # High variance in optical flow might indicate inconsistency
                if flow_std > flow_mean * 0.5:
                    indicators.append(DeepfakeIndicator.TEMPORAL_INCONSISTENCY.value)

                # Normalize score
                consistency_score = max(0, 1 - (flow_std / (flow_mean + 1e-6)))
                return consistency_score, indicators

        except Exception as e:
            logger.error(f"Error in temporal analysis: {e}")

        return 1.0, indicators

    async def _analyze_blinking(self, frames: List[np.ndarray]) -> Dict[str, Any]:
        """Analyze eye blinking patterns in video frames."""
        result = {
            "blink_count": 0,
            "avg_blink_duration": 0,
            "is_anomalous": False,
            "reason": None,
        }

        if len(frames) < 30 or self.face_extractor is None:
            return result

        try:
            # Sample frames for eye analysis
            eye_openness = []

            for i in range(0, len(frames), 3):  # Sample every 3rd frame
                frame = frames[i]
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                image = Image.fromarray(rgb)

                faces = self.face_extractor.extract_faces(image)
                if faces and faces[0].landmarks:
                    landmarks = faces[0].landmarks

                    # Calculate eye aspect ratio
                    left_eye = landmarks.get("left_eye")
                    right_eye = landmarks.get("right_eye")

                    if left_eye and right_eye:
                        # Simple openness estimation based on eye position
                        # In a real implementation, use eye landmarks for EAR calculation
                        eye_openness.append(1.0)  # Placeholder

            # Analyze blink patterns
            if len(eye_openness) > 10:
                # Count blinks (transitions from open to closed)
                blink_count = 0
                for i in range(1, len(eye_openness)):
                    if eye_openness[i-1] > 0.5 and eye_openness[i] < 0.3:
                        blink_count += 1

                result["blink_count"] = blink_count

                # Check for anomalous patterns
                # Typical blink rate: 15-20 per minute
                video_duration_seconds = len(frames) / 30  # Assuming 30 fps
                expected_blinks = video_duration_seconds / 60 * 17  # 17 blinks/minute avg

                if blink_count == 0 and video_duration_seconds > 3:
                    result["is_anomalous"] = True
                    result["reason"] = "no_blinking_detected"

        except Exception as e:
            logger.error(f"Error in blink analysis: {e}")

        return result

    def _calculate_combined_score(
        self,
        ml_score: float,
        freq_score: float,
        texture_score: float,
        lighting_score: float,
        num_indicators: int,
    ) -> float:
        """Calculate combined deepfake score."""
        # Weighted combination
        score = (
            0.50 * ml_score +  # ML model is primary signal
            0.15 * freq_score +
            0.15 * texture_score +
            0.10 * lighting_score +
            0.10 * min(num_indicators / 5, 1.0)  # Indicator count
        )
        return min(max(score, 0.0), 1.0)

    def _calculate_confidence(
        self,
        deepfake_score: float,
        num_indicators: int,
        face_count: int,
    ) -> float:
        """Calculate confidence in the detection result."""
        # Base confidence from score distance from threshold
        distance_from_threshold = abs(deepfake_score - self.detection_threshold)
        score_confidence = min(distance_from_threshold * 2, 1.0)

        # Boost confidence if face detected
        face_boost = 0.1 if face_count > 0 else 0.0

        # Boost for multiple indicators
        indicator_boost = min(num_indicators * 0.05, 0.2)

        confidence = 0.5 + score_confidence * 0.3 + face_boost + indicator_boost
        return min(max(confidence, 0.0), 1.0)
