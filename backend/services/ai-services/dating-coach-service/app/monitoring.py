"""
Monitoring and metrics module for Dating Coach Service.

This module provides Prometheus-compatible metrics for monitoring:
- Request/response timing
- Error rates by type
- Rate limit hits
- AI provider latency
- Feature usage counters

Alert Conditions (documented):
- Error rate > 5% over 5 minutes
- Latency p99 > 5s
- AI provider failures > 3 in 1 minute
- Rate limit exhaustion (user hitting limits)
"""

import time
import hashlib
import logging
from typing import Optional, Dict, Any, Callable
from functools import wraps
from enum import Enum
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from collections import defaultdict
import threading
import asyncio

logger = logging.getLogger(__name__)


class MetricType(str, Enum):
    """Types of Prometheus metrics."""
    COUNTER = "counter"
    GAUGE = "gauge"
    HISTOGRAM = "histogram"
    SUMMARY = "summary"


class CoachingRequestType(str, Enum):
    """Types of coaching requests for metrics."""
    ICEBREAKER = "icebreaker"
    RESPONSE_SUGGESTION = "response_suggestion"
    PROFILE_TIPS = "profile_tips"
    DATE_IDEAS = "date_ideas"
    CONVERSATION_ANALYSIS = "conversation_analysis"
    REAL_TIME_COACHING = "real_time_coaching"
    NEXT_MESSAGE = "next_message"
    DATE_ASK = "date_ask"
    SHARED_EXPERIENCES = "shared_experiences"
    CONVERSATION_GAME = "conversation_game"
    TRAJECTORY = "trajectory"
    STYLE_ANALYSIS = "style_analysis"
    STYLE_COMPATIBILITY = "style_compatibility"


class ErrorType(str, Enum):
    """Types of errors for metrics."""
    VALIDATION_ERROR = "validation_error"
    AI_PROVIDER_ERROR = "ai_provider_error"
    RATE_LIMIT_ERROR = "rate_limit_error"
    AUTHENTICATION_ERROR = "authentication_error"
    TIMEOUT_ERROR = "timeout_error"
    INTERNAL_ERROR = "internal_error"
    REDIS_ERROR = "redis_error"
    NETWORK_ERROR = "network_error"


# Histogram bucket boundaries for latency metrics (in seconds)
DEFAULT_LATENCY_BUCKETS = (0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0, 30.0, float("inf"))
AI_PROVIDER_LATENCY_BUCKETS = (0.1, 0.25, 0.5, 1.0, 2.0, 3.0, 5.0, 10.0, 30.0, 60.0, float("inf"))


@dataclass
class HistogramData:
    """Data structure for histogram metrics."""
    buckets: tuple
    bucket_counts: Dict[float, int] = field(default_factory=dict)
    sum_value: float = 0.0
    count: int = 0

    def __post_init__(self):
        self.bucket_counts = {b: 0 for b in self.buckets}

    def observe(self, value: float):
        """Record an observation in the histogram."""
        self.sum_value += value
        self.count += 1
        for bucket in self.buckets:
            if value <= bucket:
                self.bucket_counts[bucket] += 1


@dataclass
class CounterData:
    """Data structure for counter metrics."""
    value: float = 0.0
    labels: Dict[str, str] = field(default_factory=dict)

    def inc(self, amount: float = 1.0):
        """Increment the counter."""
        self.value += amount


@dataclass
class GaugeData:
    """Data structure for gauge metrics."""
    value: float = 0.0

    def set(self, value: float):
        """Set the gauge value."""
        self.value = value

    def inc(self, amount: float = 1.0):
        """Increment the gauge."""
        self.value += amount

    def dec(self, amount: float = 1.0):
        """Decrement the gauge."""
        self.value -= amount


