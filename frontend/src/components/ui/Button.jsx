import React from "react";
import { cn } from "../../utils/cn.js";
import { LoadingSpinner } from "./LoadingState.jsx";

const variantStyles = {
  primary:
    "bg-brand-600 text-white shadow-subtle hover:bg-brand-700 active:bg-brand-800 focus:ring-brand-500/30",
  secondary:
    "border border-slate-200/90 bg-white text-slate-700 shadow-subtle hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100 focus:ring-slate-400/20",
  danger:
    "bg-rose-600 text-white shadow-subtle hover:bg-rose-700 active:bg-rose-800 focus:ring-rose-500/30",
  ghost:
    "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200/60 focus:ring-slate-300",
  outline:
    "border border-slate-300 bg-transparent text-slate-700 hover:bg-slate-50 active:bg-slate-100 focus:ring-slate-400/20"
};

const sizeStyles = {
  xs: "px-2.5 py-1 text-xs gap-1.5 rounded-md",
  sm: "px-3 py-1.5 text-xs font-semibold gap-1.5 rounded-lg",
  md: "px-4 py-2 text-sm font-semibold gap-2 rounded-lg",
  lg: "px-5 py-2.5 text-base font-semibold gap-2.5 rounded-xl"
};

export default function Button({
  children,
  type = "button",
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  icon: Icon,
  iconPosition = "left",
  className = "",
  onClick,
  ...props
}) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center font-medium transition-all duration-150 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100",
        variantStyles[variant] || variantStyles.primary,
        sizeStyles[size] || sizeStyles.md,
        className
      )}
      {...props}
    >
      {loading ? (
        <LoadingSpinner size={size === "xs" ? 12 : size === "sm" ? 14 : 16} className="shrink-0" />
      ) : Icon && iconPosition === "left" ? (
        <Icon size={size === "xs" ? 13 : size === "sm" ? 15 : 17} className="shrink-0" />
      ) : null}

      {children && <span>{children}</span>}

      {!loading && Icon && iconPosition === "right" && (
        <Icon size={size === "xs" ? 13 : size === "sm" ? 15 : 17} className="shrink-0" />
      )}
    </button>
  );
}

export { Button };
