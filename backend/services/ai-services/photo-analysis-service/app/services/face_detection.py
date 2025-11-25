"""Face detection and verification service."""

from typing import Any, Dict, List, Optional, Tuple
import io
import numpy as np
from PIL import Image
import structlog

from app.config import Settings

logger = structlog.get_logger()


class FaceDetectionService:
    """Service for face detection and verification."""

    def __init__(self, settings: Settings):
        self.settings = settings
        self._face_detector = None
        self._face_encoder = None
        self._use_azure = bool(settings.AZURE_FACE_ENDPOINT)

    async def initialize(self):
        """Initialize face detection models."""
        if self._use_azure:
            logger.info("Using Azure Face API for face detection")
        else:
            logger.info("Loading local face detection models")
            try:
                import face_recognition
                self._face_recognition = face_recognition
                logger.info("Face recognition models loaded")
            except ImportError:
                logger.warning("face_recognition not available, using fallback")
                import cv2
                self._cv2 = cv2
                # Load Haar cascade as fallback
                self._face_cascade = cv2.CascadeClassifier(
                    cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
                )

    async def detect(self, image_data: bytes) -> Dict[str, Any]:
        """
        Detect faces in an image.

        Args:
            image_data: Raw image bytes

        Returns:
            Dict with detection results
        """
        if self._use_azure:
            return await self._detect_azure(image_data)
        else:
            return await self._detect_local(image_data)

    async def _detect_local(self, image_data: bytes) -> Dict[str, Any]:
        """Detect faces using local models."""
        # Convert to numpy array
        image = Image.open(io.BytesIO(image_data))
        image_np = np.array(image)

        # Convert to RGB if necessary
        if len(image_np.shape) == 2:
            image_np = np.stack([image_np] * 3, axis=-1)
        elif image_np.shape[2] == 4:
            image_np = image_np[:, :, :3]

        face_locations = []
        face_quality_scores = []

        try:
            if hasattr(self, '_face_recognition'):
                # Use face_recognition library
                locations = self._face_recognition.face_locations(
                    image_np,
                    model=self.settings.FACE_DETECTION_MODEL
                )

                for loc in locations:
                    top, right, bottom, left = loc
                    face_locations.append({
                        "x": left,
                        "y": top,
                        "width": right - left,
                        "height": bottom - top
                    })

                    # Calculate face quality
                    face_img = image_np[top:bottom, left:right]
                    quality = self._calculate_face_quality(face_img)
                    face_quality_scores.append(quality)

            else:
                # Fallback to OpenCV
                gray = self._cv2.cvtColor(image_np, self._cv2.COLOR_RGB2GRAY)
                faces = self._face_cascade.detectMultiScale(
                    gray,
                    scaleFactor=1.1,
                    minNeighbors=5,
                    minSize=(self.settings.MIN_FACE_SIZE, self.settings.MIN_FACE_SIZE)
                )

                for (x, y, w, h) in faces:
                    face_locations.append({
                        "x": int(x),
                        "y": int(y),
                        "width": int(w),
                        "height": int(h)
                    })

                    face_img = image_np[y:y+h, x:x+w]
                    quality = self._calculate_face_quality(face_img)
                    face_quality_scores.append(quality)

        except Exception as e:
            logger.error("Face detection failed", error=str(e))
            return {
                "faces_detected": 0,
                "face_locations": [],
                "primary_face": None,
                "face_quality_scores": []
            }

        # Determine primary face (largest, most centered)
        primary_face = None
        if face_locations:
            primary_idx = self._find_primary_face(face_locations, image_np.shape)
            primary_face = face_locations[primary_idx]

        return {
            "faces_detected": len(face_locations),
            "face_locations": face_locations,
            "primary_face": primary_face,
            "face_quality_scores": face_quality_scores
        }

    async def _detect_azure(self, image_data: bytes) -> Dict[str, Any]:
        """Detect faces using Azure Face API."""
        try:
            from azure.cognitiveservices.vision.face import FaceClient
            from msrest.authentication import CognitiveServicesCredentials

            face_client = FaceClient(
                self.settings.AZURE_FACE_ENDPOINT,
                CognitiveServicesCredentials(self.settings.AZURE_FACE_KEY)
            )

            detected_faces = face_client.face.detect_with_stream(
                io.BytesIO(image_data),
                return_face_attributes=['age', 'gender', 'smile', 'facialHair', 'glasses'],
                detection_model='detection_03',
                recognition_model='recognition_04'
            )

            face_locations = []
            face_quality_scores = []

            for face in detected_faces:
                rect = face.face_rectangle
                face_locations.append({
                    "x": rect.left,
                    "y": rect.top,
                    "width": rect.width,
                    "height": rect.height,
                    "face_id": face.face_id,
                    "attributes": {
                        "age": face.face_attributes.age,
                        "smile": face.face_attributes.smile
                    }
                })
                # Azure doesn't provide direct quality score, estimate from size
                quality = min(100, (rect.width * rect.height) / 10000 * 100)
                face_quality_scores.append(quality)

            primary_face = face_locations[0] if face_locations else None

            return {
                "faces_detected": len(detected_faces),
                "face_locations": face_locations,
                "primary_face": primary_face,
                "face_quality_scores": face_quality_scores
            }

        except Exception as e:
            logger.error("Azure face detection failed", error=str(e))
            # Fallback to local detection
            return await self._detect_local(image_data)

    async def verify(
        self,
        reference_image: bytes,
        comparison_image: bytes
    ) -> Dict[str, Any]:
        """
        Verify if two images contain the same person.

        Args:
            reference_image: Reference photo bytes
            comparison_image: Photo to compare

        Returns:
            Dict with verification result
        """
        if self._use_azure:
            return await self._verify_azure(reference_image, comparison_image)
        else:
            return await self._verify_local(reference_image, comparison_image)

    async def _verify_local(
        self,
        reference_image: bytes,
        comparison_image: bytes
    ) -> Dict[str, Any]:
        """Verify faces using local models."""
        if not hasattr(self, '_face_recognition'):
            raise ValueError("Face verification requires face_recognition library")

        # Load images
        ref_img = self._face_recognition.load_image_file(io.BytesIO(reference_image))
        comp_img = self._face_recognition.load_image_file(io.BytesIO(comparison_image))

        # Get face encodings
        ref_encodings = self._face_recognition.face_encodings(ref_img)
        comp_encodings = self._face_recognition.face_encodings(comp_img)

        if not ref_encodings:
            raise ValueError("No face found in reference image")
        if not comp_encodings:
            raise ValueError("No face found in comparison image")

        # Compare faces
        face_distance = self._face_recognition.face_distance(
            [ref_encodings[0]], comp_encodings[0]
        )[0]

        # Convert distance to confidence (lower distance = higher confidence)
        confidence = max(0, 1 - face_distance)
        is_match = face_distance < 0.6  # Threshold for same person

        return {
            "is_match": is_match,
            "confidence": round(confidence * 100, 2),
            "face_distance": round(float(face_distance), 4)
        }

    async def _verify_azure(
        self,
        reference_image: bytes,
        comparison_image: bytes
    ) -> Dict[str, Any]:
        """Verify faces using Azure Face API."""
        try:
            from azure.cognitiveservices.vision.face import FaceClient
            from msrest.authentication import CognitiveServicesCredentials

            face_client = FaceClient(
                self.settings.AZURE_FACE_ENDPOINT,
                CognitiveServicesCredentials(self.settings.AZURE_FACE_KEY)
            )

            # Detect faces in both images
            ref_faces = face_client.face.detect_with_stream(
                io.BytesIO(reference_image),
                detection_model='detection_03',
                recognition_model='recognition_04'
            )

            comp_faces = face_client.face.detect_with_stream(
                io.BytesIO(comparison_image),
                detection_model='detection_03',
                recognition_model='recognition_04'
            )

            if not ref_faces:
                raise ValueError("No face found in reference image")
            if not comp_faces:
                raise ValueError("No face found in comparison image")

            # Verify faces
            verify_result = face_client.face.verify_face_to_face(
                ref_faces[0].face_id,
                comp_faces[0].face_id
            )

            return {
                "is_match": verify_result.is_identical,
                "confidence": round(verify_result.confidence * 100, 2),
                "face_distance": round(1 - verify_result.confidence, 4)
            }

        except Exception as e:
            logger.error("Azure face verification failed", error=str(e))
            return await self._verify_local(reference_image, comparison_image)

    def _calculate_face_quality(self, face_image: np.ndarray) -> float:
        """Calculate face quality score (0-100)."""
        if face_image.size == 0:
            return 0

        score = 50  # Base score

        # Size factor
        height, width = face_image.shape[:2]
        size_score = min(50, (width * height) / 10000 * 50)
        score += size_score * 0.3

        # Check brightness
        if len(face_image.shape) == 3:
            gray = np.mean(face_image, axis=2)
        else:
            gray = face_image

        brightness = np.mean(gray) / 255
        if 0.3 <= brightness <= 0.7:
            score += 20

        # Check contrast
        contrast = np.std(gray)
        if contrast > 30:
            score += 10

        return min(100, max(0, score))

    def _find_primary_face(
        self,
        face_locations: List[Dict],
        image_shape: Tuple[int, ...]
    ) -> int:
        """Find the primary face (largest and most centered)."""
        if not face_locations:
            return -1

        img_height, img_width = image_shape[:2]
        center_x, center_y = img_width / 2, img_height / 2

        best_idx = 0
        best_score = -1

        for i, face in enumerate(face_locations):
            # Calculate size score
            area = face["width"] * face["height"]
            size_score = area / (img_width * img_height)

            # Calculate center score
            face_center_x = face["x"] + face["width"] / 2
            face_center_y = face["y"] + face["height"] / 2

            dist_from_center = (
                (face_center_x - center_x) ** 2 +
                (face_center_y - center_y) ** 2
            ) ** 0.5

            max_dist = (center_x ** 2 + center_y ** 2) ** 0.5
            center_score = 1 - (dist_from_center / max_dist)

            # Combined score
            total_score = size_score * 0.6 + center_score * 0.4

            if total_score > best_score:
                best_score = total_score
                best_idx = i

        return best_idx
