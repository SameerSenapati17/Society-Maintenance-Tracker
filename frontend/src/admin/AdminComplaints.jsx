import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import AppLayout from "../layouts/AppLayout.jsx";
import ComplaintTable from "../components/ComplaintTable.jsx";
import { PageHeader } from "../components/ui/PageHeader.jsx";
import { PageLoader } from "../components/ui/LoadingState.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import { api, getErrorMessage } from "../services/api.js";
import { useToast } from "../context/ToastContext.jsx";

const categories = ["", "Plumbing", "Electrical", "Cleaning", "Security", "Lift", "Parking", "Other"];
const statuses = ["", "Open", "In Progress", "Resolved"];
const priorities = ["", "Low", "Medium", "High"];

export default function AdminComplaints() {
  const [searchParams] = useSearchParams();
  const { addToast } = useToast();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    category: "",
    status: "",
    priority: searchParams.get("priority") || "",
    from: "",
    to: "",
    search: "",
    overdueOnly: searchParams.get("overdue") === "true"
  });
  const [updatingId, setUpdatingId] = useState("");
  const [rowErrors, setRowErrors] = useState({});

  async function load() {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (filters.category) params.category = filters.category;
      if (filters.status) params.status = filters.status;
      if (filters.priority) params.priority = filters.priority;
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;
      if (filters.search) params.search = filters.search;
      if (filters.overdueOnly) params.overdue = "true";

      const res = await api.get("/admin/complaints", { params });
      setComplaints(res.data.data.complaints);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function replaceComplaint(updatedComplaint) {
    setComplaints((current) =>
      current.map((item) => (item._id === updatedComplaint._id ? { ...item, ...updatedComplaint } : item))
    );
  }

  async function updatePriority(complaint, priority) {
    setUpdatingId(complaint._id);
    setRowErrors((current) => ({ ...current, [complaint._id]: "" }));
    try {
      const res = await api.patch(`/admin/complaints/${complaint._id}/priority`, { priority });
      replaceComplaint(res.data.data.complaint);
      addToast("Priority updated successfully.");
      await load();
    } catch (err) {
      setRowErrors((current) => ({ ...current, [complaint._id]: getErrorMessage(err) }));
    } finally {
      setUpdatingId("");
    }
  }

  async function updateStatus(complaint, status, note) {
    setUpdatingId(complaint._id);
    setRowErrors((current) => ({ ...current, [complaint._id]: "" }));
    try {
      const res = await api.patch(`/admin/complaints/${complaint._id}/status`, { status, note });
      replaceComplaint(res.data.data.complaint);
      addToast("Status updated successfully.");
      await load();
    } catch (err) {
      setRowErrors((current) => ({ ...current, [complaint._id]: getErrorMessage(err) }));
    } finally {
      setUpdatingId("");
    }
  }

  return (
    <AppLayout role="admin">
      <PageHeader
        title="Complaints"
        subtitle="Manage and resolve maintenance issues across the society."
      />

      <form
        className="panel mb-5 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
      >
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="pl-10"
            placeholder="Search complaints by ID, resident, description, or category..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            aria-label="Search complaints"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })} aria-label="Filter by category">
            {categories.map((item) => (
              <option key={item} value={item}>{item || "All categories"}</option>
            ))}
          </select>
          <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} aria-label="Filter by status">
            {statuses.map((item) => (
              <option key={item} value={item}>{item || "All statuses"}</option>
            ))}
          </select>
          <select value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value })} aria-label="Filter by priority">
            {priorities.map((item) => (
              <option key={item} value={item}>{item || "All priorities"}</option>
            ))}
          </select>
          <input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} aria-label="From date" />
          <input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} aria-label="To date" />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300"
              checked={filters.overdueOnly}
              onChange={(e) => setFilters({ ...filters, overdueOnly: e.target.checked })}
            />
            Overdue only
          </label>
          <button className="btn" type="submit">Apply filters</button>
        </div>
      </form>

      {loading ? (
        <PageLoader message="Loading complaints..." />
      ) : error ? (
        <EmptyState title="Unable to load complaints" description={error} />
      ) : (
        <ComplaintTable
          complaints={complaints}
          basePath="/admin/complaints"
          showResident
          adminActions={{
            updatingId,
            onPriorityChange: updatePriority,
            onStatusUpdate: updateStatus,
            errorFor: rowErrors
          }}
        />
      )}
    </AppLayout>
  );
}
