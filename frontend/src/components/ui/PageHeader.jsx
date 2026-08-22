import { Link } from "react-router-dom";

export function PageHeader({ title, subtitle, action, breadcrumbs }) {
  return (
    <div className="mb-6">
      {breadcrumbs && <nav className="mb-2 text-sm text-slate-500">{breadcrumbs}</nav>}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink lg:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500 lg:text-base">{subtitle}</p>}
        </div>
        {action}
      </div>
    </div>
  );
}

export function GreetingHeader({ name, subtitle, action }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink lg:text-3xl">
          {name} 👋
        </h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500 lg:text-base">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function QuickAction({ to, icon: Icon, label, variant = "secondary" }) {
  const cls = variant === "primary" ? "btn" : "btn-secondary";
  return (
    <Link to={to} className={`${cls} text-sm`}>
      {Icon && <Icon size={16} />}
      {label}
    </Link>
  );
}

export function PageTitle({ title, action }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-bold">{title}</h1>
      {action}
    </div>
  );
}
