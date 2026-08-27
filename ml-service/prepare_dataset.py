"""
Nivara Visual Intelligence — Dataset Ingestion, Validation & Splitting Tool
Handles all source datasets with their unique structures, applies taxonomy mapping,
performs SHA-256 deduplication with train/test leakage prevention, and generates
a fully-provenance-tracked classification manifest.

Usage:
  python prepare_dataset.py [--raw_dir ./data/raw] [--output_dir ./data/processed/classification]
                            [--train_ratio 0.70] [--val_ratio 0.15] [--test_ratio 0.15] [--seed 42]

Generates:
  data/processed/classification/train/<class_slug>/
  data/processed/classification/val/<class_slug>/
  data/processed/classification/test/<class_slug>/
  manifests/classification_manifest.csv
"""
import os
import sys
import csv
import hashlib
import shutil
import random
import argparse
import logging
from collections import defaultdict
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# Allow import from parent
sys.path.insert(0, str(Path(__file__).parent))

from app.taxonomy import (
    SOURCE_CLASS_MAP, CLASSIFICATION_SLUGS, get_nivara_class, get_exclusion_reason,
    DATASET_LICENSES, EXCLUDED_REASONS
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger("nivara.prepare")

try:
    from PIL import Image
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False
    logger.warning("Pillow not installed — image validation will be limited to file-size checks.")

SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".JPG", ".JPEG", ".PNG", ".WEBP"}


def compute_hash(path: Path) -> str:
    hasher = hashlib.sha256()
    try:
        with open(path, "rb") as f:
            while chunk := f.read(65536):
                hasher.update(chunk)
        return hasher.hexdigest()
    except Exception:
        return "HASH_ERROR"


def validate_image(path: Path) -> Tuple[bool, Dict]:
    """Returns (is_valid, meta_dict)."""
    meta = {"width": 0, "height": 0, "channels": 3, "size_bytes": 0, "format": "UNKNOWN"}
    try:
        meta["size_bytes"] = path.stat().st_size
        if meta["size_bytes"] == 0:
            return False, meta
        if PIL_AVAILABLE:
            with Image.open(path) as img:
                img.verify()
            with Image.open(path) as img:
                meta["width"], meta["height"] = img.size
                meta["channels"] = len(img.getbands())
                meta["format"] = img.format or path.suffix.upper().replace(".", "")
    except Exception:
        return False, meta
    return True, meta


# ──────────────────────────────────────────────────────────
# Source-specific collection functions
# ──────────────────────────────────────────────────────────

def collect_garbage_classification(raw_dir: Path) -> List[Dict]:
    """Handles double-nested Kaggle Garbage Classification structure."""
    samples = []
    root = raw_dir / "garbage_classification"
    # Try known nesting patterns
    for candidate in [
        root / "Garbage classification" / "Garbage classification",
        root / "Garbage_classification" / "Garbage_classification",
        root,
    ]:
        if candidate.exists() and candidate.is_dir():
            subdirs = [d for d in candidate.iterdir() if d.is_dir()]
            if subdirs and not any(d.name.lower() in {"images"} for d in subdirs):
                for class_dir in subdirs:
                    for img_path in class_dir.glob("*"):
                        if img_path.suffix.lower() in SUPPORTED_EXTENSIONS:
                            nivara_cls = get_nivara_class("garbage_classification", class_dir.name)
                            samples.append({
                                "src_path": img_path,
                                "source_dataset": "garbage_classification",
                                "original_class": class_dir.name,
                                "nivara_class": nivara_cls,
                                "included": nivara_cls is not None,
                                "exclusion_reason": "" if nivara_cls else get_exclusion_reason("garbage_classification", class_dir.name)
                            })
                break
    return samples


def collect_damaged_construction(raw_dir: Path) -> List[Dict]:
    """Handles damaged_construction dataset with train/test presplit."""
    samples = []
    root = raw_dir / "damaged_construction"
    for split_dir in root.iterdir():
        if not split_dir.is_dir():
            continue
        split_name = split_dir.name.lower()  # "train" or "test"
        for class_dir in split_dir.iterdir():
            if not class_dir.is_dir():
                continue
            nivara_cls = get_nivara_class("damaged_construction", class_dir.name)
            for img_path in class_dir.rglob("*"):
                if img_path.suffix.lower() in SUPPORTED_EXTENSIONS:
                    samples.append({
                        "src_path": img_path,
                        "source_dataset": "damaged_construction",
                        "original_class": class_dir.name,
                        "nivara_class": nivara_cls,
                        "original_split": split_name,  # Preserve presplit info
                        "included": nivara_cls is not None,
                        "exclusion_reason": "" if nivara_cls else get_exclusion_reason("damaged_construction", class_dir.name)
                    })
    return samples


