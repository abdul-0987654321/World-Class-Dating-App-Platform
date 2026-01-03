"""EfficientNet-based deepfake detection model."""

import logging
from typing import Optional, Tuple
from pathlib import Path

import torch
import torch.nn as nn
import torch.nn.functional as F
import timm
import numpy as np
from PIL import Image
from torchvision import transforms

logger = logging.getLogger(__name__)


class EfficientNetDeepfakeDetector(nn.Module):
    """
    EfficientNet-B4 based deepfake detector.

    Fine-tuned for detecting face forgeries including:
    - Deepfakes (face swaps)
    - Face2Face reenactment
    - FaceSwap
    - NeuralTextures
    - GAN-generated faces (StyleGAN, etc.)
    """

    def __init__(
        self,
        model_name: str = "efficientnet_b4",
        num_classes: int = 2,  # Real vs Fake
        pretrained: bool = True,
        dropout_rate: float = 0.3,
    ):
        super().__init__()
        self.model_name = model_name
        self.num_classes = num_classes

        # Load pre-trained EfficientNet backbone
        self.backbone = timm.create_model(
            model_name,
            pretrained=pretrained,
            num_classes=0,  # Remove classifier
            global_pool="avg",
        )

        # Get feature dimension
        self.feature_dim = self.backbone.num_features

        # Custom classifier for deepfake detection
        self.classifier = nn.Sequential(
            nn.Dropout(dropout_rate),
            nn.Linear(self.feature_dim, 512),
            nn.ReLU(inplace=True),
            nn.BatchNorm1d(512),
            nn.Dropout(dropout_rate),
            nn.Linear(512, 128),
            nn.ReLU(inplace=True),
            nn.BatchNorm1d(128),
            nn.Linear(128, num_classes),
        )

        # Attention module for focusing on face regions
        self.attention = nn.Sequential(
            nn.Linear(self.feature_dim, 256),
            nn.Tanh(),
            nn.Linear(256, 1),
            nn.Sigmoid(),
        )

        # Image preprocessing
        self.transform = transforms.Compose([
            transforms.Resize((380, 380)),  # EfficientNet-B4 input size
            transforms.CenterCrop((380, 380)),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225]
            ),
        ])

        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    def forward(self, x: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        """
        Forward pass.

        Args:
            x: Input tensor of shape (B, C, H, W)

        Returns:
            Tuple of (logits, attention_weights)
        """
        # Extract features
        features = self.backbone(x)

        # Apply attention
        attention_weights = self.attention(features)
        attended_features = features * attention_weights

        # Classify
        logits = self.classifier(attended_features)

        return logits, attention_weights

    def predict_proba(self, x: torch.Tensor) -> np.ndarray:
        """
        Get probability predictions.

        Args:
            x: Input tensor

        Returns:
            Probability array [P(real), P(fake)]
        """
        self.eval()
        with torch.no_grad():
            logits, _ = self.forward(x)
            probs = F.softmax(logits, dim=1)
        return probs.cpu().numpy()

    def preprocess_image(self, image: Image.Image) -> torch.Tensor:
        """
        Preprocess a PIL image for model input.

        Args:
            image: PIL Image

        Returns:
            Preprocessed tensor
        """
        if image.mode != "RGB":
            image = image.convert("RGB")
        return self.transform(image).unsqueeze(0).to(self.device)

    def load_weights(self, checkpoint_path: str) -> None:
        """
        Load pre-trained weights.

        Args:
            checkpoint_path: Path to checkpoint file
        """
        if Path(checkpoint_path).exists():
            checkpoint = torch.load(checkpoint_path, map_location=self.device)
            if isinstance(checkpoint, dict) and "state_dict" in checkpoint:
                self.load_state_dict(checkpoint["state_dict"])
            else:
                self.load_state_dict(checkpoint)
            logger.info(f"Loaded weights from {checkpoint_path}")
        else:
            logger.warning(f"Checkpoint not found at {checkpoint_path}, using pretrained backbone only")

    def to_device(self, device: Optional[torch.device] = None) -> "EfficientNetDeepfakeDetector":
        """Move model to device."""
        if device is None:
            device = self.device
        self.device = device
        return self.to(device)


class MultiScaleEfficientNet(nn.Module):
    """
    Multi-scale deepfake detector using multiple EfficientNet backbones
    at different resolutions to capture both local and global artifacts.
    """

    def __init__(self):
        super().__init__()

        # Multiple scale networks
        self.scale_256 = timm.create_model("efficientnet_b0", pretrained=True, num_classes=0)
        self.scale_380 = timm.create_model("efficientnet_b4", pretrained=True, num_classes=0)

        # Get feature dimensions
        dim_256 = self.scale_256.num_features
        dim_380 = self.scale_380.num_features

        # Fusion layer
        self.fusion = nn.Sequential(
            nn.Linear(dim_256 + dim_380, 512),
            nn.ReLU(inplace=True),
            nn.Dropout(0.3),
            nn.Linear(512, 2),
        )

        # Transforms for different scales
        self.transform_256 = transforms.Compose([
            transforms.Resize((256, 256)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])

        self.transform_380 = transforms.Compose([
            transforms.Resize((380, 380)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])

    def forward(self, x_256: torch.Tensor, x_380: torch.Tensor) -> torch.Tensor:
        """Forward pass with multi-scale inputs."""
        feat_256 = self.scale_256(x_256)
        feat_380 = self.scale_380(x_380)

        # Concatenate features
        fused = torch.cat([feat_256, feat_380], dim=1)

        return self.fusion(fused)
