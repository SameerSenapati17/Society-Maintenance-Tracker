"""
Nivara Visual Intelligence — Model Evaluation Pipeline
Evaluates a trained checkpoint on hold-out test split.
Generates top-k accuracy, per-class metrics, confusion matrix, and JSON report.

Usage:
  python evaluate.py --model_path models/classification/nivara-visual-classifier.pt
                     --data_dir data/processed/classification --split test
                     --output_json reports/classification_metrics.json
"""
import os
import sys
import json
import argparse
import logging
from pathlib import Path
from typing import Dict, Optional, Tuple
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from torchvision import datasets, transforms
from sklearn.metrics import (
    classification_report, confusion_matrix,
    balanced_accuracy_score, precision_recall_fscore_support
)

sys.path.insert(0, str(Path(__file__).parent))
from app.model import NivaraVisualClassifier

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("nivara.evaluate")


def get_eval_transform() -> transforms.Compose:
    return transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.CenterCrop(224),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])


def evaluate_model(
    model: nn.Module,
    loader: DataLoader,
    criterion: nn.Module,
    device: torch.device,
    top_k: int = 3
) -> Dict:
    model.eval()
    running_loss = 0.0
    all_preds, all_targets, all_probs = [], [], []
    topk_correct = {k: 0 for k in range(1, top_k + 1)}
    total = 0

    with torch.no_grad():
        for inputs, targets in loader:
            inputs, targets = inputs.to(device), targets.to(device)
            outputs = model(inputs)
            loss = criterion(outputs, targets)
            running_loss += loss.item() * inputs.size(0)

            probs = torch.softmax(outputs, dim=1)
            batch_topk = outputs.topk(min(top_k, outputs.size(1)), dim=1)[1]

            for i in range(targets.size(0)):
                for k in range(1, top_k + 1):
                    if targets[i].item() in batch_topk[i, :k].tolist():
                        topk_correct[k] += 1

            _, preds = outputs.max(1)
            total += targets.size(0)
            all_preds.extend(preds.cpu().numpy())
            all_targets.extend(targets.cpu().numpy())
            all_probs.extend(probs.cpu().numpy())

    all_preds = np.array(all_preds)
    all_targets = np.array(all_targets)

    avg_loss = running_loss / total if total > 0 else 0.0
    topk_acc = {f"top{k}_accuracy": topk_correct[k] / total for k in topk_correct}

    return {
        "avg_loss": avg_loss,
        "total_samples": total,
        "targets": all_targets,
        "preds": all_preds,
        "probs": np.array(all_probs),
        **topk_acc
    }


