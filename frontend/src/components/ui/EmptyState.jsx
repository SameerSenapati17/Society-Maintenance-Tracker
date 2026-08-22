import { Link } from "react-router-dom";

export default function EmptyState({ icon: Icon, title, description, actionLabel, actionTo, onAction }) {
  return (
    <div className="panel flex flex-col items-center py-12 text-center">
      {Icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <Icon size={28} />
        </div>
      )}
      <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
      {description && <p className="mt-2 max-w-sm text-sm text-slate-500">{description}</p>}
      {(actionLabel && actionTo) && (
        <Link to={actionTo} className="btn mt-5">{actionLabel}</Link>
      )}
      {(actionLabel && onAction) && (
        <button className="btn mt-5" onClick={onAction}>{actionLabel}</button>
      )}
    </div>
  );
}
