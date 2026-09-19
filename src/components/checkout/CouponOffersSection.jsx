import { useState } from "react";

/**
 * src/components/checkout/CouponOffersSection.jsx
 *
 * VISUALLY present to match the reference, but honestly non-functional —
 * your backend has no real coupon/discount system at all. The Invoice
 * model has a `discount` column, but it's hardcoded to '0.00' everywhere
 * in billing.service.js; there's no code anywhere that looks up a coupon
 * code or calculates a real discount from one.
 *
 * Tapping Apply always shows a clear "not available yet" message rather
 * than silently pretending a code worked — the same honesty rule used for
 * driver-added charges and the trip lifecycle buttons elsewhere in this
 * project. The moment your backend adds real coupon support, replace
 * handleApply's body with the actual API call; the rest of this component
 * needs no other changes.
 */
export function CouponOffersSection() {
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");

  function handleApply() {
    if (!code.trim()) return;
    setMessage("Coupons aren't available yet — check back soon.");
  }

  return (
    <div>
      <p className="text-[13.5px] font-bold mb-2">Coupon & Offers</p>
      <div className="flex gap-2">
        <input
          className="flex-1 border border-border rounded-[10px] px-3.5 py-2.5 text-[13.5px] outline-none focus:border-primary bg-[#fbfbfe]"
          placeholder="Enter a coupon"
          value={code}
          onChange={(e) => { setCode(e.target.value); setMessage(""); }}
        />
        <button
          onClick={handleApply}
          className="bg-primary text-primary-text font-bold text-[13px] px-5 rounded-[10px]"
        >
          APPLY
        </button>
      </div>
      {message && <p className="text-[12px] text-text-secondary mt-1.5">{message}</p>}
    </div>
  );
}