"""
Nivara Detection Pipeline — Evaluation
Computes mAP@0.5, mAP@0.5:0.95, precision, recall for a trained detection model.

Usage:
  python detection/evaluate_detection.py --source elevator
  python detection/evaluate_detection.py --source electrical
"""
import sys
import json
import argparse
import logging
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("nivara.detection.evaluate")

DETECTION_DIR = Path(__file__).parent.parent / "data" / "processed" / "detection"
MODELS_DIR = Path(__file__).parent.parent / "models" / "detection"
REPORTS_DIR = Path(__file__).parent.parent / "reports"


def main():
    parser = argparse.ArgumentParser(description="Evaluate Nivara detection model.")
    parser.add_argument("--source", type=str, required=True, choices=["elevator", "electrical"])
    parser.add_argument("--split", type=str, default="test", choices=["test", "val"])
    parser.add_argument("--imgsz", type=int, default=640)
    parser.add_argument("--batch", type=int, default=16)
    parser.add_argument("--device", type=str, default="")
    parser.add_argument("--conf_thresh", type=float, default=0.25)
    parser.add_argument("--iou_thresh", type=float, default=0.45)
    args = parser.parse_args()

    dataset_yaml = DETECTION_DIR / args.source / "dataset.yaml"
    checkpoint_path = MODELS_DIR / f"nivara-{args.source}-detector.pt"

    if not checkpoint_path.exists():
        logger.error(
            f"No trained checkpoint found: {checkpoint_path}\n"
            f"Model is UNTRAINED. Run: python detection/train_detection.py --source {args.source}"
        )
        sys.exit(1)

    if not dataset_yaml.exists():
        logger.error(f"Dataset YAML not found: {dataset_yaml}")
        sys.exit(1)

    try:
        from ultralytics import YOLO
    except ImportError:
        logger.error("ultralytics not installed. Run: pip install ultralytics")
        sys.exit(1)

    logger.info("=" * 60)
    logger.info(f"NIVARA DETECTION EVALUATION — {args.source.upper()}")
    logger.info("=" * 60)
    logger.info(f"Checkpoint: {checkpoint_path}")
    logger.info(f"Dataset:    {dataset_yaml}")
    logger.info(f"Split:      {args.split}")

    model = YOLO(str(checkpoint_path))
    results = model.val(
        data=str(dataset_yaml),
        split=args.split,
        imgsz=args.imgsz,
        batch=args.batch,
        device=args.device,
        conf=args.conf_thresh,
        iou=args.iou_thresh,
        verbose=True
    )

    metrics = {}
    try:
        metrics = {
            "mAP50": round(float(results.box.map50), 4),
            "mAP50_95": round(float(results.box.map), 4),
            "precision": round(float(results.box.mp), 4),
            "recall": round(float(results.box.mr), 4),
        }
    except Exception as e:
        logger.warning(f"Could not extract standard metrics: {e}")
        metrics = {}

    logger.info("=" * 60)
    logger.info("DETECTION METRICS")
    logger.info("=" * 60)
    for k, v in metrics.items():
        logger.info(f"  {k:<20s}: {v:.4f}")

    output = {
        "source": args.source,
        "checkpoint": str(checkpoint_path),
        "split": args.split,
        "conf_threshold": args.conf_thresh,
        "iou_threshold": args.iou_thresh,
        "metrics": metrics,
        "evaluated_at": datetime.utcnow().isoformat() + "Z"
    }

    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    out_path = REPORTS_DIR / f"detection_{args.source}_metrics.json"
    with open(out_path, "w") as f:
        json.dump(output, f, indent=2)
    logger.info(f"\n--> Detection metrics: {out_path}")
    logger.info("\n⚠️  WARNING: Metrics are reported on a small dataset with significant domain gap.")
    logger.info("    Real-world Nivara property images will be needed to validate production readiness.")

    # Update model registry
    registry_path = Path(__file__).parent.parent / "models" / "registry.json"
    if registry_path.exists():
        with open(registry_path) as f:
            registry = json.load(f)
        if args.source in registry.get("detection", {}):
            registry["detection"][args.source]["eval_metrics"] = metrics
            registry["detection"][args.source]["evaluated_at"] = output["evaluated_at"]
            with open(registry_path, "w") as f:
                json.dump(registry, f, indent=2)


if __name__ == "__main__":
    main()
