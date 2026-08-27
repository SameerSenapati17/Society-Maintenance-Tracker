import React, { useState } from "react";
import {
  Sparkles,
  Zap,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  ExternalLink,
  GitMerge,
  Eye,
  Camera,
  Layers,
  Info,
  X
} from "lucide-react";
import { Link } from "react-router-dom";
import { adminService } from "../services/adminService.js";
import { api, getApiErrorCategory, getErrorMessage } from "../services/api.js";
import { useToast } from "../context/ToastContext.jsx";
import { formatDate, formatRelativeTime } from "../utils/format.js";

function getSeverityBadge(severity) {
  switch (severity) {
    case "Critical":
      return "bg-rose-100 text-rose-700 border-rose-200 font-bold";
    case "High":
      return "bg-rose-50 text-rose-600 border-rose-200";
    case "Medium":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "Low":
    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

function getUrgencyBadge(urgency) {
  switch (urgency) {
    case "Emergency":
      return "bg-rose-100 text-rose-700 border-rose-200 font-bold";
    case "Urgent":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "Normal":
      return "bg-indigo-50 text-indigo-700 border-indigo-200";
    case "Low":
    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

function getSimilarityColor(pct) {
  if (pct >= 90) return "text-rose-600";
  if (pct >= 80) return "text-amber-600";
  return "text-slate-500";
}

function getConfidenceBand(confidence) {
  if (confidence >= 0.85) return { label: "High", color: "emerald" };
  if (confidence >= 0.60) return { label: "Moderate", color: "amber" };
  return { label: "Low", color: "rose" };
}

function formatVisualCategory(category) {
  const labels = {
    broken_infrastructure: "Broken Infrastructure",
    electrical_hazard: "Electrical Hazard",
    garbage_waste: "Garbage/Waste",
    parking_road_damage: "Parking/Road Damage",
    wall_ceiling_damage: "Wall/Ceiling Damage"
  };
  return labels[category] || category;
}

function getAssessmentStyle(state) {
  if (state === "AGREEMENT") return "border-emerald-200 bg-emerald-50/60 text-emerald-800";
  if (state === "CONFLICT") return "border-amber-200 bg-amber-50/70 text-amber-900";
  return "border-slate-200 bg-slate-50/70 text-slate-700";
}

function getAssessmentLabel(state) {
  return {
    AGREEMENT: "AI Evidence Agreement",
    CONFLICT: "AI Evidence Conflict",
    UNCERTAIN: "AI Evidence Uncertain",
    VISUAL_ONLY: "Visual Evidence Available",
    TEXT_ONLY: "Text Evidence Available"
  }[state] || "Evidence Assessment";
}

function getStatusDot(status) {
  switch (status) {
    case "Open":
      return "bg-amber-400";
    case "In Progress":
      return "bg-indigo-400";
    case "Resolved":
      return "bg-emerald-400";
    default:
      return "bg-slate-400";
  }
}

export default function AiTriagePanel({
  complaintId,
  initialTriage = null,
  initialVisualAnalysis = null,
  initialMultimodalAssessment = null,
  initialAiAnalysisStatus = null,
  hasPhoto = false,
  photoUrl = null,
  currentPriority = "Medium",
  currentCategory = "General",
  onApplyRecommendation = null,
  role = null                        // 'admin' | 'resident' — controls feedback UI visibility
}) {
  const { addToast } = useToast();
  const [triage, setTriage] = useState(initialTriage);
  const [lastSuccessfulTriage, setLastSuccessfulTriage] = useState(initialTriage);
  const [aiAnalysisStatus, setAiAnalysisStatus] = useState(initialAiAnalysisStatus || {
    status: initialTriage ? "ANALYZED" : "NEVER_ANALYZED",
    lastSuccessfulAnalysisAt: initialTriage?.generatedAt || null
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errorCategory, setErrorCategory] = useState(null);

  // Visual Analysis State (Phase 4A)
  const [visualAnalysis, setVisualAnalysis] = useState(initialVisualAnalysis);
  const [multimodalAssessment, setMultimodalAssessment] = useState(initialMultimodalAssessment);
  const [visualLoading, setVisualLoading] = useState(false);
  const [visualError, setVisualError] = useState("");
  const [activeImageView, setActiveImageView] = useState("overlay"); // "overlay" | "heatmap" | "original"

  // Related incidents state (Phase 3B)
  const [duplicates, setDuplicates] = useState(null);
  const [duplicatesLoading, setDuplicatesLoading] = useState(false);
  const [duplicatesError, setDuplicatesError] = useState("");
  const [dismissedIds, setDismissedIds] = useState(new Set());

  // Phase 4B: Resident visual-feedback state
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [showCorrectForm, setShowCorrectForm] = useState(false);
  const [correctedCategory, setCorrectedCategory] = useState("");

  async function runTriage() {
    setError("");
    setErrorCategory(null);
    setLoading(true);
    try {
      const result = await adminService.runAiTriage(complaintId);
      setTriage(result.triage);
      setLastSuccessfulTriage(result.triage);
      setMultimodalAssessment(result.multimodalAssessment || null);
      setAiAnalysisStatus(result.aiAnalysisStatus || { status: "ANALYZED", lastSuccessfulAnalysisAt: result.triage?.generatedAt });
      addToast("AI operations triage analysis generated.");
    } catch (err) {
      setErrorCategory(getApiErrorCategory(err));
      setAiAnalysisStatus((previous) => ({
        ...previous,
        status: "FAILED",
        lastAnalysisAttemptAt: new Date().toISOString()
      }));
      setError(getErrorMessage(err) || "AI analysis is temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  }

  async function runVisualAnalysis() {
    setVisualError("");
    setVisualLoading(true);
    try {
      const result = await adminService.runVisualAnalysis(complaintId);
      setVisualAnalysis(result.visualAnalysis);
      setMultimodalAssessment(result.multimodalAssessment || null);
      addToast("Computer Vision visual analysis & Grad-CAM generated.");
    } catch (err) {
      setVisualError(getErrorMessage(err) || "Visual analysis is temporarily unavailable.");
    } finally {
      setVisualLoading(false);
    }
  }

  async function runDuplicateSearch() {
    setDuplicatesError("");
    setDuplicatesLoading(true);
    try {
      const result = await adminService.findDuplicates(complaintId);
      setDuplicates(result.matches || []);
      setDismissedIds(new Set());
      if ((result.matches || []).length === 0) {
        addToast("No similar incidents found above the similarity threshold.");
      } else {
        addToast(`Found ${result.matches.length} possible related incident${result.matches.length > 1 ? "s" : ""}.`);
      }
    } catch (err) {
      setDuplicatesError(getErrorMessage(err) || "Duplicate search is temporarily unavailable.");
    } finally {
      setDuplicatesLoading(false);
    }
  }

  function dismissMatch(id) {
    setDismissedIds((prev) => new Set([...prev, String(id)]));
  }

  // Phase 4B: submit visual feedback (resident + admin)
  async function submitFeedback(accepted) {
    setFeedbackLoading(true);
    try {
      await api.post(`/complaints/${complaintId}/visual-feedback`, {
        accepted,
        correctedCategory: accepted ? undefined : correctedCategory || undefined
      });
      setFeedbackSent(true);
      setShowCorrectForm(false);
      addToast(accepted ? "Thanks for confirming!" : "Thanks for the correction — we'll use this to improve.");
    } catch (err) {
      addToast(getErrorMessage(err) || "Could not save feedback. Please try again.");
    } finally {
      setFeedbackLoading(false);
    }
  }

  const visibleMatches = duplicates
    ? duplicates.filter((m) => !dismissedIds.has(String(m.complaintId)))
    : null;

  return (
    <div className="space-y-4">
      {/* ── 1. AI Text Triage Panel ───────────────────────────── */}
      <div className="rounded-xl border border-indigo-200/70 bg-white p-5 shadow-xs space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <Sparkles size={14} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                AI Operations Triage
              </h3>
              <p className="text-[11px] text-slate-400">
                Assistive intelligence · Human-in-the-loop
              </p>
            </div>
          </div>

          {triage && aiAnalysisStatus.status === "ANALYZED" && (
            <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700">
              {Math.round((triage.confidence || 0) * 100)}% confidence
            </span>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center gap-3 rounded-lg border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-xs text-indigo-800">
            <RefreshCw size={14} className="animate-spin shrink-0 text-indigo-600" />
            <span>{lastSuccessfulTriage ? "Retrying AI analysis..." : "Analyzing incident — evaluating severity, category, and SLA priority…"}</span>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50/70 p-3.5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-rose-800">
              <AlertTriangle size={14} className="text-rose-600 shrink-0" />
              <span>{errorCategory === "quota_exceeded" ? "AI analysis temporarily unavailable" : "Unable to generate a new analysis."}</span>
            </div>
            <p className="text-[11px] text-rose-600 leading-relaxed">{errorCategory === "quota_exceeded" ? "The AI service has reached its current usage limit. Please try again later." : error}</p>
            {lastSuccessfulTriage && (
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Showing the previous successful analysis{aiAnalysisStatus.lastSuccessfulAnalysisAt ? ` from ${formatDate(aiAnalysisStatus.lastSuccessfulAnalysisAt)}` : ""}.
              </p>
            )}
            <button
              type="button"
              onClick={runTriage}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <RefreshCw size={11} /> Try again
            </button>
          </div>
        )}

        {/* Empty / not analyzed */}
        {!loading && !error && !triage && (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-5 text-center space-y-3">
            <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
              Run AI triage to inspect classification accuracy, detect potential hazards,
              and receive recommended dispatch actions.
            </p>
            <button
              type="button"
              onClick={runTriage}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 active:scale-95 transition-all cursor-pointer"
            >
              <Sparkles size={13} /> Run AI Analysis
            </button>
          </div>
        )}

        {/* Triage results */}
        {!loading && triage && (
          <div className="space-y-3 text-xs animate-fade-in">
            {error && (
              <div className="flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-800">
                <span>Previous successful analysis</span>
                <span>Latest attempt failed</span>
              </div>
            )}
            {/* Classification grid */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-2.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Category</span>
                <span className="font-semibold text-slate-800 truncate block">{triage.category}</span>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-2.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Severity</span>
                <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] border ${getSeverityBadge(triage.severity)}`}>
                  {triage.severity}
                </span>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-2.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Urgency</span>
                <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] border ${getUrgencyBadge(triage.urgency)}`}>
                  {triage.urgency}
                </span>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-2.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Rec. Priority</span>
                <span className="font-bold text-indigo-700 text-xs">{triage.recommendedPriority}</span>
              </div>
            </div>

            {/* Incident Summary */}
            <div className="rounded-lg border border-slate-100 bg-white p-3 space-y-0.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Incident Summary</span>
              <p className="text-slate-800 leading-relaxed font-medium">{triage.summary}</p>
            </div>

            {/* Suggested Action */}
            <div className="rounded-lg border border-indigo-100 bg-indigo-50/40 p-3 space-y-0.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 flex items-center gap-1">
                <Zap size={11} /> Suggested Action
              </span>
              <p className="text-slate-800 font-medium leading-relaxed">{triage.suggestedAction}</p>
            </div>

            {/* Reasoning */}
            <div className="rounded-lg border border-slate-100 bg-slate-50/40 p-3 space-y-0.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Reasoning</span>
              <p className="text-slate-500 leading-relaxed text-[11px]">{triage.reasoning}</p>
            </div>

            {/* Human-in-the-loop apply buttons */}
            {onApplyRecommendation && (
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
                <span className="text-[11px] text-slate-400 font-medium">Apply recommendation:</span>
                {triage.recommendedPriority && triage.recommendedPriority !== currentPriority && (
                  <button
                    type="button"
                    onClick={() => onApplyRecommendation({ priority: triage.recommendedPriority })}
                    className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer"
                  >
                    <ArrowRight size={11} /> Priority → {triage.recommendedPriority}
                  </button>
                )}
                {triage.category && triage.category !== currentCategory && (
                  <button
                    type="button"
                    onClick={() => onApplyRecommendation({ category: triage.category })}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <ArrowRight size={11} /> Category → {triage.category}
                  </button>
                )}
              </div>
            )}

            {/* Footer metadata */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5 text-[10px] text-slate-400 font-mono">
              <span>Model: {triage.model}</span>
              <span>Analyzed: {formatDate(triage.generatedAt)}</span>
              <button
                type="button"
                onClick={runTriage}
                className="font-sans font-semibold text-indigo-500 hover:text-indigo-700 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw size={10} /> Re-run
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── 2. Visual Intelligence & Grad-CAM Panel (Phase 4A) ─── */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-white">
              <Camera size={14} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Visual Intelligence
              </h3>
              <p className="text-[11px] text-slate-400">
                Computer Vision · Transfer Learning (EfficientNet-B0) + Grad-CAM XAI
              </p>
            </div>
          </div>

          {visualAnalysis && (
            <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700">
              {Math.round((visualAnalysis.confidence || 0) * 100)}% visual match
            </span>
          )}
        </div>

        {/* Case A: No photo attached */}
        {!hasPhoto && (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-4 text-center space-y-1.5">
            <Info size={16} className="mx-auto text-slate-400" />
            <p className="text-xs font-semibold text-slate-600">No Photo Evidence Attached</p>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
              Visual intelligence evaluates attached incident photographs. This complaint was submitted as text-only.
            </p>
          </div>
        )}

        {/* Case B: Photo attached, not yet analyzed */}
        {hasPhoto && !visualLoading && !visualError && !visualAnalysis && (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-5 text-center space-y-3">
            <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
              Analyze attached photographic evidence using Transfer Learning CNN and compute Grad-CAM focal activation heatmaps.
            </p>
            <button
              type="button"
              onClick={runVisualAnalysis}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 active:scale-95 transition-all cursor-pointer shadow-xs"
            >
              <Eye size={13} /> Run Visual Analysis
            </button>
          </div>
        )}

        {/* Case C: Loading */}
        {visualLoading && (
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/60 px-4 py-3 text-xs text-slate-700">
            <RefreshCw size={14} className="animate-spin shrink-0 text-indigo-600" />
            <span>Processing image through CNN feature extractor & generating Grad-CAM explainability…</span>
          </div>
        )}

        {/* Case D: Error */}
        {!visualLoading && visualError && (
          <div className="rounded-lg border border-rose-200 bg-rose-50/70 p-3.5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-rose-800">
              <AlertTriangle size={14} className="text-rose-600 shrink-0" />
              <span>Visual analysis is temporarily unavailable.</span>
            </div>
            <p className="text-[11px] text-rose-600 leading-relaxed">{visualError}</p>
            <button
              type="button"
              onClick={runVisualAnalysis}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <RefreshCw size={11} /> Try again
            </button>
          </div>
        )}

        {/* Case E: Visual Analysis Result */}
        {!visualLoading && visualAnalysis && (
          <div className="space-y-4 text-xs animate-fade-in">
            {/* Visual Assessment & Signals */}
            <div className="grid gap-4 sm:grid-cols-2 items-start">
              {/* Image & Grad-CAM Inspector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Explainable AI (Grad-CAM)
                  </span>
                  <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-[10px] font-semibold">
                    <button
                      type="button"
                      onClick={() => setActiveImageView("overlay")}
                      className={`rounded px-2 py-0.5 transition-colors cursor-pointer ${
                        activeImageView === "overlay"
                          ? "bg-white text-indigo-700 font-bold shadow-2xs"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      AI Attention
                    </button>
                    {(visualAnalysis.heatmapBase64 || visualAnalysis.heatmapUrl) && (
                      <button
                        type="button"
                        onClick={() => setActiveImageView("heatmap")}
                        className={`rounded px-2 py-0.5 transition-colors cursor-pointer ${
                          activeImageView === "heatmap"
                            ? "bg-white text-indigo-700 font-bold shadow-2xs"
                            : "text-slate-500 hover:text-slate-900"
                        }`}
                      >
                        Heatmap
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setActiveImageView("original")}
                      className={`rounded px-2 py-0.5 transition-colors cursor-pointer ${
                        activeImageView === "original"
                          ? "bg-white text-slate-900 font-bold shadow-2xs"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      Original
                    </button>
                  </div>
                </div>

                <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-950/5 aspect-4/3 flex items-center justify-center">
                  <img
                    src={
                      activeImageView === "heatmap" && (visualAnalysis.heatmapUrl || visualAnalysis.heatmapBase64)
                        ? visualAnalysis.heatmapUrl || visualAnalysis.heatmapBase64
                        : activeImageView === "overlay" && (visualAnalysis.overlayUrl || visualAnalysis.overlayBase64)
                        ? visualAnalysis.overlayUrl || visualAnalysis.overlayBase64
                        : photoUrl
                    }
                    alt="Visual analysis artifact"
                    className="h-full w-full object-contain"
                  />
                  <span className="absolute bottom-2 left-2 rounded-md bg-slate-950/70 px-2 py-0.5 text-[9px] font-mono text-white backdrop-blur-xs">
                    {activeImageView === "overlay"
                      ? "Grad-CAM Activation Overlay"
                      : activeImageView === "heatmap"
                      ? "Isolated Attention Map"
                      : "Source Evidence"}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 italic">
                  Highlighted regions represent areas that most influenced the visual model prediction.
                </p>
              </div>

              {/* Assessment Breakdown & Top Signals */}
              <div className="space-y-3">
                <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    AI Visual Assessment
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900">
                      {formatVisualCategory(visualAnalysis.category)}
                    </span>
                    <span className="rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[11px] font-bold text-indigo-700">
                      {Math.round(visualAnalysis.confidence * 100)}% confidence
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 pt-1 leading-relaxed">
                    {visualAnalysis.summary}
                  </p>
                </div>

                {/* Top Signals Breakdown */}
                {visualAnalysis.topPredictions?.length > 0 && (
                  <div className="rounded-lg border border-slate-100 bg-white p-3 space-y-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                      Top Visual Signals
                    </span>
                    <div className="space-y-1.5">
                      {visualAnalysis.topPredictions.map((pred, idx) => {
                        const pct = Math.round(pred.confidence * 100);
                        return (
                          <div key={idx} className="space-y-0.5">
                            <div className="flex justify-between text-[11px]">
                              <span className="font-medium text-slate-700">{formatVisualCategory(pred.category)}</span>
                              <span className="font-mono text-slate-500 font-bold">{pct}%</span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  idx === 0 ? "bg-indigo-600" : "bg-slate-400"
                                }`}
                                style={{ width: `${Math.max(pct, 3)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Multimodal Fusion Synthesis ─────────────────── */}
            {(triage || visualAnalysis) && multimodalAssessment && (
              <div className={`rounded-xl border p-3.5 space-y-2 ${getAssessmentStyle(multimodalAssessment.state)}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Layers size={13} className="text-indigo-600" />
                    <span className="text-xs font-bold text-indigo-950">Multimodal Operations Synthesis</span>
                  </div>
                  <span className="rounded-full border border-current px-2 py-0.5 text-[10px] font-bold">
                    {getAssessmentLabel(multimodalAssessment.state)}
                  </span>
                </div>
                <div className="grid gap-2 pt-1 text-[11px] sm:grid-cols-2">
                  <div className="rounded-md bg-white p-2 border border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Text Category (Gemini)</span>
                    <span className="font-semibold text-slate-800">{triage ? triage.category : "Unavailable"}</span>
                  </div>
                  <div className="rounded-md bg-white p-2 border border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Visual Evidence (CNN)</span>
                    <span className="font-semibold text-indigo-700">{visualAnalysis ? `${formatVisualCategory(visualAnalysis.category)}${typeof visualAnalysis.confidence === "number" ? ` - ${Math.round(visualAnalysis.confidence * 100)}%` : ""}` : "Unavailable"}</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed pt-0.5">
                  {multimodalAssessment.explanation}
                </p>
                {multimodalAssessment.state === "CONFLICT" && (
                  <p className="text-[11px] font-bold text-amber-900">Admin review recommended. Evidence conflict - verify before applying a recommendation.</p>
                )}
                {multimodalAssessment.state === "UNCERTAIN" && (
                  <p className="text-[11px] font-bold text-slate-700">Verify the photo evidence before applying an operational recommendation.</p>
                )}
                {triage?.suggestedAction && (
                  <p className="text-[11px] text-slate-600"><strong>Text recommendation:</strong> {triage.suggestedAction}</p>
                )}
              </div>
            )}

            {/* Metadata Footer */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5 text-[10px] text-slate-400 font-mono">
              <span>Model: {visualAnalysis.model}</span>
              <span>Analyzed: {formatDate(visualAnalysis.generatedAt)}</span>
              <button
                type="button"
                onClick={runVisualAnalysis}
                className="font-sans font-semibold text-indigo-500 hover:text-indigo-700 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw size={10} /> Re-analyze photo
              </button>
            </div>
          </div>
        )}
      </div>

      {triage && !visualAnalysis && multimodalAssessment?.state === "TEXT_ONLY" && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Layers size={13} className="text-slate-600" />
              <span className="text-xs font-bold text-slate-900">Evidence Assessment</span>
            </div>
            <span className="rounded-full border border-slate-300 px-2 py-0.5 text-[10px] font-bold text-slate-700">Text Evidence Available</span>
          </div>
          <p className="text-[11px] text-slate-600">{multimodalAssessment.explanation}</p>
        </div>
      )}

      {/* ── 3. Possible Related Incidents (Phase 3B) ───────────── */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-slate-600">
              <GitMerge size={14} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Possible Related Incidents</h3>
              <p className="text-[11px] text-slate-400">Semantic similarity · Admin review required</p>
            </div>
          </div>
          {duplicates !== null && (
            <button
              type="button"
              onClick={runDuplicateSearch}
              disabled={duplicatesLoading}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-indigo-600 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <RefreshCw size={11} className={duplicatesLoading ? "animate-spin" : ""} />
              Refresh
            </button>
          )}
        </div>

        {/* Loading */}
        {duplicatesLoading && (
          <div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/60 px-4 py-3 text-xs text-slate-600">
            <RefreshCw size={14} className="animate-spin shrink-0 text-slate-400" />
            <span>Searching for semantically similar incidents…</span>
          </div>
        )}

        {/* Error */}
        {!duplicatesLoading && duplicatesError && (
          <div className="rounded-lg border border-rose-200 bg-rose-50/70 p-3.5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-rose-800">
              <AlertTriangle size={14} className="shrink-0 text-rose-600" />
              <span>{duplicatesError}</span>
            </div>
            <button
              type="button"
              onClick={runDuplicateSearch}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <RefreshCw size={11} /> Try again
            </button>
          </div>
        )}

        {/* Not run yet */}
        {!duplicatesLoading && !duplicatesError && duplicates === null && (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-5 text-center space-y-3">
            <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
              Search for semantically similar incidents using AI embeddings and cosine similarity.
              No keywords — real semantic understanding.
            </p>
            <button
              type="button"
              onClick={runDuplicateSearch}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-700 active:scale-95 transition-all cursor-pointer"
            >
              <GitMerge size={13} /> Find Related Incidents
            </button>
          </div>
        )}

        {/* No results */}
        {!duplicatesLoading && !duplicatesError && duplicates !== null && visibleMatches.length === 0 && (
          <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50/60 px-4 py-3 text-xs text-emerald-800">
            <CheckCircle2 size={15} className="shrink-0 text-emerald-600" />
            <span>
              {dismissedIds.size > 0
                ? "All matched incidents dismissed."
                : "No similar incidents found above the similarity threshold."}
            </span>
          </div>
        )}

        {/* Match list */}
        {!duplicatesLoading && !duplicatesError && visibleMatches !== null && visibleMatches.length > 0 && (
          <div className="space-y-2 animate-fade-in">
            {visibleMatches.map((match) => (
              <div
                key={String(match.complaintId)}
                className="group rounded-lg border border-slate-100 bg-slate-50/50 p-3 transition-colors hover:border-slate-200 hover:bg-white"
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Similarity badge + meta */}
                  <div className="flex items-start gap-3 min-w-0">
                    <span className={`shrink-0 tabular-nums text-sm font-bold ${getSimilarityColor(match.percentage)}`}>
                      {match.percentage}%
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                        <span className="font-mono text-[10px] font-bold text-slate-400">
                          #{String(match.complaintId).slice(-6)}
                        </span>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          {match.category}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-slate-400">
                          <span className={`h-1.5 w-1.5 rounded-full ${getStatusDot(match.status)}`} />
                          {match.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 font-medium leading-snug line-clamp-2">
                        {match.description}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {match.residentName} · {formatRelativeTime(match.createdAt)}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Link
                      to={`/admin/complaints/${match.complaintId}`}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:border-indigo-300 hover:text-indigo-700 transition-colors"
                    >
                      <ExternalLink size={10} /> View
                    </Link>
                    <button
                      type="button"
                      onClick={() => dismissMatch(match.complaintId)}
                      className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white p-1 text-slate-400 hover:border-rose-200 hover:text-rose-500 transition-colors cursor-pointer"
                      title="Dismiss"
                    >
                      <X size={11} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            <p className="text-[10px] text-slate-400 pt-1">
              {dismissedIds.size > 0 && `${dismissedIds.size} dismissed · `}
              AI recommends review only. No automatic changes are made.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
