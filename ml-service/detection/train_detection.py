"""
Nivara Detection Pipeline — YOLOv8 Training Wrapper
Trains YOLOv8 detection models for Elevator Door or Electrical Wiring faults.

Prerequisites:
  pip install ultralytics

Usage:
  python detection/train_detection.py --source elevator --epochs 50
  python detection/train_detection.py --source electrical --epochs 50
"""
import sys
import json
import argparse
import logging
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("nivara.detection.train")

DETECTION_DIR = Path(__file__).parent.parent / "data" / "processed" / "detection"
MODELS_DIR = Path(__file__).parent.parent / "models" / "detection"
REPORTS_DIR = Path(__file__).parent.parent / "reports"

PRETRAINED_MODELS = {
    "nano": "yolov8n.pt",
    "small": "yolov8s.pt",
    "medium": "yolov8m.pt"
}

MODEL_NAME_MAP = {
    "elevator": "nivara-elevator-detector",
    "electrical": "nivara-electrical-detector"
}


def update_registry(model_name: str, metadata: dict):
    registry_path = Path(__file__).parent.parent / "models" / "registry.json"
    registry = {}
    if registry_path.exists():
        with open(registry_path) as f:
            registry = json.load(f)
    registry.setdefault("detection", {})[model_name] = metadata
    registry["last_updated"] = datetime.utcnow().isoformat() + "Z"
    with open(registry_path, "w") as f:
        json.dump(registry, f, indent=2)
    logger.info(f"Updated model registry: {registry_path}")


def train(source: str, epochs: int, imgsz: int, batch: int, yolo_size: str, patience: int, device: str):
    dataset_yaml = DETECTION_DIR / source / "dataset.yaml"
    if not dataset_yaml.exists():
        logger.error(
            f"Dataset not found: {dataset_yaml}\n"
            f"Run first: python detection/prepare_detection.py --source {source}"
        )
        sys.exit(1)

    try:
        from ultralytics import YOLO
    except ImportError:
        logger.error(
            "ultralytics package is not installed.\n"
            "Install it: pip install ultralytics"
        )
        sys.exit(1)

    pretrained = PRETRAINED_MODELS.get(yolo_size, "yolov8n.pt")
    model_display_name = MODEL_NAME_MAP.get(source, f"nivara-{source}-detector")

    logger.info("=" * 60)
    logger.info(f"NIVARA DETECTION TRAINING — {source.upper()}")
    logger.info("=" * 60)
    logger.info(f"Dataset:     {dataset_yaml}")
    logger.info(f"Base model:  {pretrained}")
    logger.info(f"Epochs:      {epochs}")
    logger.info(f"Image size:  {imgsz}px")
    logger.info(f"Batch size:  {batch}")
    logger.info(f"Device:      {device}")

    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)

    yolo = YOLO(pretrained)
    project_dir = MODELS_DIR / source
    project_dir.mkdir(parents=True, exist_ok=True)

    results = yolo.train(
        data=str(dataset_yaml),
        epochs=epochs,
        imgsz=imgsz,
        batch=batch,
        patience=patience,
        device=device,
        project=str(project_dir),
        name="train",
        exist_ok=True,
        save=True,
        plots=True
    )

    # Copy best checkpoint to canonical path
    best_pt = project_dir / "train" / "weights" / "best.pt"
    canonical_pt = MODELS_DIR / f"nivara-{source}-detector.pt"
    if best_pt.exists():
        import shutil
        shutil.copy2(best_pt, canonical_pt)
        logger.info(f"--> Best checkpoint saved: {canonical_pt}")
        model_status = "ready"
    else:
        logger.warning("Training completed but best.pt not found — model may not have converged.")
        model_status = "failed"

    # Parse YOLO results
    metrics_dict = {}
    try:
        box_metrics = results.results_dict if hasattr(results, "results_dict") else {}
        metrics_dict = {k: round(float(v), 4) for k, v in box_metrics.items() if isinstance(v, (int, float))}
    except Exception:
        pass

    metadata = {
        "source": source,
        "model_display_name": model_display_name,
        "checkpoint_path": str(canonical_pt),
        "model_status": model_status,
        "base_model": pretrained,
        "epochs_trained": epochs,
        "imgsz": imgsz,
        "batch_size": batch,
        "metrics": metrics_dict,
        "trained_at": datetime.utcnow().isoformat() + "Z"
    }

    # Save metadata JSON
    metadata_path = MODELS_DIR / f"{source}_metadata.json"
    with open(metadata_path, "w") as f:
        json.dump(metadata, f, indent=2)
    logger.info(f"--> Metadata: {metadata_path}")

    update_registry(source, metadata)

    if model_status == "ready":
        logger.info(f"\n✓ Detection training complete for '{source}'.")
        logger.info(f"  Run: python detection/evaluate_detection.py --source {source}")
    else:
        logger.error(f"Training for '{source}' did not produce a valid checkpoint.")
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description="Train Nivara YOLOv8 detection model.")
    parser.add_argument("--source", type=str, required=True, choices=["elevator", "electrical"])
    parser.add_argument("--epochs", type=int, default=50)
    parser.add_argument("--imgsz", type=int, default=640)
    parser.add_argument("--batch", type=int, default=16)
    parser.add_argument("--yolo_size", type=str, default="nano", choices=list(PRETRAINED_MODELS.keys()))
    parser.add_argument("--patience", type=int, default=10)
    parser.add_argument("--device", type=str, default="")
    args = parser.parse_args()
    train(args.source, args.epochs, args.imgsz, args.batch, args.yolo_size, args.patience, args.device)


if __name__ == "__main__":
    main()
