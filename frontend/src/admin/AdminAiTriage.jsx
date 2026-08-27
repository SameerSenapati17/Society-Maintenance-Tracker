import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles,
  ArrowRight,
  Shield,
  Search,
  RotateCcw,
  CheckCircle2,
  Clock,
  Layers,
  AlertTriangle,
  Zap
} from "lucide-react";
import AppLayout from "../layouts/AppLayout.jsx";
import { api, getErrorMessage } from "../services/api.js";
import StatCard from "../components/StatCard.jsx";
import { PriorityBadge, StatusBadge, OverdueBadge } from "../components/Badge.jsx";
import { PageLoader } from "../components/ui/LoadingState.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import { formatRelativeTime } from "../utils/format.js";

export default function AdminAiTriage() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // "all" | "pending" | "analyzed"
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/admin/complaints");
      setComplaints(res.data.data.complaints || []);
    } catch (err) {
      setError(getErrorMessage(err) || "Unable to load AI triage queue.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function getAiStatus(complaint) {
    return complaint.aiAnalysisStatus?.status || (complaint.aiTriage ? "ANALYZED" : "NEVER_ANALYZED");
  }

  // Compute real metrics from loaded complaint data
  const openIncidents = complaints.filter((c) => c.status === "Open" || c.status === "In Progress").length;
  const highPriority = complaints.filter((c) => c.priority === "High" && c.status !== "Resolved").length;
  const awaitingAnalysis = complaints.filter(
    (c) => getAiStatus(c) === "NEVER_ANALYZED" && (c.status === "Open" || c.status === "In Progress")
  ).length;
  const recentlyAnalyzed = complaints.filter((c) => getAiStatus(c) === "ANALYZED").length;

  // Filter complaints for display
  const filtered = complaints.filter((c) => {
    if (filterStatus === "pending" && getAiStatus(c) !== "NEVER_ANALYZED") return false;
    if (filterStatus === "analyzed" && getAiStatus(c) !== "ANALYZED") return false;
    if (selectedCategory && c.category !== selectedCategory) return false;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const id = String(c._id).toLowerCase();
      const desc = (c.description || "").toLowerCase();
      const resident = (c.residentId?.name || "").toLowerCase();
      const cat = (c.category || "").toLowerCase();
      if (!id.includes(q) && !desc.includes(q) && !resident.includes(q) && !cat.includes(q)) {
        return false;
      }
    }
    return true;
  });

  return (
    <AppLayout role="admin">
      {/* Header */}
      <div className="mb-6 flex flex-col justify-between gap-4 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              AI Operations Intelligence
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-mono font-bold text-indigo-700">
              v3.7 Flash
            </span>
          </div>
          <p className="text-xs text-slate-500 max-w-2xl">
            Assistive intelligence for incident triage, priority assessment, and related incident discovery.
          </p>
        </div>

        {/* Operational Indicators */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-2.5 py-1 text-xs font-semibold text-indigo-700 shadow-2xs">
            <Sparkles size={13} className="text-indigo-600" />
            AI Provider: Gemini
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 shadow-2xs">
            <Shield size={13} className="text-slate-500" />
            Human-in-the-loop
          </span>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
        <StatCard
          label="Open Incidents"
          value={openIncidents}
          icon={Layers}
          accent="brand"
          subtitle="Active operational requests"
        />
        <StatCard
          label="High Priority"
          value={highPriority}
          icon={AlertTriangle}
          accent={highPriority > 0 ? "danger" : "neutral"}
          subtitle={highPriority > 0 ? "Requires urgent resolution" : "All standard priority"}
        />
        <StatCard
          label="Awaiting Analysis"
          value={awaitingAnalysis}
          icon={Clock}
          accent={awaitingAnalysis > 0 ? "warning" : "neutral"}
          subtitle="Open tickets without AI triage"
        />
        <StatCard
          label="Recently Analyzed"
          value={recentlyAnalyzed}
          icon={Zap}
          accent="success"
          subtitle="Triage intelligence available"
        />
      </div>

      {/* Main Incident Queue Panel */}
      <div className="panel space-y-4">
        {/* Controls Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <Sparkles size={14} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Incident Queue</h2>
              <p className="text-[11px] text-slate-400">Select an incident to evaluate or run operational analysis</p>
            </div>
          </div>

          {/* Filter Pills + Search */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setFilterStatus("all")}
                className={`rounded px-2.5 py-1 transition-colors ${
                  filterStatus === "all" ? "bg-white text-slate-900 shadow-2xs font-bold" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                All ({complaints.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus("pending")}
                className={`rounded px-2.5 py-1 transition-colors ${
                  filterStatus === "pending" ? "bg-white text-amber-700 shadow-2xs font-bold" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Awaiting ({awaitingAnalysis})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus("analyzed")}
                className={`rounded px-2.5 py-1 transition-colors ${
                  filterStatus === "analyzed" ? "bg-white text-indigo-700 shadow-2xs font-bold" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Analyzed ({recentlyAnalyzed})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search queue..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-1 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none w-36 sm:w-44"
              />
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && <PageLoader message="Loading AI triage operations queue..." />}

        {/* Error State */}
        {!loading && error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-5 text-center space-y-3">
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <AlertTriangle size={16} />
            </div>
            <div>
              <p className="text-xs font-bold text-rose-900">Unable to load AI triage queue.</p>
              <p className="text-[11px] text-rose-700 mt-0.5">{error}</p>
            </div>
            <button
              type="button"
              onClick={load}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <RotateCcw size={12} />
              Retry
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filtered.length === 0 && (
          <div className="py-12 text-center space-y-3">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">All incidents are currently reviewed.</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                No open incidents are waiting for AI-assisted triage matching the current filter.
              </p>
            </div>
          </div>
        )}

        {/* Table View (Desktop & Tablet) */}
        {!loading && !error && filtered.length > 0 && (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                    <th className="py-2.5 px-3">Incident</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Priority</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Created</th>
                    <th className="py-2.5 px-3">AI Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((c) => {
                    const aiStatus = getAiStatus(c);
                    const hasTriage = aiStatus === "ANALYZED";
                    return (
                      <tr
                        key={c._id}
                        className="group transition-colors hover:bg-slate-50/80"
                      >
                        {/* Incident Details */}
                        <td className="py-3 px-3">
                          <div className="min-w-0 max-w-xs sm:max-w-sm">
                            <span className="font-mono text-[10px] font-bold text-slate-400">
                              #{String(c._id).slice(-6)}
                            </span>
                            <p className="text-xs font-semibold text-slate-900 truncate">
                              {c.description}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate">
                              {c.residentId?.name || "Resident"}
                            </p>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3 px-3 whitespace-nowrap text-slate-600 font-medium">
                          {c.category}
                        </td>

                        {/* Priority */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <PriorityBadge value={c.priority} />
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <StatusBadge value={c.status} />
                            {c.isOverdue && <OverdueBadge />}
                          </div>
                        </td>

                        {/* Created */}
                        <td className="py-3 px-3 whitespace-nowrap text-slate-400 text-[11px]">
                          {formatRelativeTime(c.createdAt)}
                        </td>

                        {/* AI Status */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          {aiStatus === "ANALYZED" ? (
                            <div className="flex items-center gap-1.5">
                              <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                                <Sparkles size={10} className="text-indigo-600" />
                                Analyzed ({Math.round((c.aiTriage.confidence || 0) * 100)}%)
                              </span>
                            </div>
                          ) : aiStatus === "FAILED" ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                              <AlertTriangle size={10} /> Analysis failed{c.aiTriage ? ` (Previous: ${Math.round((c.aiTriage.confidence || 0) * 100)}%)` : ""}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                              Not analyzed
                            </span>
                          )}
                        </td>

                        {/* Action */}
                        <td className="py-3 px-3 whitespace-nowrap text-right">
                          <Link
                            to={`/admin/complaints/${c._id}`}
                            state={{ from: "/admin/ai-triage" }}
                            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                              hasTriage
                                ? "border border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:text-indigo-600 shadow-2xs"
                                : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-2xs"
                            }`}
                          >
                            <span>{hasTriage ? "Review" : "Analyze"}</span>
                            <ArrowRight size={12} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View (<768px) */}
            <div className="block md:hidden space-y-3">
              {filtered.map((c) => {
                const aiStatus = getAiStatus(c);
                const hasTriage = aiStatus === "ANALYZED";
                return (
                  <div
                    key={c._id}
                    className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="font-mono text-[10px] font-bold text-slate-400">
                            #{String(c._id).slice(-6)}
                          </span>
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                            {c.category}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-900 leading-snug line-clamp-2">
                          {c.description}
                        </p>
                      </div>
                      <PriorityBadge value={c.priority} />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/60">
                      <div className="flex items-center gap-1.5">
                        <StatusBadge value={c.status} />
                        {aiStatus === "ANALYZED" ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                            <Sparkles size={9} />
                            {Math.round((c.aiTriage.confidence || 0) * 100)}%
                          </span>
                        ) : aiStatus === "FAILED" ? (
                          <span className="text-[10px] font-semibold text-amber-700">Analysis failed{c.aiTriage ? ` · Previous: ${Math.round((c.aiTriage.confidence || 0) * 100)}%` : ""}</span>
                        ) : (
                          <span className="text-[10px] text-slate-400">Not analyzed</span>
                        )}
                      </div>

                      <Link
                        to={`/admin/complaints/${c._id}`}
                        state={{ from: "/admin/ai-triage" }}
                        className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                          hasTriage
                            ? "border border-slate-200 bg-white text-slate-700 shadow-2xs"
                            : "bg-indigo-600 text-white shadow-2xs"
                        }`}
                      >
                        <span>{hasTriage ? "Review" : "Analyze"}</span>
                        <ArrowRight size={11} />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
