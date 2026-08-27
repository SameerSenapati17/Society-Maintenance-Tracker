"""
Nivara Visual Intelligence — FastAPI Microservice Entrypoint
Provides REST endpoints for computer vision inference and Grad-CAM explainability.
"""
import os
import io
import time
import base64
import logging
from datetime import datetime
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, File, UploadFile, Query, HTTPException, status, Body, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import requests
from urllib.parse import urlparse

from app.model import load_model, VISUAL_CLASSES
from app.inference import InferencePipeline
from app.schemas import (
    VisualPredictionResponse,
    VisualExplanation,
    HealthResponse
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("nivara.ml.service")

MAX_URL_IMAGE_SIZE_BYTES = 15 * 1024 * 1024

# Global Inference Pipeline Instance
pipeline: Optional[InferencePipeline] = None
model_status: str = "untrained"
model_loaded: bool = False
device: str = "cpu"
DEFAULT_MODEL_PATH = "models/classification/nivara-visual-classifier.pt"
model_path: str = DEFAULT_MODEL_PATH


def get_model_path() -> str:
    return os.environ.get("MODEL_PATH", DEFAULT_MODEL_PATH)


@asynccontextmanager
async def lifespan(app: FastAPI):
    global pipeline, model_status, model_loaded, device, model_path
    device = os.environ.get("DEVICE", "cpu")
    model_path = get_model_path()

    logger.info(f"Initializing Nivara Visual Intelligence Service on device: {device}...")
    model, model_status = load_model(checkpoint_path=model_path, device=device)
    model_loaded = (model_status == "ready")
    pipeline = InferencePipeline(model=model, device=device, model_status=model_status)
    logger.info(f"Visual Intelligence pipeline initialized. Model Status: {model_status.upper()}.")
    yield
    logger.info("Shutting down Nivara Visual Intelligence Service.")


app = FastAPI(
    title="Nivara Visual Intelligence Service",
    description="Computer Vision & Explainable AI (Grad-CAM) Microservice for Property Operations.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ImageUrlPayload(BaseModel):
    imageUrl: Optional[str] = Field(None, description="Direct URL of the complaint photo")
    imageBase64: Optional[str] = Field(None, description="Base64 encoded image string")
    explain: bool = Field(True, description="Whether to compute Grad-CAM explainability")


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Returns the operational status and loaded model details.
    """
    return HealthResponse(
        status="healthy",
        modelStatus=model_status,
        modelLoaded=model_loaded,
        modelArchitecture="EfficientNet-B0 (Transfer Learning)",
        device=device,
        classes=pipeline.classes if pipeline else VISUAL_CLASSES,
        timestamp=datetime.utcnow().isoformat() + "Z"
    )


@app.post(
    "/predict",
    response_model=VisualPredictionResponse,
    summary="Predict visual maintenance category with optional Grad-CAM attention map"
)
async def predict_image(
    request: Request,
    file: Optional[UploadFile] = File(None),
    explain: bool = Query(True, description="Generate Grad-CAM activation overlay"),
    payload: Optional[ImageUrlPayload] = Body(None)
):
    """
    Accepts an uploaded image file or a JSON payload with an image URL / base64 string,
    and returns predicted maintenance visual class with confidence ranking and Grad-CAM visual evidence.
    """
    if pipeline is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Inference model pipeline is not yet initialized."
        )

    image_bytes = None

    if file is None and payload is None and request.headers.get("content-type", "").split(";", 1)[0].lower() == "application/json":
        try:
            payload = ImageUrlPayload.model_validate(await request.json())
        except Exception as err:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid JSON image payload: {err}")

    # 1. Handle file upload (Multipart)
    if file is not None:
        try:
            image_bytes = await file.read()
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to read uploaded image stream: {str(e)}"
            )

    # 2. Handle JSON payload (URL or Base64)
    elif payload is not None:
        explain = payload.explain
        if payload.imageBase64:
            try:
                b64_data = payload.imageBase64
                if "," in b64_data:
                    b64_data = b64_data.split(",", 1)[1]
                image_bytes = base64.b64decode(b64_data)
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid base64 image data: {str(e)}"
                )
        elif payload.imageUrl:
            try:
                parsed_url = urlparse(payload.imageUrl)
                if parsed_url.scheme not in {"https", "http"} or not parsed_url.netloc:
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Image URL must be a valid HTTP(S) URL.")
                # Fetch image from external storage (e.g. Cloudinary) with timeout
                resp = requests.get(payload.imageUrl, timeout=10, allow_redirects=False, stream=True)
                if resp.status_code != 200:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Failed to fetch image from URL (HTTP {resp.status_code})"
                    )
                content_length = resp.headers.get("content-length")
                if content_length and int(content_length) > MAX_URL_IMAGE_SIZE_BYTES:
                    raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Image URL response exceeds the maximum allowable size.")
                content_type = resp.headers.get("content-type", "").split(";", 1)[0].lower()
                if content_type not in {"image/jpeg", "image/png", "image/webp", "image/jpg"}:
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Image URL did not return a supported image type.")
                chunks = bytearray()
                for chunk in resp.iter_content(chunk_size=1024 * 1024):
                    chunks.extend(chunk)
                    if len(chunks) > MAX_URL_IMAGE_SIZE_BYTES:
                        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Image URL response exceeds the maximum allowable size.")
                image_bytes = bytes(chunks)
            except requests.RequestException as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Network error fetching image from URL: {str(e)}"
                )

    if not image_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No image provided. Please supply an image file or a valid image URL/base64 payload."
        )

    try:
        start_time = time.time()
        result = pipeline.predict(image_bytes, explain=explain)
        elapsed = time.time() - start_time
        logger.info(f"Visual prediction completed in {elapsed:.3f}s: category={result.category}, confidence={result.confidence}")
        return result
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(val_err)
        )
    except Exception as e:
        logger.error(f"Inference error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred during visual model execution."
        )


@app.post(
    "/explain",
    response_model=VisualExplanation,
    summary="Compute Grad-CAM explainability heatmap directly for an image"
)
async def explain_image(
    request: Request,
    file: Optional[UploadFile] = File(None),
    payload: Optional[ImageUrlPayload] = Body(None)
):
    """
    Dedicated endpoint to compute and return Grad-CAM attention heatmap overlay.
    """
    prediction = await predict_image(request=request, file=file, explain=True, payload=payload)
    if not prediction.explanation:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate Grad-CAM explainability artifacts."
        )
    return prediction.explanation


class DetectionResult(BaseModel):
    """Single bounding-box detection result."""
    label: str = Field(..., description="Detected object/fault class label")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Detection confidence score")
    bbox: dict = Field(..., description="Bounding box: {x1, y1, x2, y2} in pixel coordinates")


class DetectionResponse(BaseModel):
    """Response for POST /detect."""
    modelStatus: str = Field(..., description="Detection model status: 'untrained' | 'ready'")
    detectorModel: str = Field(..., description="Detection model identifier")
    detections: list = Field(default_factory=list, description="List of detected bounding boxes")
    imageWidth: Optional[int] = Field(None)
    imageHeight: Optional[int] = Field(None)
    inferenceMs: Optional[float] = Field(None)
    message: Optional[str] = Field(None)


@app.post(
    "/detect",
    response_model=DetectionResponse,
    summary="Run object-detection inference (YOLOv8) — returns bounding boxes per detection"
)
async def detect_objects(
    file: Optional[UploadFile] = File(None),
    payload: Optional[ImageUrlPayload] = Body(None),
    model_name: str = Query("elevator", description="Detection model to use: 'elevator' | 'electrical'")
):
    """
    Object-detection endpoint. Uses YOLOv8-compatible trained models.
    Returns bounding boxes, class labels, and confidence scores.
    If no trained detection model is available, returns modelStatus='untrained' with no detections.
    Never crashes — always returns a structured response.
    """
    import time as _time

    # Determine which model to load
    detector_models = {
        "elevator": os.environ.get("ELEVATOR_DETECTOR_PATH", "models/detection/nivara-elevator-detector.pt"),
        "electrical": os.environ.get("ELECTRICAL_DETECTOR_PATH", "models/detection/nivara-electrical-detector.pt"),
    }
    detector_path = detector_models.get(model_name, detector_models["elevator"])
    detector_label = f"nivara-{model_name}-detector"

    if not os.path.exists(detector_path):
        return DetectionResponse(
            modelStatus="untrained",
            detectorModel=detector_label,
            detections=[],
            message=(
                f"Detection model '{model_name}' is not yet trained. "
                f"Expected checkpoint at: {detector_path}. "
                f"Run: python detection/train_detection.py --source {model_name}"
            )
        )

    # Read image bytes
    image_bytes = None
    if file:
        image_bytes = await file.read()
    elif payload and payload.imageUrl:
        try:
            resp = requests.get(payload.imageUrl, timeout=10)
            resp.raise_for_status()
            image_bytes = resp.content
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Could not fetch image from URL: {e}")
    elif payload and payload.imageBase64:
        try:
            image_bytes = base64.b64decode(payload.imageBase64)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid base64 image data.")

    if not image_bytes:
        raise HTTPException(status_code=400, detail="No image provided.")

    try:
        from ultralytics import YOLO
        from PIL import Image as PILImage
        import io as _io

        yolo_model = YOLO(detector_path)
        pil_img = PILImage.open(_io.BytesIO(image_bytes)).convert("RGB")
        img_w, img_h = pil_img.size

        start = _time.time()
        results = yolo_model(pil_img, verbose=False)
        elapsed_ms = (_time.time() - start) * 1000

        detections = []
        for r in results:
            if r.boxes is None:
                continue
            for box in r.boxes:
                x1, y1, x2, y2 = [float(c) for c in box.xyxy[0].tolist()]
                conf = float(box.conf[0])
                cls_id = int(box.cls[0])
                cls_name = yolo_model.names.get(cls_id, str(cls_id))
                detections.append({
                    "label": cls_name,
                    "confidence": round(conf, 4),
                    "bbox": {"x1": round(x1), "y1": round(y1), "x2": round(x2), "y2": round(y2)}
                })

        return DetectionResponse(
            modelStatus="ready",
            detectorModel=detector_label,
            detections=detections,
            imageWidth=img_w,
            imageHeight=img_h,
            inferenceMs=round(elapsed_ms, 1)
        )

    except ImportError:
        return DetectionResponse(
            modelStatus="untrained",
            detectorModel=detector_label,
            detections=[],
            message="ultralytics package not installed. Install it with: pip install ultralytics"
        )
    except Exception as e:
        logger.error(f"Detection error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Detection inference failed: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8001))
    host = os.environ.get("HOST", "0.0.0.0")
    uvicorn.run("app.main:app", host=host, port=port, reload=True)

