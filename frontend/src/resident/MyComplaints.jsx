import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardList, Filter, PlusCircle } from "lucide-react";
import AppLayout from "../layouts/AppLayout.jsx";
import ComplaintCard from "../components/ComplaintCard.jsx";
import { PageHeader, QuickAction } from "../components/ui/PageHeader.jsx";
import { PageLoader } from "../components/ui/LoadingState.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import { api, getErrorMessage } from "../services/api.js";

export default function MyComplaints() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "active" | "resolved"

  useEffect(() => {
    api
      .get("/complaints/my")
      .then((res) => setComplaints(res.data.data.complaints))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const activeCount = complaints.filter((c) => c.status !== "Resolved").length;
  const resolvedCount = complaints.filter((c) => c.status === "Resolved").length;

  const filteredComplaints = complaints.filter((c) => {
    if (statusFilter === "active") return c.status !== "Resolved";
    if (statusFilter === "resolved") return c.status === "Resolved";
    return true;
  });

  return (
    <AppLayout role="resident">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2">
        <PageHeader
          title="My Complaints"
          subtitle="Track the real-time progress and history of your maintenance requests."
        />
        <QuickAction
          to="/resident/complaints/new"
          icon={PlusCircle}
          label="Report New Issue"
          variant="primary"
        />
      </div>

      {/* Filter Tabs */}
      {complaints.length > 0 && (
        <div className="mb-6 flex items-center gap-2 border-b border-slate-200/80 pb-3">
          <button
            onClick={() => setStatusFilter("all")}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              statusFilter === "all"
                ? "bg-brand text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            All ({complaints.length})
          </button>
          <button
            onClick={() => setStatusFilter("active")}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              statusFilter === "active"
                ? "bg-amber-500 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Active ({activeCount})
          </button>
          <button
            onClick={() => setStatusFilter("resolved")}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              statusFilter === "resolved"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Resolved ({resolvedCount})
          </button>
        </div>
      )}

      {loading ? (
        <PageLoader message="Loading your maintenance requests..." />
      ) : error ? (
        <EmptyState title="Unable to load complaints" description={error} />
      ) : complaints.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No complaints submitted yet"
          description="You haven't reported any maintenance issues. Click below to submit a new issue."
          actionLabel="Report an Issue"
          actionTo="/resident/complaints/new"
        />
      ) : filteredComplaints.length === 0 ? (
        <div className="panel py-12 text-center text-sm text-slate-400">
          No {statusFilter} complaints found.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredComplaints.map((c) => (
            <ComplaintCard key={c._id} complaint={c} basePath="/resident/complaints" />
          ))}
        </div>
      )}
    </AppLayout>
  );
}

