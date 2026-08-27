import { useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  User as UserIcon
} from "lucide-react";
import { PriorityBadge, StatusBadge, OverdueBadge } from "./Badge.jsx";
import { formatDateShort, formatRelativeTime } from "../utils/format.js";

const COLUMNS = [
  {
    id: "Open",
    title: "Open",
    bgHeader: "bg-sky-50 text-sky-800 border-sky-200",
    dot: "bg-sky-500",
    emptyMsg: "No open complaints."
  },
  {
    id: "In Progress",
    title: "In Progress",
    bgHeader: "bg-amber-50 text-amber-800 border-amber-200",
    dot: "bg-amber-500",
    emptyMsg: "No complaints currently in progress."
  },
  {
    id: "Resolved",
    title: "Resolved",
    bgHeader: "bg-emerald-50 text-emerald-800 border-emerald-200",
    dot: "bg-emerald-500",
    emptyMsg: "No resolved complaints."
  }
];

export default function OperationsBoard({ complaints, basePath, adminActions }) {
  const [transitionNote, setTransitionNote] = useState({});
  const [activeNoteCard, setActiveNoteCard] = useState(null);

  const getColumnComplaints = (status) => {
    return complaints.filter((c) => c.status === status);
  };

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {COLUMNS.map((col) => {
        const items = getColumnComplaints(col.id);
        return (
          <div
            key={col.id}
            className="flex flex-col rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5"
          >
            {/* Column Header */}
            <div className="mb-3 flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${col.dot}`} />
                <h3 className="text-sm font-bold text-slate-800">{col.title}</h3>
              </div>
              <span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${col.bgHeader}`}>
                {items.length}
              </span>
            </div>

            {/* Column Cards */}
            <div className="flex-1 space-y-3 overflow-y-auto min-h-[300px]">
              {items.length === 0 ? (
                <div className="flex h-36 items-center justify-center rounded-lg border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
                  {col.emptyMsg}
                </div>
              ) : (
                items.map((complaint) => (
                  <KanbanCard
                    key={complaint._id}
                    complaint={complaint}
                    basePath={basePath}
                    adminActions={adminActions}
                    activeNoteCard={activeNoteCard}
                    setActiveNoteCard={setActiveNoteCard}
                    note={transitionNote[complaint._id] || ""}
                    setNote={(text) =>
                      setTransitionNote((prev) => ({ ...prev, [complaint._id]: text }))
                    }
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KanbanCard({
  complaint,
  basePath,
  adminActions,
  activeNoteCard,
  setActiveNoteCard,
  note,
  setNote
}) {
  const isUpdating = adminActions?.updatingId === complaint._id;
  const cardError = adminActions?.errorFor?.[complaint._id];
  const isNoteOpen = activeNoteCard === complaint._id;

  const handleQuickTransition = (targetStatus) => {
    if (adminActions?.onStatusUpdate) {
      adminActions.onStatusUpdate(complaint, targetStatus, note);
      setActiveNoteCard(null);
      setNote("");
    }
  };

  return (
    <div
      className={`rounded-lg border bg-white p-4 shadow-card transition-all duration-150 ${
        complaint.isOverdue
          ? "border-rose-300 bg-rose-50/20"
          : "border-slate-200/80 hover:border-slate-300"
      }`}
    >
      {/* Top row: ID + Badges */}
      <div className="flex items-start justify-between gap-2">
        <Link
          to={`${basePath}/${complaint._id}`}
          className="font-mono text-xs font-bold text-brand hover:underline flex items-center gap-1"
        >
          #{String(complaint._id).slice(-6)}
          <ExternalLink size={12} className="opacity-60" />
        </Link>
        <div className="flex flex-wrap items-center gap-1">
          <PriorityBadge value={complaint.priority} />
          {complaint.isOverdue && <OverdueBadge />}
        </div>
      </div>

      {/* Category & Description */}
      <div className="mt-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {complaint.category}
        </p>
        <p className="mt-1 text-sm font-medium text-slate-800 line-clamp-2">
          {complaint.description}
        </p>
      </div>

      {/* Metadata: Resident & Age */}
      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs text-slate-400">
        <span className="flex items-center gap-1 truncate text-slate-600">
          <UserIcon size={12} className="text-slate-400" />
          {complaint.residentId?.name || "Resident"}
        </span>
        <span className="shrink-0 flex items-center gap-1">
          <Clock size={12} />
          {formatRelativeTime(complaint.createdAt)}
        </span>
      </div>

      {/* Error message if any */}
      {cardError && (
        <div className="mt-2 rounded bg-rose-50 p-2 text-xs text-rose-700">
          {cardError}
        </div>
      )}

      {/* Admin Action Buttons */}
      {adminActions && complaint.status !== "Resolved" && (
        <div className="mt-3 border-t border-slate-100 pt-2.5">
          {isNoteOpen ? (
            <div className="space-y-2">
              <input
                className="py-1 text-xs"
                placeholder="Add optional note..."
                value={note}
                disabled={isUpdating}
                onChange={(e) => setNote(e.target.value)}
              />
              <div className="flex gap-1.5">
                {complaint.status === "Open" && (
                  <button
                    className="btn flex-1 py-1 text-xs"
                    disabled={isUpdating}
                    onClick={() => handleQuickTransition("In Progress")}
                  >
                    → In Progress
                  </button>
                )}
                <button
                  className="btn bg-emerald-600 hover:bg-emerald-700 flex-1 py-1 text-xs"
                  disabled={isUpdating}
                  onClick={() => handleQuickTransition("Resolved")}
                >
                  ✓ Resolve
                </button>
                <button
                  type="button"
                  className="btn-secondary py-1 text-xs px-2"
                  onClick={() => setActiveNoteCard(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <button
                type="button"
                className="text-[11px] font-medium text-brand hover:underline"
                onClick={() => setActiveNoteCard(complaint._id)}
              >
                + Add Note & Move
              </button>
              <div className="flex gap-1">
                {complaint.status === "Open" && (
                  <button
                    className="inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700 hover:bg-amber-100 transition-colors"
                    disabled={isUpdating}
                    onClick={() => handleQuickTransition("In Progress")}
                  >
                    In Progress <ArrowRight size={11} />
                  </button>
                )}
                <button
                  className="inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                  disabled={isUpdating}
                  onClick={() => handleQuickTransition("Resolved")}
                >
                  Resolve <CheckCircle2 size={11} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {complaint.status === "Resolved" && (
        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-emerald-600 font-medium">
          <span className="flex items-center gap-1">
            <CheckCircle2 size={12} /> Resolved
          </span>
          {complaint.resolvedAt && (
            <span className="text-slate-400">
              {formatDateShort(complaint.resolvedAt)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
