"""ML model training pipelines with MLOps best practices."""

import logging
from typing import Dict, Any, List, Optional, Callable, Tuple
from datetime import datetime
from pathlib import Path
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
import torch.optim as optim
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
import json
import pickle
from dataclasses import dataclass, asdict
from enum import Enum

logger = logging.getLogger(__name__)


class ModelType(str, Enum):
    """Model types."""
    COMPATIBILITY = "compatibility"
    FRAUD_DETECTION = "fraud_detection"
    ATTRACTIVENESS = "attractiveness"
    USER_CLUSTERING = "user_clustering"


class TrainingStatus(str, Enum):
    """Training status."""
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


@dataclass
class TrainingConfig:
    """Training configuration."""
    model_type: ModelType
    model_version: str
    batch_size: int = 32
    learning_rate: float = 0.001
    epochs: int = 10
    validation_split: float = 0.2
    early_stopping_patience: int = 3
    optimizer: str = "adam"
    loss_function: str = "mse"
    use_gpu: bool = True
    checkpoint_frequency: int = 1
    hyperparameters: Optional[Dict[str, Any]] = None


@dataclass
class TrainingMetrics:
    """Training metrics."""
    epoch: int
    train_loss: float
    val_loss: float
    train_metrics: Dict[str, float]
    val_metrics: Dict[str, float]
    timestamp: datetime


@dataclass
class TrainingJob:
    """Training job."""
    job_id: str
    model_type: ModelType
    config: TrainingConfig
    status: TrainingStatus
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    metrics_history: List[TrainingMetrics] = None
    best_model_path: Optional[str] = None
    error_message: Optional[str] = None

    def __post_init__(self):
        if self.metrics_history is None:
            self.metrics_history = []


class CustomDataset(Dataset):
    """Custom PyTorch dataset."""

    def __init__(self, features: np.ndarray, labels: np.ndarray):
        self.features = torch.FloatTensor(features)
        self.labels = torch.FloatTensor(labels)

    def __len__(self):
        return len(self.features)

    def __getitem__(self, idx):
        return self.features[idx], self.labels[idx]


