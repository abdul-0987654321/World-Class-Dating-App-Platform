"""
Request tracking middleware for Dating Coach Service.

This middleware provides:
- Automatic request ID generation and propagation
- Request/response timing
- Structured logging for all requests
- Error tracking and categorization
- User context extraction (privacy-safe)
"""

import time
import uuid
import logging
import traceback
from typing import Callable, Optional
from contextvars import ContextVar
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, JSONResponse
from fastapi import HTTPException

from app.monitoring import (
    metrics,
    metrics_collector,
    hash_user_id,
    ErrorType,
    _categorize_error,
)

logger = logging.getLogger(__name__)

# Context variables for request tracking
request_id_var: ContextVar[str] = ContextVar("request_id", default="")
user_id_var: ContextVar[str] = ContextVar("user_id", default="")
start_time_var: ContextVar[float] = ContextVar("start_time", default=0.0)


def get_request_id() -> str:
    """Get current request ID from context."""
    return request_id_var.get()


def get_user_id_hash() -> str:
    """Get hashed user ID from context."""
    return user_id_var.get()


class RequestTrackingMiddleware(BaseHTTPMiddleware):
    """
    Middleware for tracking all HTTP requests.

    Features:
    - Generates unique request IDs
    - Records timing metrics
    - Logs request/response details
    - Tracks errors
    - Propagates context for downstream logging
    """

    # Paths to exclude from detailed logging (health checks, metrics)
    EXCLUDED_PATHS = {"/health", "/healthz", "/ready", "/live", "/metrics", "/"}

    def __init__(self, app, exclude_paths: Optional[set] = None):
        """
        Initialize the middleware.

        Args:
            app: FastAPI application
            exclude_paths: Optional set of paths to exclude from logging
        """
        super().__init__(app)
        self.exclude_paths = exclude_paths or self.EXCLUDED_PATHS

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Process the request through the middleware.

        Args:
            request: Incoming HTTP request
            call_next: Next handler in the chain

        Returns:
            HTTP response
        """
        # Generate request ID
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        request_id_var.set(request_id)

        # Record start time
        start_time = time.perf_counter()
        start_time_var.set(start_time)

        # Extract path for metrics
        path = request.url.path
        method = request.method

        # Check if this is an excluded path
        is_excluded = path in self.exclude_paths

        # Try to extract user ID from authorization header (will be hashed)
        user_id_hash = await self._extract_user_hash(request)
        user_id_var.set(user_id_hash)

        # Track active request
        if not is_excluded:
            metrics.gauge_inc("active_requests", {"path": path})
            metrics_collector.record_event("total_requests")

        # Log request start
        if not is_excluded:
            logger.info(
                "Request started",
                extra={
                    "request_id": request_id,
                    "method": method,
                    "path": path,
                    "user_hash": user_id_hash,
                    "client_ip": self._get_client_ip(request),
                    "user_agent": request.headers.get("User-Agent", "")[:100],
                }
            )

        # Process request
        response = None
        error_occurred = False
        error_type = None
        status_code = 500

        try:
            response = await call_next(request)
            status_code = response.status_code
            return response

        except HTTPException as e:
            error_occurred = True
            error_type = self._http_exception_to_error_type(e.status_code)
            status_code = e.status_code

            # Re-raise to let FastAPI handle it
            raise

        except Exception as e:
            error_occurred = True
            error_type = _categorize_error(e)
            status_code = 500

            # Log the error
            logger.error(
                "Unhandled exception in request",
                extra={
                    "request_id": request_id,
                    "error_type": error_type.value,
                    "error_message": str(e),
                    "traceback": traceback.format_exc(),
                },
                exc_info=True
            )

            # Re-raise to let the exception handler deal with it
            raise

        finally:
            # Calculate duration
            duration = time.perf_counter() - start_time

            # Record metrics
            if not is_excluded:
                labels = {
                    "method": method,
                    "path": self._normalize_path(path),
                    "status": str(status_code)
                }

                metrics.histogram_observe("coaching_request_duration_seconds", duration, labels)
                metrics.gauge_dec("active_requests", {"path": path})

                if error_occurred and error_type:
                    metrics.counter_inc(
                        "coaching_errors_total",
                        {"error_type": error_type.value, "path": self._normalize_path(path)}
                    )
                    metrics_collector.record_event("errors")

            # Log request completion
            if not is_excluded:
                log_extra = {
                    "request_id": request_id,
                    "method": method,
                    "path": path,
                    "status_code": status_code,
                    "duration_ms": round(duration * 1000, 2),
                    "user_hash": user_id_hash,
                }

                if error_occurred:
                    log_extra["error_type"] = error_type.value if error_type else "unknown"
                    logger.warning("Request completed with error", extra=log_extra)
                else:
                    logger.info("Request completed", extra=log_extra)

    async def _extract_user_hash(self, request: Request) -> str:
        """
        Extract and hash user ID from the request.

        Args:
            request: HTTP request

        Returns:
            Hashed user ID or empty string
        """
        auth_header = request.headers.get("Authorization", "")

        if not auth_header.startswith("Bearer "):
            return ""

        # We can't decode the JWT here without the secret,
        # but we can hash the token itself as a stable identifier
        token = auth_header[7:]
        if token:
            return hash_user_id(token[:32])  # Use first 32 chars for hashing

        return ""

    def _get_client_ip(self, request: Request) -> str:
        """
        Get client IP address, considering proxies.

        Args:
            request: HTTP request

        Returns:
            Client IP address
        """
        # Check forwarded headers
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()

        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip

        # Fall back to direct client
        if request.client:
            return request.client.host

        return "unknown"

    def _normalize_path(self, path: str) -> str:
        """
        Normalize path for metrics (remove UUIDs and IDs).

        Args:
            path: Original path

        Returns:
            Normalized path suitable for metrics labels
        """
        # Replace UUIDs with placeholder
        import re
        uuid_pattern = r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"
        path = re.sub(uuid_pattern, "{id}", path, flags=re.IGNORECASE)

        # Replace numeric IDs with placeholder
        path = re.sub(r"/\d+(/|$)", "/{id}\\1", path)

        return path

    def _http_exception_to_error_type(self, status_code: int) -> ErrorType:
        """
        Convert HTTP status code to error type.

        Args:
            status_code: HTTP status code

        Returns:
            Corresponding ErrorType
        """
        if status_code == 401 or status_code == 403:
            return ErrorType.AUTHENTICATION_ERROR
        elif status_code == 429:
            return ErrorType.RATE_LIMIT_ERROR
        elif status_code == 400 or status_code == 422:
            return ErrorType.VALIDATION_ERROR
        elif status_code == 504 or status_code == 408:
            return ErrorType.TIMEOUT_ERROR
        elif status_code >= 500:
            return ErrorType.INTERNAL_ERROR
        else:
            return ErrorType.INTERNAL_ERROR


class ResponseHeaderMiddleware(BaseHTTPMiddleware):
    """
    Middleware to add standard response headers.

    Adds:
    - X-Request-ID for request tracing
    - X-Response-Time for timing information
    - Standard security headers
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Add headers to the response.

        Args:
            request: HTTP request
            call_next: Next handler

        Returns:
            Response with added headers
        """
        start_time = time.perf_counter()

        response = await call_next(request)

        # Calculate duration
        duration_ms = (time.perf_counter() - start_time) * 1000

        # Add headers
        request_id = get_request_id() or str(uuid.uuid4())
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Response-Time"] = f"{duration_ms:.2f}ms"

        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"

        return response


class TimingBreakdown:
    """
    Utility class for tracking timing breakdowns within a request.

    Usage:
        timing = TimingBreakdown()
        with timing.track("ai_call"):
            await ai_provider.generate(...)
        with timing.track("redis_lookup"):
            await redis.get(...)
        breakdown = timing.get_breakdown()
    """

    def __init__(self):
        """Initialize timing breakdown tracker."""
        self._timings: dict = {}
        self._current_start: float = 0.0
        self._current_name: str = ""

    class _TimingContext:
        """Context manager for timing a section."""

        def __init__(self, breakdown: "TimingBreakdown", name: str):
            self.breakdown = breakdown
            self.name = name
            self.start_time = 0.0

        def __enter__(self):
            self.start_time = time.perf_counter()
            return self

        def __exit__(self, exc_type, exc_val, exc_tb):
            duration = time.perf_counter() - self.start_time
            self.breakdown._timings[self.name] = duration
            return False

    def track(self, name: str) -> "_TimingContext":
        """
        Create a context manager for tracking a named section.

        Args:
            name: Name of the section being timed

        Returns:
            Context manager for timing
        """
        return self._TimingContext(self, name)

    def get_breakdown(self) -> dict:
        """
        Get the timing breakdown.

        Returns:
            Dictionary of section names to durations in milliseconds
        """
        return {
            name: round(duration * 1000, 2)
            for name, duration in self._timings.items()
        }

    def get_total(self) -> float:
        """
        Get total tracked time in milliseconds.

        Returns:
            Total duration in milliseconds
        """
        return round(sum(self._timings.values()) * 1000, 2)


def create_request_context(request_id: str, user_id: Optional[str] = None) -> dict:
    """
    Create a standardized request context for logging.

    Args:
        request_id: Unique request identifier
        user_id: Optional user ID (will be hashed)

    Returns:
        Dictionary with context fields
    """
    context = {
        "request_id": request_id,
        "timestamp": time.time(),
    }

    if user_id:
        context["user_hash"] = hash_user_id(user_id)

    return context
