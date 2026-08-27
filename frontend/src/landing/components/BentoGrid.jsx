import React from "react";
import {
  LayoutDashboard,
  ClipboardCheck,
  Clock,
  Megaphone,
  BarChart3,
  Layers,
  CheckCircle2
} from "lucide-react";

export default function BentoGrid() {
  function handleMouseMove(e) {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty("--mouse-x", `${x}px`);
    card.style.setProperty("--mouse-y", `${y}px`);
  }

  return (
    <section id="capabilities" className="relative bg-[#090d16]/80 py-24 sm:py-32 text-white border-t border-slate-800/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="reveal-on-scroll max-w-2xl">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/20 bg-indigo-950/40 px-3 py-1 text-xs font-semibold text-indigo-400 mb-4">
            <Layers size={12} />
            <span>Integrated Platform</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-4xl uppercase">
            Everything your property team <br />
            needs to stay ahead.
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-400 leading-relaxed">
            Eliminate scattered spreadsheets, delayed tenant updates, and missed SLA deadlines with purpose-built property operations tools.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Card 1: Command Center (Col Span 2 on lg) */}
          <div
            onMouseMove={handleMouseMove}
            className="reveal-on-scroll delay-100 spotlight-card group relative flex flex-col justify-between rounded-2xl border border-slate-800 bg-[#0b0f19] p-6 sm:p-8 lg:col-span-2"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/10 text-indigo-400 border border-indigo-500/20">
                  <LayoutDashboard size={20} />
                </div>
                <span className="font-mono text-[11px] text-slate-400">01 / LIVE OPS</span>
              </div>
              <h3 className="mt-6 text-lg font-bold text-white group-hover:text-indigo-300 transition-colors">
                Command Center Visibility
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed max-w-xl">
                A unified vantage point for property managers. Real-time request volumes, live SLA health, urgent escalations, and cross-department workloads aggregated in one reactive dashboard.
              </p>
            </div>

            {/* Visual Micro-preview inside card */}
            <div className="mt-6 rounded-xl border border-slate-800/80 bg-slate-900/60 p-3.5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-semibold text-slate-300">Live Health Check</span>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
                <span>99.8% Uptime</span>
                <span className="text-indigo-400 font-bold">100% RBAC Secured</span>
              </div>
            </div>
          </div>

          {/* Card 2: Work Orders & Lifecycle Management */}
          <div
            onMouseMove={handleMouseMove}
            className="reveal-on-scroll delay-150 spotlight-card group relative flex flex-col justify-between rounded-2xl border border-slate-800 bg-[#0b0f19] p-6 sm:p-8"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <ClipboardCheck size={20} />
                </div>
                <span className="font-mono text-[11px] text-slate-400">02 / DISPATCH</span>
              </div>
              <h3 className="mt-6 text-lg font-bold text-white group-hover:text-amber-300 transition-colors">
                Work Orders & State Machine
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
                Deterministic status lifecycle (Open → In Progress → Resolved) preventing illegal state jumps and maintaining an immutable resolution history.
              </p>
            </div>

            <div className="mt-6 flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
              <CheckCircle2 size={13} className="text-emerald-400" />
              <span>Resolved lock enforcement</span>
            </div>
          </div>

          {/* Card 3: SLA Tracking & Escalations */}
          <div
            onMouseMove={handleMouseMove}
            className="reveal-on-scroll delay-200 spotlight-card group relative flex flex-col justify-between rounded-2xl border border-slate-800 bg-[#0b0f19] p-6 sm:p-8"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <Clock size={20} />
                </div>
                <span className="font-mono text-[11px] text-slate-400">03 / SLA</span>
              </div>
              <h3 className="mt-6 text-lg font-bold text-white group-hover:text-rose-300 transition-colors">
                Automated SLA Detection
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
                Continuous background calculation for overdue tickets and near-SLA thresholds with color-coded risk markers and priority escalation.
              </p>
            </div>

            <div className="mt-6 rounded-lg border border-slate-800/80 bg-slate-900/60 p-2.5 flex items-center justify-between text-xs">
              <span className="text-slate-400 text-[11px]">Threshold Rule</span>
              <span className="text-rose-400 font-bold font-mono text-[11px]">48h Breach Alert</span>
            </div>
          </div>

          {/* Card 4: Resident Communication & Broadcasts */}
          <div
            onMouseMove={handleMouseMove}
            className="reveal-on-scroll delay-200 spotlight-card group relative flex flex-col justify-between rounded-2xl border border-slate-800 bg-[#0b0f19] p-6 sm:p-8"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  <Megaphone size={20} />
                </div>
                <span className="font-mono text-[11px] text-slate-400">04 / NOTICES</span>
              </div>
              <h3 className="mt-6 text-lg font-bold text-white group-hover:text-sky-300 transition-colors">
                Resident Notices & Broadcasts
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
                Publish building-wide announcements, maintenance advisories, and emergency alerts with instant notifications and email dispatch.
              </p>
            </div>

            <div className="mt-6 flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
              <span>Multi-channel delivery</span>
            </div>
          </div>

          {/* Card 5: Operational Analytics */}
          <div
            onMouseMove={handleMouseMove}
            className="reveal-on-scroll delay-300 spotlight-card group relative flex flex-col justify-between rounded-2xl border border-slate-800 bg-[#0b0f19] p-6 sm:p-8"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <BarChart3 size={20} />
                </div>
                <span className="font-mono text-[11px] text-slate-400">05 / METRICS</span>
              </div>
              <h3 className="mt-6 text-lg font-bold text-white group-hover:text-indigo-300 transition-colors">
                Operational Analytics
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
                Category distribution breakdowns, resolution velocity curves, and recurring maintenance heatmaps to optimize vendor contracts.
              </p>
            </div>

            <div className="mt-6 flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/60">
              <span>Resolution Rate</span>
              <span className="font-mono font-bold text-emerald-400">+18% Efficiency</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