class ModelTrainer:
    """Base model trainer."""

    def __init__(self, config: TrainingConfig):
        self.config = config
        self.device = torch.device("cuda" if config.use_gpu and torch.cuda.is_available() else "cpu")
        self.model: Optional[nn.Module] = None
        self.optimizer: Optional[optim.Optimizer] = None
        self.criterion: Optional[nn.Module] = None
        self.best_val_loss = float('inf')
        self.patience_counter = 0

    def prepare_data(
        self,
        features: np.ndarray,
        labels: np.ndarray
    ) -> Tuple[DataLoader, DataLoader]:
        """Prepare training and validation data loaders."""
        # Split data
        X_train, X_val, y_train, y_val = train_test_split(
            features,
            labels,
            test_size=self.config.validation_split,
            random_state=42
        )

        # Create datasets
        train_dataset = CustomDataset(X_train, y_train)
        val_dataset = CustomDataset(X_val, y_val)

        # Create data loaders
        train_loader = DataLoader(
            train_dataset,
            batch_size=self.config.batch_size,
            shuffle=True
        )

        val_loader = DataLoader(
            val_dataset,
            batch_size=self.config.batch_size,
            shuffle=False
        )

        return train_loader, val_loader

    def setup_model(self, model: nn.Module):
        """Setup model, optimizer, and loss function."""
        self.model = model.to(self.device)

        # Setup optimizer
        if self.config.optimizer == "adam":
            self.optimizer = optim.Adam(self.model.parameters(), lr=self.config.learning_rate)
        elif self.config.optimizer == "sgd":
            self.optimizer = optim.SGD(self.model.parameters(), lr=self.config.learning_rate)
        else:
            raise ValueError(f"Unknown optimizer: {self.config.optimizer}")

        # Setup loss function
        if self.config.loss_function == "mse":
            self.criterion = nn.MSELoss()
        elif self.config.loss_function == "bce":
            self.criterion = nn.BCELoss()
        elif self.config.loss_function == "cross_entropy":
            self.criterion = nn.CrossEntropyLoss()
        else:
            raise ValueError(f"Unknown loss function: {self.config.loss_function}")

    def train_epoch(self, train_loader: DataLoader) -> Tuple[float, Dict[str, float]]:
        """Train for one epoch."""
        self.model.train()
        total_loss = 0
        all_predictions = []
        all_labels = []

        for batch_features, batch_labels in train_loader:
            batch_features = batch_features.to(self.device)
            batch_labels = batch_labels.to(self.device)

            # Forward pass
            self.optimizer.zero_grad()
            outputs = self.model(batch_features)

            # Handle different output shapes
            if outputs.shape != batch_labels.shape:
                batch_labels = batch_labels.view(-1, 1)

            loss = self.criterion(outputs, batch_labels)

            # Backward pass
            loss.backward()
            self.optimizer.step()

            total_loss += loss.item()

            # Store predictions for metrics
            all_predictions.extend(outputs.detach().cpu().numpy())
            all_labels.extend(batch_labels.detach().cpu().numpy())

        avg_loss = total_loss / len(train_loader)
        metrics = self.calculate_metrics(
            np.array(all_predictions),
            np.array(all_labels)
        )

        return avg_loss, metrics

    def validate(self, val_loader: DataLoader) -> Tuple[float, Dict[str, float]]:
        """Validate model."""
        self.model.eval()
        total_loss = 0
        all_predictions = []
        all_labels = []

        with torch.no_grad():
            for batch_features, batch_labels in val_loader:
                batch_features = batch_features.to(self.device)
                batch_labels = batch_labels.to(self.device)

                outputs = self.model(batch_features)

                if outputs.shape != batch_labels.shape:
                    batch_labels = batch_labels.view(-1, 1)

                loss = self.criterion(outputs, batch_labels)
                total_loss += loss.item()

                all_predictions.extend(outputs.cpu().numpy())
                all_labels.extend(batch_labels.cpu().numpy())

        avg_loss = total_loss / len(val_loader)
        metrics = self.calculate_metrics(
            np.array(all_predictions),
            np.array(all_labels)
        )

        return avg_loss, metrics

    def calculate_metrics(
        self,
        predictions: np.ndarray,
        labels: np.ndarray
    ) -> Dict[str, float]:
        """Calculate evaluation metrics."""
        # Flatten arrays
        predictions = predictions.flatten()
        labels = labels.flatten()

        metrics = {}

        # MSE and MAE
        metrics['mse'] = float(np.mean((predictions - labels) ** 2))
        metrics['mae'] = float(np.mean(np.abs(predictions - labels)))
        metrics['rmse'] = float(np.sqrt(metrics['mse']))

        # For binary classification
        if self.config.loss_function == "bce":
            binary_predictions = (predictions > 0.5).astype(int)
            binary_labels = (labels > 0.5).astype(int)

            metrics['accuracy'] = float(accuracy_score(binary_labels, binary_predictions))
            metrics['precision'] = float(precision_score(binary_labels, binary_predictions, zero_division=0))
            metrics['recall'] = float(recall_score(binary_labels, binary_predictions, zero_division=0))
            metrics['f1'] = float(f1_score(binary_labels, binary_predictions, zero_division=0))

        return metrics

    def should_stop_early(self, val_loss: float) -> bool:
        """Check if early stopping criteria met."""
        if val_loss < self.best_val_loss:
            self.best_val_loss = val_loss
            self.patience_counter = 0
            return False
        else:
            self.patience_counter += 1
            return self.patience_counter >= self.config.early_stopping_patience

    def save_checkpoint(self, epoch: int, path: str):
        """Save model checkpoint."""
        checkpoint = {
            'epoch': epoch,
            'model_state_dict': self.model.state_dict(),
            'optimizer_state_dict': self.optimizer.state_dict(),
            'best_val_loss': self.best_val_loss,
            'config': asdict(self.config)
        }
        torch.save(checkpoint, path)
        logger.info(f"Saved checkpoint to {path}")

    def load_checkpoint(self, path: str):
        """Load model checkpoint."""
        checkpoint = torch.load(path, map_location=self.device)
        self.model.load_state_dict(checkpoint['model_state_dict'])
        self.optimizer.load_state_dict(checkpoint['optimizer_state_dict'])
        self.best_val_loss = checkpoint['best_val_loss']
        logger.info(f"Loaded checkpoint from {path}")


