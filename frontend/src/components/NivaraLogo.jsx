import React from "react";
import { cn } from "../utils/cn.js";

export default function NivaraLogo({
  size = 28,
  className = "",
  withText = true,
  subtitle = "Property Operations",
  variant = "dark" // 'dark' (for dark bg with white text) or 'light' (for light bg with dark text)
}) {
  const isLight = variant === "light";

  return (
    <div className={cn("inline-flex items-center gap-3 select-none", className)}>
      {/* Precision Geometric Monogram Emblem */}
      <div
        className="relative flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-800 text-white shadow-glow border border-indigo-400/30"
        style={{ width: size, height: size }}
      >
        <svg
          width={Math.round(size * 0.62)}
          height={Math.round(size * 0.62)}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {/* Architectural Left Pillar */}
          <path
            d="M4.5 19.5V4.5L12 14.5V4.5"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Architectural Right Pillar & Crossway */}
          <path
            d="M12 19.5V9.5L19.5 19.5V4.5"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity="0.88"
          />
          {/* Central Coordinate Node */}
          <circle cx="12" cy="14.5" r="1.25" fill="#c7d2fe" />
        </svg>
      </div>

      {withText && (
        <div className="flex flex-col text-left leading-none">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "font-sans text-base font-extrabold tracking-[0.08em]",
                isLight ? "text-slate-900" : "text-white"
              )}
            >
              NIVARA
            </span>
          </div>
          {subtitle && (
            <span
              className={cn(
                "mt-1 text-[9.5px] font-bold uppercase tracking-[0.16em]",
                isLight ? "text-slate-500" : "text-slate-400"
              )}
            >
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export { NivaraLogo };
