"""ML model monitoring and drift detection system."""

import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum
from collections import defaultdict, deque
import numpy as np
from scipy import stats
import json
from pathlib import Path

logger = logging.getLogger(__name__)


class DriftType(str, Enum):
    """Types of drift."""
    DATA_DRIFT = "data_drift"  # Input distribution change
    CONCEPT_DRIFT = "concept_drift"  # Input-output relationship change
    PREDICTION_DRIFT = "prediction_drift"  # Output distribution change


class AlertSeverity(str, Enum):
    """Alert severity levels."""
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


@dataclass
class ModelMetrics:
    """Model performance metrics."""
    model_id: str
    model_version: str
    timestamp: datetime
    predictions_count: int
    metrics: Dict[str, float]
    latency_ms: float


@dataclass
class DriftAlert:
    """Drift detection alert."""
    alert_id: str
    model_id: str
    drift_type: DriftType
    severity: AlertSeverity
    description: str
    metrics: Dict[str, float]
    timestamp: datetime
    resolved: bool = False


class DataDriftDetector:
    """Detects drift in input data distribution."""

    def __init__(self, window_size: int = 1000, significance_level: float = 0.05):
        self.window_size = window_size
        self.significance_level = significance_level
        self.reference_distributions: Dict[str, np.ndarray] = {}

    def set_reference_distribution(self, feature_name: str, data: np.ndarray):
        """Set reference distribution for a feature."""
        self.reference_distributions[feature_name] = np.array(data)

    def detect_drift(
        self,
        feature_name: str,
        current_data: np.ndarray
    ) -> Tuple[bool, float, str]:
        """
        Detect drift in feature distribution.

        Args:
            feature_name: Name of the feature
            current_data: Current data sample

        Returns:
            (has_drift, p_value, test_name)
        """
        if feature_name not in self.reference_distributions:
            logger.warning(f"No reference distribution for {feature_name}")
            return False, 1.0, "no_reference"

        reference_data = self.reference_distributions[feature_name]

        # Choose appropriate statistical test
        if self._is_categorical(current_data):
            # Chi-square test for categorical data
            has_drift, p_value = self._chi_square_test(reference_data, current_data)
            test_name = "chi_square"
        else:
            # Kolmogorov-Smirnov test for continuous data
            has_drift, p_value = self._ks_test(reference_data, current_data)
            test_name = "kolmogorov_smirnov"

        return has_drift, p_value, test_name

    def _is_categorical(self, data: np.ndarray) -> bool:
        """Check if data is categorical."""
        unique_values = len(np.unique(data))
        return unique_values < min(20, len(data) * 0.05)

    def _ks_test(
        self,
        reference: np.ndarray,
        current: np.ndarray
    ) -> Tuple[bool, float]:
        """Kolmogorov-Smirnov test for continuous distributions."""
        statistic, p_value = stats.ks_2samp(reference, current)
        has_drift = p_value < self.significance_level
        return has_drift, p_value

    def _chi_square_test(
        self,
        reference: np.ndarray,
        current: np.ndarray
    ) -> Tuple[bool, float]:
        """Chi-square test for categorical distributions."""
        # Get frequency distributions
        ref_unique, ref_counts = np.unique(reference, return_counts=True)
        curr_unique, curr_counts = np.unique(current, return_counts=True)

        # Align categories
        all_categories = np.union1d(ref_unique, curr_unique)

        ref_freq = np.zeros(len(all_categories))
        curr_freq = np.zeros(len(all_categories))

        for i, cat in enumerate(all_categories):
            ref_idx = np.where(ref_unique == cat)[0]
            if len(ref_idx) > 0:
                ref_freq[i] = ref_counts[ref_idx[0]]

            curr_idx = np.where(curr_unique == cat)[0]
            if len(curr_idx) > 0:
                curr_freq[i] = curr_counts[curr_idx[0]]

        # Normalize to probabilities
        ref_freq = ref_freq / ref_freq.sum()
        curr_freq = curr_freq / curr_freq.sum()

        # Expected frequencies
        expected_freq = ref_freq * curr_freq.sum()

        # Chi-square test
        statistic = np.sum((curr_freq - expected_freq) ** 2 / (expected_freq + 1e-10))
        df = len(all_categories) - 1
        p_value = 1 - stats.chi2.cdf(statistic, df)

        has_drift = p_value < self.significance_level
        return has_drift, p_value


