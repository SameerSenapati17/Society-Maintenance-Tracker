"""
Nivara Visual Intelligence — Neural Network Architecture & Model Factory
Architecture: Transfer-Learning CNN (EfficientNet-B0 backbone + Custom Property Operations Head)
"""
import os
import json
import logging
from typing import List, Tuple, Optional, Dict
import torch
import torch.nn as nn

logger = logging.getLogger("nivara.ml.model")

# Trained five-class taxonomy for the visual classification checkpoint.
VISUAL_CLASSES: List[str] = [
    "broken_infrastructure",
    "electrical_hazard",
    "garbage_waste",
    "parking_road_damage",
    "wall_ceiling_damage"
]

CLASS_SLUG_TO_NAME: Dict[str, str] = {
    "water_leakage": "Water Leakage",
    "wall_ceiling_damage": "Wall/Ceiling Damage",
    "garbage_waste": "Garbage/Waste",
    "electrical_hazard": "Electrical Hazard",
    "broken_infrastructure": "Broken Infrastructure",
    "lift_door_damage": "Lift/Door Damage",
    "parking_road_damage": "Parking/Road Damage",
    "other": "Other"
}

# Also support common folder aliases for flexibility during dataset preparation
FOLDER_ALIASES: Dict[str, str] = {
    "water": "water_leakage",
    "leakage": "water_leakage",
    "wall_damage": "wall_ceiling_damage",
    "ceiling_damage": "wall_ceiling_damage",
    "garbage": "garbage_waste",
    "waste": "garbage_waste",
    "electrical": "electrical_hazard",
    "infrastructure": "broken_infrastructure",
    "lift": "lift_door_damage",
    "lift_damage": "lift_door_damage",
    "door_damage": "lift_door_damage",
    "parking": "parking_road_damage",
    "road_damage": "parking_road_damage",
    "misc": "other"
}

CLASS_NAME_TO_SLUG: Dict[str, str] = {v: k for k, v in CLASS_SLUG_TO_NAME.items()}
NUM_CLASSES = len(VISUAL_CLASSES)


def get_configured_classes() -> List[str]:
    """
    Returns configured class list, allowing override via AI_VISUAL_CLASSES env var (comma-separated).
    """
    env_classes = os.environ.get("AI_VISUAL_CLASSES")
    if env_classes:
        return [c.strip() for c in env_classes.split(",") if c.strip()]
    return VISUAL_CLASSES


class NivaraVisualClassifier(nn.Module):
    """
    Transfer-Learning Classifier for Property Operations & Maintenance.
    Uses an EfficientNet-B0 feature extractor with a custom classification head.
    """
    def __init__(self, num_classes: int = NUM_CLASSES, pretrained: bool = True):
        super().__init__()
        self.num_classes = num_classes
        self.backbone_name = "efficientnet_b0"

        try:
            from torchvision.models import efficientnet_b0, EfficientNet_B0_Weights
            weights = EfficientNet_B0_Weights.DEFAULT if pretrained else None
            backbone = efficientnet_b0(weights=weights)
            self.features = backbone.features
            self.avgpool = backbone.avgpool
            in_features = backbone.classifier[1].in_features
        except Exception as e:
            logger.warning(f"Unable to load torchvision EfficientNet-B0 pretrained weights ({e}). Initializing ConvNet backbone.")
            self.features = nn.Sequential(
                nn.Conv2d(3, 32, kernel_size=3, stride=2, padding=1, bias=False),
                nn.BatchNorm2d(32),
                nn.SiLU(inplace=True),
                nn.Conv2d(32, 64, kernel_size=3, stride=2, padding=1, bias=False),
                nn.BatchNorm2d(64),
                nn.SiLU(inplace=True),
                nn.Conv2d(64, 128, kernel_size=3, stride=2, padding=1, bias=False),
                nn.BatchNorm2d(128),
                nn.SiLU(inplace=True),
                nn.Conv2d(128, 256, kernel_size=3, stride=2, padding=1, bias=False),
                nn.BatchNorm2d(256),
                nn.SiLU(inplace=True),
                nn.Conv2d(256, 512, kernel_size=3, stride=2, padding=1, bias=False),
                nn.BatchNorm2d(512),
                nn.SiLU(inplace=True),
            )
            self.avgpool = nn.AdaptiveAvgPool2d((1, 1))
            in_features = 512

        # Custom Operations Classification Head
        self.classifier = nn.Sequential(
            nn.Dropout(p=0.3, inplace=True),
            nn.Linear(in_features, 256),
            nn.SiLU(inplace=True),
            nn.Dropout(p=0.2, inplace=True),
            nn.Linear(256, num_classes)
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.features(x)
        x = self.avgpool(x)
        x = torch.flatten(x, 1)
        logits = self.classifier(x)
        return logits

    def get_target_layer(self) -> nn.Module:
        """
        Returns the final convolutional layer of the feature extractor for Grad-CAM.
        """
        if isinstance(self.features, nn.Sequential):
            return self.features[-1]
        return self.features


def load_model(
    checkpoint_path: Optional[str] = None,
    device: str = "cpu"
) -> Tuple[NivaraVisualClassifier, str]:
    """
    Instantiates the model and loads weights from checkpoint if available.
    Returns (model, model_status) where model_status in ['untrained', 'trained', 'ready'].
    """
    classes = get_configured_classes()
    model = NivaraVisualClassifier(num_classes=len(classes), pretrained=False)
    status = "untrained"

    if checkpoint_path and os.path.exists(checkpoint_path):
        try:
            state_dict = torch.load(checkpoint_path, map_location=device, weights_only=False)
            if isinstance(state_dict, dict) and "state_dict" in state_dict:
                model.load_state_dict(state_dict["state_dict"])
            elif isinstance(state_dict, dict):
                model.load_state_dict(state_dict)
            model.to(device)
            model.eval()
            status = "ready"
            logger.info(f"Loaded trained Nivara visual classifier from {checkpoint_path}. Status: READY.")
        except Exception as err:
            logger.error(f"Error loading checkpoint from {checkpoint_path}: {err}. Status remains UNTRAINED.")
            model.to(device)
            model.eval()
            status = "untrained"
    else:
        logger.info(f"No checkpoint file found at '{checkpoint_path}'. Status: UNTRAINED (awaiting dataset training).")
        model.to(device)
        model.eval()
        status = "untrained"

    return model, status
