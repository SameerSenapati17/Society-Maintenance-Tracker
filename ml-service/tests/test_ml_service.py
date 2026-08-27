"""
Nivara Visual Intelligence — ML Service Automated Test Suite
Covers preprocessing, classification, explainability, detection, taxonomy mapping,
and dataset preparation utilities.
"""
import io
import os
import tempfile
import pytest
from PIL import Image
import numpy as np
import torch
from pathlib import Path
from fastapi.testclient import TestClient

from app.main import DEFAULT_MODEL_PATH, app, get_model_path, pipeline
from app.model import NivaraVisualClassifier, VISUAL_CLASSES, NUM_CLASSES
from app.preprocessing import validate_and_load_image, preprocess_for_inference
from app.explainability import GradCAM, render_gradcam_artifacts
from app.taxonomy import (
    TAXONOMY, CLASSIFICATION_SLUGS, DETECTION_SLUGS,
    get_nivara_class, get_exclusion_reason, EXCLUDED_REASONS
)
from prepare_dataset import compute_hash, validate_image

client = TestClient(app)


@pytest.fixture(scope="session", autouse=True)
def initialize_application_lifespan():
    with TestClient(app):
        yield


def test_default_model_path_and_environment_override(monkeypatch):
    monkeypatch.delenv("MODEL_PATH", raising=False)
    assert get_model_path() == "models/classification/nivara-visual-classifier.pt"
    assert DEFAULT_MODEL_PATH == "models/classification/nivara-visual-classifier.pt"

    monkeypatch.setenv("MODEL_PATH", "custom/checkpoint.pt")
    assert get_model_path() == "custom/checkpoint.pt"


def create_synthetic_image(color=(120, 160, 220), size=(300, 300), format="JPEG") -> bytes:
    """Helper to generate in-memory synthetic image bytes."""
    img = Image.new("RGB", size, color=color)
    buf = io.BytesIO()
    img.save(buf, format=format)
    return buf.getvalue()


# ──────────────────────────────────────────────────────────
# 1. Unit Tests: Preprocessing & Validation
# ──────────────────────────────────────────────────────────

def test_validate_and_load_valid_jpeg():
    raw_bytes = create_synthetic_image(format="JPEG")
    pil_img = validate_and_load_image(raw_bytes)
    assert isinstance(pil_img, Image.Image)
    assert pil_img.mode == "RGB"


def test_validate_and_load_valid_png():
    raw_bytes = create_synthetic_image(format="PNG")
    pil_img = validate_and_load_image(raw_bytes)
    assert isinstance(pil_img, Image.Image)
    assert pil_img.mode == "RGB"


def test_validate_and_load_corrupt_bytes():
    with pytest.raises(ValueError, match="Corrupt or invalid"):
        validate_and_load_image(b"not-a-valid-image-stream-content")


def test_preprocess_for_inference_dimensions():
    raw_bytes = create_synthetic_image(size=(400, 300))
    pil_img = validate_and_load_image(raw_bytes)
    tensor, resized = preprocess_for_inference(pil_img, device="cpu")
    assert tensor.shape == (1, 3, 224, 224)
    assert resized.size == (224, 224)


# ──────────────────────────────────────────────────────────
# 2. Unit Tests: Model Architecture, Inference & Grad-CAM
# ──────────────────────────────────────────────────────────

def test_model_forward_pass():
    model = NivaraVisualClassifier(num_classes=NUM_CLASSES, pretrained=False)
    model.eval()
    dummy_input = torch.randn(1, 3, 224, 224)
    logits = model(dummy_input)
    assert logits.shape == (1, NUM_CLASSES)


def test_gradcam_generation_and_overlay():
    model = NivaraVisualClassifier(num_classes=NUM_CLASSES, pretrained=False)
    model.eval()
    grad_cam = GradCAM(model)

    dummy_input = torch.randn(1, 3, 224, 224)
    cam_norm = grad_cam.generate_cam(dummy_input, target_class_idx=0)
    assert cam_norm.shape == (224, 224)
    assert cam_norm.min() >= 0.0
    assert cam_norm.max() <= 1.0

    pil_img = Image.new("RGB", (224, 224), color=(100, 150, 200))
    overlay_b64, heatmap_b64, summary = render_gradcam_artifacts(
        grad_cam=grad_cam,
        input_tensor=dummy_input,
        resized_pil=pil_img,
        target_class_idx=0,
        target_class_name="Water Leakage",
        confidence=0.89
    )
    assert overlay_b64.startswith("data:image/png;base64,")
    assert heatmap_b64.startswith("data:image/png;base64,")
    assert "Water Leakage" in summary


# ──────────────────────────────────────────────────────────
# 3. Integration Tests: FastAPI Endpoints & Status Handlers
# ──────────────────────────────────────────────────────────

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "modelStatus" in data
    assert data["modelStatus"] in ["untrained", "trained", "ready"]
    assert data["classes"] == VISUAL_CLASSES


