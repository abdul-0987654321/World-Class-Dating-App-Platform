"""
FastAPI application for ML-based Deepfake Detection Service.

Endpoints:
- POST /api/v1/deepfake/analyze-image - Analyze image for deepfakes
- POST /api/v1/deepfake/analyze-video - Analyze video for deepfakes
- GET /api/v1/deepfake/health - Health check
"""

import io
import os
import logging
from contextlib import asynccontextmanager
from typing import List, Optional, AsyncGenerator

from fastapi import FastAPI, File, UploadFile, HTTPException, Request, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, HttpUrl
from pydantic_settings import BaseSettings
import uvicorn
import httpx
import numpy as np
import cv2
from PIL import Image
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from starlette.responses import Response

from detector import DeepfakeDetector, DetectionResult, VideoAnalysisResult

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# Configuration
class Settings(BaseSettings):
    """Application settings."""
    host: str = "0.0.0.0"
    port: int = 8010
    debug: bool = False
    model_path: Optional[str] = None
    detection_threshold: float = 0.5
    max_file_size: int = 50 * 1024 * 1024  # 50MB
    max_video_frames: int = 300  # Max frames to analyze
    allowed_image_types: List[str] = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
    allowed_video_types: List[str] = ["video/mp4", "video/quicktime", "video/x-msvideo", "video/webm"]

    class Config:
        env_prefix = "DEEPFAKE_"


settings = Settings()


# Prometheus metrics
REQUEST_COUNT = Counter(
    'deepfake_requests_total',
    'Total deepfake detection requests',
    ['endpoint', 'status']
)
REQUEST_LATENCY = Histogram(
    'deepfake_request_latency_seconds',
    'Request latency',
    ['endpoint']
)
DETECTION_RESULTS = Counter(
    'deepfake_detection_results_total',
    'Detection results by classification',
    ['is_deepfake']
)


# Request/Response models
class ImageAnalyzeRequest(BaseModel):
    """Request for analyzing image from URL."""
    image_url: str = Field(..., description="URL of the image to analyze")
    user_id: Optional[str] = Field(None, description="User ID for logging")


class ImageAnalyzeResponse(BaseModel):
    """Response from image deepfake analysis."""
    is_deepfake: bool = Field(..., description="Whether image is likely a deepfake")
    confidence: float = Field(..., ge=0, le=1, description="Detection confidence")
    deepfake_score: float = Field(..., ge=0, le=1, description="Deepfake probability score")
    indicators: List[str] = Field(default_factory=list, description="Detected deepfake indicators")
    face_count: int = Field(default=0, description="Number of faces detected")
    analysis_details: dict = Field(default_factory=dict, description="Detailed analysis results")


class VideoAnalyzeRequest(BaseModel):
    """Request for analyzing video from URL."""
    video_url: str = Field(..., description="URL of the video to analyze")
    user_id: Optional[str] = Field(None, description="User ID for logging")
    max_frames: Optional[int] = Field(None, description="Maximum frames to analyze")


class VideoAnalyzeResponse(BaseModel):
    """Response from video deepfake analysis."""
    is_deepfake: bool = Field(..., description="Whether video is likely a deepfake")
    confidence: float = Field(..., ge=0, le=1, description="Detection confidence")
    deepfake_score: float = Field(..., ge=0, le=1, description="Deepfake probability score")
    frame_count: int = Field(..., description="Number of frames analyzed")
    suspicious_frames: int = Field(..., description="Number of suspicious frames")
    indicators: List[str] = Field(default_factory=list, description="Detected deepfake indicators")
    temporal_consistency_score: float = Field(..., ge=0, le=1, description="Temporal consistency score")
    blink_analysis: dict = Field(default_factory=dict, description="Eye blink analysis results")


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    service: str
    version: str
    model_loaded: bool
    device: str


# Application lifespan
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator:
    """Application lifespan handler."""
    logger.info("Starting Deepfake Detection Service")

    # Initialize detector
    detector = DeepfakeDetector(
        model_path=settings.model_path,
        detection_threshold=settings.detection_threshold,
    )
    await detector.initialize()
    app.state.detector = detector

    # Initialize HTTP client
    app.state.http_client = httpx.AsyncClient(timeout=60.0)

    logger.info("Deepfake Detection Service started successfully")

    yield

    # Cleanup
    logger.info("Shutting down Deepfake Detection Service")
    await detector.close()
    await app.state.http_client.aclose()


