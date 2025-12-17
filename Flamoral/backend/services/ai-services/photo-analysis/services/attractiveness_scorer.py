"""Attractiveness scoring service using computer vision models."""

import logging
from typing import Dict, Any, List, Optional
import numpy as np
import aiohttp
import io
from PIL import Image
import torch
import torch.nn as nn
from torchvision import transforms, models

logger = logging.getLogger(__name__)


class AttractivenessModel(nn.Module):
    """Deep learning model for attractiveness scoring."""

    def __init__(self, pretrained: bool = True):
        super().__init__()
        # Use ResNet50 as base model
        self.base_model = models.resnet50(pretrained=pretrained)

        # Replace final layer for regression (score 0-10)
        num_features = self.base_model.fc.in_features
        self.base_model.fc = nn.Sequential(
            nn.Linear(num_features, 512),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(512, 128),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(128, 1),
            nn.Sigmoid()  # Output between 0 and 1, multiply by 10 for 0-10 scale
        )

    def forward(self, x):
        return self.base_model(x) * 10  # Scale to 0-10


class FacialFeatureAnalyzer:
    """Analyzes specific facial features that contribute to attractiveness."""

    @staticmethod
    def analyze_symmetry(face_landmarks: Dict) -> float:
        """
        Calculate facial symmetry score.

        Args:
            face_landmarks: Dictionary of facial landmarks

        Returns:
            Symmetry score from 0-10
        """
        if not face_landmarks:
            return 5.0

        # Calculate symmetry based on landmark distances
        # This is a simplified version - real implementation would use more sophisticated analysis
        try:
            left_eye = np.array(face_landmarks.get('left_eye', [0, 0]))
            right_eye = np.array(face_landmarks.get('right_eye', [0, 0]))
            nose = np.array(face_landmarks.get('nose', [0, 0]))

            # Calculate distances
            left_distance = np.linalg.norm(nose - left_eye)
            right_distance = np.linalg.norm(nose - right_eye)

            # Symmetry score based on distance ratio
            if max(left_distance, right_distance) > 0:
                symmetry_ratio = min(left_distance, right_distance) / max(left_distance, right_distance)
                return symmetry_ratio * 10

            return 5.0
        except Exception as e:
            logger.warning(f"Symmetry calculation failed: {e}")
            return 5.0

    @staticmethod
    def analyze_golden_ratio(face_landmarks: Dict) -> float:
        """
        Analyze adherence to golden ratio proportions.

        Args:
            face_landmarks: Dictionary of facial landmarks

        Returns:
            Golden ratio score from 0-10
        """
        if not face_landmarks:
            return 5.0

        try:
            # Calculate facial proportions
            # This is simplified - real implementation would use comprehensive measurements
            face_height = face_landmarks.get('chin', {}).get('y', 0) - face_landmarks.get('forehead', {}).get('y', 0)
            face_width = face_landmarks.get('right_cheek', {}).get('x', 0) - face_landmarks.get('left_cheek', {}).get('x', 0)

            if face_width > 0:
                ratio = face_height / face_width
                golden_ratio = 1.618

                # Score based on proximity to golden ratio
                difference = abs(ratio - golden_ratio)
                score = max(0, 10 - (difference * 5))
                return score

            return 5.0
        except Exception as e:
            logger.warning(f"Golden ratio calculation failed: {e}")
            return 5.0

    @staticmethod
    def analyze_skin_quality(image_array: np.ndarray, face_bbox: Dict) -> float:
        """
        Analyze skin quality and texture.

        Args:
            image_array: Image as numpy array
            face_bbox: Face bounding box coordinates

        Returns:
            Skin quality score from 0-10
        """
        try:
            # Extract face region
            x, y, w, h = face_bbox.get('x', 0), face_bbox.get('y', 0), face_bbox.get('width', 0), face_bbox.get('height', 0)
            face_region = image_array[y:y+h, x:x+w]

            # Calculate variance (smoothness indicator)
            variance = np.var(face_region)

            # Lower variance = smoother skin (generally more attractive)
            # Normalize to 0-10 scale
            smoothness_score = max(0, min(10, 10 - (variance / 1000)))

            # Calculate color uniformity
            mean_color = np.mean(face_region, axis=(0, 1))
            color_std = np.std(face_region, axis=(0, 1))
            uniformity_score = max(0, min(10, 10 - np.mean(color_std) / 10))

            # Combined skin quality score
            return (smoothness_score + uniformity_score) / 2
        except Exception as e:
            logger.warning(f"Skin quality analysis failed: {e}")
            return 5.0


