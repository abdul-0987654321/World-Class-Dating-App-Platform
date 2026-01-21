"""
Alert conditions and rules for the Dating Coach Service.

This module defines:
- Alert thresholds and conditions
- Alert evaluation logic
- Integration with monitoring systems (Prometheus, PagerDuty, etc.)
- Alert state management

============================================================================
ALERT CONDITIONS SUMMARY
============================================================================

1. ERROR RATE ALERT
   - Condition: Error rate > 5% over 5-minute window
   - Severity: Critical
   - Action: Page on-call engineer, check logs

2. LATENCY P99 ALERT
   - Condition: 99th percentile latency > 5 seconds
   - Severity: Warning (>3s) / Critical (>5s)
   - Action: Investigate AI provider latency, check system resources

3. AI PROVIDER FAILURES
   - Condition: More than 3 AI provider failures in 1 minute
   - Severity: Critical
   - Action: Check AI provider status, fallback to backup

4. RATE LIMIT EXHAUSTION
   - Condition: Multiple users hitting rate limits frequently
   - Severity: Warning
   - Action: Review rate limit settings, consider capacity

5. REDIS CONNECTION FAILURE
   - Condition: Redis unavailable for > 30 seconds
   - Severity: Warning (degraded mode active)
   - Action: Check Redis cluster health

============================================================================
"""

import time
import logging
from typing import Dict, Any, List, Optional, Callable
from enum import Enum
from dataclasses import dataclass, field
from datetime import datetime, timezone, timedelta
from collections import defaultdict
import threading
import asyncio

from app.config import settings
from app.monitoring import metrics, metrics_collector

logger = logging.getLogger(__name__)


class AlertSeverity(str, Enum):
    """Alert severity levels."""
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"
    RESOLVED = "resolved"


class AlertState(str, Enum):
    """Current state of an alert."""
    OK = "ok"
    PENDING = "pending"  # Condition met but not for long enough
    FIRING = "firing"
    RESOLVED = "resolved"


@dataclass
class AlertCondition:
    """
    Defines a condition that triggers an alert.

    Attributes:
        name: Unique identifier for the alert
        description: Human-readable description
        severity: Alert severity level
        threshold: Numeric threshold value
        comparison: How to compare (gt, lt, eq, gte, lte)
        evaluation_window_seconds: Time window for evaluation
        for_duration_seconds: How long condition must be true before firing
        labels: Additional labels for the alert
        runbook_url: Link to runbook for handling
        check_fn: Optional custom check function
    """
    name: str
    description: str
    severity: AlertSeverity
    threshold: float
    comparison: str = "gt"  # gt, lt, eq, gte, lte
    evaluation_window_seconds: int = 300  # 5 minutes
    for_duration_seconds: int = 60  # 1 minute
    labels: Dict[str, str] = field(default_factory=dict)
    runbook_url: Optional[str] = None
    check_fn: Optional[Callable[[], float]] = None


@dataclass
class Alert:
    """
    Represents an active or resolved alert.

    Attributes:
        condition: The alert condition that triggered
        state: Current alert state
        value: The value that triggered the alert
        started_at: When the alert started
        resolved_at: When the alert was resolved (if applicable)
        message: Detailed alert message
        annotations: Additional context
    """
    condition: AlertCondition
    state: AlertState
    value: float
    started_at: datetime
    resolved_at: Optional[datetime] = None
    message: str = ""
    annotations: Dict[str, str] = field(default_factory=dict)


# ============================================================================
# ALERT DEFINITIONS
# ============================================================================

# These are the standard alert conditions for the Dating Coach Service

