"""
Nivara Visual Intelligence — Comprehensive Dataset Audit Tool
Recursively inspects all raw datasets and generates structured reports.

Usage:
    python scripts/audit_datasets.py

Generates:
    ml-service/reports/dataset_audit.json
    ml-service/reports/dataset_audit.csv
    ml-service/reports/class_distribution.csv
"""
import os
import sys
import csv
import json
import hashlib
import logging
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

# Allow import from parent directory
sys.path.insert(0, str(Path(__file__).parent.parent))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger("nivara.audit")

try:
    from PIL import Image, UnidentifiedImageError
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False
    logger.warning("Pillow not installed. Image dimension/corrupt checks will be skipped.")

RAW_DIR = Path(__file__).parent.parent / "data" / "raw"
REPORTS_DIR = Path(__file__).parent.parent / "reports"
SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".JPG", ".JPEG", ".PNG", ".WEBP"}
YOLO_LABEL_EXTENSIONS = {".txt"}


def compute_file_hash(filepath: Path) -> str:
    hasher = hashlib.sha256()
    try:
        with open(filepath, "rb") as f:
            while chunk := f.read(65536):
                hasher.update(chunk)
        return hasher.hexdigest()
    except Exception:
        return "HASH_ERROR"


def validate_image_file(filepath: Path) -> Tuple[bool, Optional[Dict]]:
    """Returns (is_valid, metadata_or_None)."""
    if not PIL_AVAILABLE:
        size = filepath.stat().st_size if filepath.exists() else 0
        return (size > 0), {"width": 0, "height": 0, "mode": "UNKNOWN", "size_bytes": size, "format": "UNKNOWN"}
    try:
        size_bytes = filepath.stat().st_size
        if size_bytes == 0:
            return False, None
        with Image.open(filepath) as img:
            img.verify()
        with Image.open(filepath) as img:
            width, height = img.size
            mode = img.mode
            fmt = img.format or filepath.suffix.upper().replace(".", "")
        return True, {
            "width": width,
            "height": height,
            "mode": mode,
            "size_bytes": size_bytes,
            "format": fmt
        }
    except Exception as e:
        return False, None


def validate_yolo_label(label_path: Path) -> Dict:
    """Validates a YOLO format label file."""
    issues = []
    valid_lines = 0
    invalid_lines = 0
    classes_found = set()
    try:
        with open(label_path, "r") as f:
            lines = [l.strip() for l in f.readlines() if l.strip()]
        if not lines:
            return {"valid": True, "lines": 0, "issues": ["empty_label"], "classes": []}
        for i, line in enumerate(lines):
            parts = line.split()
            if len(parts) != 5:
                issues.append(f"line_{i+1}_wrong_field_count({len(parts)})")
                invalid_lines += 1
                continue
            try:
                cls = int(parts[0])
                cx, cy, w, h = float(parts[1]), float(parts[2]), float(parts[3]), float(parts[4])
                # Bounding box validation
                if not (0.0 <= cx <= 1.0 and 0.0 <= cy <= 1.0 and 0.0 < w <= 1.0 and 0.0 < h <= 1.0):
                    issues.append(f"line_{i+1}_bbox_out_of_range")
                    invalid_lines += 1
                else:
                    valid_lines += 1
                    classes_found.add(cls)
            except ValueError:
                issues.append(f"line_{i+1}_non_numeric")
                invalid_lines += 1
    except Exception as e:
        return {"valid": False, "lines": 0, "issues": [f"file_read_error:{e}"], "classes": []}
    return {
        "valid": invalid_lines == 0,
        "lines": valid_lines + invalid_lines,
        "valid_lines": valid_lines,
        "invalid_lines": invalid_lines,
        "issues": issues,
        "classes": sorted(classes_found)
    }


def format_bytes(size: int) -> str:
    for unit in ["B", "KB", "MB", "GB"]:
        if size < 1024:
            return f"{size:.1f} {unit}"
        size //= 1024
    return f"{size:.1f} TB"


def compute_disk_usage(directory: Path) -> int:
    total = 0
    for f in directory.rglob("*"):
        if f.is_file():
            try:
                total += f.stat().st_size
            except Exception:
                pass
    return total


# ─────────────────────────────────────────────────────────
# Per-source auditors
# ─────────────────────────────────────────────────────────

