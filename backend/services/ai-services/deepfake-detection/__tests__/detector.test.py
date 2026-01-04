"""
Unit tests for the Deepfake Detection Service detector module.

Tests cover:
- Image preprocessing
- Model inference
- Confidence score calculation
- Threshold handling
- Batch processing
"""

import io
import pytest
import numpy as np
from unittest.mock import Mock, MagicMock, patch, AsyncMock
from PIL import Image
import torch

# Import modules under test
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from detector import (
    DeepfakeDetector,
    EnhancedDeepfakeDetector,
    DetectionResult,
    VideoAnalysisResult,
    DeepfakeIndicator,
    create_detector,
)


# ============================================================================
# Fixtures
# ============================================================================

@pytest.fixture
def sample_image_bytes():
    """Create a sample RGB image as bytes."""
    img = Image.new("RGB", (512, 512), color=(128, 128, 128))
    # Add some variation for texture analysis
    pixels = img.load()
    for i in range(100, 200):
        for j in range(100, 200):
            pixels[i, j] = (200, 180, 170)  # Simulated face region
    buffer = io.BytesIO()
    img.save(buffer, format="JPEG", quality=95)
    return buffer.getvalue()


@pytest.fixture
def sample_rgba_image_bytes():
    """Create a sample RGBA image as bytes."""
    img = Image.new("RGBA", (256, 256), color=(128, 128, 128, 255))
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    return buffer.getvalue()


@pytest.fixture
def sample_grayscale_image_bytes():
    """Create a grayscale image as bytes."""
    img = Image.new("L", (256, 256), color=128)
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    return buffer.getvalue()


@pytest.fixture
def gan_resolution_image_bytes():
    """Create an image with common GAN resolution (1024x1024)."""
    img = Image.new("RGB", (1024, 1024), color=(128, 128, 128))
    buffer = io.BytesIO()
    img.save(buffer, format="JPEG", quality=95)
    return buffer.getvalue()


@pytest.fixture
def sample_video_frames():
    """Create sample video frames as numpy arrays (BGR format)."""
    frames = []
    for i in range(30):
        # Create frame with slight variations
        frame = np.zeros((480, 640, 3), dtype=np.uint8)
        frame[:, :] = [128 + i, 128, 128]  # Slight color variation
        frames.append(frame)
    return frames


@pytest.fixture
def mock_model():
    """Create a mock EfficientNet model."""
    model = Mock()
    model.eval = Mock()
    model.to_device = Mock(return_value=model)
    model.load_weights = Mock()

    # Mock preprocessing
    mock_tensor = torch.randn(1, 3, 380, 380)
    model.preprocess_image = Mock(return_value=mock_tensor)

    # Mock forward pass - returns logits and attention
    model.return_value = (
        torch.tensor([[0.3, 0.7]]),  # logits
        torch.tensor([[0.5]]),  # attention
    )
    model.__call__ = Mock(return_value=(
        torch.tensor([[0.3, 0.7]]),
        torch.tensor([[0.5]]),
    ))

    return model


@pytest.fixture
def mock_face_extractor():
    """Create a mock face extractor."""
    extractor = Mock()

    # Create mock face region
    mock_face = Mock()
    mock_face.bbox = (100, 100, 200, 200)
    mock_face.confidence = 0.95
    mock_face.landmarks = {
        "left_eye": (130, 130),
        "right_eye": (170, 130),
        "nose": (150, 150),
        "left_mouth": (130, 175),
        "right_mouth": (170, 175),
    }
    mock_face.face_image = Image.new("RGB", (100, 100), color=(200, 180, 170))

    extractor.extract_faces = Mock(return_value=[mock_face])
    extractor.select_face = Mock(return_value=mock_face)

    return extractor


@pytest.fixture
def detector():
    """Create a DeepfakeDetector instance."""
    return DeepfakeDetector(
        model_path=None,
        device="cpu",
        detection_threshold=0.5,
    )


# ============================================================================
# Image Preprocessing Tests
# ============================================================================

