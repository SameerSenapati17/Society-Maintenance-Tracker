# Nivara Visual Intelligence Service

Dedicated Computer Vision & Explainable AI (XAI) microservice for property maintenance incident photographs.

## Architecture

- **Classification Pipeline**: EfficientNet-B0 (Two-Stage Transfer Learning) / PyTorch 2.x
- **Detection Pipeline**: YOLOv8-compatible models (Elevator Door & Electrical Wiring)
- **Explainable AI (XAI)**: Gradient-Weighted Class Activation Mapping (Grad-CAM) on `features[-1]`
- **Design Tokens**: Nivara Brand Colormap (Slate/Navy → Indigo → Amber/Rose focal attention)
- **Readiness Lifecycle**: `"untrained"` | `"trained"` | `"ready"` | `"failed"`
- **Model Registry**: `models/registry.json` tracking all versions, checkpoints, and evaluations.

---

## 1. Canonical Taxonomy & Dataset Provenance

| # | Display Name | Slug | Classification | Detection | Source Dataset | Mapping / Status |
|:---|:---|:---|:---|:---|:---|:---|
| 1 | **Water Leakage** | `water_leakage` | Excluded | — | `water_leakage` | **UNVERIFIED** (`neg_` prefix ambiguous — excluded from training) |
| 2 | **Wall/Ceiling Damage** | `wall_ceiling_damage` | Supported | — | `damaged_construction` | Approximate transfer (`Damaged_building`, `damaged_buildings`) |
| 3 | **Garbage/Waste** | `garbage_waste` | Supported | — | `garbage_classification` | Approximate transfer (6 material classes merged) |
| 4 | **Electrical Hazard** | `electrical_hazard` | Supported | Supported | `electrical_wiring` | Moderate transfer (`damaged`, `disconnected`, `misrouted`) |
| 5 | **Broken Infrastructure** | `broken_infrastructure` | Supported | — | `damaged_construction` | Approximate transfer (`debris`) |
| 6 | **Lift/Door Damage** | `lift_door_damage` | — | Supported | `elevator_door` | Detection only (`close`, `middle`, `open` — CC BY 4.0) |
| 7 | **Parking/Road Damage** | `parking_road_damage` | Supported | — | `damaged_construction` | Approximate transfer (`Damaged_highway`) |
| 8 | **Other** | `other` | Catch-all | — | — | Real miscellaneous property incidents |

---

## 2. Directory Structure

```text
ml-service/
├── app/
│   ├── main.py               # FastAPI application with /health, /predict, /explain, /detect
│   ├── model.py              # EfficientNet-B0 PyTorch architecture
│   ├── taxonomy.py           # Canonical 8-class taxonomy and mapping rules
│   ├── preprocessing.py      # Image validation and tensor preprocessing
│   ├── explainability.py     # Grad-CAM implementation with Nivara brand colormap
│   └── schemas.py            # Pydantic response and request models
├── detection/
│   ├── prepare_detection.py  # YOLO detection dataset preparation
│   ├── train_detection.py    # YOLOv8 training wrapper
│   ├── evaluate_detection.py # mAP, precision, recall evaluation
│   ├── inference.py          # Standalone detection inference
│   └── README.md             # Detection pipeline guide
├── scripts/
│   └── audit_datasets.py     # Comprehensive raw dataset auditor
├── data/
│   ├── raw/                  # Raw source datasets
│   └── processed/            # Split classification and detection datasets
├── models/
│   ├── registry.json         # Centralized model registry
│   ├── classification/       # Trained classifier checkpoint & metadata
│   └── detection/            # Trained YOLOv8 checkpoints & metadata
├── manifests/
│   └── classification_manifest.csv  # Full sample provenance and SHA-256 hashes
├── reports/
│   ├── dataset_audit.json    # Audit results
│   ├── dataset_audit.csv     # Per-source summary
│   ├── class_distribution.csv# Per-class counts
│   ├── domain_gap_report.md  # Detailed domain gap analysis
│   ├── model_card.md         # Official model card
│   └── classification_metrics.json # Test split evaluation results
├── prepare_dataset.py        # Classification dataset ingestion & leak check
├── train.py                  # Two-stage classification training script
├── evaluate.py               # Hold-out test split evaluation
└── requirements.txt          # Python dependencies
```

---

## 3. End-to-End Execution Workflow