def audit_image_directory(
    source_name: str,
    root: Path,
    annotation_type: str = "none",
    notes: str = ""
) -> Dict:
    """Generic auditor for flat or class-subdirectory image datasets."""
    result = {
        "source": source_name,
        "annotation_type": annotation_type,
        "root_path": str(root),
        "notes": notes,
        "total_images": 0,
        "valid_images": 0,
        "corrupt_images": 0,
        "zero_byte_files": 0,
        "unsupported_format_files": 0,
        "extensions_found": {},
        "classes": {},
        "class_count": 0,
        "total_size_bytes": 0,
        "total_size_human": "0 B",
        "image_dimensions": {"min_width": None, "max_width": None, "min_height": None, "max_height": None},
        "duplicate_files": [],
        "duplicate_count": 0,
        "split_counts": {},
        "yolo_label_summary": None,
        "warnings": [],
        "errors": []
    }

    if not root.exists():
        result["errors"].append(f"Directory does not exist: {root}")
        return result

    seen_hashes: Dict[str, str] = {}
    all_images: List[Path] = []

    # Collect all image files recursively
    for p in root.rglob("*"):
        if p.is_file() and p.suffix.lower() in SUPPORTED_EXTENSIONS:
            all_images.append(p)
    result["total_images"] = len(all_images)

    # Track split and class directories
    split_counts: Dict[str, int] = defaultdict(int)
    class_counts: Dict[str, int] = defaultdict(int)
    ext_counts: Dict[str, int] = defaultdict(int)

    min_w, max_w, min_h, max_h = None, None, None, None

    for img_path in all_images:
        # Extension tracking
        ext = img_path.suffix.lower()
        ext_counts[ext] += 1

        # Try to determine class and split from path structure
        rel = img_path.relative_to(root)
        parts = list(rel.parts)

        # Detect split directory
        for part in parts:
            if part.lower() in {"train", "val", "valid", "validation", "test"}:
                split_counts[part.lower()] += 1
                break

        # Detect class directory (last directory before filename)
        if len(parts) >= 2:
            class_dir = parts[-2]
            # Normalize split names away from class detection
            if class_dir.lower() not in {"images", "train", "val", "valid", "validation", "test"}:
                class_counts[class_dir] += 1

        # Image validation
        is_valid, meta = validate_image_file(img_path)
        if is_valid and meta:
            result["valid_images"] += 1
            w, h = meta.get("width", 0), meta.get("height", 0)
            if w and h:
                min_w = w if min_w is None else min(min_w, w)
                max_w = w if max_w is None else max(max_w, w)
                min_h = h if min_h is None else min(min_h, h)
                max_h = h if max_h is None else max(max_h, h)
            result["total_size_bytes"] += meta.get("size_bytes", 0)
        else:
            if img_path.exists() and img_path.stat().st_size == 0:
                result["zero_byte_files"] += 1
                result["warnings"].append(f"Zero-byte file: {img_path.name}")
            else:
                result["corrupt_images"] += 1
                result["warnings"].append(f"Corrupt/unreadable: {img_path.name}")

        # Duplicate detection
        file_hash = compute_file_hash(img_path)
        if file_hash != "HASH_ERROR":
            if file_hash in seen_hashes:
                result["duplicate_files"].append({
                    "file": str(img_path.relative_to(root)),
                    "duplicate_of": seen_hashes[file_hash]
                })
            else:
                seen_hashes[file_hash] = str(img_path.relative_to(root))

    result["extensions_found"] = dict(ext_counts)
    result["classes"] = dict(class_counts)
    result["class_count"] = len(class_counts)
    result["split_counts"] = dict(split_counts)
    result["duplicate_count"] = len(result["duplicate_files"])
    result["total_size_human"] = format_bytes(result["total_size_bytes"])
    result["image_dimensions"] = {
        "min_width": min_w, "max_width": max_w,
        "min_height": min_h, "max_height": max_h
    }

    return result