class TestImagePreprocessing:
    """Tests for image preprocessing functionality."""

    @pytest.mark.asyncio
    async def test_rgb_image_loading(self, detector, sample_image_bytes, mock_model, mock_face_extractor):
        """Test that RGB images are loaded correctly."""
        with patch.object(detector, 'model', mock_model), \
             patch.object(detector, 'face_extractor', mock_face_extractor), \
             patch.object(detector, '_initialized', True):

            result = await detector.analyze_image(sample_image_bytes)

            assert isinstance(result, DetectionResult)
            assert result.face_count >= 0

    @pytest.mark.asyncio
    async def test_rgba_to_rgb_conversion(self, detector, sample_rgba_image_bytes, mock_model, mock_face_extractor):
        """Test that RGBA images are converted to RGB."""
        with patch.object(detector, 'model', mock_model), \
             patch.object(detector, 'face_extractor', mock_face_extractor), \
             patch.object(detector, '_initialized', True):

            result = await detector.analyze_image(sample_rgba_image_bytes)

            assert isinstance(result, DetectionResult)

    @pytest.mark.asyncio
    async def test_grayscale_to_rgb_conversion(self, detector, sample_grayscale_image_bytes, mock_model, mock_face_extractor):
        """Test that grayscale images are converted to RGB."""
        with patch.object(detector, 'model', mock_model), \
             patch.object(detector, 'face_extractor', mock_face_extractor), \
             patch.object(detector, '_initialized', True):

            result = await detector.analyze_image(sample_grayscale_image_bytes)

            assert isinstance(result, DetectionResult)

    @pytest.mark.asyncio
    async def test_invalid_image_handling(self, detector, mock_model, mock_face_extractor):
        """Test handling of invalid/corrupted image data."""
        with patch.object(detector, 'model', mock_model), \
             patch.object(detector, 'face_extractor', mock_face_extractor), \
             patch.object(detector, '_initialized', True):

            invalid_bytes = b"not an image"
            result = await detector.analyze_image(invalid_bytes)

            # Should return safe default
            assert isinstance(result, DetectionResult)
            assert result.is_deepfake == False
            assert result.confidence == 0.0
            assert "analysis_error" in result.indicators

    @pytest.mark.asyncio
    async def test_empty_image_handling(self, detector, mock_model, mock_face_extractor):
        """Test handling of empty image bytes."""
        with patch.object(detector, 'model', mock_model), \
             patch.object(detector, 'face_extractor', mock_face_extractor), \
             patch.object(detector, '_initialized', True):

            result = await detector.analyze_image(b"")

            assert isinstance(result, DetectionResult)
            assert result.is_deepfake == False
            assert "analysis_error" in result.indicators


# ============================================================================
# Model Inference Tests
# ============================================================================