# Create FastAPI app
app = FastAPI(
    title="Deepfake Detection Service",
    description="ML-powered deepfake detection for FLAMORAL dating platform",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Exception handlers
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    REQUEST_COUNT.labels(endpoint=request.url.path, status="error").inc()
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error": str(exc)}
    )


# Endpoints
@app.get("/api/v1/deepfake/health", response_model=HealthResponse)
async def health_check(request: Request):
    """Health check endpoint."""
    detector: DeepfakeDetector = request.app.state.detector

    return HealthResponse(
        status="healthy",
        service="deepfake-detection",
        version="1.0.0",
        model_loaded=detector._initialized,
        device=detector.device,
    )


@app.get("/health")
async def simple_health():
    """Simple health check for load balancers."""
    return {"status": "ok"}


@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint."""
    return Response(
        content=generate_latest(),
        media_type=CONTENT_TYPE_LATEST,
    )


@app.post("/api/v1/deepfake/analyze-image", response_model=ImageAnalyzeResponse)
async def analyze_image_endpoint(
    request: Request,
    file: Optional[UploadFile] = File(None),
    image_url: Optional[str] = Query(None, description="URL of image to analyze"),
    user_id: Optional[str] = Query(None, description="User ID for logging"),
):
    """
    Analyze an image for deepfake indicators.

    Accepts either:
    - File upload (multipart/form-data)
    - Image URL (query parameter)

    Returns deepfake detection results including:
    - Classification (real/fake)
    - Confidence score
    - Detected indicators (face artifacts, GAN fingerprints, etc.)
    """
    with REQUEST_LATENCY.labels(endpoint="analyze_image").time():
        detector: DeepfakeDetector = request.app.state.detector
        http_client: httpx.AsyncClient = request.app.state.http_client

        try:
            # Get image bytes
            if file is not None:
                # Validate file type
                if file.content_type not in settings.allowed_image_types:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Invalid file type. Allowed: {settings.allowed_image_types}"
                    )

                # Read file
                image_bytes = await file.read()

                if len(image_bytes) > settings.max_file_size:
                    raise HTTPException(
                        status_code=400,
                        detail=f"File too large. Max size: {settings.max_file_size} bytes"
                    )

            elif image_url is not None:
                # Download from URL
                try:
                    response = await http_client.get(image_url)
                    response.raise_for_status()
                    image_bytes = response.content

                    if len(image_bytes) > settings.max_file_size:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Image too large. Max size: {settings.max_file_size} bytes"
                        )

                except httpx.RequestError as e:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Failed to download image: {str(e)}"
                    )

            else:
                raise HTTPException(
                    status_code=400,
                    detail="Either file upload or image_url must be provided"
                )

            # Analyze image
            result = await detector.analyze_image(image_bytes)

            # Record metrics
            REQUEST_COUNT.labels(endpoint="analyze_image", status="success").inc()
            DETECTION_RESULTS.labels(is_deepfake=str(result.is_deepfake).lower()).inc()

            logger.info(f"Image analysis complete: is_deepfake={result.is_deepfake}, score={result.deepfake_score}")

            return ImageAnalyzeResponse(
                is_deepfake=result.is_deepfake,
                confidence=result.confidence,
                deepfake_score=result.deepfake_score,
                indicators=result.indicators,
                face_count=result.face_count,
                analysis_details=result.analysis_details,
            )

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Image analysis failed: {e}", exc_info=True)
            REQUEST_COUNT.labels(endpoint="analyze_image", status="error").inc()
            raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/deepfake/analyze-image-json", response_model=ImageAnalyzeResponse)
async def analyze_image_from_json(
    request: Request,
    body: ImageAnalyzeRequest,
):
    """
    Analyze an image from URL (JSON request body).

    Alternative to query parameter for URL-based analysis.
    """
    return await analyze_image_endpoint(
        request=request,
        file=None,
        image_url=body.image_url,
        user_id=body.user_id,
    )


@app.post("/api/v1/deepfake/analyze-video", response_model=VideoAnalyzeResponse)
async def analyze_video_endpoint(
    request: Request,
    file: Optional[UploadFile] = File(None),
    video_url: Optional[str] = Query(None, description="URL of video to analyze"),
    user_id: Optional[str] = Query(None, description="User ID for logging"),
    max_frames: Optional[int] = Query(None, description="Maximum frames to analyze"),
):
    """
    Analyze a video for deepfake indicators.

    Performs:
    - Frame-by-frame deepfake detection
    - Temporal consistency analysis
    - Eye blinking pattern analysis

    Returns comprehensive video analysis results.
    """
    with REQUEST_LATENCY.labels(endpoint="analyze_video").time():
        detector: DeepfakeDetector = request.app.state.detector
        http_client: httpx.AsyncClient = request.app.state.http_client

        try:
            # Get video bytes
            if file is not None:
                if file.content_type not in settings.allowed_video_types:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Invalid file type. Allowed: {settings.allowed_video_types}"
                    )

                video_bytes = await file.read()

            elif video_url is not None:
                try:
                    response = await http_client.get(video_url)
                    response.raise_for_status()
                    video_bytes = response.content
                except httpx.RequestError as e:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Failed to download video: {str(e)}"
                    )
            else:
                raise HTTPException(
                    status_code=400,
                    detail="Either file upload or video_url must be provided"
                )

            # Extract frames from video
            frames = await _extract_video_frames(
                video_bytes,
                max_frames=max_frames or settings.max_video_frames
            )

            if len(frames) == 0:
                raise HTTPException(
                    status_code=400,
                    detail="Could not extract frames from video"
                )

            # Analyze video
            result = await detector.check_facial_consistency(frames)

            # Record metrics
            REQUEST_COUNT.labels(endpoint="analyze_video", status="success").inc()
            DETECTION_RESULTS.labels(is_deepfake=str(result.is_deepfake).lower()).inc()

            logger.info(f"Video analysis complete: is_deepfake={result.is_deepfake}, frames={result.frame_count}")

            return VideoAnalyzeResponse(
                is_deepfake=result.is_deepfake,
                confidence=result.confidence,
                deepfake_score=result.deepfake_score,
                frame_count=result.frame_count,
                suspicious_frames=result.suspicious_frames,
                indicators=result.indicators,
                temporal_consistency_score=result.temporal_consistency_score,
                blink_analysis=result.blink_analysis,
            )

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Video analysis failed: {e}", exc_info=True)
            REQUEST_COUNT.labels(endpoint="analyze_video", status="error").inc()
            raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/deepfake/analyze-video-json", response_model=VideoAnalyzeResponse)
async def analyze_video_from_json(
    request: Request,
    body: VideoAnalyzeRequest,
):
    """
    Analyze a video from URL (JSON request body).
    """
    return await analyze_video_endpoint(
        request=request,
        file=None,
        video_url=body.video_url,
        user_id=body.user_id,
        max_frames=body.max_frames,
    )


async def _extract_video_frames(
    video_bytes: bytes,
    max_frames: int = 300,
    sample_rate: int = 1,
) -> List[np.ndarray]:
    """
    Extract frames from video bytes.

    Args:
        video_bytes: Raw video bytes
        max_frames: Maximum number of frames to extract
        sample_rate: Sample every nth frame

    Returns:
        List of frames as numpy arrays (BGR)
    """
    frames = []

    # Write bytes to temporary file for OpenCV
    import tempfile
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp_file:
        tmp_file.write(video_bytes)
        tmp_path = tmp_file.name

    try:
        cap = cv2.VideoCapture(tmp_path)

        frame_idx = 0
        while len(frames) < max_frames:
            ret, frame = cap.read()
            if not ret:
                break

            if frame_idx % sample_rate == 0:
                frames.append(frame)

            frame_idx += 1

        cap.release()

    finally:
        # Cleanup temp file
        import os
        os.unlink(tmp_path)

    return frames


# Internal API for service-to-service communication
@app.post("/internal/analyze", response_model=ImageAnalyzeResponse)
async def internal_analyze(
    request: Request,
    body: ImageAnalyzeRequest,
):
    """
    Internal endpoint for service-to-service image analysis.

    Used by media-service for automated deepfake checks.
    """
    return await analyze_image_from_json(request, body)


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level="info",
    )
