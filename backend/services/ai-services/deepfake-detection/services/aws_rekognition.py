"""
AWS Rekognition integration for face analysis.

Provides comprehensive face analysis using AWS Rekognition including:
- Face detection and attributes
- Face quality metrics
- Liveness detection hints
- Emotion and pose analysis
"""

import io
import logging
from typing import Dict, Any, Optional, List, Tuple
from dataclasses import dataclass, field
from enum import Enum

import boto3
from botocore.exceptions import ClientError, NoCredentialsError
from PIL import Image
import numpy as np

logger = logging.getLogger(__name__)


class RekognitionQualityLevel(str, Enum):
    """Face quality levels from Rekognition."""
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    UNKNOWN = "unknown"


@dataclass
class FaceQualityMetrics:
    """Face quality metrics from Rekognition."""
    brightness: float = 0.0
    sharpness: float = 0.0
    confidence: float = 0.0
    quality_level: RekognitionQualityLevel = RekognitionQualityLevel.UNKNOWN
    pose: Dict[str, float] = field(default_factory=dict)
    is_sunglasses: bool = False
    is_eyeglasses: bool = False
    eyes_open: bool = True
    eyes_open_confidence: float = 0.0
    mouth_open: bool = False
    mouth_open_confidence: float = 0.0


@dataclass
class RekognitionAnalysisResult:
    """Complete analysis result from Rekognition."""
    face_detected: bool = False
    face_count: int = 0
    primary_face: Optional[FaceQualityMetrics] = None
    deepfake_indicators: List[str] = field(default_factory=list)
    confidence_score: float = 0.0
    raw_response: Dict[str, Any] = field(default_factory=dict)
    error: Optional[str] = None