class TrainingPipeline:
    """Main training pipeline orchestrator."""

    def __init__(self, base_model_dir: str = "models"):
        self.base_model_dir = Path(base_model_dir)
        self.base_model_dir.mkdir(exist_ok=True)
        self.jobs: Dict[str, TrainingJob] = {}

    async def initialize(self):
        """Initialize training pipeline."""
        logger.info("Initializing Training Pipeline...")
        logger.info("Training Pipeline initialized successfully")

    async def close(self):
        """Cleanup resources."""
        logger.info("Closing Training Pipeline")

    def create_training_job(
        self,
        model_type: ModelType,
        config: TrainingConfig,
        job_id: Optional[str] = None
    ) -> TrainingJob:
        """Create a new training job."""
        if job_id is None:
            import uuid
            job_id = str(uuid.uuid4())

        job = TrainingJob(
            job_id=job_id,
            model_type=model_type,
            config=config,
            status=TrainingStatus.QUEUED
        )

        self.jobs[job_id] = job
        logger.info(f"Created training job: {job_id}")

        return job

    async def train_model(
        self,
        job_id: str,
        model: nn.Module,
        train_data: np.ndarray,
        train_labels: np.ndarray,
        callbacks: Optional[List[Callable]] = None
    ) -> TrainingJob:
        """
        Train a model.

        Args:
            job_id: Training job ID
            model: Model to train
            train_data: Training features
            train_labels: Training labels
            callbacks: Optional callback functions

        Returns:
            Updated training job
        """
        if job_id not in self.jobs:
            raise ValueError(f"Job {job_id} not found")

        job = self.jobs[job_id]
        job.status = TrainingStatus.RUNNING
        job.start_time = datetime.utcnow()

        try:
            # Create trainer
            trainer = ModelTrainer(job.config)
            trainer.setup_model(model)

            # Prepare data
            train_loader, val_loader = trainer.prepare_data(train_data, train_labels)

            # Create model directory
            model_dir = self.base_model_dir / job.model_type / job.config.model_version
            model_dir.mkdir(parents=True, exist_ok=True)

            # Training loop
            for epoch in range(job.config.epochs):
                # Train
                train_loss, train_metrics = trainer.train_epoch(train_loader)

                # Validate
                val_loss, val_metrics = trainer.validate(val_loader)

                # Record metrics
                metrics = TrainingMetrics(
                    epoch=epoch,
                    train_loss=train_loss,
                    val_loss=val_loss,
                    train_metrics=train_metrics,
                    val_metrics=val_metrics,
                    timestamp=datetime.utcnow()
                )
                job.metrics_history.append(metrics)

                logger.info(
                    f"Epoch {epoch+1}/{job.config.epochs} - "
                    f"Train Loss: {train_loss:.4f}, Val Loss: {val_loss:.4f}"
                )

                # Save checkpoint
                if (epoch + 1) % job.config.checkpoint_frequency == 0:
                    checkpoint_path = model_dir / f"checkpoint_epoch_{epoch+1}.pth"
                    trainer.save_checkpoint(epoch, str(checkpoint_path))

                # Check early stopping
                if trainer.should_stop_early(val_loss):
                    logger.info(f"Early stopping triggered at epoch {epoch+1}")
                    break

                # Execute callbacks
                if callbacks:
                    for callback in callbacks:
                        callback(job, metrics)

            # Save final model
            final_model_path = model_dir / "model.pth"
            trainer.save_checkpoint(job.config.epochs, str(final_model_path))
            job.best_model_path = str(final_model_path)

            # Save training metadata
            metadata_path = model_dir / "training_metadata.json"
            self._save_training_metadata(job, metadata_path)

            job.status = TrainingStatus.COMPLETED
            job.end_time = datetime.utcnow()

            logger.info(f"Training job {job_id} completed successfully")

        except Exception as e:
            logger.error(f"Training job {job_id} failed: {e}", exc_info=True)
            job.status = TrainingStatus.FAILED
            job.error_message = str(e)
            job.end_time = datetime.utcnow()

        return job

    def get_job_status(self, job_id: str) -> Optional[TrainingJob]:
        """Get training job status."""
        return self.jobs.get(job_id)

    def get_training_metrics(self, job_id: str) -> List[TrainingMetrics]:
        """Get training metrics history."""
        job = self.jobs.get(job_id)
        return job.metrics_history if job else []

    def _save_training_metadata(self, job: TrainingJob, path: Path):
        """Save training metadata."""
        metadata = {
            "job_id": job.job_id,
            "model_type": job.model_type,
            "model_version": job.config.model_version,
            "config": asdict(job.config),
            "status": job.status,
            "start_time": job.start_time.isoformat() if job.start_time else None,
            "end_time": job.end_time.isoformat() if job.end_time else None,
            "final_metrics": {
                "train_loss": job.metrics_history[-1].train_loss if job.metrics_history else None,
                "val_loss": job.metrics_history[-1].val_loss if job.metrics_history else None,
                "train_metrics": job.metrics_history[-1].train_metrics if job.metrics_history else {},
                "val_metrics": job.metrics_history[-1].val_metrics if job.metrics_history else {}
            }
        }

        with open(path, 'w') as f:
            json.dump(metadata, f, indent=2)


class DataPipeline:
    """Data preprocessing and feature engineering pipeline."""

    def __init__(self):
        self.scalers: Dict[str, Any] = {}
        self.encoders: Dict[str, Any] = {}

    def preprocess_features(
        self,
        data: List[Dict[str, Any]],
        feature_config: Dict[str, Any]
    ) -> np.ndarray:
        """Preprocess raw data into features."""
        features = []

        for item in data:
            feature_vector = []

            for feature_name, feature_type in feature_config.items():
                value = item.get(feature_name, 0)

                if feature_type == "numeric":
                    feature_vector.append(float(value))
                elif feature_type == "categorical":
                    # One-hot encoding
                    encoded = self._encode_categorical(feature_name, value)
                    feature_vector.extend(encoded)

            features.append(feature_vector)

        return np.array(features)

    def _encode_categorical(self, feature_name: str, value: Any) -> List[float]:
        """Encode categorical feature."""
        if feature_name not in self.encoders:
            # Initialize encoder
            self.encoders[feature_name] = {}

        encoder = self.encoders[feature_name]

        if value not in encoder:
            encoder[value] = len(encoder)

        # Create one-hot vector
        one_hot = [0.0] * len(encoder)
        one_hot[encoder[value]] = 1.0

        return one_hot

    def save_preprocessors(self, path: str):
        """Save preprocessors."""
        with open(path, 'wb') as f:
            pickle.dump({
                'scalers': self.scalers,
                'encoders': self.encoders
            }, f)

    def load_preprocessors(self, path: str):
        """Load preprocessors."""
        with open(path, 'rb') as f:
            data = pickle.load(f)
            self.scalers = data['scalers']
            self.encoders = data['encoders']
