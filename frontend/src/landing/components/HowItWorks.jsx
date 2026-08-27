import React from "react";
import { Send, CheckCircle2, TrendingUp, Layers } from "lucide-react";

export default function HowItWorks() {
  const steps = [
    {
      num: "01",
      title: "Report with Clarity",
      desc: "Residents log requests in seconds with photo evidence, automatic category classification, and instant acknowledgment receipts.",
      icon: Send,
      badge: "Tenant Submission"
    },
    {
      num: "02",
      title: "Triage & Resolve",
      desc: "Operations dispatch tickets with deterministic state transitions, automated SLA countdown timers, and vendor coordination.",
      icon: CheckCircle2,
      badge: "SLA-Driven Dispatch"
    },
    {
      num: "03",
      title: "Analyze & Prevent",
      desc: "Nivara uncovers recurring property failure modes, vendor performance metrics, and equipment lifecycles to prevent future bottlenecks.",
      icon: TrendingUp,
      badge: "Operational Intelligence"
    }
  ];

  return (
    <section id="how-it-works" className="relative bg-[#090d16]/80 py-24 sm:py-32 text-white border-t border-slate-800/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="reveal-on-scroll max-w-2xl">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/20 bg-indigo-950/40 px-3 py-1 text-xs font-semibold text-indigo-400 mb-4">
            <Layers size={12} />
            <span>Operational Lifecycle</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-4xl uppercase">
            How Nivara powers <br />
            property operations.
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-400 leading-relaxed">
            A continuous loop of report intake, deterministic resolution, and operational insights.
          </p>
        </div>

        {/* 3 Steps Grid */}
        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={step.num}
                className={`reveal-on-scroll delay-${(idx + 1) * 100} interactive-card group relative flex flex-col justify-between rounded-2xl border border-slate-800 bg-[#0b0f19] p-7`}
              >
                <div>
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                    <span className="font-mono text-2xl font-extrabold text-indigo-500/80">
                      {step.num}
                    </span>
                    <span className="rounded-full bg-slate-900 border border-slate-800 px-2.5 py-0.5 text-[10px] font-semibold text-slate-400">
                      {step.badge}
                    </span>
                  </div>

                  <div className="mt-6 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 mb-4">
                    <Icon size={20} />
                  </div>

                  <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
