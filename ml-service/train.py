"""
Nivara Visual Intelligence — Two-Stage Transfer Learning Training Pipeline
Stage 1: Frozen EfficientNet-B0 backbone — train classification head only
Stage 2: Optionally unfreeze upper backbone layers for fine-tuning

Usage:
  python train.py --data_dir data/processed/classification --output_dir models/classification
                  --epochs 25 --freeze_epochs 10 --batch_size 32 --lr 1e-4 --seed 42
"""
import os
import sys
import json
import random
import argparse
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, WeightedRandomSampler
from torchvision import datasets, transforms
from sklearn.metrics import (
    classification_report, confusion_matrix,
    balanced_accuracy_score, precision_recall_fscore_support
)

from app.model import NivaraVisualClassifier

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("nivara.train")


def set_seed(seed: int = 42):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)
    torch.backends.cudnn.deterministic = True
    torch.backends.cudnn.benchmark = False


def get_transforms() -> Tuple[transforms.Compose, transforms.Compose]:
    train_t = transforms.Compose([
        transforms.Resize((256, 256)),
        transforms.RandomResizedCrop(224, scale=(0.75, 1.0)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomRotation(degrees=12),
        transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.15, hue=0.05),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    val_t = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.CenterCrop(224),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    return train_t, val_t


def compute_class_weights(dataset: datasets.ImageFolder) -> torch.Tensor:
    targets = [s[1] for s in dataset.samples]
    counts = np.bincount(targets, minlength=len(dataset.classes))
    total = len(targets)
    weights = total / (len(dataset.classes) * np.maximum(counts, 1).astype(np.float32))
    return torch.tensor(weights, dtype=torch.float32)


def make_weighted_sampler(dataset: datasets.ImageFolder) -> WeightedRandomSampler:
    targets = [s[1] for s in dataset.samples]
    counts = np.bincount(targets, minlength=len(dataset.classes))
    class_weight = 1.0 / np.maximum(counts, 1)
    sample_weights = [class_weight[t] for t in targets]
    return WeightedRandomSampler(
        weights=torch.tensor(sample_weights, dtype=torch.float32),
        num_samples=len(sample_weights),
        replacement=True
    )


def freeze_backbone(model: NivaraVisualClassifier):
    """Freeze all backbone parameters — train classifier head only."""
    for param in model.features.parameters():
        param.requires_grad = False
    for param in model.avgpool.parameters():
        param.requires_grad = False
    logger.info("Stage 1: Backbone FROZEN — training classifier head only.")


def unfreeze_upper_backbone(model: NivaraVisualClassifier, num_layers: int = 2):
    """Unfreeze the last N feature blocks of EfficientNet-B0."""
    if isinstance(model.features, nn.Sequential):
        blocks = list(model.features.children())
        for block in blocks[-num_layers:]:
            for param in block.parameters():
                param.requires_grad = True
        logger.info(f"Stage 2: Unfroze last {num_layers} backbone feature block(s).")


def train_one_epoch(model, loader, criterion, optimizer, device) -> Tuple[float, float]:
    model.train()
    running_loss, correct, total = 0.0, 0, 0
    for inputs, targets in loader:
        inputs, targets = inputs.to(device), targets.to(device)
        optimizer.zero_grad()
        outputs = model(inputs)
        loss = criterion(outputs, targets)
        loss.backward()
        optimizer.step()
        running_loss += loss.item() * inputs.size(0)
        _, predicted = outputs.max(1)
        correct += predicted.eq(targets).sum().item()
        total += targets.size(0)
    return running_loss / total, correct / total


def evaluate(model, loader, criterion, device) -> Tuple[float, float, np.ndarray, np.ndarray]:
    model.eval()
    running_loss, all_preds, all_targets = 0.0, [], []
    with torch.no_grad():
        for inputs, targets in loader:
            inputs, targets = inputs.to(device), targets.to(device)
            outputs = model(inputs)
            loss = criterion(outputs, targets)
            running_loss += loss.item() * inputs.size(0)
            _, predicted = outputs.max(1)
            all_preds.extend(predicted.cpu().numpy())
            all_targets.extend(targets.cpu().numpy())
    total = len(all_targets)
    return running_loss / total if total > 0 else 0.0, \
           (np.array(all_preds) == np.array(all_targets)).mean(), \
           np.array(all_targets), np.array(all_preds)


def get_git_commit() -> Optional[str]:
    try:
        import subprocess
        r = subprocess.run(["git", "rev-parse", "--short", "HEAD"],
                           capture_output=True, text=True, timeout=5)
        return r.stdout.strip() if r.returncode == 0 else None
    except Exception:
        return None


def main():
    parser = argparse.ArgumentParser(description="Train Nivara Visual Classifier (two-stage transfer learning).")
    parser.add_argument("--data_dir", type=str, default="data/processed/classification")
    parser.add_argument("--output_dir", type=str, default="models/classification")
    parser.add_argument("--epochs", type=int, default=25, help="Total epochs (Stage 1 + Stage 2 combined)")
    parser.add_argument("--freeze_epochs", type=int, default=10, help="Epochs with frozen backbone (Stage 1)")
    parser.add_argument("--unfreeze_blocks", type=int, default=2, help="Number of backbone blocks to unfreeze in Stage 2")
    parser.add_argument("--batch_size", type=int, default=32)
    parser.add_argument("--lr", type=float, default=1e-4)
    parser.add_argument("--finetune_lr", type=float, default=1e-5, help="LR for Stage 2 fine-tuning")
    parser.add_argument("--patience", type=int, default=5)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--device", type=str,
                        default="cuda" if torch.cuda.is_available() else "cpu")
    args = parser.parse_args()

    set_seed(args.seed)

    train_dir = Path(args.data_dir) / "train"
    val_dir = Path(args.data_dir) / "val"

    if not train_dir.exists() or not val_dir.exists():
        logger.error(
            f"Dataset not found at '{args.data_dir}'.\n"
            f"Run: python prepare_dataset.py --dry_run  first to verify dataset, then without --dry_run."
        )
        sys.exit(1)

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    device = torch.device(args.device)
    logger.info(f"Device: {device}  |  Seed: {args.seed}")

    train_t, val_t = get_transforms()
    train_ds = datasets.ImageFolder(str(train_dir), transform=train_t)
    val_ds = datasets.ImageFolder(str(val_dir), transform=val_t)

    logger.info(f"Train samples: {len(train_ds)}  |  Val samples: {len(val_ds)}")
    logger.info(f"Classes ({len(train_ds.classes)}): {train_ds.classes}")

    sampler = make_weighted_sampler(train_ds)
    train_loader = DataLoader(train_ds, batch_size=args.batch_size, sampler=sampler,
                              num_workers=2, pin_memory=(device.type == "cuda"))
    val_loader = DataLoader(val_ds, batch_size=args.batch_size, shuffle=False,
                            num_workers=2, pin_memory=(device.type == "cuda"))

    class_weights = compute_class_weights(train_ds).to(device)
    criterion = nn.CrossEntropyLoss(weight=class_weights)

    model = NivaraVisualClassifier(num_classes=len(train_ds.classes), pretrained=True).to(device)

    # Stage 1: Frozen backbone
    freeze_backbone(model)
    optimizer = optim.AdamW(filter(lambda p: p.requires_grad, model.parameters()),
                            lr=args.lr, weight_decay=1e-2)
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode="min", factor=0.5, patience=2)

    best_val_loss = float("inf")
    patience_counter = 0
    checkpoint_path = output_dir / "nivara-visual-classifier.pt"
    history: List[Dict] = []

    logger.info(f"\n{'='*60}")
    logger.info(f"STAGE 1: Frozen backbone — {args.freeze_epochs} epochs max")
    logger.info(f"{'='*60}")

    for epoch in range(1, args.epochs + 1):
        # Switch to Stage 2 after freeze_epochs
        if epoch == args.freeze_epochs + 1:
            logger.info(f"\n{'='*60}")
            logger.info(f"STAGE 2: Unfreezing upper backbone blocks — fine-tuning LR={args.finetune_lr}")
            logger.info(f"{'='*60}")
            unfreeze_upper_backbone(model, num_layers=args.unfreeze_blocks)
            # Reset optimizer with lower LR for fine-tuning
            optimizer = optim.AdamW(filter(lambda p: p.requires_grad, model.parameters()),
                                    lr=args.finetune_lr, weight_decay=1e-3)
            scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode="min", factor=0.5, patience=2)
            patience_counter = 0  # Reset patience for stage 2

        train_loss, train_acc = train_one_epoch(model, train_loader, criterion, optimizer, device)
        val_loss, val_acc, _, _ = evaluate(model, val_loader, criterion, device)
        scheduler.step(val_loss)

        stage = "S1" if epoch <= args.freeze_epochs else "S2"
        logger.info(
            f"Epoch [{epoch:02d}/{args.epochs:02d}] [{stage}] "
            f"Train Loss: {train_loss:.4f}  Acc: {train_acc*100:.2f}% | "
            f"Val Loss: {val_loss:.4f}  Acc: {val_acc*100:.2f}%"
        )
        history.append({
            "epoch": epoch,
            "stage": stage,
            "train_loss": round(float(train_loss), 4),
            "train_acc": round(float(train_acc), 4),
            "val_loss": round(float(val_loss), 4),
            "val_acc": round(float(val_acc), 4)
        })

        if val_loss < best_val_loss:
            best_val_loss = val_loss
            patience_counter = 0
            torch.save({
                "epoch": epoch,
                "state_dict": model.state_dict(),
                "val_loss": val_loss,
                "val_acc": val_acc,
                "classes": train_ds.classes,
                "model_status": "ready"
            }, checkpoint_path)
            logger.info(f"  --> Best checkpoint saved (Val Loss: {val_loss:.4f})")
        else:
            patience_counter += 1
            if patience_counter >= args.patience:
                logger.info(f"Early stopping after epoch {epoch} (no improvement for {args.patience} epochs).")
                break

    # Save training history
    history_path = Path("reports") / "training_history.json"
    history_path.parent.mkdir(parents=True, exist_ok=True)
    with open(history_path, "w") as f:
        json.dump(history, f, indent=2)
    logger.info(f"--> Training history: {history_path}")

    # Save model metadata
    metadata = {
        "architecture": "EfficientNet-B0 (Transfer Learning + Custom Classification Head)",
        "classes": train_ds.classes,
        "num_classes": len(train_ds.classes),
        "image_size": 224,
        "normalization": {"mean": [0.485, 0.456, 0.406], "std": [0.229, 0.224, 0.225]},
        "hyperparameters": {
            "epochs_total": args.epochs,
            "freeze_epochs": args.freeze_epochs,
            "unfreeze_blocks": args.unfreeze_blocks,
            "batch_size": args.batch_size,
            "lr_stage1": args.lr,
            "lr_stage2": args.finetune_lr,
            "patience": args.patience,
            "seed": args.seed,
            "optimizer": "AdamW",
            "scheduler": "ReduceLROnPlateau"
        },
        "training_dataset": str(Path(args.data_dir).resolve()),
        "model_status": "ready",
        "checkpoint_path": str(checkpoint_path.resolve()),
        "trained_at": datetime.now(datetime.UTC).isoformat().replace("+00:00", "Z"),
        "git_commit": get_git_commit(),
        "device": str(device)
    }
    metadata_path = output_dir / "model_metadata.json"
    with open(metadata_path, "w") as f:
        json.dump(metadata, f, indent=2)
    logger.info(f"--> Model metadata: {metadata_path}")

    logger.info("\n✓ Training complete. Run evaluate.py to compute test metrics before deployment.\n")


if __name__ == "__main__":
    main()
