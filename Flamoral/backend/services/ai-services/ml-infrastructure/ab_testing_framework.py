"""A/B testing framework for ML models."""

import logging
from typing import Dict, Any, List, Optional, Callable
from datetime import datetime, timedelta
from enum import Enum
import hashlib
import json
import random
from dataclasses import dataclass, asdict
from collections import defaultdict
import numpy as np
from scipy import stats

logger = logging.getLogger(__name__)


class ExperimentStatus(str, Enum):
    """Experiment status."""
    DRAFT = "draft"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class VariantType(str, Enum):
    """Variant type."""
    CONTROL = "control"
    TREATMENT = "treatment"


@dataclass
class Variant:
    """Experiment variant."""
    name: str
    variant_type: VariantType
    traffic_allocation: float  # 0.0 to 1.0
    model_config: Dict[str, Any]
    description: Optional[str] = None


@dataclass
class Metric:
    """Experiment metric."""
    name: str
    metric_type: str  # conversion, numeric, count
    primary: bool = False
    minimum_detectable_effect: float = 0.05


@dataclass
class Experiment:
    """A/B test experiment."""
    experiment_id: str
    name: str
    description: str
    variants: List[Variant]
    metrics: List[Metric]
    status: ExperimentStatus
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    target_sample_size: int = 1000
    created_at: datetime = None
    updated_at: datetime = None

    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.utcnow()
        if self.updated_at is None:
            self.updated_at = datetime.utcnow()


class VariantAssigner:
    """Assigns users to experiment variants."""

    @staticmethod
    def assign_variant(
        user_id: str,
        experiment: Experiment,
        sticky: bool = True
    ) -> str:
        """
        Assign user to a variant.

        Args:
            user_id: User identifier
            experiment: Experiment configuration
            sticky: Whether assignment should be consistent

        Returns:
            Variant name
        """
        if sticky:
            # Deterministic assignment based on hash
            hash_value = int(
                hashlib.md5(f"{experiment.experiment_id}:{user_id}".encode()).hexdigest(),
                16
            )
            random_value = (hash_value % 10000) / 10000.0
        else:
            # Random assignment
            random_value = random.random()

        # Assign based on traffic allocation
        cumulative_allocation = 0.0
        for variant in experiment.variants:
            cumulative_allocation += variant.traffic_allocation
            if random_value <= cumulative_allocation:
                return variant.name

        # Fallback to control
        return experiment.variants[0].name