class PerformanceMonitor:
    """Monitors model performance metrics over time."""

    def __init__(self, window_size: int = 100):
        self.window_size = window_size
        self.metrics_history: Dict[str, deque] = defaultdict(lambda: deque(maxlen=window_size))
        self.baselines: Dict[str, float] = {}

    def set_baseline(self, metric_name: str, value: float):
        """Set baseline value for a metric."""
        self.baselines[metric_name] = value

    def record_metric(self, metric_name: str, value: float, timestamp: Optional[datetime] = None):
        """Record a metric value."""
        if timestamp is None:
            timestamp = datetime.utcnow()

        self.metrics_history[metric_name].append({
            'value': value,
            'timestamp': timestamp
        })

    def detect_performance_degradation(
        self,
        metric_name: str,
        threshold_percent: float = 10.0
    ) -> Tuple[bool, float]:
        """
        Detect performance degradation.

        Args:
            metric_name: Name of the metric
            threshold_percent: Percentage degradation threshold

        Returns:
            (has_degraded, current_value)
        """
        if metric_name not in self.baselines:
            logger.warning(f"No baseline for {metric_name}")
            return False, 0.0

        if metric_name not in self.metrics_history or len(self.metrics_history[metric_name]) == 0:
            return False, 0.0

        baseline = self.baselines[metric_name]
        recent_values = [m['value'] for m in list(self.metrics_history[metric_name])[-10:]]
        current_value = np.mean(recent_values)

        # Calculate percentage change
        percent_change = abs((current_value - baseline) / baseline * 100)

        has_degraded = percent_change > threshold_percent

        return has_degraded, current_value

    def get_metric_statistics(self, metric_name: str) -> Dict[str, float]:
        """Get statistics for a metric."""
        if metric_name not in self.metrics_history:
            return {}

        values = [m['value'] for m in self.metrics_history[metric_name]]

        if not values:
            return {}

        return {
            'mean': float(np.mean(values)),
            'std': float(np.std(values)),
            'min': float(np.min(values)),
            'max': float(np.max(values)),
            'median': float(np.median(values)),
            'count': len(values)
        }


class PredictionMonitor:
    """Monitors prediction distributions and patterns."""

    def __init__(self, window_size: int = 1000):
        self.window_size = window_size
        self.predictions: deque = deque(maxlen=window_size)
        self.reference_distribution: Optional[np.ndarray] = None

    def set_reference_distribution(self, predictions: np.ndarray):
        """Set reference prediction distribution."""
        self.reference_distribution = np.array(predictions)

    def record_prediction(
        self,
        prediction: float,
        confidence: Optional[float] = None,
        timestamp: Optional[datetime] = None
    ):
        """Record a prediction."""
        if timestamp is None:
            timestamp = datetime.utcnow()

        self.predictions.append({
            'value': prediction,
            'confidence': confidence,
            'timestamp': timestamp
        })

    def detect_prediction_drift(self) -> Tuple[bool, float]:
        """Detect drift in prediction distribution."""
        if self.reference_distribution is None or len(self.predictions) < 100:
            return False, 1.0

        current_predictions = np.array([p['value'] for p in self.predictions])

        # Kolmogorov-Smirnov test
        statistic, p_value = stats.ks_2samp(self.reference_distribution, current_predictions)

        has_drift = p_value < 0.05
        return has_drift, p_value

    def get_prediction_statistics(self) -> Dict[str, float]:
        """Get prediction statistics."""
        if not self.predictions:
            return {}

        values = np.array([p['value'] for p in self.predictions])
        confidences = [p['confidence'] for p in self.predictions if p['confidence'] is not None]

        stats_dict = {
            'mean': float(np.mean(values)),
            'std': float(np.std(values)),
            'min': float(np.min(values)),
            'max': float(np.max(values)),
            'count': len(values)
        }

        if confidences:
            stats_dict['mean_confidence'] = float(np.mean(confidences))
            stats_dict['std_confidence'] = float(np.std(confidences))

        return stats_dict