class AWSRekognitionService:
    """
    AWS Rekognition integration for face analysis.

    Uses Rekognition to detect faces and analyze quality metrics
    that can indicate deepfake manipulation.
    """

    def __init__(
        self,
        aws_region: str = "us-east-1",
        aws_access_key_id: Optional[str] = None,
        aws_secret_access_key: Optional[str] = None,
    ):
        """
        Initialize Rekognition service.

        Args:
            aws_region: AWS region for Rekognition
            aws_access_key_id: Optional AWS access key (uses env/role if not provided)
            aws_secret_access_key: Optional AWS secret key
        """
        self.aws_region = aws_region
        self._client = None
        self._initialized = False

        # Store credentials if provided
        self._aws_access_key_id = aws_access_key_id
        self._aws_secret_access_key = aws_secret_access_key

    def initialize(self) -> bool:
        """
        Initialize Rekognition client.

        Returns:
            True if initialization successful
        """
        if self._initialized:
            return True

        try:
            if self._aws_access_key_id and self._aws_secret_access_key:
                self._client = boto3.client(
                    'rekognition',
                    region_name=self.aws_region,
                    aws_access_key_id=self._aws_access_key_id,
                    aws_secret_access_key=self._aws_secret_access_key,
                )
            else:
                # Use default credentials (IAM role, environment variables, etc.)
                self._client = boto3.client(
                    'rekognition',
                    region_name=self.aws_region,
                )

            self._initialized = True
            logger.info("AWS Rekognition service initialized successfully")
            return True

        except NoCredentialsError:
            logger.error("AWS credentials not found")
            return False
        except Exception as e:
            logger.error(f"Failed to initialize Rekognition: {e}")
            return False

    async def analyze_face(self, image_bytes: bytes) -> RekognitionAnalysisResult:
        """
        Analyze face in image using Rekognition.

        Args:
            image_bytes: Raw image bytes

        Returns:
            RekognitionAnalysisResult with face analysis
        """
        if not self._initialized:
            if not self.initialize():
                return RekognitionAnalysisResult(
                    error="Rekognition service not initialized"
                )

        try:
            # Detect faces with full attributes
            response = self._client.detect_faces(
                Image={'Bytes': image_bytes},
                Attributes=['ALL']
            )

            face_details = response.get('FaceDetails', [])

            if not face_details:
                return RekognitionAnalysisResult(
                    face_detected=False,
                    face_count=0,
                    raw_response=response,
                )

            # Analyze primary face (highest confidence)
            primary_face_data = max(face_details, key=lambda f: f.get('Confidence', 0))

            # Extract quality metrics
            quality = primary_face_data.get('Quality', {})
            pose = primary_face_data.get('Pose', {})

            # Check for glasses
            eyeglasses = primary_face_data.get('Eyeglasses', {})
            sunglasses = primary_face_data.get('Sunglasses', {})
            eyes_open = primary_face_data.get('EyesOpen', {})
            mouth_open = primary_face_data.get('MouthOpen', {})

            # Determine quality level
            brightness = quality.get('Brightness', 50)
            sharpness = quality.get('Sharpness', 50)

            if brightness > 60 and sharpness > 60:
                quality_level = RekognitionQualityLevel.HIGH
            elif brightness > 40 and sharpness > 40:
                quality_level = RekognitionQualityLevel.MEDIUM
            else:
                quality_level = RekognitionQualityLevel.LOW

            primary_face = FaceQualityMetrics(
                brightness=brightness,
                sharpness=sharpness,
                confidence=primary_face_data.get('Confidence', 0),
                quality_level=quality_level,
                pose={
                    'roll': pose.get('Roll', 0),
                    'yaw': pose.get('Yaw', 0),
                    'pitch': pose.get('Pitch', 0),
                },
                is_sunglasses=sunglasses.get('Value', False),
                is_eyeglasses=eyeglasses.get('Value', False),
                eyes_open=eyes_open.get('Value', True),
                eyes_open_confidence=eyes_open.get('Confidence', 0),
                mouth_open=mouth_open.get('Value', False),
                mouth_open_confidence=mouth_open.get('Confidence', 0),
            )

            # Analyze for deepfake indicators
            indicators = self._analyze_deepfake_indicators(primary_face_data, face_details)

            # Calculate confidence score
            confidence_score = self._calculate_confidence_score(primary_face, indicators)

            return RekognitionAnalysisResult(
                face_detected=True,
                face_count=len(face_details),
                primary_face=primary_face,
                deepfake_indicators=indicators,
                confidence_score=confidence_score,
                raw_response=response,
            )

        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code', 'Unknown')
            logger.error(f"Rekognition API error: {error_code} - {e}")
            return RekognitionAnalysisResult(error=f"API error: {error_code}")
        except Exception as e:
            logger.error(f"Error analyzing face with Rekognition: {e}")
            return RekognitionAnalysisResult(error=str(e))

    async def compare_faces(
        self,
        source_bytes: bytes,
        target_bytes: bytes,
        similarity_threshold: float = 80.0
    ) -> Dict[str, Any]:
        """
        Compare two faces for similarity.

        Useful for detecting face swap deepfakes by comparing
        multiple images of the same claimed person.

        Args:
            source_bytes: Source image bytes
            target_bytes: Target image bytes
            similarity_threshold: Minimum similarity percentage

        Returns:
            Comparison result with similarity score
        """
        if not self._initialized:
            if not self.initialize():
                return {"error": "Rekognition service not initialized"}

        try:
            response = self._client.compare_faces(
                SourceImage={'Bytes': source_bytes},
                TargetImage={'Bytes': target_bytes},
                SimilarityThreshold=similarity_threshold,
            )

            face_matches = response.get('FaceMatches', [])
            unmatched_faces = response.get('UnmatchedFaces', [])

            result = {
                "matched": len(face_matches) > 0,
                "match_count": len(face_matches),
                "unmatched_count": len(unmatched_faces),
                "similarities": [],
            }

            for match in face_matches:
                result["similarities"].append({
                    "similarity": match.get('Similarity', 0),
                    "confidence": match.get('Face', {}).get('Confidence', 0),
                })

            return result

        except ClientError as e:
            logger.error(f"Face comparison error: {e}")
            return {"error": str(e)}

    async def detect_text_in_image(self, image_bytes: bytes) -> List[str]:
        """
        Detect text in image that might indicate manipulation.

        Args:
            image_bytes: Raw image bytes

        Returns:
            List of detected text strings
        """
        if not self._initialized:
            if not self.initialize():
                return []

        try:
            response = self._client.detect_text(
                Image={'Bytes': image_bytes}
            )

            text_detections = response.get('TextDetections', [])
            return [
                detection.get('DetectedText', '')
                for detection in text_detections
                if detection.get('Type') == 'LINE'
            ]

        except ClientError as e:
            logger.error(f"Text detection error: {e}")
            return []

    def _analyze_deepfake_indicators(
        self,
        primary_face: Dict[str, Any],
        all_faces: List[Dict[str, Any]]
    ) -> List[str]:
        """
        Analyze Rekognition results for deepfake indicators.

        Args:
            primary_face: Primary face details
            all_faces: All detected faces

        Returns:
            List of deepfake indicator strings
        """
        indicators = []

        # Check quality metrics
        quality = primary_face.get('Quality', {})
        brightness = quality.get('Brightness', 50)
        sharpness = quality.get('Sharpness', 50)

        # Unusually low sharpness can indicate blending artifacts
        if sharpness < 30:
            indicators.append("low_face_sharpness")

        # Very even brightness might indicate synthetic generation
        if 48 < brightness < 52:
            indicators.append("suspiciously_even_brightness")

        # Check landmarks for anomalies
        landmarks = primary_face.get('Landmarks', [])
        if landmarks:
            # Check for unusually symmetric landmarks
            symmetry_score = self._check_landmark_symmetry(landmarks)
            if symmetry_score > 0.98:
                indicators.append("unnatural_landmark_symmetry")

            # Check for missing or misplaced landmarks
            expected_landmarks = {
                'eyeLeft', 'eyeRight', 'nose', 'mouthLeft', 'mouthRight'
            }
            found_landmarks = {l.get('Type') for l in landmarks}
            if not expected_landmarks.issubset(found_landmarks):
                indicators.append("missing_facial_landmarks")

        # Check pose for unnatural positions
        pose = primary_face.get('Pose', {})
        roll = abs(pose.get('Roll', 0))
        yaw = abs(pose.get('Yaw', 0))
        pitch = abs(pose.get('Pitch', 0))

        # Very small pose angles might indicate synthetic frontal face
        if roll < 0.5 and yaw < 0.5 and pitch < 0.5:
            indicators.append("unnaturally_frontal_pose")

        # Check emotions for unrealistic combinations
        emotions = primary_face.get('Emotions', [])
        if emotions:
            emotion_scores = {e['Type']: e['Confidence'] for e in emotions}
            # Multiple high-confidence contradictory emotions
            if (emotion_scores.get('HAPPY', 0) > 70 and
                emotion_scores.get('SAD', 0) > 70):
                indicators.append("contradictory_emotions")

        # Check for age/gender estimation issues
        age_range = primary_face.get('AgeRange', {})
        if age_range:
            age_span = age_range.get('High', 0) - age_range.get('Low', 0)
            # Very wide or very narrow age range can be suspicious
            if age_span > 30 or age_span < 3:
                indicators.append("unusual_age_estimation")

        # Multiple faces with similar positions might indicate editing
        if len(all_faces) > 1:
            if self._check_overlapping_faces(all_faces):
                indicators.append("overlapping_face_regions")

        return indicators

    def _check_landmark_symmetry(self, landmarks: List[Dict[str, Any]]) -> float:
        """
        Check facial landmark symmetry.

        Args:
            landmarks: List of facial landmarks

        Returns:
            Symmetry score (0-1, higher = more symmetric)
        """
        landmark_dict = {l['Type']: (l['X'], l['Y']) for l in landmarks}

        # Check eye symmetry
        if 'eyeLeft' in landmark_dict and 'eyeRight' in landmark_dict:
            left_eye = landmark_dict['eyeLeft']
            right_eye = landmark_dict['eyeRight']

            # Check if eyes are at same height
            height_diff = abs(left_eye[1] - right_eye[1])

            # Perfect symmetry is suspicious
            if height_diff < 0.001:
                return 1.0

            return 1.0 - min(height_diff * 100, 1.0)

        return 0.5

    def _check_overlapping_faces(self, faces: List[Dict[str, Any]]) -> bool:
        """
        Check if any faces overlap (might indicate manipulation).

        Args:
            faces: List of face details

        Returns:
            True if overlapping faces detected
        """
        bboxes = []
        for face in faces:
            bbox = face.get('BoundingBox', {})
            if bbox:
                bboxes.append({
                    'left': bbox.get('Left', 0),
                    'top': bbox.get('Top', 0),
                    'width': bbox.get('Width', 0),
                    'height': bbox.get('Height', 0),
                })

        # Check for overlaps
        for i, box1 in enumerate(bboxes):
            for j, box2 in enumerate(bboxes[i+1:], i+1):
                # Calculate overlap
                x_overlap = max(0, min(box1['left'] + box1['width'],
                                       box2['left'] + box2['width']) -
                               max(box1['left'], box2['left']))
                y_overlap = max(0, min(box1['top'] + box1['height'],
                                       box2['top'] + box2['height']) -
                               max(box1['top'], box2['top']))

                overlap_area = x_overlap * y_overlap
                box1_area = box1['width'] * box1['height']

                if box1_area > 0 and overlap_area / box1_area > 0.3:
                    return True

        return False

    def _calculate_confidence_score(
        self,
        face_metrics: FaceQualityMetrics,
        indicators: List[str]
    ) -> float:
        """
        Calculate overall confidence score for the analysis.

        Args:
            face_metrics: Face quality metrics
            indicators: Detected deepfake indicators

        Returns:
            Confidence score (0-1)
        """
        # Start with face detection confidence
        base_score = face_metrics.confidence / 100.0

        # Adjust based on quality
        if face_metrics.quality_level == RekognitionQualityLevel.HIGH:
            quality_multiplier = 1.0
        elif face_metrics.quality_level == RekognitionQualityLevel.MEDIUM:
            quality_multiplier = 0.85
        else:
            quality_multiplier = 0.7

        # Reduce for each indicator
        indicator_penalty = len(indicators) * 0.1

        confidence = base_score * quality_multiplier - indicator_penalty
        return max(0.0, min(1.0, confidence))


# Create singleton instance
rekognition_service = AWSRekognitionService()
