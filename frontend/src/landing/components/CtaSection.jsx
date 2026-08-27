import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";

export default function CtaSection() {
  return (
    <section className="relative overflow-hidden bg-[#090d16]/90 py-24 sm:py-32 text-white border-t border-slate-800/80">
      {/* Subtle radial backdrop */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[800px] rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/25 via-indigo-950/10 to-transparent blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
        <div className="reveal-on-scroll mx-auto max-w-2xl">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-950/50 px-3.5 py-1 text-xs font-semibold text-indigo-300 backdrop-blur-md mb-6 shadow-glow">
            <Sparkles size={13} className="text-indigo-400" />
            <span>Ready for Deployment</span>
          </div>

          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl uppercase leading-tight">
            Make property operations <br />
            <span className="bg-gradient-to-r from-indigo-300 via-indigo-100 to-white bg-clip-text text-transparent">
              predictable.
            </span>
          </h2>

          <p className="mt-4 text-sm sm:text-base text-slate-400 leading-relaxed max-w-lg mx-auto">
            Equip your residents and management with a structured, reliable operations engine. Get started today.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <Link
              to="/register"
              className="group inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-7 py-3.5 text-sm font-bold text-white shadow-glow transition-all hover:bg-indigo-500 hover:shadow-indigo-500/30 active:scale-95 cursor-pointer"
            >
              <span>Get Started</span>
              <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-1" />
            </Link>

            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-900/60 px-7 py-3.5 text-sm font-semibold text-slate-300 backdrop-blur-xs transition-all hover:border-slate-600 hover:bg-slate-800 hover:text-white cursor-pointer"
            >
              <span>Sign In to Console</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
