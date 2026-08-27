# Nivara Visual Intelligence — Domain Gap Report

**Version:** Phase 4B  
**Date:** 2026-08-24  
**Status:** Pre-training — `modelStatus: "untrained"`

> ⚠️ This report is a required disclosure. It documents the known gaps between the training datasets used and the real-world property maintenance imagery that Nivara residents will submit. The system cannot be declared production-ready without real-world validation.

---

## 1. Executive Summary

The Nivara Phase 4B visual intelligence pipeline is trained on **publicly available proxy datasets** that approximate (but do not replicate) the imagery that Nivara residents will upload when filing maintenance complaints. Six key domain gaps have been identified. Each gap increases the risk that model predictions on real Nivara images will differ from predictions on training/test data.

**Real-world Nivara resident feedback is required for domain adaptation.** The human feedback loop is built into the system for this purpose.

---

## 2. Per-Domain Gap Analysis

### 2.1 Water Leakage

| Attribute | Training Dataset | Real Nivara Images |
|:---|:---|:---|
| Image type | Thermal infrared | Optical RGB (smartphone) |
| Perspective | Sensor array scans | Hand-held, angled photos |
| Labels | UNVERIFIED (`neg_` prefix ambiguous) | Resident-confirmed incidents |
| Image count | 233 (excluded from training) | 0 |

**Gap: CRITICAL**  
The 233 available water leakage images use a thermal imaging format with filename-encoded negative temperature readings. It is unclear whether `neg_` denotes negative temperature or a negative (non-leakage) class. Until confirmed, this dataset is excluded entirely. The classifier currently has **no water leakage training data** and will predict this class through training data from other sources that the model may learn to associate with leakage patterns — this cannot be relied upon.

**Mitigation:** Resident photos confirmed as water leakage through the feedback loop should be accumulated and used to retrain this class from scratch.

---

### 2.2 Garbage / Waste

| Attribute | Training Dataset | Real Nivara Images |
|:---|:---|:---|
| Image type | Clean studio photographs of recyclables | Smartphone photos of cluttered common areas |
| Classes | Sorted by material (cardboard, glass, etc.) | Mixed garbage accumulation incidents |
| Context | Lab/table background | Outdoor bins, corridors, parking lots |
| Image count | ~2,527 | 0 |

**Gap: HIGH**  
The Kaggle Garbage Classification dataset shows individual recyclable materials in controlled conditions. Resident garbage incidents typically show overflowing bins, spilled waste bags, or accumulated garbage in corridors — not sorted material photographs. A model trained on sorted recyclables may fail to detect contextual garbage incidents.

