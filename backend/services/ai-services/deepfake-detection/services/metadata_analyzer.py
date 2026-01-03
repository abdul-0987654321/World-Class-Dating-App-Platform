"""
Metadata Consistency Analysis for Deepfake Detection.

Analyzes image/video metadata for signs of manipulation:
- EXIF data consistency
- File format anomalies
- Compression artifacts
- Timestamp analysis
- Software signatures
"""

import logging
import io
import struct
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum

from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS
import numpy as np

logger = logging.getLogger(__name__)


class MetadataAnomalyType(str, Enum):
    """Types of metadata anomalies."""
    MISSING_EXIF = "missing_exif"
    STRIPPED_METADATA = "stripped_metadata"
    INCONSISTENT_TIMESTAMPS = "inconsistent_timestamps"
    SOFTWARE_INDICATOR = "software_indicator"
    RESOLUTION_ANOMALY = "resolution_anomaly"
    COMPRESSION_ANOMALY = "compression_anomaly"
    FORMAT_MISMATCH = "format_mismatch"
    THUMBNAIL_MISMATCH = "thumbnail_mismatch"
    CAMERA_INCONSISTENCY = "camera_inconsistency"
    GAN_RESOLUTION = "gan_resolution"


@dataclass
class MetadataAnalysisResult:
    """Result from metadata analysis."""
    has_metadata: bool = True
    anomaly_score: float = 0.0
    anomalies: List[MetadataAnomalyType] = field(default_factory=list)
    indicators: List[str] = field(default_factory=list)
    details: Dict[str, Any] = field(default_factory=dict)
    confidence: float = 0.0


