# Nivara ML Service — Dataset Sources

This document tracks the origin, license, structure, and provenance of all raw datasets
used in the Nivara Visual Intelligence pipeline.

---

## 1. Water Leakage Dataset

| Field | Value |
|:---|:---|
| **Status** | ⚠️ UNVERIFIED — EXCLUDED FROM TRAINING |
| **Location** | `data/raw/water_leakage/` |
| **Image count** | 233 flat `.jpg` files |
| **Filename pattern** | `neg_<temp>_t<sensor>_<n>.jpg` |
| **License** | Unknown — verification required |
| **Source** | Unknown (thermal imaging sensor dataset) |

### Exclusion Reason
All 233 images have filenames beginning with `neg_`. The `neg_` prefix is ambiguous:
- **Interpretation A**: Negative temperature reading (sensor polarity), meaning these ARE positive leakage samples
- **Interpretation B**: Negative class (non-leakage), meaning these are negative examples

**Until label semantics are confirmed from the original dataset source, these images are NOT used in training.** They are preserved intact at `data/raw/water_leakage/`. The manifest records them as `EXCLUDED_UNVERIFIED`.

---

## 2. Garbage Classification Dataset

| Field | Value |
|:---|:---|
| **Status** | ✓ INCLUDED — APPROXIMATE DOMAIN TRANSFER |
| **Location** | `data/raw/garbage_classification/Garbage classification/Garbage classification/<class>/` |
| **Image count** | ~2,527 across 6 classes |
| **Source classes** | `cardboard`, `glass`, `metal`, `paper`, `plastic`, `trash` |
| **Nivara mapping** | ALL → `garbage_waste` (single class) |
| **License** | Kaggle — verify before commercial use |
| **Domain gap** | HIGH — sorted recyclables in controlled settings ≠ property garbage incidents |

---

## 3. Damaged Construction Dataset

| Field | Value |
|:---|:---|
| **Status** | ✓ PARTIAL INCLUSION — APPROXIMATE DOMAIN TRANSFER |
| **Location** | `data/raw/damaged_construction/` |
| **Split structure** | `train/` and `test/` presplits |
| **License** | Unknown — verify before use |
| **Domain gap** | HIGH — large-scale construction/disaster imagery ≠ residential apartment damage |

### Class Mapping

| Source Class | Nivara Mapping | Notes |
|:---|:---|:---|
| `Damaged_building` / `damaged_buildings` | `wall_ceiling_damage` | APPROXIMATE — construction demolition |
| `debris` | `broken_infrastructure` | APPROXIMATE — rubble ≠ cracked tile |
| `Damaged_highway` | `parking_road_damage` | APPROXIMATE — highway ≠ residential parking |
| `Non-damaged_building` | **EXCLUDED — NEGATIVE** | Must NOT be used as positive training data |
| `Non-damaged_highway` | **EXCLUDED — NEGATIVE** | Must NOT be used as positive training data |

---

## 4. Electrical Wiring Faults Dataset

| Field | Value |
|:---|:---|
| **Status** | ✓ INCLUDED (faults only) — MODERATE DOMAIN RELEVANCE |
| **Location** | `data/raw/electrical_wiring/Predictive Maintenance for Electrical Wiring Faults/` |
| **Structure** | `images/train01/`, `images/test01/`, `labels/train01/`, `labels/test01/` |
| **Annotation format** | YOLO `.txt` (class cx cy w h, normalized) |
| **Image count** | ~50 images |
| **License** | Unknown — verify before production |
| **Primary use** | Detection pipeline (YOLO annotations preserved) |
| **Secondary use** | Classification (fault class images only, bbox ignored) |

### Class Mapping

| Source Class | Nivara Mapping | Notes |
|:---|:---|:---|
| `damaged` | `electrical_hazard` | Fault — valid training sample |
| `disconnected` | `electrical_hazard` | Fault — valid training sample |
| `misrouted` | `electrical_hazard` | Fault — valid training sample |
| `normal` | **EXCLUDED — NEGATIVE** | Background wiring — NOT mapped to any Nivara class |

---

## 5. Elevator Door Dataset (Roboflow)

| Field | Value |
|:---|:---|
| **Status** | ✓ DETECTION-ONLY — EXCLUDED FROM CLASSIFICATION |
| **Location** | `data/raw/elevator_door/` |
| **Structure** | Roboflow YOLOv8: `train/images/`, `train/labels/`, `valid/`, `test/` |
| **Image count** | 69 images total |
| **Annotation format** | YOLO `.txt` + `data.yaml` |
| **License** | **CC BY 4.0** — Attribution required |
| **Attribution** | Roboflow Universe — ysm-4z45w/elevator-door/dataset/1 |
| **Classes** | `close`, `middle`, `open` (door states, NOT damage indicators) |

### Exclusion from Classification
Elevator door classes represent door states (`close`/`middle`/`open`), not damage types. These images are **excluded from the classification pipeline entirely** and used only to train a detection model that can localize elevator doors in images.

---

## 6. Car Damage Assessment Dataset

| Field | Value |
|:---|:---|
| **Status** | ✗ FULLY EXCLUDED — OUT OF SCOPE |
| **Location** | `data/raw/car_damage/` |
| **Image count** | ~1,595 (flat `image/` directory) |
| **Annotation format** | CSV (`data.csv`) with columns: `image`, `classes` |
| **Classes** | `head_lamp`, `door_scratch`, `glass_shatter`, `bumper_dent`, `unknown`, etc. |
| **License** | Unknown — verify before use |

### Exclusion Reason
Car damage assessment is **outside Nivara's residential property maintenance scope**. Vehicle damage incidents are not tracked in the Nivara complaint taxonomy. This dataset is preserved for a future **Nivara Vehicle Damage Intelligence** capability but is not used in Phase 4B.

---

## Domain Gap Summary

| Dataset | Nivara Relevance | Domain Gap |
|:---|:---|:---|
| water_leakage | High (if verified) | UNVERIFIED — possibly high (thermal vs RGB) |
| garbage_classification | Moderate | HIGH — lab recyclables vs property garbage |
| damaged_construction | Low–Moderate | HIGH — demolition vs apartment walls |
| electrical_wiring | Moderate–High | MODERATE — wiring faults are relevant |
| elevator_door | Low (detection) | LOW for detection, N/A for classification |
| car_damage | None | N/A — excluded |

All domain transfer mappings are **approximate** and documented explicitly. The system will never claim production accuracy without real-world Nivara-specific evaluation.