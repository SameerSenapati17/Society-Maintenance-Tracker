export default function StatCard({ label, value, icon: Icon, accent = "brand", subtitle }) {
  const accents = {
    brand: "text-indigo-600 bg-indigo-50",
    success: "text-emerald-600 bg-emerald-50",
    warning: "text-amber-600 bg-amber-50",
    danger: "text-rose-600 bg-rose-50",
    neutral: "text-slate-500 bg-slate-100"
  };


  return (
    <div className="panel card-hover">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold text-ink">{value ?? "—"}</p>
          {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${accents[accent]}`}>
            <Icon size={20} />
          </div>
        )}
      </div>
    </div>
  );
}
