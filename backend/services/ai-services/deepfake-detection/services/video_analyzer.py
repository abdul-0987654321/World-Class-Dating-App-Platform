"""
Advanced Video Analysis for Deepfake Detection.

Implements sophisticated video analysis including:
- Blink detection and pattern analysis
- Lip sync verification
- Temporal consistency checking
- Facial landmark tracking
- Audio-visual correlation (for videos with audio)
"""

import logging
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum
import io

import numpy as np
import cv2
from PIL import Image
from scipy import signal
from scipy.stats import pearsonr

logger = logging.getLogger(__name__)

# Try to import dlib for facial landmark detection
try:
    import dlib
    DLIB_AVAILABLE = True
except ImportError:
    DLIB_AVAILABLE = False
    logger.warning("dlib not available, using OpenCV fallback for facial landmarks")


class BlinkPattern(str, Enum):
    """Blink pattern classifications."""
    NORMAL = "normal"
    ABSENT = "absent"
    TOO_FREQUENT = "too_frequent"
    TOO_REGULAR = "too_regular"
    UNNATURAL = "unnatural"


@dataclass
class BlinkAnalysisResult:
    """Result from blink analysis."""
    blink_count: int = 0
    blink_rate_per_minute: float = 0.0
    avg_blink_duration_ms: float = 0.0
    blink_pattern: BlinkPattern = BlinkPattern.NORMAL
    is_anomalous: bool = False
    anomaly_reasons: List[str] = field(default_factory=list)
    eye_aspect_ratios: List[float] = field(default_factory=list)
    confidence: float = 0.0


@dataclass
class LipSyncResult:
    """Result from lip sync analysis."""
    is_synchronized: bool = True
    sync_score: float = 1.0
    desync_frames: int = 0
    mouth_movement_score: float = 0.0
    audio_correlation: float = 0.0
    is_anomalous: bool = False
    anomaly_reasons: List[str] = field(default_factory=list)


@dataclass
class TemporalConsistencyResult:
    """Result from temporal consistency analysis."""
    consistency_score: float = 1.0
    frame_discontinuities: int = 0
    face_tracking_score: float = 1.0
    identity_consistency_score: float = 1.0
    is_anomalous: bool = False
    anomaly_reasons: List[str] = field(default_factory=list)


@dataclass
class VideoAnalysisResult:
    """Complete video analysis result."""
    is_deepfake: bool = False
    confidence: float = 0.0
    deepfake_score: float = 0.0
    blink_analysis: BlinkAnalysisResult = field(default_factory=BlinkAnalysisResult)
    lip_sync_analysis: LipSyncResult = field(default_factory=LipSyncResult)
    temporal_analysis: TemporalConsistencyResult = field(default_factory=TemporalConsistencyResult)
    frame_count: int = 0
    suspicious_frames: int = 0
    indicators: List[str] = field(default_factory=list)
    details: Dict[str, Any] = field(default_factory=dict)


