import { Link } from "react-router-dom";
import { PriorityBadge, StatusBadge, OverdueBadge } from "./Badge.jsx";
import { formatRelativeTime } from "../utils/format.js";

export default function ComplaintCard({ complaint, basePath }) {
  return (
    <Link
      to={`${basePath}/${complaint._id}`}
      className={`panel card-hover block ${complaint.isOverdue ? "border-rose-200 bg-rose-50/40" : ""}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-ink">{complaint.description}</p>
          <p className="mt-0.5 text-sm text-slate-500">{complaint.category}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <PriorityBadge value={complaint.priority} />
          <StatusBadge value={complaint.status} />
          {complaint.isOverdue && <OverdueBadge />}
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-400">
        Updated {formatRelativeTime(complaint.updatedAt || complaint.createdAt)}
      </p>
    </Link>
  );
}
