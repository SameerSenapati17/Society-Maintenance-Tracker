import { formatDate } from "../utils/format.js";
import { StatusBadge } from "./Badge.jsx";

export default function StatusTimeline({ history }) {
  if (!history?.length) return null;

  const sorted = [...history].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return (
    <div className="space-y-0">
      {sorted.map((item, index) => (
        <div key={item._id || index} className="relative flex gap-4 pb-6 last:pb-0">
          {index < sorted.length - 1 && (
            <div className="absolute left-[7px] top-4 h-full w-0.5 bg-slate-200" />
          )}
          <div className="relative z-10 mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-brand bg-white" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge value={item.status} />
              <span className="text-sm text-slate-500">{formatDate(item.timestamp)}</span>
            </div>
            <p className="mt-1 text-sm font-medium text-slate-700">
              {item.changedBy?.name || "User"}
              {item.changedBy?.role && (
                <span className="ml-1 font-normal text-slate-500">({item.changedBy.role})</span>
              )}
            </p>
            {item.note && (
              <p className="mt-1 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                &ldquo;{item.note}&rdquo;
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
