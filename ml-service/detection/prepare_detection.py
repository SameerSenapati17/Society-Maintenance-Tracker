"""
Nivara Detection Pipeline — Dataset Preparation
Validates, normalizes, and assembles YOLO-format detection datasets
for Elevator Door and Electrical Wiring detection.

Usage:
  python detection/prepare_detection.py --source elevator
  python detection/prepare_detection.py --source electrical
  python detection/prepare_detection.py --source all

Generates:
  data/processed/detection/elevator/dataset.yaml
  data/processed/detection/electrical/dataset.yaml
"""
import os
import sys
import shutil
import yaml
import argparse
import logging
from pathlib import Path
from typing import Dict, List, Tuple

sys.path.insert(0, str(Path(__file__).parent.parent))
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("nivara.detection.prepare")

RAW_DIR = Path(__file__).parent.parent / "data" / "raw"
OUTPUT_DIR = Path(__file__).parent.parent / "data" / "processed" / "detection"
SUPPORTED_IMG_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".JPG", ".JPEG", ".PNG"}


def validate_yolo_label(label_path: Path) -> Tuple[bool, List[str]]:
    """Returns (valid, list_of_issues)."""
    issues = []
    try:
        with open(label_path, "r") as f:
            lines = [l.strip() for l in f if l.strip()]
        if not lines:
            return True, []  # Empty label = background image (valid in YOLO)
        for i, line in enumerate(lines):
            parts = line.split()
            if len(parts) != 5:
                issues.append(f"line {i+1}: expected 5 fields, got {len(parts)}")
                continue
            try:
                cls_id = int(parts[0])
                cx, cy, w, h = float(parts[1]), float(parts[2]), float(parts[3]), float(parts[4])
                if cls_id < 0:
                    issues.append(f"line {i+1}: negative class id {cls_id}")
                if not (0 <= cx <= 1 and 0 <= cy <= 1 and 0 < w <= 1 and 0 < h <= 1):
                    issues.append(f"line {i+1}: bbox values out of [0,1] range")
            except ValueError:
                issues.append(f"line {i+1}: non-numeric value")
    except Exception as e:
        issues.append(f"file read error: {e}")
    return len(issues) == 0, issues


def count_images_in(directory: Path) -> int:
    return sum(1 for p in directory.rglob("*") if p.suffix.lower() in SUPPORTED_IMG_EXTS)


def count_labels_in(directory: Path) -> int:
    return sum(1 for p in directory.rglob("*.txt"))


# ──────────────────────────────────────────────────────────
# Elevator door dataset preparation
# ──────────────────────────────────────────────────────────

def prepare_elevator(dry_run: bool = False) -> Dict:
    src = RAW_DIR / "elevator_door"
    dst = OUTPUT_DIR / "elevator"
    data_yaml_src = src / "data.yaml"

    if not src.exists():
        logger.error(f"Elevator door source not found: {src}")
        return {"success": False, "error": "Source not found"}

    logger.info(f"\n[ELEVATOR] Source: {src}")
    logger.info(f"[ELEVATOR] Output: {dst}")

    # Read and validate source data.yaml
    try:
        with open(data_yaml_src) as f:
            data_yaml = yaml.safe_load(f)
        class_names = data_yaml.get("names", [])
        num_classes = data_yaml.get("nc", len(class_names))
        logger.info(f"[ELEVATOR] Classes ({num_classes}): {class_names}")
        logger.info(f"[ELEVATOR] License: CC BY 4.0")
    except Exception as e:
        logger.error(f"[ELEVATOR] Failed to parse data.yaml: {e}")
        return {"success": False, "error": str(e)}

    stats = {"invalid_labels": [], "images": {}, "labels": {}}
    for split in ["train", "valid", "test"]:
        img_dir = src / split / "images"
        lbl_dir = src / split / "labels"
        if img_dir.exists():
            stats["images"][split] = count_images_in(img_dir)
        if lbl_dir.exists():
            stats["labels"][split] = count_labels_in(lbl_dir)
            # Validate all labels
            for label_path in lbl_dir.rglob("*.txt"):
                valid, issues = validate_yolo_label(label_path)
                if not valid:
                    stats["invalid_labels"].append({
                        "file": str(label_path.relative_to(src)),
                        "issues": issues
                    })

    logger.info(f"[ELEVATOR] Image counts: {stats['images']}")
    logger.info(f"[ELEVATOR] Label counts: {stats['labels']}")
    if stats["invalid_labels"]:
        logger.warning(f"[ELEVATOR] {len(stats['invalid_labels'])} invalid label files found")
        for il in stats["invalid_labels"][:5]:
            logger.warning(f"  {il['file']}: {il['issues']}")
    else:
        logger.info("[ELEVATOR] All labels valid ✓")

    if not dry_run:
        # Copy full dataset to processed/detection/elevator preserving structure
        if dst.exists():
            shutil.rmtree(dst)
        shutil.copytree(src, dst)

        # Write updated dataset.yaml with absolute paths
        new_yaml = {
            "path": str(dst.resolve()),
            "train": "train/images",
            "val": "valid/images",
            "test": "test/images",
            "nc": num_classes,
            "names": class_names,
            "nivara_notes": (
                "Elevator door state detection dataset. "
                "Classes: close, middle, open — door states, not damage indicators. "
                "License: CC BY 4.0. Source: Roboflow Universe."
            )
        }
        with open(dst / "dataset.yaml", "w") as f:
            yaml.safe_dump(new_yaml, f, default_flow_style=False)
        logger.info(f"[ELEVATOR] Prepared dataset → {dst}/dataset.yaml")

    return {"success": True, "stats": stats, "num_classes": num_classes, "class_names": class_names}


# ──────────────────────────────────────────────────────────
# Electrical wiring detection dataset preparation
# ──────────────────────────────────────────────────────────

