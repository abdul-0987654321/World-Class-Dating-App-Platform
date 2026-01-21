"""
Structured logging module for Dating Coach Service.

Provides:
- JSON-formatted log output for production
- Request ID tracking
- User ID hashing for privacy
- Timing breakdowns
- Error context enrichment
- Log level management
"""

import json
import logging
import sys
import traceback
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Union
from logging.handlers import RotatingFileHandler
import hashlib

from app.middleware import get_request_id, get_user_id_hash


class StructuredLogFormatter(logging.Formatter):
    """
    Formatter that outputs logs as JSON for structured logging.

    Includes:
    - Timestamp in ISO format
    - Log level
    - Logger name
    - Message
    - Request ID (from context)
    - User hash (from context)
    - Exception info if present
    - Extra fields passed via the extra parameter
    """

    # Fields to exclude from the extra data
    RESERVED_ATTRS = {
        "args", "asctime", "created", "exc_info", "exc_text", "filename",
        "funcName", "levelname", "levelno", "lineno", "module", "msecs",
        "message", "msg", "name", "pathname", "process", "processName",
        "relativeCreated", "stack_info", "thread", "threadName",
        "taskName", "color_message"
    }

    def __init__(self, service_name: str = "dating-coach-service"):
        """
        Initialize the formatter.

        Args:
            service_name: Name of the service for log identification
        """
        super().__init__()
        self.service_name = service_name

    def format(self, record: logging.LogRecord) -> str:
        """
        Format the log record as JSON.

        Args:
            record: Log record to format

        Returns:
            JSON-formatted log string
        """
        # Base log structure
        log_dict = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "service": self.service_name,
        }

        # Add location info for debug level
        if record.levelno <= logging.DEBUG:
            log_dict["location"] = {
                "file": record.filename,
                "line": record.lineno,
                "function": record.funcName,
            }

        # Add request context if available
        request_id = get_request_id()
        if request_id:
            log_dict["request_id"] = request_id

        user_hash = get_user_id_hash()
        if user_hash:
            log_dict["user_hash"] = user_hash

        # Add exception info if present
        if record.exc_info:
            log_dict["exception"] = {
                "type": record.exc_info[0].__name__ if record.exc_info[0] else None,
                "message": str(record.exc_info[1]) if record.exc_info[1] else None,
                "traceback": self._format_traceback(record.exc_info),
            }

        # Add extra fields
        extra_fields = self._extract_extra_fields(record)
        if extra_fields:
            log_dict["extra"] = extra_fields

        return json.dumps(log_dict, default=str)

    def _format_traceback(self, exc_info) -> Optional[str]:
        """Format exception traceback."""
        if exc_info and exc_info[2]:
            return "".join(traceback.format_exception(*exc_info))
        return None

    def _extract_extra_fields(self, record: logging.LogRecord) -> Dict[str, Any]:
        """Extract extra fields from the log record."""
        extra = {}
        for key, value in record.__dict__.items():
            if key not in self.RESERVED_ATTRS:
                # Ensure the value is JSON serializable
                try:
                    json.dumps(value)
                    extra[key] = value
                except (TypeError, ValueError):
                    extra[key] = str(value)
        return extra


class HumanReadableFormatter(logging.Formatter):
    """
    Formatter for human-readable console output in development.

    Includes color coding for different log levels.
    """

    # ANSI color codes
    COLORS = {
        "DEBUG": "\033[36m",      # Cyan
        "INFO": "\033[32m",       # Green
        "WARNING": "\033[33m",    # Yellow
        "ERROR": "\033[31m",      # Red
        "CRITICAL": "\033[35m",   # Magenta
    }
    RESET = "\033[0m"

    def __init__(self, use_colors: bool = True):
        """
        Initialize the formatter.

        Args:
            use_colors: Whether to use ANSI colors
        """
        super().__init__()
        self.use_colors = use_colors

    def format(self, record: logging.LogRecord) -> str:
        """
        Format the log record for human readability.

        Args:
            record: Log record to format

        Returns:
            Formatted log string
        """
        # Timestamp
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]

        # Level with optional color
        level = record.levelname
        if self.use_colors and level in self.COLORS:
            level = f"{self.COLORS[level]}{level:8}{self.RESET}"
        else:
            level = f"{level:8}"

        # Base message
        message = record.getMessage()

        # Request context
        request_id = get_request_id()
        context = f"[{request_id[:8]}]" if request_id else "[--------]"

        # Build the log line
        log_line = f"{timestamp} {level} {context} {record.name}: {message}"

        # Add extra fields on a new line
        extra_fields = self._extract_extra_fields(record)
        if extra_fields:
            extra_str = " | ".join(f"{k}={v}" for k, v in extra_fields.items())
            log_line += f"\n    {extra_str}"

        # Add exception info
        if record.exc_info:
            log_line += "\n" + "".join(traceback.format_exception(*record.exc_info))

        return log_line

    def _extract_extra_fields(self, record: logging.LogRecord) -> Dict[str, Any]:
        """Extract extra fields from the log record."""
        extra = {}
        reserved = {
            "args", "asctime", "created", "exc_info", "exc_text", "filename",
            "funcName", "levelname", "levelno", "lineno", "module", "msecs",
            "message", "msg", "name", "pathname", "process", "processName",
            "relativeCreated", "stack_info", "thread", "threadName", "taskName"
        }
        for key, value in record.__dict__.items():
            if key not in reserved:
                extra[key] = value
        return extra