### Step 1: Run Dataset Audit
```bash
python scripts/audit_datasets.py
```
Generates `reports/dataset_audit.json`, `reports/dataset_audit.csv`, `reports/class_distribution.csv`.

### Step 2: Prepare Classification Dataset
```bash
# Verify with dry run first:
python prepare_dataset.py --dry_run

# Prepare dataset with SHA-256 deduplication and leakage check:
python prepare_dataset.py --raw_dir data/raw --output_dir data/processed/classification
```

### Step 3: Train EfficientNet-B0 Classifier (Two-Stage)
```bash
python train.py --data_dir data/processed/classification --output_dir models/classification --epochs 25 --freeze_epochs 10 --batch_size 32
```
- **Stage 1 (Epochs 1–10):** Frozen backbone, classifier head training (LR=1e-4)
- **Stage 2 (Epochs 11–25):** Unfreezes top 2 backbone blocks (LR=1e-5)
- Saves best checkpoint to `models/classification/nivara-visual-classifier.pt`

### Step 4: Evaluate on Hold-out Test Set
```bash
python evaluate.py --model_path models/classification/nivara-visual-classifier.pt --data_dir data/processed/classification --split test
```
Generates `reports/classification_metrics.json` (Top-1, Top-2, Top-3, balanced accuracy, macro precision/recall/F1).

### Step 5: Detection Pipeline (YOLOv8)
```bash
# Prepare detection datasets
python detection/prepare_detection.py --source all

# Train Elevator Door Detector
python detection/train_detection.py --source elevator --epochs 50 --yolo_size nano

# Train Electrical Fault Detector
python detection/train_detection.py --source electrical --epochs 50 --yolo_size nano

# Evaluate Detection
python detection/evaluate_detection.py --source elevator --split test
```

### Step 6: Start FastAPI Service
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

## Phase 4C: Licensed Dataset Acquisition

The acquisition pipeline is provenance-first. It supports local directories and explicitly licensed archives only; it does not scrape Google Images, iStock, or other public web pages. Unknown-license sources remain in the registry but are excluded from the queue and v2 dataset.

Current v1 baseline: 4,537 split images (`train=3,436`, `val=548`, `test=553`). The Phase 4C candidate queue is currently empty because existing raw sources have unverified licenses. The five-class target is `garbage_waste`, `wall_ceiling_damage`, `broken_infrastructure`, `parking_road_damage`, and `electrical_hazard`.

Run these commands from `ml-service`:

```powershell
# 1. Audit registered sources and write the queue/report
python scripts/acquire_dataset.py audit

# 2. Register a new approved source (source JSON must include license and attribution)
python scripts/acquire_dataset.py register --config path/to/source.json

# 3. Acquire/import the registered local or archive source
python scripts/acquire_dataset.py import --source SOURCE_NAME

# 4. Run quality validation
python scripts/acquire_dataset.py quality

# 5. Review only PENDING/REVIEW candidates
python scripts/review_dataset.py

# 6. Generate classification_v2 from v1 plus approved candidates
python scripts/acquire_dataset.py prepare-v2

# 7. Check current v1 class distribution
python scripts/acquire_dataset.py distribution

# 8. Check validation-set leakage against the existing manifest
python scripts/acquire_dataset.py leakage

# 9. Evaluate the unchanged baseline against the separate validation set
python evaluate.py --model_path models/classification/nivara-visual-classifier.pt --data_dir data/real_world_validation --split .
```

No model training is performed by these commands.

---

## 4. API Endpoints

### `GET /health`
Returns service operational health, model status (`"untrained"` | `"ready"`), device, and supported classes.

### `POST /predict?explain=true`
Accepts `file` (multipart upload) or JSON `{ "imageUrl": "..." }`. Returns predicted category, confidence score, top predictions, and Grad-CAM overlay/heatmap base64 strings.

### `POST /explain`
Computes and returns Grad-CAM attention heatmap overlay.

### `POST /detect?model_name=elevator`
Runs YOLOv8 object detection, returning localized bounding boxes, class labels, and confidence values.

---

## 5. Domain Gap & Human-in-the-Loop Feedback

See `reports/domain_gap_report.md` for full disclosures.

The platform collects real-world human feedback on predictions through `POST /api/complaints/:id/visual-feedback`:
- Resident/Admin confirms or corrects visual predictions
- Stored in MongoDB under `complaint.visualFeedback`
- Human-in-the-loop: AI predictions never automatically mutate complaint status, priority, or category
- Collected verified samples form future training sets for domain adaptation