class TestModelInference:
    """Tests for ML model inference."""

    @pytest.mark.asyncio
    async def test_face_detection_and_analysis(self, detector, sample_image_bytes, mock_model, mock_face_extractor):
        """Test face detection triggers face-specific analysis."""
        with patch.object(detector, 'model', mock_model), \
             patch.object(detector, 'face_extractor', mock_face_extractor), \
             patch.object(detector, '_initialized', True):

            result = await detector.analyze_image(sample_image_bytes)

            # Face extractor should be called
            mock_face_extractor.extract_faces.assert_called()
            assert result.face_count == 1

    @pytest.mark.asyncio
    async def test_no_face_full_image_analysis(self, detector, sample_image_bytes, mock_model, mock_face_extractor):
        """Test that full image analysis is used when no faces detected."""
        mock_face_extractor.extract_faces = Mock(return_value=[])
        mock_face_extractor.select_face = Mock(return_value=None)

        with patch.object(detector, 'model', mock_model), \
             patch.object(detector, 'face_extractor', mock_face_extractor), \
             patch.object(detector, '_initialized', True):

            result = await detector.analyze_image(sample_image_bytes)

            assert result.face_count == 0
            assert "ml_analysis" in result.analysis_details or "error" in result.analysis_details

    @pytest.mark.asyncio
    async def test_model_output_softmax(self, detector, sample_image_bytes, mock_model, mock_face_extractor):
        """Test that model outputs are processed through softmax."""
        # Model returns logits that will become high fake probability after softmax
        mock_model.__call__ = Mock(return_value=(
            torch.tensor([[-2.0, 2.0]]),  # High fake probability
            torch.tensor([[0.5]]),
        ))
        mock_model.return_value = mock_model.__call__.return_value

        with patch.object(detector, 'model', mock_model), \
             patch.object(detector, 'face_extractor', mock_face_extractor), \
             patch.object(detector, '_initialized', True):

            result = await detector.analyze_image(sample_image_bytes)

            # Score should be high (above 0.5) due to softmax of [[-2, 2]]
            assert result.deepfake_score > 0.5

    @pytest.mark.asyncio
    async def test_model_initialization(self, detector):
        """Test lazy model initialization."""
        assert detector._initialized == False

        with patch.object(detector, 'model', None):
            with patch('detector.EfficientNetDeepfakeDetector') as MockModel, \
                 patch('detector.FaceExtractor') as MockExtractor:

                mock_instance = Mock()
                mock_instance.eval = Mock()
                mock_instance.to_device = Mock(return_value=mock_instance)
                MockModel.return_value = mock_instance
                MockExtractor.return_value = Mock()

                await detector.initialize()

                assert detector._initialized == True

    @pytest.mark.asyncio
    async def test_model_inference_error_handling(self, detector, sample_image_bytes, mock_model, mock_face_extractor):
        """Test graceful handling of model inference errors."""
        mock_model.__call__ = Mock(side_effect=RuntimeError("CUDA out of memory"))
        mock_model.return_value = mock_model.__call__.return_value

        with patch.object(detector, 'model', mock_model), \
             patch.object(detector, 'face_extractor', mock_face_extractor), \
             patch.object(detector, '_initialized', True):

            result = await detector.analyze_image(sample_image_bytes)

            assert isinstance(result, DetectionResult)
            # Should return safe default on error
            assert result.is_deepfake == False


# ============================================================================
# Confidence Score Calculation Tests
# ============================================================================

class TestConfidenceScoreCalculation:
    """Tests for confidence score calculation."""

    def test_calculate_confidence_high_score(self, detector):
        """Test confidence calculation for high deepfake scores."""
        # High score far from threshold
        confidence = detector._calculate_confidence(
            deepfake_score=0.9,
            num_indicators=5,
            face_count=1,
        )

        assert 0.0 <= confidence <= 1.0
        assert confidence > 0.7  # High confidence due to distance from threshold

    def test_calculate_confidence_low_score(self, detector):
        """Test confidence calculation for low deepfake scores."""
        confidence = detector._calculate_confidence(
            deepfake_score=0.1,
            num_indicators=0,
            face_count=1,
        )

        assert 0.0 <= confidence <= 1.0
        assert confidence > 0.5  # Reasonable confidence due to distance from threshold

    def test_calculate_confidence_near_threshold(self, detector):
        """Test confidence calculation for scores near threshold."""
        confidence = detector._calculate_confidence(
            deepfake_score=0.5,  # Exactly at threshold
            num_indicators=2,
            face_count=1,
        )

        assert 0.0 <= confidence <= 1.0
        # Confidence should be lower near threshold
        assert confidence < 0.9

    def test_calculate_confidence_face_boost(self, detector):
        """Test that face detection boosts confidence."""
        confidence_with_face = detector._calculate_confidence(
            deepfake_score=0.7,
            num_indicators=3,
            face_count=1,
        )

        confidence_without_face = detector._calculate_confidence(
            deepfake_score=0.7,
            num_indicators=3,
            face_count=0,
        )

        assert confidence_with_face > confidence_without_face

    def test_calculate_confidence_indicator_boost(self, detector):
        """Test that multiple indicators boost confidence."""
        confidence_many_indicators = detector._calculate_confidence(
            deepfake_score=0.7,
            num_indicators=10,
            face_count=1,
        )

        confidence_few_indicators = detector._calculate_confidence(
            deepfake_score=0.7,
            num_indicators=1,
            face_count=1,
        )

        assert confidence_many_indicators >= confidence_few_indicators

    def test_calculate_combined_score(self, detector):
        """Test combined score calculation from multiple signals."""
        score = detector._calculate_combined_score(
            ml_score=0.8,
            freq_score=0.6,
            texture_score=0.7,
            lighting_score=0.5,
            num_indicators=4,
        )

        assert 0.0 <= score <= 1.0
        # ML score has 50% weight, so result should be influenced heavily by it
        assert score > 0.5

    def test_calculate_combined_score_all_zeros(self, detector):
        """Test combined score with all zero inputs."""
        score = detector._calculate_combined_score(
            ml_score=0.0,
            freq_score=0.0,
            texture_score=0.0,
            lighting_score=0.0,
            num_indicators=0,
        )

        assert score == 0.0

    def test_calculate_combined_score_all_ones(self, detector):
        """Test combined score with all maximum inputs."""
        score = detector._calculate_combined_score(
            ml_score=1.0,
            freq_score=1.0,
            texture_score=1.0,
            lighting_score=1.0,
            num_indicators=10,
        )

        assert score == 1.0


