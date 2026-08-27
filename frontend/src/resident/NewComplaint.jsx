import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileImage,
  ImagePlus,
  Info,
  Trash2,
  UploadCloud,
  X
} from "lucide-react";
import AppLayout from "../layouts/AppLayout.jsx";
import { PageHeader } from "../components/ui/PageHeader.jsx";
import { LoadingSpinner } from "../components/ui/LoadingState.jsx";
import { api, getErrorMessage } from "../services/api.js";
import { useToast } from "../context/ToastContext.jsx";

const categories = ["Plumbing", "Electrical", "Cleaning", "Security", "Lift", "Parking", "Other"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

function formatFileSize(bytes) {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function NewComplaint() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const fileRef = useRef(null);
  const [form, setForm] = useState({ category: "Plumbing", description: "", photo: null });
  const [preview, setPreview] = useState(null);
  const [fileMeta, setFileMeta] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function processFile(file) {
    setError("");
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Invalid file format. Please upload a JPG, JPEG, PNG, or WEBP image.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError(`Image exceeds size limit of 5 MB (selected file is ${formatFileSize(file.size)}).`);
      return;
    }

    setForm((prev) => ({ ...prev, photo: file }));
    setFileMeta({ name: file.name, size: file.size, type: file.type });
    setPreview(URL.createObjectURL(file));
  }

  function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  function handleDragOver(e) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }

  function removePhoto() {
    setForm((prev) => ({ ...prev, photo: null }));
    setPreview(null);
    setFileMeta(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function submit(e) {
    e.preventDefault();
    if (form.description.trim().length < 10) {
      setError("Please provide a detailed description (at least 10 characters).");
      return;
    }
    setError("");
    setSubmitting(true);

    const data = new FormData();
    data.append("category", form.category);
    data.append("description", form.description.trim());
    if (form.photo) data.append("photo", form.photo);

    try {
      const res = await api.post("/complaints", data);
      addToast("Complaint submitted successfully.");
      navigate(`/resident/complaints/${res.data.data.complaint._id}`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const descLength = form.description.trim().length;

  return (
    <AppLayout role="resident">
      <PageHeader
        title="Report a Maintenance Issue"
        subtitle="Submit your issue to the society maintenance operations team."
      />

      <form className="panel max-w-2xl space-y-6" onSubmit={submit}>
        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700" role="alert">
            <p className="font-semibold">Unable to submit complaint</p>
            <p className="mt-0.5 text-xs">{error}</p>
          </div>
        )}

        {/* Category Field */}
        <div>
          <label htmlFor="category" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Category <span className="text-rose-500">*</span>
          </label>
          <select
            id="category"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            required
            className="text-sm py-2.5"
          >
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-400">
            Categorizing helps assign the right maintenance specialist.
          </p>
        </div>

        {/* Description Field */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="description" className="block text-xs font-bold uppercase tracking-wider text-slate-600">
              Problem Description <span className="text-rose-500">*</span>
            </label>
            <span
              className={`text-[11px] font-medium ${
                descLength >= 10 ? "text-emerald-600" : "text-slate-400"
              }`}
            >
              {descLength}/10 min chars
            </span>
          </div>
          <textarea
            id="description"
            className="min-h-32 text-sm leading-relaxed"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Describe the issue in detail (e.g. location, severity, when it started)..."
            required
            minLength={10}
          />
          <p className="mt-1 text-xs text-slate-400">
            Be as specific as possible to speed up resolution.
          </p>
        </div>

        {/* Supporting Photo Field */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
              Supporting Photo <span className="font-normal text-slate-400 normal-case">(Optional)</span>
            </label>
            <span className="text-xs text-slate-400">Max 5 MB · JPG, PNG, WEBP</span>
          </div>

          {preview && fileMeta ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="flex items-start gap-4">
                <img
                  src={preview}
                  alt="Upload preview"
                  className="h-20 w-20 shrink-0 rounded-lg border border-slate-200 object-cover shadow-xs"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-800">{fileMeta.name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{formatFileSize(fileMeta.size)}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                      Ready to upload
                    </span>
                    <button
                      type="button"
                      onClick={removePhoto}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-800"
                    >
                      <Trash2 size={13} /> Remove photo
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-all ${
                isDragging
                  ? "border-brand bg-blue-50/60 scale-[0.99]"
                  : "border-slate-200 bg-slate-50/50 hover:border-brand/60 hover:bg-blue-50/20"
              }`}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-brand">
                <UploadCloud size={24} />
              </div>
              <p className="mt-2.5 text-sm font-bold text-slate-700">
                Drag and drop image here, or <span className="text-brand hover:underline">browse</span>
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Supports JPG, JPEG, PNG, or WEBP up to 5 MB
              </p>
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={handlePhotoChange}
              />
            </div>
          )}
        </div>

        {/* Submit Actions */}
        <div className="border-t border-slate-100 pt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => navigate("/resident/complaints")}
            disabled={submitting}
          >
            Cancel
          </button>
          <button className="btn px-6" disabled={submitting || descLength < 10}>
            {submitting ? (
              <span className="flex items-center gap-2">
                <LoadingSpinner size={16} /> Submitting Request...
              </span>
            ) : (
              "Submit Complaint"
            )}
          </button>
        </div>
      </form>
    </AppLayout>
  );
}

