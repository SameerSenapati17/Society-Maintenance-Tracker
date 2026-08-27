import React from "react";
import { Sparkles, Copy, Zap, ShieldAlert, Check } from "lucide-react";

export default function IntelligenceSection() {
  return (
    <section id="intelligence" className="relative bg-[#0b0f19]/90 py-24 sm:py-32 text-white border-t border-slate-800/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center">
          {/* Left Column: Vision Copy with Scroll Reveal */}
          <div className="reveal-on-scroll lg:col-span-6 space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-950/60 px-3.5 py-1 text-xs font-semibold text-indigo-300 backdrop-blur-xs shadow-glow">
              <Sparkles size={13} className="text-indigo-400" />
              <span>Next Generation · Coming Soon</span>
            </div>

            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-4xl uppercase leading-tight">
              From maintenance tracking <br />
              <span className="text-indigo-400">to operational intelligence.</span>
            </h2>

            <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
              We are engineering intelligent classification architectures to assist property teams during high-volume incidents. AI triage will automatically classify urgency, detect duplicate resident reports across units, and suggest pre-approved vendor actions.
            </p>

            <div className="pt-2 space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-indigo-950 text-indigo-400 border border-indigo-800">
                  <Check size={13} />
                </div>
                <p className="text-xs text-slate-300">
                  <strong className="text-white font-semibold">Semantic Duplicate Clustering:</strong> Groups 10+ resident reports about the same main pipe rupture into a single incident master ticket.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-indigo-950 text-indigo-400 border border-indigo-800">
                  <Check size={13} />
                </div>
                <p className="text-xs text-slate-300">
                  <strong className="text-white font-semibold">Automated Priority Scoring:</strong> Analyzes report text & images to flag emergency safety hazards ahead of standard tickets.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Conceptual AI Triage Architecture Card */}
          <div className="reveal-on-scroll delay-150 lg:col-span-6">
            <div className="interactive-card relative rounded-2xl border border-indigo-500/30 bg-gradient-to-b from-[#0e1424] to-[#090d16] p-6 sm:p-7 shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                    <Sparkles size={14} />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    AI Triage Architecture
                  </span>
                </div>
                <span className="rounded-full bg-indigo-950 border border-indigo-700/50 px-2.5 py-0.5 text-[10px] font-bold text-indigo-300">
                  Phase 3 Preview
                </span>
              </div>

              {/* Conceptual Card Body */}
              <div className="mt-5 space-y-4">
                {/* Incoming Ticket */}
                <div className="rounded-xl border border-slate-800/90 bg-slate-900/80 p-3.5">
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>Incoming Request Text</span>
                    <span className="font-mono">Unit 804</span>
                  </div>
                  <p className="text-xs text-slate-200 italic font-mono bg-slate-950/70 p-2 rounded border border-slate-800">
                    &ldquo;Water leaking heavily through bathroom ceiling, electrical fixture dripping.&rdquo;
                  </p>
                </div>

                {/* AI Triage Classification Matrix */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                      Classified Category
                    </span>
                    <span className="text-xs font-bold text-indigo-300">
                      Plumbing / Structural
                    </span>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                      Assessed Priority
                    </span>
                    <span className="text-xs font-bold text-rose-400 flex items-center gap-1">
                      <ShieldAlert size={12} /> High (Hazard)
                    </span>
                  </div>
                </div>

                {/* Duplicate Analysis */}
                <div className="rounded-xl border border-amber-500/20 bg-amber-950/20 p-3 flex items-start gap-2.5">
                  <Copy size={15} className="text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-amber-300">Potential Duplicate Detected</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      94% semantic match with Ticket #4088 (Unit 904 Main Drain Overflow).
                    </p>
                  </div>
                </div>

                {/* Suggested Action */}
                <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/20 p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap size={14} className="text-indigo-400" />
                    <span className="text-xs font-semibold text-slate-300">
                      Suggested Action: Dispatch Emergency Plumbing
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 font-bold">Auto-Queue</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