def main():
    parser = argparse.ArgumentParser(description="Evaluate Nivara Visual Classifier.")
    parser.add_argument("--model_path", type=str, default="models/classification/nivara-visual-classifier.pt")
    parser.add_argument("--data_dir", type=str, default="data/processed/classification")
    parser.add_argument("--split", type=str, default="test", help="Split directory below data_dir; use '.' for a class-root validation set")
    parser.add_argument("--batch_size", type=int, default=32)
    parser.add_argument("--output_json", type=str, default=None)
    parser.add_argument("--confusion_matrix_png", type=str, default=None)
    parser.add_argument("--device", type=str,
                        default="cuda" if torch.cuda.is_available() else "cpu")
    args = parser.parse_args()

    split_dir = Path(args.data_dir) / args.split
    if not split_dir.exists():
        logger.error(f"Split directory not found: '{split_dir}'. Run prepare_dataset.py first.")
        sys.exit(1)

    if not Path(args.model_path).exists():
        logger.error(
            f"Checkpoint not found: '{args.model_path}'.\n"
            f"Model is UNTRAINED. Run train.py before evaluation."
        )
        sys.exit(1)

    device = torch.device(args.device)
    logger.info(f"Evaluating on device: {device}")

    eval_ds = datasets.ImageFolder(str(split_dir), transform=get_eval_transform())
    eval_loader = DataLoader(eval_ds, batch_size=args.batch_size, shuffle=False, num_workers=2)
    logger.info(f"Split: {args.split.upper()} — {len(eval_ds)} samples, {len(eval_ds.classes)} classes")

    # Load checkpoint
    checkpoint = torch.load(args.model_path, map_location=device,  weights_only=False)
    num_classes = len(eval_ds.classes)
    model = NivaraVisualClassifier(num_classes=num_classes, pretrained=False).to(device)
    state_dict = checkpoint.get("state_dict", checkpoint)
    model.load_state_dict(state_dict)
    logger.info(f"Loaded checkpoint from: {args.model_path}")

    criterion = nn.CrossEntropyLoss()
    results = evaluate_model(model, eval_loader, criterion, device)

    targets, preds = results["targets"], results["preds"]
    present = sorted(list(set(targets.tolist() + preds.tolist())))
    target_names = [eval_ds.classes[i] for i in present]

    report_dict = classification_report(targets, preds, target_names=target_names,
                                        output_dict=True, zero_division=0)
    report_text = classification_report(targets, preds, target_names=target_names,
                                        digits=4, zero_division=0)
    cm = confusion_matrix(targets, preds)
    bal_acc = balanced_accuracy_score(targets, preds)
    prec, rec, f1, _ = precision_recall_fscore_support(targets, preds, average="macro", zero_division=0)

    logger.info("=" * 65)
    logger.info("NIVARA VISUAL INTELLIGENCE — EVALUATION REPORT")
    logger.info("=" * 65)
    logger.info(f"Split:              {args.split.upper()}")
    logger.info(f"Total samples:      {results['total_samples']}")
    logger.info(f"Loss:               {results['avg_loss']:.4f}")
    logger.info(f"Top-1 Accuracy:     {results.get('top1_accuracy', 0)*100:.2f}%")
    logger.info(f"Top-2 Accuracy:     {results.get('top2_accuracy', 0)*100:.2f}%")
    logger.info(f"Top-3 Accuracy:     {results.get('top3_accuracy', 0)*100:.2f}%")
    logger.info(f"Balanced Accuracy:  {bal_acc*100:.2f}%")
    logger.info(f"Macro Precision:    {prec*100:.2f}%")
    logger.info(f"Macro Recall:       {rec*100:.2f}%")
    logger.info(f"Macro F1:           {f1*100:.2f}%")
    logger.info(f"\nClassification Report:\n{report_text}")
    logger.info(f"Confusion Matrix:\n{cm}")
    logger.info("=" * 65)

    # Save JSON report
    output = {
        "model_path": args.model_path,
        "split": args.split,
        "sample_count": results["total_samples"],
        "loss": round(float(results["avg_loss"]), 4),
        "top1_accuracy": round(float(results.get("top1_accuracy", 0)), 4),
        "top2_accuracy": round(float(results.get("top2_accuracy", 0)), 4),
        "top3_accuracy": round(float(results.get("top3_accuracy", 0)), 4),
        "balanced_accuracy": round(float(bal_acc), 4),
        "macro_precision": round(float(prec), 4),
        "macro_recall": round(float(rec), 4),
        "macro_f1": round(float(f1), 4),
        "confusion_matrix": cm.tolist(),
        "classification_report": report_dict,
        "classes": eval_ds.classes
    }

    output_path = args.output_json or "reports/classification_metrics.json"
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(output, f, indent=2)
    logger.info(f"--> Metrics JSON: {output_path}")

    # Optional confusion matrix PNG
    if args.confusion_matrix_png:
        try:
            import matplotlib
            matplotlib.use("Agg")
            import matplotlib.pyplot as plt
            import seaborn as sns
            fig, ax = plt.subplots(figsize=(10, 8))
            sns.heatmap(cm, annot=True, fmt="d", xticklabels=target_names,
                        yticklabels=target_names, cmap="Blues", ax=ax)
            ax.set_xlabel("Predicted")
            ax.set_ylabel("True")
            ax.set_title("Confusion Matrix — Nivara Visual Classifier")
            plt.tight_layout()
            Path(args.confusion_matrix_png).parent.mkdir(parents=True, exist_ok=True)
            plt.savefig(args.confusion_matrix_png, dpi=150)
            plt.close()
            logger.info(f"--> Confusion matrix: {args.confusion_matrix_png}")
        except ImportError:
            logger.warning("matplotlib/seaborn not installed — skipping confusion matrix PNG.")


if __name__ == "__main__":
    main()
