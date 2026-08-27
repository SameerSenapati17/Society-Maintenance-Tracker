import React from "react";
import { AlertTriangle, Clock, CheckCircle2, Megaphone } from "lucide-react";
import { cn } from "../../utils/cn.js";

const badgeVariants = {
  neutral: "bg-slate-100 text-slate-700 border-slate-200/80",
  brand: "bg-brand-50 text-brand-700 border-brand-200/80",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
  warning: "bg-amber-50 text-amber-700 border-amber-200/80",
  danger: "bg-rose-50 text-rose-700 border-rose-200/80",
  sky: "bg-sky-50 text-sky-700 border-sky-200/80"
};

const badgeDots = {
  neutral: "bg-slate-400",
  brand: "bg-brand-500",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-rose-500",
  sky: "bg-sky-500"
};

export default function Badge({
  variant = "neutral",
  size = "sm",
  dot = false,
  children,
  className = ""
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-semibold",
        size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-xs",
        badgeVariants[variant] || badgeVariants.neutral,
        className
      )}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", badgeDots[variant] || badgeDots.neutral)} />}
      {children}
    </span>
  );
}

export function StatusBadge({ value }) {
  const styles = {
    Open: { variant: "sky", dot: true },
    "In Progress": { variant: "warning", dot: true },
    Resolved: { variant: "success", dot: true }
  };

  const config = styles[value] || { variant: "neutral", dot: true };

  return (
    <Badge variant={config.variant} dot={config.dot}>
      {value}
    </Badge>
  );
}

export function PriorityBadge({ value }) {
  const styles = {
    Low: { variant: "neutral", dot: true },
    Medium: { variant: "warning", dot: true },
    High: { variant: "danger", dot: true }
  };

  const config = styles[value] || styles.Low;

  return (
    <Badge variant={config.variant} dot={config.dot}>
      {value}
    </Badge>
  );
}

export function OverdueBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-2.5 py-0.5 text-xs font-bold text-white shadow-subtle">
      <Clock size={11} className="stroke-[2.5]" />
      Overdue
    </span>
  );
}

export function ApproachingSlaBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-0.5 text-xs font-bold text-white shadow-subtle">
      <AlertTriangle size={11} className="stroke-[2.5]" />
      Near SLA
    </span>
  );
}

export function ImportantBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-0.5 text-xs font-bold text-white shadow-subtle">
      <Megaphone size={11} className="stroke-[2.5]" />
      Important
    </span>
  );
}

export function ClosedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
      <CheckCircle2 size={12} className="text-slate-500" />
      Closed
    </span>
  );
}

export { Badge };
