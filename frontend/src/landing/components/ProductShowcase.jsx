import React, { useState } from "react";
import {
  LayoutDashboard,
  Kanban,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Camera,
  Layers,
  TrendingUp,
  Activity,
  ArrowRight,
  ShieldCheck,
  Check
} from "lucide-react";

export default function ProductShowcase() {
  const [activeTab, setActiveTab] = useState("command-center");

  const surfaces = [
    {
      id: "command-center",
      title: "Command Center",
      subtitle: "Executive Overview & Health",
      icon: LayoutDashboard,
      badge: "Real-time Metrics"
    },
    {
      id: "operations-board",
      title: "Operations Board",
      subtitle: "Kanban & Triage Matrix",
      icon: Kanban,
      badge: "State Machine"
    },
    {
      id: "resident-experience",
      title: "Resident Experience",
      subtitle: "Reporting & Status Feed",
      icon: Smartphone,
      badge: "Tenant Portal"
    }
  ];

  return (
    <section id="showcase" className="relative bg-[#0b0f19]/90 py-24 sm:py-32 text-white border-t border-slate-800/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header with Scroll Reveal */}
        <div className="reveal-on-scroll text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/20 bg-indigo-950/40 px-3 py-1 text-xs font-semibold text-indigo-400 mb-4">
            <Layers size={12} />
            <span>Product Surfaces</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-4xl uppercase">
            See the operation, <br />
            not just the ticket.
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-400 leading-relaxed">
            Nivara adapts to every role in your property ecosystem — from executive property managers to on-site technicians and residents.
          </p>
        </div>

        {/* Surface Selector Tabs with Smooth Active State */}
        <div className="reveal-on-scroll delay-100 mt-12 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          {surfaces.map((s) => {
            const Icon = s.icon;
            const isActive = activeTab === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveTab(s.id)}
                className={`flex items-center gap-2.5 rounded-xl border px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "border-indigo-500/80 bg-indigo-950/70 text-white shadow-glow"
                    : "border-slate-800 bg-[#090d16]/70 text-slate-400 hover:border-slate-700 hover:text-white"
                }`}
              >
                <Icon size={16} className={isActive ? "text-indigo-400" : "text-slate-500"} />
                <span>{s.title}</span>
              </button>
            );
          })}
        </div>

        {/* Interactive Surface View Area */}
        <div className="reveal-on-scroll delay-200 mt-10 rounded-2xl border border-slate-800 bg-[#090d16] p-4 sm:p-8 shadow-2xl overflow-hidden min-h-[480px]">
          {activeTab === "command-center" && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    Operations Command Center
                  </h3>
                  <p className="text-xs text-slate-400">
                    Live system status across all property blocks and maintenance squads
                  </p>
                </div>
                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  SLA Compliant (98.4%)
                </span>
              </div>

              {/* Refined Command Center KPI Data Cards */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {/* Card 1: Workload Velocity */}
                <div className="interactive-card rounded-xl border border-slate-800/90 bg-[#0b0f19] p-4 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Workload Velocity
                    </span>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono">18</span>
                      <span className="text-xs font-semibold text-slate-300">Resolved</span>
                    </div>
                    <p className="mt-1 text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                      <TrendingUp size={12} /> ↑ 22% higher this week
                    </p>
                  </div>

                  {/* Restrained Sparkline Visualization */}
                  <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-end justify-between h-7 gap-1">
                    {[35, 45, 40, 60, 55, 75, 90].map((val, idx) => (
                      <div
                        key={idx}
                        className={`w-full rounded-xs transition-all ${
                          idx === 6 ? "bg-indigo-500" : "bg-indigo-500/30"
                        }`}
                        style={{ height: `${val}%` }}
                      />
                    ))}
                  </div>
                </div>

                {/* Card 2: Average Resolution Time */}
                <div className="interactive-card rounded-xl border border-slate-800/90 bg-[#0b0f19] p-4 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Average Resolution Time
                    </span>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-2xl sm:text-3xl font-extrabold text-indigo-400 font-mono">3.2</span>
                      <span className="text-xs font-semibold text-slate-300">Hours</span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Target SLA benchmark: &lt; 12.0 hours
                    </p>
                  </div>

                  {/* Minimal Progress Line Visualization */}
                  <div className="mt-4 pt-3 border-t border-slate-800/60">
                    <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                      <span>Velocity Index</span>
                      <span className="text-indigo-400 font-bold">Top 5%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full bg-indigo-500 w-[84%] rounded-full" />
                    </div>
                  </div>
                </div>

                {/* Card 3: Critical Breaches */}
                <div className="interactive-card rounded-xl border border-slate-800/90 bg-[#0b0f19] p-4 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Critical Breaches
                    </span>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono">0</span>
                      <span className="text-xs font-semibold text-slate-300">Overdue</span>
                    </div>
                    <p className="mt-1 text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                      <CheckCircle2 size={12} /> 100% active SLA adherence
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
                    <span>Audit Status</span>
                    <span className="text-slate-300 font-mono font-semibold">Locked & Verified</span>
                  </div>
                </div>
              </div>

              {/* Refined Enterprise Category Mix Visualization */}
              <div className="rounded-xl border border-slate-800/90 bg-[#0b0f19] p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Category Mix
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">Current Cycle</span>
                </div>

                {/* Structured Horizontal Bars in Nivara Palette */}
                <div className="space-y-3">
                  {/* Category 1 */}
                  <div className="grid grid-cols-12 items-center gap-3 text-xs">
                    <span className="col-span-3 sm:col-span-2 font-medium text-slate-300">
                      Plumbing
                    </span>
                    <div className="col-span-7 sm:col-span-9 h-2 rounded-full bg-slate-800/80 overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full w-[45%]" />
                    </div>
                    <span className="col-span-2 sm:col-span-1 text-right font-mono font-bold text-indigo-300">
                      45%
                    </span>
                  </div>

                  {/* Category 2 */}
                  <div className="grid grid-cols-12 items-center gap-3 text-xs">
                    <span className="col-span-3 sm:col-span-2 font-medium text-slate-300">
                      Electrical
                    </span>
                    <div className="col-span-7 sm:col-span-9 h-2 rounded-full bg-slate-800/80 overflow-hidden">
                      <div className="h-full bg-indigo-400/80 rounded-full w-[25%]" />
                    </div>
                    <span className="col-span-2 sm:col-span-1 text-right font-mono font-bold text-slate-300">
                      25%
                    </span>
                  </div>

                  {/* Category 3 */}
                  <div className="grid grid-cols-12 items-center gap-3 text-xs">
                    <span className="col-span-3 sm:col-span-2 font-medium text-slate-300">
                      Elevator
                    </span>
                    <div className="col-span-7 sm:col-span-9 h-2 rounded-full bg-slate-800/80 overflow-hidden">
                      <div className="h-full bg-slate-500 rounded-full w-[18%]" />
                    </div>
                    <span className="col-span-2 sm:col-span-1 text-right font-mono font-bold text-slate-300">
                      18%
                    </span>
                  </div>

                  {/* Category 4 */}
                  <div className="grid grid-cols-12 items-center gap-3 text-xs">
                    <span className="col-span-3 sm:col-span-2 font-medium text-slate-300">
                      General
                    </span>
                    <div className="col-span-7 sm:col-span-9 h-2 rounded-full bg-slate-800/80 overflow-hidden">
                      <div className="h-full bg-slate-600 rounded-full w-[12%]" />
                    </div>
                    <span className="col-span-2 sm:col-span-1 text-right font-mono font-bold text-slate-300">
                      12%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "operations-board" && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    Operations Matrix & Kanban Flow
                  </h3>
                  <p className="text-xs text-slate-400">
                    Real-time status transitions with enforced status machine locking
                  </p>
                </div>
                <span className="rounded-full bg-indigo-500/10 border border-indigo-500/30 px-2.5 py-1 text-xs font-bold text-indigo-400">
                  Immutable State Transition
                </span>
              </div>

              {/* 3 Kanban Columns with Refined Border & Typography */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {/* Column: Open */}
                <div className="rounded-xl border border-slate-800 bg-[#0b0f19] p-3.5 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-sky-400" /> OPEN
                    </span>
                    <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-400">1</span>
                  </div>

                  <div className="rounded-lg border border-slate-800/90 bg-slate-900/70 p-3 space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold text-white">AC Condenser Noise</span>
                      <span className="rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/25 px-1.5 py-0.5 text-[9px] font-bold">High</span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono">Unit 1402 · Reported 12m ago</p>
                  </div>
                </div>

                {/* Column: In Progress */}
                <div className="rounded-xl border border-slate-800 bg-[#0b0f19] p-3.5 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-amber-400" /> IN PROGRESS
                    </span>
                    <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-400">1</span>
                  </div>

                  <div className="rounded-lg border border-slate-800/90 bg-slate-900/70 p-3 space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold text-white">Basement B2 Pipe Repair</span>
                      <span className="rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25 px-1.5 py-0.5 text-[9px] font-bold">Medium</span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono">Assigned to Lead Technician</p>
                  </div>
                </div>

                {/* Column: Resolved */}
                <div className="rounded-xl border border-slate-800 bg-[#0b0f19] p-3.5 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" /> RESOLVED (LOCKED)
                    </span>
                    <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-400">2</span>
                  </div>

                  <div className="rounded-lg border border-slate-800/90 bg-slate-900/70 p-3 space-y-2 opacity-85">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold text-white line-through text-slate-400">Intercom Reset</span>
                      <span className="text-emerald-400 text-[10px] font-bold flex items-center gap-0.5">
                        <CheckCircle2 size={10} /> Verified
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono">Closed in 45m · Resident Notified</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "resident-experience" && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    Resident Portal Experience
                  </h3>
                  <p className="text-xs text-slate-400">
                    Frictionless ticket submission with photo uploads, instant status logs, and notice board
                  </p>
                </div>
                <span className="rounded-full bg-indigo-500/10 border border-indigo-500/30 px-2.5 py-1 text-xs font-bold text-indigo-400">
                  Mobile Responsive
                </span>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Simulated Resident Form Card */}
                <div className="rounded-xl border border-slate-800/90 bg-[#0b0f19] p-5 space-y-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                    Submit Maintenance Request
                  </span>

                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold text-slate-400">Title</label>
                    <div className="rounded-lg border border-slate-700/80 bg-slate-950 px-3 py-2 text-xs text-slate-300 font-medium">
                      Balcony Sliding Door Latch Jammed
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold text-slate-400">Evidence Photo</label>
                    <div className="rounded-lg border border-dashed border-slate-700/80 bg-slate-950/60 p-3 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                      <Camera size={14} className="text-indigo-400" />
                      <span>Cloudinary Storage (Photo Attached)</span>
                    </div>
                  </div>
                </div>

                {/* Simulated Real-Time Status Timeline */}
                <div className="rounded-xl border border-slate-800/90 bg-[#0b0f19] p-5 space-y-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                    Transparent Status Timeline
                  </span>

                  <div className="space-y-3 pl-2 border-l-2 border-indigo-500/40">
                    <div className="relative pl-4">
                      <div className="absolute -left-[1.35rem] top-1 h-3 w-3 rounded-full bg-indigo-500 border-2 border-[#090d16]" />
                      <p className="text-xs font-bold text-white">Technician Dispatched</p>
                      <p className="text-[10px] text-slate-400">Status changed to In Progress · 10:30 AM</p>
                    </div>

                    <div className="relative pl-4">
                      <div className="absolute -left-[1.35rem] top-1 h-3 w-3 rounded-full bg-slate-600 border-2 border-[#090d16]" />
                      <p className="text-xs font-bold text-slate-300">Request Registered</p>
                      <p className="text-[10px] text-slate-400">Automated email receipt dispatched · 09:15 AM</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
