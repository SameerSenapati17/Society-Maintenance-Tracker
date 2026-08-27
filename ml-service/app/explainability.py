"""
Nivara Visual Intelligence — Explainable AI (Grad-CAM)
Generates gradient-weighted class activation heatmaps and overlays using Nivara design palette.
"""
import logging
from typing import Optional, Tuple
import numpy as np
from PIL import Image
import torch
import torch.nn.functional as F

from app.model import NivaraVisualClassifier, VISUAL_CLASSES
from app.preprocessing import pil_to_base64_png

logger = logging.getLogger("nivara.ml.explainability")


class GradCAM:
    """
    Gradient-Weighted Class Activation Mapping (Grad-CAM) implementation for CNN models.
    """
    def __init__(self, model: NivaraVisualClassifier, target_layer: Optional[torch.nn.Module] = None):
        self.model = model
        self.model.eval()
        self.target_layer = target_layer or model.get_target_layer()

        self.activations = None
        self.gradients = None
        self.hooks = []
        self._register_hooks()

    def _register_hooks(self):
        def forward_hook(module, input, output):
            self.activations = output.detach()

        def backward_hook(module, grad_input, grad_output):
            self.gradients = grad_output[0].detach()

        self.hooks.append(self.target_layer.register_forward_hook(forward_hook))
        self.hooks.append(self.target_layer.register_full_backward_hook(backward_hook))

    def remove_hooks(self):
        for hook in self.hooks:
            hook.remove()
        self.hooks = []

    def generate_cam(
        self,
        input_tensor: torch.Tensor,
        target_class_idx: Optional[int] = None
    ) -> np.ndarray:
        """
        Generates normalized 2D Grad-CAM heatmap array [H, W] in range [0, 1].
        """
        self.model.zero_grad()
        input_tensor.requires_grad_(True)

        # Forward pass
        logits = self.model(input_tensor)

        if target_class_idx is None:
            target_class_idx = logits.argmax(dim=1).item()

        # Backward pass for the target class score
        score = logits[0, target_class_idx]
        score.backward(retain_graph=True)

        if self.gradients is None or self.activations is None:
            raise RuntimeError("Failed to capture activations or gradients during Grad-CAM execution.")

        # Compute channel weights via global average pooling of gradients
        # Shape: [1, Channels, 1, 1]
        weights = self.gradients.mean(dim=(2, 3), keepdim=True)

        # Weighted combination of forward activation maps
        # Shape: [1, 1, H, W]
        cam = (weights * self.activations).sum(dim=1, keepdim=True)

        # Apply ReLU to focus only on features that positively contribute to the target class
        cam = F.relu(cam)

        # Interpolate to match input resolution (224x224)
        cam = F.interpolate(cam, size=(224, 224), mode="bilinear", align_corners=False)

        # Squeeze to 2D numpy array
        cam_np = cam.squeeze().cpu().detach().numpy()

        # Normalize to [0.0, 1.0]
        cam_min, cam_max = cam_np.min(), cam_np.max()
        if cam_max - cam_min > 1e-8:
            cam_norm = (cam_np - cam_min) / (cam_max - cam_min)
        else:
            cam_norm = np.zeros_like(cam_np)

        return cam_norm


def apply_nivara_colormap(cam_norm: np.ndarray) -> np.ndarray:
    """
    Applies Nivara's restrained operational colormap (Navy -> Indigo -> Amber/Rose)
    rather than harsh rainbow colormaps.
    Returns RGB image array of shape (224, 224, 3) in uint8 [0, 255].
    """
    h, w = cam_norm.shape
    rgb = np.zeros((h, w, 3), dtype=np.uint8)

    for i in range(h):
        for j in range(w):
            v = float(cam_norm[i, j])
            if v < 0.25:
                # Dark slate to muted navy
                t = v / 0.25
                r = int(15 + t * (40 - 15))
                g = int(23 + t * (60 - 23))
                b = int(42 + t * (120 - 42))
            elif v < 0.60:
                # Navy to vibrant Indigo (Nivara brand accent)
                t = (v - 0.25) / 0.35
                r = int(40 + t * (99 - 40))
                g = int(60 + t * (102 - 60))
                b = int(120 + t * (241 - 120))
            elif v < 0.85:
                # Indigo to Amber
                t = (v - 0.60) / 0.25
                r = int(99 + t * (245 - 99))
                g = int(102 + t * (158 - 102))
                b = int(241 + t * (11 - 241))
            else:
                # Amber to Rose/Red (Critical focal attention)
                t = (v - 0.85) / 0.15
                r = int(245 + t * (225 - 245))
                g = int(158 + t * (29 - 158))
                b = int(11 + t * (72 - 11))
            rgb[i, j] = [min(255, max(0, r)), min(255, max(0, g)), min(255, max(0, b))]

    return rgb


def render_gradcam_artifacts(
    grad_cam: GradCAM,
    input_tensor: torch.Tensor,
    resized_pil: Image.Image,
    target_class_idx: int,
    target_class_name: str,
    confidence: float
) -> Tuple[str, str, str]:
    """
    Generates Grad-CAM heatmap, overlays it onto the original resized image,
    and returns (overlay_b64, heatmap_b64, summary_text).
    """
    cam_norm = grad_cam.generate_cam(input_tensor, target_class_idx)

    # 1. Isolated Heatmap
    heatmap_rgb = apply_nivara_colormap(cam_norm)
    heatmap_pil = Image.fromarray(heatmap_rgb)
    heatmap_b64 = pil_to_base64_png(heatmap_pil)

    # 2. Overlay onto Original Image (blend alpha 0.45 heatmap + 0.55 original)
    orig_np = np.array(resized_pil.convert("RGB"), dtype=np.float32)
    heat_np = heatmap_rgb.astype(np.float32)
    # Highlight weight where activation is significant
    alpha = np.clip(cam_norm[:, :, np.newaxis] * 0.65 + 0.15, 0.15, 0.70)
    overlay_np = (1.0 - alpha) * orig_np + alpha * heat_np
    overlay_np = np.clip(overlay_np, 0, 255).astype(np.uint8)
    overlay_pil = Image.fromarray(overlay_np)
    overlay_b64 = pil_to_base64_png(overlay_pil)

    # 3. Plain language human summary
    pct = int(confidence * 100)
    summary = (
        f"Highlighted regions indicate focal features most characteristic of '{target_class_name}' "
        f"({pct}% confidence). The model concentrated attention on the marked surface anomalies."
    )

    return overlay_b64, heatmap_b64, summary
