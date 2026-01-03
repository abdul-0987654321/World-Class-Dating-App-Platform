"""
Frequency Domain Analysis for GAN Artifact Detection.

GANs leave characteristic fingerprints in the frequency domain
that can be detected through spectral analysis.
"""

import logging
from typing import Tuple, List, Dict, Any
from dataclasses import dataclass, field

import numpy as np
from PIL import Image
from scipy import fftpack
from scipy.ndimage import gaussian_filter
import cv2

logger = logging.getLogger(__name__)


@dataclass
class FrequencyAnalysisResult:
    """Result from frequency domain analysis."""
    is_synthetic: bool = False
    confidence: float = 0.0
    gan_fingerprint_score: float = 0.0
    spectral_anomaly_score: float = 0.0
    periodic_artifact_score: float = 0.0
    indicators: List[str] = field(default_factory=list)
    details: Dict[str, Any] = field(default_factory=dict)


class FrequencyAnalyzer:
    """
    Analyzes images in the frequency domain to detect GAN-generated content.

    GAN-generated images often contain:
    1. Grid-like artifacts from transposed convolutions
    2. Unusual high-frequency patterns
    3. Characteristic spectral peaks
    4. Missing natural image statistics
    """

    def __init__(
        self,
        spectral_threshold: float = 0.3,
        periodic_threshold: float = 0.4,
        fingerprint_threshold: float = 0.35,
    ):
        """
        Initialize frequency analyzer.

        Args:
            spectral_threshold: Threshold for spectral anomaly detection
            periodic_threshold: Threshold for periodic artifact detection
            fingerprint_threshold: Threshold for GAN fingerprint detection
        """
        self.spectral_threshold = spectral_threshold
        self.periodic_threshold = periodic_threshold
        self.fingerprint_threshold = fingerprint_threshold

    async def analyze(self, image: Image.Image) -> FrequencyAnalysisResult:
        """
        Perform comprehensive frequency domain analysis.

        Args:
            image: PIL Image to analyze

        Returns:
            FrequencyAnalysisResult with detection scores
        """
        try:
            # Convert to numpy array
            if image.mode != 'RGB':
                image = image.convert('RGB')

            img_array = np.array(image)

            # Analyze each color channel
            results = []
            for channel in range(3):
                channel_result = self._analyze_channel(img_array[:, :, channel])
                results.append(channel_result)

            # Combine channel results
            return self._combine_results(results, img_array)

        except Exception as e:
            logger.error(f"Error in frequency analysis: {e}")
            return FrequencyAnalysisResult(
                indicators=["analysis_error"],
                details={"error": str(e)}
            )

    def _analyze_channel(self, channel: np.ndarray) -> Dict[str, Any]:
        """
        Analyze a single color channel.

        Args:
            channel: 2D numpy array (single channel)

        Returns:
            Analysis results for this channel
        """
        # Apply FFT
        fft = fftpack.fft2(channel)
        fft_shifted = fftpack.fftshift(fft)
        magnitude = np.abs(fft_shifted)
        magnitude_log = np.log1p(magnitude)

        h, w = magnitude_log.shape
        center = (h // 2, w // 2)

        # 1. Analyze radial spectrum
        radial_profile = self._compute_radial_profile(magnitude_log, center)

        # 2. Detect periodic artifacts (grid patterns)
        periodic_score = self._detect_periodic_artifacts(magnitude_log, center)

        # 3. Detect spectral anomalies
        spectral_score = self._detect_spectral_anomalies(radial_profile)

        # 4. Detect GAN fingerprint patterns
        fingerprint_score = self._detect_gan_fingerprint(magnitude_log, center)

        # 5. Analyze azimuthal variations
        azimuthal_score = self._analyze_azimuthal_symmetry(magnitude_log, center)

        return {
            "radial_profile": radial_profile,
            "periodic_score": periodic_score,
            "spectral_score": spectral_score,
            "fingerprint_score": fingerprint_score,
            "azimuthal_score": azimuthal_score,
        }

    def _compute_radial_profile(
        self,
        magnitude: np.ndarray,
        center: Tuple[int, int]
    ) -> np.ndarray:
        """
        Compute radial average of FFT magnitude.

        Args:
            magnitude: Log magnitude of FFT
            center: Center coordinates

        Returns:
            Radial profile array
        """
        h, w = magnitude.shape
        max_radius = min(center[0], center[1], h - center[0], w - center[1])

        radial_profile = np.zeros(max_radius)
        counts = np.zeros(max_radius)

        y_indices, x_indices = np.ogrid[:h, :w]
        distances = np.sqrt((y_indices - center[0])**2 + (x_indices - center[1])**2)

        for r in range(max_radius):
            mask = (distances >= r) & (distances < r + 1)
            if np.any(mask):
                radial_profile[r] = np.mean(magnitude[mask])
                counts[r] = np.sum(mask)

        return radial_profile

    def _detect_periodic_artifacts(
        self,
        magnitude: np.ndarray,
        center: Tuple[int, int]
    ) -> float:
        """
        Detect periodic/grid artifacts from GAN upsampling.

        Args:
            magnitude: Log magnitude of FFT
            center: Center coordinates

        Returns:
            Periodic artifact score (0-1)
        """
        h, w = magnitude.shape

        # Look for peaks at specific frequencies related to common GAN architectures
        # StyleGAN, ProGAN often have artifacts at powers of 2

        peak_score = 0.0
        num_checks = 0

        # Check for peaks at common GAN artifact frequencies
        # These correspond to upsampling artifacts
        artifact_frequencies = [
            (h // 4, w // 2),   # Horizontal artifact
            (h // 2, w // 4),   # Vertical artifact
            (h // 4, w // 4),   # Diagonal artifact
            (3 * h // 4, w // 2),
            (h // 2, 3 * w // 4),
            (3 * h // 4, 3 * w // 4),
        ]

        # Also check for peaks at 1/8, 1/16 frequencies
        for divisor in [8, 16]:
            for y_mult in [1, divisor - 1]:
                for x_mult in [1, divisor - 1]:
                    y = h * y_mult // divisor
                    x = w * x_mult // divisor
                    if 0 <= y < h and 0 <= x < w:
                        artifact_frequencies.append((y, x))

        # Remove duplicates and center
        artifact_frequencies = list(set(
            (y, x) for y, x in artifact_frequencies
            if (y, x) != center and 0 <= y < h and 0 <= x < w
        ))

        # Calculate background level
        background = np.median(magnitude)
        std = np.std(magnitude)

        for y, x in artifact_frequencies:
            # Check a small region around each frequency
            region_size = 3
            y_start = max(0, y - region_size)
            y_end = min(h, y + region_size + 1)
            x_start = max(0, x - region_size)
            x_end = min(w, x + region_size + 1)

            region = magnitude[y_start:y_end, x_start:x_end]
            peak_value = np.max(region)

            # Check if this is a significant peak
            if peak_value > background + 3 * std:
                peak_score += (peak_value - background) / (std + 1e-6)
                num_checks += 1

        if num_checks > 0:
            peak_score /= (num_checks * 10)  # Normalize

        return min(peak_score, 1.0)

    def _detect_spectral_anomalies(self, radial_profile: np.ndarray) -> float:
        """
        Detect anomalies in the spectral profile.

        Natural images follow a characteristic 1/f power law.
        GAN images often deviate from this.

        Args:
            radial_profile: Radial average of FFT magnitude

        Returns:
            Spectral anomaly score (0-1)
        """
        if len(radial_profile) < 10:
            return 0.0

        # Skip DC component and very high frequencies
        profile = radial_profile[1:len(radial_profile) // 2]

        if len(profile) < 5:
            return 0.0

        # Natural images follow ~1/f power law in frequency domain
        # Fit a power law and measure deviation
        x = np.arange(1, len(profile) + 1, dtype=float)

        # Log-log fit for power law
        log_x = np.log(x)
        log_profile = np.log(profile + 1e-10)

        # Linear regression in log-log space
        coeffs = np.polyfit(log_x, log_profile, 1)
        expected_slope = -1.0  # Natural images have slope ~-1

        # Deviation from expected slope
        slope_deviation = abs(coeffs[0] - expected_slope)

        # Calculate residuals
        fitted = np.polyval(coeffs, log_x)
        residuals = log_profile - fitted
        residual_std = np.std(residuals)

        # High residuals or unusual slope indicate synthetic content
        anomaly_score = (slope_deviation / 2.0) + (residual_std / 2.0)

        return min(anomaly_score, 1.0)

    def _detect_gan_fingerprint(
        self,
        magnitude: np.ndarray,
        center: Tuple[int, int]
    ) -> float:
        """
        Detect specific GAN fingerprint patterns.

        Different GAN architectures leave different fingerprints:
        - StyleGAN: Characteristic blob patterns
        - ProGAN: Progressive upsampling artifacts
        - Face2Face: Boundary artifacts

        Args:
            magnitude: Log magnitude of FFT
            center: Center coordinates

        Returns:
            GAN fingerprint score (0-1)
        """
        h, w = magnitude.shape

        fingerprint_score = 0.0

        # 1. Check for checkerboard pattern (common in deconvolution)
        # This appears as peaks at Nyquist frequency corners
        corners = [
            (0, 0), (0, w-1), (h-1, 0), (h-1, w-1)
        ]

        corner_energy = sum(magnitude[y, x] for y, x in corners)
        total_energy = np.sum(magnitude)

        if total_energy > 0:
            corner_ratio = corner_energy / total_energy
            if corner_ratio > 0.01:  # Abnormally high corner energy
                fingerprint_score += min(corner_ratio * 10, 0.3)

        # 2. Check for ring patterns (from circular convolutions)
        radii = [h // 4, h // 8, h // 16]
        ring_scores = []

        for radius in radii:
            if radius < 5:
                continue

            # Sample points on ring
            angles = np.linspace(0, 2 * np.pi, 36, endpoint=False)
            ring_values = []

            for angle in angles:
                y = int(center[0] + radius * np.sin(angle))
                x = int(center[1] + radius * np.cos(angle))
                if 0 <= y < h and 0 <= x < w:
                    ring_values.append(magnitude[y, x])

            if ring_values:
                ring_std = np.std(ring_values)
                ring_mean = np.mean(ring_values)
                # Low variance on ring indicates artificial pattern
                if ring_std < ring_mean * 0.1:
                    ring_scores.append(0.2)

        fingerprint_score += sum(ring_scores)

        # 3. Check for vertical/horizontal line artifacts
        # (common in some GAN architectures)
        center_row = magnitude[center[0], :]
        center_col = magnitude[:, center[1]]

        # Energy concentration along axes
        row_energy = np.sum(center_row)
        col_energy = np.sum(center_col)

        if total_energy > 0:
            axis_ratio = (row_energy + col_energy) / total_energy
            if axis_ratio > 0.1:  # Abnormally high axis energy
                fingerprint_score += min((axis_ratio - 0.1) * 2, 0.2)

        return min(fingerprint_score, 1.0)

    def _analyze_azimuthal_symmetry(
        self,
        magnitude: np.ndarray,
        center: Tuple[int, int]
    ) -> float:
        """
        Analyze azimuthal symmetry of the spectrum.

        Natural images tend to have random azimuthal variations,
        while GAN images may show more regular patterns.

        Args:
            magnitude: Log magnitude of FFT
            center: Center coordinates

        Returns:
            Azimuthal symmetry score (0-1, higher = more suspicious)
        """
        h, w = magnitude.shape
        max_radius = min(center[0], center[1], h - center[0], w - center[1]) // 2

        if max_radius < 10:
            return 0.0

        # Sample at multiple radii
        symmetry_scores = []

        for radius in range(10, max_radius, 10):
            # Sample around the ring
            angles = np.linspace(0, 2 * np.pi, 72, endpoint=False)
            values = []

            for angle in angles:
                y = int(center[0] + radius * np.sin(angle))
                x = int(center[1] + radius * np.cos(angle))
                if 0 <= y < h and 0 <= x < w:
                    values.append(magnitude[y, x])

            if len(values) >= 36:
                values = np.array(values)

                # Check for 2-fold, 4-fold, 6-fold symmetry
                for n_fold in [2, 4, 6]:
                    step = len(values) // n_fold
                    if step > 0:
                        segments = [values[i::step] for i in range(step)]
                        min_len = min(len(s) for s in segments)
                        if min_len > 0:
                            segments = [s[:min_len] for s in segments]
                            # Compare segments
                            segment_std = np.std([np.mean(s) for s in segments])
                            segment_mean = np.mean(values)
                            if segment_mean > 0:
                                symmetry = 1 - (segment_std / segment_mean)
                                if symmetry > 0.95:  # Very high symmetry
                                    symmetry_scores.append(symmetry)

        if symmetry_scores:
            return np.mean(symmetry_scores)

        return 0.0

    def _combine_results(
        self,
        channel_results: List[Dict[str, Any]],
        img_array: np.ndarray
    ) -> FrequencyAnalysisResult:
        """
        Combine results from all color channels.

        Args:
            channel_results: Results from each channel
            img_array: Original image array

        Returns:
            Combined FrequencyAnalysisResult
        """
        indicators = []
        details = {}

        # Average scores across channels
        periodic_scores = [r["periodic_score"] for r in channel_results]
        spectral_scores = [r["spectral_score"] for r in channel_results]
        fingerprint_scores = [r["fingerprint_score"] for r in channel_results]
        azimuthal_scores = [r["azimuthal_score"] for r in channel_results]

        avg_periodic = np.mean(periodic_scores)
        avg_spectral = np.mean(spectral_scores)
        avg_fingerprint = np.mean(fingerprint_scores)
        avg_azimuthal = np.mean(azimuthal_scores)

        # Check thresholds and add indicators
        if avg_periodic > self.periodic_threshold:
            indicators.append("periodic_artifacts_detected")
        if avg_spectral > self.spectral_threshold:
            indicators.append("spectral_anomaly_detected")
        if avg_fingerprint > self.fingerprint_threshold:
            indicators.append("gan_fingerprint_detected")
        if avg_azimuthal > 0.9:
            indicators.append("unnatural_spectral_symmetry")

        # Cross-channel consistency check
        # GAN images sometimes have unusual channel correlations
        channel_correlation = self._check_channel_correlation(channel_results)
        if channel_correlation > 0.95:
            indicators.append("suspicious_channel_correlation")

        # Calculate combined score
        combined_score = (
            0.25 * avg_periodic +
            0.25 * avg_spectral +
            0.30 * avg_fingerprint +
            0.20 * avg_azimuthal
        )

        # Calculate confidence
        confidence = min(combined_score * 1.5, 1.0)

        details = {
            "periodic_score": round(avg_periodic, 4),
            "spectral_score": round(avg_spectral, 4),
            "fingerprint_score": round(avg_fingerprint, 4),
            "azimuthal_score": round(avg_azimuthal, 4),
            "channel_correlation": round(channel_correlation, 4),
        }

        return FrequencyAnalysisResult(
            is_synthetic=combined_score > 0.5,
            confidence=round(confidence, 4),
            gan_fingerprint_score=round(avg_fingerprint, 4),
            spectral_anomaly_score=round(avg_spectral, 4),
            periodic_artifact_score=round(avg_periodic, 4),
            indicators=indicators,
            details=details,
        )

    def _check_channel_correlation(
        self,
        channel_results: List[Dict[str, Any]]
    ) -> float:
        """
        Check correlation between color channel spectra.

        Args:
            channel_results: Results from each channel

        Returns:
            Correlation score
        """
        if len(channel_results) < 2:
            return 0.0

        profiles = [r.get("radial_profile", np.array([])) for r in channel_results]

        # Ensure same length
        min_len = min(len(p) for p in profiles)
        if min_len < 10:
            return 0.0

        profiles = [p[:min_len] for p in profiles]

        # Calculate pairwise correlations
        correlations = []
        for i in range(len(profiles)):
            for j in range(i + 1, len(profiles)):
                corr = np.corrcoef(profiles[i], profiles[j])[0, 1]
                if not np.isnan(corr):
                    correlations.append(abs(corr))

        return np.mean(correlations) if correlations else 0.0


# Create singleton instance
frequency_analyzer = FrequencyAnalyzer()
