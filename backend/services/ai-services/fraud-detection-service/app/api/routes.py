"""API routes for the fraud detection service."""

from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
import structlog

from app.services.fraud_detector import FraudDetectorService
from app.services.behavior_analyzer import BehaviorAnalyzerService
from app.services.profile_analyzer import ProfileAnalyzerService

logger = structlog.get_logger()
router = APIRouter()


# Request/Response Models

class LocationData(BaseModel):
    """Location information."""
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    ip_address: Optional[str] = None
    country_code: Optional[str] = None
    city: Optional[str] = None


class DeviceInfo(BaseModel):
    """Device information."""
    device_id: str
    device_type: str  # ios, android, web
    os_version: Optional[str] = None
    app_version: Optional[str] = None
    user_agent: Optional[str] = None
    fingerprint: Optional[str] = None


class UserActivity(BaseModel):
    """User activity for analysis."""
    activity_type: str  # message_sent, swipe, profile_view, login, photo_upload
    timestamp: datetime
    target_user_id: Optional[str] = None
    metadata: Optional[dict] = None


class FraudCheckRequest(BaseModel):
    """Request for comprehensive fraud check."""
    user_id: str
    location: Optional[LocationData] = None
    device: Optional[DeviceInfo] = None
    activity: Optional[UserActivity] = None


class FraudCheckResponse(BaseModel):
    """Response from fraud check."""
    success: bool
    data: dict


class ProfileFraudRequest(BaseModel):
    """Request for profile fraud analysis."""
    user_id: str
    profile_data: dict
    photos: Optional[List[str]] = None  # Photo URLs
    bio: Optional[str] = None


class BehaviorAnalysisRequest(BaseModel):
    """Request for behavior analysis."""
    user_id: str
    activities: List[UserActivity]
    time_range_hours: int = Field(24, ge=1, le=720)


class VelocityCheckRequest(BaseModel):
    """Request for velocity check."""
    user_id: str
    action_type: str
    window_minutes: int = Field(60, ge=1, le=1440)


class RiskScoreRequest(BaseModel):
    """Request for user risk score."""
    user_id: str
    include_history: bool = False


class ReportFraudRequest(BaseModel):
    """Request to report suspected fraud."""
    reporter_id: str
    reported_user_id: str
    reason: str
    evidence: Optional[dict] = None


class BulkCheckRequest(BaseModel):
    """Request for bulk fraud check."""
    user_ids: List[str]


# Helper to get services

def get_fraud_detector(request: Request) -> FraudDetectorService:
    """Get fraud detector service from app state."""
    return request.app.state.fraud_detector


def get_behavior_analyzer(request: Request) -> BehaviorAnalyzerService:
    """Get behavior analyzer service from app state."""
    return request.app.state.behavior_analyzer


def get_profile_analyzer(request: Request) -> ProfileAnalyzerService:
    """Get profile analyzer service from app state."""
    return request.app.state.profile_analyzer


# Routes

@router.post("/check", response_model=FraudCheckResponse)
async def check_fraud(
    request: FraudCheckRequest,
    fraud_detector: FraudDetectorService = Depends(get_fraud_detector)
):
    """
    Perform comprehensive fraud check for a user action.

    This endpoint analyzes:
    - Location anomalies (impossible travel)
    - Device fingerprinting
    - Activity patterns
    - Behavioral signals

    Returns a fraud risk score and recommended action.
    """
    try:
        result = await fraud_detector.check_fraud(
            user_id=request.user_id,
            location=request.location.model_dump() if request.location else None,
            device=request.device.model_dump() if request.device else None,
            activity=request.activity.model_dump() if request.activity else None
        )

        return FraudCheckResponse(success=True, data=result)

    except Exception as e:
        logger.error("Fraud check failed", error=str(e), user_id=request.user_id)
        raise HTTPException(status_code=500, detail="Fraud check failed")


@router.post("/profile/analyze", response_model=FraudCheckResponse)
async def analyze_profile(
    request: ProfileFraudRequest,
    profile_analyzer: ProfileAnalyzerService = Depends(get_profile_analyzer)
):
    """
    Analyze a user profile for fraud indicators.

    Checks for:
    - Fake profile patterns
    - Stock photo usage
    - Suspicious bio patterns
    - Romance scam indicators
    - Catfishing signals
    """
    try:
        result = await profile_analyzer.analyze_profile(
            user_id=request.user_id,
            profile_data=request.profile_data,
            photos=request.photos,
            bio=request.bio
        )

        return FraudCheckResponse(success=True, data=result)

    except Exception as e:
        logger.error("Profile analysis failed", error=str(e), user_id=request.user_id)
        raise HTTPException(status_code=500, detail="Profile analysis failed")