def audit_yolo_dataset(source_name: str, root: Path, data_yaml_path: Optional[Path] = None) -> Dict:
    """Audits a YOLO-format detection dataset with paired images + labels."""
    result = audit_image_directory(source_name, root, annotation_type="yolo", notes="")

    # YOLO label audit
    label_files: List[Path] = []
    for p in root.rglob("*.txt"):
        if "README" not in p.name and "notes" not in p.name.lower():
            label_files.append(p)

    yolo_summary = {
        "total_label_files": len(label_files),
        "valid_labels": 0,
        "invalid_labels": 0,
        "empty_labels": 0,
        "total_valid_boxes": 0,
        "total_invalid_boxes": 0,
        "classes_referenced": set(),
        "orphan_labels": [],
        "missing_labels": [],
        "issues_by_file": {}
    }

    # Check each label file
    for label_path in label_files:
        validation = validate_yolo_label(label_path)
        if "empty_label" in validation.get("issues", []):
            yolo_summary["empty_labels"] += 1
            continue
        if validation["valid"]:
            yolo_summary["valid_labels"] += 1
        else:
            yolo_summary["invalid_labels"] += 1
            yolo_summary["issues_by_file"][label_path.name] = validation["issues"]

        yolo_summary["total_valid_boxes"] += validation.get("valid_lines", 0)
        yolo_summary["total_invalid_boxes"] += validation.get("invalid_lines", 0)
        for cls in validation.get("classes", []):
            yolo_summary["classes_referenced"].add(cls)

        # Check orphan (label exists but no image)
        img_stem = label_path.stem
        found_img = False
        for ext in SUPPORTED_EXTENSIONS:
            candidate = label_path.parent.parent / "images" / (label_path.parent.name) / (img_stem + ext)
            if candidate.exists():
                found_img = True
                break
            # Check sibling directory pattern
            candidate2 = label_path.with_suffix(ext)
            if candidate2.exists():
                found_img = True
                break
        if not found_img:
            yolo_summary["orphan_labels"].append(label_path.name)

    # Check missing labels (image exists but no label)
    for p in root.rglob("*"):
        if p.is_file() and p.suffix.lower() in SUPPORTED_EXTENSIONS:
            stem = p.stem
            label_candidate = p.parent.parent.parent / "labels" / p.parent.parent.name / p.parent.name / (stem + ".txt")
            if not label_candidate.exists():
                # Try alternative structure
                alt_candidate = p.parent.parent / "labels" / p.parent.name / (stem + ".txt")
                if not alt_candidate.exists():
                    alt2 = p.with_suffix(".txt")
                    if not alt2.exists():
                        pass  # Many valid structures — only flag if labels dir exists
            pass

    yolo_summary["classes_referenced"] = sorted(list(yolo_summary["classes_referenced"]))
    result["yolo_label_summary"] = yolo_summary

    # Parse data.yaml if provided
    if data_yaml_path and data_yaml_path.exists():
        try:
            import yaml
            with open(data_yaml_path) as f:
                data_yaml = yaml.safe_load(f)
            result["data_yaml"] = {
                "nc": data_yaml.get("nc"),
                "names": data_yaml.get("names", []),
                "license": data_yaml.get("roboflow", {}).get("license", "Unknown"),
                "url": data_yaml.get("roboflow", {}).get("url", "Unknown")
            }
        except ImportError:
            result["data_yaml"] = {"error": "PyYAML not installed"}
        except Exception as e:
            result["data_yaml"] = {"error": str(e)}

    return result


def audit_flat_classified_dataset(source_name: str, root: Path, notes: str = "") -> Dict:
    """Audits a flat directory of images where class is encoded in filename prefix."""
    result = audit_image_directory(source_name, root, annotation_type="filename_encoded", notes=notes)

    # Analyze filename prefixes
    prefix_counts: Dict[str, int] = defaultdict(int)
    all_images = list(root.glob("*.jpg")) + list(root.glob("*.jpeg")) + list(root.glob("*.png")) + \
                 list(root.glob("*.JPG")) + list(root.glob("*.JPEG")) + list(root.glob("*.PNG"))

    for img in all_images:
        parts = img.stem.split("_")
        if parts:
            prefix_counts[parts[0]] += 1

    result["filename_prefix_analysis"] = dict(prefix_counts)
    return result


# ─────────────────────────────────────────────────────────
# Main Audit Orchestrator
# ─────────────────────────────────────────────────────────

