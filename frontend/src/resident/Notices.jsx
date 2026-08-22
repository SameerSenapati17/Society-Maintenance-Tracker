import { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";
import AppLayout from "../layouts/AppLayout.jsx";
import { ImportantBadge } from "../components/Badge.jsx";
import { PageHeader } from "../components/ui/PageHeader.jsx";
import { PageLoader } from "../components/ui/LoadingState.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import { api, getErrorMessage } from "../services/api.js";
import { formatDate } from "../utils/format.js";
import { useToast } from "../context/ToastContext.jsx";

export default function Notices({ role = "resident" }) {
  const { addToast } = useToast();
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ title: "", content: "", isImportant: false });
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

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
        addToast("Notice published successfully.");
      }
      setForm({ title: "", content: "", isImportant: false });
      setEditing(null);
      await load();
    } catch (err) {
      addToast(getErrorMessage(err), "error");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    if (!window.confirm("Delete this notice?")) return;
    try {
      await api.delete(`/admin/notices/${id}`);
      addToast("Notice deleted.");
      await load();
    } catch (err) {
      addToast(getErrorMessage(err), "error");
    }
  }

  function startEdit(notice) {
    setEditing(notice._id);
    setForm({ title: notice.title, content: notice.content, isImportant: notice.isImportant });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditing(null);
    setForm({ title: "", content: "", isImportant: false });
  }

  const important = notices.filter((n) => n.isImportant);
  const regular = notices.filter((n) => !n.isImportant);

  return (
    <AppLayout role={role}>
      <PageHeader
        title="Society Notices"
        subtitle={role === "admin" ? "Publish announcements and important alerts to residents." : "Stay updated with society announcements."}
      />

      {role === "admin" && (
        <form className="panel mb-6 space-y-4" onSubmit={save}>
          <h2 className="font-semibold text-ink">{editing ? "Edit Notice" : "Create Notice"}</h2>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Title</span>
            <input
              className="mt-1"
              placeholder="Notice title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Content</span>
            <textarea
              className="mt-1 min-h-28"
              placeholder="Write the notice content..."
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              required
            />
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300"
              checked={form.isImportant}
              onChange={(e) => setForm({ ...form, isImportant: e.target.checked })}
            />
            Mark as important (pinned & emailed to residents)
          </label>
          <div className="flex gap-3">
            <button className="btn" disabled={saving}>
              {saving ? "Saving..." : editing ? "Save Changes" : "Publish Notice"}
            </button>
            {editing && (
              <button type="button" className="btn-secondary" onClick={cancelEdit}>
                Cancel
              </button>
            )}
          </div>
        </form>
      )}

      {loading ? (
        <PageLoader message="Loading notices..." />
      ) : error ? (
        <EmptyState title="Unable to load notices" description={error} />
      ) : notices.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No notices"
          description="There are no society announcements yet."
        />
      ) : (
        <div className="space-y-6">
          {important.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-amber-600">Important</h2>
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

          {regular.length > 0 && (
            <section>
              {important.length > 0 && (
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">All Notices</h2>
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
    <article className={`panel ${important ? "border-amber-300 bg-amber-50/40" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-ink">{notice.title}</h3>
            {notice.isImportant && <ImportantBadge />}
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{notice.content}</p>
          <p className="mt-3 text-xs text-slate-400">{formatDate(notice.createdAt)}</p>
        </div>
        {role === "admin" && (
          <div className="flex shrink-0 gap-2">
            <button className="btn-secondary py-1.5 text-xs" onClick={() => onEdit(notice)}>Edit</button>
            <button className="btn-danger py-1.5 text-xs" onClick={() => onDelete(notice._id)}>Delete</button>
          </div>
        )}
      </div>
    </article>
  );
}
