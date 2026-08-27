import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  Flame,
  Layers,
  Megaphone,
  TrendingUp
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import AppLayout from "../layouts/AppLayout.jsx";
import { api, getErrorMessage } from "../services/api.js";
import StatCard from "../components/StatCard.jsx";
import { PriorityBadge, StatusBadge, OverdueBadge, ApproachingSlaBadge } from "../components/Badge.jsx";
import { GreetingHeader, QuickAction } from "../components/ui/PageHeader.jsx";
import { PageLoader } from "../components/ui/LoadingState.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import { getFirstName, getGreeting, formatRelativeTime } from "../utils/format.js";
import { useAuth } from "../context/AuthContext.jsx";

// Nivara restrained palette — indigo primary, slate neutrals, muted semantic accents
const CHART_COLORS = ["#4f46e5", "#6366f1", "#818cf8", "#94a3b8", "#64748b", "#475569", "#334155"];


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
        <PageLoader message="Loading maintenance command center..." />
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

  const needsAttention = data.needsAttention || { overdueCount: 0, highPriorityCount: 0, approachingSlaCount: 0, items: [] };
  const health = data.health || {};
  const activeCount = (data.open || 0) + (data.inProgress || 0);
  const sla = data.slaPerformance || { withinSla: data.total - data.overdue, approachingSla: 0, overdue: data.overdue };

  return (
    <AppLayout role="admin">
      <GreetingHeader
        name={`${getGreeting()}, ${getFirstName(user?.name) || "Admin"}`}
        subtitle="Here's what's happening across your society today."
        action={
          <div className="flex gap-2">
            <QuickAction to="/admin/complaints" icon={ClipboardList} label="All Complaints" />
            <QuickAction to="/admin/notices" icon={Megaphone} label="New Notice" variant="primary" />
          </div>
        }
      />

      {/* Primary KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Complaints"
          value={data.total}
          icon={ClipboardList}
          accent="brand"
          subtitle="All recorded requests"
        />
        <StatCard
          label="Active Issues"
          value={activeCount}
          icon={Layers}
          accent={activeCount > 0 ? "warning" : "neutral"}
          subtitle={`${data.open || 0} Open · ${data.inProgress || 0} In Progress`}
        />
        <StatCard
          label="Resolved"
          value={data.resolved}
          icon={CheckCircle2}
          accent="success"
          subtitle={`${data.resolutionRate ?? 0}% resolution rate`}
        />
        <StatCard
          label="Overdue"
          value={data.overdue}
          icon={Clock}
          accent={data.overdue > 0 ? "danger" : "neutral"}
          subtitle={data.overdue > 0 ? "Requires urgent attention" : "All within SLA threshold"}
        />
      </div>

      {/* Needs Attention Section */}
      <section className="panel mt-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <AlertTriangle size={16} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Needs Attention</h2>
              <p className="text-xs text-slate-400">Overdue, high priority, and approaching SLA items</p>
            </div>
          </div>
          {needsAttention.items?.length > 0 && (
            <Link
              to="/admin/complaints?overdue=true"
              className="text-xs font-semibold text-brand hover:underline flex items-center gap-1"
            >
              View Overdue <ChevronRight size={14} />
            </Link>
          )}
        </div>

        {needsAttention.overdueCount === 0 &&
        needsAttention.highPriorityCount === 0 &&
        needsAttention.approachingSlaCount === 0 ? (
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-800">
            <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
            <span>No critical issues. All active complaints are currently on track and within SLA limits.</span>
          </div>
        ) : (
          <div className="mt-4 space-y-2.5">
            {needsAttention.items.map((item) => (
              <Link
                key={item.complaintId}
                to={`/admin/complaints/${item.complaintId}`}
                className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/70 p-3 transition-colors hover:border-brand/40 hover:bg-blue-50/40"
              >
                <div className="min-w-0 flex-1 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-500">
                      #{String(item.complaintId).slice(-6)}
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      {item.category}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-sm font-medium text-slate-800">
                    {item.description}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <PriorityBadge value={item.priority} />
                  <StatusBadge value={item.status} />
                  {item.type === "overdue" && <OverdueBadge />}
                  {item.type === "high_priority" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700">
                      <Flame size={11} /> High Priority
                    </span>
                  )}
                  {item.type === "approaching_sla" && <ApproachingSlaBadge />}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Grid: Trends + Categories */}
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        {/* Trend Area Chart */}
        <section className="panel">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-800">Complaint Trends</h2>
              <p className="text-xs text-slate-400">Incoming request volume over time</p>
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
              {[7, 30, 90].map((days) => (
                <button
                  key={days}
                  onClick={() => setTrendDays(days)}
                  className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
                    trendDays === days
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {days}d
                </button>
              ))}
            </div>
          </div>
          {data.trends?.some((d) => d.count > 0) ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={data.trends}>
                <defs>
                  <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0", borderRadius: 8, fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }}
                  cursor={{ stroke: "#e2e8f0", strokeWidth: 1 }}
                />
                <Area type="monotone" dataKey="count" name="Complaints" stroke="#4f46e5" fill="url(#trendFill)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-56 items-center justify-center text-sm text-slate-400">
              No complaint data in the selected {trendDays}-day window.
            </div>
          )}
        </section>

        {/* Category Distribution — Horizontal Bar */}
        <section className="panel">
          <div className="mb-4 border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-800">Category Distribution</h2>
            <p className="text-xs text-slate-400">Complaint volume by maintenance department</p>
          </div>
          {data.byCategory?.length > 0 ? (
            <div className="space-y-3 pt-1">
              {(() => {
                const total = data.byCategory.reduce((s, c) => s + c.count, 0);
                return data.byCategory
                  .slice()
                  .sort((a, b) => b.count - a.count)
                  .map((cat, i) => {
                    const pct = total > 0 ? Math.round((cat.count / total) * 100) : 0;
                    return (
                      <div key={cat.name} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2 w-2 rounded-full shrink-0"
                              style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                            />
                            <span className="font-medium text-slate-700">{cat.name}</span>
                          </div>
                          <div className="flex items-center gap-2 tabular-nums">
                            <span className="text-slate-400">{cat.count}</span>
                            <span className="font-bold text-slate-600 w-8 text-right">{pct}%</span>
                          </div>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: CHART_COLORS[i % CHART_COLORS.length]
                            }}
                          />
                        </div>
                      </div>
                    );
                  });
              })()}
            </div>
          ) : (
            <div className="flex h-56 items-center justify-center text-sm text-slate-400">
              No category data recorded yet.
            </div>
          )}
        </section>
      </div>

      {/* Grid: SLA Resolution Performance + Maintenance Intelligence */}
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        {/* SLA Resolution Performance */}
        <section className="panel xl:col-span-1">
          <div className="mb-4 border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-800">Resolution Performance</h2>
            <p className="text-xs text-slate-400">SLA adherence and resolution timelines</p>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-emerald-50 p-2.5 border border-emerald-200/60">
                <p className="text-lg font-bold text-emerald-700">{sla.withinSla ?? 0}</p>
                <p className="text-[10px] font-semibold uppercase text-emerald-600">Within SLA</p>
              </div>
              <div className="rounded-lg bg-amber-50 p-2.5 border border-amber-200/60">
                <p className="text-lg font-bold text-amber-700">{sla.approachingSla ?? 0}</p>
                <p className="text-[10px] font-semibold uppercase text-amber-600">Near SLA</p>
              </div>
              <div className="rounded-lg bg-rose-50 p-2.5 border border-rose-200/60">
                <p className="text-lg font-bold text-rose-700">{sla.overdue ?? 0}</p>
                <p className="text-[10px] font-semibold uppercase text-rose-600">Overdue</p>
              </div>
            </div>

            <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3.5 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Average Resolution Time</span>
                <span className="font-bold text-slate-800">
                  {data.avgResolutionDays != null ? `${data.avgResolutionDays} days` : "N/A (no resolved items)"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Resolution Rate</span>
                <span className="font-bold text-slate-800">{data.resolutionRate ?? 0}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Society Health Score</span>
                <span className="font-bold text-brand">{health.score ?? 100}/100</span>
              </div>
            </div>

            {data.categoryResolution?.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Avg Time by Category</p>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {data.categoryResolution.map((cat) => (
                    <div key={cat.category} className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">{cat.category}</span>
                      <span className="font-medium text-slate-800">{cat.avgDays} days</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Maintenance Intelligence (Recurring Issues) */}
        <section className="panel xl:col-span-1">
          <div className="mb-4 border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-800">Maintenance Intelligence</h2>
            <p className="text-xs text-slate-400">Recurring issues (30-day comparative analysis)</p>
          </div>
          {data.recurringIssues?.length > 0 ? (
            <div className="space-y-3">
              {data.recurringIssues.map((issue) => (
                <div
                  key={issue.name}
                  className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/70 p-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{issue.name}</p>
                    <p className="text-xs text-slate-500">
                      {issue.count} complaint{issue.count > 1 ? "s" : ""}
                    </p>
                  </div>
                  {issue.changePercent != null && (
                    <div
                      className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${
                        issue.changePercent > 0
                          ? "bg-rose-100 text-rose-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      <TrendingUp size={12} />
                      {issue.changePercent > 0 ? `+${issue.changePercent}%` : `${issue.changePercent}%`}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-56 items-center justify-center text-center text-sm text-slate-400">
              Insufficient historical data to calculate recurring trends.
            </div>
          )}
        </section>

        {/* Recent Activity */}
        <section className="panel xl:col-span-1">
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-800">Recent Activity</h2>
              <p className="text-xs text-slate-400">Latest complaints submitted</p>
            </div>
            <Link to="/admin/complaints" className="text-xs font-semibold text-brand hover:underline">
              View all
            </Link>
          </div>
          {data.recentComplaints?.length > 0 ? (
            <div className="space-y-2.5">
              {data.recentComplaints.map((c) => (
                <Link
                  key={c._id}
                  to={`/admin/complaints/${c._id}`}
                  className="block rounded-lg border border-slate-100 p-2.5 transition-colors hover:bg-slate-50"
                >
                  <div className="flex items-center justify-between gap-1">
                    <p className="truncate text-xs font-semibold text-slate-800">
                      {c.description}
                    </p>
                    <StatusBadge value={c.status} />
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                    <span>{c.residentName || "Resident"} · {c.category}</span>
                    <span>{formatRelativeTime(c.createdAt)}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex h-56 items-center justify-center text-sm text-slate-400">
              No recent activity recorded.
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  );
}

