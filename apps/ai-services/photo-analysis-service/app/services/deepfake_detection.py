"""Deepfake detection service."""

from typing import Any, Dict
import io
import numpy as np
from PIL import Image
import structlog

from app.config import Settings

logger = structlog.get_logger()


class DeepfakeDetectionService:
    """Service for detecting deepfake/AI-generated images."""

    def __init__(self, settings: Settings):
        self.settings = settings
        self._model = None
        self._transform = None

    async def initialize(self):
        """Initialize deepfake detection model."""
        logger.info("Initializing deepfake detection service")

        try:
            # Try to load a pre-trained deepfake detection model
            # Using a simple CNN-based approach for demonstration
            # In production, use models like EfficientNet or XceptionNet
            import torch
            import torchvision.transforms as transforms

            self._transform = transforms.Compose([
                transforms.Resize((224, 224)),
                transforms.ToTensor(),
                transforms.Normalize(
                    mean=[0.485, 0.456, 0.406],
                    std=[0.229, 0.224, 0.225]
                )
            ])

            # In production, load a trained deepfake detection model
            # self._model = torch.load('models/deepfake_detector.pt')
            # self._model.eval()

            logger.info("Deepfake detection initialized (using heuristic fallback)")

        except ImportError:
            logger.warning("PyTorch not available, using heuristic detection")

    async def detect(self, image_data: bytes) -> Dict[str, Any]:
        """
        Detect if an image is a deepfake/AI-generated.

        Args:
            image_data: Raw image bytes

        Returns:
            Dict with deepfake detection results
        """
        try:
            image = Image.open(io.BytesIO(image_data))
            image_np = np.array(image)

            # If model is available, use it
            if self._model is not None:
                return await self._detect_with_model(image)

            # Otherwise, use heuristic analysis
            return await self._detect_heuristic(image_np)

        except Exception as e:
            logger.error("Deepfake detection failed", error=str(e))
            return {
                "is_deepfake": False,
                "confidence": 0.0,
                "analysis_details": {
                    "error": str(e)
                }
            }

    async def _detect_with_model(self, image: Image.Image) -> Dict[str, Any]:
        """Detect deepfake using trained model."""
        import torch

        # Prepare image
        image_tensor = self._transform(image).unsqueeze(0)

        with torch.no_grad():
            output = self._model(image_tensor)
            probability = torch.sigmoid(output).item()

        is_deepfake = probability > self.settings.DEEPFAKE_THRESHOLD

        return {
            "is_deepfake": is_deepfake,
            "confidence": round(probability * 100, 2),
            "analysis_details": {
                "method": "neural_network",
                "raw_score": round(probability, 4)
            }
        }

    async def _detect_heuristic(self, image_np: np.ndarray) -> Dict[str, Any]:
        """
        Detect deepfake using heuristic analysis.

        This is a simplified approach that looks for common artifacts
        in AI-generated images. Not as accurate as trained models.
        """
        details = {}
        suspicion_score = 0

        # Check for unnatural color distribution
        color_score = self._check_color_distribution(image_np)
        details["color_analysis"] = color_score
        if color_score > 0.7:
            suspicion_score += 20

        # Check for noise patterns (GAN artifacts)
        noise_score = self._check_noise_patterns(image_np)
        details["noise_analysis"] = noise_score
        if noise_score > 0.6:
            suspicion_score += 25

        # Check for frequency domain anomalies
        frequency_score = self._check_frequency_domain(image_np)
        details["frequency_analysis"] = frequency_score
        if frequency_score > 0.7:
            suspicion_score += 30

        # Check for face symmetry anomalies
        symmetry_score = self._check_facial_symmetry(image_np)
        details["symmetry_analysis"] = symmetry_score
        if symmetry_score > 0.6:
            suspicion_score += 15

        # Check for boundary artifacts
        boundary_score = self._check_boundary_artifacts(image_np)
        details["boundary_analysis"] = boundary_score
        if boundary_score > 0.5:
            suspicion_score += 10

        # Normalize to 0-1 scale
        confidence = min(1.0, suspicion_score / 100)
        is_deepfake = confidence > self.settings.DEEPFAKE_THRESHOLD

        return {
            "is_deepfake": is_deepfake,
            "confidence": round(confidence * 100, 2),
            "analysis_details": {
                "method": "heuristic",
                **details
            }
        }

    def _check_color_distribution(self, image_np: np.ndarray) -> float:
        """
        Check for unnatural color distribution.

        AI-generated images often have smoother color gradients.
        """
        if len(image_np.shape) < 3:
            return 0.0

        # Calculate color histogram
        hist_r = np.histogram(image_np[:, :, 0], bins=256)[0]
        hist_g = np.histogram(image_np[:, :, 1], bins=256)[0]
        hist_b = np.histogram(image_np[:, :, 2], bins=256)[0]

        # Check for suspicious patterns (too smooth or too uniform)
        r_entropy = self._calculate_entropy(hist_r)
        g_entropy = self._calculate_entropy(hist_g)
        b_entropy = self._calculate_entropy(hist_b)

        avg_entropy = (r_entropy + g_entropy + b_entropy) / 3

        # Very low or very high entropy can be suspicious
        if avg_entropy < 4.0 or avg_entropy > 7.5:
            return 0.7
        return 0.3

    def _check_noise_patterns(self, image_np: np.ndarray) -> float:
        """
        Check for GAN-specific noise patterns.

        GANs often introduce characteristic noise patterns.
        """
        if len(image_np.shape) == 3:
            gray = np.mean(image_np, axis=2)
        else:
            gray = image_np

        # Calculate local variance
        kernel_size = 5
        local_vars = []

        for i in range(0, gray.shape[0] - kernel_size, kernel_size):
            for j in range(0, gray.shape[1] - kernel_size, kernel_size):
                patch = gray[i:i+kernel_size, j:j+kernel_size]
                local_vars.append(np.var(patch))

        if not local_vars:
            return 0.0

        # Check for suspiciously uniform variance
        var_of_vars = np.var(local_vars)
        mean_var = np.mean(local_vars)

        if mean_var > 0:
            normalized = var_of_vars / mean_var
            # Too uniform variance can indicate synthetic image
            if normalized < 0.5:
                return 0.7

        return 0.3

    def _check_frequency_domain(self, image_np: np.ndarray) -> float:
        """
        Check for frequency domain anomalies.

        AI-generated images often have different frequency characteristics.
        """
        try:
            if len(image_np.shape) == 3:
                gray = np.mean(image_np, axis=2)
            else:
                gray = image_np

            # Apply FFT
            f_transform = np.fft.fft2(gray)
            f_shift = np.fft.fftshift(f_transform)
            magnitude = np.abs(f_shift)

            # Analyze frequency distribution
            center = np.array(magnitude.shape) // 2
            high_freq_mask = np.ones_like(magnitude, dtype=bool)
            y, x = np.ogrid[:magnitude.shape[0], :magnitude.shape[1]]
            mask = ((x - center[1])**2 + (y - center[0])**2) <= (min(center) * 0.3)**2
            high_freq_mask[mask] = False

            high_freq_energy = np.sum(magnitude[high_freq_mask])
            total_energy = np.sum(magnitude)

            if total_energy > 0:
                ratio = high_freq_energy / total_energy
                # Very low high-frequency content can indicate AI generation
                if ratio < 0.1:
                    return 0.8

            return 0.3

        except Exception:
            return 0.0

    def _check_facial_symmetry(self, image_np: np.ndarray) -> float:
        """
        Check for unnatural facial symmetry.

        AI-generated faces can be unnaturally symmetric.
        """
        if len(image_np.shape) == 3:
            gray = np.mean(image_np, axis=2)
        else:
            gray = image_np

        # Flip image horizontally
        flipped = np.fliplr(gray)

        # Calculate similarity
        diff = np.abs(gray - flipped)
        similarity = 1 - (np.mean(diff) / 255)

        # Very high symmetry is suspicious
        if similarity > 0.95:
            return 0.7
        return 0.3

    def _check_boundary_artifacts(self, image_np: np.ndarray) -> float:
        """
        Check for boundary/edge artifacts.

        AI-generated images may have artifacts at edges.
        """
        if len(image_np.shape) == 3:
            gray = np.mean(image_np, axis=2)
        else:
            gray = image_np

        # Check edges for abnormalities
        edge_top = gray[:10, :]
        edge_bottom = gray[-10:, :]
        edge_left = gray[:, :10]
        edge_right = gray[:, -10:]

        edges = [edge_top, edge_bottom, edge_left, edge_right]
        variances = [np.var(e) for e in edges]

        # Very uniform edges can be suspicious
        if np.mean(variances) < 50:
            return 0.6

        return 0.2

    def _calculate_entropy(self, histogram: np.ndarray) -> float:
        """Calculate Shannon entropy of a histogram."""
        histogram = histogram.astype(float)
        histogram = histogram / (histogram.sum() + 1e-10)
        histogram = histogram[histogram > 0]
        return -np.sum(histogram * np.log2(histogram + 1e-10))
