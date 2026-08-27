import { Check, Clock, Edit3, MessageSquare, PlusCircle, User } from "lucide-react";
import { formatDate, formatRelativeTime } from "../utils/format.js";
import { StatusBadge } from "./Badge.jsx";

export default function StatusTimeline({ history }) {
  if (!history?.length) {
    return (
      <div className="py-6 text-center text-xs text-slate-400">
        No status history recorded.
      </div>
    );
  }

  const sorted = [...history].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const getNodeIcon = (status, isLatest) => {
    if (status === "Resolved") return <Check size={12} className="text-white stroke-[3]" />;
    if (status === "In Progress") return <Clock size={12} className="text-white stroke-[3]" />;
    return <PlusCircle size={12} className="text-white stroke-[3]" />;
  };

  const getNodeBg = (status) => {
    if (status === "Resolved") return "bg-emerald-600 border-emerald-200 ring-4 ring-emerald-50";
    if (status === "In Progress") return "bg-amber-500 border-amber-200 ring-4 ring-amber-50";
    return "bg-sky-600 border-sky-200 ring-4 ring-sky-50";
  };

  return (
    <div className="relative space-y-0 pl-2">
      {sorted.map((item, index) => {
        const isLatest = index === 0;
        return (
          <div key={item._id || index} className="relative flex gap-4 pb-7 last:pb-2">
            {/* Connecting Line */}
            {index < sorted.length - 1 && (
              <div className="absolute left-[11px] top-6 h-full w-[2px] bg-slate-200" />
            )}

            {/* Node Dot with Icon */}
            <div
              className={`relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border shadow-xs transition-transform ${getNodeBg(
                item.status
              )}`}
            >
              {getNodeIcon(item.status, isLatest)}
            </div>

            {/* Content Body */}
            <div className="min-w-0 flex-1 rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 transition-all hover:bg-slate-50">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <StatusBadge value={item.status} />
                  {isLatest && (
                    <span className="rounded bg-brand/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand">
                      Current
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Clock size={12} />
                  <span>{formatDate(item.timestamp)}</span>
                  <span className="text-slate-300">·</span>
                  <span>{formatRelativeTime(item.timestamp)}</span>
                </div>
              </div>

              {/* Actor */}
              <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-700">
                <User size={13} className="text-slate-400" />
                <span className="font-semibold">{item.changedBy?.name || "System"}</span>
                {item.changedBy?.role && (
                  <span className="rounded bg-slate-200/70 px-1.5 py-0.2 text-[10px] font-semibold text-slate-600 capitalize">
                    {item.changedBy.role}
                  </span>
                )}
              </div>

              {/* Note / Comment */}
              {item.note && (
                <div className="mt-2.5 flex items-start gap-2 rounded-lg border border-slate-200/80 bg-white p-3 text-xs text-slate-700 shadow-xs">
                  <MessageSquare size={14} className="mt-0.5 shrink-0 text-slate-400" />
                  <p className="leading-relaxed whitespace-pre-wrap">&ldquo;{item.note}&rdquo;</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

