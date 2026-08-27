# Nivara Visual Classifier — Model Card

## Model Details

- **Model Name:** Nivara Visual Classifier
- **Version:** Phase 4B Baseline (Pre-training state: `modelStatus: "untrained"`)
- **Architecture:** EfficientNet-B0 backbone (ImageNet pre-trained feature extractor) + Nivara custom classification head:
  - `AdaptiveAvgPool2d((1, 1))`
  - `Flatten()`
  - `Dropout(p=0.4)`
  - `Linear(1280, 256)`
  - `SiLU()`
  - `Dropout(p=0.2)`
  - `Linear(256, num_classes)`
- **Explainability:** Grad-CAM on `features[-1]` with Nivara Indigo-Rose colormap visualization.
- **Framework:** PyTorch ≥ 2.0, Torchvision ≥ 0.15, FastAPI, Uvicorn.
- **Model Registry Status:** Initialized in `models/registry.json`.

---

## Intended Use

- **Primary Intended Use:** Assist residential society facility managers and residents by automatically analyzing uploaded maintenance incident photos, predicting incident categories, generating explainability heatmaps, and suggesting relevant triage classifications.
- **Primary Intended Users:** Society Maintenance Admins, Property Operations Staff, Society Residents.
- **Out-of-Scope Uses:**
  - Automated dispatch without human approval.
  - Structural engineering structural-load safety assessments.
  - Vehicle damage claims assessment (out of scope).
  - Life-safety critical fire/gas emergency automated decision-making.

---

## Taxonomy & Classes

| Canonical Slug | Display Name | Training Status | Domain Transfer Note |
|:---|:---|:---|:---|
| `wall_ceiling_damage` | Wall/Ceiling Damage | Supported | Approximate (construction demolition proxy) |
| `garbage_waste` | Garbage/Waste | Supported | Approximate (6 material classes merged) |
| `electrical_hazard` | Electrical Hazard | Supported | Moderate (wiring faults dataset) |
| `broken_infrastructure` | Broken Infrastructure | Supported | Approximate (debris proxy) |
| `parking_road_damage` | Parking/Road Damage | Supported | Approximate (highway damage proxy) |
| `other` | Other | Catch-all | Background/unmatched physical anomalies |
| `water_leakage` | Water Leakage | Excluded | UNVERIFIED (`neg_` prefix ambiguous) |
| `lift_door_damage` | Lift/Door Damage | Excluded | Detection-only (`elevator_door` dataset) |

---

## Training & Evaluation Data

- **Training Strategy:** Two-Stage Transfer Learning
  - Stage 1: Frozen backbone, train classification head only (AdamW, LR=1e-4)
  - Stage 2: Unfreeze top 2 backbone blocks for fine-tuning (AdamW, LR=1e-5)
  - Loss: Class-weighted CrossEntropyLoss
  - Sampling: WeightedRandomSampler (counteracts class imbalance)
- **Data Provenance:** Manifest generated at `manifests/classification_manifest.csv` with SHA-256 deduplication and cross-split leak detection.
- **Exclusion Policy:**
  - Water leakage images marked `UNVERIFIED` due to ambiguous `neg_` prefix.
  - Non-damaged building/highway images excluded from positive training data.
  - Car damage images excluded (out of scope).

---

## Ethical Considerations & Limitations

- **Domain Gap:** Proxy datasets differ significantly from resident smartphone photos.
- **Model Status Lifecycle:** The model is explicitly tagged with `modelStatus = "untrained"` until real training and validation on hold-out test data is completed. It is never falsely promoted to `"ready"`.
- **Human-in-the-Loop:** Predictions never automatically mutate complaint status, priority, or category. Feedback is collected via `visualFeedback` for verified domain adaptation.
