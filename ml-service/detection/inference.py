"""
Nivara Detection Pipeline — Standalone Inference
Runs a trained YOLOv8 detection model on an image and returns structured results.

Usage:
  python detection/inference.py --image path/to/image.jpg --source elevator
  python detection/inference.py --image path/to/image.jpg --source electrical --conf 0.35
"""
import sys
import json
import argparse
import logging
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("nivara.detection.inference")

MODELS_DIR = Path(__file__).parent.parent / "models" / "detection"


def run_detection(image_path: str, source: str = "elevator", conf: float = 0.25) -> dict:
    """
    Run detection on a single image. Returns structured detection results.
    Always returns a dict even if the model is untrained or unavailable.
    """
    checkpoint = MODELS_DIR / f"nivara-{source}-detector.pt"

    if not checkpoint.exists():
        return {
            "modelStatus": "untrained",
            "source": source,
            "detections": [],
            "message": (
                f"Model '{source}' not trained. Expected: {checkpoint}. "
                f"Run: python detection/train_detection.py --source {source}"
            )
        }

    try:
        from ultralytics import YOLO
        from PIL import Image
    except ImportError:
        return {
            "modelStatus": "unavailable",
            "source": source,
            "detections": [],
            "message": "ultralytics or Pillow not installed."
        }

    img = Image.open(image_path).convert("RGB")
    w, h = img.size
    model = YOLO(str(checkpoint))
    results = model(img, conf=conf, verbose=False)

    detections = []
    for r in results:
        if r.boxes is None:
            continue
        for box in r.boxes:
            x1, y1, x2, y2 = [float(c) for c in box.xyxy[0].tolist()]
            confidence = round(float(box.conf[0]), 4)
            cls_id = int(box.cls[0])
            cls_name = model.names.get(cls_id, str(cls_id))
            detections.append({
                "label": cls_name,
                "confidence": confidence,
                "bbox": {"x1": round(x1), "y1": round(y1), "x2": round(x2), "y2": round(y2)}
            })

    return {
        "modelStatus": "ready",
        "source": source,
        "image": image_path,
        "imageWidth": w,
        "imageHeight": h,
        "conf_threshold": conf,
        "detections": detections,
        "detection_count": len(detections)
    }


def main():
    parser = argparse.ArgumentParser(description="Run Nivara detection inference.")
    parser.add_argument("--image", type=str, required=True, help="Path to image file")
    parser.add_argument("--source", type=str, default="elevator", choices=["elevator", "electrical"])
    parser.add_argument("--conf", type=float, default=0.25, help="Confidence threshold (0-1)")
    parser.add_argument("--output_json", type=str, default=None, help="Optional JSON output path")
    args = parser.parse_args()

    result = run_detection(args.image, args.source, args.conf)

    print(json.dumps(result, indent=2))

    if args.output_json:
        with open(args.output_json, "w") as f:
            json.dump(result, f, indent=2)
        logger.info(f"Results saved: {args.output_json}")


if __name__ == "__main__":
    main()