class MetricsRegistry:
    """
    Thread-safe metrics registry for Prometheus-compatible metrics.

    Provides counters, gauges, and histograms for monitoring the dating coach service.
    """

    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return

        self._lock = threading.Lock()

        # Counters
        self._counters: Dict[str, Dict[tuple, CounterData]] = defaultdict(dict)

        # Gauges
        self._gauges: Dict[str, Dict[tuple, GaugeData]] = defaultdict(dict)

        # Histograms
        self._histograms: Dict[str, Dict[tuple, HistogramData]] = defaultdict(dict)

        # Metric metadata
        self._metric_help: Dict[str, str] = {}
        self._metric_type: Dict[str, MetricType] = {}

        # Initialize all metrics
        self._initialize_metrics()

        self._initialized = True

    def _initialize_metrics(self):
        """Initialize all metrics with their metadata."""
        # Request counters
        self.register_counter(
            "coaching_requests_total",
            "Total number of coaching requests by type"
        )

        self.register_counter(
            "coaching_requests_success_total",
            "Total number of successful coaching requests"
        )

        self.register_counter(
            "coaching_errors_total",
            "Total number of errors by error type"
        )

        self.register_counter(
            "rate_limit_hits_total",
            "Total number of rate limit hits"
        )

        self.register_counter(
            "feature_flag_checks_total",
            "Total number of feature flag checks by feature"
        )

        self.register_counter(
            "ai_provider_requests_total",
            "Total number of AI provider requests"
        )

        self.register_counter(
            "ai_provider_errors_total",
            "Total number of AI provider errors"
        )

        # Request duration histograms
        self.register_histogram(
            "coaching_request_duration_seconds",
            "Duration of coaching requests in seconds",
            buckets=DEFAULT_LATENCY_BUCKETS
        )

        self.register_histogram(
            "ai_provider_latency_seconds",
            "AI provider response latency in seconds",
            buckets=AI_PROVIDER_LATENCY_BUCKETS
        )

        # Gauges for current state
        self.register_gauge(
            "active_requests",
            "Number of currently active requests"
        )

        self.register_gauge(
            "ai_provider_healthy",
            "AI provider health status (1 = healthy, 0 = unhealthy)"
        )

        self.register_gauge(
            "redis_connected",
            "Redis connection status (1 = connected, 0 = disconnected)"
        )

    def register_counter(self, name: str, help_text: str):
        """Register a new counter metric."""
        self._metric_help[name] = help_text
        self._metric_type[name] = MetricType.COUNTER

    def register_gauge(self, name: str, help_text: str):
        """Register a new gauge metric."""
        self._metric_help[name] = help_text
        self._metric_type[name] = MetricType.GAUGE

    def register_histogram(self, name: str, help_text: str, buckets: tuple = DEFAULT_LATENCY_BUCKETS):
        """Register a new histogram metric."""
        self._metric_help[name] = help_text
        self._metric_type[name] = MetricType.HISTOGRAM
        # Store bucket configuration
        self._histograms[f"{name}_buckets"] = buckets

    def _labels_to_key(self, labels: Dict[str, str]) -> tuple:
        """Convert labels dict to a hashable key."""
        return tuple(sorted(labels.items()))

    def counter_inc(self, name: str, labels: Optional[Dict[str, str]] = None, amount: float = 1.0):
        """Increment a counter metric."""
        labels = labels or {}
        key = self._labels_to_key(labels)

        with self._lock:
            if key not in self._counters[name]:
                self._counters[name][key] = CounterData(labels=labels)
            self._counters[name][key].inc(amount)

    def gauge_set(self, name: str, value: float, labels: Optional[Dict[str, str]] = None):
        """Set a gauge value."""
        labels = labels or {}
        key = self._labels_to_key(labels)

        with self._lock:
            if key not in self._gauges[name]:
                self._gauges[name][key] = GaugeData()
            self._gauges[name][key].set(value)

    def gauge_inc(self, name: str, labels: Optional[Dict[str, str]] = None, amount: float = 1.0):
        """Increment a gauge."""
        labels = labels or {}
        key = self._labels_to_key(labels)

        with self._lock:
            if key not in self._gauges[name]:
                self._gauges[name][key] = GaugeData()
            self._gauges[name][key].inc(amount)

    def gauge_dec(self, name: str, labels: Optional[Dict[str, str]] = None, amount: float = 1.0):
        """Decrement a gauge."""
        labels = labels or {}
        key = self._labels_to_key(labels)

        with self._lock:
            if key not in self._gauges[name]:
                self._gauges[name][key] = GaugeData()
            self._gauges[name][key].dec(amount)

    def histogram_observe(self, name: str, value: float, labels: Optional[Dict[str, str]] = None):
        """Record an observation in a histogram."""
        labels = labels or {}
        key = self._labels_to_key(labels)
        buckets = self._histograms.get(f"{name}_buckets", DEFAULT_LATENCY_BUCKETS)

        with self._lock:
            if key not in self._histograms[name]:
                self._histograms[name][key] = HistogramData(buckets=buckets)
            self._histograms[name][key].observe(value)

    def get_metrics_output(self) -> str:
        """
        Generate Prometheus text format output for all metrics.

        Returns:
            Prometheus text format metrics string
        """
        lines = []

        # Output counters
        for name, counters in self._counters.items():
            if name not in self._metric_help:
                continue
            lines.append(f"# HELP {name} {self._metric_help[name]}")
            lines.append(f"# TYPE {name} counter")
            for key, counter in counters.items():
                labels_str = self._format_labels(dict(key))
                lines.append(f"{name}{labels_str} {counter.value}")

        # Output gauges
        for name, gauges in self._gauges.items():
            if name not in self._metric_help:
                continue
            lines.append(f"# HELP {name} {self._metric_help[name]}")
            lines.append(f"# TYPE {name} gauge")
            for key, gauge in gauges.items():
                labels_str = self._format_labels(dict(key))
                lines.append(f"{name}{labels_str} {gauge.value}")

        # Output histograms
        for name, histograms in self._histograms.items():
            if name.endswith("_buckets"):
                continue
            if name not in self._metric_help:
                continue
            lines.append(f"# HELP {name} {self._metric_help[name]}")
            lines.append(f"# TYPE {name} histogram")
            for key, histogram in histograms.items():
                base_labels = dict(key)
                for bucket, count in histogram.bucket_counts.items():
                    bucket_labels = {**base_labels, "le": str(bucket) if bucket != float("inf") else "+Inf"}
                    labels_str = self._format_labels(bucket_labels)
                    lines.append(f"{name}_bucket{labels_str} {count}")
                labels_str = self._format_labels(base_labels)
                lines.append(f"{name}_sum{labels_str} {histogram.sum_value}")
                lines.append(f"{name}_count{labels_str} {histogram.count}")

        return "\n".join(lines)

    def _format_labels(self, labels: Dict[str, str]) -> str:
        """Format labels for Prometheus output."""
        if not labels:
            return ""
        label_pairs = [f'{k}="{v}"' for k, v in sorted(labels.items())]
        return "{" + ",".join(label_pairs) + "}"

    def get_metrics_summary(self) -> Dict[str, Any]:
        """
        Get a summary of current metrics for health checks and debugging.

        Returns:
            Dictionary with metric summaries
        """
        summary = {
            "counters": {},
            "gauges": {},
            "histograms": {}
        }

        with self._lock:
            # Summarize counters
            for name, counters in self._counters.items():
                total = sum(c.value for c in counters.values())
                summary["counters"][name] = {
                    "total": total,
                    "by_labels": {str(k): c.value for k, c in counters.items()}
                }

            # Summarize gauges
            for name, gauges in self._gauges.items():
                summary["gauges"][name] = {
                    str(k): g.value for k, g in gauges.items()
                }

            # Summarize histograms
            for name, histograms in self._histograms.items():
                if name.endswith("_buckets"):
                    continue
                summary["histograms"][name] = {}
                for key, histogram in histograms.items():
                    avg = histogram.sum_value / histogram.count if histogram.count > 0 else 0
                    summary["histograms"][name][str(key)] = {
                        "count": histogram.count,
                        "sum": histogram.sum_value,
                        "avg": avg
                    }

        return summary


