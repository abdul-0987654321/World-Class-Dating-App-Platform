"""Main entry point for the NLP Service."""

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

from models import (
    SentimentRequest, SentimentResponse,
    ToxicityRequest, ToxicityResponse,
    ScamDetectionRequest, ScamDetectionResponse,
    LanguageDetectRequest, LanguageDetectResponse,
    SmartRepliesRequest, SmartRepliesResponse
)
from services.sentiment_analyzer import SentimentAnalyzerService
from services.toxicity_detector import ToxicityDetectorService
from services.scam_detector import ScamDetectorService
from services.language_detector import LanguageDetectorService
from services.smart_reply_generator import SmartReplyGeneratorService

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator:
    """Application lifespan handler."""
    logger.info("Starting NLP Service")

    # Initialize services
    app.state.sentiment_analyzer = SentimentAnalyzerService()
    app.state.toxicity_detector = ToxicityDetectorService()
    app.state.scam_detector = ScamDetectorService()
    app.state.language_detector = LanguageDetectorService()
    app.state.smart_reply_generator = SmartReplyGeneratorService()

    await app.state.sentiment_analyzer.initialize()
    await app.state.toxicity_detector.initialize()
    await app.state.scam_detector.initialize()
    await app.state.language_detector.initialize()
    await app.state.smart_reply_generator.initialize()

    logger.info("All services initialized successfully")

    yield

    # Cleanup
    logger.info("Shutting down NLP Service")
    await app.state.sentiment_analyzer.close()
    await app.state.toxicity_detector.close()
    await app.state.scam_detector.close()
    await app.state.language_detector.close()
    await app.state.smart_reply_generator.close()


# Create FastAPI app
app = FastAPI(
    title="NLP Service",
    description="Natural Language Processing service for dating platform",
    version="1.0.0",
    lifespan=lifespan
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
    # For ML services, we primarily check if models are loaded
    status = "ok"

    return {
        "status": status,
        "service": "nlp-service",
        "timestamp": datetime.utcnow().isoformat(),
        "dependencies": dependencies,
        "version": "1.0.0"
    }


@app.post("/api/nlp/sentiment", response_model=SentimentResponse)
async def analyze_sentiment(request: SentimentRequest, app_request: Request):
    """
    Analyze text sentiment.

    Returns sentiment label (positive/negative/neutral) and score (-1 to 1).
    """
    try:
        analyzer: SentimentAnalyzerService = app_request.app.state.sentiment_analyzer
        result = await analyzer.analyze(request.text)
        return result
    except Exception as e:
        logger.error(f"Sentiment analysis failed: {e}", exc_info=True)
        raise


@app.post("/api/nlp/toxicity", response_model=ToxicityResponse)
async def detect_toxicity(request: ToxicityRequest, app_request: Request):
    """
    Detect toxic content in text.

    Identifies various types of toxicity including insults, threats, harassment, etc.
    """
    try:
        detector: ToxicityDetectorService = app_request.app.state.toxicity_detector
        result = await detector.detect(request.text)
        return result
    except Exception as e:
        logger.error(f"Toxicity detection failed: {e}", exc_info=True)
        raise


@app.post("/api/nlp/scam-detection", response_model=ScamDetectionResponse)
async def detect_scam(request: ScamDetectionRequest, app_request: Request):
    """
    Detect scam messages.

    Identifies romance scams, financial scams, and other fraudulent content.
    """
    try:
        detector: ScamDetectorService = app_request.app.state.scam_detector
        result = await detector.detect(request.text)
        return result
    except Exception as e:
        logger.error(f"Scam detection failed: {e}", exc_info=True)
        raise


@app.post("/api/nlp/language-detect", response_model=LanguageDetectResponse)
async def detect_language(request: LanguageDetectRequest, app_request: Request):
    """
    Detect the language of text.

    Returns language code and confidence score.
    """
    try:
        detector: LanguageDetectorService = app_request.app.state.language_detector
        result = await detector.detect(request.text)
        return result
    except Exception as e:
        logger.error(f"Language detection failed: {e}", exc_info=True)
        raise


@app.post("/api/nlp/smart-replies", response_model=SmartRepliesResponse)
async def generate_smart_replies(request: SmartRepliesRequest, app_request: Request):
    """
    Generate smart reply suggestions.

    Based on conversation context, generates appropriate response suggestions.
    """
    try:
        generator: SmartReplyGeneratorService = app_request.app.state.smart_reply_generator
        result = await generator.generate(
            request.conversation_history,
            request.max_suggestions
        )
        return result
    except Exception as e:
        logger.error(f"Smart reply generation failed: {e}", exc_info=True)
        raise


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8002,
        reload=True,
        log_level="info"
    )
