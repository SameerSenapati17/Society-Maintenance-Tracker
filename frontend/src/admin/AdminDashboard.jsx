import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Clock,
  Megaphone,
  TrendingUp
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import AppLayout from "../layouts/AppLayout.jsx";
import { api, getErrorMessage } from "../services/api.js";
import StatCard from "../components/StatCard.jsx";
import { PriorityBadge, StatusBadge, OverdueBadge } from "../components/Badge.jsx";
import { GreetingHeader, QuickAction } from "../components/ui/PageHeader.jsx";
import { PageLoader } from "../components/ui/LoadingState.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import { getFirstName, getGreeting } from "../utils/format.js";
import { useAuth } from "../context/AuthContext.jsx";

const CHART_COLORS = ["#2563eb", "#f59e0b", "#10b981", "#e11d48", "#64748b", "#7c3aed", "#0f766e"];

export default function AdminDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [trendDays, setTrendDays] = useState(7);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get("/admin/dashboard", { params: { trendDays } })
      .then((res) => setData(res.data.data))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [trendDays]);

  if (loading) {
    return (
      <AppLayout role="admin">
        <PageLoader message="Loading dashboard..." />
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout role="admin">
        <EmptyState title="Unable to load dashboard" description={error} />
      </AppLayout>
    );
  }

  const needsAttention = data.needsAttention || { overdueCount: 0, highPriorityCount: 0, items: [] };
  const health = data.health || {};
  const unresolved = (data.open || 0) + (data.inProgress || 0);

  return (
    <AppLayout role="admin">
      <GreetingHeader
        name={`${getGreeting()}, ${getFirstName(user?.name)}`}
        subtitle="Here's what's happening across your society today."
      />

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total Complaints" value={data.total} icon={ClipboardList} accent="brand" />
        <StatCard label="Needs Attention" value={unresolved} icon={AlertTriangle} accent="warning" subtitle={`${data.overdue} overdue`} />
        <StatCard label="Resolved" value={data.resolved} icon={CheckCircle2} accent="success" />
        <StatCard label="Overdue" value={data.overdue} icon={Clock} accent="danger" />
        <StatCard
          label="Resolution Rate"
          value={`${data.resolutionRate ?? 0}%`}
          icon={TrendingUp}
          accent="success"
          subtitle={data.avgResolutionDays != null ? `Avg ${data.avgResolutionDays}d` : undefined}
        />
      </div>

      {/* Needs Attention */}
      <section className="panel mt-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-ink">
          <AlertTriangle size={20} className="text-amber-500" />
          Needs Attention
        </h2>
        {needsAttention.overdueCount === 0 && needsAttention.highPriorityCount === 0 ? (
          <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            No overdue complaints. Everything is currently within the configured threshold. ✓
          </div>
        ) : (
          <div className="space-y-3">
            {needsAttention.overdueCount > 0 && (
              <p className="text-sm font-medium text-rose-700">
                ⚠ {needsAttention.overdueCount} overdue complaint{needsAttention.overdueCount > 1 ? "s" : ""}
              </p>
            )}
            {needsAttention.highPriorityCount > 0 && (
              <p className="text-sm font-medium text-amber-700">
                🔴 {needsAttention.highPriorityCount} high-priority complaint{needsAttention.highPriorityCount > 1 ? "s" : ""}
              </p>
            )}
            {needsAttention.items?.length > 0 && (
              <div className="mt-3 space-y-2">
                {needsAttention.items.map((item) => (
                  <Link
                    key={item.complaintId}
                    to={`/admin/complaints/${item.complaintId}`}
                    className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 transition-colors hover:border-brand/30 hover:bg-blue-50/50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{item.description}</p>
                      <p className="text-xs text-slate-500">{item.category}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <PriorityBadge value={item.priority} />
                      <StatusBadge value={item.status} />
                      {item.type === "overdue" && <OverdueBadge />}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Trends + Status */}
      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        <section className="panel">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold text-ink">Complaint Trends</h2>
            <select
              className="w-auto py-1.5 text-sm"
              value={trendDays}
              onChange={(e) => setTrendDays(Number(e.target.value))}
              aria-label="Trend period"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </div>
          {data.trends?.some((d) => d.count > 0) ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={data.trends}>
                <defs>
                  <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#2563eb" fill="url(#trendFill)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-8 text-center text-sm text-slate-500">Not enough data for trends yet.</p>
          )}
        </section>

        <section className="panel">
          <h2 className="mb-4 font-semibold text-ink">Complaints by Status</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.byStatus}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>
      </div>

      {/* Category + Health + Recurring */}
      <div className="mt-6 grid gap-5 xl:grid-cols-3">
        <section className="panel xl:col-span-1">
          <h2 className="mb-4 font-semibold text-ink">By Category</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={data.byCategory} dataKey="count" nameKey="name" outerRadius={80} label={({ name, count }) => `${name} (${count})`}>
                {data.byCategory?.map((entry, i) => (
                  <Cell key={entry.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </section>

        <section className="panel xl:col-span-1">
          <h2 className="mb-4 font-semibold text-ink">Society Maintenance Health</h2>
          {data.total > 0 ? (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-4xl font-bold text-brand">{health.score ?? 0}</p>
                <p className="text-xs text-slate-500">out of 100</p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Resolution Rate</span>
                  <span className="font-medium">{health.resolutionRate ?? 0}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Overdue Rate</span>
                  <span className="font-medium">{health.overdueRate ?? 0}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">High Priority</span>
                  <span className="font-medium">{health.highPriorityCount ?? 0}</span>
                </div>
                {data.avgResolutionDays != null && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Avg Resolution</span>
                    <span className="font-medium">{data.avgResolutionDays}d</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-slate-500">No complaints to analyze yet.</p>
          )}
        </section>

        <section className="panel xl:col-span-1">
          <h2 className="mb-4 font-semibold text-ink">Recurring Issues</h2>
          {data.recurringIssues?.length > 0 ? (
            <ul className="space-y-3">
              {data.recurringIssues.map((issue) => (
                <li key={issue.name} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-ink">{issue.name}</p>
                    <p className="text-xs text-slate-500">{issue.count} complaint{issue.count > 1 ? "s" : ""}</p>
                  </div>
                  {issue.changePercent != null && (
                    <span className={`text-xs font-semibold ${issue.changePercent > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                      {issue.changePercent > 0 ? "+" : ""}{issue.changePercent}%
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-8 text-center text-sm text-slate-500">Insufficient historical data.</p>
          )}
        </section>
      </div>

      {/* Recent Complaints */}
      {data.recentComplaints?.length > 0 && (
        <section className="panel mt-6">
          <h2 className="mb-4 font-semibold text-ink">Recent Complaints</h2>
          <div className="space-y-2">
            {data.recentComplaints.map((c) => (
              <Link
                key={c._id}
                to={`/admin/complaints/${c._id}`}
                className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-3 transition-colors hover:bg-slate-50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{c.description}</p>
                  <p className="text-xs text-slate-500">{c.residentName} · {c.category}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusBadge value={c.status} />
                  {c.isOverdue && <OverdueBadge />}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Quick Actions */}
      <section className="panel mt-6">
        <h2 className="mb-4 font-semibold text-ink">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <QuickAction to="/admin/complaints" icon={ClipboardList} label="View Complaints" />
          <QuickAction to="/admin/complaints?overdue=true" icon={AlertTriangle} label="View Overdue" />
          <QuickAction to="/admin/complaints?priority=High" icon={BarChart3} label="High Priority" />
          <QuickAction to="/admin/notices" icon={Megaphone} label="Create Notice" variant="primary" />
        </div>
      </section>
    </AppLayout>
  );
}
