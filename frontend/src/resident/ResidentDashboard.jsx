import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Layers,
  Megaphone,
  PlusCircle
} from "lucide-react";
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
        setNotices(noticesRes.data.data.notices);
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const active = complaints.filter((c) => c.status !== "Resolved");
  const resolved = complaints.filter((c) => c.status === "Resolved");
  const recent = [...complaints].slice(0, 4);
  const importantNotices = notices.filter((n) => n.isImportant).slice(0, 2);
  const otherNotices = notices.filter((n) => !n.isImportant).slice(0, 2);
  const displayNotices = [...importantNotices, ...otherNotices].slice(0, 3);

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
        name={`${getGreeting()}, ${getFirstName(user?.name) || "Resident"}`}
        subtitle="Track maintenance requests or report a new issue in your residence."
        action={
          <QuickAction
            to="/resident/complaints/new"
            icon={PlusCircle}
            label="Report an Issue"
            variant="primary"
          />
        }
      />

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Active Requests"
          value={active.length}
          icon={Layers}
          accent={active.length > 0 ? "warning" : "neutral"}
          subtitle={active.length > 0 ? "Under review / in progress" : "No open requests"}
        />
        <StatCard
          label="Resolved Requests"
          value={resolved.length}
          icon={CheckCircle2}
          accent="success"
          subtitle="Closed maintenance issues"
        />
        <StatCard
          label="Society Announcements"
          value={notices.length}
          icon={Megaphone}
          accent="brand"
          subtitle={`${importantNotices.length} important pinned`}
        />
      </div>

      {/* Important Notices Banner (if any) */}
      {importantNotices.length > 0 && (
        <section className="mt-6">
          <div className="space-y-3">
            {importantNotices.map((notice) => (
              <div
                key={notice._id}
                className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50/80 p-4 shadow-xs"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white font-bold">
                  !
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-slate-900">{notice.title}</h3>
                    <ImportantBadge />
                  </div>
                  <p className="mt-1 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {notice.content}
                  </p>
                  <p className="mt-2 text-[11px] text-slate-400 font-medium">
                    Published {formatDate(notice.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent Complaints Section */}
      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-800">Your Complaints</h2>
            <p className="text-xs text-slate-400">Track current status and updates</p>
          </div>
          {complaints.length > 0 && (
            <Link
              to="/resident/complaints"
              className="text-xs font-semibold text-brand hover:underline flex items-center gap-1"
            >
              View all ({complaints.length}) <ArrowRight size={13} />
            </Link>
          )}
        </div>

        {recent.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No complaints submitted yet"
            description="Have a plumbing, electrical, or general maintenance issue? Submit a request anytime."
            actionLabel="Report an Issue"
            actionTo="/resident/complaints/new"
          />
        ) : (
          <div className="grid gap-3.5 sm:grid-cols-2">
            {recent.map((c) => (
              <ComplaintCard key={c._id} complaint={c} basePath="/resident/complaints" />
            ))}
          </div>
        )}
      </section>

      {/* General Society Notices */}
      {otherNotices.length > 0 && (
        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Megaphone size={16} className="text-slate-500" />
              <h2 className="text-base font-bold text-slate-800">Recent Society Notices</h2>
            </div>
            <Link to="/resident/notices" className="text-xs font-semibold text-brand hover:underline">
              View all notices
            </Link>
          </div>

          <div className="space-y-3">
            {otherNotices.map((notice) => (
              <article key={notice._id} className="panel">
                <h3 className="font-bold text-slate-800">{notice.title}</h3>
                <p className="mt-1 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {notice.content}
                </p>
                <p className="mt-2 text-[11px] text-slate-400">{formatDate(notice.createdAt)}</p>
              </article>
            ))}
          </div>
        </section>
      )}
    </AppLayout>
  );
}