class AttractivenessScorer:
    """Main service for scoring photo attractiveness."""

    def __init__(self):
        self.model: Optional[AttractivenessModel] = None
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])
        self.feature_analyzer = FacialFeatureAnalyzer()

    async def initialize(self):
        """Initialize the model and resources."""
        logger.info("Initializing Attractiveness Scorer...")

        try:
            self.model = AttractivenessModel(pretrained=True)

            # Load fine-tuned weights if available
            try:
                model_path = "models/attractiveness_model.pth"
                self.model.load_state_dict(torch.load(model_path, map_location=self.device))
                logger.info("Loaded pre-trained attractiveness model")
            except FileNotFoundError:
                logger.warning("Pre-trained model not found, using base model")

            self.model.to(self.device)
            self.model.eval()

            logger.info("Attractiveness Scorer initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize attractiveness scorer: {e}")
            raise

    async def close(self):
        """Cleanup resources."""
        logger.info("Closing Attractiveness Scorer")
        if self.model:
            del self.model
            self.model = None

    async def score(
        self,
        photo_url: str,
        face_info: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Score photo attractiveness.

        Args:
            photo_url: URL of the photo
            face_info: Optional face detection information

        Returns:
            Dictionary with attractiveness scores and analysis
        """
        try:
            # Download image
            image = await self._download_image(photo_url)

            # Get overall attractiveness score from model
            overall_score = await self._get_model_score(image)

            # Analyze specific features if face info provided
            feature_scores = {}
            if face_info:
                feature_scores = await self._analyze_features(image, face_info)

            # Calculate final score
            final_score = self._calculate_final_score(overall_score, feature_scores)

            # Generate detailed breakdown
            breakdown = self._generate_breakdown(overall_score, feature_scores)

            # Determine attractiveness level
            level = self._get_attractiveness_level(final_score)

            return {
                "overall_score": round(final_score, 2),
                "model_score": round(overall_score, 2),
                "feature_scores": {k: round(v, 2) for k, v in feature_scores.items()},
                "level": level,
                "breakdown": breakdown,
                "confidence": self._calculate_confidence(feature_scores)
            }
        except Exception as e:
            logger.error(f"Attractiveness scoring failed: {e}")
            raise

    async def _download_image(self, photo_url: str) -> Image.Image:
        """Download image from URL."""
        async with aiohttp.ClientSession() as session:
            async with session.get(photo_url) as response:
                if response.status != 200:
                    raise ValueError(f"Failed to download image: {response.status}")

                image_data = await response.read()
                return Image.open(io.BytesIO(image_data)).convert('RGB')

    async def _get_model_score(self, image: Image.Image) -> float:
        """Get attractiveness score from deep learning model."""
        try:
            # Preprocess image
            image_tensor = self.transform(image).unsqueeze(0).to(self.device)

            # Get prediction
            with torch.no_grad():
                score = self.model(image_tensor)
                return float(score.item())
        except Exception as e:
            logger.error(f"Model scoring failed: {e}")
            return 5.0

    async def _analyze_features(self, image: Image.Image, face_info: Dict) -> Dict[str, float]:
        """Analyze specific facial features."""
        scores = {}

        try:
            # Convert to numpy array for feature analysis
            image_array = np.array(image)

            # Get face landmarks if available
            landmarks = face_info.get('landmarks', {})
            bbox = face_info.get('bounding_box', {})

            # Analyze symmetry
            scores['symmetry'] = self.feature_analyzer.analyze_symmetry(landmarks)

            # Analyze golden ratio
            scores['golden_ratio'] = self.feature_analyzer.analyze_golden_ratio(landmarks)

            # Analyze skin quality
            scores['skin_quality'] = self.feature_analyzer.analyze_skin_quality(image_array, bbox)

            # Additional features
            scores['facial_structure'] = await self._analyze_facial_structure(landmarks)
            scores['eye_appeal'] = await self._analyze_eyes(landmarks)
            scores['smile_appeal'] = await self._analyze_smile(landmarks)

        except Exception as e:
            logger.warning(f"Feature analysis failed: {e}")

        return scores

    async def _analyze_facial_structure(self, landmarks: Dict) -> float:
        """Analyze facial structure appeal."""
        # Simplified implementation
        return 7.0

    async def _analyze_eyes(self, landmarks: Dict) -> float:
        """Analyze eye appeal."""
        # Simplified implementation
        return 7.5

    async def _analyze_smile(self, landmarks: Dict) -> float:
        """Analyze smile appeal."""
        # Simplified implementation
        return 7.0

    def _calculate_final_score(
        self,
        overall_score: float,
        feature_scores: Dict[str, float]
    ) -> float:
        """Calculate weighted final score."""
        if not feature_scores:
            return overall_score

        # Weight: 60% model, 40% features
        feature_avg = sum(feature_scores.values()) / len(feature_scores)
        final_score = (overall_score * 0.6) + (feature_avg * 0.4)

        return max(0, min(10, final_score))

    def _generate_breakdown(
        self,
        overall_score: float,
        feature_scores: Dict[str, float]
    ) -> Dict[str, Any]:
        """Generate detailed score breakdown."""
        breakdown = {
            "overall_impression": self._score_to_description(overall_score),
            "strengths": [],
            "areas_for_improvement": []
        }

        # Identify strengths and improvements
        for feature, score in feature_scores.items():
            if score >= 7.5:
                breakdown["strengths"].append(feature)
            elif score < 5.5:
                breakdown["areas_for_improvement"].append(feature)

        return breakdown

    def _score_to_description(self, score: float) -> str:
        """Convert score to description."""
        if score >= 8.5:
            return "Exceptional"
        elif score >= 7.5:
            return "Very attractive"
        elif score >= 6.5:
            return "Attractive"
        elif score >= 5.5:
            return "Above average"
        elif score >= 4.5:
            return "Average"
        else:
            return "Below average"

    def _get_attractiveness_level(self, score: float) -> str:
        """Get attractiveness level category."""
        if score >= 8.5:
            return "exceptional"
        elif score >= 7.5:
            return "very_high"
        elif score >= 6.5:
            return "high"
        elif score >= 5.5:
            return "above_average"
        elif score >= 4.5:
            return "average"
        else:
            return "below_average"

    def _calculate_confidence(self, feature_scores: Dict[str, float]) -> float:
        """Calculate confidence in the score."""
        if not feature_scores:
            return 0.7

        # Higher confidence when multiple features are analyzed
        # and scores are consistent
        variance = np.var(list(feature_scores.values()))
        confidence = max(0.5, min(1.0, 1.0 - (variance / 20)))

        return round(confidence, 2)
