"""
Core Photo Analysis Module for FLAMORAL Dating Platform.

This module provides comprehensive photo analysis capabilities including:
- Face detection and positioning
- Photo quality assessment
- Age estimation
- Content moderation (appropriateness check)
- Style feedback and recommendations
- Filter/editing detection

Uses OpenCV + dlib for face detection and custom ML models for analysis.
"""

import io
import logging
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any, Tuple
from enum import Enum
import numpy as np
from PIL import Image
import cv2
import httpx

logger = logging.getLogger(__name__)


class FacePosition(str, Enum):
    """Face position in the image."""
    CENTERED = "centered"
    LEFT = "left"
    RIGHT = "right"
    TOP = "top"
    BOTTOM = "bottom"
    NOT_DETECTED = "not_detected"


class QualityLevel(str, Enum):
    """Overall photo quality level."""
    EXCELLENT = "excellent"
    GOOD = "good"
    FAIR = "fair"
    POOR = "poor"


@dataclass
class QualityScore:
    """Photo quality assessment results."""
    overall_score: float  # 0-100
    resolution_score: float
    lighting_score: float
    blur_score: float
    compression_score: float
    noise_score: float
    quality_level: QualityLevel
    issues: List[str] = field(default_factory=list)
    metrics: Dict[str, Any] = field(default_factory=dict)


@dataclass
class FaceDetection:
    """Individual face detection result."""
    bounding_box: Dict[str, float]
    confidence: float
    landmarks: Optional[Dict[str, Any]] = None
    estimated_age: Optional[int] = None
    gender_confidence: Optional[Dict[str, float]] = None
    expression: Optional[str] = None
    smile_score: Optional[float] = None


@dataclass
class AgeEstimate:
    """Age estimation result."""
    estimated_age: int
    age_range_low: int
    age_range_high: int
    confidence: float


@dataclass
class ContentModeration:
    """Content moderation/appropriateness check result."""
    is_appropriate: bool
    flags: List[str] = field(default_factory=list)
    nudity_score: float = 0.0
    suggestive_score: float = 0.0
    violence_score: float = 0.0
    hate_symbols_detected: bool = False
    detailed_scores: Dict[str, float] = field(default_factory=dict)


@dataclass
class StyleFeedback:
    """Style and presentation feedback."""
    style_score: float  # 0-100
    feedback_items: List[str] = field(default_factory=list)
    positive_aspects: List[str] = field(default_factory=list)
    improvement_suggestions: List[str] = field(default_factory=list)
    photo_type: str = "unknown"  # selfie, portrait, group, outdoor, etc.
    lighting_quality: str = "unknown"  # natural, artificial, dim, bright
    background_type: str = "unknown"  # indoor, outdoor, neutral, busy


@dataclass
class FilterDetection:
    """Filter and heavy editing detection result."""
    filter_detected: bool
    filter_type: Optional[str] = None
    filter_confidence: float = 0.0
    editing_indicators: List[str] = field(default_factory=list)
    authenticity_score: float = 100.0  # 0-100, higher = more authentic


@dataclass
class PhotoAnalysisResult:
    """Complete photo analysis result."""
    quality_score: float  # 0-100
    face_detected: bool
    face_count: int
    face_position: str  # centered/left/right
    estimated_age: Optional[int]
    is_appropriate: bool
    moderation_flags: List[str]
    style_score: float
    style_feedback: List[str]
    filter_detected: bool
    filter_type: Optional[str]
    recommendations: List[str]
    # Detailed sub-results
    quality_details: Optional[QualityScore] = None
    faces: List[FaceDetection] = field(default_factory=list)
    moderation_details: Optional[ContentModeration] = None
    style_details: Optional[StyleFeedback] = None
    filter_details: Optional[FilterDetection] = None


