# Photo Analysis Service

AI-powered photo analysis service for the dating platform. Provides face detection, quality assessment, NSFW detection, deepfake detection, and selfie verification.

## Features

- **Face Detection**: Detects faces and facial landmarks
- **Photo Quality Assessment**: Analyzes resolution, brightness, blur, and overall quality
- **NSFW Detection**: Identifies inappropriate or explicit content
- **Deepfake Detection**: Detects AI-generated or manipulated images
- **Selfie Verification**: Compares selfies to profile photos for identity verification

## API Endpoints

### POST /api/photo/analyze
Full photo analysis with all checks.

**Request:**
```json
{
  "photo_url": "https://example.com/photo.jpg",
  "user_id": "user123"
}
```

**Response:**
```json
{
  "photo_url": "https://example.com/photo.jpg",
  "analysis_summary": {
    "faces_detected": 1,
    "quality_score": 85.5,
    "nsfw_score": 0.05,
    "deepfake_score": 0.1,
    "approved": true
  },
  "face_detection": { ... },
  "quality": { ... },
  "nsfw": { ... },
  "deepfake": { ... },
  "approved": true,
  "rejection_reasons": []
}
```

### POST /api/photo/face-detect
Detect faces in photo.

**Request:**
```json
{
  "photo_url": "https://example.com/photo.jpg"
}
```

**Response:**
```json
{
  "photo_url": "https://example.com/photo.jpg",
  "faces_detected": 1,
  "faces": [
    {
      "bounding_box": {
        "x": 100,
        "y": 50,
        "width": 200,
        "height": 250
      },
      "confidence": 0.95,
      "landmarks": {
        "left_eye": {"x": 150, "y": 100},
        "right_eye": {"x": 250, "y": 100},
        "nose": {"x": 200, "y": 150},
        "mouth": {"x": 200, "y": 220}
      },
      "attributes": {
        "estimated_age": 28,
        "gender": "unknown",
        "smile": 0.8
      }
    }
  ],
  "has_face": true
}
```

### POST /api/photo/quality
Assess photo quality.

**Request:**
```json
{
  "photo_url": "https://example.com/photo.jpg"
}
```

**Response:**
```json
{
  "photo_url": "https://example.com/photo.jpg",
  "quality_score": 85.5,
  "quality_level": "good",
  "resolution": {
    "width": 1920,
    "height": 1080
  },
  "issues": [],
  "details": {
    "pixel_count": 2073600,
    "aspect_ratio": 1.78,
    "brightness_score": 128.5
  }
}
```

### POST /api/photo/nsfw
Detect NSFW content.

**Request:**
```json
{
  "photo_url": "https://example.com/photo.jpg"
}
```

**Response:**
```json
{
  "photo_url": "https://example.com/photo.jpg",
  "is_nsfw": false,
  "nsfw_score": 0.05,
  "categories": {
    "nudity": 0.02,
    "sexual": 0.01,
    "suggestive": 0.05,
    "violence": 0.0,
    "gore": 0.0
  },
  "flagged_regions": []
}
```

### POST /api/photo/deepfake
Detect AI-generated images.

**Request:**
```json
{
  "photo_url": "https://example.com/photo.jpg"
}
```

**Response:**
```json
{
  "photo_url": "https://example.com/photo.jpg",
  "is_deepfake": false,
  "deepfake_score": 0.1,
  "indicators": [],
  "confidence": 0.9
}
```

### POST /api/photo/verify-selfie
Verify selfie matches profile photos.

**Request:**
```json
{
  "selfie_url": "https://example.com/selfie.jpg",
  "profile_photo_urls": [
    "https://example.com/profile1.jpg",
    "https://example.com/profile2.jpg"
  ],
  "user_id": "user123"
}
```

**Response:**
```json
{
  "user_id": "user123",
  "is_match": true,
  "match_score": 0.85,
  "matched_photos": [
    "https://example.com/profile1.jpg"
  ],
  "details": {
    "selfie_analyzed": true,
    "profile_photos_analyzed": 2,
    "matches_found": 1,
    "highest_similarity": 0.85
  }
}
```

## Quality Levels

- **EXCELLENT** (80-100): High-resolution, well-lit, clear photo
- **GOOD** (60-79): Good quality, minor issues
- **FAIR** (40-59): Acceptable quality, some issues
- **POOR** (0-39): Low quality, significant issues

## Photo Approval Criteria

Photos are automatically rejected if:
- No face detected
- Multiple faces detected
- Quality score < 40
- NSFW content detected
- Deepfake/AI-generated detected

## Running the Service

### Using Docker

```bash
docker build -t photo-analysis .
docker run -p 8003:8003 photo-analysis
```

### Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run the service
python main.py
```

The service will be available at `http://localhost:8003`.

### Health Check

```bash
curl http://localhost:8003/health
```

## Technology Stack

- **FastAPI**: Modern Python web framework
- **Pydantic**: Data validation
- **Pillow**: Image processing
- **OpenCV**: Computer vision (optional)
- **Python 3.11**: Latest Python version

## Production Enhancements

For production deployment, consider integrating:

**Face Detection:**
- OpenCV with Haar Cascades or DNN models
- dlib face detector
- face_recognition library
- Cloud APIs: Azure Face API, AWS Rekognition, Google Vision API

**NSFW Detection:**
- NSFW detection models (yahoo/open_nsfw, GantMan/nsfw_model)
- NudeNet
- Cloud-based content moderation APIs

**Deepfake Detection:**
- Specialized deepfake detection models
- Forensic analysis tools
- Frequency domain analysis (FFT for GAN artifacts)

**Quality Assessment:**
- BRISQUE (Blind/Referenceless Image Spatial Quality Evaluator)
- NIQE (Natural Image Quality Evaluator)
- Deep learning-based quality assessment

**Face Recognition:**
- face_recognition (based on dlib)
- DeepFace
- FaceNet, ArcFace, or similar embedding models

## Development

The service is structured as follows:

```
photo-analysis/
├── main.py                      # FastAPI application
├── models.py                    # Pydantic models
├── services/                    # Business logic
│   ├── face_detector.py         # Face detection
│   ├── quality_analyzer.py      # Quality assessment
│   ├── nsfw_detector.py         # NSFW detection
│   ├── deepfake_detector.py     # Deepfake detection
│   └── selfie_verifier.py       # Selfie verification
├── requirements.txt             # Python dependencies
├── Dockerfile                   # Container build
└── README.md                   # This file
```

## Performance Notes

- Current implementation uses simplified algorithms for fast responses
- For production accuracy, integrate ML models and cloud APIs
- Consider caching analysis results for frequently checked images
- Use asynchronous processing for bulk operations
- Implement rate limiting for external API calls

## License

Proprietary - All rights reserved
