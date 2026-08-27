import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { LayoutGrid, RotateCcw, Search, Table as TableIcon } from "lucide-react";
import AppLayout from "../layouts/AppLayout.jsx";
import ComplaintTable from "../components/ComplaintTable.jsx";
import OperationsBoard from "../components/OperationsBoard.jsx";
import { PageHeader } from "../components/ui/PageHeader.jsx";
import { PageLoader } from "../components/ui/LoadingState.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import { api, getErrorMessage } from "../services/api.js";
import { useToast } from "../context/ToastContext.jsx";

const categories = ["", "Plumbing", "Electrical", "Cleaning", "Security", "Lift", "Parking", "Other"];
const statuses = ["", "Open", "In Progress", "Resolved"];
const priorities = ["", "Low", "Medium", "High"];

export default function AdminComplaints() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { addToast } = useToast();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState("table"); // "table" | "board"
  const [filters, setFilters] = useState({
    category: searchParams.get("category") || "",
    status: searchParams.get("status") || "",
    priority: searchParams.get("priority") || "",
    from: searchParams.get("from") || "",
    to: searchParams.get("to") || "",
    search: searchParams.get("search") || "",
    overdueOnly: searchParams.get("overdue") === "true"
  });
  const [updatingId, setUpdatingId] = useState("");
  const [rowErrors, setRowErrors] = useState({});

  async function load(currentFilters = filters) {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (currentFilters.category) params.category = currentFilters.category;
      if (currentFilters.status) params.status = currentFilters.status;
      if (currentFilters.priority) params.priority = currentFilters.priority;
      if (currentFilters.from) params.from = currentFilters.from;
      if (currentFilters.to) params.to = currentFilters.to;
      if (currentFilters.search) params.search = currentFilters.search;
      if (currentFilters.overdueOnly) params.overdue = "true";

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

  function handleResetFilters() {
    const reset = {
      category: "",
      status: "",
      priority: "",
      from: "",
      to: "",
      search: "",
      overdueOnly: false
    };
    setFilters(reset);
    setSearchParams({});
    load(reset);
  }

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
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2">
        <PageHeader
          title="Complaints Workspace"
          subtitle="Manage, triage, and resolve maintenance requests across the society."
        />
        {/* View Switcher Toggle */}
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-xs">
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-semibold transition-all ${
              viewMode === "table"
                ? "bg-brand text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <TableIcon size={14} />
            Table View
          </button>
          <button
            type="button"
            onClick={() => setViewMode("board")}
            className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-semibold transition-all ${
              viewMode === "board"
                ? "bg-brand text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <LayoutGrid size={14} />
            Operations Board
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      <form
        className="panel mb-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
      >
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="pl-10"
            placeholder="Search complaints by ID, resident name, description, or category..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            aria-label="Search complaints"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <select
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            aria-label="Filter by category"
          >
            {categories.map((item) => (
              <option key={item} value={item}>
                {item || "All Categories"}
              </option>
            ))}
          </select>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            aria-label="Filter by status"
          >
            {statuses.map((item) => (
              <option key={item} value={item}>
                {item || "All Statuses"}
              </option>
            ))}
          </select>
          <select
            value={filters.priority}
            onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
            aria-label="Filter by priority"
          >
            {priorities.map((item) => (
              <option key={item} value={item}>
                {item || "All Priorities"}
              </option>
            ))}
          </select>
          <div>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => setFilters({ ...filters, from: e.target.value })}
              aria-label="From date"
              placeholder="From date"
            />
          </div>
          <div>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => setFilters({ ...filters, to: e.target.value })}
              aria-label="To date"
              placeholder="To date"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <div className="flex items-center gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
                checked={filters.overdueOnly}
                onChange={(e) => setFilters({ ...filters, overdueOnly: e.target.checked })}
              />
              Overdue complaints only
            </label>
            <span className="text-xs text-slate-400">
              Showing {complaints.length} complaint{complaints.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-ghost text-xs"
              onClick={handleResetFilters}
            >
              <RotateCcw size={13} /> Reset
            </button>
            <button className="btn text-xs py-2 px-4" type="submit">
              Apply Filters
            </button>
          </div>
        </div>
      </form>

      {/* Content Rendering */}
      {loading ? (
        <PageLoader message="Loading complaints workspace..." />
      ) : error ? (
        <EmptyState title="Unable to load complaints" description={error} />
      ) : viewMode === "board" ? (
        <OperationsBoard
          complaints={complaints}
          basePath="/admin/complaints"
          adminActions={{
            updatingId,
            onPriorityChange: updatePriority,
            onStatusUpdate: updateStatus,
            errorFor: rowErrors
          }}
        />
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

