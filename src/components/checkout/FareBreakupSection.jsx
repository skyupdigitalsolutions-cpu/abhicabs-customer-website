import { useState } from "react";
import { fmtINR } from "../../data/mockData";

/**
 * Real, working fare breakup — confirmed against the actual backend's
 * fare.service.js: every quote/estimate response includes a `breakdown`
 * array of { label, amount, note? } objects (base fare, distance, night
 * charge, surge, minimum-fare adjustment, rounding — whatever actually
 * applied to this specific quote). This renders exactly that, nothing
 * invented — if a line doesn't apply to a given trip, the backend simply
 * doesn't include it, so the list only ever shows genuinely real charges.
 *
 * Usage: <FareBreakupSection breakdown={quote.breakdown} total={quote.total} />
 * `quote` here is whatever your fares.js service already returns from
 * POST /fares/estimate — no new API call needed, this just renders data
 * you already have in hand at checkout.
 */
export function FareBreakupSection({ breakdown = [], total }) {
  const [open, setOpen] = useState(false);

  if (!breakdown.length) return null;

  return (
    <div className="border-t border-border pt-3 mt-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between w-full text-[13.5px] font-semibold text-primary"
      >
        <span>View Fare Break-up</span>
        <span className={`transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>

      {open && (
        <div className="mt-3 space-y-1.5">
          {breakdown.map((line, i) => (
            <div key={i} className="flex justify-between text-[13px]">
              <span className="text-text-secondary">
                {line.label}
                {line.note && <span className="text-[11px] text-text-secondary/70 block">{line.note}</span>}
              </span>
              <span className="text-text font-medium">{fmtINR(line.amount)}</span>
            </div>
          ))}
          {total != null && (
            <div className="flex justify-between text-[13.5px] font-bold pt-2 mt-1 border-t border-border">
              <span>Total</span>
              <span>{fmtINR(total)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}