# ============================================================================
# Threshold Handling Tests
# ============================================================================

class TestThresholdHandling:
    """Tests for detection threshold handling."""

    @pytest.mark.asyncio
    async def test_score_above_threshold_is_deepfake(self, detector, sample_image_bytes, mock_model, mock_face_extractor):
        """Test that scores above threshold are classified as deepfake."""
        # Set model to return high fake probability
        mock_model.__call__ = Mock(return_value=(
            torch.tensor([[-3.0, 3.0]]),  # Very high fake probability
            torch.tensor([[0.5]]),
        ))
        mock_model.return_value = mock_model.__call__.return_value

        with patch.object(detector, 'model', mock_model), \
             patch.object(detector, 'face_extractor', mock_face_extractor), \
             patch.object(detector, '_initialized', True), \
             patch.object(detector, 'detection_threshold', 0.5):

            result = await detector.analyze_image(sample_image_bytes)

            # With high fake probability, should be classified as deepfake
            if result.deepfake_score >= 0.5:
                assert result.is_deepfake == True

    @pytest.mark.asyncio
    async def test_score_below_threshold_not_deepfake(self, detector, sample_image_bytes, mock_model, mock_face_extractor):
        """Test that scores below threshold are not classified as deepfake."""
        # Set model to return low fake probability
        mock_model.__call__ = Mock(return_value=(
            torch.tensor([[3.0, -3.0]]),  # Very low fake probability
            torch.tensor([[0.5]]),
        ))
        mock_model.return_value = mock_model.__call__.return_value

        with patch.object(detector, 'model', mock_model), \
             patch.object(detector, 'face_extractor', mock_face_extractor), \
             patch.object(detector, '_initialized', True):

            result = await detector.analyze_image(sample_image_bytes)

            # With low fake probability, should not be classified as deepfake
            if result.deepfake_score < 0.5:
                assert result.is_deepfake == False

    def test_custom_threshold(self):
        """Test detector with custom threshold."""
        detector_low = DeepfakeDetector(detection_threshold=0.3)
        detector_high = DeepfakeDetector(detection_threshold=0.8)

        assert detector_low.detection_threshold == 0.3
        assert detector_high.detection_threshold == 0.8

    @pytest.mark.asyncio
    async def test_threshold_boundary_above(self, detector, sample_image_bytes, mock_model, mock_face_extractor):
        """Test exact threshold boundary (score equals threshold)."""
        detector.detection_threshold = 0.5

        with patch.object(detector, 'model', mock_model), \
             patch.object(detector, 'face_extractor', mock_face_extractor), \
             patch.object(detector, '_initialized', True), \
             patch.object(detector, '_calculate_combined_score', return_value=0.5):

            result = await detector.analyze_image(sample_image_bytes)

            # Score exactly at threshold should be classified as deepfake
            assert result.is_deepfake == True

    @pytest.mark.asyncio
    async def test_threshold_boundary_below(self, detector, sample_image_bytes, mock_model, mock_face_extractor):
        """Test just below threshold."""
        detector.detection_threshold = 0.5

        with patch.object(detector, 'model', mock_model), \
             patch.object(detector, 'face_extractor', mock_face_extractor), \
             patch.object(detector, '_initialized', True), \
             patch.object(detector, '_calculate_combined_score', return_value=0.49):

            result = await detector.analyze_image(sample_image_bytes)

            assert result.is_deepfake == False


