"""
Nivara Visual Intelligence — Centralized Taxonomy
Canonical 8-class property maintenance taxonomy with source dataset mappings,
domain transfer flags, and classification/detection support metadata.
"""
from typing import Dict, List, Optional

# ──────────────────────────────────────────────────────────
# Canonical Taxonomy Definitions
# ──────────────────────────────────────────────────────────

TAXONOMY: List[Dict] = [
    {
        "display_name": "Water Leakage",
        "slug": "water_leakage",
        "description": "Active water leaks, pipe bursts, ceiling moisture stains, dripping fixtures, seepage.",
        "classification_supported": True,
        "detection_supported": False,
        "source_datasets": ["water_leakage"],
        "source_labels": {
            "water_leakage": "ALL (status: UNVERIFIED — excluded until label semantics confirmed)"
        },
        "domain_transfer": "DIRECT — if confirmed as leakage-positive samples",
        "training_notes": (
            "EXCLUDED: The 233 available images have 'neg_' filename prefix with ambiguous semantics. "
            "Cannot confirm whether these are leakage-positive samples (neg = negative temperature) "
            "or non-leakage negatives. Preserved in raw dataset. Excluded from training."
        )
    },
    {
        "display_name": "Wall/Ceiling Damage",
        "slug": "wall_ceiling_damage",
        "description": "Plaster flaking, deep cracks, paint peeling, damp stains, surface erosion.",
        "classification_supported": True,
        "detection_supported": False,
        "source_datasets": ["damaged_construction"],
        "source_labels": {
            "damaged_construction": ["Damaged_building", "damaged_buildings"]
        },
        "domain_transfer": "APPROXIMATE — construction/disaster imagery differs from residential interior damage",
        "training_notes": (
            "Domain gap: Large-scale construction demolition images are used as proxy. "
            "Real apartment interior wall/ceiling photos would improve accuracy substantially."
        )
    },
    {
        "display_name": "Garbage/Waste",
        "slug": "garbage_waste",
        "description": "Common area trash accumulation, overflowing bins, waste spills.",
        "classification_supported": True,
        "detection_supported": False,
        "source_datasets": ["garbage_classification"],
        "source_labels": {
            "garbage_classification": ["cardboard", "glass", "metal", "paper", "plastic", "trash"]
        },
        "domain_transfer": "APPROXIMATE — sorted recyclables differ from property garbage accumulation incidents",
        "training_notes": (
            "All 6 source classes (cardboard, glass, metal, paper, plastic, trash) are merged into "
            "a single garbage_waste Nivara class. The model does not distinguish recyclable types. "
            "Domain gap: controlled lab recyclable images vs. property common-area garbage incidents."
        )
    },
    {
        "display_name": "Electrical Hazard",
        "slug": "electrical_hazard",
        "description": "Exposed wiring, sparking distribution boards, burnt switchboards, open panels.",
        "classification_supported": True,
        "detection_supported": True,
        "source_datasets": ["electrical_wiring"],
        "source_labels": {
            "electrical_wiring": ["damaged", "disconnected", "misrouted"]
        },
        "excluded_source_labels": {
            "electrical_wiring": {
                "normal": "EXCLUDED_NEGATIVE — normal wiring images treated as background, not a Nivara hazard"
            }
        },
        "domain_transfer": "MODERATE — wiring fault images are domain-relevant but small dataset (limited generalization)",
        "training_notes": (
            "YOLO annotations preserved for detection pipeline. "
            "For classification: fault classes (damaged, disconnected, misrouted) used as electrical_hazard. "
            "'normal' class EXCLUDED from classifier — not mapped to Nivara 'Other' or any positive class."
        )
    },
    {
        "display_name": "Broken Infrastructure",
        "slug": "broken_infrastructure",
        "description": "Damaged handrails, cracked pavement, broken tiles, gate hinge failure.",
        "classification_supported": True,
        "detection_supported": False,
        "source_datasets": ["damaged_construction"],
        "source_labels": {
            "damaged_construction": ["debris"]
        },
        "domain_transfer": "APPROXIMATE — construction debris differs from residential infrastructure damage",
        "training_notes": (
            "Debris images used as proxy for broken infrastructure. "
            "Large domain gap from actual property handrail/tile/gate damage."
        )
    },
    {
        "display_name": "Lift/Door Damage",
        "slug": "lift_door_damage",
        "description": "Elevator door jamming, cracked button panels, misaligned lobby doors.",
        "classification_supported": False,
        "detection_supported": True,
        "source_datasets": ["elevator_door"],
        "source_labels": {
            "elevator_door": ["close", "middle", "open"]
        },
        "domain_transfer": "N/A — door state classes are not damage indicators",
        "training_notes": (
            "EXCLUDED from classification pipeline entirely. "
            "Elevator door classes (close/middle/open) are door states, not damage indicators. "
            "Retained exclusively for detection pipeline to locate and identify door state. "
            "License: CC BY 4.0 (Roboflow Universe)."
        )
    },
    {
        "display_name": "Parking/Road Damage",
        "slug": "parking_road_damage",
        "description": "Driveway potholes, damaged speed bumps, broken parking bollards.",
        "classification_supported": True,
        "detection_supported": False,
        "source_datasets": ["damaged_construction"],
        "source_labels": {
            "damaged_construction": ["Damaged_highway"]
        },
        "domain_transfer": "APPROXIMATE — highway-scale damage differs from residential parking/driveway damage",
        "training_notes": (
            "Highway damage images used as proxy. "
            "Large scale mismatch from residential compound parking damage."
        )
    },
    {
        "display_name": "Other",
        "slug": "other",
        "description": "Miscellaneous physical property anomalies not covered by specific categories.",
        "classification_supported": True,
        "detection_supported": False,
        "source_datasets": [],
        "source_labels": {},
        "domain_transfer": "N/A",
        "training_notes": (
            "No dedicated source dataset for 'Other'. "
            "This class may be underrepresented in initial training. "
            "The 'Other' class should not absorb excluded negatives — it is a genuine catch-all "
            "for real miscellaneous incidents only."
        )
    }
]

