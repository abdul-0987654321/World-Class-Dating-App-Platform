"""Main entry point for the Fraud Detection Service."""

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

from models import (
    FraudCheckRequest, FraudCheckResponse,
    LocationAnomalyRequest, LocationAnomalyResponse,
    DeviceCheckRequest, DeviceCheckResponse,
    ProfileAnalysisRequest, ProfileAnalysisResponse,
    RiskScore, RiskLevel
)
from services.fraud_detector import FraudDetectorService
from services.location_analyzer import LocationAnalyzerService
from services.device_analyzer import DeviceAnalyzerService
from services.profile_analyzer import ProfileAnalyzerService

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator:
    """Application lifespan handler."""
    logger.info("Starting Fraud Detection Service")

    # Initialize services
    app.state.fraud_detector = FraudDetectorService()
    app.state.location_analyzer = LocationAnalyzerService()
    app.state.device_analyzer = DeviceAnalyzerService()
    app.state.profile_analyzer = ProfileAnalyzerService()

    await app.state.fraud_detector.initialize()
    await app.state.location_analyzer.initialize()
    await app.state.device_analyzer.initialize()
    await app.state.profile_analyzer.initialize()

    logger.info("All services initialized successfully")

    yield

    # Cleanup
    logger.info("Shutting down Fraud Detection Service")
    await app.state.fraud_detector.close()
    await app.state.location_analyzer.close()
    await app.state.device_analyzer.close()
    await app.state.profile_analyzer.close()


# Create FastAPI app
app = FastAPI(
    title="Fraud Detection Service",
    description="AI-powered fraud detection for dating platform",
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
        "service": "fraud-detection",
        "timestamp": datetime.utcnow().isoformat(),
        "dependencies": dependencies,
        "version": "1.0.0"
    }


@app.post("/api/fraud/check", response_model=FraudCheckResponse)
async def check_fraud(request: FraudCheckRequest, app_request: Request):
    """
    Check user for fraud risk.

    Performs comprehensive fraud analysis including:
    - IP reputation checking
    - Velocity checks
    - Behavioral analysis
    - Risk score calculation
    """
    try:
        detector: FraudDetectorService = app_request.app.state.fraud_detector
        result = await detector.check_fraud(request)
        return result
    except Exception as e:
        logger.error(f"Fraud check failed: {e}", exc_info=True)
        raise


@app.post("/api/fraud/location-anomaly", response_model=LocationAnomalyResponse)
async def detect_location_anomaly(request: LocationAnomalyRequest, app_request: Request):
    """
    Detect impossible travel and location anomalies.

    Checks for:
    - Impossible travel (distance vs time)
    - VPN/proxy usage
    - Geographic inconsistencies
    """
    try:
        analyzer: LocationAnalyzerService = app_request.app.state.location_analyzer
        result = await analyzer.detect_anomaly(request)
        return result
    except Exception as e:
        logger.error(f"Location anomaly detection failed: {e}", exc_info=True)
        raise


@app.post("/api/fraud/device-check", response_model=DeviceCheckResponse)
async def check_device(request: DeviceCheckRequest, app_request: Request):
    """
    Device fingerprint analysis.

    Analyzes:
    - Device fingerprint comparison
    - New device detection
    - Suspicious device patterns
    """
    try:
        analyzer: DeviceAnalyzerService = app_request.app.state.device_analyzer
        result = await analyzer.check_device(request)
        return result
    except Exception as e:
        logger.error(f"Device check failed: {e}", exc_info=True)
        raise


@app.post("/api/fraud/profile-analysis", response_model=ProfileAnalysisResponse)
async def analyze_profile(request: ProfileAnalysisRequest, app_request: Request):
    """
    Profile authenticity scoring.

    Detects:
    - Fake profiles
    - Stock photos
    - Scam patterns
    - Bot accounts
    """
    try:
        analyzer: ProfileAnalyzerService = app_request.app.state.profile_analyzer
        result = await analyzer.analyze_profile(request)
        return result
    except Exception as e:
        logger.error(f"Profile analysis failed: {e}", exc_info=True)
        raise


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info"
    )