# Global metrics registry instance
metrics = MetricsRegistry()


def hash_user_id(user_id: str) -> str:
    """
    Hash user ID for privacy in logs and metrics.

    Args:
        user_id: Original user ID

    Returns:
        Hashed user ID (first 8 characters of SHA256)
    """
    return hashlib.sha256(user_id.encode()).hexdigest()[:8]


class Timer:
    """Context manager for timing operations and recording to histogram."""

    def __init__(
        self,
        metric_name: str,
        labels: Optional[Dict[str, str]] = None,
        registry: MetricsRegistry = None
    ):
        self.metric_name = metric_name
        self.labels = labels or {}
        self.registry = registry or metrics
        self.start_time: float = 0
        self.duration: float = 0

    def __enter__(self):
        self.start_time = time.perf_counter()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.duration = time.perf_counter() - self.start_time
        self.registry.histogram_observe(self.metric_name, self.duration, self.labels)
        return False


class AsyncTimer:
    """Async context manager for timing operations."""

    def __init__(
        self,
        metric_name: str,
        labels: Optional[Dict[str, str]] = None,
        registry: MetricsRegistry = None
    ):
        self.metric_name = metric_name
        self.labels = labels or {}
        self.registry = registry or metrics
        self.start_time: float = 0
        self.duration: float = 0

    async def __aenter__(self):
        self.start_time = time.perf_counter()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        self.duration = time.perf_counter() - self.start_time
        self.registry.histogram_observe(self.metric_name, self.duration, self.labels)
        return False