class RequestContextFilter(logging.Filter):
    """
    Logging filter that adds request context to all log records.
    """

    def filter(self, record: logging.LogRecord) -> bool:
        """
        Add request context to the log record.

        Args:
            record: Log record to filter

        Returns:
            Always returns True (we don't filter, just enrich)
        """
        record.request_id = get_request_id() or "-"
        record.user_hash = get_user_id_hash() or "-"
        return True


def setup_logging(
    level: str = "INFO",
    json_format: bool = True,
    service_name: str = "dating-coach-service",
    log_file: Optional[str] = None,
    max_file_size: int = 10 * 1024 * 1024,  # 10 MB
    backup_count: int = 5,
) -> logging.Logger:
    """
    Set up structured logging for the application.

    Args:
        level: Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        json_format: Whether to use JSON format (True for production)
        service_name: Name of the service
        log_file: Optional file path for logging
        max_file_size: Max log file size before rotation
        backup_count: Number of backup files to keep

    Returns:
        Configured root logger
    """
    # Get the root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, level.upper()))

    # Remove existing handlers
    root_logger.handlers = []

    # Create formatter
    if json_format:
        formatter = StructuredLogFormatter(service_name=service_name)
    else:
        formatter = HumanReadableFormatter(use_colors=True)

    # Add console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    console_handler.addFilter(RequestContextFilter())
    root_logger.addHandler(console_handler)

    # Add file handler if specified
    if log_file:
        file_handler = RotatingFileHandler(
            log_file,
            maxBytes=max_file_size,
            backupCount=backup_count,
        )
        file_handler.setFormatter(StructuredLogFormatter(service_name=service_name))
        file_handler.addFilter(RequestContextFilter())
        root_logger.addHandler(file_handler)

    # Reduce noise from third-party libraries
    logging.getLogger("uvicorn").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("openai").setLevel(logging.WARNING)
    logging.getLogger("anthropic").setLevel(logging.WARNING)

    return root_logger


class LogContext:
    """
    Context manager for adding temporary context to logs.

    Usage:
        with LogContext(operation="generate_icebreaker", match_id="123"):
            logger.info("Starting generation")
            # All logs within this block will have operation and match_id
    """

    def __init__(self, **context):
        """
        Initialize log context.

        Args:
            **context: Key-value pairs to add to logs
        """
        self.context = context
        self._old_factory = None

    def __enter__(self):
        """Enter the context, adding fields to all logs."""
        self._old_factory = logging.getLogRecordFactory()

        def record_factory(*args, **kwargs):
            record = self._old_factory(*args, **kwargs)
            for key, value in self.context.items():
                setattr(record, key, value)
            return record

        logging.setLogRecordFactory(record_factory)
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Exit the context, restoring the original factory."""
        logging.setLogRecordFactory(self._old_factory)
        return False


def log_timing(logger: logging.Logger, operation: str, duration_ms: float, **extra):
    """
    Log a timing event with standardized format.

    Args:
        logger: Logger to use
        operation: Name of the operation
        duration_ms: Duration in milliseconds
        **extra: Additional context
    """
    logger.info(
        f"Timing: {operation} completed",
        extra={
            "operation": operation,
            "duration_ms": round(duration_ms, 2),
            **extra,
        }
    )


def log_error(
    logger: logging.Logger,
    error: Exception,
    operation: str,
    user_id: Optional[str] = None,
    **extra
):
    """
    Log an error with standardized format and context.

    Args:
        logger: Logger to use
        error: The exception that occurred
        operation: Name of the operation that failed
        user_id: Optional user ID (will be hashed)
        **extra: Additional context
    """
    error_context = {
        "operation": operation,
        "error_type": type(error).__name__,
        "error_message": str(error),
        **extra,
    }

    if user_id:
        error_context["user_hash"] = hashlib.sha256(user_id.encode()).hexdigest()[:8]

    logger.error(
        f"Error in {operation}: {type(error).__name__}",
        extra=error_context,
        exc_info=True,
    )


def log_ai_call(
    logger: logging.Logger,
    provider: str,
    operation: str,
    duration_ms: float,
    tokens_used: Optional[int] = None,
    success: bool = True,
    **extra
):
    """
    Log an AI provider API call.

    Args:
        logger: Logger to use
        provider: AI provider name (openai, anthropic)
        operation: Type of AI operation
        duration_ms: Duration in milliseconds
        tokens_used: Optional token count
        success: Whether the call succeeded
        **extra: Additional context
    """
    log_data = {
        "ai_provider": provider,
        "ai_operation": operation,
        "duration_ms": round(duration_ms, 2),
        "success": success,
        **extra,
    }

    if tokens_used is not None:
        log_data["tokens_used"] = tokens_used

    level = logging.INFO if success else logging.WARNING
    logger.log(
        level,
        f"AI call to {provider}: {operation} ({'success' if success else 'failed'})",
        extra=log_data,
    )


def log_rate_limit(
    logger: logging.Logger,
    user_id: str,
    coaching_type: str,
    tier: str,
    remaining: int,
    limit: int,
):
    """
    Log a rate limit check or hit.

    Args:
        logger: Logger to use
        user_id: User ID (will be hashed)
        coaching_type: Type of coaching request
        tier: User's subscription tier
        remaining: Remaining requests
        limit: Total limit
    """
    user_hash = hashlib.sha256(user_id.encode()).hexdigest()[:8]
    is_limit_hit = remaining == 0

    log_data = {
        "user_hash": user_hash,
        "coaching_type": coaching_type,
        "tier": tier,
        "remaining": remaining,
        "limit": limit,
        "limit_hit": is_limit_hit,
    }

    if is_limit_hit:
        logger.warning("Rate limit hit", extra=log_data)
    else:
        logger.debug("Rate limit check", extra=log_data)
