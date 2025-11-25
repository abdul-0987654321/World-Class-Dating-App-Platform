"""API routes for the photo analysis service."""

from typing import List, Optional
from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from pydantic import BaseModel, Field
import structlog

logger = structlog.get_logger()
router = APIRouter()


# Response Models

class FaceDetectionResult(BaseModel):
    """Face detection result."""
    faces_detected: int
    face_locations: List[dict]
    primary_face: Optional[dict]
    face_quality_scores: List[float]


class NSFWResult(BaseModel):
    """NSFW detection result."""
    is_nsfw: bool
    nsfw_score: float
    categories: dict


class PhotoQualityResult(BaseModel):
    """Photo quality assessment result."""
    quality_score: float
    issues: List[str]
    resolution: dict
    brightness: float
    blur_score: float
    is_acceptable: bool


class DeepfakeResult(BaseModel):
    """Deepfake detection result."""
    is_deepfake: bool
    confidence: float
    analysis_details: dict


class PhotoAnalysisResult(BaseModel):
    """Complete photo analysis result."""
    success: bool
    faces: FaceDetectionResult
    nsfw: NSFWResult
    quality: PhotoQualityResult
    deepfake: DeepfakeResult
    is_approved: bool
    rejection_reasons: List[str]


class PhotoRankingResult(BaseModel):
    """Photo ranking result."""
    index: int
    engagement_score: float
    recommendation: str
    quality_score: float


class VerificationResult(BaseModel):
    """Face verification result."""
    is_match: bool
    confidence: float
    face_distance: float


# Routes

@router.post("/analyze", response_model=PhotoAnalysisResult)
async def analyze_photo(
    request: Request,
    file: UploadFile = File(...)
):
    """
    Comprehensive photo analysis.

    Analyzes a photo for:
    - Face detection and quality
    - NSFW content
    - Photo quality metrics
    - Deepfake detection

    Returns approval status and any rejection reasons.
    """
    try:
        # Read image data
        image_data = await file.read()

        # Run all analyses
        face_result = await request.app.state.face_detection.detect(image_data)
        nsfw_result = await request.app.state.nsfw_detection.detect(image_data)
        quality_result = await request.app.state.photo_quality.analyze(image_data)
        deepfake_result = await request.app.state.deepfake_detection.detect(image_data)

        # Determine approval
        is_approved, rejection_reasons = _determine_approval(
            face_result, nsfw_result, quality_result, deepfake_result
        )

        return PhotoAnalysisResult(
            success=True,
            faces=FaceDetectionResult(**face_result),
            nsfw=NSFWResult(**nsfw_result),
            quality=PhotoQualityResult(**quality_result),
            deepfake=DeepfakeResult(**deepfake_result),
            is_approved=is_approved,
            rejection_reasons=rejection_reasons
        )

    except Exception as e:
        logger.error("Photo analysis failed", error=str(e))
        raise HTTPException(status_code=500, detail="Photo analysis failed")


@router.post("/faces/detect", response_model=FaceDetectionResult)
async def detect_faces(
    request: Request,
    file: UploadFile = File(...)
):
    """Detect faces in an image."""
    try:
        image_data = await file.read()
        result = await request.app.state.face_detection.detect(image_data)
        return FaceDetectionResult(**result)
    except Exception as e:
        logger.error("Face detection failed", error=str(e))
        raise HTTPException(status_code=500, detail="Face detection failed")


