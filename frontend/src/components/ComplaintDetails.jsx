import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ImageIcon } from "lucide-react";
import AppLayout from "../layouts/AppLayout.jsx";
import { PriorityBadge, StatusBadge, OverdueBadge, ClosedBadge } from "./Badge.jsx";
import StatusTimeline from "./StatusTimeline.jsx";
import { PageHeader } from "./ui/PageHeader.jsx";
import { PageLoader } from "./ui/LoadingState.jsx";
import EmptyState from "./ui/EmptyState.jsx";
import { api, getErrorMessage } from "../services/api.js";
import { formatDate } from "../utils/format.js";
import { useToast } from "../context/ToastContext.jsx";

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
      addToast("Status updated successfully.");
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
      addToast("Priority updated successfully.");
      await load();
    } catch (err) {
      addToast(getErrorMessage(err), "error");
    } finally {
      setUpdating(false);
    }
  }

  const backPath = role === "admin" ? "/admin/complaints" : "/resident/complaints";

  if (!complaint && !error) {
    return (
      <AppLayout role={role}>
        <PageLoader message="Loading complaint details..." />
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout role={role}>
        <EmptyState title="Unable to load complaint" description={error} actionLabel="Go back" actionTo={backPath} />
      </AppLayout>
    );
  }

  const isClosed = complaint.status === "Resolved";
  const statusOptions = getAllowedStatusOptions(complaint.status);

  return (
    <AppLayout role={role}>
      <Link to={backPath} className="btn-ghost mb-4 -ml-2 text-sm">
        <ArrowLeft size={16} /> Back to complaints
      </Link>

      <PageHeader
        title={`Complaint #${String(complaint._id).slice(-6)}`}
        subtitle={complaint.category}
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        {/* Left: Details */}
        <section className="space-y-5">
          <div className="panel space-y-4">
            {complaint.isOverdue && (
              <div className="flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-3 text-sm font-semibold text-white">
                <OverdueBadge /> This complaint is overdue and requires attention.
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <StatusBadge value={complaint.status} />
              <PriorityBadge value={complaint.priority} />
              {isClosed && <ClosedBadge />}
            </div>

            <div>
              <h2 className="text-lg font-semibold text-ink">{complaint.description}</h2>
            </div>

            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Category</dt>
                <dd className="mt-0.5 font-medium text-ink">{complaint.category}</dd>
              </div>
              {complaint.residentId && role === "admin" && (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reported by</dt>
                  <dd className="mt-0.5 font-medium text-ink">{complaint.residentId.name}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Created</dt>
                <dd className="mt-0.5 text-slate-700">{formatDate(complaint.createdAt)}</dd>
              </div>
              {complaint.resolvedAt && (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Resolved</dt>
                  <dd className="mt-0.5 text-slate-700">{formatDate(complaint.resolvedAt)}</dd>
                </div>
              )}
            </dl>

            {complaint.photoUrl && (
              <div>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <ImageIcon size={16} /> Evidence
                </h3>
                <a href={complaint.photoUrl} target="_blank" rel="noopener noreferrer">
                  <img
                    className="max-h-96 w-full rounded-lg border border-slate-200 object-contain"
                    src={complaint.photoUrl}
                    alt="Complaint evidence"
                  />
                </a>
              </div>
            )}
          </div>

          <div className="panel">
            <h3 className="mb-4 text-lg font-semibold text-ink">Resolution Timeline</h3>
            <StatusTimeline history={complaint.statusHistory} />
          </div>
        </section>

        {/* Right: Admin controls */}
        {role === "admin" && (
          <aside className="panel h-fit space-y-4 xl:sticky xl:top-8">
            <h3 className="font-semibold text-ink">Status Update</h3>

            {isClosed ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-center">
                <p className="text-lg font-bold text-emerald-700">✓ Resolved</p>
                <p className="mt-1 text-sm text-emerald-600">This complaint is closed and cannot be reopened.</p>
              </div>
            ) : (
              <>
                <label className="block text-sm font-medium text-slate-700">
                  Priority
                  <select
                    className="mt-1"
                    value={form.priority}
                    disabled={updating}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  >
                    {["Low", "Medium", "High"].map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>
                <button
                  className="btn-secondary w-full"
                  onClick={updatePriority}
                  disabled={updating || form.priority === complaint.priority}
                >
                  {updating ? "Updating..." : "Update Priority"}
                </button>

                <form className="space-y-3 border-t border-slate-100 pt-4" onSubmit={updateStatus}>
                  <label className="block text-sm font-medium text-slate-700">
                    Status
                    <select
                      className="mt-1"
                      value={form.status}
                      disabled={updating}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                    >
                      {statusOptions.map((item) => (
                        <option key={item}>{item}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Status note
                    <textarea
                      className="mt-1 min-h-24"
                      placeholder="Add a note about this update..."
                      value={form.note}
                      disabled={updating}
                      onChange={(e) => setForm({ ...form, note: e.target.value })}
                    />
                  </label>
                  <button
                    className="btn w-full"
                    disabled={updating || form.status === complaint.status}
                  >
                    {updating ? "Updating..." : "Update Status"}
                  </button>
                </form>
              </>
            )}
          </aside>
        )}
      </div>
    </AppLayout>
  );
}
