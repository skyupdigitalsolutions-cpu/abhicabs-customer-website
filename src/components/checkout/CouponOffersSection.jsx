import { useState } from "react";
import { discountsApi } from "../../api";
import { isAuthenticated } from "../../api/tokens";
import { fmtINR } from "../../data/mockData";

/**
 * src/components/checkout/CouponOffersSection.jsx
 *
 * A real, working promo-code checker — backed by the actual discount system
 * (discount.controller.js / discount.service.js), which was already there:
 * percent or flat codes, minimum fare, per-customer limits, expiry, and scope
 * (first-ride, airport, corporate). POST /discounts/check validates a code
 * against the live fare total and answers with a REASON when it doesn't
 * apply ("expired", "needs a fare of at least ₹999", "already used"), never
 * a bare failure.
 *
 * There's no code entry to browse here, on purpose: the backend has no
 * endpoint to list currently-active codes to a rider (only /admin/discounts,
 * which is staff-only). So this is "type a code you already have and we'll
 * tell you honestly whether it applies" rather than "browse today's offers".
 * Adding a browsable list would need a small new backend endpoint.
 *
 * Also worth knowing for whoever maintains this next: /discounts/check only
 * VALIDATES — it doesn't record a redemption or decrement a code's use
 * count (booking creation doesn't send a discount code at all today), so a
 * "single use" code isn't actually enforced as single-use yet. That's a
 * backend gap outside this file's scope, not a bug here.
 *
 * Requires a signed-in customer (the endpoint does). A guest at checkout
 * hasn't registered yet at this point in the flow, so this shows a quiet
 * sign-in prompt instead of a broken "Apply" button.
 *
 * Props:
 *   fareTotal — the current fare total (number), used to check eligibility
 *   tripType  — journey.tripType ("one-way" | "round-trip" | "local" | "airport")
 *   applied   — the currently-applied discount result, or null
 *   onApplied(result | null) — called with the check result when a code is
 *     applied, or null when the customer removes it
 */
export function CouponOffersSection({ fareTotal, tripType, applied, onApplied }) {
  const signedIn = isAuthenticated();

  const [code, setCode] = useState(applied?.code || "");
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState("info"); // info | error | success
  const [checking, setChecking] = useState(false);

  async function applyCode() {
    const value = code.trim();
    if (!value) return;
    if (!signedIn) {
      setMessage("Please sign in to check a promo code.");
      setMessageTone("error");
      return;
    }
    setChecking(true);
    setMessage("");
    try {
      const result = await discountsApi.checkDiscount({
        code: value,
        fareTotal,
        tripType,
      });
      if (result.ok) {
        setCode(result.code);
        setMessage(`${result.code} applied — you saved ${fmtINR(result.amount)}`);
        setMessageTone("success");
        onApplied?.(result);
      } else {
        setMessage(result.reason || "That code isn't valid right now.");
        setMessageTone("error");
        onApplied?.(null);
      }
    } finally {
      setChecking(false);
    }
  }

  function removeCode() {
    setCode("");
    setMessage("");
    onApplied?.(null);
  }

  return (
    <div>
      <p className="text-[13.5px] font-bold mb-2">Coupon &amp; Offers</p>

      {applied?.ok ? (
        <div className="flex items-center justify-between gap-3 border border-primary/40 bg-[#FFFBEA] rounded-[10px] px-3.5 py-2.5">
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-text">{applied.code}</p>
            <p className="text-[12px] text-text-secondary break-words">
              {applied.description || "Promo applied"} — saved {fmtINR(applied.amount)}
            </p>
          </div>
          <button
            onClick={removeCode}
            className="text-[12.5px] font-semibold text-error shrink-0 px-1"
          >
            Remove
          </button>
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            <input
              className="flex-1 min-w-0 h-11 border border-border rounded-[10px] px-3.5 text-base md:text-[13.5px] outline-none focus:border-primary bg-[#fbfbfe]"
              placeholder="Enter a coupon"
              value={code}
              onChange={(e) => { setCode(e.target.value); setMessage(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") applyCode(); }}
              disabled={checking}
            />
            <button
              onClick={applyCode}
              disabled={checking || !code.trim()}
              className="shrink-0 h-11 bg-primary text-primary-text font-bold text-[13px] px-5 rounded-[10px] disabled:opacity-50"
            >
              {checking ? "..." : "APPLY"}
            </button>
          </div>
          {message && (
            <p className={`text-[12px] mt-1.5 ${messageTone === "error" ? "text-error" : "text-text-secondary"}`}>
              {message}
            </p>
          )}
          {!signedIn && (
            <p className="text-[12px] text-text-secondary mt-1.5">
              <a href="/login" className="font-semibold text-primary">Sign in</a> to check a promo code.
            </p>
          )}
        </>
      )}
    </div>
  );
}