@router.post("/behavior/analyze", response_model=FraudCheckResponse)
async def analyze_behavior(
    request: BehaviorAnalysisRequest,
    behavior_analyzer: BehaviorAnalyzerService = Depends(get_behavior_analyzer)
):
    """
    Analyze user behavior patterns for fraud indicators.

    Detects:
    - Automated/bot behavior
    - Mass messaging patterns
    - Scam conversation patterns
    - Unusual activity spikes
    """
    try:
        activities = [a.model_dump() for a in request.activities]
        result = await behavior_analyzer.analyze_behavior(
            user_id=request.user_id,
            activities=activities,
            time_range_hours=request.time_range_hours
        )

        return FraudCheckResponse(success=True, data=result)

    except Exception as e:
        logger.error("Behavior analysis failed", error=str(e), user_id=request.user_id)
        raise HTTPException(status_code=500, detail="Behavior analysis failed")


@router.post("/velocity/check", response_model=FraudCheckResponse)
async def check_velocity(
    request: VelocityCheckRequest,
    fraud_detector: FraudDetectorService = Depends(get_fraud_detector)
):
    """
    Check if user is performing actions too quickly.

    Detects rate abuse for:
    - Messages sent
    - Swipes
    - Profile views
    - Login attempts
    """
    try:
        result = await fraud_detector.check_velocity(
            user_id=request.user_id,
            action_type=request.action_type,
            window_minutes=request.window_minutes
        )

        return FraudCheckResponse(success=True, data=result)

    except Exception as e:
        logger.error("Velocity check failed", error=str(e), user_id=request.user_id)
        raise HTTPException(status_code=500, detail="Velocity check failed")


@router.get("/risk-score/{user_id}")
async def get_risk_score(
    user_id: str,
    include_history: bool = False,
    fraud_detector: FraudDetectorService = Depends(get_fraud_detector)
):
    """
    Get the current fraud risk score for a user.

    Returns:
    - Overall risk score (0-1)
    - Risk factors breakdown
    - Recommended actions
    - Historical risk if requested
    """
    try:
        result = await fraud_detector.get_risk_score(
            user_id=user_id,
            include_history=include_history
        )

        return {"success": True, "data": result}

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error("Risk score retrieval failed", error=str(e), user_id=user_id)
        raise HTTPException(status_code=500, detail="Risk score retrieval failed")


@router.post("/report")
async def report_fraud(
    request: ReportFraudRequest,
    fraud_detector: FraudDetectorService = Depends(get_fraud_detector)
):
    """
    Submit a fraud report for a user.

    This updates the user's risk profile and may trigger
    immediate action if multiple reports are received.
    """
    try:
        result = await fraud_detector.report_fraud(
            reporter_id=request.reporter_id,
            reported_user_id=request.reported_user_id,
            reason=request.reason,
            evidence=request.evidence
        )

        return {"success": True, "data": result}

    except Exception as e:
        logger.error(
            "Fraud report submission failed",
            error=str(e),
            reporter_id=request.reporter_id,
            reported_user_id=request.reported_user_id
        )
        raise HTTPException(status_code=500, detail="Fraud report submission failed")


@router.post("/bulk/check")
async def bulk_check(
    request: BulkCheckRequest,
    fraud_detector: FraudDetectorService = Depends(get_fraud_detector)
):
    """
    Perform bulk fraud checks on multiple users.

    Useful for batch processing and scheduled scans.
    """
    try:
        results = await fraud_detector.bulk_check(request.user_ids)

        return {
            "success": True,
            "data": {
                "checked": len(results["checked"]),
                "flagged": len(results["flagged"]),
                "results": results["results"]
            }
        }

    except Exception as e:
        logger.error("Bulk check failed", error=str(e))
        raise HTTPException(status_code=500, detail="Bulk check failed")


@router.get("/patterns/known")
async def get_known_patterns(
    fraud_detector: FraudDetectorService = Depends(get_fraud_detector)
):
    """
    Get list of known fraud patterns.

    Used for admin dashboards and pattern management.
    """
    try:
        patterns = await fraud_detector.get_known_patterns()
        return {"success": True, "data": patterns}

    except Exception as e:
        logger.error("Failed to retrieve patterns", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve patterns")


@router.post("/location/verify")
async def verify_location(
    user_id: str,
    location: LocationData,
    fraud_detector: FraudDetectorService = Depends(get_fraud_detector)
):
    """
    Verify if a location change is legitimate.

    Checks for impossible travel and VPN usage.
    """
    try:
        result = await fraud_detector.verify_location(
            user_id=user_id,
            location=location.model_dump()
        )

        return {"success": True, "data": result}

    except Exception as e:
        logger.error("Location verification failed", error=str(e), user_id=user_id)
        raise HTTPException(status_code=500, detail="Location verification failed")


@router.post("/device/verify")
async def verify_device(
    user_id: str,
    device: DeviceInfo,
    fraud_detector: FraudDetectorService = Depends(get_fraud_detector)
):
    """
    Verify if a device is legitimate for the user.

    Checks device history and fingerprint.
    """
    try:
        result = await fraud_detector.verify_device(
            user_id=user_id,
            device=device.model_dump()
        )

        return {"success": True, "data": result}

    except Exception as e:
        logger.error("Device verification failed", error=str(e), user_id=user_id)
        raise HTTPException(status_code=500, detail="Device verification failed")
