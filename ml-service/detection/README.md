# Nivara Detection Pipeline

Sub-pipeline for object detection using YOLOv8 models.

## Purpose

The classification pipeline (EfficientNet-B0) answers:
> "What **type** of incident is visible in this image?"

The detection pipeline answers:
> "**Where** is the damaged/anomalous component in this image?"

Detection is currently supported for two domains:

| Detector | Source Dataset | Classes | License |
|:---|:---|:---|:---|
| **Elevator Door** | Roboflow Universe (elevator-door/v1) | `close`, `middle`, `open` | CC BY 4.0 |
| **Electrical Wiring** | Predictive Maintenance for Electrical Wiring Faults | `damaged`, `disconnected`, `misrouted` | Verify before production |

> **Note:** Elevator door classes (`close`, `middle`, `open`) are **door states**, not damage indicators.
> The detector is useful for locating elevator doors in images, not for classifying damage.

---

## Directory Structure

```
detection/
├── prepare_detection.py    # Dataset validation + YOLO-format assembly
├── train_detection.py      # YOLOv8 training wrapper
├── evaluate_detection.py   # mAP, precision, recall evaluation
├── inference.py            # Standalone inference script
└── README.md               # This file

data/processed/detection/
├── elevator/
│   ├── dataset.yaml
│   ├── train/images/, train/labels/
│   ├── valid/images/, valid/labels/
│   └── test/images/, test/labels/
└── electrical/
    ├── dataset.yaml
    ├── train/images/, train/labels/
    └── test/images/, test/labels/

models/detection/
├── nivara-elevator-detector.pt
├── nivara-electrical-detector.pt
├── elevator_metadata.json
├── electrical_metadata.json
└── (registry.json lives in models/)
```

---

## Quick Start

### 1. Prepare datasets

```bash
# From ml-service/ root
python detection/prepare_detection.py --source elevator
python detection/prepare_detection.py --source electrical
# Or both:
python detection/prepare_detection.py --source all
```

### 2. Train models

```bash
# Install ultralytics first
pip install ultralytics

python detection/train_detection.py --source elevator --epochs 50 --yolo_size nano
python detection/train_detection.py --source electrical --epochs 50 --yolo_size nano
```

> The `--yolo_size` argument selects the base YOLOv8 variant: `nano` (default, fastest), `small`, `medium`.
> For small datasets (elevator: 69 images), `nano` is strongly recommended.

### 3. Evaluate

```bash
python detection/evaluate_detection.py --source elevator --split test
python detection/evaluate_detection.py --source electrical --split test
```

### 4. Run inference

```bash
python detection/inference.py --image /path/to/image.jpg --source elevator --conf 0.35
```

---

## API Endpoint

Once trained, detection models are accessible through the FastAPI service:

```
POST /detect?model_name=elevator
POST /detect?model_name=electrical
Content-Type: multipart/form-data  (file upload)
    or
Content-Type: application/json     { "imageUrl": "https://..." }
```

**Response (trained):**
```json
{
  "modelStatus": "ready",
  "detectorModel": "nivara-elevator-detector",
  "detections": [
    { "label": "close", "confidence": 0.92, "bbox": { "x1": 120, "y1": 45, "x2": 380, "y2": 620 } }
  ],
  "imageWidth": 640,
  "imageHeight": 480,
  "inferenceMs": 28.4
}
```

**Response (untrained):**
```json
{
  "modelStatus": "untrained",
  "detectorModel": "nivara-elevator-detector",
  "detections": [],
  "message": "Detection model 'elevator' is not yet trained..."
}
```

---

## Domain Gap & Limitations

- **Elevator dataset**: 69 images total. Small dataset — model may not generalize to diverse elevator designs.
- **Electrical dataset**: ~50 images with YOLO annotations. Very small — high variance in evaluation metrics expected.
- **No real Nivara property images** exist in either training set.
- **Production accuracy claims are NOT valid** until real-world evaluation is performed.
- **modelStatus** will always reflect actual model state — never auto-promoted without training.

---

## Human Feedback Loop

Detected bounding boxes are stored in `complaint.visualAnalysis.detections` (MongoDB).
Resident and admin feedback is stored in `complaint.visualFeedback`.

Long-term improvement path:
1. Resident submits photo → AI detects + predicts
2. Resident/admin provides feedback (`accepted: true/false`)
3. Feedback accumulates as `visualFeedback` records
4. Verified feedback items become candidate training samples for future model versions
5. Retrain with expanded Nivara-specific dataset → new model version

**Automatic online retraining is NOT implemented.** All retraining is explicit and human-initiated.
