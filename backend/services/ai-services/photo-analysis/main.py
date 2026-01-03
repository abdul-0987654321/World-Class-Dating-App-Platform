"""
Main entry point for the Photo Analysis Service.

FLAMORAL Dating Platform - Photo Analysis ML Service
Provides comprehensive photo analysis for profile pictures including:
- Face detection and positioning
- Photo quality assessment
- Content moderation
- Style feedback and recommendations
- Filter/editing detection
"""

import base64
import io
import logging
import time
from contextlib import asynccontextmanager
from typing import AsyncGenerator, Optional

from fastapi import FastAPI, Request, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import httpx
import uvicorn

from models import (
    # Requests
    PhotoAnalyzeRequest,
    FaceDetectRequest,
    PhotoQualityRequest,
    ContentModerationRequest,
    StyleFeedbackRequest,
    NSFWRequest,
    DeepfakeRequest,
    SelfieVerifyRequest,
    BatchPhotoAnalyzeRequest,
    # Responses
    PhotoAnalyzeResponse,
    FaceDetectResponse,
    PhotoQualityResponse,
    ContentModerationResponse,
    StyleFeedbackResponse,
    NSFWResponse,
    DeepfakeResponse,
    SelfieVerifyResponse,
    BatchPhotoAnalyzeResponse,
    PhotoRankingResponse,
    HealthResponse,
    # Sub-components
    FaceInfo,
    ModerationScores,
    StyleInfo,
    FilterInfo,
    PhotoQualityLevel,
    FacePositionEnum,
)
from analyzer import PhotoAnalyzer

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Service version
SERVICE_VERSION = "2.0.0"

# Track startup time for uptime
startup_time: float = 0


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator:
    """Application lifespan handler."""
    global startup_time
    startup_time = time.time()

    logger.info("Starting Photo Analysis Service v%s", SERVICE_VERSION)

    # Initialize the photo analyzer
    app.state.analyzer = PhotoAnalyzer()
    await app.state.analyzer.initialize()

    # Initialize HTTP client for URL fetching
    app.state.http_client = httpx.AsyncClient(timeout=30.0)

    logger.info("Photo Analysis Service initialized successfully")

    yield

    # Cleanup
    logger.info("Shutting down Photo Analysis Service")
    await app.state.analyzer.close()
    await app.state.http_client.aclose()


# Create FastAPI app
app = FastAPI(
    title="Photo Analysis Service",
    description="AI-powered photo analysis for FLAMORAL dating platform",
    version=SERVICE_VERSION,
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


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error": str(exc)}
    )


# ============================================================================
# Helper Functions
# ============================================================================

async def get_image_bytes(
    request: Request,
    photo_url: Optional[str] = None,
    photo_base64: Optional[str] = None
) -> bytes:
    """Get image bytes from URL or base64 data."""
    if photo_base64:
        try:
            # Remove data URL prefix if present
            if "," in photo_base64:
                photo_base64 = photo_base64.split(",")[1]
            return base64.b64decode(photo_base64)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid base64 data: {e}")

    if photo_url:
        try:
            client: httpx.AsyncClient = request.app.state.http_client
            response = await client.get(photo_url)
            response.raise_for_status()
            return response.content
        except httpx.HTTPError as e:
            raise HTTPException(status_code=400, detail=f"Failed to fetch image: {e}")

    raise HTTPException(status_code=400, detail="Either photo_url or photo_base64 is required")


# ============================================================================
# Health Check Endpoint
# ============================================================================