def collect_electrical_wiring(raw_dir: Path) -> List[Dict]:
    """Collects electrical wiring images for classification (ignoring YOLO labels here)."""
    samples = []
    root = raw_dir / "electrical_wiring"
    # Handle the deep nested path
    nested = root / "Predictive Maintenance for Electrical Wiring Faults" / "images"
    if not nested.exists():
        nested = root

    for split_dir in nested.iterdir():
        if not split_dir.is_dir():
            continue
        for img_path in split_dir.rglob("*"):
            if img_path.suffix.lower() not in SUPPORTED_EXTENSIONS:
                continue
            # Class encoded in filename: damaged_001.JPG → "damaged"
            stem_parts = img_path.stem.split("_")
            original_class = stem_parts[0] if stem_parts else "unknown"
            nivara_cls = get_nivara_class("electrical_wiring", original_class)
            samples.append({
                "src_path": img_path,
                "source_dataset": "electrical_wiring",
                "original_class": original_class,
                "nivara_class": nivara_cls,
                "included": nivara_cls is not None,
                "exclusion_reason": "" if nivara_cls else get_exclusion_reason("electrical_wiring", original_class)
            })
    return samples


def collect_water_leakage(raw_dir: Path) -> List[Dict]:
    """Water leakage — ALL images marked as UNVERIFIED and excluded."""
    samples = []
    root = raw_dir / "water_leakage"
    for img_path in root.rglob("*"):
        if img_path.suffix.lower() in SUPPORTED_EXTENSIONS:
            samples.append({
                "src_path": img_path,
                "source_dataset": "water_leakage",
                "original_class": "UNVERIFIED",
                "nivara_class": None,
                "included": False,
                "exclusion_reason": get_exclusion_reason("water_leakage")
            })
    return samples