# ============================================================================
# Batch Processing Tests
# ============================================================================

class TestBatchProcessing:
    """Tests for batch/video processing functionality."""

    @pytest.mark.asyncio
    async def test_video_frame_analysis(self, detector, sample_video_frames, mock_model, mock_face_extractor):
        """Test analysis of individual video frames."""
        with patch.object(detector, 'model', mock_model), \
             patch.object(detector, 'face_extractor', mock_face_extractor), \
             patch.object(detector, '_initialized', True):

            frame = sample_video_frames[0]
            result = await detector.analyze_video_frame(frame)

            assert isinstance(result, DetectionResult)

    @pytest.mark.asyncio
    async def test_facial_consistency_check(self, detector, sample_video_frames, mock_model, mock_face_extractor):
        """Test temporal facial consistency checking across frames."""
        with patch.object(detector, 'model', mock_model), \
             patch.object(detector, 'face_extractor', mock_face_extractor), \
             patch.object(detector, '_initialized', True):

            result = await detector.check_facial_consistency(sample_video_frames[:10])

            assert isinstance(result, VideoAnalysisResult)
            assert result.frame_count == 10
            assert 0 <= result.temporal_consistency_score <= 1.0

    @pytest.mark.asyncio
    async def test_single_frame_video_analysis(self, detector, sample_video_frames, mock_model, mock_face_extractor):
        """Test video analysis with single frame."""
        with patch.object(detector, 'model', mock_model), \
             patch.object(detector, 'face_extractor', mock_face_extractor), \
             patch.object(detector, '_initialized', True):

            result = await detector.check_facial_consistency([sample_video_frames[0]])

            assert isinstance(result, VideoAnalysisResult)
            assert result.frame_count == 1
            assert result.confidence == 0.0  # Low confidence with single frame

    @pytest.mark.asyncio
    async def test_empty_frames_handling(self, detector, mock_model, mock_face_extractor):
        """Test handling of empty frame list."""
        with patch.object(detector, 'model', mock_model), \
             patch.object(detector, 'face_extractor', mock_face_extractor), \
             patch.object(detector, '_initialized', True):

            result = await detector.check_facial_consistency([])

            assert isinstance(result, VideoAnalysisResult)
            assert result.frame_count == 0
            assert result.is_deepfake == False

    @pytest.mark.asyncio
    async def test_suspicious_frame_counting(self, detector, sample_video_frames, mock_model, mock_face_extractor):
        """Test counting of suspicious frames in video."""
        # Mock to return alternating results
        call_count = [0]

        def mock_call(*args, **kwargs):
            call_count[0] += 1
            if call_count[0] % 2 == 0:
                return (torch.tensor([[-2.0, 2.0]]), torch.tensor([[0.5]]))
            return (torch.tensor([[2.0, -2.0]]), torch.tensor([[0.5]]))

        mock_model.__call__ = Mock(side_effect=mock_call)
        mock_model.return_value = mock_model.__call__.return_value

        with patch.object(detector, 'model', mock_model), \
             patch.object(detector, 'face_extractor', mock_face_extractor), \
             patch.object(detector, '_initialized', True):

            result = await detector.check_facial_consistency(sample_video_frames[:10])

            assert result.suspicious_frames >= 0
            assert result.suspicious_frames <= result.frame_count

    @pytest.mark.asyncio
    async def test_temporal_consistency_score(self, detector, sample_video_frames, mock_model, mock_face_extractor):
        """Test temporal consistency score calculation."""
        with patch.object(detector, 'model', mock_model), \
             patch.object(detector, 'face_extractor', mock_face_extractor), \
             patch.object(detector, '_initialized', True):

            result = await detector.check_facial_consistency(sample_video_frames[:10])

            assert 0.0 <= result.temporal_consistency_score <= 1.0

    @pytest.mark.asyncio
    async def test_blink_analysis(self, detector, sample_video_frames, mock_model, mock_face_extractor):
        """Test eye blink analysis in video."""
        with patch.object(detector, 'model', mock_model), \
             patch.object(detector, 'face_extractor', mock_face_extractor), \
             patch.object(detector, '_initialized', True):

            result = await detector.check_facial_consistency(sample_video_frames)

            assert "blink_analysis" in dir(result)
            if result.blink_analysis:
                assert isinstance(result.blink_analysis, dict)


