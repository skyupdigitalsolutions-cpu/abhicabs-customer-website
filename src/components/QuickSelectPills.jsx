import React from "react";

// Reusable quick-select trip-type pills — extracted from the homepage's
// inline block that sits just below the hero's booking widget, overlapping
// it with a negative top margin.
//
// Grid per Figma dev-mode spec: 1 row × 5 columns, row/column gap 14px,
// 78px tall (already matched by the existing gap-3.5 = 14px and
// lg:grid-cols-5 — no correction needed here, just extracted as its own
// component).
//
// Props:
// - options: [{ mode, label, icon }] — required.
// - activeMode: the currently active mode (highlights the matching pill).
// - onSelect: (mode) => void — called when a pill is pressed.
// - className: optional extra classes on the outer wrapper (e.g. to adjust
//   or remove the hero-overlap negative margin for reuse elsewhere).
export default function QuickSelectPills({
  options,
  activeMode,
  onSelect,
  className = "max-w-[1264px] mx-auto px-6 -mt-[130px] md:-mt-[150px] relative z-20",
}) {
  return (
    <div className={className}>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {options.map((q) => {
          const isActive = activeMode === q.mode;
          return (
            <button
              key={q.mode}
              onClick={() => onSelect(q.mode)}
              className={`flex items-center gap-2.5 rounded-2xl px-4 py-3.5 text-[13.5px] font-bold transition-colors ${
                isActive ? "bg-brand-black text-white" : "bg-primary-tint text-brand-black hover:bg-primary/20"
              }`}
            >
              <span className={`w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0 ${isActive ? "bg-white/10" : "bg-white"}`}>
                {q.icon}
              </span>
              {q.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
