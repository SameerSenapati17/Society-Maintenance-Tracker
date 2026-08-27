import React, { forwardRef } from "react";
import { cn } from "../../utils/cn.js";

export const Input = forwardRef(function Input(
  {
    label,
    error,
    helperText,
    icon: Icon,
    id,
    type = "text",
    required = false,
    disabled = false,
    className = "",
    containerClassName = "",
    ...props
  },
  ref
) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div className={cn("w-full space-y-1.5", containerClassName)}>
      {label && (
        <label
          htmlFor={inputId}
          className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-600"
        >
          <span>
            {label} {required && <span className="text-rose-500">*</span>}
          </span>
        </label>
      )}

      <div className="relative">
        {Icon && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
            <Icon size={16} />
          </div>
        )}

        <input
          ref={ref}
          id={inputId}
          type={type}
          required={required}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          className={cn(
            "w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-all duration-150 placeholder:text-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400",
            Icon ? "pl-10" : "",
            error
              ? "border-rose-300 text-rose-900 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
              : "border-slate-200 focus:border-brand-600 focus:ring-2 focus:ring-brand-500/20",
            className
          )}
          {...props}
        />
      </div>

      {error ? (
        <p id={`${inputId}-error`} className="text-xs font-medium text-rose-600" role="alert">
          {error}
        </p>
      ) : helperText ? (
        <p id={`${inputId}-helper`} className="text-xs text-slate-400">
          {helperText}
        </p>
      ) : null}
    </div>
  );
});

export default Input;
