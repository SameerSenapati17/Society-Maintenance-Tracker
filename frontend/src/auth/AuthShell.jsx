import React from "react";
import { Link } from "react-router-dom";
import { NivaraLogo } from "../components/NivaraLogo.jsx";
import { ShieldCheck, Zap, Layers, Sparkles, Radio, CheckCircle2 } from "lucide-react";

export default function AuthShell({ title, subtitle, children }) {
  return (
    <div className="flex min-h-screen w-full flex-col lg:grid lg:grid-cols-12 bg-white text-slate-900 selection:bg-indigo-500 selection:text-white">
      {/* Left Brand Panel (Desktop) */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-[#090d16] p-10 text-white lg:col-span-5 lg:flex xl:col-span-5 xl:p-14 border-r border-slate-800/80">
        {/* Subtle architectural background texture */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/40 via-[#090d16] to-[#090d16]" />
        
        {/* Brand Header */}
        <div className="relative z-10">
          <Link to="/" className="inline-block focus:outline-none">
            <NivaraLogo size={32} subtitle="Property Operations Platform" />
          </Link>
        </div>

        {/* Value statement & Telemetry Visual */}
        <div className="relative z-10 my-auto py-10 max-w-md space-y-6">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-950/60 px-3 py-1 text-xs font-semibold text-indigo-300 backdrop-blur-xs shadow-glow">
            <Sparkles size={12} className="text-indigo-400" />
            <span>Modern Operations Workspace</span>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl leading-snug">
            Property operations, <br />
            without the chaos.
          </h2>
          <p className="text-xs sm:text-sm leading-relaxed text-slate-400">
            Streamline maintenance intake, enforce SLA resolution deadlines, and maintain transparent communications across all residential units.
          </p>

          {/* Micro Telemetry Visual */}
          <div className="rounded-xl border border-slate-800 bg-[#0b0f19]/90 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 border-b border-slate-800/80 pb-2">
              <span className="flex items-center gap-1.5 text-indigo-400 font-bold">
                <Radio size={11} className="animate-pulse" /> Operational Status
              </span>
              <span className="text-emerald-400">100% SLA Active</span>
            </div>
            <div className="space-y-1.5 text-[11px] text-slate-300">
              <div className="flex items-center justify-between">
                <span>Immutable State Machine</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 size={11} /> Enforced
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>RBAC Security Isolation</span>
                <span className="text-indigo-400 font-mono">Resident · Admin</span>
              </div>
            </div>
          </div>

          {/* Core Feature Pillars */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-950 text-indigo-400 border border-indigo-800/50 shrink-0">
                <Zap size={13} />
              </div>
              <span>Real-time SLA tracking and automated escalation</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-950 text-indigo-400 border border-indigo-800/50 shrink-0">
                <ShieldCheck size={13} />
              </div>
              <span>Immutable audit logs and verified resolution locks</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-950 text-indigo-400 border border-indigo-800/50 shrink-0">
                <Layers size={13} />
              </div>
              <span>Unified workspace for residents, staff, and management</span>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/60 pt-6">
          <span>NIVARA Operations Engine</span>
          <span className="font-mono text-[11px]">v2.4</span>
        </div>
      </div>

      {/* Right Content Panel (Form) */}
      <div className="flex flex-1 flex-col justify-center px-4 py-10 sm:px-8 md:px-12 lg:col-span-7 lg:px-16 xl:col-span-7 xl:px-20 bg-slate-50/60">
        <div className="mx-auto w-full max-w-md animate-fade-in">
          {/* Mobile Brand Header */}
          <div className="mb-8 flex flex-col items-center text-center lg:hidden">
            <Link to="/" className="mb-3 focus:outline-none">
              <NivaraLogo size={32} subtitle="" variant="light" />
            </Link>
            <p className="text-xs text-slate-500 font-medium">Intelligent Property Operations Platform</p>
          </div>

          {/* Form Card */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-7 sm:p-9 shadow-subtle">
            <div className="mb-6">
              <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{title}</h2>
              {subtitle && <p className="mt-1.5 text-xs sm:text-sm text-slate-500">{subtitle}</p>}
            </div>

            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export { AuthShell };
