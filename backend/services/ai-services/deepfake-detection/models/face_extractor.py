"""Face extraction and alignment utilities."""

import logging
from typing import List, Tuple, Optional, Dict, Any
from dataclasses import dataclass

import numpy as np
from PIL import Image
import cv2

logger = logging.getLogger(__name__)

# Try to import MTCNN from facenet_pytorch
try:
    from facenet_pytorch import MTCNN
    MTCNN_AVAILABLE = True
except ImportError:
    MTCNN_AVAILABLE = False
    logger.warning("facenet_pytorch not available, using OpenCV fallback for face detection")


@dataclass
class FaceRegion:
    """Represents a detected face region."""
    bbox: Tuple[int, int, int, int]  # (x1, y1, x2, y2)
    confidence: float
    landmarks: Optional[Dict[str, Tuple[float, float]]] = None
    face_image: Optional[Image.Image] = None


class FaceExtractor:
    """
    Face extraction and alignment for deepfake detection.

    Uses MTCNN for face detection with OpenCV cascade fallback.
    """

    def __init__(
        self,
        min_face_size: int = 80,
        margin: float = 0.3,
        selection_method: str = "largest",
        device: str = "cpu",
    ):
        """
        Initialize face extractor.

        Args:
            min_face_size: Minimum face size to detect
            margin: Margin around face for cropping (0.0 to 1.0)
            selection_method: How to select face if multiple detected
                            ('largest', 'center', 'all')
            device: Device for MTCNN ('cpu' or 'cuda')
        """
        self.min_face_size = min_face_size
        self.margin = margin
        self.selection_method = selection_method
        self.device = device

        # Initialize MTCNN if available
        if MTCNN_AVAILABLE:
            self.mtcnn = MTCNN(
                image_size=224,
                margin=0,
                min_face_size=min_face_size,
                thresholds=[0.6, 0.7, 0.7],
                factor=0.709,
                post_process=False,
                keep_all=True,
                device=device,
            )
            logger.info("Using MTCNN for face detection")
        else:
            self.mtcnn = None
            # Use OpenCV Haar cascade as fallback
            self.face_cascade = cv2.CascadeClassifier(
                cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
            )
            logger.info("Using OpenCV Haar cascade for face detection")

    def extract_faces(self, image: Image.Image) -> List[FaceRegion]:
        """
        Extract all faces from an image.

        Args:
            image: PIL Image

        Returns:
            List of FaceRegion objects
        """
        if self.mtcnn is not None:
            return self._extract_faces_mtcnn(image)
        else:
            return self._extract_faces_opencv(image)

    def _extract_faces_mtcnn(self, image: Image.Image) -> List[FaceRegion]:
        """Extract faces using MTCNN."""
        faces = []

        # Convert to RGB if necessary
        if image.mode != "RGB":
            image = image.convert("RGB")

        # Detect faces
        img_array = np.array(image)
        boxes, probs, landmarks = self.mtcnn.detect(image, landmarks=True)

        if boxes is None:
            return faces

        for i, (box, prob, landmark) in enumerate(zip(boxes, probs, landmarks)):
            if prob < 0.9:  # Confidence threshold
                continue

            x1, y1, x2, y2 = [int(coord) for coord in box]

            # Apply margin
            width = x2 - x1
            height = y2 - y1
            margin_x = int(width * self.margin)
            margin_y = int(height * self.margin)

            x1 = max(0, x1 - margin_x)
            y1 = max(0, y1 - margin_y)
            x2 = min(image.width, x2 + margin_x)
            y2 = min(image.height, y2 + margin_y)

            # Extract face image
            face_img = image.crop((x1, y1, x2, y2))

            # Parse landmarks
            landmark_dict = None
            if landmark is not None:
                landmark_dict = {
                    "left_eye": tuple(landmark[0]),
                    "right_eye": tuple(landmark[1]),
                    "nose": tuple(landmark[2]),
                    "left_mouth": tuple(landmark[3]),
                    "right_mouth": tuple(landmark[4]),
                }

            faces.append(FaceRegion(
                bbox=(x1, y1, x2, y2),
                confidence=float(prob),
                landmarks=landmark_dict,
                face_image=face_img,
            ))

        return faces

    def _extract_faces_opencv(self, image: Image.Image) -> List[FaceRegion]:
        """Extract faces using OpenCV Haar cascade."""
        faces = []

        # Convert to grayscale
        img_array = np.array(image.convert("L"))

        # Detect faces
        detected = self.face_cascade.detectMultiScale(
            img_array,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(self.min_face_size, self.min_face_size),
        )

        for (x, y, w, h) in detected:
            # Apply margin
            margin_x = int(w * self.margin)
            margin_y = int(h * self.margin)

            x1 = max(0, x - margin_x)
            y1 = max(0, y - margin_y)
            x2 = min(image.width, x + w + margin_x)
            y2 = min(image.height, y + h + margin_y)

            # Extract face image
            face_img = image.crop((x1, y1, x2, y2))

            faces.append(FaceRegion(
                bbox=(x1, y1, x2, y2),
                confidence=0.9,  # OpenCV doesn't provide confidence
                landmarks=None,
                face_image=face_img,
            ))

        return faces

    def select_face(self, faces: List[FaceRegion], image_size: Tuple[int, int]) -> Optional[FaceRegion]:
        """
        Select the primary face based on selection method.

        Args:
            faces: List of detected faces
            image_size: Original image size (width, height)

        Returns:
            Selected face or None
        """
        if not faces:
            return None

        if len(faces) == 1:
            return faces[0]

        if self.selection_method == "largest":
            # Select largest face by area
            return max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))

        elif self.selection_method == "center":
            # Select face closest to image center
            center_x, center_y = image_size[0] / 2, image_size[1] / 2

            def distance_to_center(face: FaceRegion) -> float:
                face_center_x = (face.bbox[0] + face.bbox[2]) / 2
                face_center_y = (face.bbox[1] + face.bbox[3]) / 2
                return ((face_center_x - center_x) ** 2 + (face_center_y - center_y) ** 2) ** 0.5

            return min(faces, key=distance_to_center)

        else:  # 'all' or other
            return faces[0]

    def get_primary_face(self, image: Image.Image) -> Optional[FaceRegion]:
        """
        Get the primary face from an image.

        Args:
            image: PIL Image

        Returns:
            Primary face or None if no face detected
        """
        faces = self.extract_faces(image)
        return self.select_face(faces, (image.width, image.height))

    def align_face(self, face: FaceRegion, target_size: Tuple[int, int] = (224, 224)) -> Optional[Image.Image]:
        """
        Align and resize face image.

        Args:
            face: FaceRegion with landmarks
            target_size: Target image size

        Returns:
            Aligned face image
        """
        if face.face_image is None:
            return None

        # If no landmarks, just resize
        if face.landmarks is None:
            return face.face_image.resize(target_size, Image.LANCZOS)

        # Align based on eye positions
        left_eye = np.array(face.landmarks["left_eye"])
        right_eye = np.array(face.landmarks["right_eye"])

        # Calculate angle
        dY = right_eye[1] - left_eye[1]
        dX = right_eye[0] - left_eye[0]
        angle = np.degrees(np.arctan2(dY, dX))

        # Rotate image to align eyes horizontally
        face_array = np.array(face.face_image)
        center = (face_array.shape[1] // 2, face_array.shape[0] // 2)
        rotation_matrix = cv2.getRotationMatrix2D(center, angle, 1.0)
        aligned = cv2.warpAffine(
            face_array,
            rotation_matrix,
            (face_array.shape[1], face_array.shape[0]),
            flags=cv2.INTER_LINEAR,
        )

        aligned_img = Image.fromarray(aligned)
        return aligned_img.resize(target_size, Image.LANCZOS)

    def check_face_quality(self, face: FaceRegion) -> Dict[str, Any]:
        """
        Check face quality for deepfake detection.

        Args:
            face: FaceRegion

        Returns:
            Quality metrics dict
        """
        quality = {
            "is_valid": True,
            "issues": [],
            "size_score": 1.0,
            "sharpness_score": 1.0,
        }

        if face.face_image is None:
            quality["is_valid"] = False
            quality["issues"].append("no_face_image")
            return quality

        width = face.bbox[2] - face.bbox[0]
        height = face.bbox[3] - face.bbox[1]

        # Check size
        if width < self.min_face_size or height < self.min_face_size:
            quality["issues"].append("face_too_small")
            quality["size_score"] = max(width, height) / self.min_face_size

        # Check sharpness using Laplacian variance
        gray = cv2.cvtColor(np.array(face.face_image), cv2.COLOR_RGB2GRAY)
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()

        if laplacian_var < 100:
            quality["issues"].append("blurry_face")
            quality["sharpness_score"] = laplacian_var / 100

        quality["is_valid"] = len(quality["issues"]) == 0

        return quality
