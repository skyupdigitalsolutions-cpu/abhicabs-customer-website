// Discounts service — real promo-code checking, using the backend endpoint
// that already exists and was NOT modified for this feature:
//
//   POST /discounts/check (auth required) → { ok, code, description, type,
//     amount, payable } | { ok: false, code, reason }
//
// There is no backend endpoint to BROWSE active codes — only /admin/discounts
// (staff-only, needs the FARE_EDIT permission) and this rider-facing /check,
// which validates one code you already have. So this UI is "type a code,
// we tell you honestly whether it applies and how much it saves" rather than
// "browse a list of offers" — that second thing would need a new backend
// endpoint, which is out of scope here.
//
// Also worth knowing: /discounts/check only VALIDATES a code — it doesn't
// touch usedCount or record a redemption (that's discountService.redeem(),
// which today is only ever called from... nowhere; booking creation doesn't
// accept a discount code at all yet). So a "single use" code isn't actually
// enforced as single-use anywhere in the current backend. That's a backend
// gap, not something this file can fix.
import { api, ApiError } from "../client";
import { USE_MOCK } from "../config";

const TRIP_TYPE_MAP = {
  "one-way": "ONE_WAY",
  oneway: "ONE_WAY",
  "round-trip": "ROUND_TRIP",
  roundtrip: "ROUND_TRIP",
  airport: "AIRPORT",
  local: "HOURLY",
  hourly: "HOURLY",
};
function toRealTripType(tripType) {
  return TRIP_TYPE_MAP[(tripType || "").toLowerCase()] || undefined;
}

function isAuthError(err) {
  return err instanceof ApiError && err.status === 401;
}

/**
 * Check one code against a live fare total. Never throws for an ordinary
 * "doesn't apply" outcome — the backend answers 200 either way with a reason
 * — so the only thrown errors here are auth/network failures the caller must
 * decide how to present.
 *
 * @returns {Promise<{ok:true, code, description, type, amount, payable} |
 *                    {ok:false, code, reason}>}
 */
export async function checkDiscount({ code, fareTotal, tripType }) {
  if (USE_MOCK) {
    return { ok: false, code: "MOCK_MODE", reason: "Promo codes aren't available in demo mode." };
  }
  try {
    const data = await api.post("/discounts/check", {
      code,
      fareTotal,
      tripType: toRealTripType(tripType),
    });
    return data;
  } catch (err) {
    if (isAuthError(err)) {
      return { ok: false, code: "SIGN_IN_REQUIRED", reason: "Please sign in to check a promo code." };
    }
    return {
      ok: false,
      code: err?.code || "DISCOUNT_CHECK_FAILED",
      reason: err?.message || "Could not check that code right now — please try again.",
    };
  }
}
