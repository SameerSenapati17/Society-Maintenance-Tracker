import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ImagePlus, X } from "lucide-react";
import AppLayout from "../layouts/AppLayout.jsx";
import { PageHeader } from "../components/ui/PageHeader.jsx";
import { LoadingSpinner } from "../components/ui/LoadingState.jsx";
import { api, getErrorMessage } from "../services/api.js";
import { useToast } from "../context/ToastContext.jsx";

const categories = ["Plumbing", "Electrical", "Cleaning", "Security", "Lift", "Parking", "Other"];
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export default function NewComplaint() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const fileRef = useRef(null);
  const [form, setForm] = useState({ category: "Plumbing", description: "", photo: null });
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    setError("");
    if (!file) {
      setForm({ ...form, photo: null });
      setPreview(null);
      return;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Please upload a JPG, JPEG, PNG, or WEBP image.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("Image must be smaller than 5 MB.");
      return;
    }
    setForm({ ...form, photo: file });
    setPreview(URL.createObjectURL(file));
  }

  function removePhoto() {
    setForm({ ...form, photo: null });
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function submit(e) {
    e.preventDefault();
    if (form.description.trim().length < 10) {
      setError("Description must be at least 10 characters.");
      return;
    }
    setError("");
    setSubmitting(true);
    const data = new FormData();
    data.append("category", form.category);
    data.append("description", form.description);
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

  return (
    <AppLayout role="resident">
      <PageHeader
        title="Report a Maintenance Issue"
        subtitle="Help us understand the problem so we can resolve it quickly."
      />

      <form className="panel max-w-2xl space-y-5" onSubmit={submit}>
        {error && (
          <div className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
            {error}
          </div>
        )}

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Category</span>
          <select
            className="mt-1"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            required
          >
            {categories.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <span className="mt-1 block text-xs text-slate-500">Select the type of maintenance issue.</span>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Description</span>
          <textarea
            className="mt-1 min-h-36"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Describe the issue in detail..."
            required
            minLength={10}
          />
          <span className="mt-1 block text-xs text-slate-500">Minimum 10 characters. Be as specific as possible.</span>
        </label>

        <div>
          <span className="text-sm font-medium text-slate-700">Upload supporting photo</span>
          <span className="ml-1 text-xs text-slate-500">(Optional)</span>

          {preview ? (
            <div className="relative mt-2 inline-block">
              <img src={preview} alt="Preview" className="max-h-48 rounded-lg border border-slate-200 object-cover" />
              <button
                type="button"
                className="absolute -right-2 -top-2 rounded-full bg-rose-600 p-1 text-white shadow-sm hover:bg-rose-700"
                onClick={removePhoto}
                aria-label="Remove photo"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <label className="mt-2 flex cursor-pointer flex-col items-center rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-8 transition-colors hover:border-brand hover:bg-blue-50/30">
              <ImagePlus size={32} className="text-slate-400" />
              <span className="mt-2 text-sm font-medium text-slate-600">Click to upload</span>
              <span className="mt-1 text-xs text-slate-400">JPG, JPEG, PNG, or WEBP · Max 5 MB</span>
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={handlePhotoChange}
              />
            </label>
          )}
        </div>

        <button className="btn w-full sm:w-auto" disabled={submitting}>
          {submitting ? (
            <span className="flex items-center gap-2">
              <LoadingSpinner size={16} /> Submitting...
            </span>
          ) : (
            "Submit Complaint"
          )}
        </button>
      </form>
    </AppLayout>
  );
}
