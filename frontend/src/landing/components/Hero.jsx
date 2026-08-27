import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Clock,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Activity,
  Layers,
  ChevronRight,
  Radio,
  BellRing
} from "lucide-react";
import OperationsNetworkVisual from "./OperationsNetworkVisual.jsx";

export default function Hero() {
  // Presentational Live Simulated State
  const [activeRequests, setActiveRequests] = useState(24);
  const [recentEvent, setRecentEvent] = useState(null);
  const [highlightRow, setHighlightRow] = useState(null);

  useEffect(() => {
    // Subtle, believable operational state simulation
    const events = [
      { text: "Ticket #PLUMB-4091: Status updated to In Progress", type: "progress", rowId: 1 },
      { text: "Ticket #HVAC-8021: Resolved within 2.1h SLA", type: "resolved", rowId: 3 },
      { text: "Automated SLA Check: 0 breaches detected across 180 units", type: "sla", rowId: null },
      { text: "New Request: #ELEV-1044 registered by Unit 1104", type: "new", rowId: 2 }
    ];

    let step = 0;
    const interval = setInterval(() => {
      step = (step + 1) % events.length;
      const currentEvent = events[step];
      setRecentEvent(currentEvent.text);
      setHighlightRow(currentEvent.rowId);

      // Subtle jitter on active counter to simulate real stream
      if (step % 2 === 0) {
        setActiveRequests((prev) => (prev === 24 ? 25 : 24));
      }

      const timeout = setTimeout(() => {
        setHighlightRow(null);
      }, 3000);

      return () => clearTimeout(timeout);
    }, 7000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section id="overview" className="relative min-h-screen overflow-hidden bg-[#090d16] pt-28 pb-20 text-white lg:pt-36 lg:pb-32">
      {/* React Bits-inspired Aurora Ambient Beams Backdrop */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {/* Deep navy base radial gradient */}
        <div className="absolute -top-40 left-1/2 h-[750px] w-[1100px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/35 via-indigo-950/20 to-transparent blur-3xl" />
        
        {/* Animated Aurora Beam 1 (Indigo-Violet) */}
        <div className="absolute top-12 left-1/4 h-80 w-96 rounded-full bg-gradient-to-tr from-indigo-600/20 to-purple-600/20 blur-3xl animate-aurora opacity-50" />
        
        {/* Animated Aurora Beam 2 (Cyan-Indigo) */}
        <div className="absolute top-44 right-1/4 h-72 w-80 rounded-full bg-gradient-to-bl from-cyan-500/15 via-indigo-500/15 to-transparent blur-3xl animate-pulse-subtle opacity-40" />

        {/* Architectural grid overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Hero Copy Container */}
        <div className="mx-auto max-w-3xl text-center">
          {/* Release Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-950/60 px-3.5 py-1 text-xs font-semibold text-indigo-300 backdrop-blur-md mb-6 animate-fade-in shadow-glow">
            <Sparkles size={13} className="text-indigo-400" />
            <span className="tracking-wide">NIVARA Platform v2.4</span>
            <span className="h-3 w-px bg-indigo-700/60" />
            <span className="text-slate-400 font-medium">Intelligent Operations</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl uppercase leading-[1.1]">
            Property operations, <br />
            <span className="bg-gradient-to-r from-indigo-300 via-indigo-100 to-white bg-clip-text text-transparent">
              without the chaos.
            </span>
          </h1>

          {/* Supporting Subheadline */}
          <p className="mt-5 text-sm sm:text-base lg:text-lg text-slate-400 leading-relaxed max-w-2xl mx-auto">
            One intelligent workspace for maintenance, residents, operations and property teams. Real-time SLA tracking, immutable audit trails, and unified communications.
          </p>

          {/* Action CTAs */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <Link
              to="/register"
              className="group inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-glow transition-all hover:bg-indigo-500 hover:shadow-indigo-500/30 active:scale-95 cursor-pointer"
            >
              <span>Explore Nivara</span>
              <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>

            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-900/60 px-6 py-3 text-sm font-semibold text-slate-300 backdrop-blur-xs transition-all hover:border-slate-600 hover:bg-slate-800 hover:text-white"
            >
              <span>Sign In to Console</span>
            </Link>
          </div>

          {/* Subtext Capability Markers */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 font-medium">
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-400" />
              <span>Role-Based Access Control</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock size={14} className="text-amber-400" />
              <span>Real-Time SLA Engine</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Layers size={14} className="text-indigo-400" />
              <span>Immutable Audit Logs</span>
            </div>
          </div>
        </div>

        {/* Abstract Property Operations Network Topology Visual */}
        <div className="mt-10 mx-auto max-w-4xl">
          <div className="rounded-2xl border border-slate-800/80 bg-[#0b0f19]/60 backdrop-blur-md p-2 shadow-card">
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-800/70 text-[10px] font-mono text-slate-400">
              <span className="flex items-center gap-1.5">
                <Radio size={11} className="text-indigo-400 animate-pulse" />
                Live Property Operations Network Topology
              </span>
              <span>8 Active Nodes · Continuous Telemetry</span>
            </div>
            <OperationsNetworkVisual />
          </div>
        </div>

        {/* Live Command Center Product Preview Window */}
        <div className="relative mt-8 mx-auto max-w-5xl animate-scale-in">
          {/* Glow backdrop behind preview card */}
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-b from-indigo-500/20 via-purple-500/10 to-transparent blur-xl opacity-70" />

          {/* Simulated App Window Card */}
          <div className="relative rounded-2xl border border-slate-700/80 bg-slate-900/90 shadow-2xl backdrop-blur-md overflow-hidden">
            {/* Window Frame Header */}
            <div className="flex items-center justify-between border-b border-slate-800 bg-[#0b0f19] px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-slate-700" />
                  <div className="h-2.5 w-2.5 rounded-full bg-slate-700" />
                  <div className="h-2.5 w-2.5 rounded-full bg-slate-700" />
                </div>
                <span className="ml-2 font-mono text-[11px] text-slate-400">
                  nivara.app / console / command-center
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                {recentEvent && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-indigo-300 font-medium animate-fade-in bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800/60">
                    <BellRing size={10} className="text-indigo-400" />
                    {recentEvent}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live SLA Engine
                </span>
              </div>
            </div>

            {/* Simulated Live Command Center Dashboard Body */}
            <div className="p-4 sm:p-6 lg:p-7 space-y-6">
              {/* Top KPI Metrics Row */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-slate-800 bg-[#0b0f19]/80 p-3.5 transition-all duration-300">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Active Requests
                  </p>
                  <div className="mt-1.5 flex items-baseline gap-2">
                    <span className="text-xl sm:text-2xl font-bold text-white font-mono">
                      {activeRequests}
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-0.5">
                      <TrendingUp size={11} /> 94% on track
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-[#0b0f19]/80 p-3.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Resolution SLA
                  </p>
                  <div className="mt-1.5 flex items-baseline gap-2">
                    <span className="text-xl sm:text-2xl font-bold text-indigo-400 font-mono">98.2%</span>
                    <span className="text-[10px] text-slate-400">Within target</span>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-[#0b0f19]/80 p-3.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    SLA Breaches
                  </p>
                  <div className="mt-1.5 flex items-baseline gap-2">
                    <span className="text-xl sm:text-2xl font-bold text-emerald-400 font-mono">0</span>
                    <span className="text-[10px] text-emerald-400">Optimal</span>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-[#0b0f19]/80 p-3.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Avg Resolution
                  </p>
                  <div className="mt-1.5 flex items-baseline gap-2">
                    <span className="text-xl sm:text-2xl font-bold text-white font-mono">3.4h</span>
                    <span className="text-[10px] text-indigo-300 font-semibold">-42% vs avg</span>
                  </div>
                </div>
              </div>

              {/* Work Order Grid & Status Preview */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                {/* Left 2 Cols: Live Work Orders Stream */}
                <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-[#0b0f19]/70 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Live Operations Stream
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">3 Priority Items</span>
                  </div>

                  {/* Work Order Row 1 */}
                  <div
                    className={`flex items-center justify-between rounded-lg border p-3 transition-all duration-300 ${
                      highlightRow === 1
                        ? "border-indigo-500/80 bg-indigo-950/40 shadow-glow"
                        : "border-slate-800/80 bg-slate-900/60 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        <AlertTriangle size={14} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-white">
                          Main Wing B Water Pressure Drop
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          #PLUMB-4091 · Unit B-302 · High Priority
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                        In Progress
                      </span>
                    </div>
                  </div>

                  {/* Work Order Row 2 */}
                  <div
                    className={`flex items-center justify-between rounded-lg border p-3 transition-all duration-300 ${
                      highlightRow === 2
                        ? "border-indigo-500/80 bg-indigo-950/40 shadow-glow"
                        : "border-slate-800/80 bg-slate-900/60 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        <Activity size={14} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-white">
                          Elevator #2 Sensor Calibration
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          #ELEV-1044 · Tower 1 · Medium Priority
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="rounded-full bg-sky-500/15 border border-sky-500/30 px-2 py-0.5 text-[10px] font-bold text-sky-400">
                        Open
                      </span>
                    </div>
                  </div>

                  {/* Work Order Row 3 */}
                  <div
                    className={`flex items-center justify-between rounded-lg border p-3 transition-all duration-300 ${
                      highlightRow === 3
                        ? "border-emerald-500/80 bg-emerald-950/30 shadow-glow"
                        : "border-slate-800/80 bg-slate-900/60 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 size={14} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-white">
                          Courtyard Perimeter Lighting Restored
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          #ELEC-8820 · Grounds · Low Priority
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                        Resolved
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right 1 Col: Real SLA Health & Dispatch Feed */}
                <div className="rounded-xl border border-slate-800 bg-[#0b0f19]/70 p-4 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-3">
                      SLA Thresholds
                    </span>

                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-slate-400">Critical / Emergency</span>
                          <span className="text-emerald-400 font-mono font-bold">100% (2h target)</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                          <div className="h-full w-full bg-emerald-500 rounded-full" />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-slate-400">General Maintenance</span>
                          <span className="text-indigo-400 font-mono font-bold">96% (24h target)</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                          <div className="h-full w-[96%] bg-indigo-500 rounded-full" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80">
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>Audit Lock: Active</span>
                      <span className="text-indigo-400 font-semibold flex items-center gap-0.5">
                        Immutable History <ChevronRight size={10} />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
