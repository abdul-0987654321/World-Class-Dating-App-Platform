"""
Centralized Logging Configuration for Python AI Services

Features:
- Environment-aware log levels
- JSON formatting for production
- Colored console output for development
- Sensitive data sanitization
- Correlation ID support
- Application Insights integration ready
"""

import logging
import logging.config
import json
import os
import re
from datetime import datetime
from typing import Any, Dict, Optional
import sys

# Sensitive field patterns to redact
SENSITIVE_FIELDS = {
    'password', 'token', 'access_token', 'refresh_token', 'api_key', 'secret',
    'authorization', 'auth', 'credit_card', 'cvv', 'ssn', 'pin', 'private_key',
    'email', 'phone', 'phone_number', 'address', 'latitude', 'longitude',
    'location', 'birthdate', 'dob', 'bank_account', 'iban', 'routing_number',
    'session', 'session_id', 'session_token', 'api_secret', 'client_secret',
}


class SensitiveDataFilter(logging.Filter):
    """Filter to sanitize sensitive data from log records"""

    def filter(self, record: logging.LogRecord) -> bool:
        # Sanitize message
        if hasattr(record, 'msg'):
            record.msg = self._sanitize_string(str(record.msg))

        # Sanitize extra fields
        for key, value in list(vars(record).items()):
            if key.lower() in SENSITIVE_FIELDS:
                setattr(record, key, '[REDACTED]')
            elif isinstance(value, (dict, list)):
                setattr(record, key, self._sanitize_data(value))
            elif isinstance(value, str):
                setattr(record, key, self._sanitize_string(value))

        return True

    def _sanitize_data(self, data: Any) -> Any:
        """Recursively sanitize sensitive data"""
        if data is None:
            return data

        if isinstance(data, str):
            return self._sanitize_string(data)

        if isinstance(data, dict):
            return {
                k: '[REDACTED]' if k.lower() in SENSITIVE_FIELDS else self._sanitize_data(v)
                for k, v in data.items()
            }

        if isinstance(data, list):
            return [self._sanitize_data(item) for item in data]

        return data

    def _sanitize_string(self, text: str) -> str:
        """Sanitize strings containing sensitive patterns"""
        # Redact long alphanumeric strings (potential tokens)
        text = re.sub(r'\b[A-Za-z0-9_-]{32,}\b', '[REDACTED_TOKEN]', text)

        # Redact email addresses
        text = re.sub(r'\b[^\s@]+@[^\s@]+\.[^\s@]+\b', '[REDACTED_EMAIL]', text)

        # Redact phone numbers
        text = re.sub(r'\b[\d\s()+-]{10,}\b', '[REDACTED_PHONE]', text)

        return text


class JSONFormatter(logging.Formatter):
    """JSON formatter for production logging"""

    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
            'service': getattr(record, 'service', 'ai-service'),
            'environment': os.getenv('NODE_ENV', 'development'),
            'version': os.getenv('APP_VERSION', '1.0.0'),
        }

        # Add correlation ID if present
        if hasattr(record, 'correlation_id'):
            log_data['correlationId'] = record.correlation_id

        # Add exception info
        if record.exc_info:
            log_data['exception'] = self.formatException(record.exc_info)

        # Add extra fields
        if hasattr(record, 'extra'):
            log_data.update(record.extra)

        # Add custom attributes
        for key, value in vars(record).items():
            if key not in ['name', 'msg', 'args', 'created', 'filename', 'funcName',
                          'levelname', 'levelno', 'lineno', 'module', 'msecs',
                          'message', 'pathname', 'process', 'processName',
                          'relativeCreated', 'thread', 'threadName', 'exc_info',
                          'exc_text', 'stack_info', 'extra']:
                log_data[key] = value

        return json.dumps(log_data)


class ColoredFormatter(logging.Formatter):
    """Colored formatter for development logging"""

    COLORS = {
        'DEBUG': '\033[36m',     # Cyan
        'INFO': '\033[32m',      # Green
        'WARNING': '\033[33m',   # Yellow
        'ERROR': '\033[31m',     # Red
        'CRITICAL': '\033[35m',  # Magenta
    }
    RESET = '\033[0m'

    def format(self, record: logging.LogRecord) -> str:
        color = self.COLORS.get(record.levelname, self.RESET)
        record.levelname = f"{color}{record.levelname}{self.RESET}"

        # Format timestamp
        timestamp = datetime.fromtimestamp(record.created).strftime('%Y-%m-%d %H:%M:%S')

        # Format message
        service = getattr(record, 'service', 'ai-service')
        correlation_id = getattr(record, 'correlation_id', None)

        msg = f"{timestamp} [{service}]"
        if correlation_id:
            msg += f" [{correlation_id}]"
        msg += f" {record.levelname}: {record.getMessage()}"

        # Add exception if present
        if record.exc_info:
            msg += f"\n{self.formatException(record.exc_info)}"

        return msg


def configure_logging(
    service_name: str,
    level: Optional[str] = None,
    enable_json: Optional[bool] = None,
) -> None:
    """
    Configure logging for a service

    Args:
        service_name: Name of the service
        level: Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        enable_json: Force JSON output (defaults to True for production)
    """
    is_production = os.getenv('NODE_ENV') == 'production'
    log_level = level or os.getenv('LOG_LEVEL', 'INFO' if is_production else 'DEBUG')
    use_json = enable_json if enable_json is not None else is_production

    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)

    # Remove existing handlers
    root_logger.handlers = []

    # Create console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(log_level)

    # Set formatter
    if use_json:
        formatter = JSONFormatter()
    else:
        formatter = ColoredFormatter()

    console_handler.setFormatter(formatter)

    # Add sensitive data filter
    console_handler.addFilter(SensitiveDataFilter())

    # Add handler to root logger
    root_logger.addHandler(console_handler)

    # Set service name as default extra
    logging.basicConfig(
        level=log_level,
        handlers=[console_handler],
    )

    # Configure loggers for third-party libraries
    logging.getLogger('uvicorn').setLevel(logging.INFO)
    logging.getLogger('fastapi').setLevel(logging.INFO)
    logging.getLogger('httpx').setLevel(logging.WARNING)
    logging.getLogger('httpcore').setLevel(logging.WARNING)

    # Log initialization
    logger = logging.getLogger(service_name)
    logger.info(f"Logging configured for {service_name}", extra={'service': service_name})


def get_logger(name: str, service: Optional[str] = None) -> logging.Logger:
    """
    Get a logger instance with service context

    Args:
        name: Logger name
        service: Service name to add to logs

    Returns:
        Logger instance
    """
    logger = logging.getLogger(name)

    if service:
        # Add service to all log records
        old_factory = logging.getLogRecordFactory()

        def record_factory(*args, **kwargs):
            record = old_factory(*args, **kwargs)
            record.service = service
            return record

        logging.setLogRecordFactory(record_factory)

    return logger


class CorrelationIdFilter(logging.Filter):
    """Add correlation ID to log records"""

    def __init__(self, correlation_id: str):
        super().__init__()
        self.correlation_id = correlation_id

    def filter(self, record: logging.LogRecord) -> bool:
        record.correlation_id = self.correlation_id
        return True


def add_correlation_id(logger: logging.Logger, correlation_id: str) -> logging.Logger:
    """
    Add correlation ID filter to logger

    Args:
        logger: Logger instance
        correlation_id: Correlation ID to add

    Returns:
        Logger with correlation ID
    """
    logger.addFilter(CorrelationIdFilter(correlation_id))
    return logger
