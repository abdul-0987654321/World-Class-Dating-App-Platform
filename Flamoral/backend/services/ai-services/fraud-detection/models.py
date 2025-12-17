"""Pydantic models for Fraud Detection Service."""

from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field
from enum import Enum


class RiskLevel(str, Enum):
    """Risk level classification."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ActionType(str, Enum):
    """Types of user actions."""
    LOGIN = "login"
    MESSAGE_SENT = "message_sent"
    SWIPE = "swipe"
    PROFILE_VIEW = "profile_view"
    PHOTO_UPLOAD = "photo_upload"
    PROFILE_UPDATE = "profile_update"


class LocationData(BaseModel):
    """Location information."""
    latitude: float = Field(..., ge=-90, le=90, description="Latitude")
    longitude: float = Field(..., ge=-180, le=180, description="Longitude")
    ip_address: Optional[str] = Field(None, description="IP address")
    country_code: Optional[str] = Field(None, description="Country code")
    city: Optional[str] = Field(None, description="City name")
    timestamp: Optional[datetime] = Field(None, description="Timestamp of location")


class DeviceInfo(BaseModel):
    """Device information."""
    device_id: str = Field(..., description="Unique device identifier")
    device_type: str = Field(..., description="Device type: ios, android, web")
    os_version: Optional[str] = Field(None, description="Operating system version")
    app_version: Optional[str] = Field(None, description="Application version")
    user_agent: Optional[str] = Field(None, description="User agent string")
    fingerprint: Optional[str] = Field(None, description="Device fingerprint hash")
    screen_resolution: Optional[str] = Field(None, description="Screen resolution")
    timezone: Optional[str] = Field(None, description="Device timezone")


class FraudCheckRequest(BaseModel):
    """Request for fraud check."""
    user_id: str = Field(..., description="User ID to check")
    ip_address: str = Field(..., description="User's IP address")
    location: Optional[LocationData] = Field(None, description="Location data")
    device: Optional[DeviceInfo] = Field(None, description="Device information")
    action_type: Optional[str] = Field(None, description="Type of action being performed")


class LocationAnomalyRequest(BaseModel):
    """Request for location anomaly detection."""
    user_id: str = Field(..., description="User ID")
    current_location: LocationData = Field(..., description="Current location")
    previous_location: Optional[LocationData] = Field(None, description="Previous known location")


class DeviceCheckRequest(BaseModel):
    """Request for device fingerprint analysis."""
    user_id: str = Field(..., description="User ID")
    device: DeviceInfo = Field(..., description="Device information")


class ProfileAnalysisRequest(BaseModel):
    """Request for profile authenticity analysis."""
    user_id: str = Field(..., description="User ID")
    profile_data: Dict[str, Any] = Field(..., description="Profile data to analyze")
    photos: Optional[List[str]] = Field(None, description="Photo URLs")
    bio: Optional[str] = Field(None, description="User bio text")
    created_at: Optional[datetime] = Field(None, description="Account creation time")


class RiskScore(BaseModel):
    """Risk score details."""
    score: float = Field(..., ge=0, le=100, description="Risk score (0-100)")
    level: RiskLevel = Field(..., description="Risk level classification")
    factors: List[Dict[str, Any]] = Field(default_factory=list, description="Risk factors")
    recommended_action: str = Field(..., description="Recommended action")


class FraudCheckResponse(BaseModel):
    """Response from fraud check."""
    user_id: str = Field(..., description="User ID")
    risk_score: RiskScore = Field(..., description="Risk score details")
    is_fraud: bool = Field(..., description="Whether fraud is detected")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Check timestamp")
    details: Dict[str, Any] = Field(default_factory=dict, description="Additional details")


class LocationAnomalyResponse(BaseModel):
    """Response from location anomaly check."""
    user_id: str = Field(..., description="User ID")
    is_anomaly: bool = Field(..., description="Whether anomaly detected")
    impossible_travel: bool = Field(..., description="Whether travel is impossible")
    distance_km: Optional[float] = Field(None, description="Distance traveled in km")
    time_diff_hours: Optional[float] = Field(None, description="Time difference in hours")
    max_speed_kmh: Optional[float] = Field(None, description="Required speed in km/h")
    vpn_detected: bool = Field(default=False, description="Whether VPN is detected")
    details: Dict[str, Any] = Field(default_factory=dict, description="Additional details")


class DeviceCheckResponse(BaseModel):
    """Response from device check."""
    user_id: str = Field(..., description="User ID")
    device_id: str = Field(..., description="Device ID")
    is_trusted: bool = Field(..., description="Whether device is trusted")
    is_new: bool = Field(..., description="Whether device is new")
    fingerprint_match: bool = Field(..., description="Whether fingerprint matches")
    risk_indicators: List[str] = Field(default_factory=list, description="Risk indicators")
    details: Dict[str, Any] = Field(default_factory=dict, description="Additional details")


class ProfileAnalysisResponse(BaseModel):
    """Response from profile analysis."""
    user_id: str = Field(..., description="User ID")
    authenticity_score: float = Field(..., ge=0, le=100, description="Authenticity score (0-100)")
    is_suspicious: bool = Field(..., description="Whether profile is suspicious")
    fake_indicators: List[str] = Field(default_factory=list, description="Indicators of fake profile")
    scam_indicators: List[str] = Field(default_factory=list, description="Indicators of scam")
    stock_photos_detected: bool = Field(default=False, description="Whether stock photos detected")
    details: Dict[str, Any] = Field(default_factory=dict, description="Additional details")