def prepare_electrical(dry_run: bool = False) -> Dict:
    src_root = RAW_DIR / "electrical_wiring" / "Predictive Maintenance for Electrical Wiring Faults"
    dst = OUTPUT_DIR / "electrical"

    if not src_root.exists():
        logger.error(f"Electrical wiring source not found: {src_root}")
        return {"success": False, "error": "Source not found"}

    img_root = src_root / "images"
    lbl_root = src_root / "labels"

    logger.info(f"\n[ELECTRICAL] Source: {src_root}")
    logger.info(f"[ELECTRICAL] Output: {dst}")

    # Discover classes from image filenames
    class_names_set = set()
    for split_dir in img_root.iterdir():
        if split_dir.is_dir():
            for img in split_dir.iterdir():
                if img.suffix.lower() in SUPPORTED_IMG_EXTS:
                    cls = img.stem.split("_")[0]
                    class_names_set.add(cls)

    # Map fault classes to detection classes (exclude 'normal')
    fault_classes = sorted([c for c in class_names_set if c.lower() != "normal"])
    logger.info(f"[ELECTRICAL] Fault classes for detection: {fault_classes}")
    logger.info(f"[ELECTRICAL] Excluded: 'normal' (background negative)")

    # Validate labels
    stats = {"invalid_labels": [], "images": {}, "labels": {}, "excluded_normal": 0}
    for split_dir in img_root.iterdir():
        if not split_dir.is_dir():
            continue
        split_name = split_dir.name  # train01, test01
        img_count = count_images_in(split_dir)
        stats["images"][split_name] = img_count

    for split_dir in lbl_root.iterdir():
        if not split_dir.is_dir():
            continue
        split_name = split_dir.name
        lbl_count = 0
        for label_path in split_dir.rglob("*.txt"):
            lbl_count += 1
            img_stem = label_path.stem
            cls = img_stem.split("_")[0]
            if cls.lower() == "normal":
                stats["excluded_normal"] += 1
                continue
            valid, issues = validate_yolo_label(label_path)
            if not valid:
                stats["invalid_labels"].append({
                    "file": str(label_path.relative_to(src_root)),
                    "issues": issues
                })
        stats["labels"][split_name] = lbl_count

    logger.info(f"[ELECTRICAL] Image counts: {stats['images']}")
    logger.info(f"[ELECTRICAL] Label counts: {stats['labels']}")
    logger.info(f"[ELECTRICAL] Normal (excluded): {stats['excluded_normal']} label files")
    if stats["invalid_labels"]:
        logger.warning(f"[ELECTRICAL] {len(stats['invalid_labels'])} invalid label files")
    else:
        logger.info("[ELECTRICAL] All fault labels valid ✓")

    if not dry_run:
        # Reconstruct YOLO-compatible layout at dst
        dst.mkdir(parents=True, exist_ok=True)
        for split_src, split_dst in [("train01", "train"), ("test01", "test")]:
            for kind in ["images", "labels"]:
                (dst / split_dst / kind).mkdir(parents=True, exist_ok=True)
            # Copy images (all including normal — let the model see negatives)
            src_img_split = img_root / split_src
            if src_img_split.exists():
                for img in src_img_split.iterdir():
                    if img.suffix.lower() in SUPPORTED_IMG_EXTS:
                        shutil.copy2(img, dst / split_dst / "images" / img.name)
            # Copy labels — only fault classes, skip 'normal' labels
            src_lbl_split = lbl_root / split_src
            if src_lbl_split.exists():
                for lbl in src_lbl_split.iterdir():
                    if lbl.suffix == ".txt":
                        cls = lbl.stem.split("_")[0].lower()
                        if cls != "normal":
                            shutil.copy2(lbl, dst / split_dst / "labels" / lbl.name)

        # Build class→id mapping from fault classes
        class_to_id = {c: i for i, c in enumerate(fault_classes)}
        dataset_yaml = {
            "path": str(dst.resolve()),
            "train": "train/images",
            "val": "test/images",
            "test": "test/images",
            "nc": len(fault_classes),
            "names": fault_classes,
            "nivara_notes": (
                "Electrical wiring fault detection. "
                "fault classes: damaged, disconnected, misrouted → all map to Electrical Hazard. "
                "'normal' images included as background (no labels) for false-positive suppression."
            )
        }
        with open(dst / "dataset.yaml", "w") as f:
            yaml.safe_dump(dataset_yaml, f, default_flow_style=False)
        logger.info(f"[ELECTRICAL] Prepared dataset → {dst}/dataset.yaml")

    return {
        "success": True,
        "stats": stats,
        "fault_classes": fault_classes,
        "num_classes": len(fault_classes)
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=str, default="all",
                        choices=["elevator", "electrical", "all"],
                        help="Which detection dataset to prepare")
    parser.add_argument("--dry_run", action="store_true",
                        help="Validate only, do not copy files")
    args = parser.parse_args()

    logger.info("=" * 60)
    logger.info("NIVARA DETECTION DATASET PREPARATION")
    logger.info("=" * 60)

    results = {}
    if args.source in ("elevator", "all"):
        results["elevator"] = prepare_elevator(dry_run=args.dry_run)
    if args.source in ("electrical", "all"):
        results["electrical"] = prepare_electrical(dry_run=args.dry_run)

    # Summary
    for name, r in results.items():
        status = "✓ OK" if r.get("success") else f"✗ FAILED: {r.get('error')}"
        logger.info(f"{name:15s}: {status}")

    if args.dry_run:
        logger.info("\n[DRY RUN] No files were copied.")
    else:
        logger.info("\n✓ Detection datasets prepared. Run train_detection.py to train.")


if __name__ == "__main__":
    main()