def track_request(request_type: CoachingRequestType):
    """
    Decorator for tracking coaching request metrics.

    Records:
    - Request count by type
    - Request duration
    - Success/failure counts
    - Error types

    Args:
        request_type: Type of coaching request
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            labels = {"type": request_type.value}

            # Increment request counter
            metrics.counter_inc("coaching_requests_total", labels)

            # Track active requests
            metrics.gauge_inc("active_requests", labels)

            start_time = time.perf_counter()

            try:
                result = await func(*args, **kwargs)

                # Record success
                metrics.counter_inc("coaching_requests_success_total", labels)

                return result

            except Exception as e:
                # Categorize and record error
                error_type = _categorize_error(e)
                metrics.counter_inc(
                    "coaching_errors_total",
                    {"type": request_type.value, "error_type": error_type.value}
                )
                raise

            finally:
                # Record duration
                duration = time.perf_counter() - start_time
                metrics.histogram_observe("coaching_request_duration_seconds", duration, labels)

                # Decrement active requests
                metrics.gauge_dec("active_requests", labels)

        return wrapper
    return decorator


def track_ai_provider_call(provider: str = ""):
    """
    Decorator for tracking AI provider API calls.

    Records:
    - AI provider request count
    - AI provider latency
    - AI provider errors

    Args:
        provider: Name of the AI provider (openai, anthropic)
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Try to get provider from self if not specified
            actual_provider = provider
            if not actual_provider and args and hasattr(args[0], 'provider'):
                actual_provider = args[0].provider

            labels = {"provider": actual_provider}

            # Increment request counter
            metrics.counter_inc("ai_provider_requests_total", labels)

            start_time = time.perf_counter()

            try:
                result = await func(*args, **kwargs)
                return result

            except Exception as e:
                # Record AI provider error
                error_type = _categorize_error(e)
                metrics.counter_inc(
                    "ai_provider_errors_total",
                    {"provider": actual_provider, "error_type": error_type.value}
                )
                raise

            finally:
                # Record latency
                duration = time.perf_counter() - start_time
                metrics.histogram_observe("ai_provider_latency_seconds", duration, labels)

        return wrapper
    return decorator


def track_rate_limit_hit(user_id: str, coaching_type: str, tier: str):
    """
    Record a rate limit hit.

    Args:
        user_id: User ID (will be hashed)
        coaching_type: Type of coaching that was rate limited
        tier: User's subscription tier
    """
    metrics.counter_inc(
        "rate_limit_hits_total",
        {
            "coaching_type": coaching_type,
            "tier": tier,
            "user_hash": hash_user_id(user_id)
        }
    )

    logger.warning(
        "Rate limit hit",
        extra={
            "user_hash": hash_user_id(user_id),
            "coaching_type": coaching_type,
            "tier": tier
        }
    )


