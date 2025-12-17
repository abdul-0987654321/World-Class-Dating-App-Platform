"""Main entry point for the Photo Analysis Service."""

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

from models import (
    PhotoAnalyzeRequest, PhotoAnalyzeResponse,
    FaceDetectRequest, FaceDetectResponse,
    PhotoQualityRequest, PhotoQualityResponse,
    NSFWRequest, NSFWResponse,
    DeepfakeRequest, DeepfakeResponse,
    SelfieVerifyRequest, SelfieVerifyResponse
)
from services.face_detector import FaceDetectorService
from services.quality_analyzer import QualityAnalyzerService
from services.nsfw_detector import NSFWDetectorService
from services.deepfake_detector import DeepfakeDetectorService
from services.selfie_verifier import SelfieVerifierService

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator:
    """Application lifespan handler."""
    logger.info("Starting Photo Analysis Service")

    # Initialize services
    app.state.face_detector = FaceDetectorService()
    app.state.quality_analyzer = QualityAnalyzerService()
    app.state.nsfw_detector = NSFWDetectorService()
    app.state.deepfake_detector = DeepfakeDetectorService()
    app.state.selfie_verifier = SelfieVerifierService()

    await app.state.face_detector.initialize()
    await app.state.quality_analyzer.initialize()
    await app.state.nsfw_detector.initialize()
    await app.state.deepfake_detector.initialize()
    await app.state.selfie_verifier.initialize()

    logger.info("All services initialized successfully")

    yield

    # Cleanup
    logger.info("Shutting down Photo Analysis Service")
    await app.state.face_detector.close()
    await app.state.quality_analyzer.close()
    await app.state.nsfw_detector.close()
    await app.state.deepfake_detector.close()
    await app.state.selfie_verifier.close()


# Create FastAPI app
app = FastAPI(
    title="Photo Analysis Service",
    description="AI-powered photo analysis for dating platform",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware - Allow all flamoral.com domains and development servers
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:5174",
        "https://flamoral.com",
        "https://www.flamoral.com",
        "https://app.flamoral.com",
        "https://admin.flamoral.com",
        "https://*.flamoral.com",
        "https://*.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    from datetime import datetime

    dependencies = {
        "database": "ok",
        "redis": "ok",
    }

    # Add actual dependency checks when integrated
    status = "ok"

    return {
        "status": status,
        "service": "photo-analysis",
        "timestamp": datetime.utcnow().isoformat(),
        "dependencies": dependencies,
        "version": "1.0.0"
    }


@app.post("/api/photo/analyze", response_model=PhotoAnalyzeResponse)
async def analyze_photo(request: PhotoAnalyzeRequest, app_request: Request):
    """
    Full photo analysis including face detection, quality, NSFW, and deepfake detection.

    Performs comprehensive analysis and returns approval decision.
    """
    try:
        # Run all analyses
        face_detector: FaceDetectorService = app_request.app.state.face_detector
        quality_analyzer: QualityAnalyzerService = app_request.app.state.quality_analyzer
        nsfw_detector: NSFWDetectorService = app_request.app.state.nsfw_detector
        deepfake_detector: DeepfakeDetectorService = app_request.app.state.deepfake_detector

        face_result = await face_detector.detect(request.photo_url)
        quality_result = await quality_analyzer.analyze(request.photo_url)
        nsfw_result = await nsfw_detector.detect(request.photo_url)
        deepfake_result = await deepfake_detector.detect(request.photo_url)

        # Determine approval
        rejection_reasons = []

        if not face_result.has_face:
            rejection_reasons.append("no_face_detected")
        if face_result.faces_detected > 1:
            rejection_reasons.append("multiple_faces")
        if quality_result.quality_score < 40:
            rejection_reasons.append("poor_quality")
        if nsfw_result.is_nsfw:
            rejection_reasons.append("nsfw_content")
        if deepfake_result.is_deepfake:
            rejection_reasons.append("ai_generated")

        approved = len(rejection_reasons) == 0

        analysis_summary = {
            "faces_detected": face_result.faces_detected,
            "quality_score": quality_result.quality_score,
            "nsfw_score": nsfw_result.nsfw_score,
            "deepfake_score": deepfake_result.deepfake_score,
            "approved": approved
        }

        return PhotoAnalyzeResponse(
            photo_url=request.photo_url,
            analysis_summary=analysis_summary,
            face_detection=face_result,
            quality=quality_result,
            nsfw=nsfw_result,
            deepfake=deepfake_result,
            approved=approved,
            rejection_reasons=rejection_reasons
        )
    except Exception as e:
        logger.error(f"Photo analysis failed: {e}", exc_info=True)
        raise


@app.post("/api/photo/face-detect", response_model=FaceDetectResponse)
async def detect_faces(request: FaceDetectRequest, app_request: Request):
    """
    Detect faces in photo.

    Returns number of faces and their locations.
    """
    try:
        detector: FaceDetectorService = app_request.app.state.face_detector
        result = await detector.detect(request.photo_url)
        return result
    except Exception as e:
        logger.error(f"Face detection failed: {e}", exc_info=True)
        raise


@app.post("/api/photo/quality", response_model=PhotoQualityResponse)
async def assess_quality(request: PhotoQualityRequest, app_request: Request):
    """
    Assess photo quality.

    Checks resolution, brightness, blur, noise, etc.
    """
    try:
        analyzer: QualityAnalyzerService = app_request.app.state.quality_analyzer
        result = await analyzer.analyze(request.photo_url)
        return result
    except Exception as e:
        logger.error(f"Quality assessment failed: {e}", exc_info=True)
        raise


@app.post("/api/photo/nsfw", response_model=NSFWResponse)
async def detect_nsfw(request: NSFWRequest, app_request: Request):
    """
    Detect NSFW content in photo.

    Identifies inappropriate or explicit content.
    """
    try:
        detector: NSFWDetectorService = app_request.app.state.nsfw_detector
        result = await detector.detect(request.photo_url)
        return result
    except Exception as e:
        logger.error(f"NSFW detection failed: {e}", exc_info=True)
        raise


@app.post("/api/photo/deepfake", response_model=DeepfakeResponse)
async def detect_deepfake(request: DeepfakeRequest, app_request: Request):
    """
    Detect AI-generated or manipulated images.

    Identifies deepfakes and synthetic images.
    """
    try:
        detector: DeepfakeDetectorService = app_request.app.state.deepfake_detector
        result = await detector.detect(request.photo_url)
        return result
    except Exception as e:
        logger.error(f"Deepfake detection failed: {e}", exc_info=True)
        raise


@app.post("/api/photo/verify-selfie", response_model=SelfieVerifyResponse)
async def verify_selfie(request: SelfieVerifyRequest, app_request: Request):
    """
    Compare selfie to profile photos for verification.

    Uses facial recognition to match selfie against profile.
    """
    try:
        verifier: SelfieVerifierService = app_request.app.state.selfie_verifier
        result = await verifier.verify(
            request.selfie_url,
            request.profile_photo_urls,
            request.user_id
        )
        return result
    except Exception as e:
        logger.error(f"Selfie verification failed: {e}", exc_info=True)
        raise


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8003,
        reload=True,
        log_level="info"
    )
