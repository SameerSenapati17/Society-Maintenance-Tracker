import React from "react";
import { Link } from "react-router-dom";
import { cn } from "../../utils/cn.js";
import { Button } from "./Button.jsx";

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionTo,
  onAction,
  secondaryActionLabel,
  secondaryActionTo,
  onSecondaryAction,
  className = ""
}) {
  return (
    <div className={cn("panel flex flex-col items-center py-14 text-center", className)}>
      {Icon && (
        <div className="mb-4 flex h-13 w-13 items-center justify-center rounded-2xl border border-slate-200/80 bg-slate-50 text-slate-400 shadow-subtle">
          <Icon size={24} strokeWidth={1.75} />
        </div>
      )}
      <h3 className="text-base font-bold tracking-tight text-slate-900">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-slate-500">{description}</p>
      )}

      {(actionLabel || secondaryActionLabel) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
          {actionLabel && actionTo && (
            <Link to={actionTo} className="btn text-xs">
              {actionLabel}
            </Link>
          )}
          {actionLabel && onAction && (
            <Button variant="primary" size="sm" onClick={onAction}>
              {actionLabel}
            </Button>
          )}
          {secondaryActionLabel && secondaryActionTo && (
            <Link to={secondaryActionTo} className="btn-secondary text-xs">
              {secondaryActionLabel}
            </Link>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <Button variant="secondary" size="sm" onClick={onSecondaryAction}>
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export { EmptyState };