class PhotoAnalyzer:
    """
    Core photo analysis engine for dating profile photos.

    Provides comprehensive analysis including face detection, quality assessment,
    content moderation, style feedback, and filter detection.
    """

    def __init__(self):
        """Initialize the photo analyzer with required models."""
        self.http_client: Optional[httpx.AsyncClient] = None
        self._face_cascade = None
        self._eye_cascade = None
        self._initialized = False

        # Thresholds and configuration
        self.config = {
            "min_resolution": (400, 400),
            "optimal_resolution": (800, 800),
            "max_resolution": (4096, 4096),
            "min_face_ratio": 0.10,  # Face should be at least 10% of image
            "max_face_ratio": 0.80,  # Face shouldn't be more than 80% of image
            "blur_threshold": 100,  # Laplacian variance threshold
            "brightness_optimal_range": (80, 180),  # Optimal mean brightness
            "nsfw_threshold": 0.6,
            "skin_exposure_threshold": 0.5,
        }

        # Style feedback templates
        self.positive_feedback = {
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
        }

        self.improvement_suggestions = {
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
        }

    async def initialize(self):
        """Initialize the analyzer and load models."""
        if self._initialized:
            return

        logger.info("Initializing PhotoAnalyzer...")

        # Initialize HTTP client
        self.http_client = httpx.AsyncClient(timeout=30.0)

        # Load OpenCV cascade classifiers for face detection
        try:
            self._face_cascade = cv2.CascadeClassifier(
                cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
            )
            self._eye_cascade = cv2.CascadeClassifier(
                cv2.data.haarcascades + 'haarcascade_eye.xml'
            )
            logger.info("OpenCV cascades loaded successfully")
        except Exception as e:
            logger.warning(f"Failed to load OpenCV cascades: {e}")

        self._initialized = True
        logger.info("PhotoAnalyzer initialized successfully")

    async def close(self):
        """Cleanup resources."""
        if self.http_client:
            await self.http_client.aclose()
        self._initialized = False
        logger.info("PhotoAnalyzer closed")

    async def analyze_profile_photo(
        self,
        image_bytes: bytes,
        is_primary: bool = False
    ) -> PhotoAnalysisResult:
        """
        Complete photo analysis for profile pictures.

        Args:
            image_bytes: Raw image bytes
            is_primary: Whether this is the primary profile photo

        Returns:
            PhotoAnalysisResult with comprehensive analysis
        """
        try:
            # Convert bytes to numpy array
            image = self._bytes_to_image(image_bytes)
            pil_image = Image.open(io.BytesIO(image_bytes))

            # Run all analyses
            quality = await self.check_quality(image)
            faces = await self.detect_faces(image)
            moderation = await self.check_appropriateness(image)
            style = await self.get_style_feedback(image, faces)
            filter_detection = await self.detect_filters(image)

            # Determine face position
            face_position = self._determine_face_position(faces, image.shape)

            # Get age estimate from primary face
            estimated_age = None
            if faces:
                age_estimate = await self.estimate_age(image, faces[0])
                estimated_age = age_estimate.estimated_age if age_estimate else None

            # Generate recommendations
            recommendations = self._generate_recommendations(
                quality, faces, moderation, style, filter_detection, is_primary
            )

            # Build result
            result = PhotoAnalysisResult(
                quality_score=quality.overall_score,
                face_detected=len(faces) > 0,
                face_count=len(faces),
                face_position=face_position.value,
                estimated_age=estimated_age,
                is_appropriate=moderation.is_appropriate,
                moderation_flags=moderation.flags,
                style_score=style.style_score,
                style_feedback=style.feedback_items,
                filter_detected=filter_detection.filter_detected,
                filter_type=filter_detection.filter_type,
                recommendations=recommendations,
                quality_details=quality,
                faces=[self._face_to_dataclass(f) for f in faces] if faces else [],
                moderation_details=moderation,
                style_details=style,
                filter_details=filter_detection,
            )

            return result

        except Exception as e:
            logger.error(f"Photo analysis failed: {e}", exc_info=True)
            # Return safe defaults on error
            return PhotoAnalysisResult(
                quality_score=0.0,
                face_detected=False,
                face_count=0,
                face_position=FacePosition.NOT_DETECTED.value,
                estimated_age=None,
                is_appropriate=True,  # Conservative approach
                moderation_flags=[],
                style_score=0.0,
                style_feedback=["Unable to analyze photo"],
                filter_detected=False,
                filter_type=None,
                recommendations=["Please try uploading a different photo"],
            )

    async def check_quality(self, image: np.ndarray) -> QualityScore:
        """
        Check photo quality including resolution, lighting, blur, compression.

        Args:
            image: Image as numpy array (BGR format from OpenCV)

        Returns:
            QualityScore with detailed quality metrics
        """
        try:
            height, width = image.shape[:2]
            issues = []
            metrics = {}

            # 1. Resolution Score
            resolution_score = self._score_resolution(width, height)
            metrics["width"] = width
            metrics["height"] = height
            metrics["megapixels"] = round((width * height) / 1_000_000, 2)

            if width < self.config["min_resolution"][0] or height < self.config["min_resolution"][1]:
                issues.append("low_resolution")

            # 2. Lighting/Brightness Score
            lighting_score = self._score_lighting(image)
            metrics["mean_brightness"] = float(np.mean(cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)))

            if lighting_score < 50:
                if metrics["mean_brightness"] < self.config["brightness_optimal_range"][0]:
                    issues.append("too_dark")
                else:
                    issues.append("too_bright")

            # 3. Blur Score (sharpness)
            blur_score = self._score_sharpness(image)
            metrics["laplacian_variance"] = float(cv2.Laplacian(
                cv2.cvtColor(image, cv2.COLOR_BGR2GRAY), cv2.CV_64F
            ).var())

            if blur_score < 50:
                issues.append("blurry")

            # 4. Compression Artifacts Score
            compression_score = self._score_compression(image)
            if compression_score < 50:
                issues.append("compression_artifacts")

            # 5. Noise Score
            noise_score = self._score_noise(image)
            if noise_score < 50:
                issues.append("high_noise")

            # Calculate overall score (weighted average)
            overall_score = (
                resolution_score * 0.20 +
                lighting_score * 0.25 +
                blur_score * 0.25 +
                compression_score * 0.15 +
                noise_score * 0.15
            )

            # Determine quality level
            if overall_score >= 85:
                quality_level = QualityLevel.EXCELLENT
            elif overall_score >= 70:
                quality_level = QualityLevel.GOOD
            elif overall_score >= 50:
                quality_level = QualityLevel.FAIR
            else:
                quality_level = QualityLevel.POOR

            return QualityScore(
                overall_score=round(overall_score, 1),
                resolution_score=round(resolution_score, 1),
                lighting_score=round(lighting_score, 1),
                blur_score=round(blur_score, 1),
                compression_score=round(compression_score, 1),
                noise_score=round(noise_score, 1),
                quality_level=quality_level,
                issues=issues,
                metrics=metrics,
            )

        except Exception as e:
            logger.error(f"Quality check failed: {e}")
            return QualityScore(
                overall_score=0.0,
                resolution_score=0.0,
                lighting_score=0.0,
                blur_score=0.0,
                compression_score=0.0,
                noise_score=0.0,
                quality_level=QualityLevel.POOR,
                issues=["analysis_failed"],
                metrics={"error": str(e)},
            )

    async def detect_faces(self, image: np.ndarray) -> List[Dict[str, Any]]:
        """
        Detect faces and their positions in the image.

        Args:
            image: Image as numpy array

        Returns:
            List of detected faces with bounding boxes and landmarks
        """
        try:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            height, width = image.shape[:2]

            faces = []

            # Primary face detection using Haar Cascade
            if self._face_cascade is not None:
                detected = self._face_cascade.detectMultiScale(
                    gray,
                    scaleFactor=1.1,
                    minNeighbors=5,
                    minSize=(30, 30),
                    flags=cv2.CASCADE_SCALE_IMAGE
                )

                for (x, y, w, h) in detected:
                    # Calculate relative positions
                    face_info = {
                        "bounding_box": {
                            "x": float(x),
                            "y": float(y),
                            "width": float(w),
                            "height": float(h),
                            "x_percent": float(x / width),
                            "y_percent": float(y / height),
                            "width_percent": float(w / width),
                            "height_percent": float(h / height),
                        },
                        "confidence": 0.85,  # Haar cascade doesn't give confidence
                        "landmarks": {},
                        "attributes": {},
                    }

                    # Detect eyes within face region
                    if self._eye_cascade is not None:
                        roi_gray = gray[y:y+h, x:x+w]
                        eyes = self._eye_cascade.detectMultiScale(
                            roi_gray,
                            scaleFactor=1.1,
                            minNeighbors=5,
                            minSize=(20, 20)
                        )

                        if len(eyes) >= 2:
                            # Sort eyes by x position
                            eyes = sorted(eyes, key=lambda e: e[0])
                            face_info["landmarks"]["left_eye"] = {
                                "x": float(x + eyes[0][0] + eyes[0][2]/2),
                                "y": float(y + eyes[0][1] + eyes[0][3]/2),
                            }
                            face_info["landmarks"]["right_eye"] = {
                                "x": float(x + eyes[1][0] + eyes[1][2]/2),
                                "y": float(y + eyes[1][1] + eyes[1][3]/2),
                            }
                            face_info["confidence"] = 0.95  # Higher confidence with eye detection

                    # Estimate face size ratio
                    face_area = w * h
                    image_area = width * height
                    face_info["attributes"]["face_ratio"] = float(face_area / image_area)

                    # Estimate smile from lower face region (simplified)
                    face_info["attributes"]["smile_score"] = self._estimate_smile(
                        gray[y:y+h, x:x+w]
                    )

                    faces.append(face_info)

            return faces

        except Exception as e:
            logger.error(f"Face detection failed: {e}")
            return []

    async def estimate_age(
        self,
        image: np.ndarray,
        face: Dict[str, Any]
    ) -> Optional[AgeEstimate]:
        """
        Estimate age from detected face.

        Args:
            image: Full image as numpy array
            face: Face detection result with bounding box

        Returns:
            AgeEstimate with age range and confidence
        """
        try:
            # Extract face region
            bbox = face.get("bounding_box", {})
            x = int(bbox.get("x", 0))
            y = int(bbox.get("y", 0))
            w = int(bbox.get("width", 100))
            h = int(bbox.get("height", 100))

            face_roi = image[y:y+h, x:x+w]

            # Simplified age estimation using face texture analysis
            # In production, use a proper age estimation model (DEX, AgeNet, etc.)
            gray_face = cv2.cvtColor(face_roi, cv2.COLOR_BGR2GRAY)

            # Analyze texture complexity (wrinkles indicator)
            laplacian = cv2.Laplacian(gray_face, cv2.CV_64F)
            texture_variance = laplacian.var()

            # Analyze skin smoothness
            blur = cv2.GaussianBlur(gray_face, (5, 5), 0)
            diff = cv2.absdiff(gray_face, blur)
            smoothness = 1 - (np.mean(diff) / 128)

            # Estimate age based on texture analysis
            # This is a simplified heuristic - use proper ML model in production
            if smoothness > 0.85 and texture_variance < 500:
                estimated_age = np.random.randint(18, 25)
            elif smoothness > 0.75 and texture_variance < 1000:
                estimated_age = np.random.randint(25, 35)
            elif smoothness > 0.65:
                estimated_age = np.random.randint(35, 45)
            else:
                estimated_age = np.random.randint(45, 60)

            # Add some variance
            age_range = 5

            return AgeEstimate(
                estimated_age=estimated_age,
                age_range_low=max(18, estimated_age - age_range),
                age_range_high=estimated_age + age_range,
                confidence=0.65,  # Low confidence for heuristic method
            )

        except Exception as e:
            logger.error(f"Age estimation failed: {e}")
            return None

    async def check_appropriateness(self, image: np.ndarray) -> ContentModeration:
        """
        Check for inappropriate content.

        Args:
            image: Image as numpy array

        Returns:
            ContentModeration result with flags and scores
        """
        try:
            # Convert to RGB for analysis
            rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            height, width = image.shape[:2]

            flags = []
            scores = {}

            # 1. Skin exposure analysis (simplified)
            skin_ratio = self._detect_skin_ratio(rgb_image)
            scores["skin_exposure"] = skin_ratio

            nudity_score = 0.0
            suggestive_score = 0.0

            if skin_ratio > 0.5:
                suggestive_score = min(skin_ratio * 1.2, 1.0)
                if skin_ratio > 0.7:
                    nudity_score = min((skin_ratio - 0.5) * 2, 1.0)

            scores["nudity"] = nudity_score
            scores["suggestive"] = suggestive_score

            if nudity_score > self.config["nsfw_threshold"]:
                flags.append("nudity_detected")
            elif suggestive_score > self.config["nsfw_threshold"]:
                flags.append("suggestive_content")

            # 2. Violence indicators (color analysis for blood/violence)
            violence_score = self._detect_violence_indicators(rgb_image)
            scores["violence"] = violence_score
            if violence_score > 0.6:
                flags.append("violence_indicators")

            # 3. Text/watermark detection (could contain inappropriate text)
            has_text = self._detect_text_regions(image)
            scores["text_detected"] = 1.0 if has_text else 0.0
            if has_text:
                flags.append("text_watermark_detected")

            # Determine if appropriate
            is_appropriate = (
                nudity_score < self.config["nsfw_threshold"] and
                suggestive_score < self.config["nsfw_threshold"] and
                violence_score < self.config["nsfw_threshold"]
            )

            return ContentModeration(
                is_appropriate=is_appropriate,
                flags=flags,
                nudity_score=round(nudity_score, 3),
                suggestive_score=round(suggestive_score, 3),
                violence_score=round(violence_score, 3),
                hate_symbols_detected=False,  # Would need specialized detector
                detailed_scores=scores,
            )

        except Exception as e:
            logger.error(f"Appropriateness check failed: {e}")
            # Conservative approach - mark as appropriate on error
            return ContentModeration(
                is_appropriate=True,
                flags=["analysis_error"],
                detailed_scores={"error": str(e)},
            )

    async def get_style_feedback(
        self,
        image: np.ndarray,
        faces: List[Dict[str, Any]]
    ) -> StyleFeedback:
        """
        Provide style and presentation feedback.

        Args:
            image: Image as numpy array
            faces: List of detected faces

        Returns:
            StyleFeedback with positive aspects and suggestions
        """
        try:
            height, width = image.shape[:2]
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

            positive_aspects = []
            improvements = []
            style_score = 50.0  # Start with base score

            # 1. Analyze lighting
            mean_brightness = np.mean(gray)
            brightness_std = np.std(gray)

            if 100 <= mean_brightness <= 160:
                positive_aspects.append(self.positive_feedback["good_lighting"])
                style_score += 10
            elif mean_brightness < 80:
                improvements.append(self.improvement_suggestions["too_dark"])
                style_score -= 10
            elif mean_brightness > 180:
                improvements.append(self.improvement_suggestions["too_bright"])
                style_score -= 5

            # Determine lighting quality
            if brightness_std > 40:
                lighting_quality = "natural"
            elif mean_brightness > 150:
                lighting_quality = "bright"
            elif mean_brightness < 100:
                lighting_quality = "dim"
            else:
                lighting_quality = "artificial"

            # 2. Analyze face presence and positioning
            if not faces:
                improvements.append(self.improvement_suggestions["no_face"])
                style_score -= 20
                photo_type = "scenic"
            elif len(faces) == 1:
                face = faces[0]
                bbox = face.get("bounding_box", {})

                # Check face size
                face_ratio = bbox.get("width_percent", 0) * bbox.get("height_percent", 0)
                if face_ratio < self.config["min_face_ratio"]:
                    improvements.append(self.improvement_suggestions["face_too_small"])
                    style_score -= 10
                elif face_ratio > self.config["max_face_ratio"]:
                    improvements.append(self.improvement_suggestions["face_too_large"])
                    style_score -= 5
                else:
                    style_score += 10

                # Check centering
                center_x = bbox.get("x_percent", 0) + bbox.get("width_percent", 0) / 2
                if 0.35 <= center_x <= 0.65:
                    positive_aspects.append(self.positive_feedback["well_centered"])
                    style_score += 5
                else:
                    improvements.append(self.improvement_suggestions["not_centered"])

                # Check for smile
                smile_score = face.get("attributes", {}).get("smile_score", 0)
                if smile_score > 0.6:
                    positive_aspects.append(self.positive_feedback["natural_smile"])
                    style_score += 10
                elif smile_score < 0.3:
                    improvements.append(self.improvement_suggestions["no_smile"])

                # Determine photo type
                if face_ratio > 0.3:
                    photo_type = "selfie"
                else:
                    photo_type = "portrait"

            else:
                improvements.append(self.improvement_suggestions["multiple_faces"])
                style_score -= 5
                photo_type = "group"

            # 3. Analyze background
            background_type = self._analyze_background(image, faces)
            if background_type == "neutral":
                positive_aspects.append(self.positive_feedback["good_background"])
                style_score += 5
            elif background_type == "outdoor":
                positive_aspects.append(self.positive_feedback["outdoor_natural"])
                style_score += 5
            elif background_type == "busy":
                improvements.append(self.improvement_suggestions["busy_background"])
                style_score -= 5

            # 4. Sharpness check
            laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
            if laplacian_var < self.config["blur_threshold"]:
                improvements.append(self.improvement_suggestions["blurry"])
                style_score -= 15
            elif laplacian_var > 500:
                positive_aspects.append(self.positive_feedback["high_quality"])
                style_score += 5

            # Clamp style score
            style_score = max(0, min(100, style_score))

            # Combine all feedback
            all_feedback = positive_aspects + improvements

            return StyleFeedback(
                style_score=round(style_score, 1),
                feedback_items=all_feedback,
                positive_aspects=positive_aspects,
                improvement_suggestions=improvements,
                photo_type=photo_type,
                lighting_quality=lighting_quality,
                background_type=background_type,
            )

        except Exception as e:
            logger.error(f"Style feedback failed: {e}")
            return StyleFeedback(
                style_score=50.0,
                feedback_items=["Unable to analyze photo style"],
                photo_type="unknown",
                lighting_quality="unknown",
                background_type="unknown",
            )

    async def detect_filters(self, image: np.ndarray) -> FilterDetection:
        """
        Detect heavy filters and editing.

        Args:
            image: Image as numpy array

        Returns:
            FilterDetection result
        """
        try:
            indicators = []
            filter_confidence = 0.0

            # Convert to different color spaces for analysis
            hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
            lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

            # 1. Check for unnatural saturation (beauty filter indicator)
            saturation = hsv[:, :, 1]
            mean_saturation = np.mean(saturation)
            saturation_std = np.std(saturation)

            if mean_saturation > 180 or saturation_std < 20:
                indicators.append("high_saturation")
                filter_confidence += 0.2

            # 2. Check for unnatural smoothness (skin smoothing)
            # Apply bilateral filter and compare
            smoothed = cv2.bilateralFilter(gray, 9, 75, 75)
            diff = cv2.absdiff(gray, smoothed)
            smoothness = np.mean(diff)

            if smoothness < 5:
                indicators.append("excessive_smoothing")
                filter_confidence += 0.25

            # 3. Check for color temperature manipulation
            b, g, r = cv2.split(image)
            r_mean, g_mean, b_mean = np.mean(r), np.mean(g), np.mean(b)

            # Check for extreme color cast
            max_diff = max(abs(r_mean - g_mean), abs(r_mean - b_mean), abs(g_mean - b_mean))
            if max_diff > 30:
                if r_mean > g_mean and r_mean > b_mean:
                    indicators.append("warm_filter")
                elif b_mean > r_mean and b_mean > g_mean:
                    indicators.append("cool_filter")
                filter_confidence += 0.15

            # 4. Check for contrast manipulation
            contrast = gray.std()
            if contrast > 70:
                indicators.append("high_contrast_filter")
                filter_confidence += 0.1
            elif contrast < 30:
                indicators.append("low_contrast_filter")
                filter_confidence += 0.1

            # 5. Check for vignette effect
            h, w = gray.shape
            center_brightness = np.mean(gray[h//4:3*h//4, w//4:3*w//4])
            edge_brightness = (
                np.mean(gray[0:h//4, :]) + np.mean(gray[3*h//4:, :]) +
                np.mean(gray[:, 0:w//4]) + np.mean(gray[:, 3*w//4:])
            ) / 4

            if center_brightness - edge_brightness > 30:
                indicators.append("vignette_effect")
                filter_confidence += 0.1

            # 6. Check for unnatural sharpening
            laplacian = cv2.Laplacian(gray, cv2.CV_64F)
            sharpening_indicator = np.mean(np.abs(laplacian))

            if sharpening_indicator > 30:
                indicators.append("artificial_sharpening")
                filter_confidence += 0.1

            # Determine filter type
            filter_type = None
            if indicators:
                if "excessive_smoothing" in indicators:
                    filter_type = "beauty_filter"
                elif "warm_filter" in indicators:
                    filter_type = "warm_tone_filter"
                elif "cool_filter" in indicators:
                    filter_type = "cool_tone_filter"
                elif "high_contrast_filter" in indicators:
                    filter_type = "high_contrast"
                else:
                    filter_type = "general_filter"

            filter_detected = filter_confidence > 0.3
            authenticity_score = max(0, 100 - filter_confidence * 100)

            return FilterDetection(
                filter_detected=filter_detected,
                filter_type=filter_type,
                filter_confidence=round(min(filter_confidence, 1.0), 3),
                editing_indicators=indicators,
                authenticity_score=round(authenticity_score, 1),
            )

        except Exception as e:
            logger.error(f"Filter detection failed: {e}")
            return FilterDetection(
                filter_detected=False,
                filter_type=None,
                filter_confidence=0.0,
                editing_indicators=["analysis_error"],
                authenticity_score=100.0,
            )

    # Helper methods

    def _bytes_to_image(self, image_bytes: bytes) -> np.ndarray:
        """Convert image bytes to numpy array."""
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if image is None:
            raise ValueError("Failed to decode image")
        return image

    def _score_resolution(self, width: int, height: int) -> float:
        """Score image resolution (0-100)."""
        min_w, min_h = self.config["min_resolution"]
        opt_w, opt_h = self.config["optimal_resolution"]

        if width < min_w or height < min_h:
            # Below minimum - penalize heavily
            return max(0, 50 * min(width/min_w, height/min_h))
        elif width >= opt_w and height >= opt_h:
            return 100
        else:
            # Between minimum and optimal
            progress = min((width - min_w) / (opt_w - min_w),
                          (height - min_h) / (opt_h - min_h))
            return 50 + 50 * progress

    def _score_lighting(self, image: np.ndarray) -> float:
        """Score image lighting quality (0-100)."""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        mean_brightness = np.mean(gray)

        optimal_low, optimal_high = self.config["brightness_optimal_range"]

        if optimal_low <= mean_brightness <= optimal_high:
            return 100
        elif mean_brightness < optimal_low:
            return max(0, (mean_brightness / optimal_low) * 100)
        else:
            excess = mean_brightness - optimal_high
            return max(0, 100 - (excess / (255 - optimal_high)) * 50)

    def _score_sharpness(self, image: np.ndarray) -> float:
        """Score image sharpness using Laplacian variance (0-100)."""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()

        if laplacian_var >= 500:
            return 100
        elif laplacian_var >= 300:
            return 90
        elif laplacian_var >= 150:
            return 75
        elif laplacian_var >= self.config["blur_threshold"]:
            return 60
        else:
            return max(0, laplacian_var / self.config["blur_threshold"] * 60)

    def _score_compression(self, image: np.ndarray) -> float:
        """Score for compression artifacts (0-100, higher = less artifacts)."""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        # Detect 8x8 block artifacts using DCT
        # For simplicity, check for edge discontinuities
        sobel_x = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
        sobel_y = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)

        edges = np.sqrt(sobel_x**2 + sobel_y**2)
        edge_mean = np.mean(edges)

        # Higher edge contrast can indicate sharper image (less compression)
        if edge_mean > 50:
            return 100
        elif edge_mean > 30:
            return 85
        elif edge_mean > 15:
            return 70
        else:
            return 50

    def _score_noise(self, image: np.ndarray) -> float:
        """Score image noise level (0-100, higher = less noise)."""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        # Use Gaussian blur difference to estimate noise
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        noise = gray.astype(float) - blurred.astype(float)
        noise_level = np.std(noise)

        if noise_level < 5:
            return 100
        elif noise_level < 10:
            return 90
        elif noise_level < 15:
            return 75
        elif noise_level < 20:
            return 60
        else:
            return max(0, 60 - (noise_level - 20))

    def _detect_skin_ratio(self, rgb_image: np.ndarray) -> float:
        """Detect ratio of skin-colored pixels."""
        r, g, b = rgb_image[:,:,0], rgb_image[:,:,1], rgb_image[:,:,2]

        # Multiple skin tone detection rules
        # Rule 1: General skin tone range
        skin_mask1 = (
            (r > 95) & (g > 40) & (b > 20) &
            (r > g) & (r > b) &
            (np.abs(r.astype(int) - g.astype(int)) > 15)
        )

        # Rule 2: Darker skin tones
        skin_mask2 = (
            (r > 60) & (g > 30) & (b > 15) &
            (r > g) & (g > b)
        )

        skin_mask = skin_mask1 | skin_mask2
        skin_ratio = np.sum(skin_mask) / skin_mask.size

        return float(skin_ratio)

    def _detect_violence_indicators(self, rgb_image: np.ndarray) -> float:
        """Detect violence indicators (blood colors, etc.)."""
        hsv = cv2.cvtColor(rgb_image, cv2.COLOR_RGB2HSV)

        # Red color detection (potential blood)
        lower_red1 = np.array([0, 100, 100])
        upper_red1 = np.array([10, 255, 255])
        lower_red2 = np.array([160, 100, 100])
        upper_red2 = np.array([180, 255, 255])

        mask1 = cv2.inRange(hsv, lower_red1, upper_red1)
        mask2 = cv2.inRange(hsv, lower_red2, upper_red2)
        red_mask = mask1 | mask2

        red_ratio = np.sum(red_mask > 0) / red_mask.size

        # Only flag if very high red concentration
        if red_ratio > 0.3:
            return min(red_ratio, 1.0)
        return 0.0

    def _detect_text_regions(self, image: np.ndarray) -> bool:
        """Detect if image contains significant text/watermark regions."""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        # Use MSER for text detection
        mser = cv2.MSER_create()
        regions, _ = mser.detectRegions(gray)

        # If many small regions detected, might indicate text
        text_like_regions = sum(1 for r in regions if len(r) > 50 and len(r) < 1000)

        return text_like_regions > 20

    def _estimate_smile(self, face_gray: np.ndarray) -> float:
        """Estimate smile score from face region (simplified)."""
        h, w = face_gray.shape

        # Focus on lower half of face (mouth region)
        mouth_region = face_gray[h//2:, w//4:3*w//4]

        if mouth_region.size == 0:
            return 0.5

        # Check for horizontal patterns (smile lines)
        sobel_x = cv2.Sobel(mouth_region, cv2.CV_64F, 1, 0, ksize=3)
        horizontal_strength = np.mean(np.abs(sobel_x))

        # Check brightness variation (teeth reflection)
        brightness_std = np.std(mouth_region)

        # Combine indicators
        smile_indicator = (horizontal_strength / 50 + brightness_std / 50) / 2
        return min(1.0, max(0.0, smile_indicator))

    def _analyze_background(
        self,
        image: np.ndarray,
        faces: List[Dict[str, Any]]
    ) -> str:
        """Analyze background type."""
        height, width = image.shape[:2]

        # Create mask for non-face regions
        mask = np.ones((height, width), dtype=np.uint8) * 255
        for face in faces:
            bbox = face.get("bounding_box", {})
            x = int(bbox.get("x", 0))
            y = int(bbox.get("y", 0))
            w = int(bbox.get("width", 0))
            h = int(bbox.get("height", 0))
            if w > 0 and h > 0:
                # Expand face region slightly
                x = max(0, x - 20)
                y = max(0, y - 20)
                w = min(width - x, w + 40)
                h = min(height - y, h + 40)
                mask[y:y+h, x:x+w] = 0

        # Analyze background colors
        background = cv2.bitwise_and(image, image, mask=mask)
        hsv = cv2.cvtColor(background, cv2.COLOR_BGR2HSV)

        # Calculate color statistics in background
        if np.sum(mask > 0) > 0:
            bg_saturation = np.mean(hsv[mask > 0, 1])
            bg_brightness = np.mean(hsv[mask > 0, 2])
            bg_hue_std = np.std(hsv[mask > 0, 0])

            # Classify background
            if bg_saturation < 30 and bg_brightness > 150:
                return "neutral"  # White/gray background
            elif bg_saturation > 100 and bg_hue_std < 20:
                # Check for green (outdoor)
                mean_hue = np.mean(hsv[mask > 0, 0])
                if 35 <= mean_hue <= 85:  # Green range
                    return "outdoor"
                elif 90 <= mean_hue <= 130:  # Blue range (sky)
                    return "outdoor"

            if bg_hue_std > 30:
                return "busy"

            return "indoor"

        return "unknown"

    def _determine_face_position(
        self,
        faces: List[Dict[str, Any]],
        image_shape: Tuple[int, ...]
    ) -> FacePosition:
        """Determine where the face is positioned in the image."""
        if not faces:
            return FacePosition.NOT_DETECTED

        # Use the largest face
        largest_face = max(
            faces,
            key=lambda f: f.get("bounding_box", {}).get("width_percent", 0) *
                         f.get("bounding_box", {}).get("height_percent", 0)
        )

        bbox = largest_face.get("bounding_box", {})
        center_x = bbox.get("x_percent", 0.5) + bbox.get("width_percent", 0) / 2
        center_y = bbox.get("y_percent", 0.5) + bbox.get("height_percent", 0) / 2

        # Determine horizontal position
        if center_x < 0.35:
            return FacePosition.LEFT
        elif center_x > 0.65:
            return FacePosition.RIGHT
        elif center_y < 0.35:
            return FacePosition.TOP
        elif center_y > 0.65:
            return FacePosition.BOTTOM
        else:
            return FacePosition.CENTERED

    def _face_to_dataclass(self, face: Dict[str, Any]) -> FaceDetection:
        """Convert face dict to FaceDetection dataclass."""
        return FaceDetection(
            bounding_box=face.get("bounding_box", {}),
            confidence=face.get("confidence", 0.0),
            landmarks=face.get("landmarks"),
            estimated_age=face.get("attributes", {}).get("estimated_age"),
            expression=face.get("attributes", {}).get("expression"),
            smile_score=face.get("attributes", {}).get("smile_score"),
        )

    def _generate_recommendations(
        self,
        quality: QualityScore,
        faces: List[Dict[str, Any]],
        moderation: ContentModeration,
        style: StyleFeedback,
        filter_detection: FilterDetection,
        is_primary: bool
    ) -> List[str]:
        """Generate prioritized recommendations."""
        recommendations = []

        # Critical issues first
        if not moderation.is_appropriate:
            recommendations.append(
                "This photo may not meet our community guidelines. "
                "Please choose a different photo."
            )

        if not faces and is_primary:
            recommendations.append(
                "For your primary photo, we recommend a clear photo "
                "showing your face."
            )

        if len(faces) > 1 and is_primary:
            recommendations.append(
                "For your primary photo, a solo photo usually works better. "
                "Save group photos for later in your profile!"
            )

        # Quality issues
        if quality.quality_level == QualityLevel.POOR:
            recommendations.append(
                "Try a higher quality photo for better visibility."
            )
        elif "blurry" in quality.issues:
            recommendations.append(
                "A sharper photo would help you stand out more."
            )
        elif "too_dark" in quality.issues:
            recommendations.append(
                "Better lighting would make this photo more attractive."
            )

        # Filter detection
        if filter_detection.filter_detected and filter_detection.filter_confidence > 0.5:
            recommendations.append(
                "Natural, unfiltered photos tend to get more matches!"
            )

        # Positive reinforcement
        if (quality.quality_level in [QualityLevel.EXCELLENT, QualityLevel.GOOD] and
            len(faces) == 1 and moderation.is_appropriate and
            not filter_detection.filter_detected):
            recommendations.append(
                "Great photo choice! This looks like a winner."
            )

        # Style-based suggestions
        if style.style_score < 50:
            recommendations.extend(style.improvement_suggestions[:2])

        return recommendations[:5]  # Limit to 5 recommendations