@router.post("/faces/verify", response_model=VerificationResult)
async def verify_faces(
    request: Request,
    reference: UploadFile = File(...),
    comparison: UploadFile = File(...)
):
    """
    Verify if two photos contain the same person.

    Used for photo verification during onboarding.
    """
    try:
        reference_data = await reference.read()
        comparison_data = await comparison.read()

        result = await request.app.state.face_detection.verify(
            reference_data, comparison_data
        )

        return VerificationResult(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Face verification failed", error=str(e))
        raise HTTPException(status_code=500, detail="Face verification failed")


@router.post("/nsfw/detect", response_model=NSFWResult)
async def detect_nsfw(
    request: Request,
    file: UploadFile = File(...)
):
    """Detect NSFW content in an image."""
    try:
        image_data = await file.read()
        result = await request.app.state.nsfw_detection.detect(image_data)
        return NSFWResult(**result)
    except Exception as e:
        logger.error("NSFW detection failed", error=str(e))
        raise HTTPException(status_code=500, detail="NSFW detection failed")


@router.post("/quality/analyze", response_model=PhotoQualityResult)
async def analyze_quality(
    request: Request,
    file: UploadFile = File(...)
):
    """Analyze photo quality."""
    try:
        image_data = await file.read()
        result = await request.app.state.photo_quality.analyze(image_data)
        return PhotoQualityResult(**result)
    except Exception as e:
        logger.error("Quality analysis failed", error=str(e))
        raise HTTPException(status_code=500, detail="Quality analysis failed")


@router.post("/deepfake/detect", response_model=DeepfakeResult)
async def detect_deepfake(
    request: Request,
    file: UploadFile = File(...)
):
    """Detect if an image is a deepfake."""
    try:
        image_data = await file.read()
        result = await request.app.state.deepfake_detection.detect(image_data)
        return DeepfakeResult(**result)
    except Exception as e:
        logger.error("Deepfake detection failed", error=str(e))
        raise HTTPException(status_code=500, detail="Deepfake detection failed")


@router.post("/rank", response_model=List[PhotoRankingResult])
async def rank_photos(
    request: Request,
    files: List[UploadFile] = File(...)
):
    """
    Rank multiple photos by predicted engagement.

    Returns photos ordered from best to worst with recommendations.
    """
    if len(files) > 9:
        raise HTTPException(status_code=400, detail="Maximum 9 photos allowed")

    try:
        rankings = []

        for i, file in enumerate(files):
            image_data = await file.read()

            # Analyze quality
            quality = await request.app.state.photo_quality.analyze(image_data)

            # Analyze face
            faces = await request.app.state.face_detection.detect(image_data)

            # Calculate engagement score
            engagement_score = _calculate_engagement_score(quality, faces)

            # Generate recommendation
            recommendation = _generate_recommendation(quality, faces)

            rankings.append(PhotoRankingResult(
                index=i,
                engagement_score=round(engagement_score, 2),
                recommendation=recommendation,
                quality_score=quality["quality_score"]
            ))

        # Sort by engagement score
        rankings.sort(key=lambda x: x.engagement_score, reverse=True)

        return rankings

    except Exception as e:
        logger.error("Photo ranking failed", error=str(e))
        raise HTTPException(status_code=500, detail="Photo ranking failed")


# Helper functions

def _determine_approval(
    faces: dict,
    nsfw: dict,
    quality: dict,
    deepfake: dict
) -> tuple[bool, List[str]]:
    """Determine if photo should be approved."""
    reasons = []

    # Check for faces
    if faces["faces_detected"] == 0:
        reasons.append("No face detected in photo")

    # Check NSFW
    if nsfw["is_nsfw"]:
        reasons.append("Photo contains inappropriate content")

    # Check quality
    if not quality["is_acceptable"]:
        reasons.extend(quality["issues"])

    # Check deepfake
    if deepfake["is_deepfake"]:
        reasons.append("Photo appears to be artificially generated")

    is_approved = len(reasons) == 0
    return is_approved, reasons


def _calculate_engagement_score(quality: dict, faces: dict) -> float:
    """Calculate predicted engagement score (0-100)."""
    score = 0

    # Quality contributes 40%
    score += quality["quality_score"] * 0.4

    # Face presence and quality contributes 30%
    if faces["faces_detected"] > 0:
        score += 30
        if faces.get("face_quality_scores"):
            avg_face_quality = sum(faces["face_quality_scores"]) / len(faces["face_quality_scores"])
            score += avg_face_quality * 0.3

    # Brightness (well-lit photos do better)
    brightness = quality.get("brightness", 0.5)
    if 0.4 <= brightness <= 0.7:
        score += 15
    elif 0.3 <= brightness <= 0.8:
        score += 10

    # Sharpness
    blur_score = quality.get("blur_score", 0)
    if blur_score > 100:
        score += 15

    return min(100, score)


def _generate_recommendation(quality: dict, faces: dict) -> str:
    """Generate recommendation for improving the photo."""
    issues = quality.get("issues", [])

    if "No face detected" in str(issues) or faces["faces_detected"] == 0:
        return "Add a clear photo of your face"

    if "Too dark" in str(issues):
        return "Use better lighting"

    if "Too blurry" in str(issues):
        return "Use a sharper, clearer photo"

    if quality["quality_score"] < 50:
        return "Consider using a higher quality photo"

    if faces["faces_detected"] > 1:
        return "Great group photo! Consider adding solo photos too"

    return "Great photo!"
