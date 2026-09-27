// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for how a fare is broken down and displayed.
// ─────────────────────────────────────────────────────────────────────────────
// Before this, Checkout, Payment and the Invoice each assembled their own
// line items from the same `selected` object, and none of them added up:
//
//   • "Base Fare" was rendered from `selected.baseFare`, which is the FULL
//     quoted total when there's no surge (see selectVehicle: baseFare =
//     fare / surgeMultiplier). Listing it as "Base Fare" and then adding
//     "Driver Allowance" / "Surge Fee" under it double-counted charges that
//     were already inside that number.
//   • The backend's real `breakdown` array (base, distance, bata, night,
//     surge, minimum-fare top-up, rounding) was only used by the collapsed
//     "View Fare Break-up" panel, and ignored everywhere else.
//   • Nothing ever checked that the lines summed to the total, so a partial
//     or missing breakdown silently produced a list that didn't reconcile.
//
// buildFareLines() always returns lines that sum EXACTLY to `tripTotal`,
// inserting a reconciliation line if the source data doesn't account for
// everything. Callers render `lines` then `tripTotal`, then any
// after-the-trip adjustments (GST, discount) to reach `totalPayable`.

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * @param selected  the selectedCab slice (carries fare, breakdown, surge,
 *                  driverBhata, nightAllowance from the real backend quote)
 * @param opts      { isCorporate, gstRate, discountAmount, discountCode }
 */
export function buildFareLines(selected, opts = {}) {
  const {
    isCorporate = false,
    gstRate = 0.05,          // 2.5% CGST + 2.5% SGST
    discountAmount = 0,
    discountCode = null,
  } = opts;

  // The backend's quoted total for the trip. Everything below reconciles
  // against this number — it is never recomputed on the client.
  const tripTotal = Math.round(num(selected?.fare));

  const rawBreakdown = Array.isArray(selected?.breakdown) ? selected.breakdown : [];
  const hasRealBreakdown = rawBreakdown.length > 0;

  let lines = [];

  if (hasRealBreakdown) {
    // Real backend breakdown — use it verbatim, it's the authoritative split.
    lines = rawBreakdown
      .map((l) => ({
        label: l.label || l.name || "Charge",
        amount: Math.round(num(l.amount ?? l.value)),
        note: l.note || null,
      }))
      // A zero-rupee component is noise, not information.
      .filter((l) => l.amount !== 0);
  } else {
    // No breakdown from the backend — derive the best honest split we can
    // from the named components it did send, then let the reconciliation
    // step below absorb whatever is left over into a base-fare line.
    const surge  = Math.round(num(selected?.surgeFee ?? selected?.surgeAmount));
    const bata   = Math.round(num(selected?.driverBhata ?? selected?.driverAllowance));
    const night  = Math.round(num(selected?.nightAllowance));
    const base   = tripTotal - surge - bata - night;

    if (base > 0) lines.push({ label: "Base fare", amount: base, note: null });
    if (bata > 0) {
      lines.push({ label: "Driver allowance", amount: bata, note: null });
    }
    if (night > 0) {
      lines.push({ label: "Night allowance", amount: night, note: null });
    }
    if (surge > 0) {
      lines.push({
        label: "Surge",
        amount: surge,
        note: selected?.surgePct ? `+${selected.surgePct}% peak demand` : null,
      });
    }
  }

  // ── Reconciliation ────────────────────────────────────────────────────────
  // Guarantee the lines sum to tripTotal, so the customer never sees a list
  // that doesn't add up to what they're being charged.
  const lineSum = lines.reduce((s, l) => s + l.amount, 0);
  const drift = tripTotal - lineSum;
  if (drift !== 0) {
    if (lines.length === 0) {
      lines.push({ label: "Trip fare", amount: tripTotal, note: null });
    } else if (Math.abs(drift) <= 2) {
      // Sub-rupee rounding from the backend — fold it into the last line
      // rather than showing a distracting ₹1 row.
      lines[lines.length - 1].amount += drift;
    } else {
      lines.push({
        label: drift > 0 ? "Other charges" : "Adjustment",
        amount: drift,
        note: null,
      });
    }
  }

  // ── After the trip fare: taxes and discount ───────────────────────────────
  // GST only applies to corporate (tax-invoice) bookings. When the backend
  // already itemised tax inside its own breakdown, don't add it twice.
  const breakdownHasTax = rawBreakdown.some((l) =>
    /gst|tax/i.test(String(l.label || l.name || ""))
  );
  const taxable = isCorporate && !breakdownHasTax;
  const cgst = taxable ? Math.round(tripTotal * (gstRate / 2)) : 0;
  const sgst = taxable ? Math.round(tripTotal * (gstRate / 2)) : 0;

  const discount = Math.max(0, Math.round(num(discountAmount)));
  const subTotal = tripTotal + cgst + sgst;
  const totalPayable = Math.max(0, subTotal - discount);

  return {
    lines,
    tripTotal,
    hasRealBreakdown,
    cgst,
    sgst,
    taxTotal: cgst + sgst,
    isCorporate,
    discount,
    discountCode: discount > 0 ? discountCode : null,
    subTotal,
    totalPayable,
  };
}

/**
 * Advance / balance split for a payment mode, computed off the SAME
 * totalPayable every screen shows.
 */
export function splitPayment(totalPayable, paymentMode, advancePercent = 25) {
  const total = Math.max(0, Math.round(num(totalPayable)));
  const payNow =
    paymentMode === "ZERO"    ? 0 :
    paymentMode === "PARTIAL" ? Math.round((total * advancePercent) / 100) :
    total;
  return { payNow, payLater: total - payNow };
}
