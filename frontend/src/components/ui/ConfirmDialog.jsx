import React from "react";
import { AlertTriangle, AlertCircle } from "lucide-react";
import { Modal } from "./Modal.jsx";
import { Button } from "./Button.jsx";

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  description = "Are you sure you want to proceed? This action cannot be undone.",
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  loading = false
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="sm" showCloseButton={!loading}>
      <div className="flex flex-col items-center text-center">
        <div
          className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${
            variant === "danger"
              ? "bg-rose-50 text-rose-600 border border-rose-100"
              : "bg-brand-50 text-brand-600 border border-brand-100"
          }`}
        >
          {variant === "danger" ? <AlertTriangle size={24} /> : <AlertCircle size={24} />}
        </div>

        <h3 className="text-base font-bold text-slate-900">{title}</h3>
        <p className="mt-2 text-xs leading-relaxed text-slate-500">{description}</p>

        <div className="mt-6 flex w-full gap-2.5">
          <Button
            variant="secondary"
            className="flex-1"
            disabled={loading}
            onClick={onClose}
          >
            {cancelText}
          </Button>
          <Button
            variant={variant}
            className="flex-1"
            loading={loading}
            onClick={onConfirm}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export { ConfirmDialog };