@app.get("/health", response_model=HealthResponse)
@app.get("/api/v1/photo-analysis/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    global startup_time
    uptime = time.time() - startup_time if startup_time > 0 else 0

    return HealthResponse(
        status="healthy",
        service="photo-analysis",
        version=SERVICE_VERSION,
        models_loaded=True,
        uptime_seconds=round(uptime, 2)
    )


# ============================================================================
# Main Analysis Endpoint
# ============================================================================

@app.post("/api/v1/photo-analysis/analyze", response_model=PhotoAnalyzeResponse)
async def analyze_photo(request: PhotoAnalyzeRequest, app_request: Request):
    """
    Full photo analysis for profile pictures.

    Performs comprehensive analysis including:
    - Face detection and positioning
    - Quality assessment
    - Content moderation
    - Style feedback
    - Filter detection

    Returns approval decision with detailed feedback.
    """
    start_time = time.time()

    try:
        # Get image bytes
        image_bytes = await get_image_bytes(
            app_request,
            photo_url=request.photo_url,
            photo_base64=request.photo_base64
        )

        # Run analysis
        analyzer: PhotoAnalyzer = app_request.app.state.analyzer
        result = await analyzer.analyze_profile_photo(
            image_bytes,
            is_primary=request.is_primary
        )

        # Calculate processing time
        processing_time_ms = int((time.time() - start_time) * 1000)

        # Determine approval
        rejection_reasons = []
        if not result.is_appropriate:
            rejection_reasons.append("content_guidelines_violation")
        if not result.face_detected and request.is_primary:
            rejection_reasons.append("no_face_detected_primary")
        if result.face_count > 1 and request.is_primary:
            rejection_reasons.append("multiple_faces_primary")
        if result.quality_score < 30:
            rejection_reasons.append("poor_quality")

        approved = len(rejection_reasons) == 0

        # Build response
        response = PhotoAnalyzeResponse(
            photo_url=request.photo_url,
            quality_score=result.quality_score,
            style_score=result.style_score,
            face_detected=result.face_detected,
            face_count=result.face_count,
            face_position=result.face_position,
            estimated_age=result.estimated_age,
            is_appropriate=result.is_appropriate,
            moderation_flags=result.moderation_flags,
            filter_detected=result.filter_detected,
            filter_type=result.filter_type,
            style_feedback=result.style_feedback,
            recommendations=result.recommendations,
            approved=approved,
            rejection_reasons=rejection_reasons,
            quality_details=result.quality_details.__dict__ if result.quality_details else None,
            face_details=[
                FaceInfo(
                    bounding_box=f.bounding_box,
                    confidence=f.confidence,
                    landmarks=f.landmarks,
                    estimated_age=f.estimated_age,
                    expression=f.expression,
                    smile_score=f.smile_score
                ) for f in result.faces
            ] if result.faces else [],
            moderation_details=result.moderation_details.__dict__ if result.moderation_details else None,
            style_details=StyleInfo(
                style_score=result.style_details.style_score,
                photo_type=result.style_details.photo_type,
                lighting_quality=result.style_details.lighting_quality,
                background_type=result.style_details.background_type,
                positive_aspects=result.style_details.positive_aspects,
                improvement_suggestions=result.style_details.improvement_suggestions
            ) if result.style_details else None,
            filter_details=FilterInfo(
                filter_detected=result.filter_details.filter_detected,
                filter_type=result.filter_details.filter_type,
                filter_confidence=result.filter_details.filter_confidence,
                authenticity_score=result.filter_details.authenticity_score,
                editing_indicators=result.filter_details.editing_indicators
            ) if result.filter_details else None,
            analysis_version=SERVICE_VERSION,
            processing_time_ms=processing_time_ms
        )

        logger.info(
            "Photo analyzed: approved=%s, quality=%.1f, faces=%d, time=%dms",
            approved, result.quality_score, result.face_count, processing_time_ms
        )

        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Photo analysis failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Quality Check Endpoint
# ============================================================================

@app.post("/api/v1/photo-analysis/quality", response_model=PhotoQualityResponse)
async def check_quality(request: PhotoQualityRequest, app_request: Request):
    """
    Check photo quality only.

    Assesses resolution, lighting, blur, compression artifacts, and noise.
    """
    try:
        image_bytes = await get_image_bytes(
            app_request,
            photo_url=request.photo_url,
            photo_base64=request.photo_base64
        )

        analyzer: PhotoAnalyzer = app_request.app.state.analyzer
        image = analyzer._bytes_to_image(image_bytes)
        quality = await analyzer.check_quality(image)

        # Generate recommendations
        recommendations = []
        if "low_resolution" in quality.issues:
            recommendations.append("Upload a higher resolution photo for better visibility")
        if "blurry" in quality.issues:
            recommendations.append("Try a sharper photo - ensure camera is steady")
        if "too_dark" in quality.issues:
            recommendations.append("Take a photo with better lighting")
        if "too_bright" in quality.issues:
            recommendations.append("Reduce exposure or move away from direct light")
        if not quality.issues:
            recommendations.append("Photo quality looks great!")

        return PhotoQualityResponse(
            photo_url=request.photo_url,
            quality_score=quality.overall_score,
            quality_level=PhotoQualityLevel(quality.quality_level.value),
            resolution={"width": quality.metrics.get("width", 0), "height": quality.metrics.get("height", 0)},
            issues=quality.issues,
            details={
                "resolution_score": quality.resolution_score,
                "lighting_score": quality.lighting_score,
                "blur_score": quality.blur_score,
                "compression_score": quality.compression_score,
                "noise_score": quality.noise_score,
                "megapixels": quality.metrics.get("megapixels", 0),
                "mean_brightness": quality.metrics.get("mean_brightness", 0)
            },
            recommendations=recommendations
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Quality check failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Content Moderation Endpoint
# ============================================================================

@app.post("/api/v1/photo-analysis/moderation", response_model=ContentModerationResponse)
async def check_moderation(request: ContentModerationRequest, app_request: Request):
    """
    Content moderation check only.

    Checks for inappropriate content including nudity, violence, and other violations.
    """
    try:
        image_bytes = await get_image_bytes(
            app_request,
            photo_url=request.photo_url,
            photo_base64=request.photo_base64
        )

        analyzer: PhotoAnalyzer = app_request.app.state.analyzer
        image = analyzer._bytes_to_image(image_bytes)
        moderation = await analyzer.check_appropriateness(image)

        # Determine if should reject
        should_reject = not moderation.is_appropriate
        rejection_reason = None

        if should_reject:
            if moderation.nudity_score > 0.6:
                rejection_reason = "Photo contains nudity or explicit content"
            elif moderation.suggestive_score > 0.6:
                rejection_reason = "Photo is too suggestive for a dating profile"
            elif moderation.violence_score > 0.6:
                rejection_reason = "Photo contains violent or graphic content"
            else:
                rejection_reason = "Photo does not meet community guidelines"

        return ContentModerationResponse(
            photo_url=request.photo_url,
            is_appropriate=moderation.is_appropriate,
            flags=moderation.flags,
            scores=ModerationScores(
                nudity_score=moderation.nudity_score,
                suggestive_score=moderation.suggestive_score,
                violence_score=moderation.violence_score,
                skin_exposure=moderation.detailed_scores.get("skin_exposure", 0.0)
            ),
            should_reject=should_reject,
            rejection_reason=rejection_reason
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Moderation check failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Style Feedback Endpoint
# ============================================================================

@app.post("/api/v1/photo-analysis/style", response_model=StyleFeedbackResponse)
async def get_style_feedback(request: StyleFeedbackRequest, app_request: Request):
    """
    Get style and presentation feedback.

    Provides actionable feedback on photo style, composition, and appeal.
    """
    try:
        image_bytes = await get_image_bytes(
            app_request,
            photo_url=request.photo_url,
            photo_base64=request.photo_base64
        )

        analyzer: PhotoAnalyzer = app_request.app.state.analyzer
        image = analyzer._bytes_to_image(image_bytes)

        # Need face detection for style analysis
        faces = await analyzer.detect_faces(image)
        style = await analyzer.get_style_feedback(image, faces)

        # Generate primary recommendation
        primary_recommendation = None
        if style.style_score >= 80 and len(faces) == 1:
            primary_recommendation = "This would make an excellent primary photo!"
        elif style.style_score >= 60:
            primary_recommendation = "Good photo - consider for your profile"
        elif style.improvement_suggestions:
            primary_recommendation = style.improvement_suggestions[0]

        return StyleFeedbackResponse(
            photo_url=request.photo_url,
            style_score=style.style_score,
            style_info=StyleInfo(
                style_score=style.style_score,
                photo_type=style.photo_type,
                lighting_quality=style.lighting_quality,
                background_type=style.background_type,
                positive_aspects=style.positive_aspects,
                improvement_suggestions=style.improvement_suggestions
            ),
            feedback=style.feedback_items,
            primary_recommendation=primary_recommendation
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Style feedback failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Face Detection Endpoint
# ============================================================================

@app.post("/api/v1/photo-analysis/face-detect", response_model=FaceDetectResponse)
@app.post("/api/photo/face-detect", response_model=FaceDetectResponse)
async def detect_faces(request: FaceDetectRequest, app_request: Request):
    """
    Detect faces in photo.

    Returns number of faces, their positions, and basic attributes.
    """
    try:
        image_bytes = await get_image_bytes(
            app_request,
            photo_url=request.photo_url,
            photo_base64=request.photo_base64
        )

        analyzer: PhotoAnalyzer = app_request.app.state.analyzer
        image = analyzer._bytes_to_image(image_bytes)
        faces = await analyzer.detect_faces(image)

        # Determine primary face position
        face_position = analyzer._determine_face_position(faces, image.shape)

        return FaceDetectResponse(
            photo_url=request.photo_url,
            faces_detected=len(faces),
            faces=[
                FaceInfo(
                    bounding_box=f.get("bounding_box", {}),
                    confidence=f.get("confidence", 0.0),
                    landmarks=f.get("landmarks"),
                    attributes=f.get("attributes"),
                    estimated_age=f.get("attributes", {}).get("estimated_age"),
                    smile_score=f.get("attributes", {}).get("smile_score")
                ) for f in faces
            ],
            has_face=len(faces) > 0,
            primary_face_position=face_position.value
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Face detection failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Batch Analysis Endpoint
# ============================================================================

@app.post("/api/v1/photo-analysis/batch", response_model=BatchPhotoAnalyzeResponse)
async def batch_analyze(request: BatchPhotoAnalyzeRequest, app_request: Request):
    """
    Analyze multiple photos at once.

    Useful for analyzing all profile photos and determining the best one.
    """
    start_time = time.time()

    try:
        analyzer: PhotoAnalyzer = app_request.app.state.analyzer
        client: httpx.AsyncClient = app_request.app.state.http_client

        results = []
        approved_count = 0
        best_score = 0
        best_index = None

        for i, photo_url in enumerate(request.photo_urls):
            try:
                # Fetch image
                response = await client.get(photo_url)
                response.raise_for_status()
                image_bytes = response.content

                # Analyze
                result = await analyzer.analyze_profile_photo(image_bytes, is_primary=(i == 0))

                # Build response
                rejection_reasons = []
                if not result.is_appropriate:
                    rejection_reasons.append("content_guidelines_violation")
                if result.quality_score < 30:
                    rejection_reasons.append("poor_quality")

                approved = len(rejection_reasons) == 0
                if approved:
                    approved_count += 1

                # Track best photo
                combined_score = (result.quality_score + result.style_score) / 2
                if combined_score > best_score and approved:
                    best_score = combined_score
                    best_index = i

                results.append(PhotoAnalyzeResponse(
                    photo_url=photo_url,
                    quality_score=result.quality_score,
                    style_score=result.style_score,
                    face_detected=result.face_detected,
                    face_count=result.face_count,
                    face_position=result.face_position,
                    estimated_age=result.estimated_age,
                    is_appropriate=result.is_appropriate,
                    moderation_flags=result.moderation_flags,
                    filter_detected=result.filter_detected,
                    filter_type=result.filter_type,
                    style_feedback=result.style_feedback,
                    recommendations=result.recommendations,
                    approved=approved,
                    rejection_reasons=rejection_reasons,
                    analysis_version=SERVICE_VERSION
                ))

            except Exception as e:
                logger.warning(f"Failed to analyze photo {photo_url}: {e}")
                results.append(PhotoAnalyzeResponse(
                    photo_url=photo_url,
                    quality_score=0,
                    style_score=0,
                    face_detected=False,
                    face_count=0,
                    face_position=FacePositionEnum.NOT_DETECTED.value,
                    estimated_age=None,
                    is_appropriate=True,
                    moderation_flags=[],
                    filter_detected=False,
                    filter_type=None,
                    style_feedback=[],
                    recommendations=["Failed to analyze this photo"],
                    approved=False,
                    rejection_reasons=["analysis_failed"],
                    analysis_version=SERVICE_VERSION
                ))

        processing_time_ms = int((time.time() - start_time) * 1000)

        return BatchPhotoAnalyzeResponse(
            results=results,
            total_photos=len(request.photo_urls),
            approved_count=approved_count,
            rejected_count=len(request.photo_urls) - approved_count,
            best_photo_index=best_index,
            processing_time_ms=processing_time_ms
        )

    except Exception as e:
        logger.error(f"Batch analysis failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Photo Ranking Endpoint
# ============================================================================

@app.post("/api/v1/photo-analysis/rank", response_model=PhotoRankingResponse)
async def rank_photos(request: BatchPhotoAnalyzeRequest, app_request: Request):
    """
    Rank photos and recommend best primary photo.

    Analyzes all photos and provides optimization suggestions for the profile.
    """
    try:
        # First run batch analysis
        batch_result = await batch_analyze(request, app_request)

        # Sort by combined score
        ranked = []
        for i, result in enumerate(batch_result.results):
            if result.approved:
                combined_score = (result.quality_score + result.style_score) / 2
                ranked.append({
                    "index": i,
                    "url": result.photo_url,
                    "combined_score": combined_score,
                    "quality_score": result.quality_score,
                    "style_score": result.style_score,
                    "face_detected": result.face_detected,
                    "face_count": result.face_count
                })

        # Sort by combined score
        ranked.sort(key=lambda x: x["combined_score"], reverse=True)

        # Generate suggestions
        suggestions = []
        if not ranked:
            suggestions.append("Consider uploading higher quality photos")
        elif len(ranked) < 3:
            suggestions.append("Adding more photos increases your profile appeal")

        # Check for variety
        has_solo = any(r["face_count"] == 1 for r in ranked)
        has_group = any(r["face_count"] > 1 for r in ranked)

        if has_solo and not has_group and len(ranked) > 3:
            suggestions.append("A group photo can show your social side")
        if has_group and not has_solo:
            suggestions.append("Add a solo photo as your primary picture")

        # Profile score (average of approved photos)
        profile_score = sum(r["combined_score"] for r in ranked) / len(ranked) if ranked else 0

        return PhotoRankingResponse(
            ranked_photos=ranked,
            recommended_primary=ranked[0]["url"] if ranked else None,
            profile_score=round(profile_score, 1),
            suggestions=suggestions
        )

    except Exception as e:
        logger.error(f"Photo ranking failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# File Upload Endpoint
# ============================================================================

@app.post("/api/v1/photo-analysis/upload", response_model=PhotoAnalyzeResponse)
async def analyze_uploaded_photo(
    app_request: Request,
    file: UploadFile = File(...),
    is_primary: bool = False
):
    """
    Analyze an uploaded photo file.

    Accepts direct file upload instead of URL/base64.
    """
    start_time = time.time()

    try:
        # Validate file type
        if not file.content_type or not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="File must be an image")

        # Read file contents
        image_bytes = await file.read()

        # Run analysis
        analyzer: PhotoAnalyzer = app_request.app.state.analyzer
        result = await analyzer.analyze_profile_photo(image_bytes, is_primary=is_primary)

        processing_time_ms = int((time.time() - start_time) * 1000)

        # Determine approval
        rejection_reasons = []
        if not result.is_appropriate:
            rejection_reasons.append("content_guidelines_violation")
        if not result.face_detected and is_primary:
            rejection_reasons.append("no_face_detected_primary")
        if result.quality_score < 30:
            rejection_reasons.append("poor_quality")

        approved = len(rejection_reasons) == 0

        return PhotoAnalyzeResponse(
            photo_url=None,
            quality_score=result.quality_score,
            style_score=result.style_score,
            face_detected=result.face_detected,
            face_count=result.face_count,
            face_position=result.face_position,
            estimated_age=result.estimated_age,
            is_appropriate=result.is_appropriate,
            moderation_flags=result.moderation_flags,
            filter_detected=result.filter_detected,
            filter_type=result.filter_type,
            style_feedback=result.style_feedback,
            recommendations=result.recommendations,
            approved=approved,
            rejection_reasons=rejection_reasons,
            analysis_version=SERVICE_VERSION,
            processing_time_ms=processing_time_ms
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload analysis failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Legacy Endpoints (for backward compatibility)
# ============================================================================

@app.post("/api/photo/analyze", response_model=PhotoAnalyzeResponse)
async def legacy_analyze(request: PhotoAnalyzeRequest, app_request: Request):
    """Legacy endpoint - redirects to new API."""
    return await analyze_photo(request, app_request)


@app.post("/api/photo/quality", response_model=PhotoQualityResponse)
async def legacy_quality(request: PhotoQualityRequest, app_request: Request):
    """Legacy endpoint - redirects to new API."""
    return await check_quality(request, app_request)


@app.post("/api/photo/nsfw", response_model=NSFWResponse)
async def legacy_nsfw(request: NSFWRequest, app_request: Request):
    """Legacy NSFW detection endpoint."""
    try:
        image_bytes = await get_image_bytes(app_request, photo_url=request.photo_url)

        analyzer: PhotoAnalyzer = app_request.app.state.analyzer
        image = analyzer._bytes_to_image(image_bytes)
        moderation = await analyzer.check_appropriateness(image)

        return NSFWResponse(
            photo_url=request.photo_url,
            is_nsfw=not moderation.is_appropriate,
            nsfw_score=max(moderation.nudity_score, moderation.suggestive_score),
            categories={
                "nudity": moderation.nudity_score,
                "suggestive": moderation.suggestive_score,
                "violence": moderation.violence_score
            },
            flagged_regions=[]
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"NSFW detection failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/photo/deepfake", response_model=DeepfakeResponse)
async def legacy_deepfake(request: DeepfakeRequest, app_request: Request):
    """Legacy deepfake detection endpoint."""
    try:
        image_bytes = await get_image_bytes(app_request, photo_url=request.photo_url)

        analyzer: PhotoAnalyzer = app_request.app.state.analyzer
        image = analyzer._bytes_to_image(image_bytes)
        filter_result = await analyzer.detect_filters(image)

        # Map filter detection to deepfake detection
        is_deepfake = filter_result.filter_detected and "excessive_smoothing" in filter_result.editing_indicators
        deepfake_score = filter_result.filter_confidence if is_deepfake else 0.0

        return DeepfakeResponse(
            photo_url=request.photo_url,
            is_deepfake=is_deepfake,
            deepfake_score=deepfake_score,
            indicators=filter_result.editing_indicators,
            confidence=filter_result.filter_confidence
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Deepfake detection failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8003,
        reload=True,
        log_level="info"
    )
