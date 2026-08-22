import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Megaphone, PlusCircle } from "lucide-react";
import AppLayout from "../layouts/AppLayout.jsx";
import ComplaintCard from "../components/ComplaintCard.jsx";
import { ImportantBadge } from "../components/Badge.jsx";
import { GreetingHeader, QuickAction } from "../components/ui/PageHeader.jsx";
import { PageLoader } from "../components/ui/LoadingState.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import StatCard from "../components/StatCard.jsx";
import { api, getErrorMessage } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { formatDate, getFirstName, getGreeting } from "../utils/format.js";

export default function ResidentDashboard() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.get("/complaints/my"), api.get("/notices")])
      .then(([complaintsRes, noticesRes]) => {
        setComplaints(complaintsRes.data.data.complaints);
        setNotices(noticesRes.data.data.notices.slice(0, 3));
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const active = complaints.filter((c) => c.status !== "Resolved");
  const resolved = complaints.filter((c) => c.status === "Resolved");
  const recent = [...complaints].slice(0, 4);

  if (loading) {
    return (
      <AppLayout role="resident">
        <PageLoader message="Loading your dashboard..." />
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout role="resident">
        <EmptyState title="Unable to load dashboard" description={error} />
      </AppLayout>
    );
  }

  return (
    <AppLayout role="resident">
      <GreetingHeader
        name={`${getGreeting()}, ${getFirstName(user?.name)}`}
        subtitle="How can we help today?"
        action={<QuickAction to="/resident/complaints/new" icon={PlusCircle} label="Report an Issue" variant="primary" />}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Active Complaints" value={active.length} accent="warning" />
        <StatCard label="Resolved" value={resolved.length} accent="success" />
      </div>

      <section className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">Your Complaints</h2>
          {complaints.length > 0 && (
            <Link to="/resident/complaints" className="text-sm font-medium text-brand hover:underline">
              View all
            </Link>
          )}
        </div>

        {recent.length === 0 ? (
          <EmptyState
            title="No complaints yet"
            description="You haven't reported any maintenance issues."
            actionLabel="Report an Issue"
            actionTo="/resident/complaints/new"
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {recent.map((c) => (
              <ComplaintCard key={c._id} complaint={c} basePath="/resident/complaints" />
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-center gap-2">
          <Megaphone size={18} className="text-slate-500" />
          <h2 className="text-lg font-semibold text-ink">Latest Society Notices</h2>
        </div>

        {notices.length === 0 ? (
          <div className="panel text-center text-sm text-slate-500">
            There are no society announcements yet.
          </div>
        ) : (
          <div className="space-y-3">
            {notices.map((notice) => (
              <article
                key={notice._id}
                className={`panel ${notice.isImportant ? "border-amber-300 bg-amber-50/50" : ""}`}
              >
                <div className="flex items-start gap-2">
                  {notice.isImportant && <ImportantBadge />}
                  <div>
                    <h3 className="font-semibold text-ink">{notice.title}</h3>
                    <p className="mt-1 text-sm text-slate-600 line-clamp-2">{notice.content}</p>
                    <p className="mt-2 text-xs text-slate-400">{formatDate(notice.createdAt)}</p>
                  </div>
                </div>
              </article>
            ))}
            <Link to="/resident/notices" className="inline-block text-sm font-medium text-brand hover:underline">
              View all notices →
            </Link>
          </div>
        )}
      </section>
    </AppLayout>
  );
}

// Backward-compatible export for pages not yet migrated
export { PageHeader as PageTitle } from "../components/ui/PageHeader.jsx";