ALERT_CONDITIONS: List[AlertCondition] = [
    # 1. Error Rate Alert
    AlertCondition(
        name="coaching_high_error_rate",
        description="Error rate exceeds threshold",
        severity=AlertSeverity.CRITICAL,
        threshold=settings.ALERT_ERROR_RATE_THRESHOLD,  # 5%
        comparison="gt",
        evaluation_window_seconds=settings.ALERT_WINDOW_SECONDS,  # 5 minutes
        for_duration_seconds=60,
        labels={"service": "dating-coach-service", "type": "error_rate"},
        runbook_url="https://docs.example.com/runbooks/coaching-high-error-rate",
    ),

    # 2. Latency P99 Warning
    AlertCondition(
        name="coaching_high_latency_warning",
        description="P99 latency exceeds warning threshold",
        severity=AlertSeverity.WARNING,
        threshold=3.0,  # 3 seconds
        comparison="gt",
        evaluation_window_seconds=300,
        for_duration_seconds=120,
        labels={"service": "dating-coach-service", "type": "latency"},
        runbook_url="https://docs.example.com/runbooks/coaching-high-latency",
    ),

    # 3. Latency P99 Critical
    AlertCondition(
        name="coaching_high_latency_critical",
        description="P99 latency exceeds critical threshold",
        severity=AlertSeverity.CRITICAL,
        threshold=settings.ALERT_LATENCY_P99_THRESHOLD,  # 5 seconds
        comparison="gt",
        evaluation_window_seconds=300,
        for_duration_seconds=60,
        labels={"service": "dating-coach-service", "type": "latency"},
        runbook_url="https://docs.example.com/runbooks/coaching-high-latency",
    ),

    # 4. AI Provider Failures
    AlertCondition(
        name="ai_provider_failures",
        description="AI provider experiencing high failure rate",
        severity=AlertSeverity.CRITICAL,
        threshold=float(settings.ALERT_AI_FAILURE_THRESHOLD),  # 3 failures
        comparison="gt",
        evaluation_window_seconds=60,  # 1 minute
        for_duration_seconds=30,
        labels={"service": "dating-coach-service", "type": "ai_provider"},
        runbook_url="https://docs.example.com/runbooks/ai-provider-failures",
    ),

    # 5. Rate Limit Exhaustion
    AlertCondition(
        name="rate_limit_exhaustion",
        description="High rate of users hitting rate limits",
        severity=AlertSeverity.WARNING,
        threshold=50.0,  # 50 rate limit hits per window
        comparison="gt",
        evaluation_window_seconds=300,
        for_duration_seconds=300,
        labels={"service": "dating-coach-service", "type": "rate_limit"},
        runbook_url="https://docs.example.com/runbooks/rate-limit-exhaustion",
    ),

    # 6. Redis Unavailable
    AlertCondition(
        name="redis_unavailable",
        description="Redis connection unavailable",
        severity=AlertSeverity.WARNING,
        threshold=0.5,  # Health gauge < 0.5 means unhealthy
        comparison="lt",
        evaluation_window_seconds=30,
        for_duration_seconds=30,
        labels={"service": "dating-coach-service", "type": "dependency"},
        runbook_url="https://docs.example.com/runbooks/redis-unavailable",
    ),

    # 7. AI Provider Unavailable
    AlertCondition(
        name="ai_provider_unavailable",
        description="AI provider not responding",
        severity=AlertSeverity.CRITICAL,
        threshold=0.5,  # Health gauge < 0.5 means unhealthy
        comparison="lt",
        evaluation_window_seconds=30,
        for_duration_seconds=60,
        labels={"service": "dating-coach-service", "type": "dependency"},
        runbook_url="https://docs.example.com/runbooks/ai-provider-unavailable",
    ),
]


# ============================================================================
# PROMETHEUS ALERTING RULES
# ============================================================================