# ──────────────────────────────────────────────────────────
# Main Pipeline
# ──────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Prepare Nivara classification dataset from raw sources.")
    parser.add_argument("--raw_dir", type=str, default="data/raw", help="Root raw dataset directory")
    parser.add_argument("--output_dir", type=str, default="data/processed/classification", help="Output classification directory")
    parser.add_argument("--train_ratio", type=float, default=0.70)
    parser.add_argument("--val_ratio", type=float, default=0.15)
    parser.add_argument("--test_ratio", type=float, default=0.15)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--dry_run", action="store_true", help="Audit only — do not copy files")
    args = parser.parse_args()

    total = round(args.train_ratio + args.val_ratio + args.test_ratio, 4)
    if total != 1.0:
        logger.error(f"Split ratios must sum to 1.0 (got {total})")
        sys.exit(1)

    raw_dir = Path(args.raw_dir)
    output_dir = Path(args.output_dir)
    manifests_dir = Path("manifests")

    random.seed(args.seed)

    logger.info("=" * 65)
    logger.info("NIVARA DATASET PREPARATION PIPELINE")
    logger.info(f"Raw dir:    {raw_dir}")
    logger.info(f"Output dir: {output_dir}")
    logger.info(f"Split:      {args.train_ratio:.0%}/{args.val_ratio:.0%}/{args.test_ratio:.0%}")
    logger.info(f"Seed:       {args.seed}")
    logger.info("=" * 65)

    # ── Step 1: Collect all samples from all sources ──
    all_samples: List[Dict] = []
    all_samples.extend(collect_water_leakage(raw_dir))
    all_samples.extend(collect_garbage_classification(raw_dir))
    all_samples.extend(collect_damaged_construction(raw_dir))
    all_samples.extend(collect_electrical_wiring(raw_dir))
    # car_damage and elevator_door: not collected (fully excluded or detection-only)

    logger.info(f"\nTotal raw samples collected: {len(all_samples)}")

    # ── Step 2: Validate images ──
    logger.info("Validating images...")
    valid_samples, corrupt_count = [], 0
    excluded_samples: List[Dict] = []

    for s in all_samples:
        if not s["included"]:
            excluded_samples.append(s)
            continue
        is_valid, meta = validate_image(s["src_path"])
        if not is_valid:
            corrupt_count += 1
            s["exclusion_reason"] = "Corrupt or unreadable image"
            excluded_samples.append(s)
        else:
            s["meta"] = meta
            valid_samples.append(s)

    logger.info(f"Valid includable images: {len(valid_samples)}")
    logger.info(f"Corrupt images removed:  {corrupt_count}")
    logger.info(f"Excluded (policy):       {len(excluded_samples)}")

    # ── Step 3: SHA-256 deduplication (within included set only) ──
    logger.info("Deduplicating by SHA-256 content hash...")
    seen_hashes: Dict[str, str] = {}
    deduped_samples: List[Dict] = []
    duplicate_count = 0

    for s in valid_samples:
        h = compute_hash(s["src_path"])
        s["sha256"] = h
        if h in seen_hashes:
            duplicate_count += 1
            s["exclusion_reason"] = f"Duplicate of {seen_hashes[h]}"
            s["included"] = False
            excluded_samples.append(s)
        else:
            seen_hashes[h] = str(s["src_path"])
            deduped_samples.append(s)

    logger.info(f"Duplicates removed:      {duplicate_count}")
    logger.info(f"Unique valid samples:    {len(deduped_samples)}")

    # ── Step 4: Group by Nivara class ──
    by_class: Dict[str, List[Dict]] = defaultdict(list)
    for s in deduped_samples:
        if s["nivara_class"] in CLASSIFICATION_SLUGS:
            by_class[s["nivara_class"]].append(s)

    # ── Step 5: Class distribution report ──
    logger.info("\n" + "-" * 65)
    logger.info("CLASS DISTRIBUTION (before splitting):")
    logger.info("-" * 65)
    for slug in CLASSIFICATION_SLUGS:
        count = len(by_class.get(slug, []))
        bar = "█" * min(count // 5, 40)
        logger.info(f"  {slug:30s} {count:5d}  {bar}")
    missing_classes = [s for s in CLASSIFICATION_SLUGS if len(by_class.get(s, [])) == 0]
    if missing_classes:
        logger.warning(f"\nWARNING: 0 samples for classes: {', '.join(missing_classes)}")

    # ── Step 6: Create output directory structure ──
    if not args.dry_run:
        for split in ["train", "val", "test"]:
            for slug in CLASSIFICATION_SLUGS:
                (output_dir / split / slug).mkdir(parents=True, exist_ok=True)
        manifests_dir.mkdir(parents=True, exist_ok=True)

    # ── Step 7: Stratified split & copy ──
    manifest_rows: List[Dict] = []
    split_class_counts: Dict[str, Dict[str, int]] = {"train": {}, "val": {}, "test": {}}
    leakage_check: Dict[str, str] = {}  # hash → split for leak detection
    sample_id = 1
    leakage_violations = 0

    for slug, samples in by_class.items():
        random.shuffle(samples)

        # For damaged_construction: respect original splits where possible
        presplit_test = [s for s in samples if s.get("original_split") == "test"]
        presplit_train = [s for s in samples if s.get("original_split") == "train"]
        no_presplit = [s for s in samples if "original_split" not in s]

        if presplit_test and presplit_train and no_presplit is not None:
            # Use official splits for damaged_construction
            train_samples = presplit_train
            remaining = presplit_test + no_presplit
            n_val = max(1, int(len(remaining) * 0.5))
            val_samples = remaining[:n_val]
            test_samples = remaining[n_val:]
        else:
            # Standard random split
            n = len(samples)
            n_train = int(n * args.train_ratio)
            n_val = int(n * args.val_ratio)
            train_samples = samples[:n_train]
            val_samples = samples[n_train:n_train + n_val]
            test_samples = samples[n_train + n_val:]

        split_assignments = [
            ("train", train_samples),
            ("val", val_samples),
            ("test", test_samples)
        ]

        split_class_counts["train"][slug] = len(train_samples)
        split_class_counts["val"][slug] = len(val_samples)
        split_class_counts["test"][slug] = len(test_samples)

        for split_name, split_samples in split_assignments:
            for s in split_samples:
                # Leakage check
                sh = s.get("sha256", "")
                if sh and sh in leakage_check and leakage_check[sh] != split_name:
                    leakage_violations += 1
                    logger.error(f"LEAKAGE DETECTED: hash {sh[:12]}... appears in both {leakage_check[sh]} and {split_name}")
                else:
                    if sh:
                        leakage_check[sh] = split_name

                src = s["src_path"]
                ext = src.suffix.lower()
                new_name = f"{slug}_{sample_id:06d}{ext}"
                dest = output_dir / split_name / slug / new_name

                if not args.dry_run:
                    shutil.copy2(src, dest)

                manifest_rows.append({
                    "sample_id": sample_id,
                    "source_dataset": s["source_dataset"],
                    "original_path": str(src),
                    "destination_path": str(Path(split_name) / slug / new_name),
                    "original_class": s["original_class"],
                    "nivara_class": s["nivara_class"],
                    "split": split_name,
                    "width": s.get("meta", {}).get("width", 0),
                    "height": s.get("meta", {}).get("height", 0),
                    "channels": s.get("meta", {}).get("channels", 3),
                    "file_size": s.get("meta", {}).get("size_bytes", 0),
                    "sha256": s.get("sha256", ""),
                    "duplicate_group": "",
                    "license_source": DATASET_LICENSES.get(s["source_dataset"], "License verification required")
                })
                sample_id += 1

    # ── Step 8: Write excluded samples to manifest too ──
    for s in excluded_samples:
        manifest_rows.append({
            "sample_id": "",
            "source_dataset": s.get("source_dataset", ""),
            "original_path": str(s.get("src_path", "")),
            "destination_path": "EXCLUDED",
            "original_class": s.get("original_class", ""),
            "nivara_class": "EXCLUDED",
            "split": "EXCLUDED",
            "width": "",
            "height": "",
            "channels": "",
            "file_size": "",
            "sha256": s.get("sha256", ""),
            "duplicate_group": "",
            "license_source": DATASET_LICENSES.get(s.get("source_dataset", ""), "License verification required"),
            "exclusion_reason": s.get("exclusion_reason", "")
        })

    # ── Step 9: Write manifest CSV ──
    manifest_path = manifests_dir / "classification_manifest.csv"
    fieldnames = [
        "sample_id", "source_dataset", "original_path", "destination_path",
        "original_class", "nivara_class", "split", "width", "height",
        "channels", "file_size", "sha256", "duplicate_group", "license_source", "exclusion_reason"
    ]

    if not args.dry_run:
        with open(manifest_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
            writer.writeheader()
            writer.writerows(manifest_rows)
        logger.info(f"\n--> Manifest written: {manifest_path} ({len(manifest_rows)} entries)")

    # ── Step 10: Final report ──
    included_count = sum(1 for r in manifest_rows if r["split"] != "EXCLUDED")
    excluded_count = sum(1 for r in manifest_rows if r["split"] == "EXCLUDED")

    logger.info("\n" + "=" * 65)
    logger.info("DATASET PREPARATION SUMMARY")
    logger.info("=" * 65)
    logger.info(f"Total samples processed:  {len(all_samples)}")
    logger.info(f"Included in splits:       {included_count}")
    logger.info(f"Excluded (all reasons):   {excluded_count}")
    logger.info(f"  Duplicate images:       {duplicate_count}")
    logger.info(f"  Policy exclusions:      {len([s for s in excluded_samples if 'Corrupt' not in s.get('exclusion_reason', '')])}")
    logger.info(f"  Corrupt images:         {corrupt_count}")
    logger.info(f"Leakage violations:       {leakage_violations}")
    if leakage_violations > 0:
        logger.error("⚠️  LEAKAGE DETECTED — DO NOT TRAIN. Review manifest for cross-split duplicates.")
    else:
        logger.info("✓ Leakage check PASSED — no cross-split duplicates detected.")

    logger.info("\nSplit counts by class:")
    for slug in CLASSIFICATION_SLUGS:
        t = split_class_counts["train"].get(slug, 0)
        v = split_class_counts["val"].get(slug, 0)
        te = split_class_counts["test"].get(slug, 0)
        logger.info(f"  {slug:30s}  train={t:4d}  val={v:4d}  test={te:4d}")

    if args.dry_run:
        logger.info("\n[DRY RUN] No files were copied.")
    else:
        logger.info(f"\n--> Output directory: {output_dir}")
        logger.info("✓ Dataset preparation complete. Verify counts above before training.\n")

    return leakage_violations


if __name__ == "__main__":
    leakage = main()
    sys.exit(0 if leakage == 0 else 1)