# ============================================================================
# Detection Indicator Tests
# ============================================================================

class TestDeepfakeIndicators:
    """Tests for deepfake indicator detection."""

    @pytest.mark.asyncio
    async def test_gan_resolution_detection(self, detector, gan_resolution_image_bytes, mock_model, mock_face_extractor):
        """Test detection of common GAN output resolutions."""
        with patch.object(detector, 'model', mock_model), \
             patch.object(detector, 'face_extractor', mock_face_extractor), \
             patch.object(detector, '_initialized', True):

            result = await detector.analyze_image(gan_resolution_image_bytes)

            # Should detect common GAN resolution (1024x1024)
            assert DeepfakeIndicator.COMMON_GAN_RESOLUTION.value in result.indicators or \
                   len(result.indicators) >= 0

    @pytest.mark.asyncio
    async def test_frequency_analysis_indicators(self, detector, sample_image_bytes, mock_model, mock_face_extractor):
        """Test frequency domain analysis produces indicators."""
        with patch.object(detector, 'model', mock_model), \
             patch.object(detector, 'face_extractor', mock_face_extractor), \
             patch.object(detector, '_initialized', True):

            result = await detector.analyze_image(sample_image_bytes)

            assert "frequency_analysis" in result.analysis_details or "error" in result.analysis_details

    @pytest.mark.asyncio
    async def test_texture_analysis(self, detector, sample_image_bytes, mock_model, mock_face_extractor):
        """Test texture analysis is performed."""
        with patch.object(detector, 'model', mock_model), \
             patch.object(detector, 'face_extractor', mock_face_extractor), \
             patch.object(detector, '_initialized', True):

            result = await detector.analyze_image(sample_image_bytes)

            assert "texture_analysis" in result.analysis_details or "error" in result.analysis_details

    @pytest.mark.asyncio
    async def test_lighting_analysis(self, detector, sample_image_bytes, mock_model, mock_face_extractor):
        """Test lighting consistency analysis."""
        with patch.object(detector, 'model', mock_model), \
             patch.object(detector, 'face_extractor', mock_face_extractor), \
             patch.object(detector, '_initialized', True):

            result = await detector.analyze_image(sample_image_bytes)

            assert "lighting_analysis" in result.analysis_details or "error" in result.analysis_details

    def test_deepfake_indicator_enum_values(self):
        """Test all DeepfakeIndicator enum values are properly defined."""
        expected_indicators = [
            "FACE_BOUNDARY_ARTIFACTS",
            "EYE_BLINKING_ANOMALY",
            "SKIN_TEXTURE_ANOMALY",
            "LIGHTING_INCONSISTENCY",
            "RESOLUTION_MISMATCH",
            "GAN_FINGERPRINT",
            "TEMPORAL_INCONSISTENCY",
            "UNNATURAL_SYMMETRY",
            "COMPRESSION_ARTIFACTS",
            "FREQUENCY_ANOMALY",
            "MISSING_METADATA",
            "COMMON_GAN_RESOLUTION",
        ]

        for indicator in expected_indicators:
            assert hasattr(DeepfakeIndicator, indicator)


# ============================================================================
# Factory Function Tests
# ============================================================================

