"""A/B Testing framework for algorithm variants and performance tracking."""

import numpy as np
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
import hashlib
import logging
from scipy import stats

logger = logging.getLogger(__name__)


class ExperimentStatus(Enum):
    """Experiment status enum."""
    DRAFT = "draft"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    ARCHIVED = "archived"


@dataclass
class Variant:
    """Experiment variant configuration."""
    id: str
    name: str
    description: str
    traffic_allocation: float  # 0-1, percentage of traffic
    config: Dict  # Algorithm configuration
    metrics: Dict = field(default_factory=lambda: {
        'impressions': 0,
        'likes': 0,
        'matches': 0,
        'conversations': 0,
        'response_rate': 0.0,
        'avg_conversation_length': 0.0,
        'user_satisfaction': []
    })


@dataclass
class Experiment:
    """A/B test experiment."""
    id: str
    name: str
    description: str
    hypothesis: str
    status: ExperimentStatus
    variants: List[Variant]
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    minimum_sample_size: int = 1000
    confidence_level: float = 0.95
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)


class ExperimentManager:
    """
    Manage A/B testing experiments for recommendation algorithms.

    Features:
    - Multiple concurrent experiments
    - Consistent user bucketing
    - Performance metrics tracking
    - Statistical significance testing
    - Gradual rollout support
    """

    def __init__(self):
        """Initialize experiment manager."""
        self.experiments = {}  # experiment_id -> Experiment
        self.user_assignments = {}  # user_id -> {experiment_id: variant_id}
        self.active_experiments = set()

    def create_experiment(
        self,
        experiment_id: str,
        name: str,
        description: str,
        hypothesis: str,
        variants: List[Dict],
        minimum_sample_size: int = 1000,
        confidence_level: float = 0.95
    ) -> Experiment:
        """
        Create a new A/B test experiment.

        Args:
            experiment_id: Unique experiment ID
            name: Human-readable name
            description: Detailed description
            hypothesis: What you're testing
            variants: List of variant configurations
            minimum_sample_size: Minimum users per variant
            confidence_level: Statistical confidence level

        Returns:
            Created experiment
        """
        # Create variant objects
        variant_objects = []
        total_allocation = 0.0

        for var_config in variants:
            variant = Variant(
                id=var_config['id'],
                name=var_config['name'],
                description=var_config['description'],
                traffic_allocation=var_config.get('traffic_allocation', 0.5),
                config=var_config.get('config', {})
            )
            variant_objects.append(variant)
            total_allocation += variant.traffic_allocation

        # Validate total allocation
        if not (0.99 <= total_allocation <= 1.01):
            raise ValueError(f"Traffic allocation must sum to 1.0, got {total_allocation}")

        # Create experiment
        experiment = Experiment(
            id=experiment_id,
            name=name,
            description=description,
            hypothesis=hypothesis,
            status=ExperimentStatus.DRAFT,
            variants=variant_objects,
            minimum_sample_size=minimum_sample_size,
            confidence_level=confidence_level
        )

        self.experiments[experiment_id] = experiment
        logger.info(f"Created experiment: {experiment_id} with {len(variants)} variants")

        return experiment

    def start_experiment(self, experiment_id: str):
        """Start an experiment."""
        if experiment_id not in self.experiments:
            raise ValueError(f"Experiment {experiment_id} not found")

        experiment = self.experiments[experiment_id]
        experiment.status = ExperimentStatus.RUNNING
        experiment.start_date = datetime.now()
        experiment.updated_at = datetime.now()

        self.active_experiments.add(experiment_id)
        logger.info(f"Started experiment: {experiment_id}")

    def pause_experiment(self, experiment_id: str):
        """Pause an experiment."""
        if experiment_id not in self.experiments:
            raise ValueError(f"Experiment {experiment_id} not found")

        experiment = self.experiments[experiment_id]
        experiment.status = ExperimentStatus.PAUSED
        experiment.updated_at = datetime.now()

        self.active_experiments.discard(experiment_id)
        logger.info(f"Paused experiment: {experiment_id}")

    def complete_experiment(self, experiment_id: str):
        """Complete an experiment."""
        if experiment_id not in self.experiments:
            raise ValueError(f"Experiment {experiment_id} not found")

        experiment = self.experiments[experiment_id]
        experiment.status = ExperimentStatus.COMPLETED
        experiment.end_date = datetime.now()
        experiment.updated_at = datetime.now()

        self.active_experiments.discard(experiment_id)
        logger.info(f"Completed experiment: {experiment_id}")

    def assign_variant(
        self,
        user_id: str,
        experiment_id: str
    ) -> Optional[Variant]:
        """
        Assign user to a variant using consistent hashing.

        Args:
            user_id: User ID
            experiment_id: Experiment ID

        Returns:
            Assigned variant or None if experiment not active
        """
        if experiment_id not in self.active_experiments:
            return None

        # Check if user already assigned
        if user_id in self.user_assignments:
            if experiment_id in self.user_assignments[user_id]:
                variant_id = self.user_assignments[user_id][experiment_id]
                experiment = self.experiments[experiment_id]
                return next((v for v in experiment.variants if v.id == variant_id), None)

        # Assign using consistent hashing
        experiment = self.experiments[experiment_id]
        hash_value = self._hash_user_experiment(user_id, experiment_id)

        # Determine variant based on traffic allocation
        cumulative_allocation = 0.0
        for variant in experiment.variants:
            cumulative_allocation += variant.traffic_allocation
            if hash_value <= cumulative_allocation:
                # Assign user to this variant
                if user_id not in self.user_assignments:
                    self.user_assignments[user_id] = {}

                self.user_assignments[user_id][experiment_id] = variant.id

                logger.debug(f"Assigned user {user_id} to variant {variant.id} "
                           f"in experiment {experiment_id}")

                return variant

        # Fallback to last variant
        last_variant = experiment.variants[-1]
        if user_id not in self.user_assignments:
            self.user_assignments[user_id] = {}
        self.user_assignments[user_id][experiment_id] = last_variant.id

        return last_variant

    def track_event(
        self,
        user_id: str,
        experiment_id: str,
        event_type: str,
        value: Optional[float] = None
    ):
        """
        Track an event for experiment metrics.

        Args:
            user_id: User ID
            experiment_id: Experiment ID
            event_type: Type of event (impression, like, match, etc.)
            value: Optional numeric value
        """
        if experiment_id not in self.experiments:
            return

        # Get user's assigned variant
        if user_id not in self.user_assignments:
            return

        if experiment_id not in self.user_assignments[user_id]:
            return

        variant_id = self.user_assignments[user_id][experiment_id]
        experiment = self.experiments[experiment_id]
        variant = next((v for v in experiment.variants if v.id == variant_id), None)

        if not variant:
            return

        # Update metrics
        metrics = variant.metrics

        if event_type == 'impression':
            metrics['impressions'] += 1

        elif event_type == 'like':
            metrics['likes'] += 1

        elif event_type == 'match':
            metrics['matches'] += 1

        elif event_type == 'conversation_start':
            metrics['conversations'] += 1

        elif event_type == 'message_sent':
            # Update response rate
            prev_rate = metrics['response_rate']
            total_messages = metrics.get('total_messages', 0) + 1
            metrics['total_messages'] = total_messages
            metrics['response_rate'] = (prev_rate * (total_messages - 1) + 1) / total_messages

        elif event_type == 'conversation_length' and value is not None:
            # Update average conversation length
            prev_avg = metrics['avg_conversation_length']
            convs = metrics['conversations']
            if convs > 0:
                metrics['avg_conversation_length'] = \
                    (prev_avg * (convs - 1) + value) / convs

        elif event_type == 'user_satisfaction' and value is not None:
            metrics['user_satisfaction'].append(value)

        logger.debug(f"Tracked {event_type} for user {user_id} in variant {variant_id}")

    def get_variant_for_user(
        self,
        user_id: str,
        experiment_id: str
    ) -> Optional[Variant]:
        """Get the assigned variant for a user."""
        if user_id not in self.user_assignments:
            return self.assign_variant(user_id, experiment_id)

        if experiment_id not in self.user_assignments[user_id]:
            return self.assign_variant(user_id, experiment_id)

        variant_id = self.user_assignments[user_id][experiment_id]
        experiment = self.experiments[experiment_id]

        return next((v for v in experiment.variants if v.id == variant_id), None)

    def get_experiment_results(self, experiment_id: str) -> Dict:
        """
        Get comprehensive results for an experiment.

        Args:
            experiment_id: Experiment ID

        Returns:
            Dictionary with results and statistical analysis
        """
        if experiment_id not in self.experiments:
            raise ValueError(f"Experiment {experiment_id} not found")

        experiment = self.experiments[experiment_id]

        results = {
            'experiment_id': experiment_id,
            'name': experiment.name,
            'status': experiment.status.value,
            'start_date': experiment.start_date.isoformat() if experiment.start_date else None,
            'end_date': experiment.end_date.isoformat() if experiment.end_date else None,
            'duration_days': self._calculate_duration(experiment),
            'variants': [],
            'winner': None,
            'statistical_significance': {}
        }

        # Collect metrics for each variant
        for variant in experiment.variants:
            variant_result = {
                'id': variant.id,
                'name': variant.name,
                'traffic_allocation': variant.traffic_allocation,
                'metrics': {
                    'impressions': variant.metrics['impressions'],
                    'likes': variant.metrics['likes'],
                    'matches': variant.metrics['matches'],
                    'conversations': variant.metrics['conversations'],
                    'like_rate': self._calculate_rate(
                        variant.metrics['likes'],
                        variant.metrics['impressions']
                    ),
                    'match_rate': self._calculate_rate(
                        variant.metrics['matches'],
                        variant.metrics['likes']
                    ),
                    'conversation_rate': self._calculate_rate(
                        variant.metrics['conversations'],
                        variant.metrics['matches']
                    ),
                    'response_rate': variant.metrics['response_rate'],
                    'avg_conversation_length': variant.metrics['avg_conversation_length'],
                    'avg_satisfaction': np.mean(variant.metrics['user_satisfaction']) \
                        if variant.metrics['user_satisfaction'] else 0.0
                }
            }
            results['variants'].append(variant_result)

        # Determine winner if sufficient data
        if self._has_sufficient_data(experiment):
            results['statistical_significance'] = self._calculate_statistical_significance(
                experiment
            )
            results['winner'] = self._determine_winner(experiment)
            results['recommendation'] = self._generate_recommendation(experiment)

        return results

    def _hash_user_experiment(self, user_id: str, experiment_id: str) -> float:
        """Hash user and experiment to get consistent value between 0 and 1."""
        hash_input = f"{user_id}:{experiment_id}".encode('utf-8')
        hash_output = hashlib.md5(hash_input).hexdigest()
        # Convert first 8 hex chars to float between 0 and 1
        return int(hash_output[:8], 16) / 0xffffffff

    def _calculate_duration(self, experiment: Experiment) -> Optional[int]:
        """Calculate experiment duration in days."""
        if not experiment.start_date:
            return None

        end = experiment.end_date or datetime.now()
        return (end - experiment.start_date).days

    def _calculate_rate(self, numerator: int, denominator: int) -> float:
        """Calculate rate with division by zero protection."""
        if denominator == 0:
            return 0.0
        return numerator / denominator

    def _has_sufficient_data(self, experiment: Experiment) -> bool:
        """Check if experiment has sufficient data for analysis."""
        for variant in experiment.variants:
            if variant.metrics['impressions'] < experiment.minimum_sample_size:
                return False
        return True

    def _calculate_statistical_significance(self, experiment: Experiment) -> Dict:
        """
        Calculate statistical significance between variants.

        Uses Chi-square test for categorical outcomes and t-test for continuous.
        """
        if len(experiment.variants) != 2:
            return {'error': 'Statistical significance only supported for 2 variants'}

        control = experiment.variants[0]
        treatment = experiment.variants[1]

        results = {}

        # Chi-square test for like rate
        like_contingency = [
            [control.metrics['likes'], control.metrics['impressions'] - control.metrics['likes']],
            [treatment.metrics['likes'], treatment.metrics['impressions'] - treatment.metrics['likes']]
        ]

        chi2, p_value, _, _ = stats.chi2_contingency(like_contingency)
        results['like_rate'] = {
            'chi_square': float(chi2),
            'p_value': float(p_value),
            'significant': p_value < (1 - experiment.confidence_level),
            'control_rate': self._calculate_rate(
                control.metrics['likes'],
                control.metrics['impressions']
            ),
            'treatment_rate': self._calculate_rate(
                treatment.metrics['likes'],
                treatment.metrics['impressions']
            )
        }

        # T-test for user satisfaction (if available)
        if control.metrics['user_satisfaction'] and treatment.metrics['user_satisfaction']:
            t_stat, p_value = stats.ttest_ind(
                control.metrics['user_satisfaction'],
                treatment.metrics['user_satisfaction']
            )

            results['user_satisfaction'] = {
                't_statistic': float(t_stat),
                'p_value': float(p_value),
                'significant': p_value < (1 - experiment.confidence_level),
                'control_mean': float(np.mean(control.metrics['user_satisfaction'])),
                'treatment_mean': float(np.mean(treatment.metrics['user_satisfaction']))
            }

        # Chi-square for match rate
        match_contingency = [
            [control.metrics['matches'], control.metrics['likes'] - control.metrics['matches']],
            [treatment.metrics['matches'], treatment.metrics['likes'] - treatment.metrics['matches']]
        ]

        if control.metrics['likes'] > 0 and treatment.metrics['likes'] > 0:
            chi2, p_value, _, _ = stats.chi2_contingency(match_contingency)
            results['match_rate'] = {
                'chi_square': float(chi2),
                'p_value': float(p_value),
                'significant': p_value < (1 - experiment.confidence_level),
                'control_rate': self._calculate_rate(
                    control.metrics['matches'],
                    control.metrics['likes']
                ),
                'treatment_rate': self._calculate_rate(
                    treatment.metrics['matches'],
                    treatment.metrics['likes']
                )
            }

        return results

    def _determine_winner(self, experiment: Experiment) -> Optional[Dict]:
        """Determine winning variant based on primary metric."""
        if not self._has_sufficient_data(experiment):
            return None

        # Primary metric: match rate
        best_variant = None
        best_match_rate = 0.0

        for variant in experiment.variants:
            match_rate = self._calculate_rate(
                variant.metrics['matches'],
                variant.metrics['likes']
            )

            if match_rate > best_match_rate:
                best_match_rate = match_rate
                best_variant = variant

        if not best_variant:
            return None

        # Check if winner is statistically significant
        sig_results = self._calculate_statistical_significance(experiment)

        is_significant = sig_results.get('match_rate', {}).get('significant', False)

        return {
            'variant_id': best_variant.id,
            'variant_name': best_variant.name,
            'match_rate': best_match_rate,
            'statistically_significant': is_significant,
            'confidence': 'high' if is_significant else 'low'
        }

    def _generate_recommendation(self, experiment: Experiment) -> str:
        """Generate recommendation based on experiment results."""
        winner = self._determine_winner(experiment)

        if not winner:
            return "Insufficient data to make a recommendation"

        if winner['statistically_significant']:
            return f"Roll out variant '{winner['variant_name']}' to all users. " \
                   f"It shows statistically significant improvement."
        else:
            return f"Variant '{winner['variant_name']}' is leading but not statistically " \
                   f"significant. Continue experiment or increase sample size."

    def get_active_experiments(self) -> List[Dict]:
        """Get list of active experiments."""
        active = []
        for exp_id in self.active_experiments:
            experiment = self.experiments[exp_id]
            active.append({
                'id': experiment.id,
                'name': experiment.name,
                'status': experiment.status.value,
                'start_date': experiment.start_date.isoformat() if experiment.start_date else None,
                'variants': len(experiment.variants)
            })
        return active

    def get_all_experiments(self) -> List[Dict]:
        """Get list of all experiments."""
        return [
            {
                'id': exp.id,
                'name': exp.name,
                'status': exp.status.value,
                'created_at': exp.created_at.isoformat(),
                'variants': len(exp.variants)
            }
            for exp in self.experiments.values()
        ]
