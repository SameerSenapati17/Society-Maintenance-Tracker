import React from "react";
import { Link } from "react-router-dom";
import { cn } from "../../utils/cn.js";

export function PageHeader({ title, subtitle, action, breadcrumbs, badge }) {
  return (
    <div className="mb-7">
      {breadcrumbs && <nav className="mb-2 text-xs font-medium text-slate-400">{breadcrumbs}</nav>}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl lg:text-3xl">
              {title}
            </h1>
            {badge}
          </div>
          {subtitle && (
            <p className="mt-1.5 text-xs text-slate-500 sm:text-sm leading-relaxed max-w-3xl">
              {subtitle}
            </p>
          )}
        </div>
        {action && <div className="flex shrink-0 items-center gap-2.5">{action}</div>}
      </div>
    </div>
  );
}

export function GreetingHeader({ name, subtitle, action, badge }) {
  return (
    <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
      <div>
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl lg:text-3xl">
            {name}
          </h1>
          {badge}
        </div>
        {subtitle && (
          <p className="mt-1.5 text-xs text-slate-500 sm:text-sm leading-relaxed max-w-3xl">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2.5">{action}</div>}
    </div>
  );
}

export function QuickAction({ to, icon: Icon, label, variant = "secondary", className = "" }) {
  const cls = variant === "primary" ? "btn" : "btn-secondary";
  return (
    <Link to={to} className={cn(cls, "text-xs py-2 px-3.5", className)}>
      {Icon && <Icon size={14} />}
      <span>{label}</span>
    </Link>
  );
}

export function PageTitle({ title, action }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
      {action}
    </div>
  );
}

