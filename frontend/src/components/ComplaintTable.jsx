import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardList } from "lucide-react";
import { PriorityBadge, StatusBadge, OverdueBadge } from "./Badge.jsx";
import EmptyState from "./ui/EmptyState.jsx";
import { formatDate, formatRelativeTime } from "../utils/format.js";

const priorityValues = ["Low", "Medium", "High"];

function getAllowedStatusOptions(currentStatus) {
  if (currentStatus === "Open") return ["Open", "In Progress", "Resolved"];
  if (currentStatus === "In Progress") return ["In Progress", "Resolved"];
  return ["Resolved"];
}

export default function ComplaintTable({ complaints, basePath, showResident, adminActions }) {
  if (!complaints.length) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No complaints found"
        description={adminActions ? "No complaints match your current filters." : "You haven't reported any maintenance issues yet."}
        actionLabel={adminActions ? undefined : "Report an Issue"}
        actionTo={adminActions ? undefined : "/resident/complaints/new"}
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-card">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">ID</th>
            {showResident && <th className="px-4 py-3">Resident</th>}
            <th className="px-4 py-3">Category</th>
            <th className="hidden px-4 py-3 md:table-cell">Description</th>
            <th className="px-4 py-3">Priority</th>
            <th className="px-4 py-3">Status</th>
            <th className="hidden px-4 py-3 lg:table-cell">Created</th>
            <th className="px-4 py-3">Overdue</th>
            {adminActions && <th className="px-4 py-3">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {complaints.map((item) => (
            <tr
              key={item._id}
              className={`transition-colors hover:bg-slate-50/80 ${item.isOverdue ? "bg-rose-50/60" : ""}`}
            >
              <td className="px-4 py-3 font-mono text-xs">
                <Link className="font-semibold text-brand hover:underline" to={`${basePath}/${item._id}`}>
                  #{String(item._id).slice(-6)}
                </Link>
              </td>
              {showResident && (
                <td className="px-4 py-3 text-slate-700">{item.residentId?.name || "—"}</td>
              )}
              <td className="px-4 py-3 font-medium text-slate-700">{item.category}</td>
              <td className="hidden max-w-xs truncate px-4 py-3 text-slate-600 md:table-cell">{item.description}</td>
              <td className="px-4 py-3"><PriorityBadge value={item.priority} /></td>
              <td className="px-4 py-3"><StatusBadge value={item.status} /></td>
              <td className="hidden px-4 py-3 text-slate-500 lg:table-cell">{formatDate(item.createdAt)}</td>
              <td className="px-4 py-3">{item.isOverdue ? <OverdueBadge /> : <span className="text-slate-300">—</span>}</td>
              {adminActions && (
                <td className="min-w-[280px] px-4 py-3">
                  {item.status === "Resolved" ? (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                      <div className="font-semibold text-emerald-700">✓ Resolved · Closed</div>
                      <div className="mt-1 text-xs text-slate-500">Cannot be reopened.</div>
                    </div>
                  ) : (
                    <AdminComplaintActions
                      complaint={item}
                      {...adminActions}
                      error={adminActions.errorFor?.[item._id]}
                    />
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AdminComplaintActions({ complaint, updatingId, error, onPriorityChange, onStatusUpdate }) {
  const [nextStatus, setNextStatus] = useState(complaint.status);
  const [note, setNote] = useState("");
  const isUpdating = updatingId === complaint._id;
  const statusOptions = getAllowedStatusOptions(complaint.status);

  useEffect(() => {
    setNextStatus(complaint.status);
    setNote("");
  }, [complaint._id, complaint.status]);

  return (
    <div className="space-y-2">
      {error && <div className="rounded-md bg-rose-50 p-2 text-xs text-rose-700">{error}</div>}
      <label className="block text-xs font-semibold text-slate-600">
        Priority
        <select
          className="mt-1 py-1.5 text-sm"
          value={complaint.priority}
          disabled={isUpdating}
          onChange={(event) => onPriorityChange(complaint, event.target.value)}
        >
          {priorityValues.map((priority) => (
            <option key={priority} value={priority}>{priority}</option>
          ))}
        </select>
      </label>
      <label className="block text-xs font-semibold text-slate-600">
        Status
        <select
          className="mt-1 py-1.5 text-sm"
          value={nextStatus}
          disabled={isUpdating}
          onChange={(event) => setNextStatus(event.target.value)}
        >
          {statusOptions.map((status) => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
      </label>
      <textarea
        className="min-h-16 py-1.5 text-sm"
        placeholder="Optional status note"
        value={note}
        disabled={isUpdating}
        onChange={(event) => setNote(event.target.value)}
      />
      <button
        className="btn w-full py-2 text-xs"
        disabled={isUpdating || nextStatus === complaint.status}
        onClick={() => onStatusUpdate(complaint, nextStatus, note)}
      >
        {isUpdating ? "Updating..." : "Update Status"}
      </button>
    </div>
  );
}

export { ComplaintTable };