class MetricsCollector:
    """Collects experiment metrics."""

    def __init__(self):
        self.metrics_data: Dict[str, List[Dict[str, Any]]] = defaultdict(list)

    def record_metric(
        self,
        experiment_id: str,
        user_id: str,
        variant: str,
        metric_name: str,
        value: Any,
        timestamp: Optional[datetime] = None
    ):
        """Record a metric value."""
        if timestamp is None:
            timestamp = datetime.utcnow()

        self.metrics_data[experiment_id].append({
            "user_id": user_id,
            "variant": variant,
            "metric_name": metric_name,
            "value": value,
            "timestamp": timestamp.isoformat()
        })

    def get_metrics(
        self,
        experiment_id: str,
        variant: Optional[str] = None,
        metric_name: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Retrieve metrics."""
        metrics = self.metrics_data.get(experiment_id, [])

        if variant:
            metrics = [m for m in metrics if m['variant'] == variant]

        if metric_name:
            metrics = [m for m in metrics if m['metric_name'] == metric_name]

        return metrics


class StatisticalAnalyzer:
    """Performs statistical analysis on experiment results."""

    @staticmethod
    def analyze_conversion_metric(
        control_data: List[float],
        treatment_data: List[float],
        confidence_level: float = 0.95
    ) -> Dict[str, Any]:
        """
        Analyze conversion rate metric.

        Args:
            control_data: Binary outcomes for control (0 or 1)
            treatment_data: Binary outcomes for treatment (0 or 1)
            confidence_level: Confidence level for significance testing

        Returns:
            Analysis results
        """
        control_conversions = sum(control_data)
        control_total = len(control_data)
        treatment_conversions = sum(treatment_data)
        treatment_total = len(treatment_data)

        control_rate = control_conversions / control_total if control_total > 0 else 0
        treatment_rate = treatment_conversions / treatment_total if treatment_total > 0 else 0

        # Perform z-test for proportions
        if control_total > 0 and treatment_total > 0:
            pooled_rate = (control_conversions + treatment_conversions) / (control_total + treatment_total)
            pooled_se = np.sqrt(pooled_rate * (1 - pooled_rate) * (1/control_total + 1/treatment_total))

            if pooled_se > 0:
                z_score = (treatment_rate - control_rate) / pooled_se
                p_value = 2 * (1 - stats.norm.cdf(abs(z_score)))
            else:
                z_score = 0
                p_value = 1.0
        else:
            z_score = 0
            p_value = 1.0

        # Calculate confidence interval
        alpha = 1 - confidence_level
        z_critical = stats.norm.ppf(1 - alpha/2)

        if treatment_total > 0:
            treatment_se = np.sqrt(treatment_rate * (1 - treatment_rate) / treatment_total)
            ci_lower = treatment_rate - z_critical * treatment_se
            ci_upper = treatment_rate + z_critical * treatment_se
        else:
            ci_lower = ci_upper = 0

        # Calculate lift
        lift = ((treatment_rate - control_rate) / control_rate * 100) if control_rate > 0 else 0

        return {
            "control_rate": control_rate,
            "treatment_rate": treatment_rate,
            "lift_percent": lift,
            "p_value": p_value,
            "is_significant": p_value < (1 - confidence_level),
            "confidence_interval": {"lower": ci_lower, "upper": ci_upper},
            "sample_sizes": {"control": control_total, "treatment": treatment_total}
        }

    @staticmethod
    def analyze_numeric_metric(
        control_data: List[float],
        treatment_data: List[float],
        confidence_level: float = 0.95
    ) -> Dict[str, Any]:
        """
        Analyze numeric metric (e.g., response time, score).

        Args:
            control_data: Numeric values for control
            treatment_data: Numeric values for treatment
            confidence_level: Confidence level

        Returns:
            Analysis results
        """
        control_mean = np.mean(control_data)
        control_std = np.std(control_data, ddof=1)
        treatment_mean = np.mean(treatment_data)
        treatment_std = np.std(treatment_data, ddof=1)

        # Perform t-test
        t_stat, p_value = stats.ttest_ind(treatment_data, control_data)

        # Calculate effect size (Cohen's d)
        pooled_std = np.sqrt(((len(control_data) - 1) * control_std**2 +
                              (len(treatment_data) - 1) * treatment_std**2) /
                             (len(control_data) + len(treatment_data) - 2))

        cohens_d = (treatment_mean - control_mean) / pooled_std if pooled_std > 0 else 0

        # Calculate confidence interval for difference
        se_diff = np.sqrt(control_std**2/len(control_data) + treatment_std**2/len(treatment_data))
        alpha = 1 - confidence_level
        t_critical = stats.t.ppf(1 - alpha/2, len(control_data) + len(treatment_data) - 2)

        diff_mean = treatment_mean - control_mean
        ci_lower = diff_mean - t_critical * se_diff
        ci_upper = diff_mean + t_critical * se_diff

        # Calculate percent change
        percent_change = ((treatment_mean - control_mean) / control_mean * 100) if control_mean != 0 else 0

        return {
            "control_mean": control_mean,
            "control_std": control_std,
            "treatment_mean": treatment_mean,
            "treatment_std": treatment_std,
            "difference": diff_mean,
            "percent_change": percent_change,
            "p_value": p_value,
            "is_significant": p_value < (1 - confidence_level),
            "cohens_d": cohens_d,
            "confidence_interval": {"lower": ci_lower, "upper": ci_upper},
            "sample_sizes": {"control": len(control_data), "treatment": len(treatment_data)}
        }


class ABTestingFramework:
    """Main A/B testing framework."""

    def __init__(self):
        self.experiments: Dict[str, Experiment] = {}
        self.variant_assigner = VariantAssigner()
        self.metrics_collector = MetricsCollector()
        self.statistical_analyzer = StatisticalAnalyzer()

    async def initialize(self):
        """Initialize framework."""
        logger.info("Initializing A/B Testing Framework...")
        # Load existing experiments from storage
        await self._load_experiments()
        logger.info("A/B Testing Framework initialized successfully")

    async def close(self):
        """Cleanup resources."""
        logger.info("Closing A/B Testing Framework")
        await self._save_experiments()

    def create_experiment(
        self,
        name: str,
        description: str,
        variants: List[Dict[str, Any]],
        metrics: List[Dict[str, Any]],
        target_sample_size: int = 1000
    ) -> Experiment:
        """
        Create a new experiment.

        Args:
            name: Experiment name
            description: Experiment description
            variants: List of variant configurations
            metrics: List of metrics to track
            target_sample_size: Target sample size per variant

        Returns:
            Created experiment
        """
        experiment_id = hashlib.md5(f"{name}:{datetime.utcnow()}".encode()).hexdigest()[:16]

        # Create variant objects
        variant_objects = [
            Variant(
                name=v['name'],
                variant_type=VariantType(v.get('variant_type', 'treatment')),
                traffic_allocation=v.get('traffic_allocation', 0.5),
                model_config=v.get('model_config', {}),
                description=v.get('description')
            )
            for v in variants
        ]

        # Create metric objects
        metric_objects = [
            Metric(
                name=m['name'],
                metric_type=m.get('metric_type', 'numeric'),
                primary=m.get('primary', False),
                minimum_detectable_effect=m.get('minimum_detectable_effect', 0.05)
            )
            for m in metrics
        ]

        experiment = Experiment(
            experiment_id=experiment_id,
            name=name,
            description=description,
            variants=variant_objects,
            metrics=metric_objects,
            status=ExperimentStatus.DRAFT,
            target_sample_size=target_sample_size
        )

        self.experiments[experiment_id] = experiment

        logger.info(f"Created experiment: {experiment_id} - {name}")
        return experiment

    def start_experiment(self, experiment_id: str):
        """Start an experiment."""
        if experiment_id not in self.experiments:
            raise ValueError(f"Experiment {experiment_id} not found")

        experiment = self.experiments[experiment_id]
        experiment.status = ExperimentStatus.RUNNING
        experiment.start_date = datetime.utcnow()
        experiment.updated_at = datetime.utcnow()

        logger.info(f"Started experiment: {experiment_id}")

    def stop_experiment(self, experiment_id: str):
        """Stop an experiment."""
        if experiment_id not in self.experiments:
            raise ValueError(f"Experiment {experiment_id} not found")

        experiment = self.experiments[experiment_id]
        experiment.status = ExperimentStatus.COMPLETED
        experiment.end_date = datetime.utcnow()
        experiment.updated_at = datetime.utcnow()

        logger.info(f"Stopped experiment: {experiment_id}")

    def assign_variant(
        self,
        experiment_id: str,
        user_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        Assign user to a variant.

        Args:
            experiment_id: Experiment ID
            user_id: User ID

        Returns:
            Variant configuration or None if experiment not running
        """
        if experiment_id not in self.experiments:
            logger.warning(f"Experiment {experiment_id} not found")
            return None

        experiment = self.experiments[experiment_id]

        if experiment.status != ExperimentStatus.RUNNING:
            logger.debug(f"Experiment {experiment_id} not running")
            return None

        # Assign variant
        variant_name = self.variant_assigner.assign_variant(user_id, experiment)

        # Get variant config
        variant = next((v for v in experiment.variants if v.name == variant_name), None)

        if variant:
            return {
                "experiment_id": experiment_id,
                "variant_name": variant_name,
                "variant_type": variant.variant_type,
                "model_config": variant.model_config
            }

        return None

    def record_metric(
        self,
        experiment_id: str,
        user_id: str,
        variant: str,
        metric_name: str,
        value: Any
    ):
        """Record a metric value for the experiment."""
        self.metrics_collector.record_metric(
            experiment_id,
            user_id,
            variant,
            metric_name,
            value
        )

    def get_experiment_results(
        self,
        experiment_id: str,
        confidence_level: float = 0.95
    ) -> Dict[str, Any]:
        """
        Get experiment results with statistical analysis.

        Args:
            experiment_id: Experiment ID
            confidence_level: Confidence level for significance testing

        Returns:
            Experiment results and analysis
        """
        if experiment_id not in self.experiments:
            raise ValueError(f"Experiment {experiment_id} not found")

        experiment = self.experiments[experiment_id]
        results = {
            "experiment_id": experiment_id,
            "name": experiment.name,
            "status": experiment.status,
            "variants": {},
            "metrics_analysis": {}
        }

        # Get control variant
        control_variant = next(
            (v for v in experiment.variants if v.variant_type == VariantType.CONTROL),
            experiment.variants[0]
        )

        # Analyze each metric
        for metric in experiment.metrics:
            metric_results = {}

            # Get data for each variant
            for variant in experiment.variants:
                variant_metrics = self.metrics_collector.get_metrics(
                    experiment_id,
                    variant.name,
                    metric.name
                )

                variant_values = [m['value'] for m in variant_metrics]
                metric_results[variant.name] = {
                    "sample_size": len(variant_values),
                    "values": variant_values
                }

            # Perform statistical analysis for treatment vs control
            treatment_variants = [
                v for v in experiment.variants
                if v.variant_type == VariantType.TREATMENT
            ]

            analyses = {}
            for treatment_variant in treatment_variants:
                control_values = metric_results[control_variant.name]['values']
                treatment_values = metric_results[treatment_variant.name]['values']

                if not control_values or not treatment_values:
                    continue

                # Choose appropriate test based on metric type
                if metric.metric_type == 'conversion':
                    analysis = self.statistical_analyzer.analyze_conversion_metric(
                        control_values,
                        treatment_values,
                        confidence_level
                    )
                else:  # numeric
                    analysis = self.statistical_analyzer.analyze_numeric_metric(
                        control_values,
                        treatment_values,
                        confidence_level
                    )

                analyses[treatment_variant.name] = analysis

            results["metrics_analysis"][metric.name] = {
                "metric_type": metric.metric_type,
                "is_primary": metric.primary,
                "variant_data": metric_results,
                "statistical_analysis": analyses
            }

        # Add variant summaries
        for variant in experiment.variants:
            all_metrics = self.metrics_collector.get_metrics(
                experiment_id,
                variant.name
            )

            results["variants"][variant.name] = {
                "type": variant.variant_type,
                "traffic_allocation": variant.traffic_allocation,
                "total_users": len(set(m['user_id'] for m in all_metrics)),
                "total_events": len(all_metrics)
            }

        return results

    def get_winner(
        self,
        experiment_id: str,
        primary_metric_name: str,
        min_confidence: float = 0.95
    ) -> Optional[str]:
        """
        Determine the winning variant.

        Args:
            experiment_id: Experiment ID
            primary_metric_name: Primary metric to evaluate
            min_confidence: Minimum confidence level

        Returns:
            Winning variant name or None if no clear winner
        """
        results = self.get_experiment_results(experiment_id, min_confidence)

        if primary_metric_name not in results["metrics_analysis"]:
            return None

        metric_analysis = results["metrics_analysis"][primary_metric_name]
        statistical_analysis = metric_analysis["statistical_analysis"]

        # Find variant with significant improvement
        best_variant = None
        best_improvement = 0

        for variant_name, analysis in statistical_analysis.items():
            if analysis["is_significant"]:
                improvement = analysis.get("lift_percent", analysis.get("percent_change", 0))

                if improvement > best_improvement:
                    best_improvement = improvement
                    best_variant = variant_name

        return best_variant

    async def _load_experiments(self):
        """Load experiments from storage."""
        # In production, load from database
        try:
            with open("experiments.json", "r") as f:
                data = json.load(f)
                # Deserialize experiments
                for exp_data in data:
                    # Reconstruct experiment object
                    pass
        except FileNotFoundError:
            logger.info("No existing experiments found")

    async def _save_experiments(self):
        """Save experiments to storage."""
        # In production, save to database
        try:
            data = []
            for exp in self.experiments.values():
                # Serialize experiment
                exp_dict = asdict(exp)
                # Convert datetime objects to strings
                exp_dict['created_at'] = exp.created_at.isoformat() if exp.created_at else None
                exp_dict['updated_at'] = exp.updated_at.isoformat() if exp.updated_at else None
                exp_dict['start_date'] = exp.start_date.isoformat() if exp.start_date else None
                exp_dict['end_date'] = exp.end_date.isoformat() if exp.end_date else None
                data.append(exp_dict)

            with open("experiments.json", "w") as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save experiments: {e}")