class VideoAnalyzer:
    """
    Comprehensive video analyzer for deepfake detection.

    Analyzes:
    1. Eye blinking patterns (deepfakes often fail to blink naturally)
    2. Lip synchronization (face2face/audio deepfakes may have sync issues)
    3. Temporal consistency (frame-to-frame coherence)
    4. Facial landmark stability
    """

    # Eye Aspect Ratio (EAR) parameters
    EAR_THRESHOLD = 0.21  # Below this is considered a blink
    EAR_CONSEC_FRAMES = 2  # Minimum consecutive frames for a blink

    # Normal blink statistics
    NORMAL_BLINK_RATE_MIN = 10  # blinks per minute
    NORMAL_BLINK_RATE_MAX = 25  # blinks per minute
    NORMAL_BLINK_DURATION_MIN = 100  # milliseconds
    NORMAL_BLINK_DURATION_MAX = 400  # milliseconds

    def __init__(
        self,
        fps: float = 30.0,
        landmark_predictor_path: Optional[str] = None,
    ):
        """
        Initialize video analyzer.

        Args:
            fps: Video frames per second
            landmark_predictor_path: Path to dlib shape predictor model
        """
        self.fps = fps
        self.frame_duration_ms = 1000.0 / fps

        # Initialize face detector
        self.face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        )

        # Initialize eye cascade for fallback
        self.eye_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_eye.xml"
        )

        # Initialize dlib if available
        self.landmark_predictor = None
        self.dlib_detector = None

        if DLIB_AVAILABLE:
            self.dlib_detector = dlib.get_frontal_face_detector()
            if landmark_predictor_path:
                try:
                    self.landmark_predictor = dlib.shape_predictor(landmark_predictor_path)
                    logger.info("Loaded dlib shape predictor")
                except Exception as e:
                    logger.warning(f"Could not load dlib shape predictor: {e}")

    async def analyze_video(
        self,
        frames: List[np.ndarray],
        audio_samples: Optional[np.ndarray] = None,
        sample_rate: int = 16000,
    ) -> VideoAnalysisResult:
        """
        Perform comprehensive video analysis.

        Args:
            frames: List of video frames (BGR format)
            audio_samples: Optional audio samples for lip sync analysis
            sample_rate: Audio sample rate

        Returns:
            VideoAnalysisResult with all analysis results
        """
        if not frames:
            return VideoAnalysisResult(
                indicators=["no_frames_provided"],
            )

        try:
            # Update FPS based on actual frame count and assumed duration
            video_duration = len(frames) / self.fps

            # 1. Analyze blink patterns
            blink_result = await self.analyze_blinks(frames)

            # 2. Analyze lip synchronization
            lip_sync_result = await self.analyze_lip_sync(
                frames, audio_samples, sample_rate
            )

            # 3. Analyze temporal consistency
            temporal_result = await self.analyze_temporal_consistency(frames)

            # 4. Compile indicators
            indicators = []
            if blink_result.is_anomalous:
                indicators.extend(blink_result.anomaly_reasons)
            if lip_sync_result.is_anomalous:
                indicators.extend(lip_sync_result.anomaly_reasons)
            if temporal_result.is_anomalous:
                indicators.extend(temporal_result.anomaly_reasons)

            # 5. Calculate combined score
            deepfake_score = self._calculate_combined_score(
                blink_result, lip_sync_result, temporal_result
            )

            # 6. Determine if deepfake
            is_deepfake = deepfake_score > 0.5 or len(indicators) >= 3

            # 7. Calculate confidence
            confidence = self._calculate_confidence(
                blink_result, lip_sync_result, temporal_result, len(indicators)
            )

            return VideoAnalysisResult(
                is_deepfake=is_deepfake,
                confidence=round(confidence, 4),
                deepfake_score=round(deepfake_score, 4),
                blink_analysis=blink_result,
                lip_sync_analysis=lip_sync_result,
                temporal_analysis=temporal_result,
                frame_count=len(frames),
                suspicious_frames=self._count_suspicious_frames(
                    blink_result, lip_sync_result, temporal_result
                ),
                indicators=list(set(indicators)),
                details={
                    "video_duration_seconds": round(video_duration, 2),
                    "fps": self.fps,
                },
            )

        except Exception as e:
            logger.error(f"Error analyzing video: {e}", exc_info=True)
            return VideoAnalysisResult(
                indicators=["analysis_error"],
                details={"error": str(e)},
            )

    async def analyze_blinks(self, frames: List[np.ndarray]) -> BlinkAnalysisResult:
        """
        Analyze eye blinking patterns.

        Deepfakes often:
        - Don't blink at all
        - Blink too regularly (unnaturally)
        - Have incomplete blinks

        Args:
            frames: List of video frames

        Returns:
            BlinkAnalysisResult
        """
        if len(frames) < 30:  # Need at least 1 second at 30fps
            return BlinkAnalysisResult(
                confidence=0.0,
                anomaly_reasons=["insufficient_frames_for_blink_analysis"],
            )

        try:
            # Calculate Eye Aspect Ratio (EAR) for each frame
            ear_values = []
            valid_frames = 0

            for frame in frames:
                ear = self._calculate_ear(frame)
                if ear is not None:
                    ear_values.append(ear)
                    valid_frames += 1
                else:
                    ear_values.append(1.0)  # Default to open if detection fails

            if valid_frames < len(frames) * 0.5:
                return BlinkAnalysisResult(
                    confidence=0.3,
                    anomaly_reasons=["insufficient_face_detection"],
                )

            # Detect blinks from EAR values
            blinks = self._detect_blinks(ear_values)
            blink_count = len(blinks)

            # Calculate video duration
            duration_seconds = len(frames) / self.fps
            duration_minutes = duration_seconds / 60.0

            # Calculate blink rate
            blink_rate = blink_count / duration_minutes if duration_minutes > 0 else 0

            # Calculate average blink duration
            blink_durations = [b['duration'] for b in blinks]
            avg_duration_ms = (
                np.mean(blink_durations) * self.frame_duration_ms
                if blink_durations else 0
            )

            # Analyze blink pattern
            anomaly_reasons = []
            blink_pattern = BlinkPattern.NORMAL

            # Check for absence of blinking
            if blink_count == 0 and duration_seconds > 5:
                blink_pattern = BlinkPattern.ABSENT
                anomaly_reasons.append("no_blinking_detected")

            # Check for too frequent blinking
            elif blink_rate > self.NORMAL_BLINK_RATE_MAX * 1.5:
                blink_pattern = BlinkPattern.TOO_FREQUENT
                anomaly_reasons.append("excessive_blink_rate")

            # Check for too regular intervals (unnaturally rhythmic)
            elif len(blinks) >= 3:
                intervals = [
                    blinks[i+1]['start'] - blinks[i]['start']
                    for i in range(len(blinks) - 1)
                ]
                interval_std = np.std(intervals) if intervals else 0
                interval_mean = np.mean(intervals) if intervals else 0

                # Very regular intervals are suspicious
                if interval_mean > 0 and interval_std / interval_mean < 0.1:
                    blink_pattern = BlinkPattern.TOO_REGULAR
                    anomaly_reasons.append("unnaturally_regular_blinks")

            # Check for unnatural blink duration
            if avg_duration_ms > 0:
                if avg_duration_ms < self.NORMAL_BLINK_DURATION_MIN:
                    anomaly_reasons.append("blinks_too_short")
                    blink_pattern = BlinkPattern.UNNATURAL
                elif avg_duration_ms > self.NORMAL_BLINK_DURATION_MAX:
                    anomaly_reasons.append("blinks_too_long")
                    blink_pattern = BlinkPattern.UNNATURAL

            # Calculate confidence based on detection quality
            confidence = valid_frames / len(frames)

            return BlinkAnalysisResult(
                blink_count=blink_count,
                blink_rate_per_minute=round(blink_rate, 2),
                avg_blink_duration_ms=round(avg_duration_ms, 2),
                blink_pattern=blink_pattern,
                is_anomalous=len(anomaly_reasons) > 0,
                anomaly_reasons=anomaly_reasons,
                eye_aspect_ratios=ear_values,
                confidence=round(confidence, 4),
            )

        except Exception as e:
            logger.error(f"Error in blink analysis: {e}")
            return BlinkAnalysisResult(
                confidence=0.0,
                anomaly_reasons=["blink_analysis_error"],
            )

    def _calculate_ear(self, frame: np.ndarray) -> Optional[float]:
        """
        Calculate Eye Aspect Ratio (EAR) for a frame.

        EAR = (||p2-p6|| + ||p3-p5||) / (2 * ||p1-p4||)

        Args:
            frame: Video frame (BGR)

        Returns:
            EAR value or None if detection fails
        """
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        # Use dlib if available
        if self.dlib_detector and self.landmark_predictor:
            faces = self.dlib_detector(gray)
            if not faces:
                return None

            shape = self.landmark_predictor(gray, faces[0])

            # Get eye landmarks (36-41 for left eye, 42-47 for right eye)
            left_eye = np.array([
                (shape.part(i).x, shape.part(i).y) for i in range(36, 42)
            ])
            right_eye = np.array([
                (shape.part(i).x, shape.part(i).y) for i in range(42, 48)
            ])

            # Calculate EAR for both eyes
            left_ear = self._eye_aspect_ratio(left_eye)
            right_ear = self._eye_aspect_ratio(right_eye)

            return (left_ear + right_ear) / 2.0

        else:
            # Fallback to OpenCV cascade
            faces = self.face_cascade.detectMultiScale(gray, 1.1, 5)
            if len(faces) == 0:
                return None

            # Use largest face
            x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
            face_roi = gray[y:y+h, x:x+w]

            # Detect eyes
            eyes = self.eye_cascade.detectMultiScale(face_roi)
            if len(eyes) < 2:
                return None

            # Estimate EAR from eye regions (simplified)
            # This is less accurate than landmark-based detection
            total_area = sum(e[2] * e[3] for e in eyes[:2])
            max_area = 2 * (w * 0.25) * (h * 0.15)  # Expected eye area

            # Normalize to EAR-like scale (0.1 to 0.4 typical range)
            ear_estimate = 0.1 + 0.3 * (total_area / max_area) if max_area > 0 else 0.25

            return min(max(ear_estimate, 0.1), 0.4)

    def _eye_aspect_ratio(self, eye: np.ndarray) -> float:
        """
        Calculate EAR for a single eye.

        Args:
            eye: Array of 6 eye landmark points

        Returns:
            Eye Aspect Ratio
        """
        # Compute euclidean distances between vertical landmarks
        A = np.linalg.norm(eye[1] - eye[5])
        B = np.linalg.norm(eye[2] - eye[4])

        # Compute euclidean distance between horizontal landmarks
        C = np.linalg.norm(eye[0] - eye[3])

        # Calculate EAR
        ear = (A + B) / (2.0 * C) if C > 0 else 0

        return ear

    def _detect_blinks(self, ear_values: List[float]) -> List[Dict[str, Any]]:
        """
        Detect blinks from EAR time series.

        Args:
            ear_values: List of EAR values for each frame

        Returns:
            List of detected blinks with start/end frames
        """
        blinks = []
        in_blink = False
        blink_start = 0
        consec_frames = 0

        for i, ear in enumerate(ear_values):
            if ear < self.EAR_THRESHOLD:
                consec_frames += 1
                if not in_blink and consec_frames >= self.EAR_CONSEC_FRAMES:
                    in_blink = True
                    blink_start = i - consec_frames + 1
            else:
                if in_blink:
                    blinks.append({
                        'start': blink_start,
                        'end': i,
                        'duration': i - blink_start,
                        'min_ear': min(ear_values[blink_start:i]) if i > blink_start else ear,
                    })
                in_blink = False
                consec_frames = 0

        return blinks

    async def analyze_lip_sync(
        self,
        frames: List[np.ndarray],
        audio_samples: Optional[np.ndarray] = None,
        sample_rate: int = 16000,
    ) -> LipSyncResult:
        """
        Analyze lip synchronization.

        Args:
            frames: Video frames
            audio_samples: Audio waveform
            sample_rate: Audio sample rate

        Returns:
            LipSyncResult
        """
        anomaly_reasons = []

        try:
            # Analyze mouth movement
            mouth_metrics = self._analyze_mouth_movement(frames)

            if mouth_metrics['valid_frames'] < len(frames) * 0.3:
                return LipSyncResult(
                    is_synchronized=True,
                    sync_score=0.5,
                    confidence=0.3,
                    anomaly_reasons=["insufficient_mouth_detection"],
                )

            mouth_movement_score = mouth_metrics['movement_score']

            # If audio is provided, check correlation
            audio_correlation = 0.0
            if audio_samples is not None and len(audio_samples) > 0:
                audio_correlation = self._correlate_audio_visual(
                    mouth_metrics['openness_values'],
                    audio_samples,
                    sample_rate,
                )

                # Low correlation might indicate desync
                if audio_correlation < 0.3:
                    anomaly_reasons.append("audio_visual_desync")

            # Check for unnatural mouth patterns
            if mouth_movement_score < 0.1 and len(frames) > 60:
                anomaly_reasons.append("insufficient_mouth_movement")

            if mouth_metrics['variance'] < 0.01:
                anomaly_reasons.append("unnaturally_stable_mouth")

            sync_score = (
                0.5 * mouth_movement_score +
                0.5 * (audio_correlation if audio_samples is not None else 0.5)
            )

            return LipSyncResult(
                is_synchronized=sync_score > 0.4,
                sync_score=round(sync_score, 4),
                desync_frames=mouth_metrics.get('desync_frames', 0),
                mouth_movement_score=round(mouth_movement_score, 4),
                audio_correlation=round(audio_correlation, 4),
                is_anomalous=len(anomaly_reasons) > 0,
                anomaly_reasons=anomaly_reasons,
            )

        except Exception as e:
            logger.error(f"Error in lip sync analysis: {e}")
            return LipSyncResult(
                anomaly_reasons=["lip_sync_analysis_error"],
            )

    def _analyze_mouth_movement(self, frames: List[np.ndarray]) -> Dict[str, Any]:
        """
        Analyze mouth movement patterns.

        Args:
            frames: Video frames

        Returns:
            Mouth movement metrics
        """
        openness_values = []
        valid_frames = 0

        for frame in frames:
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

            # Detect face
            faces = self.face_cascade.detectMultiScale(gray, 1.1, 5)
            if len(faces) == 0:
                openness_values.append(0.0)
                continue

            # Get largest face
            x, y, w, h = max(faces, key=lambda f: f[2] * f[3])

            # Extract lower face region (mouth area)
            mouth_region = gray[y + int(h * 0.6):y + h, x:x + w]

            if mouth_region.size == 0:
                openness_values.append(0.0)
                continue

            # Estimate mouth openness from pixel variance in mouth region
            # Higher variance often correlates with open mouth (teeth, inside mouth)
            variance = np.var(mouth_region) / 255.0
            openness_values.append(variance)
            valid_frames += 1

        # Calculate metrics
        if valid_frames > 0:
            openness_array = np.array(openness_values)
            movement_score = np.std(openness_array) * 10  # Scale up
            variance = np.var(openness_array)

            # Detect abrupt changes (potential frame splicing)
            diff = np.abs(np.diff(openness_array))
            desync_frames = np.sum(diff > np.mean(diff) * 3)

            return {
                'openness_values': openness_values,
                'valid_frames': valid_frames,
                'movement_score': min(movement_score, 1.0),
                'variance': variance,
                'desync_frames': int(desync_frames),
            }

        return {
            'openness_values': [],
            'valid_frames': 0,
            'movement_score': 0.0,
            'variance': 0.0,
            'desync_frames': 0,
        }

    def _correlate_audio_visual(
        self,
        visual_signal: List[float],
        audio_samples: np.ndarray,
        sample_rate: int,
    ) -> float:
        """
        Correlate visual mouth movement with audio.

        Args:
            visual_signal: Mouth openness values per frame
            audio_samples: Audio waveform
            sample_rate: Audio sample rate

        Returns:
            Correlation coefficient
        """
        if len(visual_signal) < 10 or len(audio_samples) < sample_rate:
            return 0.5

        try:
            # Calculate audio envelope (RMS energy)
            samples_per_frame = int(sample_rate / self.fps)
            audio_envelope = []

            for i in range(len(visual_signal)):
                start = i * samples_per_frame
                end = start + samples_per_frame
                if end <= len(audio_samples):
                    rms = np.sqrt(np.mean(audio_samples[start:end] ** 2))
                    audio_envelope.append(rms)
                else:
                    audio_envelope.append(0.0)

            # Ensure same length
            min_len = min(len(visual_signal), len(audio_envelope))
            visual = np.array(visual_signal[:min_len])
            audio = np.array(audio_envelope[:min_len])

            # Normalize
            visual = (visual - np.mean(visual)) / (np.std(visual) + 1e-8)
            audio = (audio - np.mean(audio)) / (np.std(audio) + 1e-8)

            # Calculate cross-correlation
            correlation, _ = pearsonr(visual, audio)

            return abs(correlation) if not np.isnan(correlation) else 0.0

        except Exception as e:
            logger.error(f"Error in audio-visual correlation: {e}")
            return 0.5

    async def analyze_temporal_consistency(
        self,
        frames: List[np.ndarray]
    ) -> TemporalConsistencyResult:
        """
        Analyze temporal consistency of the video.

        Args:
            frames: Video frames

        Returns:
            TemporalConsistencyResult
        """
        if len(frames) < 2:
            return TemporalConsistencyResult(
                anomaly_reasons=["insufficient_frames"],
            )

        anomaly_reasons = []

        try:
            # 1. Analyze optical flow for smooth motion
            flow_scores = self._analyze_optical_flow(frames)

            # 2. Track face positions for consistency
            face_tracking_score = self._analyze_face_tracking(frames)

            # 3. Check for sudden appearance changes
            identity_score = self._analyze_identity_consistency(frames)

            # Detect discontinuities
            discontinuities = 0
            if len(flow_scores) > 0:
                flow_std = np.std(flow_scores)
                flow_mean = np.mean(flow_scores)
                if flow_std > 0:
                    anomalies = np.abs(flow_scores - flow_mean) > 3 * flow_std
                    discontinuities = np.sum(anomalies)

            # Check for temporal anomalies
            if discontinuities > len(frames) * 0.1:
                anomaly_reasons.append("excessive_motion_discontinuities")

            if face_tracking_score < 0.5:
                anomaly_reasons.append("unstable_face_tracking")

            if identity_score < 0.7:
                anomaly_reasons.append("identity_inconsistency")

            # Calculate overall consistency
            consistency_score = (
                0.4 * (1 - min(discontinuities / len(frames), 1.0)) +
                0.3 * face_tracking_score +
                0.3 * identity_score
            )

            return TemporalConsistencyResult(
                consistency_score=round(consistency_score, 4),
                frame_discontinuities=int(discontinuities),
                face_tracking_score=round(face_tracking_score, 4),
                identity_consistency_score=round(identity_score, 4),
                is_anomalous=len(anomaly_reasons) > 0,
                anomaly_reasons=anomaly_reasons,
            )

        except Exception as e:
            logger.error(f"Error in temporal consistency analysis: {e}")
            return TemporalConsistencyResult(
                anomaly_reasons=["temporal_analysis_error"],
            )

    def _analyze_optical_flow(self, frames: List[np.ndarray]) -> List[float]:
        """
        Analyze optical flow between frames.

        Args:
            frames: Video frames

        Returns:
            List of flow magnitude scores
        """
        flow_scores = []
        prev_gray = cv2.cvtColor(frames[0], cv2.COLOR_BGR2GRAY)

        for frame in frames[1:]:
            curr_gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

            # Calculate dense optical flow
            flow = cv2.calcOpticalFlowFarneback(
                prev_gray, curr_gray, None,
                pyr_scale=0.5, levels=3, winsize=15,
                iterations=3, poly_n=5, poly_sigma=1.2, flags=0
            )

            # Calculate magnitude
            magnitude = np.sqrt(flow[:, :, 0]**2 + flow[:, :, 1]**2)
            flow_scores.append(np.mean(magnitude))

            prev_gray = curr_gray

        return flow_scores

    def _analyze_face_tracking(self, frames: List[np.ndarray]) -> float:
        """
        Analyze face position consistency.

        Args:
            frames: Video frames

        Returns:
            Face tracking consistency score
        """
        face_positions = []

        for frame in frames:
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = self.face_cascade.detectMultiScale(gray, 1.1, 5)

            if len(faces) > 0:
                x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
                center_x = x + w / 2
                center_y = y + h / 2
                face_positions.append((center_x, center_y, w, h))
            else:
                face_positions.append(None)

        # Analyze position changes
        valid_positions = [p for p in face_positions if p is not None]

        if len(valid_positions) < len(frames) * 0.5:
            return 0.5  # Too few detections

        # Calculate position variance (normalized)
        if len(valid_positions) > 1:
            positions = np.array([[p[0], p[1]] for p in valid_positions])
            position_std = np.mean(np.std(positions, axis=0))

            # Normalize by average face size
            avg_size = np.mean([p[2] for p in valid_positions])
            normalized_std = position_std / avg_size if avg_size > 0 else 1.0

            # Lower variance = more consistent = higher score
            return max(0, 1 - normalized_std)

        return 1.0

    def _analyze_identity_consistency(self, frames: List[np.ndarray]) -> float:
        """
        Analyze if the face identity remains consistent.

        Args:
            frames: Video frames

        Returns:
            Identity consistency score
        """
        # Sample frames for comparison
        sample_indices = np.linspace(0, len(frames) - 1, min(10, len(frames)), dtype=int)
        face_features = []

        for idx in sample_indices:
            frame = frames[idx]
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = self.face_cascade.detectMultiScale(gray, 1.1, 5)

            if len(faces) > 0:
                x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
                face_roi = gray[y:y+h, x:x+w]

                # Resize for consistent comparison
                face_resized = cv2.resize(face_roi, (64, 64))

                # Simple feature: mean intensity and histogram
                hist = cv2.calcHist([face_resized], [0], None, [32], [0, 256])
                hist = hist.flatten() / hist.sum()
                face_features.append(hist)

        if len(face_features) < 2:
            return 1.0

        # Compare histograms between sampled frames
        similarities = []
        for i in range(len(face_features) - 1):
            # Use correlation as similarity measure
            corr = cv2.compareHist(
                face_features[i], face_features[i+1],
                cv2.HISTCMP_CORREL
            )
            similarities.append(corr)

        return np.mean(similarities) if similarities else 1.0

    def _calculate_combined_score(
        self,
        blink_result: BlinkAnalysisResult,
        lip_sync_result: LipSyncResult,
        temporal_result: TemporalConsistencyResult,
    ) -> float:
        """Calculate combined deepfake score."""
        # Weight different analyses
        blink_weight = 0.35
        lip_sync_weight = 0.30
        temporal_weight = 0.35

        # Convert to scores (higher = more likely deepfake)
        blink_score = 1.0 if blink_result.is_anomalous else 0.0
        if blink_result.blink_pattern == BlinkPattern.ABSENT:
            blink_score = 0.9
        elif blink_result.blink_pattern == BlinkPattern.TOO_REGULAR:
            blink_score = 0.7

        lip_score = 1.0 - lip_sync_result.sync_score
        temporal_score = 1.0 - temporal_result.consistency_score

        combined = (
            blink_weight * blink_score +
            lip_sync_weight * lip_score +
            temporal_weight * temporal_score
        )

        return min(max(combined, 0.0), 1.0)

    def _calculate_confidence(
        self,
        blink_result: BlinkAnalysisResult,
        lip_sync_result: LipSyncResult,
        temporal_result: TemporalConsistencyResult,
        num_indicators: int,
    ) -> float:
        """Calculate confidence in detection."""
        # Average of individual confidences
        avg_confidence = (
            blink_result.confidence +
            (1.0 if lip_sync_result.sync_score > 0 else 0.0) +
            temporal_result.consistency_score
        ) / 3.0

        # Boost for multiple indicators
        indicator_boost = min(num_indicators * 0.1, 0.3)

        return min(avg_confidence + indicator_boost, 1.0)

    def _count_suspicious_frames(
        self,
        blink_result: BlinkAnalysisResult,
        lip_sync_result: LipSyncResult,
        temporal_result: TemporalConsistencyResult,
    ) -> int:
        """Count total suspicious frames."""
        return (
            temporal_result.frame_discontinuities +
            lip_sync_result.desync_frames
        )


# Create singleton instance
video_analyzer = VideoAnalyzer()