class MetadataAnalyzer:
    """
    Analyzes image/video metadata for signs of manipulation.

    Deepfakes and AI-generated images often have:
    - Missing or stripped EXIF data
    - Specific software signatures
    - Unusual resolutions (powers of 2)
    - Inconsistent compression
    - No camera information
    """

    # Common GAN output resolutions
    GAN_RESOLUTIONS = {256, 512, 1024, 2048, 4096}

    # Known AI image generation software signatures
    AI_SOFTWARE_PATTERNS = [
        "stable diffusion",
        "midjourney",
        "dall-e",
        "dalle",
        "stylegan",
        "progan",
        "faceapp",
        "faceswap",
        "deepfacelab",
        "reface",
        "artbreeder",
        "this person does not exist",
        "generated.photos",
    ]

    # Common camera manufacturers for authentic photos
    LEGITIMATE_CAMERA_MAKES = {
        "apple", "samsung", "google", "huawei", "xiaomi", "oppo", "vivo",
        "sony", "canon", "nikon", "fujifilm", "olympus", "panasonic",
        "lg", "oneplus", "motorola", "nokia", "htc", "zte", "lenovo",
    }

    def __init__(
        self,
        require_exif: bool = False,
        strict_mode: bool = False,
    ):
        """
        Initialize metadata analyzer.

        Args:
            require_exif: If True, missing EXIF is an anomaly
            strict_mode: If True, apply stricter checks
        """
        self.require_exif = require_exif
        self.strict_mode = strict_mode

    async def analyze(
        self,
        image_bytes: bytes,
        filename: Optional[str] = None,
    ) -> MetadataAnalysisResult:
        """
        Analyze image metadata for manipulation indicators.

        Args:
            image_bytes: Raw image bytes
            filename: Optional filename for format analysis

        Returns:
            MetadataAnalysisResult
        """
        try:
            image = Image.open(io.BytesIO(image_bytes))
            anomalies = []
            indicators = []
            details = {}

            # 1. Analyze EXIF data
            exif_result = self._analyze_exif(image)
            anomalies.extend(exif_result['anomalies'])
            indicators.extend(exif_result['indicators'])
            details['exif'] = exif_result['details']

            # 2. Analyze image resolution
            resolution_result = self._analyze_resolution(image)
            anomalies.extend(resolution_result['anomalies'])
            indicators.extend(resolution_result['indicators'])
            details['resolution'] = resolution_result['details']

            # 3. Analyze compression artifacts
            compression_result = self._analyze_compression(image, image_bytes)
            anomalies.extend(compression_result['anomalies'])
            indicators.extend(compression_result['indicators'])
            details['compression'] = compression_result['details']

            # 4. Analyze file format consistency
            if filename:
                format_result = self._analyze_format(image, filename, image_bytes)
                anomalies.extend(format_result['anomalies'])
                indicators.extend(format_result['indicators'])
                details['format'] = format_result['details']

            # 5. Analyze thumbnail (if present)
            thumbnail_result = self._analyze_thumbnail(image)
            anomalies.extend(thumbnail_result['anomalies'])
            indicators.extend(thumbnail_result['indicators'])
            details['thumbnail'] = thumbnail_result['details']

            # 6. Analyze image statistics
            stats_result = self._analyze_image_statistics(image)
            anomalies.extend(stats_result['anomalies'])
            indicators.extend(stats_result['indicators'])
            details['statistics'] = stats_result['details']

            # Calculate anomaly score
            anomaly_score = self._calculate_anomaly_score(anomalies, indicators)

            # Calculate confidence
            confidence = self._calculate_confidence(details)

            return MetadataAnalysisResult(
                has_metadata=len(details.get('exif', {}).get('raw', {})) > 0,
                anomaly_score=round(anomaly_score, 4),
                anomalies=list(set(anomalies)),
                indicators=list(set(indicators)),
                details=details,
                confidence=round(confidence, 4),
            )

        except Exception as e:
            logger.error(f"Error analyzing metadata: {e}")
            return MetadataAnalysisResult(
                anomaly_score=0.5,
                indicators=["metadata_analysis_error"],
                details={"error": str(e)},
                confidence=0.0,
            )

    def _analyze_exif(self, image: Image.Image) -> Dict[str, Any]:
        """
        Analyze EXIF metadata.

        Args:
            image: PIL Image

        Returns:
            Analysis results
        """
        anomalies = []
        indicators = []
        details = {
            'has_exif': False,
            'field_count': 0,
            'raw': {},
        }

        try:
            exif_data = image._getexif()

            if exif_data is None:
                if self.require_exif:
                    anomalies.append(MetadataAnomalyType.MISSING_EXIF)
                    indicators.append("no_exif_data")
                return {'anomalies': anomalies, 'indicators': indicators, 'details': details}

            details['has_exif'] = True
            details['field_count'] = len(exif_data)

            # Parse EXIF tags
            parsed_exif = {}
            for tag_id, value in exif_data.items():
                tag_name = TAGS.get(tag_id, str(tag_id))
                try:
                    if isinstance(value, bytes):
                        value = value.decode('utf-8', errors='ignore')
                    parsed_exif[tag_name] = str(value)
                except Exception:
                    parsed_exif[tag_name] = "<binary>"

            details['raw'] = parsed_exif

            # Check for stripped metadata (minimal EXIF)
            if len(exif_data) < 5:
                if self.strict_mode:
                    anomalies.append(MetadataAnomalyType.STRIPPED_METADATA)
                    indicators.append("minimal_exif_data")

            # Check for software signatures
            software = parsed_exif.get('Software', '').lower()
            processing_software = parsed_exif.get('ProcessingSoftware', '').lower()
            all_software = f"{software} {processing_software}"

            for pattern in self.AI_SOFTWARE_PATTERNS:
                if pattern in all_software:
                    anomalies.append(MetadataAnomalyType.SOFTWARE_INDICATOR)
                    indicators.append(f"ai_software_detected_{pattern}")
                    details['detected_software'] = pattern

            # Check camera make/model
            camera_make = parsed_exif.get('Make', '').lower()
            camera_model = parsed_exif.get('Model', '')

            if camera_make:
                details['camera_make'] = camera_make
                details['camera_model'] = camera_model

                # Check if it's a known legitimate camera
                is_known_camera = any(
                    make in camera_make
                    for make in self.LEGITIMATE_CAMERA_MAKES
                )
                details['is_known_camera'] = is_known_camera

            # Check timestamp consistency
            date_taken = parsed_exif.get('DateTimeOriginal')
            date_digitized = parsed_exif.get('DateTimeDigitized')
            date_modified = parsed_exif.get('DateTime')

            if date_taken and date_digitized and date_modified:
                # All dates should be close together for authentic photos
                try:
                    dates = []
                    for date_str in [date_taken, date_digitized, date_modified]:
                        if date_str and date_str != '0000:00:00 00:00:00':
                            dt = datetime.strptime(date_str, '%Y:%m:%d %H:%M:%S')
                            dates.append(dt)

                    if len(dates) >= 2:
                        max_diff = max(
                            abs((dates[i] - dates[j]).total_seconds())
                            for i in range(len(dates))
                            for j in range(i + 1, len(dates))
                        )

                        # More than 1 hour difference is suspicious
                        if max_diff > 3600:
                            anomalies.append(MetadataAnomalyType.INCONSISTENT_TIMESTAMPS)
                            indicators.append("timestamp_inconsistency")
                            details['timestamp_diff_seconds'] = max_diff

                except Exception as e:
                    logger.debug(f"Could not parse dates: {e}")

            # Check for GPS data (authentic photos often have it)
            if 'GPSInfo' in parsed_exif:
                details['has_gps'] = True
            else:
                details['has_gps'] = False

        except Exception as e:
            logger.debug(f"EXIF analysis error: {e}")
            if self.require_exif:
                anomalies.append(MetadataAnomalyType.MISSING_EXIF)

        return {'anomalies': anomalies, 'indicators': indicators, 'details': details}

    def _analyze_resolution(self, image: Image.Image) -> Dict[str, Any]:
        """
        Analyze image resolution for GAN patterns.

        Args:
            image: PIL Image

        Returns:
            Analysis results
        """
        anomalies = []
        indicators = []
        width, height = image.size

        details = {
            'width': width,
            'height': height,
            'is_square': width == height,
            'is_power_of_two': self._is_power_of_two(width) and self._is_power_of_two(height),
        }

        # Check for common GAN resolutions
        if width == height and width in self.GAN_RESOLUTIONS:
            anomalies.append(MetadataAnomalyType.GAN_RESOLUTION)
            indicators.append(f"gan_resolution_{width}x{height}")
            details['common_gan_size'] = True
        else:
            details['common_gan_size'] = False

        # Check for unusual aspect ratios
        aspect_ratio = width / height if height > 0 else 0
        details['aspect_ratio'] = round(aspect_ratio, 4)

        # Very unusual aspect ratios might indicate cropping/manipulation
        if aspect_ratio < 0.5 or aspect_ratio > 2.0:
            if self.strict_mode:
                anomalies.append(MetadataAnomalyType.RESOLUTION_ANOMALY)
                indicators.append("unusual_aspect_ratio")

        return {'anomalies': anomalies, 'indicators': indicators, 'details': details}

    def _analyze_compression(
        self,
        image: Image.Image,
        image_bytes: bytes
    ) -> Dict[str, Any]:
        """
        Analyze compression characteristics.

        Args:
            image: PIL Image
            image_bytes: Raw image bytes

        Returns:
            Analysis results
        """
        anomalies = []
        indicators = []
        details = {
            'format': image.format,
            'mode': image.mode,
            'file_size': len(image_bytes),
        }

        # For JPEG, analyze quality
        if image.format == 'JPEG':
            # Estimate JPEG quality from file size and dimensions
            pixels = image.width * image.height
            if pixels > 0:
                bits_per_pixel = (len(image_bytes) * 8) / pixels
                details['bits_per_pixel'] = round(bits_per_pixel, 4)

                # Very low bits per pixel might indicate heavy compression/manipulation
                if bits_per_pixel < 0.5:
                    indicators.append("heavy_compression")
                # Very high might indicate minimal compression (unusual for web images)
                elif bits_per_pixel > 10:
                    indicators.append("minimal_compression")

            # Check for double JPEG compression artifacts
            double_compression = self._detect_double_compression(image_bytes)
            if double_compression:
                anomalies.append(MetadataAnomalyType.COMPRESSION_ANOMALY)
                indicators.append("double_jpeg_compression")
                details['double_compression'] = True
            else:
                details['double_compression'] = False

        # For PNG, check for unusual characteristics
        elif image.format == 'PNG':
            # PNG of photographic content is unusual
            if image.mode == 'RGB' and image.width * image.height > 1000000:
                indicators.append("png_photographic_content")

        return {'anomalies': anomalies, 'indicators': indicators, 'details': details}

    def _detect_double_compression(self, image_bytes: bytes) -> bool:
        """
        Detect double JPEG compression.

        Double compression can indicate image manipulation.

        Args:
            image_bytes: Raw JPEG bytes

        Returns:
            True if double compression detected
        """
        try:
            # Look for multiple JPEG markers that might indicate re-encoding
            data = image_bytes

            # Count SOI (Start of Image) markers
            soi_count = data.count(b'\xff\xd8')

            # Multiple SOI markers suggest embedded images or re-encoding
            if soi_count > 1:
                return True

            # Check for non-standard quantization tables
            # (This is a simplified check - full analysis would be more complex)
            dqt_marker = b'\xff\xdb'
            dqt_positions = []
            pos = 0

            while True:
                pos = data.find(dqt_marker, pos)
                if pos == -1:
                    break
                dqt_positions.append(pos)
                pos += 1

            # Multiple DQT markers with unusual patterns can indicate re-compression
            if len(dqt_positions) > 2:
                return True

            return False

        except Exception:
            return False

    def _analyze_format(
        self,
        image: Image.Image,
        filename: str,
        image_bytes: bytes
    ) -> Dict[str, Any]:
        """
        Analyze file format consistency.

        Args:
            image: PIL Image
            filename: Original filename
            image_bytes: Raw bytes

        Returns:
            Analysis results
        """
        anomalies = []
        indicators = []
        details = {}

        # Get extension from filename
        extension = filename.lower().split('.')[-1] if '.' in filename else ''
        details['extension'] = extension

        # Map extensions to formats
        extension_format_map = {
            'jpg': 'JPEG',
            'jpeg': 'JPEG',
            'png': 'PNG',
            'gif': 'GIF',
            'webp': 'WEBP',
            'bmp': 'BMP',
            'tiff': 'TIFF',
            'tif': 'TIFF',
        }

        expected_format = extension_format_map.get(extension)
        actual_format = image.format

        details['expected_format'] = expected_format
        details['actual_format'] = actual_format

        # Check for format mismatch
        if expected_format and actual_format and expected_format != actual_format:
            anomalies.append(MetadataAnomalyType.FORMAT_MISMATCH)
            indicators.append(f"format_mismatch_{expected_format}_vs_{actual_format}")
            details['format_matches'] = False
        else:
            details['format_matches'] = True

        # Check magic bytes
        magic_bytes = image_bytes[:8]
        details['magic_bytes'] = magic_bytes.hex()

        return {'anomalies': anomalies, 'indicators': indicators, 'details': details}

    def _analyze_thumbnail(self, image: Image.Image) -> Dict[str, Any]:
        """
        Analyze embedded thumbnail for consistency.

        Args:
            image: PIL Image

        Returns:
            Analysis results
        """
        anomalies = []
        indicators = []
        details = {'has_thumbnail': False}

        try:
            # Check for EXIF thumbnail
            exif_data = image._getexif()
            if not exif_data:
                return {'anomalies': anomalies, 'indicators': indicators, 'details': details}

            # Tag 0x0201 is ThumbnailData for JPEG
            if 0x0201 in exif_data or 'JPEGThumbnail' in str(exif_data):
                details['has_thumbnail'] = True

                # In a complete implementation, we would:
                # 1. Extract the thumbnail
                # 2. Compare it with a downscaled version of the main image
                # 3. Check for significant differences that might indicate manipulation

                # For now, just note the presence
                details['thumbnail_analysis'] = "present"

        except Exception as e:
            logger.debug(f"Thumbnail analysis error: {e}")

        return {'anomalies': anomalies, 'indicators': indicators, 'details': details}

    def _analyze_image_statistics(self, image: Image.Image) -> Dict[str, Any]:
        """
        Analyze statistical properties of the image.

        Args:
            image: PIL Image

        Returns:
            Analysis results
        """
        anomalies = []
        indicators = []
        details = {}

        try:
            # Convert to numpy array
            img_array = np.array(image.convert('RGB'))

            # Calculate basic statistics
            details['mean'] = float(np.mean(img_array))
            details['std'] = float(np.std(img_array))
            details['min'] = int(np.min(img_array))
            details['max'] = int(np.max(img_array))

            # Check for unusual value distributions
            # GAN images sometimes have unusual pixel value distributions

            # Check for values near boundaries
            near_zero = np.sum(img_array < 5) / img_array.size
            near_max = np.sum(img_array > 250) / img_array.size

            details['near_zero_ratio'] = round(near_zero, 4)
            details['near_max_ratio'] = round(near_max, 4)

            # Very low variance can indicate synthetic images
            if details['std'] < 20:
                indicators.append("low_pixel_variance")

            # Check color channel correlation
            if img_array.shape[2] >= 3:
                r = img_array[:, :, 0].flatten()
                g = img_array[:, :, 1].flatten()
                b = img_array[:, :, 2].flatten()

                # High correlation between channels is normal for natural images
                rg_corr = np.corrcoef(r, g)[0, 1]
                rb_corr = np.corrcoef(r, b)[0, 1]
                gb_corr = np.corrcoef(g, b)[0, 1]

                avg_corr = (rg_corr + rb_corr + gb_corr) / 3
                details['channel_correlation'] = round(avg_corr, 4)

                # Very low correlation might indicate manipulation
                if avg_corr < 0.5:
                    indicators.append("low_channel_correlation")

        except Exception as e:
            logger.debug(f"Image statistics error: {e}")

        return {'anomalies': anomalies, 'indicators': indicators, 'details': details}

    def _is_power_of_two(self, n: int) -> bool:
        """Check if a number is a power of two."""
        return n > 0 and (n & (n - 1)) == 0

    def _calculate_anomaly_score(
        self,
        anomalies: List[MetadataAnomalyType],
        indicators: List[str]
    ) -> float:
        """
        Calculate overall anomaly score.

        Args:
            anomalies: List of detected anomalies
            indicators: List of indicator strings

        Returns:
            Anomaly score (0-1)
        """
        # Weight different anomalies
        anomaly_weights = {
            MetadataAnomalyType.SOFTWARE_INDICATOR: 0.8,
            MetadataAnomalyType.GAN_RESOLUTION: 0.6,
            MetadataAnomalyType.FORMAT_MISMATCH: 0.5,
            MetadataAnomalyType.COMPRESSION_ANOMALY: 0.4,
            MetadataAnomalyType.MISSING_EXIF: 0.3,
            MetadataAnomalyType.STRIPPED_METADATA: 0.3,
            MetadataAnomalyType.INCONSISTENT_TIMESTAMPS: 0.4,
            MetadataAnomalyType.THUMBNAIL_MISMATCH: 0.5,
            MetadataAnomalyType.CAMERA_INCONSISTENCY: 0.4,
            MetadataAnomalyType.RESOLUTION_ANOMALY: 0.3,
        }

        total_weight = sum(anomaly_weights.get(a, 0.2) for a in anomalies)

        # Add indicator weight
        indicator_weight = len(indicators) * 0.1

        score = min(total_weight + indicator_weight, 1.0)
        return score

    def _calculate_confidence(self, details: Dict[str, Any]) -> float:
        """
        Calculate confidence in the analysis.

        Args:
            details: Analysis details

        Returns:
            Confidence score (0-1)
        """
        confidence = 0.5  # Base confidence

        # Higher confidence if we have EXIF data to analyze
        if details.get('exif', {}).get('has_exif'):
            confidence += 0.2

        # Higher confidence with more metadata
        field_count = details.get('exif', {}).get('field_count', 0)
        if field_count > 20:
            confidence += 0.2
        elif field_count > 10:
            confidence += 0.1

        # Higher confidence if we detect a known camera
        if details.get('exif', {}).get('is_known_camera'):
            confidence += 0.1

        return min(confidence, 1.0)


# Create singleton instance
metadata_analyzer = MetadataAnalyzer()