# ──────────────────────────────────────────────────────────
# Lookup helpers
# ──────────────────────────────────────────────────────────

SLUG_TO_CLASS: Dict[str, Dict] = {t["slug"]: t for t in TAXONOMY}
NAME_TO_CLASS: Dict[str, Dict] = {t["display_name"]: t for t in TAXONOMY}

CANONICAL_SLUGS: List[str] = [t["slug"] for t in TAXONOMY]
CANONICAL_NAMES: List[str] = [t["display_name"] for t in TAXONOMY]
CLASSIFICATION_SLUGS: List[str] = [t["slug"] for t in TAXONOMY if t["classification_supported"]]
DETECTION_SLUGS: List[str] = [t["slug"] for t in TAXONOMY if t["detection_supported"]]

# ──────────────────────────────────────────────────────────
# Source-class → Nivara mapping table (for prepare_dataset.py)
# ──────────────────────────────────────────────────────────

SOURCE_CLASS_MAP: Dict[str, Dict[str, Optional[str]]] = {
    # water_leakage: ALL EXCLUDED (unverified)
    "water_leakage": {},

    # garbage_classification: all 6 → garbage_waste
    "garbage_classification": {
        "cardboard": "garbage_waste",
        "glass": "garbage_waste",
        "metal": "garbage_waste",
        "paper": "garbage_waste",
        "plastic": "garbage_waste",
        "trash": "garbage_waste"
    },

    # damaged_construction: selective mapping
    "damaged_construction": {
        "Damaged_building": "wall_ceiling_damage",
        "damaged_buildings": "wall_ceiling_damage",
        "debris": "broken_infrastructure",
        "Damaged_highway": "parking_road_damage",
        # Excluded negatives — must NOT be positive training examples
        "Non-damaged_building": None,   # Negative/background
        "Non-damaged_highway": None,    # Negative/background
    },

    # electrical_wiring: fault classes only
    "electrical_wiring": {
        "damaged": "electrical_hazard",
        "disconnected": "electrical_hazard",
        "misrouted": "electrical_hazard",
        "normal": None,  # Excluded — background, not a hazard
    },

    # elevator_door: excluded from classification
    "elevator_door": {
        "close": None,    # Door state — detection only
        "middle": None,   # Door state — detection only
        "open": None,     # Door state — detection only
    },

    # car_damage: fully excluded
    "car_damage": {},
}

EXCLUDED_REASONS: Dict[str, str] = {
    "water_leakage": "UNVERIFIED label semantics — 'neg_' filename prefix is ambiguous",
    "elevator_door": "Door state classes are not damage indicators — detection pipeline only",
    "car_damage": "Vehicle damage — outside Nivara property maintenance scope; reserved for future Vehicle Intelligence",
    "damaged_construction::Non-damaged_building": "Negative/background sample — must not be positive training data",
    "damaged_construction::Non-damaged_highway": "Negative/background sample — must not be positive training data",
    "electrical_wiring::normal": "Normal wiring — background sample, not an electrical hazard",
    "elevator_door::close": "Door state (closed) — not a damage indicator",
    "elevator_door::middle": "Door state (middle/moving) — not a damage indicator",
    "elevator_door::open": "Door state (open) — not a damage indicator",
}

DATASET_LICENSES: Dict[str, str] = {
    "garbage_classification": "License verification required — obtained from Kaggle; check original dataset license",
    "damaged_construction": "License verification required",
    "electrical_wiring": "License verification required",
    "elevator_door": "CC BY 4.0 — Roboflow Universe (ysm-4z45w/elevator-door/dataset/1)",
    "car_damage": "License verification required",
    "water_leakage": "License verification required",
}


def get_nivara_class(source_dataset: str, source_class: str) -> Optional[str]:
    """Returns the Nivara canonical slug for a source dataset + class, or None if excluded."""
    return SOURCE_CLASS_MAP.get(source_dataset, {}).get(source_class)


def get_exclusion_reason(source_dataset: str, source_class: Optional[str] = None) -> str:
    """Returns human-readable exclusion reason."""
    if source_class:
        key = f"{source_dataset}::{source_class}"
        if key in EXCLUDED_REASONS:
            return EXCLUDED_REASONS[key]
    return EXCLUDED_REASONS.get(source_dataset, "Unknown exclusion reason")