PROMETHEUS_ALERTING_RULES = """
# Prometheus alerting rules for Dating Coach Service
# Save as: dating-coach-alerts.yaml

groups:
  - name: dating-coach-service
    interval: 30s
    rules:
      # Error Rate Alert
      - alert: CoachingHighErrorRate
        expr: |
          (
            sum(rate(coaching_errors_total[5m]))
            /
            sum(rate(coaching_requests_total[5m]))
          ) * 100 > 5
        for: 1m
        labels:
          severity: critical
          service: dating-coach-service
        annotations:
          summary: "High error rate in Dating Coach Service"
          description: "Error rate is {{ $value | printf \"%.2f\" }}% (threshold: 5%)"
          runbook_url: "https://docs.example.com/runbooks/coaching-high-error-rate"

      # Latency P99 Warning
      - alert: CoachingHighLatencyWarning
        expr: |
          histogram_quantile(0.99,
            sum(rate(coaching_request_duration_seconds_bucket[5m])) by (le)
          ) > 3
        for: 2m
        labels:
          severity: warning
          service: dating-coach-service
        annotations:
          summary: "High latency in Dating Coach Service"
          description: "P99 latency is {{ $value | printf \"%.2f\" }}s (warning threshold: 3s)"
          runbook_url: "https://docs.example.com/runbooks/coaching-high-latency"

      # Latency P99 Critical
      - alert: CoachingHighLatencyCritical
        expr: |
          histogram_quantile(0.99,
            sum(rate(coaching_request_duration_seconds_bucket[5m])) by (le)
          ) > 5
        for: 1m
        labels:
          severity: critical
          service: dating-coach-service
        annotations:
          summary: "Critical latency in Dating Coach Service"
          description: "P99 latency is {{ $value | printf \"%.2f\" }}s (critical threshold: 5s)"
          runbook_url: "https://docs.example.com/runbooks/coaching-high-latency"

      # AI Provider Failures
      - alert: AIProviderFailures
        expr: |
          sum(increase(ai_provider_errors_total[1m])) > 3
        for: 30s
        labels:
          severity: critical
          service: dating-coach-service
        annotations:
          summary: "AI Provider experiencing failures"
          description: "{{ $value }} AI provider failures in the last minute"
          runbook_url: "https://docs.example.com/runbooks/ai-provider-failures"

      # AI Provider Latency
      - alert: AIProviderHighLatency
        expr: |
          histogram_quantile(0.95,
            sum(rate(ai_provider_latency_seconds_bucket[5m])) by (le, provider)
          ) > 10
        for: 2m
        labels:
          severity: warning
          service: dating-coach-service
        annotations:
          summary: "AI Provider {{ $labels.provider }} is slow"
          description: "P95 AI provider latency is {{ $value | printf \"%.2f\" }}s"
          runbook_url: "https://docs.example.com/runbooks/ai-provider-slow"

      # Rate Limit Exhaustion
      - alert: RateLimitExhaustion
        expr: |
          sum(increase(rate_limit_hits_total[5m])) > 50
        for: 5m
        labels:
          severity: warning
          service: dating-coach-service
        annotations:
          summary: "High rate limit hit rate"
          description: "{{ $value }} rate limit hits in 5 minutes"
          runbook_url: "https://docs.example.com/runbooks/rate-limit-exhaustion"

      # Redis Unavailable
      - alert: RedisUnavailable
        expr: |
          redis_connected == 0
        for: 30s
        labels:
          severity: warning
          service: dating-coach-service
        annotations:
          summary: "Redis unavailable for Dating Coach Service"
          description: "Redis is unavailable, rate limiting using fallback"
          runbook_url: "https://docs.example.com/runbooks/redis-unavailable"

      # AI Provider Unavailable
      - alert: AIProviderUnavailable
        expr: |
          ai_provider_healthy == 0
        for: 1m
        labels:
          severity: critical
          service: dating-coach-service
        annotations:
          summary: "AI Provider unavailable"
          description: "AI provider {{ $labels.provider }} is not responding"
          runbook_url: "https://docs.example.com/runbooks/ai-provider-unavailable"

      # Service Down
      - alert: DatingCoachServiceDown
        expr: |
          up{job="dating-coach-service"} == 0
        for: 30s
        labels:
          severity: critical
          service: dating-coach-service
        annotations:
          summary: "Dating Coach Service is down"
          description: "The Dating Coach Service is not responding to health checks"
          runbook_url: "https://docs.example.com/runbooks/service-down"

      # High Active Requests (potential bottleneck)
      - alert: HighActiveRequests
        expr: |
          sum(active_requests) > 100
        for: 2m
        labels:
          severity: warning
          service: dating-coach-service
        annotations:
          summary: "High number of active requests"
          description: "{{ $value }} active requests, potential bottleneck"
          runbook_url: "https://docs.example.com/runbooks/high-active-requests"
"""


# ============================================================================
# ALERT MANAGER
# ============================================================================

