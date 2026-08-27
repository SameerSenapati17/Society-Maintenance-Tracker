import { useEffect, useState } from "react";
import {
  Bell,
  CheckCircle2,
  Clock,
  Edit2,
  Megaphone,
  PlusCircle,
  Sparkles,
  Trash2,
  User,
  X
} from "lucide-react";
import AppLayout from "../layouts/AppLayout.jsx";
import { ImportantBadge } from "../components/Badge.jsx";
import { PageHeader } from "../components/ui/PageHeader.jsx";
import { PageLoader } from "../components/ui/LoadingState.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import { api, getErrorMessage } from "../services/api.js";
import { formatDate, formatRelativeTime } from "../utils/format.js";
import { useToast } from "../context/ToastContext.jsx";

export default function Notices({ role = "resident" }) {
  const { addToast } = useToast();
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ title: "", content: "", isImportant: false });
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get("/notices");
      setNotices(res.data.data.notices);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api.patch(`/admin/notices/${editing}`, form);
        addToast("Notice updated successfully.");
      } else {
        await api.post("/admin/notices", form);
        addToast("Notice broadcasted successfully.");
      }
      setForm({ title: "", content: "", isImportant: false });
      setEditing(null);
      setShowForm(false);
      await load();
    } catch (err) {
      addToast(getErrorMessage(err), "error");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    if (!window.confirm("Are you sure you want to delete this notice? This action cannot be undone.")) return;
    try {
      await api.delete(`/admin/notices/${id}`);
      addToast("Notice deleted successfully.");
      await load();
    } catch (err) {
      addToast(getErrorMessage(err), "error");
    }
  }

  function startEdit(notice) {
    setEditing(notice._id);
    setForm({ title: notice.title, content: notice.content, isImportant: notice.isImportant });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditing(null);
    setForm({ title: "", content: "", isImportant: false });
    setShowForm(false);
  }

  const important = notices.filter((n) => n.isImportant);
  const regular = notices.filter((n) => !n.isImportant);

  return (
    <AppLayout role={role}>
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2">
        <PageHeader
          title="Society Notice Board"
          subtitle={
            role === "admin"
              ? "Publish official announcements and emergency alerts to all residents."
              : "Official announcements, scheduled maintenance notices, and alerts."
          }
        />
        {role === "admin" && !showForm && (
          <button
            onClick={() => {
              setEditing(null);
              setForm({ title: "", content: "", isImportant: false });
              setShowForm(true);
            }}
            className="btn"
          >
            <PlusCircle size={16} /> Create Notice
          </button>
        )}
      </div>

      {/* Admin Create / Edit Form Panel */}
      {role === "admin" && showForm && (
        <form className="panel mb-8 space-y-5 border-brand/30 animate-fade-in" onSubmit={save}>
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-800">
              {editing ? "Edit Society Announcement" : "Create New Society Announcement"}
            </h2>
            <button
              type="button"
              onClick={cancelEdit}
              className="rounded p-1 text-slate-400 hover:text-slate-600"
              aria-label="Close form"
            >
              <X size={18} />
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Notice Title <span className="text-rose-500">*</span>
            </label>
            <input
              className="text-sm py-2.5"
              placeholder="e.g. Annual Water Tank Cleaning Schedule"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Announcement Content <span className="text-rose-500">*</span>
            </label>
            <textarea
              className="min-h-32 text-sm leading-relaxed"
              placeholder="Write the full announcement details, timings, and instructions for residents..."
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              required
            />
          </div>

          <label className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-xs font-semibold text-amber-900 cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
              checked={form.isImportant}
              onChange={(e) => setForm({ ...form, isImportant: e.target.checked })}
            />
            <span>
              Mark as Important Notice (Pins to the top of all dashboards & sends email alert to residents)
            </span>
          </label>

          <div className="flex gap-2 border-t border-slate-100 pt-4">
            <button className="btn" disabled={saving}>
              {saving ? "Publishing..." : editing ? "Save Changes" : "Broadcast Notice"}
            </button>
            <button type="button" className="btn-secondary" onClick={cancelEdit}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Notice Feed */}
      {loading ? (
        <PageLoader message="Loading society notice board..." />
      ) : error ? (
        <EmptyState title="Unable to load notices" description={error} />
      ) : notices.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No notices published yet"
          description={
            role === "admin"
              ? "There are no society announcements. Create one above to broadcast to residents."
              : "There are no announcements from the administration at this time."
          }
        />
      ) : (
        <div className="space-y-6">
          {/* Important Pinned Notices */}
          {important.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-700">
                <Sparkles size={14} className="text-amber-500" />
                <span>Pinned Important Notices ({important.length})</span>
              </div>
              <div className="space-y-3">
                {important.map((notice) => (
                  <NoticeCard
                    key={notice._id}
                    notice={notice}
                    role={role}
                    onEdit={startEdit}
                    onDelete={remove}
                    important
                  />
                ))}
              </div>
            </section>
          )}

          {/* Regular Announcements */}
          {regular.length > 0 && (
            <section className="space-y-3">
              {important.length > 0 && (
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 pt-3">
                  General Announcements ({regular.length})
                </h2>
              )}
              <div className="space-y-3">
                {regular.map((notice) => (
                  <NoticeCard
                    key={notice._id}
                    notice={notice}
                    role={role}
                    onEdit={startEdit}
                    onDelete={remove}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </AppLayout>
  );
}

function NoticeCard({ notice, role, onEdit, onDelete, important }) {
  return (
    <article
      className={`rounded-xl border p-5 shadow-card transition-all ${
        important
          ? "border-amber-300 bg-amber-50/50 border-l-4 border-l-amber-500"
          : "border-slate-200/80 bg-white hover:border-slate-300"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">{notice.title}</h3>
            {notice.isImportant && <ImportantBadge />}
          </div>
          <p className="mt-2.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
            {notice.content}
          </p>
          <div className="mt-3.5 flex flex-wrap items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1 font-medium text-slate-600">
              <User size={13} className="text-slate-400" />
              {notice.createdBy?.name || "Society Management"}
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Clock size={13} />
              {formatDate(notice.createdAt)} ({formatRelativeTime(notice.createdAt)})
            </span>
          </div>
        </div>

        {role === "admin" && (
          <div className="flex shrink-0 gap-1.5">
            <button
              className="btn-secondary py-1.5 px-2.5 text-xs flex items-center gap-1"
              onClick={() => onEdit(notice)}
              aria-label="Edit notice"
            >
              <Edit2 size={13} /> Edit
            </button>
            <button
              className="btn-danger py-1.5 px-2.5 text-xs flex items-center gap-1"
              onClick={() => onDelete(notice._id)}
              aria-label="Delete notice"
            >
              <Trash2 size={13} /> Delete
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

