import { useEffect, useState } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  ImageIcon,
  Mail,
  Shield,
  User,
  X
} from "lucide-react";
import AppLayout from "../layouts/AppLayout.jsx";
import { PriorityBadge, StatusBadge, OverdueBadge, ClosedBadge } from "./Badge.jsx";
import StatusTimeline from "./StatusTimeline.jsx";
import { PageHeader } from "./ui/PageHeader.jsx";
import { PageLoader } from "./ui/LoadingState.jsx";
import EmptyState from "./ui/EmptyState.jsx";
import { api, getErrorMessage } from "../services/api.js";
import { formatDate, formatRelativeTime } from "../utils/format.js";
import { useToast } from "../context/ToastContext.jsx";
import AiTriagePanel from "./AiTriagePanel.jsx";

function getAllowedStatusOptions(currentStatus) {
  if (currentStatus === "Open") return ["Open", "In Progress", "Resolved"];
  if (currentStatus === "In Progress") return ["In Progress", "Resolved"];
  return ["Resolved"];
}

export default function ComplaintDetails({ role }) {
  const { id } = useParams();
  const { addToast } = useToast();
  const [complaint, setComplaint] = useState(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ status: "", priority: "", note: "" });
  const [updating, setUpdating] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  async function load() {
    setError("");
    try {
      const path = role === "admin" ? `/admin/complaints/${id}` : `/complaints/${id}`;
      const res = await api.get(path);
      setComplaint(res.data.data.complaint);
      setForm({
        status: res.data.data.complaint.status,
        priority: res.data.data.complaint.priority,
        note: ""
      });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  async function updateStatus(e) {
    e.preventDefault();
    setUpdating(true);
    try {
      await api.patch(`/admin/complaints/${id}/status`, { status: form.status, note: form.note });
      addToast(`Complaint status updated to ${form.status}.`);
      await load();
    } catch (err) {
      addToast(getErrorMessage(err), "error");
    } finally {
      setUpdating(false);
    }
  }

  async function updatePriority() {
    setUpdating(true);
    try {
      await api.patch(`/admin/complaints/${id}/priority`, { priority: form.priority });
      addToast(`Priority changed to ${form.priority}.`);
      await load();
    } catch (err) {
      addToast(getErrorMessage(err), "error");
    } finally {
      setUpdating(false);
    }
  }

  const location = useLocation();
  const defaultBackPath = role === "admin" ? "/admin/complaints" : "/resident/complaints";
  const backPath = location.state?.from || defaultBackPath;
  const backLabel = location.state?.from === "/admin/ai-triage" ? "Back to AI Triage" : "Back to Complaints";

  if (!complaint && !error) {
    return (
      <AppLayout role={role}>
        <PageLoader message="Loading complaint workspace..." />
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout role={role}>
        <EmptyState title="Unable to load complaint" description={error} actionLabel={backLabel} actionTo={backPath} />
      </AppLayout>
    );
  }

  const isClosed = complaint.status === "Resolved";
  const statusOptions = getAllowedStatusOptions(complaint.status);

  return (
    <AppLayout role={role}>
      <Link to={backPath} className="btn-ghost mb-4 -ml-2 text-xs font-semibold text-slate-500 hover:text-slate-900 inline-flex items-center gap-1.5">
        <ArrowLeft size={14} /> {backLabel}
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-200/80 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold text-slate-400">
              #{complaint._id}
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {complaint.category}
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">
            {complaint.description}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PriorityBadge value={complaint.priority} />
          <StatusBadge value={complaint.status} />
          {complaint.isOverdue && <OverdueBadge />}
          {isClosed && <ClosedBadge />}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        {/* Left: Operations details & Timeline */}
        <section className="space-y-6">
          {complaint.isOverdue && (
            <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 shadow-xs">
              <AlertTriangle size={20} className="shrink-0 text-rose-600" />
              <div>
                <p className="font-bold">Overdue SLA Warning</p>
                <p className="text-xs text-rose-700 mt-0.5">
                  This complaint has exceeded the configured resolution threshold and requires priority handling.
                </p>
              </div>
            </div>
          )}

          {/* Meta Overview Panel */}
          <div className="panel space-y-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
              Complaint Information
            </h2>

            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                <dt className="text-xs font-semibold text-slate-400">Category</dt>
                <dd className="mt-1 text-sm font-bold text-slate-800">{complaint.category}</dd>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                <dt className="text-xs font-semibold text-slate-400">Priority Level</dt>
                <dd className="mt-1 flex items-center gap-1.5 text-sm font-bold text-slate-800">
                  <PriorityBadge value={complaint.priority} />
                </dd>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                <dt className="text-xs font-semibold text-slate-400">Current Status</dt>
                <dd className="mt-1 flex items-center gap-1.5 text-sm font-bold text-slate-800">
                  <StatusBadge value={complaint.status} />
                </dd>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                <dt className="text-xs font-semibold text-slate-400">Submitted Date</dt>
                <dd className="mt-1 text-xs font-medium text-slate-700">
                  {formatDate(complaint.createdAt)}
                </dd>
              </div>
              {complaint.resolvedAt && (
                <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                  <dt className="text-xs font-semibold text-slate-400">Resolved Date</dt>
                  <dd className="mt-1 text-xs font-medium text-emerald-700">
                    {formatDate(complaint.resolvedAt)}
                  </dd>
                </div>
              )}
              {complaint.residentId && (
                <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                  <dt className="text-xs font-semibold text-slate-400">Reported By</dt>
                  <dd className="mt-1 text-xs font-medium text-slate-800 truncate">
                    {complaint.residentId.name} ({complaint.residentId.email})
                  </dd>
                </div>
              )}
            </dl>

            {/* Description detail */}
            <div className="rounded-lg border border-slate-100 bg-slate-50/40 p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Problem Description
              </h3>
              <p className="text-sm leading-relaxed text-slate-800 whitespace-pre-wrap">
                {complaint.description}
              </p>
            </div>

            {/* Photo Evidence */}
            {complaint.photoUrl && (
              <div className="border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <ImageIcon size={15} /> Attached Photo Evidence
                  </h3>
                  <button
                    type="button"
                    onClick={() => setLightboxOpen(true)}
                    className="text-xs font-semibold text-brand hover:underline flex items-center gap-1"
                  >
                    <Eye size={13} /> View Fullscreen
                  </button>
                </div>
                <div
                  className="relative group cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-slate-100 max-w-md"
                  onClick={() => setLightboxOpen(true)}
                >
                  <img
                    className="max-h-72 w-full object-contain transition-transform duration-200 group-hover:scale-[1.02]"
                    src={complaint.photoUrl}
                    alt="Complaint evidence"
                  />
                  <div className="absolute inset-0 bg-slate-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1.5 backdrop-blur-[2px]">
                    <Eye size={16} /> Click to enlarge
                  </div>
                </div>

                {/* Resident-friendly Photo Analysis */}
                {role === "resident" && complaint.visualAnalysis && (
                  <div className="mt-3 max-w-md rounded-lg border border-indigo-100 bg-indigo-50/50 p-3 space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-indigo-600" />
                      <span className="text-xs font-bold text-slate-900">Photo Analysis</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Nivara analyzed your photo. Visual indicators suggest: <strong>{complaint.visualAnalysis.category.toLowerCase()}</strong>.
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <span className="inline-flex items-center gap-1 rounded bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        <CheckCircle2 size={11} /> Looks correct
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Admin AI Operations Triage & Visual Intelligence */}
          {role === "admin" && (
            <AiTriagePanel
              complaintId={complaint._id}
              initialTriage={complaint.aiTriage}
              initialVisualAnalysis={complaint.visualAnalysis}
              initialMultimodalAssessment={complaint.multimodalAssessment}
              initialAiAnalysisStatus={complaint.aiAnalysisStatus}
              hasPhoto={Boolean(complaint.photoUrl)}
              photoUrl={complaint.photoUrl}
              currentPriority={complaint.priority}
              currentCategory={complaint.category}
              onApplyRecommendation={async ({ priority, category }) => {
                if (priority) {
                  setForm((prev) => ({ ...prev, priority }));
                  try {
                    await api.patch(`/admin/complaints/${id}/priority`, { priority });
                    addToast(`Priority updated to ${priority} based on AI triage.`);
                    await load();
                  } catch (err) {
                    addToast(getErrorMessage(err), "error");
                  }
                }
              }}
            />
          )}

          {/* Activity / Status Timeline */}
          <div className="panel">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-800">Status & Activity History</h3>
                <p className="text-xs text-slate-400">Complete audit log of actions and updates</p>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                {complaint.statusHistory?.length || 0} events
              </span>
            </div>
            <StatusTimeline history={complaint.statusHistory} />
          </div>
        </section>

        {/* Right: Actions / Sidebar info */}
        <aside className="space-y-5 xl:sticky xl:top-8 self-start">
          {role === "admin" ? (
            <div className="panel space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Shield size={16} className="text-brand" />
                <h3 className="font-bold text-slate-900">Admin Control Panel</h3>
              </div>

              {isClosed ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-5 text-center">
                  <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <CheckCircle2 size={22} />
                  </div>
                  <p className="text-base font-bold text-emerald-800">Resolved & Closed</p>
                  <p className="mt-1 text-xs text-emerald-700 leading-relaxed">
                    This complaint was successfully resolved on {formatDate(complaint.resolvedAt)}. Resolved complaints are archived and locked.
                  </p>
                </div>
              ) : (
                <>
                  {/* Update Priority */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Priority Level
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={form.priority}
                        disabled={updating}
                        onChange={(e) => setForm({ ...form, priority: e.target.value })}
                        className="text-sm py-2"
                      >
                        {["Low", "Medium", "High"].map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                      <button
                        className="btn-secondary text-xs px-3 shrink-0"
                        onClick={updatePriority}
                        disabled={updating || form.priority === complaint.priority}
                      >
                        {updating ? "Saving..." : "Set"}
                      </button>
                    </div>
                  </div>

                  {/* Update Status Form */}
                  <form className="space-y-3 border-t border-slate-100 pt-4" onSubmit={updateStatus}>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                      Lifecycle Transition
                    </label>
                    <select
                      value={form.status}
                      disabled={updating}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                      className="text-sm py-2"
                    >
                      {statusOptions.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>

                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                      Status Note
                    </label>
                    <textarea
                      className="min-h-24 text-xs"
                      placeholder="Explain action taken or assignment details (sent to resident via email)..."
                      value={form.note}
                      disabled={updating}
                      onChange={(e) => setForm({ ...form, note: e.target.value })}
                    />

                    <button
                      className="btn w-full py-2.5 text-xs font-bold"
                      disabled={updating || (form.status === complaint.status && !form.note.trim())}
                    >
                      {updating ? "Updating Status..." : "Apply Status Update"}
                    </button>
                  </form>
                </>
              )}
            </div>
          ) : (
            <div className="panel space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Clock size={16} className="text-brand" />
                <h3 className="font-bold text-slate-900">Request Status</h3>
              </div>
              <div className="rounded-lg bg-slate-50 p-4 text-xs text-slate-600 leading-relaxed">
                {isClosed ? (
                  <p className="text-emerald-700 font-medium">
                    ✓ This maintenance request has been marked as resolved by the administration.
                  </p>
                ) : (
                  <p>
                    Your request is in our maintenance pipeline. When the admin updates the status or leaves a note, you will receive an automatic email notification.
                  </p>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Lightbox Modal */}
      {lightboxOpen && complaint.photoUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs animate-fade-in"
          onClick={() => setLightboxOpen(false)}
        >
          <div
            className="relative max-h-[90vh] max-w-4xl overflow-hidden rounded-xl bg-white p-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute right-4 top-4 z-10 rounded-full bg-slate-900/70 p-1.5 text-white hover:bg-slate-900"
              aria-label="Close image preview"
            >
              <X size={18} />
            </button>
            <img
              src={complaint.photoUrl}
              alt="Complaint evidence full size"
              className="max-h-[82vh] w-full object-contain rounded-lg"
            />
            <div className="flex items-center justify-between px-3 py-2 text-xs text-slate-600">
              <span>Evidence for #{String(complaint._id).slice(-6)} · {complaint.category}</span>
              <a
                href={complaint.photoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand font-semibold hover:underline flex items-center gap-1"
              >
                Open original in new tab <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

