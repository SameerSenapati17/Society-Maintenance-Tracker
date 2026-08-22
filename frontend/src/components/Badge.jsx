export function StatusBadge({ value }) {
  const styles = {
    Open: "bg-sky-100 text-sky-800 ring-1 ring-sky-200",
    "In Progress": "bg-amber-100 text-amber-800 ring-1 ring-amber-200",
    Resolved: "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200"
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${styles[value] || "bg-slate-100 text-slate-700"}`}>
      {value}
    </span>
  );
}

export function PriorityBadge({ value }) {
  const styles = {
    Low: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
    Medium: "bg-yellow-100 text-yellow-800 ring-1 ring-yellow-200",
    High: "bg-rose-100 text-rose-800 ring-1 ring-rose-200"
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${styles[value] || styles.Low}`}>
      {value}
    </span>
  );
}

export function OverdueBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-rose-600 px-2.5 py-1 text-xs font-bold text-white">
      Overdue
    </span>
  );
}

export function ImportantBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-amber-500 px-2.5 py-1 text-xs font-bold text-white">
      Important
    </span>
  );
}

export function ClosedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
      ✓ Closed
    </span>
  );
}