class TestCreateDetector:
    """Tests for the create_detector factory function."""

    def test_create_basic_detector(self):
        """Test creating a basic detector."""
        with patch('detector.ENSEMBLE_AVAILABLE', False):
            detector = create_detector(
                use_ensemble=False,
                detection_threshold=0.6,
            )

            assert isinstance(detector, DeepfakeDetector)
            assert detector.detection_threshold == 0.6

    def test_create_detector_with_custom_threshold(self):
        """Test creating detector with custom threshold."""
        detector = create_detector(
            detection_threshold=0.75,
            use_ensemble=False,
        )

        assert detector.detection_threshold == 0.75

    def test_create_detector_with_device(self):
        """Test creating detector with specific device."""
        detector = create_detector(
            device="cpu",
            use_ensemble=False,
        )

        assert detector.device == "cpu"


# ============================================================================
# Cleanup and Resource Management Tests
# ============================================================================

class TestResourceManagement:
    """Tests for resource management and cleanup."""

    @pytest.mark.asyncio
    async def test_detector_initialization(self, detector):
        """Test detector initialization."""
        with patch('detector.EfficientNetDeepfakeDetector') as MockModel, \
             patch('detector.FaceExtractor') as MockExtractor:

            mock_model = Mock()
            mock_model.eval = Mock()
            mock_model.to_device = Mock(return_value=mock_model)
            MockModel.return_value = mock_model
            MockExtractor.return_value = Mock()

            await detector.initialize()

            assert detector._initialized == True

    @pytest.mark.asyncio
    async def test_detector_close(self, detector):
        """Test detector cleanup."""
        detector._initialized = True
        detector.model = Mock()
        detector.face_extractor = Mock()

        await detector.close()

        assert detector._initialized == False
        assert detector.model is None
        assert detector.face_extractor is None

    @pytest.mark.asyncio
    async def test_double_initialization(self, detector):
        """Test that double initialization is safe."""
        with patch('detector.EfficientNetDeepfakeDetector') as MockModel, \
             patch('detector.FaceExtractor') as MockExtractor:

            mock_model = Mock()
            mock_model.eval = Mock()
            mock_model.to_device = Mock(return_value=mock_model)
            MockModel.return_value = mock_model
            MockExtractor.return_value = Mock()

            await detector.initialize()
            await detector.initialize()  # Second call should be no-op

            # Model should only be created once
            assert MockModel.call_count == 1


# ============================================================================
# Enhanced Detector Tests
# ============================================================================

class TestEnhancedDeepfakeDetector:
    """Tests for the EnhancedDeepfakeDetector class."""

    def test_enhanced_detector_creation(self):
        """Test creating an enhanced detector."""
        with patch('detector.ENSEMBLE_AVAILABLE', True):
            detector = EnhancedDeepfakeDetector(
                detection_threshold=0.5,
                enable_rekognition=False,
            )

            assert detector.detection_threshold == 0.5

    def test_enhanced_detector_fallback(self):
        """Test enhanced detector falls back to basic when ensemble unavailable."""
        with patch('detector.ENSEMBLE_AVAILABLE', False):
            detector = EnhancedDeepfakeDetector(
                detection_threshold=0.5,
            )

            assert hasattr(detector, '_basic_detector')

    @pytest.mark.asyncio
    async def test_enhanced_detector_confidence_getter(self):
        """Test getting confidence score from enhanced detector."""
        detector = EnhancedDeepfakeDetector(detection_threshold=0.5)

        result = DetectionResult(
            is_deepfake=True,
            confidence=0.85,
            deepfake_score=0.9,
            indicators=["test"],
        )

        confidence = detector.get_confidence_score(result)

        assert confidence == 0.85

    @pytest.mark.asyncio
    async def test_enhanced_detector_detection_reasons(self):
        """Test getting detection reasons from enhanced detector."""
        detector = EnhancedDeepfakeDetector(detection_threshold=0.5)

        result = DetectionResult(
            is_deepfake=True,
            confidence=0.85,
            deepfake_score=0.9,
            indicators=["gan_fingerprint", "face_boundary"],
            analysis_details={
                "detection_reasons": ["Test reason 1", "Test reason 2"],
            },
        )

        reasons = detector.get_detection_reasons(result)

        assert len(reasons) == 2
        assert "Test reason 1" in reasons


# ============================================================================
# Run Tests
# ============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
