import React, { forwardRef, useState } from "react";
import { Lock, Eye, EyeOff } from "lucide-react";
import { cn } from "../../utils/cn.js";

export const PasswordInput = forwardRef(function PasswordInput(
  {
    label = "Password",
    error,
    helperText,
    id,
    placeholder = "••••••••",
    required = false,
    disabled = false,
    className = "",
    containerClassName = "",
    autoComplete = "current-password",
    ...props
  },
  ref
) {
  const [showPassword, setShowPassword] = useState(false);
  const inputId = id || label.toLowerCase().replace(/\s+/g, "-");

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
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
          <Lock size={16} />
        </div>

        <input
          ref={ref}
          id={inputId}
          type={showPassword ? "text" : "password"}
          required={required}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          className={cn(
            "w-full rounded-lg border bg-white pl-10 pr-10 py-2.5 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400",
            error
              ? "border-rose-300 text-rose-900 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
              : "border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20",
            className
          )}
          {...props}
        />

        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShowPassword((prev) => !prev)}
          className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-700 transition-colors focus:outline-none"
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>

      {error ? (
        <p id={`${inputId}-error`} className="text-xs font-medium text-rose-600 animate-fade-in" role="alert">
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

export default PasswordInput;
