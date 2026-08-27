import React from "react";
import { cn } from "../../utils/cn.js";

export function LoadingSpinner({ size = 20, className = "" }) {
  return (
    <svg
      className={cn("animate-spin text-brand-600", className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3.5" />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

export function PageLoader({ message = "Loading..." }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3.5 py-20 animate-fade-in">
      <LoadingSpinner size={32} />
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{message}</p>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="panel space-y-3">
      <div className="skeleton h-4 w-28" />
      <div className="skeleton h-8 w-20" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }) {
  return (
    <div className="panel space-y-3">
      <div className="skeleton h-7 w-full rounded-md opacity-70" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton h-11 w-full rounded-lg" />
      ))}
    </div>
  );
}