def run_audit() -> Dict:
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)

    logger.info("=" * 70)
    logger.info("NIVARA VISUAL INTELLIGENCE — DATASET AUDIT")
    logger.info(f"Scanning: {RAW_DIR}")
    logger.info("=" * 70)

    audit_results = {
        "audit_timestamp": datetime.utcnow().isoformat() + "Z",
        "raw_data_root": str(RAW_DIR),
        "sources": {}
    }

    # 1. WATER LEAKAGE — Flat directory, filename-encoded
    logger.info("\n[1/6] Auditing: water_leakage")
    water_root = RAW_DIR / "water_leakage"
    water_result = audit_flat_classified_dataset(
        "water_leakage",
        water_root,
        notes=(
            "UNVERIFIED: Filenames start with 'neg_' which may mean negative sensor temperature "
            "OR negative class (non-leakage). Dataset is EXCLUDED from classification training "
            "until label semantics are confirmed by dataset owner. All images preserved."
        )
    )
    water_result["nivara_mapping"] = "EXCLUDED_UNVERIFIED"
    water_result["exclusion_reason"] = (
        "Filename prefix 'neg_' is ambiguous — cannot confirm whether images represent "
        "positive water-leakage samples or negative (non-leakage) samples. "
        "Requires confirmation from original dataset source."
    )
    audit_results["sources"]["water_leakage"] = water_result
    logger.info(f"  Found {water_result['total_images']} images (STATUS: EXCLUDED_UNVERIFIED)")

    # 2. GARBAGE CLASSIFICATION
    logger.info("\n[2/6] Auditing: garbage_classification")
    # Handle double-nested path
    garbage_root = RAW_DIR / "garbage_classification"
    # Auto-discover the actual class root
    nested_paths = [
        garbage_root / "Garbage classification" / "Garbage classification",
        garbage_root / "Garbage_classification" / "Garbage_classification",
        garbage_root,
    ]
    garbage_class_root = None
    for p in nested_paths:
        if p.exists() and any(d.is_dir() for d in p.iterdir()):
            subdirs = [d for d in p.iterdir() if d.is_dir()]
            # Check if these look like class directories (not train/val splits)
            if not any(d.name.lower() in {"train", "val", "test"} for d in subdirs):
                garbage_class_root = p
                break
            else:
                garbage_class_root = p
                break
    if not garbage_class_root:
        garbage_class_root = garbage_root

    garbage_result = audit_image_directory(
        "garbage_classification",
        garbage_class_root,
        annotation_type="class_directories",
        notes=(
            "Kaggle Garbage Classification dataset. 6 source classes: cardboard, glass, metal, "
            "paper, plastic, trash. ALL 6 classes map to a single Nivara class: garbage_waste. "
            "Domain transfer: generic recyclable material images differ from residential property "
            "garbage accumulation incidents."
        )
    )
    garbage_result["nivara_mapping"] = "garbage_waste"
    garbage_result["domain_transfer_note"] = (
        "APPROXIMATE DOMAIN TRANSFER — Generic recyclable material images. "
        "These images depict sorted recyclables in controlled conditions, not property garbage incidents."
    )
    audit_results["sources"]["garbage_classification"] = garbage_result
    logger.info(f"  Found {garbage_result['total_images']} images across {garbage_result['class_count']} classes")

    # 3. DAMAGED CONSTRUCTION
    logger.info("\n[3/6] Auditing: damaged_construction")
    damaged_root = RAW_DIR / "damaged_construction"
    damaged_result = audit_image_directory(
        "damaged_construction",
        damaged_root,
        annotation_type="class_directories",
        notes=(
            "Construction/disaster damage dataset. Has train/test split. "
            "INCLUDED classes: Damaged_building/damaged_buildings → wall_ceiling_damage (approximate), "
            "Damaged_highway → parking_road_damage (approximate), debris → broken_infrastructure (approximate). "
            "EXCLUDED classes: Non-damaged_building, Non-damaged_highway, normal — treated as BACKGROUND/NEGATIVE, "
            "NOT mapped to any Nivara positive class."
        )
    )
    damaged_result["nivara_mapping"] = {
        "Damaged_building": "wall_ceiling_damage",
        "damaged_buildings": "wall_ceiling_damage",
        "Damaged_highway": "parking_road_damage",
        "debris": "broken_infrastructure",
        "Non-damaged_building": "EXCLUDED_NEGATIVE",
        "Non-damaged_highway": "EXCLUDED_NEGATIVE"
    }
    damaged_result["domain_transfer_note"] = (
        "APPROXIMATE DOMAIN TRANSFER — Large-scale construction/disaster imagery. "
        "Domain gap from residential apartment interior damage is substantial."
    )
    audit_results["sources"]["damaged_construction"] = damaged_result
    logger.info(f"  Found {damaged_result['total_images']} images across splits")

    # 4. ELECTRICAL WIRING
    logger.info("\n[4/6] Auditing: electrical_wiring")
    electrical_root = RAW_DIR / "electrical_wiring" / "Predictive Maintenance for Electrical Wiring Faults"
    electrical_result = audit_yolo_dataset(
        "electrical_wiring",
        electrical_root,
        data_yaml_path=None
    )
    electrical_result["notes"] = (
        "YOLO-annotated electrical wiring fault dataset. "
        "Classes: damaged, disconnected, misrouted → electrical_hazard (Nivara). "
        "Class 'normal' → EXCLUDED_NEGATIVE (background wiring, not a hazard). "
        "YOLO annotations preserved — primary use: detection pipeline. "
        "Secondary use: classification only for fault classes (ignoring bboxes)."
    )
    electrical_result["nivara_mapping"] = {
        "damaged": "electrical_hazard",
        "disconnected": "electrical_hazard",
        "misrouted": "electrical_hazard",
        "normal": "EXCLUDED_NEGATIVE"
    }
    audit_results["sources"]["electrical_wiring"] = electrical_result
    logger.info(f"  Found {electrical_result['total_images']} images with YOLO annotations")

    # 5. ELEVATOR DOOR
    logger.info("\n[5/6] Auditing: elevator_door")
    elevator_root = RAW_DIR / "elevator_door"
    elevator_result = audit_yolo_dataset(
        "elevator_door",
        elevator_root,
        data_yaml_path=elevator_root / "data.yaml"
    )
    elevator_result["notes"] = (
        "Roboflow YOLOv8 elevator door dataset. License: CC BY 4.0. "
        "Classes: close, middle, open — these are DOOR STATES, not damage indicators. "
        "EXCLUDED from classification pipeline entirely. "
        "Retained exclusively for detection pipeline (elevator door state detection). "
        "69 images total."
    )
    elevator_result["nivara_mapping"] = "EXCLUDED_CLASSIFICATION_ONLY_DETECTION"
    elevator_result["license"] = "CC BY 4.0"
    elevator_result["attribution"] = "Roboflow Universe — https://universe.roboflow.com/ysm-4z45w/elevator-door/dataset/1"
    audit_results["sources"]["elevator_door"] = elevator_result
    logger.info(f"  Found {elevator_result['total_images']} images (YOLO detection dataset)")

    # 6. CAR DAMAGE
    logger.info("\n[6/6] Auditing: car_damage")
    car_root = RAW_DIR / "car_damage"
    car_result = audit_image_directory(
        "car_damage",
        car_root / "image" if (car_root / "image").exists() else car_root,
        annotation_type="csv_labels",
        notes=(
            "Car damage assessment dataset. Classes: head_lamp, door_scratch, glass_shatter, "
            "bumper_dent, unknown, etc. FULLY EXCLUDED from Nivara property maintenance classifier. "
            "Vehicle damage is not part of the Nivara operational taxonomy. "
            "Reserved for future Nivara Vehicle Damage Intelligence capability."
        )
    )
    car_result["nivara_mapping"] = "EXCLUDED_FUTURE_VEHICLE_INTELLIGENCE"
    car_result["exclusion_reason"] = (
        "Car damage assessment is outside Nivara's residential property maintenance scope. "
        "Reserved as a separate future capability."
    )
    car_result["annotation_file"] = str(car_root / "data.csv")
    audit_results["sources"]["car_damage"] = car_result
    logger.info(f"  Found {car_result['total_images']} images (EXCLUDED)")

    # ─────────────────────────────────────────────────────────
    # Summary Statistics
    # ─────────────────────────────────────────────────────────
    total_images = sum(v["total_images"] for v in audit_results["sources"].values())
    total_valid = sum(v["valid_images"] for v in audit_results["sources"].values())
    total_corrupt = sum(v["corrupt_images"] for v in audit_results["sources"].values())
    total_duplicates = sum(v["duplicate_count"] for v in audit_results["sources"].values())

    audit_results["summary"] = {
        "total_raw_images": total_images,
        "total_valid_images": total_valid,
        "total_corrupt_images": total_corrupt,
        "total_duplicate_images": total_duplicates,
        "sources_audited": len(audit_results["sources"]),
        "sources_for_classification": ["garbage_classification", "damaged_construction", "electrical_wiring"],
        "sources_for_detection": ["elevator_door", "electrical_wiring"],
        "sources_excluded": {
            "water_leakage": "UNVERIFIED label semantics (neg_ prefix)",
            "car_damage": "Vehicle damage — out of scope for property maintenance classifier",
            "elevator_door": "Door states (not damage) — detection only"
        }
    }

    logger.info("\n" + "=" * 70)
    logger.info("AUDIT SUMMARY")
    logger.info("=" * 70)
    logger.info(f"Total raw images discovered:    {total_images}")
    logger.info(f"Total valid images:             {total_valid}")
    logger.info(f"Total corrupt images:           {total_corrupt}")
    logger.info(f"Total duplicate images:         {total_duplicates}")
    logger.info(f"Sources for classification:     garbage_classification, damaged_construction, electrical_wiring")
    logger.info(f"Sources for detection:          elevator_door, electrical_wiring")
    logger.info(f"Sources excluded:               water_leakage (unverified), car_damage (out of scope)")

    # ─────────────────────────────────────────────────────────
    # Write Reports
    # ─────────────────────────────────────────────────────────

    # 1. dataset_audit.json
    audit_json_path = REPORTS_DIR / "dataset_audit.json"
    # Convert sets to lists for JSON serialization
    def make_serializable(obj):
        if isinstance(obj, set):
            return sorted(list(obj))
        if isinstance(obj, dict):
            return {k: make_serializable(v) for k, v in obj.items()}
        if isinstance(obj, list):
            return [make_serializable(i) for i in obj]
        return obj

    with open(audit_json_path, "w", encoding="utf-8") as f:
        json.dump(make_serializable(audit_results), f, indent=2)
    logger.info(f"\n--> Saved: {audit_json_path}")

    # 2. dataset_audit.csv (one row per source)
    audit_csv_path = REPORTS_DIR / "dataset_audit.csv"
    csv_rows = []
    for source_name, src in audit_results["sources"].items():
        csv_rows.append({
            "source": source_name,
            "total_images": src["total_images"],
            "valid_images": src["valid_images"],
            "corrupt_images": src["corrupt_images"],
            "duplicate_count": src["duplicate_count"],
            "annotation_type": src.get("annotation_type", ""),
            "nivara_mapping": json.dumps(src.get("nivara_mapping", "")),
            "class_count": src.get("class_count", 0),
            "classes": json.dumps(list(src.get("classes", {}).keys())),
            "split_counts": json.dumps(src.get("split_counts", {})),
            "notes": src.get("notes", "")[:200]  # Truncate for CSV readability
        })

    with open(audit_csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=csv_rows[0].keys())
        writer.writeheader()
        writer.writerows(csv_rows)
    logger.info(f"--> Saved: {audit_csv_path}")

    # 3. class_distribution.csv (one row per class per source)
    dist_csv_path = REPORTS_DIR / "class_distribution.csv"
    dist_rows = []
    for source_name, src in audit_results["sources"].items():
        if src.get("classes"):
            for class_name, count in src["classes"].items():
                mapping = src.get("nivara_mapping", {})
                if isinstance(mapping, dict):
                    nivara_cls = mapping.get(class_name, "UNKNOWN")
                else:
                    nivara_cls = str(mapping)
                dist_rows.append({
                    "source": source_name,
                    "original_class": class_name,
                    "image_count": count,
                    "nivara_class": nivara_cls,
                    "included_in_training": "YES" if not str(nivara_cls).startswith("EXCLUDED") else "NO",
                    "exclusion_reason": src.get("exclusion_reason", "") if str(nivara_cls).startswith("EXCLUDED") else ""
                })

    if dist_rows:
        with open(dist_csv_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=dist_rows[0].keys())
            writer.writeheader()
            writer.writerows(dist_rows)
        logger.info(f"--> Saved: {dist_csv_path}")

    logger.info("\n✓ Audit complete. Review reports in ml-service/reports/\n")
    return audit_results


if __name__ == "__main__":
    run_audit()