class AlertManager:
    """
    Manages alert evaluation and state.

    This class evaluates alert conditions against current metrics
    and manages alert state transitions.
    """

    def __init__(self, conditions: List[AlertCondition] = None):
        """
        Initialize the alert manager.

        Args:
            conditions: List of alert conditions to monitor
        """
        self.conditions = conditions or ALERT_CONDITIONS
        self._alerts: Dict[str, Alert] = {}
        self._pending_since: Dict[str, float] = {}
        self._lock = threading.Lock()
        self._running = False
        self._evaluation_task = None

    async def start(self, evaluation_interval: int = 30):
        """
        Start the alert evaluation loop.

        Args:
            evaluation_interval: How often to evaluate alerts (seconds)
        """
        self._running = True
        logger.info(f"Starting alert manager with {len(self.conditions)} conditions")

        while self._running:
            try:
                await self._evaluate_all_conditions()
            except Exception as e:
                logger.error(f"Error evaluating alerts: {e}", exc_info=True)

            await asyncio.sleep(evaluation_interval)

    def stop(self):
        """Stop the alert evaluation loop."""
        self._running = False
        logger.info("Stopping alert manager")

    async def _evaluate_all_conditions(self):
        """Evaluate all alert conditions."""
        for condition in self.conditions:
            try:
                await self._evaluate_condition(condition)
            except Exception as e:
                logger.error(
                    f"Error evaluating condition {condition.name}: {e}",
                    exc_info=True
                )

    async def _evaluate_condition(self, condition: AlertCondition):
        """
        Evaluate a single alert condition.

        Args:
            condition: The condition to evaluate
        """
        # Get current value
        current_value = self._get_metric_value(condition)

        # Check if condition is met
        condition_met = self._check_threshold(
            current_value,
            condition.threshold,
            condition.comparison
        )

        now = time.time()

        with self._lock:
            if condition_met:
                # Condition is met
                if condition.name not in self._pending_since:
                    # Start pending
                    self._pending_since[condition.name] = now
                    logger.debug(f"Alert {condition.name} is pending")

                pending_duration = now - self._pending_since[condition.name]

                if pending_duration >= condition.for_duration_seconds:
                    # Fire the alert
                    if condition.name not in self._alerts or \
                       self._alerts[condition.name].state != AlertState.FIRING:
                        self._fire_alert(condition, current_value)
            else:
                # Condition not met
                if condition.name in self._pending_since:
                    del self._pending_since[condition.name]

                if condition.name in self._alerts and \
                   self._alerts[condition.name].state == AlertState.FIRING:
                    self._resolve_alert(condition.name)

    def _get_metric_value(self, condition: AlertCondition) -> float:
        """
        Get the current metric value for a condition.

        Args:
            condition: The condition to get value for

        Returns:
            Current metric value
        """
        # Use custom check function if provided
        if condition.check_fn:
            return condition.check_fn()

        # Built-in metric lookups
        name = condition.name

        if "error_rate" in name:
            return metrics_collector.get_error_rate()

        if "latency" in name:
            # Would need histogram percentile calculation
            # For now, return 0 (would be calculated from histogram)
            return 0.0

        if "ai_provider_failures" in name:
            # Count AI provider errors in the window
            return metrics_collector.get_rate("ai_provider_errors") * 60  # Per minute

        if "rate_limit" in name:
            return metrics_collector.get_rate("rate_limit_hits") * 300  # Per 5 minutes

        if "redis" in name:
            # Check Redis connected gauge
            summary = metrics.get_metrics_summary()
            gauges = summary.get("gauges", {})
            redis_gauge = gauges.get("redis_connected", {})
            return list(redis_gauge.values())[0] if redis_gauge else 0.0

        if "ai_provider_unavailable" in name:
            summary = metrics.get_metrics_summary()
            gauges = summary.get("gauges", {})
            ai_gauge = gauges.get("ai_provider_healthy", {})
            return list(ai_gauge.values())[0] if ai_gauge else 0.0

        return 0.0

    def _check_threshold(self, value: float, threshold: float, comparison: str) -> bool:
        """
        Check if value meets threshold condition.

        Args:
            value: Current value
            threshold: Threshold to compare against
            comparison: Comparison operator

        Returns:
            True if condition is met
        """
        if comparison == "gt":
            return value > threshold
        elif comparison == "gte":
            return value >= threshold
        elif comparison == "lt":
            return value < threshold
        elif comparison == "lte":
            return value <= threshold
        elif comparison == "eq":
            return value == threshold
        return False

    def _fire_alert(self, condition: AlertCondition, value: float):
        """
        Fire an alert.

        Args:
            condition: The condition that triggered
            value: The value that triggered it
        """
        alert = Alert(
            condition=condition,
            state=AlertState.FIRING,
            value=value,
            started_at=datetime.now(timezone.utc),
            message=f"{condition.description}: {value:.2f} (threshold: {condition.threshold})",
            annotations={
                "severity": condition.severity.value,
                "runbook": condition.runbook_url or "",
            }
        )

        self._alerts[condition.name] = alert

        logger.warning(
            f"ALERT FIRING: {condition.name}",
            extra={
                "alert_name": condition.name,
                "severity": condition.severity.value,
                "value": value,
                "threshold": condition.threshold,
                "message": alert.message,
            }
        )

        # Here you would integrate with external alerting systems
        # e.g., PagerDuty, Slack, etc.
        self._send_alert_notification(alert)

    def _resolve_alert(self, alert_name: str):
        """
        Resolve an alert.

        Args:
            alert_name: Name of the alert to resolve
        """
        if alert_name not in self._alerts:
            return

        alert = self._alerts[alert_name]
        alert.state = AlertState.RESOLVED
        alert.resolved_at = datetime.now(timezone.utc)

        logger.info(
            f"ALERT RESOLVED: {alert_name}",
            extra={
                "alert_name": alert_name,
                "duration_seconds": (
                    alert.resolved_at - alert.started_at
                ).total_seconds(),
            }
        )

        self._send_alert_notification(alert)

    def _send_alert_notification(self, alert: Alert):
        """
        Send alert notification to external systems.

        Args:
            alert: The alert to notify about
        """
        # This would integrate with:
        # - PagerDuty
        # - Slack
        # - Email
        # - OpsGenie
        # etc.

        # For now, just log it
        logger.info(
            f"Would send notification for alert: {alert.condition.name}",
            extra={
                "state": alert.state.value,
                "severity": alert.condition.severity.value,
            }
        )

    def get_active_alerts(self) -> List[Alert]:
        """
        Get all currently active alerts.

        Returns:
            List of firing alerts
        """
        with self._lock:
            return [
                alert for alert in self._alerts.values()
                if alert.state == AlertState.FIRING
            ]

    def get_alert_status(self) -> Dict[str, Any]:
        """
        Get a summary of alert status.

        Returns:
            Dictionary with alert summary
        """
        with self._lock:
            active = [a for a in self._alerts.values() if a.state == AlertState.FIRING]
            pending = list(self._pending_since.keys())

            return {
                "active_alerts": len(active),
                "pending_alerts": len(pending),
                "total_conditions": len(self.conditions),
                "alerts": [
                    {
                        "name": a.condition.name,
                        "severity": a.condition.severity.value,
                        "message": a.message,
                        "started_at": a.started_at.isoformat(),
                    }
                    for a in active
                ],
                "pending": pending,
            }


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def get_prometheus_rules() -> str:
    """
    Get Prometheus alerting rules configuration.

    Returns:
        YAML-formatted Prometheus alerting rules
    """
    return PROMETHEUS_ALERTING_RULES


def get_alert_documentation() -> str:
    """
    Get human-readable documentation of all alert conditions.

    Returns:
        Markdown-formatted documentation
    """
    docs = ["# Dating Coach Service Alert Conditions\n"]

    for condition in ALERT_CONDITIONS:
        docs.append(f"## {condition.name}\n")
        docs.append(f"**Description:** {condition.description}\n")
        docs.append(f"**Severity:** {condition.severity.value}\n")
        docs.append(f"**Threshold:** {condition.comparison} {condition.threshold}\n")
        docs.append(f"**Evaluation Window:** {condition.evaluation_window_seconds}s\n")
        docs.append(f"**Fire After:** {condition.for_duration_seconds}s\n")
        if condition.runbook_url:
            docs.append(f"**Runbook:** [{condition.runbook_url}]({condition.runbook_url})\n")
        docs.append("\n")

    return "\n".join(docs)


# Global alert manager instance
alert_manager = AlertManager()