**Mitigation:** Class-weighted training and augmentation reduce (but don't eliminate) this gap. Resident feedback is essential.

---

### 2.3 Wall / Ceiling Damage

| Attribute | Training Dataset | Real Nivara Images |
|:---|:---|:---|
| Image type | Aerial/wide-angle construction demolition | Close-up indoor residential walls |
| Scale | Building-level damage | Room-scale plaster/paint damage |
| Content | Collapsed structures, exposed rebar | Cracks, damp stains, peeling paint |
| Image count | ~limited (damaged_buildings class) | 0 |

**Gap: HIGH**  
Construction demolition images bear little visual resemblance to indoor apartment wall/ceiling damage such as peeling paint, damp patches, or hairline cracks. The model trained on this proxy may develop poor precision for real apartment damage.

---

### 2.4 Electrical Hazard

| Attribute | Training Dataset | Real Nivara Images |
|:---|:---|:---|
| Image type | Industrial wiring close-ups with YOLO annotations | Resident smartphone photos of switchboards/wiring |
| Context | Controlled inspection environment | Common area electrical panels, exposed wires |
| Dataset size | ~50 images (very small) | 0 |

**Gap: MODERATE** *(most relevant dataset, but smallest)*  
Electrical wiring fault images are the most domain-relevant dataset available. However, with only ~50 images, the model has very limited statistical signal. Overfitting is a significant risk. Very high variance in evaluation metrics is expected.

**Mitigation:** Weighted sampling, augmentation, and Stage 2 fine-tuning are applied but cannot compensate for fundamental data scarcity.

---

### 2.5 Broken Infrastructure

| Attribute | Training Dataset | Real Nivara Images |
|:---|:---|:---|
| Image type | Post-disaster debris (rubble, wreckage) | Cracked tiles, broken handrails, gate damage |
| Scale | Scene-level disaster debris | Object-level fixture damage |
| Image count | Debris subset of damaged_construction | 0 |

**Gap: HIGH**  
Post-disaster rubble images are visually very different from residential infrastructure failures. A broken handrail photo will not closely resemble collapsed building imagery.

---

### 2.6 Parking / Road Damage

| Attribute | Training Dataset | Real Nivara Images |
|:---|:---|:---|
| Image type | Highway-scale road damage (aerial/wide shots) | Residential driveway, compound road surface |
| Scale | Highway lanes and intersections | Society parking lot, speed bumps |
| Image count | Damaged_highway subset | 0 |

**Gap: HIGH**  
Highway damage photography at road level or aerial view differs substantially from a resident photographing a pothole in a residential parking lot.

---

### 2.7 Lift / Door Damage (Detection Only)

| Attribute | Training Dataset | Real Nivara Images |
|:---|:---|:---|
| Dataset | Elevator door — 69 images (Roboflow, CC BY 4.0) | Resident photos of jammed/damaged elevator doors |
| Classes | Door states (close/middle/open) | Actual damage indicators |

**Gap: N/A for Classification** *(excluded from classifier)*  
**Gap: MODERATE for Detection** — The elevator door dataset captures door states but does not contain images of actual door damage (jammed panels, broken mechanisms). The detection model can locate doors but cannot distinguish a damaged door from a closed one without damage-specific training data.

---

## 3. Thermal vs. Optical Image Mismatch (Water Leakage)

This is the most technically significant gap in the current dataset collection.

- **Thermal infrared images** capture heat signatures and are used in industrial leak detection
- **Optical RGB smartphone images** are what Nivara residents will submit
- These are fundamentally different image modalities — a CNN trained on thermal images cannot reliably be applied to optical images

Even if the water_leakage dataset labels are confirmed, **the model cannot be expected to transfer thermal-trained features to optical resident photos** without additional domain adaptation or a separate model.

---

## 4. Dataset Scale vs. Production Requirements

| Class | Training Samples Available | Industry Rule-of-Thumb Minimum |
|:---|:---|:---|
| water_leakage | 0 (excluded) | 500–1,000 per class |
| garbage_waste | ~2,527 | 500–1,000 per class |
| wall_ceiling_damage | Limited | 500–1,000 per class |
| electrical_hazard | ~35–40 (fault only) | 500–1,000 per class |
| broken_infrastructure | Limited | 500–1,000 per class |
| parking_road_damage | Limited | 500–1,000 per class |
| other | 0 (no dataset) | 500–1,000 per class |

Only `garbage_waste` meets minimum scale requirements. All other classes are significantly underrepresented.

---

## 5. Confidence Thresholds

Given the domain gaps documented above, the following confidence bands apply:

| Confidence | Band | Interpretation |
|:---|:---|:---|
| ≥ 0.85 | High | Model strongly matches a visual pattern from training data |
| 0.60–0.84 | Moderate | Model has partial visual evidence but lower certainty |
| < 0.60 | Low | Model is uncertain — **manual review recommended** |

These thresholds are configurable via environment variables.

> ⚠️ **Even "High" confidence predictions from this model should not be treated as production-accurate until real Nivara resident photos have been collected, labelled, and used for domain-specific retraining.**

---

## 6. Required for Production Readiness

1. **Water leakage label verification** — Confirm `neg_` semantics with dataset source
2. **Real Nivara complaint photos** — Collect at minimum 200 verified photos per class
3. **Domain-specific fine-tuning** — Retrain with Nivara-specific data using the human feedback loop
4. **Per-class real-world evaluation** — Run evaluate.py on Nivara-specific hold-out test set
5. **mAP evaluation for detection** — After training on at least 500+ annotated detection images
6. **Independent safety review** — Before using predictions to influence complaint priority or category

---

## 7. Human Feedback Loop Design

Resident and admin feedback is preserved in `complaint.visualFeedback`:

```
Resident submits photo
    ↓
AI prediction (with confidence band)
    ↓
Resident sees: "Possible issue detected: [Category]" + "Does this look correct?"
    ↓
[ Yes, looks right ] → feedback.accepted = true
[ Not quite ]        → feedback.accepted = false + optional correctedCategory
    ↓
Stored as visualFeedback subdocument (does NOT auto-modify complaint status/priority/category)
    ↓
Accumulates as verified Nivara-specific samples
    ↓
Human curates → new dataset version → explicit retraining → new model version
```

**Automatic online retraining is NOT implemented.** All model updates are explicit, human-initiated, and go through the training + evaluation pipeline before deployment.

## Phase 4C Acquisition Categories

Every candidate is tracked as one of these evidence domains:

| Domain | Meaning | Current status |
|:---|:---|:---|
| **A. Public benchmark/domain images** | Public datasets collected for generic objects, construction, or industrial inspection | Existing baseline proxy data; licenses require verification |
| **B. Property-maintenance images** | Images explicitly showing apartment, society, building, fixture, waste, road, or electrical maintenance conditions | No verified additions yet |
| **C. Resident smartphone-style images** | Human-curated photos resembling actual Nivara complaint submissions | Separate validation set; currently empty |

The acquisition pipeline records these sources and their domain-gap notes in `data_acquisition/source_registry.json`. Unknown-license sources are documented but excluded by default. The current v1 benchmark accuracy (Top-1 94.21%, Balanced Accuracy 96.23%, Macro F1 92.69%) does not establish real-world performance; no improved accuracy is claimed until a new model is trained and evaluated.

Per-class Phase 4C gaps remain HIGH for garbage context, wall/ceiling interior damage, broken residential infrastructure, and parking/road scale. Electrical imagery is more relevant but scarce. Resident smartphone validation is required before any v2 model decision.
