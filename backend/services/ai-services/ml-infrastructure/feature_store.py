"""Feature store for ML model features with versioning and caching."""

import logging
from typing import Dict, Any, List, Optional, Callable
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum
import json
import pickle
import hashlib
from collections import defaultdict
import numpy as np
import redis
from pathlib import Path

logger = logging.getLogger(__name__)


class FeatureType(str, Enum):
    """Feature data types."""
    NUMERIC = "numeric"
    CATEGORICAL = "categorical"
    BINARY = "binary"
    EMBEDDING = "embedding"
    TEXT = "text"


class FeatureStorageType(str, Enum):
    """Feature storage types."""
    ONLINE = "online"  # Real-time serving
    OFFLINE = "offline"  # Batch processing
    BOTH = "both"


@dataclass
class FeatureDefinition:
    """Feature definition."""
    name: str
    feature_type: FeatureType
    storage_type: FeatureStorageType
    description: str
    source: str  # Data source
    transformation: Optional[str] = None  # Transformation logic
    version: int = 1
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.utcnow()
        if self.updated_at is None:
            self.updated_at = datetime.utcnow()


@dataclass
class FeatureGroup:
    """Group of related features."""
    name: str
    features: List[str]  # Feature names
    entity_type: str  # user, match, conversation, etc.
    description: str
    version: int = 1


class FeatureTransformer:
    """Transforms raw data into features."""

    @staticmethod
    def transform_numeric(value: Any) -> float:
        """Transform to numeric feature."""
        try:
            return float(value)
        except (ValueError, TypeError):
            return 0.0

    @staticmethod
    def transform_categorical(
        value: Any,
        categories: Optional[List[str]] = None
    ) -> List[float]:
        """Transform to one-hot encoded categorical."""
        if categories is None:
            categories = []

        one_hot = [0.0] * len(categories)

        try:
            idx = categories.index(str(value))
            one_hot[idx] = 1.0
        except ValueError:
            pass

        return one_hot

    @staticmethod
    def transform_binary(value: Any) -> float:
        """Transform to binary feature."""
        if isinstance(value, bool):
            return 1.0 if value else 0.0
        if isinstance(value, (int, float)):
            return 1.0 if value > 0 else 0.0
        if isinstance(value, str):
            return 1.0 if value.lower() in ['true', 'yes', '1'] else 0.0
        return 0.0

    @staticmethod
    def normalize(value: float, min_val: float, max_val: float) -> float:
        """Min-max normalization."""
        if max_val - min_val == 0:
            return 0.0
        return (value - min_val) / (max_val - min_val)

    @staticmethod
    def standardize(value: float, mean: float, std: float) -> float:
        """Z-score standardization."""
        if std == 0:
            return 0.0
        return (value - mean) / std


class OnlineFeatureStore:
    """Online feature store with Redis backend for real-time serving."""

    def __init__(self, redis_client: Optional[redis.Redis] = None):
        self.redis_client = redis_client
        self.local_cache: Dict[str, Any] = {}
        self.cache_ttl = 3600  # 1 hour

    def set_feature(
        self,
        entity_id: str,
        feature_name: str,
        value: Any,
        ttl: Optional[int] = None
    ):
        """Set a feature value."""
        key = self._make_key(entity_id, feature_name)

        if self.redis_client:
            ttl = ttl or self.cache_ttl
            self.redis_client.setex(
                key,
                ttl,
                json.dumps(value)
            )
        else:
            self.local_cache[key] = {
                'value': value,
                'timestamp': datetime.utcnow()
            }

    def get_feature(
        self,
        entity_id: str,
        feature_name: str
    ) -> Optional[Any]:
        """Get a feature value."""
        key = self._make_key(entity_id, feature_name)

        if self.redis_client:
            value = self.redis_client.get(key)
            if value:
                return json.loads(value)
        else:
            cached = self.local_cache.get(key)
            if cached:
                # Check if cache is still valid
                if (datetime.utcnow() - cached['timestamp']).seconds < self.cache_ttl:
                    return cached['value']

        return None

    def get_features(
        self,
        entity_id: str,
        feature_names: List[str]
    ) -> Dict[str, Any]:
        """Get multiple features."""
        features = {}

        for feature_name in feature_names:
            value = self.get_feature(entity_id, feature_name)
            if value is not None:
                features[feature_name] = value

        return features

    def delete_feature(self, entity_id: str, feature_name: str):
        """Delete a feature."""
        key = self._make_key(entity_id, feature_name)

        if self.redis_client:
            self.redis_client.delete(key)
        else:
            self.local_cache.pop(key, None)

    def _make_key(self, entity_id: str, feature_name: str) -> str:
        """Create cache key."""
        return f"feature:{entity_id}:{feature_name}"


