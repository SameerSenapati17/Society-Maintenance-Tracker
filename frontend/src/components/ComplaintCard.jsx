import { Link } from "react-router-dom";
import { Clock, ImageIcon } from "lucide-react";
import { PriorityBadge, StatusBadge, OverdueBadge, ClosedBadge } from "./Badge.jsx";
import { formatRelativeTime } from "../utils/format.js";

export default function ComplaintCard({ complaint, basePath }) {
  return (
    <Link
      to={`${basePath}/${complaint._id}`}
      className={`panel card-hover block group relative ${
        complaint.isOverdue ? "border-rose-300 bg-rose-50/20" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-xs font-bold text-slate-400 group-hover:text-brand transition-colors">
          #{String(complaint._id).slice(-6)}
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          <PriorityBadge value={complaint.priority} />
          <StatusBadge value={complaint.status} />
          {complaint.isOverdue && <OverdueBadge />}
        </div>
      </div>

      <div className="mt-2.5">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
          {complaint.category}
        </p>
        <p className="mt-1 text-sm font-semibold text-slate-800 line-clamp-2 leading-relaxed">
          {complaint.description}
        </p>
      </div>

      <div className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs text-slate-400">
        <span className="flex items-center gap-1">
          <Clock size={12} />
          {formatRelativeTime(complaint.updatedAt || complaint.createdAt)}
        </span>
        {complaint.photoUrl && (
          <span className="flex items-center gap-1 text-[11px] font-medium text-slate-500">
            <ImageIcon size={12} /> Evidence attached
          </span>
        )}
      </div>
    </Link>
  );
}

