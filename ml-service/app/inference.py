"""
Nivara Visual Intelligence — Unified Inference Pipeline
Connects image preprocessing, PyTorch forward pass, and Grad-CAM explainability.
"""
import logging
from typing import Optional, Union
from PIL import Image
import torch
import torch.nn.functional as F

from app.model import NivaraVisualClassifier, get_configured_classes
from app.preprocessing import validate_and_load_image, preprocess_for_inference
from app.explainability import GradCAM, render_gradcam_artifacts
from app.schemas import PredictionItem, VisualExplanation, VisualPredictionResponse

logger = logging.getLogger("nivara.ml.inference")


class InferencePipeline:
    def __init__(
        self,
        model: NivaraVisualClassifier,
        device: str = "cpu",
        model_status: str = "untrained"
    ):
        self.model = model
        self.device = device
        self.model_status = model_status
        self.grad_cam = GradCAM(model)
        self.classes = get_configured_classes()

    def predict(
        self,
        image_input: Union[bytes, Image.Image],
        explain: bool = True
    ) -> VisualPredictionResponse:
        """
        Executes end-to-end visual classification and optional Grad-CAM explainability.
        """
        # 1. Validation and Loading
        pil_image = validate_and_load_image(image_input)

        # 2. Preprocess
        tensor, resized_pil = preprocess_for_inference(pil_image, device=self.device)

        # 3. Model Forward Pass
        self.model.eval()
        with torch.set_grad_enabled(explain):
            logits = self.model(tensor)
            probs = F.softmax(logits, dim=1)[0]

        # 4. Extract and Rank Top Predictions
        top_k = min(len(self.classes), 5)
        top_scores, top_indices = torch.topk(probs, k=top_k)

        top_predictions = []
        for score, idx in zip(top_scores.tolist(), top_indices.tolist()):
            top_predictions.append(PredictionItem(
                category=self.classes[idx],
                confidence=round(float(score), 4)
            ))

        top_idx = int(top_indices[0].item())
        top_category = self.classes[top_idx]
        top_confidence = round(float(top_scores[0].item()), 4)

        # 5. Grad-CAM Explainability
        explanation: Optional[VisualExplanation] = None
        if explain:
            try:
                overlay_b64, heatmap_b64, summary = render_gradcam_artifacts(
                    grad_cam=self.grad_cam,
                    input_tensor=tensor,
                    resized_pil=resized_pil,
                    target_class_idx=top_idx,
                    target_class_name=top_category,
                    confidence=top_confidence
                )

                if self.model_status == "untrained":
                    summary = (
                        f"[Untrained Baseline Mode] Highlighted regions indicate initial feature activations for '{top_category}'. "
                        f"Awaiting custom weights training on property maintenance dataset."
                    )

                explanation = VisualExplanation(
                    targetClass=top_category,
                    confidence=top_confidence,
                    overlayBase64=overlay_b64,
                    heatmapBase64=heatmap_b64,
                    summary=summary
                )
            except Exception as e:
                logger.warning(f"Grad-CAM generation failed: {e}. Returning prediction without heatmap.")
                explanation = VisualExplanation(
                    targetClass=top_category,
                    confidence=top_confidence,
                    overlayBase64=None,
                    heatmapBase64=None,
                    summary=f"Visual prediction for {top_category} (confidence: {int(top_confidence * 100)}%)."
                )

        model_tag = "nivara-visual-classifier"
        if self.model_status == "untrained":
            model_tag += "-untrained"

        return VisualPredictionResponse(
            category=top_category,
            confidence=top_confidence,
            topPredictions=top_predictions,
            model=model_tag,
            modelVersion="1.0",
            modelStatus=self.model_status,
            explanation=explanation
        )