class OfflineFeatureStore:
    """Offline feature store for batch processing."""

    def __init__(self, storage_path: str = "feature_store"):
        self.storage_path = Path(storage_path)
        self.storage_path.mkdir(exist_ok=True)
        self.features: Dict[str, Dict[str, Any]] = defaultdict(dict)

    def set_features(
        self,
        entity_id: str,
        features: Dict[str, Any],
        timestamp: Optional[datetime] = None
    ):
        """Set multiple features for an entity."""
        if timestamp is None:
            timestamp = datetime.utcnow()

        self.features[entity_id].update({
            'features': features,
            'timestamp': timestamp.isoformat()
        })

    def get_features(
        self,
        entity_id: str,
        feature_names: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Get features for an entity."""
        entity_data = self.features.get(entity_id, {})
        all_features = entity_data.get('features', {})

        if feature_names:
            return {k: v for k, v in all_features.items() if k in feature_names}

        return all_features

    def get_batch_features(
        self,
        entity_ids: List[str],
        feature_names: Optional[List[str]] = None
    ) -> Dict[str, Dict[str, Any]]:
        """Get features for multiple entities."""
        batch_features = {}

        for entity_id in entity_ids:
            features = self.get_features(entity_id, feature_names)
            if features:
                batch_features[entity_id] = features

        return batch_features

    def save_to_disk(self):
        """Save features to disk."""
        file_path = self.storage_path / "features.pkl"
        with open(file_path, 'wb') as f:
            pickle.dump(dict(self.features), f)
        logger.info(f"Saved features to {file_path}")

    def load_from_disk(self):
        """Load features from disk."""
        file_path = self.storage_path / "features.pkl"
        if file_path.exists():
            with open(file_path, 'rb') as f:
                self.features = defaultdict(dict, pickle.load(f))
            logger.info(f"Loaded features from {file_path}")


class FeatureStore:
    """Main feature store combining online and offline storage."""

    def __init__(
        self,
        redis_client: Optional[redis.Redis] = None,
        storage_path: str = "feature_store"
    ):
        self.online_store = OnlineFeatureStore(redis_client)
        self.offline_store = OfflineFeatureStore(storage_path)
        self.feature_definitions: Dict[str, FeatureDefinition] = {}
        self.feature_groups: Dict[str, FeatureGroup] = {}
        self.transformer = FeatureTransformer()

    async def initialize(self):
        """Initialize feature store."""
        logger.info("Initializing Feature Store...")
        self.offline_store.load_from_disk()
        await self._load_definitions()
        logger.info("Feature Store initialized successfully")

    async def close(self):
        """Cleanup resources."""
        logger.info("Closing Feature Store")
        self.offline_store.save_to_disk()
        await self._save_definitions()

    def register_feature(self, feature_def: FeatureDefinition):
        """Register a feature definition."""
        self.feature_definitions[feature_def.name] = feature_def
        logger.info(f"Registered feature: {feature_def.name}")

    def register_feature_group(self, group: FeatureGroup):
        """Register a feature group."""
        self.feature_groups[group.name] = group
        logger.info(f"Registered feature group: {group.name}")

    def compute_and_store_feature(
        self,
        entity_id: str,
        feature_name: str,
        raw_data: Any,
        storage_type: FeatureStorageType = FeatureStorageType.BOTH
    ):
        """Compute feature from raw data and store it."""
        if feature_name not in self.feature_definitions:
            raise ValueError(f"Feature {feature_name} not defined")

        feature_def = self.feature_definitions[feature_name]

        # Transform raw data to feature
        feature_value = self._transform_feature(raw_data, feature_def)

        # Store based on storage type
        if storage_type in [FeatureStorageType.ONLINE, FeatureStorageType.BOTH]:
            self.online_store.set_feature(entity_id, feature_name, feature_value)

        if storage_type in [FeatureStorageType.OFFLINE, FeatureStorageType.BOTH]:
            current_features = self.offline_store.get_features(entity_id) or {}
            current_features[feature_name] = feature_value
            self.offline_store.set_features(entity_id, current_features)

    def get_online_features(
        self,
        entity_id: str,
        feature_names: List[str]
    ) -> Dict[str, Any]:
        """Get features from online store."""
        return self.online_store.get_features(entity_id, feature_names)

    def get_offline_features(
        self,
        entity_id: str,
        feature_names: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Get features from offline store."""
        return self.offline_store.get_features(entity_id, feature_names)

    def get_feature_group(
        self,
        entity_id: str,
        group_name: str,
        online: bool = True
    ) -> Dict[str, Any]:
        """Get all features in a feature group."""
        if group_name not in self.feature_groups:
            raise ValueError(f"Feature group {group_name} not found")

        group = self.feature_groups[group_name]

        if online:
            return self.online_store.get_features(entity_id, group.features)
        else:
            return self.offline_store.get_features(entity_id, group.features)

    def materialize_features(
        self,
        entity_ids: List[str],
        feature_names: List[str],
        output_format: str = "dict"
    ) -> Any:
        """
        Materialize features for batch processing.

        Args:
            entity_ids: List of entity IDs
            feature_names: List of feature names
            output_format: Output format (dict, numpy, dataframe)

        Returns:
            Materialized features
        """
        batch_features = self.offline_store.get_batch_features(entity_ids, feature_names)

        if output_format == "dict":
            return batch_features

        elif output_format == "numpy":
            # Convert to numpy array
            feature_matrix = []
            for entity_id in entity_ids:
                features = batch_features.get(entity_id, {})
                row = [features.get(name, 0.0) for name in feature_names]
                feature_matrix.append(row)
            return np.array(feature_matrix)

        elif output_format == "dataframe":
            # Convert to pandas DataFrame
            try:
                import pandas as pd
                df_data = []
                for entity_id in entity_ids:
                    features = batch_features.get(entity_id, {})
                    row = {'entity_id': entity_id}
                    row.update(features)
                    df_data.append(row)
                return pd.DataFrame(df_data)
            except ImportError:
                logger.warning("Pandas not available, returning dict")
                return batch_features

        else:
            raise ValueError(f"Unknown output format: {output_format}")

    def _transform_feature(
        self,
        raw_data: Any,
        feature_def: FeatureDefinition
    ) -> Any:
        """Transform raw data based on feature definition."""
        if feature_def.feature_type == FeatureType.NUMERIC:
            return self.transformer.transform_numeric(raw_data)

        elif feature_def.feature_type == FeatureType.BINARY:
            return self.transformer.transform_binary(raw_data)

        elif feature_def.feature_type == FeatureType.CATEGORICAL:
            # Would need category list from somewhere
            return raw_data

        elif feature_def.feature_type == FeatureType.EMBEDDING:
            # Return as-is, assuming it's already an embedding
            return raw_data

        elif feature_def.feature_type == FeatureType.TEXT:
            return str(raw_data)

        else:
            return raw_data

    async def _load_definitions(self):
        """Load feature definitions."""
        definitions_file = Path("feature_store") / "definitions.json"
        if definitions_file.exists():
            with open(definitions_file, 'r') as f:
                data = json.load(f)

                for feature_data in data.get('features', []):
                    feature_def = FeatureDefinition(
                        name=feature_data['name'],
                        feature_type=FeatureType(feature_data['feature_type']),
                        storage_type=FeatureStorageType(feature_data['storage_type']),
                        description=feature_data['description'],
                        source=feature_data['source'],
                        transformation=feature_data.get('transformation'),
                        version=feature_data.get('version', 1)
                    )
                    self.feature_definitions[feature_def.name] = feature_def

                for group_data in data.get('groups', []):
                    group = FeatureGroup(
                        name=group_data['name'],
                        features=group_data['features'],
                        entity_type=group_data['entity_type'],
                        description=group_data['description'],
                        version=group_data.get('version', 1)
                    )
                    self.feature_groups[group.name] = group

            logger.info("Loaded feature definitions")

    async def _save_definitions(self):
        """Save feature definitions."""
        definitions_file = Path("feature_store") / "definitions.json"
        definitions_file.parent.mkdir(exist_ok=True)

        data = {
            'features': [
                {
                    'name': f.name,
                    'feature_type': f.feature_type,
                    'storage_type': f.storage_type,
                    'description': f.description,
                    'source': f.source,
                    'transformation': f.transformation,
                    'version': f.version
                }
                for f in self.feature_definitions.values()
            ],
            'groups': [
                {
                    'name': g.name,
                    'features': g.features,
                    'entity_type': g.entity_type,
                    'description': g.description,
                    'version': g.version
                }
                for g in self.feature_groups.values()
            ]
        }

        with open(definitions_file, 'w') as f:
            json.dump(data, f, indent=2)

        logger.info("Saved feature definitions")
