"""
Nivara Visual Intelligence — Pydantic Request & Response Schemas
"""
from typing import List, Optional
from pydantic import BaseModel, Field


class PredictionItem(BaseModel):
    category: str = Field(..., description="Predicted maintenance visual category")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Normalized probability [0.0 - 1.0]")


class VisualExplanation(BaseModel):
    targetClass: str = Field(..., description="Class name for which Grad-CAM was computed")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score of the target class")
    overlayBase64: Optional[str] = Field(None, description="Base64 PNG of the original image with Grad-CAM heatmap overlay")
    heatmapBase64: Optional[str] = Field(None, description="Base64 PNG of the isolated attention heatmap")
    summary: str = Field(..., description="Plain-language interpretation of highlighted visual regions")


class VisualPredictionResponse(BaseModel):
    category: str = Field(..., description="Top predicted visual maintenance class")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score for top class")
    topPredictions: List[PredictionItem] = Field(default_factory=list, description="Top-K predicted classes with scores")
    model: str = Field("nivara-visual-classifier", description="Model architecture identifier")
    modelVersion: str = Field("1.0", description="Model iteration version")
    modelStatus: str = Field("untrained", description="Explicit model state: 'untrained' | 'trained' | 'ready'")
    explanation: Optional[VisualExplanation] = Field(None, description="Optional Grad-CAM visual explainability artifact")


class HealthResponse(BaseModel):
    status: str = Field(..., description="Service operational status: 'healthy' | 'degraded'")
    modelStatus: str = Field("untrained", description="Model readiness lifecycle: 'untrained' | 'trained' | 'ready'")
    modelLoaded: bool = Field(..., description="Whether trained custom checkpoint is loaded")
    modelArchitecture: str = Field(..., description="Backbone neural network architecture")
    device: str = Field(..., description="Computation device ('cpu' or 'cuda')")
    classes: List[str] = Field(..., description="Supported visual maintenance categories")
    timestamp: str = Field(..., description="ISO 8601 status timestamp")