def test_predict_json_image_url_contract(monkeypatch):
    class MockImageResponse:
        status_code = 200
        headers = {"content-type": "image/jpeg", "content-length": "0"}
        content = create_synthetic_image()

        def iter_content(self, chunk_size):
            yield self.content

    monkeypatch.setattr("app.main.requests.get", lambda *args, **kwargs: MockImageResponse())
    response = client.post(
        "/predict?explain=true",
        json={
            "imageUrl": "https://res.cloudinary.com/demo/image/upload/sample.jpg",
            "explain": True
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["modelStatus"] == "ready"
    assert data["category"]
    assert isinstance(data["confidence"], float)
    assert data["topPredictions"]
    assert data["explanation"]
    assert data["explanation"]["overlayBase64"].startswith("data:image/png;base64,")
    assert data["explanation"]["heatmapBase64"].startswith("data:image/png;base64,")


def test_predict_multipart_file():
    img_bytes = create_synthetic_image()
    response = client.post(
        "/predict?explain=true",
        files={"file": ("incident.jpg", img_bytes, "image/jpeg")}
    )
    assert response.status_code == 200
    data = response.json()
    assert "category" in data
    assert data["category"] in VISUAL_CLASSES
    assert 0.0 <= data["confidence"] <= 1.0
    assert len(data["topPredictions"]) > 0
    assert data["modelStatus"] in ["untrained", "trained", "ready"]
    assert data["explanation"] is not None
    assert data["explanation"]["overlayBase64"].startswith("data:image/png;base64,")


def test_predict_missing_image():
    response = client.post("/predict")
    assert response.status_code == 400


def test_predict_corrupt_file():
    response = client.post(
        "/predict",
        files={"file": ("corrupt.jpg", b"bad-bytes", "image/jpeg")}
    )
    assert response.status_code == 422


def test_explain_endpoint():
    img_bytes = create_synthetic_image()
    response = client.post(
        "/explain",
        files={"file": ("incident.png", img_bytes, "image/png")}
    )
    assert response.status_code == 200
    data = response.json()
    assert "targetClass" in data
    assert "overlayBase64" in data
    assert "summary" in data


def test_detect_endpoint_untrained_fallback():
    img_bytes = create_synthetic_image()
    response = client.post(
        "/detect?model_name=elevator",
        files={"file": ("elevator.jpg", img_bytes, "image/jpeg")}
    )
    assert response.status_code == 200
    data = response.json()
    assert "modelStatus" in data
    assert "detectorModel" in data
    assert "detections" in data
    assert isinstance(data["detections"], list)


# ──────────────────────────────────────────────────────────
# 4. Unit Tests: Taxonomy Mapping & Exclusion Rules
# ──────────────────────────────────────────────────────────

def test_taxonomy_mapping_garbage():
    for src_cls in ["cardboard", "glass", "metal", "paper", "plastic", "trash"]:
        assert get_nivara_class("garbage_classification", src_cls) == "garbage_waste"


def test_taxonomy_mapping_damaged_construction():
    assert get_nivara_class("damaged_construction", "Damaged_building") == "wall_ceiling_damage"
    assert get_nivara_class("damaged_construction", "debris") == "broken_infrastructure"
    assert get_nivara_class("damaged_construction", "Damaged_highway") == "parking_road_damage"
    # Negative/background samples must NOT map to positive classes
    assert get_nivara_class("damaged_construction", "Non-damaged_building") is None
    assert get_nivara_class("damaged_construction", "Non-damaged_highway") is None


def test_taxonomy_mapping_electrical_wiring():
    assert get_nivara_class("electrical_wiring", "damaged") == "electrical_hazard"
    assert get_nivara_class("electrical_wiring", "disconnected") == "electrical_hazard"
    assert get_nivara_class("electrical_wiring", "misrouted") == "electrical_hazard"
    assert get_nivara_class("electrical_wiring", "normal") is None  # background


def test_taxonomy_exclusion_reasons():
    assert "UNVERIFIED" in get_exclusion_reason("water_leakage")
    assert "Door state" in get_exclusion_reason("elevator_door")
    assert "Vehicle damage" in get_exclusion_reason("car_damage")


# ──────────────────────────────────────────────────────────
# 5. Unit Tests: Dataset Preparation Helpers & Hashing
# ──────────────────────────────────────────────────────────

def test_compute_hash_and_validation():
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as f:
        img_bytes = create_synthetic_image()
        f.write(img_bytes)
        temp_path = Path(f.name)

    try:
        is_valid, meta = validate_image(temp_path)
        assert is_valid is True
        assert meta["width"] == 300
        assert meta["height"] == 300
        assert meta["channels"] == 3

        h1 = compute_hash(temp_path)
        assert len(h1) == 64  # SHA-256 hex string length
    finally:
        if temp_path.exists():
            temp_path.unlink()
