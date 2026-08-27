import React from "react";

export default function AmbientBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none"
      aria-hidden="true"
    >
      {/* Base Deep Navy Fill */}
      <div className="absolute inset-0 bg-[#090d16]" />

      {/* Ambient Moving Aurora Layer 1 (Indigo-Violet Primary Glow) */}
      <div className="ambient-aurora-layer absolute -top-48 left-1/3 h-[650px] w-[850px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-600/18 via-purple-900/10 to-transparent blur-[120px]" />

      {/* Ambient Moving Aurora Layer 2 (Restrained Blue/Slate Secondary Glow) */}
      <div className="ambient-aurora-layer absolute top-1/2 -right-48 h-[600px] w-[750px] rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-500/10 via-slate-800/10 to-transparent blur-[140px] delay-300" />

      {/* Ambient Moving Aurora Layer 3 (Bottom Left subtle ambient anchor) */}
      <div className="ambient-aurora-layer absolute -bottom-48 left-10 h-[500px] w-[650px] rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/12 via-indigo-950/15 to-transparent blur-[110px]" />

      {/* Subtle Architectural Grid Overlay with Radial Fade Mask */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b14_1px,transparent_1px),linear-gradient(to_bottom,#1e293b14_1px,transparent_1px)] bg-[size:4.5rem_4.5rem] [mask-image:radial-gradient(ellipse_80%_60%_at_50%_40%,#000_60%,transparent_100%)] opacity-70" />
    </div>
  );
}
