import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "../../utils/cn.js";

const maxWidthStyles = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl"
};

export default function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = "md",
  showCloseButton = true,
  className = ""
}) {
  const modalRef = useRef(null);

  useEffect(() => {
    function handleKeyDown(e) {
      if (!isOpen) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onClose?.();
      }
    }

    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div
        ref={modalRef}
        className={cn(
          "relative z-10 w-full rounded-2xl border border-slate-200/80 bg-white p-6 shadow-modal animate-scale-in",
          maxWidthStyles[maxWidth] || maxWidthStyles.md,
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              {title && (
                <h2 id="modal-title" className="text-lg font-bold tracking-tight text-slate-900">
                  {title}
                </h2>
              )}
              {description && (
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                  {description}
                </p>
              )}
            </div>

            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}

        {/* Content Body */}
        <div>{children}</div>
      </div>
    </div>
  );
}

export { Modal };