def track_feature_flag_check(feature_name: str, enabled: bool, user_id: Optional[str] = None):
    """
    Record a feature flag check.

    Args:
        feature_name: Name of the feature being checked
        enabled: Whether the feature was enabled for the user
        user_id: Optional user ID (will be hashed)
    """
    labels = {
        "feature": feature_name,
        "enabled": str(enabled).lower()
    }

    metrics.counter_inc("feature_flag_checks_total", labels)


def _categorize_error(error: Exception) -> ErrorType:
    """
    Categorize an exception into an error type for metrics.

    Args:
        error: The exception to categorize

    Returns:
        ErrorType enum value
    """
    error_name = type(error).__name__.lower()
    error_msg = str(error).lower()

    # Check for specific error patterns
    if "validation" in error_name or "validation" in error_msg:
        return ErrorType.VALIDATION_ERROR

    if "rate" in error_msg and "limit" in error_msg:
        return ErrorType.RATE_LIMIT_ERROR

    if "auth" in error_name or "401" in error_msg or "403" in error_msg:
        return ErrorType.AUTHENTICATION_ERROR

    if "timeout" in error_name or "timeout" in error_msg:
        return ErrorType.TIMEOUT_ERROR

    if "redis" in error_name or "redis" in error_msg:
        return ErrorType.REDIS_ERROR

    if any(x in error_name for x in ["openai", "anthropic", "ai"]) or \
       any(x in error_msg for x in ["openai", "anthropic", "api key"]):
        return ErrorType.AI_PROVIDER_ERROR

    if any(x in error_name for x in ["connection", "network", "http"]):
        return ErrorType.NETWORK_ERROR

    return ErrorType.INTERNAL_ERROR


class MetricsCollector:
    """
    Utility class for collecting and aggregating metrics over time windows.

    Used for calculating rates, percentiles, and rolling averages.
    """

    def __init__(self, window_seconds: int = 300):
        """
        Initialize metrics collector.

        Args:
            window_seconds: Time window for calculations (default 5 minutes)
        """
        self.window_seconds = window_seconds
        self._events: Dict[str, list] = defaultdict(list)
        self._lock = threading.Lock()

    def record_event(self, metric_name: str, value: float = 1.0, labels: Optional[Dict[str, str]] = None):
        """
        Record an event with timestamp.

        Args:
            metric_name: Name of the metric
            value: Value to record
            labels: Optional labels
        """
        key = f"{metric_name}:{str(labels)}" if labels else metric_name
        timestamp = time.time()

        with self._lock:
            self._events[key].append((timestamp, value))
            # Cleanup old events
            cutoff = timestamp - self.window_seconds
            self._events[key] = [
                (ts, v) for ts, v in self._events[key]
                if ts > cutoff
            ]

    def get_rate(self, metric_name: str, labels: Optional[Dict[str, str]] = None) -> float:
        """
        Calculate rate of events per second over the window.

        Args:
            metric_name: Name of the metric
            labels: Optional labels

        Returns:
            Events per second
        """
        key = f"{metric_name}:{str(labels)}" if labels else metric_name

        with self._lock:
            events = self._events.get(key, [])
            if not events:
                return 0.0

            # Clean up and count events in window
            cutoff = time.time() - self.window_seconds
            recent_events = [(ts, v) for ts, v in events if ts > cutoff]

            if not recent_events:
                return 0.0

            total_value = sum(v for _, v in recent_events)
            return total_value / self.window_seconds

    def get_error_rate(self) -> float:
        """
        Calculate current error rate (errors / total requests).

        Returns:
            Error rate as a percentage (0-100)
        """
        with self._lock:
            total_key = "total_requests:None"
            error_key = "errors:None"

            cutoff = time.time() - self.window_seconds

            total_events = self._events.get(total_key, [])
            total_count = sum(1 for ts, _ in total_events if ts > cutoff)

            error_events = self._events.get(error_key, [])
            error_count = sum(1 for ts, _ in error_events if ts > cutoff)

            if total_count == 0:
                return 0.0

            return (error_count / total_count) * 100


# Global metrics collector for rate calculations
metrics_collector = MetricsCollector()