class MLMonitoring:
    """Main ML monitoring system."""

    def __init__(
        self,
        storage_path: str = "monitoring_data",
        alert_window_hours: int = 24
    ):
        self.storage_path = Path(storage_path)
        self.storage_path.mkdir(exist_ok=True)

        self.data_drift_detector = DataDriftDetector()
        self.performance_monitor = PerformanceMonitor()
        self.prediction_monitor = PredictionMonitor()

        self.alerts: List[DriftAlert] = []
        self.alert_window_hours = alert_window_hours

        self.model_metrics_history: Dict[str, List[ModelMetrics]] = defaultdict(list)

    async def initialize(self):
        """Initialize monitoring system."""
        logger.info("Initializing ML Monitoring...")
        await self._load_state()
        logger.info("ML Monitoring initialized successfully")

    async def close(self):
        """Cleanup resources."""
        logger.info("Closing ML Monitoring")
        await self._save_state()

    def setup_model_monitoring(
        self,
        model_id: str,
        reference_data: Dict[str, np.ndarray],
        reference_predictions: np.ndarray,
        baseline_metrics: Dict[str, float]
    ):
        """
        Setup monitoring for a model.

        Args:
            model_id: Model identifier
            reference_data: Reference data for each feature
            reference_predictions: Reference prediction distribution
            baseline_metrics: Baseline performance metrics
        """
        # Set reference distributions for data drift detection
        for feature_name, data in reference_data.items():
            self.data_drift_detector.set_reference_distribution(feature_name, data)

        # Set reference predictions
        self.prediction_monitor.set_reference_distribution(reference_predictions)

        # Set baseline metrics
        for metric_name, value in baseline_metrics.items():
            self.performance_monitor.set_baseline(f"{model_id}:{metric_name}", value)

        logger.info(f"Setup monitoring for model: {model_id}")

    def log_prediction(
        self,
        model_id: str,
        model_version: str,
        features: Dict[str, Any],
        prediction: float,
        confidence: Optional[float] = None,
        latency_ms: Optional[float] = None
    ):
        """Log a model prediction."""
        timestamp = datetime.utcnow()

        # Record prediction
        self.prediction_monitor.record_prediction(prediction, confidence, timestamp)

        # Check for data drift on each feature
        for feature_name, value in features.items():
            if isinstance(value, (int, float)):
                # Only check numeric features (simplified)
                pass

    def log_performance_metrics(
        self,
        model_id: str,
        model_version: str,
        metrics: Dict[str, float],
        latency_ms: float,
        predictions_count: int = 1
    ):
        """Log model performance metrics."""
        timestamp = datetime.utcnow()

        model_metrics = ModelMetrics(
            model_id=model_id,
            model_version=model_version,
            timestamp=timestamp,
            predictions_count=predictions_count,
            metrics=metrics,
            latency_ms=latency_ms
        )

        self.model_metrics_history[model_id].append(model_metrics)

        # Record each metric for monitoring
        for metric_name, value in metrics.items():
            self.performance_monitor.record_metric(
                f"{model_id}:{metric_name}",
                value,
                timestamp
            )

    def check_drift(self, model_id: str) -> List[DriftAlert]:
        """
        Check for all types of drift.

        Args:
            model_id: Model identifier

        Returns:
            List of drift alerts
        """
        new_alerts = []

        # Check prediction drift
        has_pred_drift, p_value = self.prediction_monitor.detect_prediction_drift()
        if has_pred_drift:
            alert = self._create_alert(
                model_id,
                DriftType.PREDICTION_DRIFT,
                AlertSeverity.WARNING,
                f"Prediction distribution has drifted (p-value: {p_value:.4f})",
                {'p_value': p_value}
            )
            new_alerts.append(alert)

        # Check performance degradation
        if model_id in self.model_metrics_history:
            recent_metrics = self.model_metrics_history[model_id][-10:]
            if recent_metrics:
                for metric_name in recent_metrics[0].metrics.keys():
                    has_degraded, current_value = self.performance_monitor.detect_performance_degradation(
                        f"{model_id}:{metric_name}",
                        threshold_percent=10.0
                    )

                    if has_degraded:
                        baseline = self.performance_monitor.baselines.get(f"{model_id}:{metric_name}", 0)
                        alert = self._create_alert(
                            model_id,
                            DriftType.CONCEPT_DRIFT,
                            AlertSeverity.CRITICAL,
                            f"Performance degradation detected in {metric_name}",
                            {
                                'metric_name': metric_name,
                                'baseline': baseline,
                                'current': current_value,
                                'change_percent': abs((current_value - baseline) / baseline * 100)
                            }
                        )
                        new_alerts.append(alert)

        self.alerts.extend(new_alerts)
        return new_alerts

    def get_model_health(self, model_id: str) -> Dict[str, Any]:
        """
        Get overall health status for a model.

        Args:
            model_id: Model identifier

        Returns:
            Health status dictionary
        """
        health = {
            'model_id': model_id,
            'status': 'healthy',
            'timestamp': datetime.utcnow().isoformat(),
            'metrics': {},
            'alerts': [],
            'recommendations': []
        }

        # Get active alerts
        recent_alerts = [
            alert for alert in self.alerts
            if alert.model_id == model_id
            and not alert.resolved
            and (datetime.utcnow() - alert.timestamp).total_seconds() < self.alert_window_hours * 3600
        ]

        health['alerts'] = [
            {
                'type': alert.drift_type,
                'severity': alert.severity,
                'description': alert.description,
                'timestamp': alert.timestamp.isoformat()
            }
            for alert in recent_alerts
        ]

        # Determine overall status
        if any(a.severity == AlertSeverity.CRITICAL for a in recent_alerts):
            health['status'] = 'critical'
            health['recommendations'].append("Immediate attention required - critical issues detected")
        elif any(a.severity == AlertSeverity.WARNING for a in recent_alerts):
            health['status'] = 'warning'
            health['recommendations'].append("Monitor closely - warnings detected")

        # Get prediction statistics
        pred_stats = self.prediction_monitor.get_prediction_statistics()
        health['metrics']['predictions'] = pred_stats

        # Get performance statistics
        if model_id in self.model_metrics_history:
            recent_metrics = self.model_metrics_history[model_id][-100:]
            if recent_metrics:
                all_metrics = {}
                for metric_record in recent_metrics:
                    for metric_name, value in metric_record.metrics.items():
                        if metric_name not in all_metrics:
                            all_metrics[metric_name] = []
                        all_metrics[metric_name].append(value)

                for metric_name, values in all_metrics.items():
                    health['metrics'][metric_name] = {
                        'mean': float(np.mean(values)),
                        'std': float(np.std(values)),
                        'latest': float(values[-1])
                    }

        return health

    def get_monitoring_dashboard(self) -> Dict[str, Any]:
        """Get comprehensive monitoring dashboard data."""
        dashboard = {
            'timestamp': datetime.utcnow().isoformat(),
            'models': {},
            'global_alerts': [],
            'statistics': {}
        }

        # Get data for each monitored model
        for model_id in self.model_metrics_history.keys():
            dashboard['models'][model_id] = self.get_model_health(model_id)

        # Global statistics
        total_alerts = len([a for a in self.alerts if not a.resolved])
        critical_alerts = len([a for a in self.alerts if not a.resolved and a.severity == AlertSeverity.CRITICAL])

        dashboard['statistics'] = {
            'total_alerts': total_alerts,
            'critical_alerts': critical_alerts,
            'models_monitored': len(self.model_metrics_history)
        }

        return dashboard

    def _create_alert(
        self,
        model_id: str,
        drift_type: DriftType,
        severity: AlertSeverity,
        description: str,
        metrics: Dict[str, float]
    ) -> DriftAlert:
        """Create a drift alert."""
        import hashlib
        alert_id = hashlib.md5(
            f"{model_id}:{drift_type}:{datetime.utcnow()}".encode()
        ).hexdigest()[:16]

        alert = DriftAlert(
            alert_id=alert_id,
            model_id=model_id,
            drift_type=drift_type,
            severity=severity,
            description=description,
            metrics=metrics,
            timestamp=datetime.utcnow()
        )

        logger.warning(f"Alert created: {description}")
        return alert

    async def _save_state(self):
        """Save monitoring state."""
        state_file = self.storage_path / "monitoring_state.json"

        state = {
            'alerts': [
                {
                    'alert_id': a.alert_id,
                    'model_id': a.model_id,
                    'drift_type': a.drift_type,
                    'severity': a.severity,
                    'description': a.description,
                    'metrics': a.metrics,
                    'timestamp': a.timestamp.isoformat(),
                    'resolved': a.resolved
                }
                for a in self.alerts
            ],
            'baselines': self.performance_monitor.baselines
        }

        with open(state_file, 'w') as f:
            json.dump(state, f, indent=2)

        logger.info("Saved monitoring state")

    async def _load_state(self):
        """Load monitoring state."""
        state_file = self.storage_path / "monitoring_state.json"

        if state_file.exists():
            with open(state_file, 'r') as f:
                state = json.load(f)

                # Load alerts
                self.alerts = [
                    DriftAlert(
                        alert_id=a['alert_id'],
                        model_id=a['model_id'],
                        drift_type=DriftType(a['drift_type']),
                        severity=AlertSeverity(a['severity']),
                        description=a['description'],
                        metrics=a['metrics'],
                        timestamp=datetime.fromisoformat(a['timestamp']),
                        resolved=a['resolved']
                    )
                    for a in state.get('alerts', [])
                ]

                # Load baselines
                self.performance_monitor.baselines = state.get('baselines', {})

            logger.info("Loaded monitoring state")
