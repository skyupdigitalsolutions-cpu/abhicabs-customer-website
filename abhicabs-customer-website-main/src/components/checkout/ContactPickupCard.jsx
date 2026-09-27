import { useState } from "react";
import { FIELD_INPUT } from "../ui/classNames";

/**
 * src/components/checkout/ContactPickupCard.jsx
 *
 * Matches the reference's compact "Contact & Pickup Details" layout:
 * Full Name + Mobile (with +91 prefix) on one row, Email ID with inline
 * "+Alternate email" / "+Add GST" toggle links, then Pickup/Drop location.
 *
 * IMPORTANT — two things worth knowing before wiring this in:
 *
 *   1. "+Add GST" here is purely a UI toggle that reveals a text field —
 *      your real backend has NO per-booking GST field for a retail
 *      customer (GSTIN only exists on CorporateAccount records, confirmed
 *      against the schema). If someone fills this in, there's currently
 *      nowhere for it to actually go on submit — same honesty rule as the
 *      Coupon box: shown because the reference shows it, but you should
 *      decide whether to keep collecting a value with nowhere to send, or
 *      simply drop this toggle since it can't do anything real yet.
 *
 *   2. This does NOT include "Number of Passengers" or "Special
 *      Instructions" fields, since the reference design doesn't have them
 *      — if your current checkout actually uses those elsewhere in your
 *      real booking flow, keep them as a separate section rather than
 *      losing that functionality; this component only replaces the visual
 *      layout the reference shows, not a field-for-field guarantee.
 *
 * Usage:
 *   <ContactPickupCard
 *     fullName={fullName} onFullNameChange={setFullName}
 *     mobile={mobile} onMobileChange={setMobile}
 *     email={email} onEmailChange={setEmail}
 *     pickupLocation={pickupLocation} onPickupLocationChange={setPickupLocation}
 *     dropLocation={dropLocation} onDropLocationChange={setDropLocation}
 *   />
 */
export function ContactPickupCard({
  fullName, onFullNameChange,
  mobile, onMobileChange,
  email, onEmailChange,
  pickupLocation, onPickupLocationChange,
  dropLocation, onDropLocationChange,
}) {
  const [showAltEmail, setShowAltEmail] = useState(false);
  const [showGst, setShowGst] = useState(false);
  const [altEmail, setAltEmail] = useState("");
  const [gstin, setGstin] = useState("");

  return (
    <div className="bg-white border border-border rounded-2xl p-5">
      <h3 className="text-[15px] font-bold mb-4">Contact & Pickup Details</h3>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <input
          className={FIELD_INPUT}
          placeholder="Full Name"
          value={fullName}
          onChange={(e) => onFullNameChange(e.target.value)}
        />
        <div className="flex gap-2">
          <span className="flex items-center px-3 rounded-[10px] border border-border bg-[#fbfbfe] text-[13.5px] font-semibold">+91</span>
          <input
            className={`${FIELD_INPUT} flex-1`}
            placeholder="Mobile No."
            maxLength={10}
            value={mobile}
            onChange={(e) => onMobileChange(e.target.value.replace(/\D/g, ""))}
          />
        </div>
      </div>

      <div className="mb-3">
        <input
          className={FIELD_INPUT}
          type="email"
          placeholder="Email ID"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
        />
      </div>

      <div className="flex gap-4 mb-3 text-[12.5px] font-semibold text-primary">
        <button onClick={() => setShowAltEmail((v) => !v)}>+ Alternate email</button>
        <button onClick={() => setShowGst((v) => !v)}>+ Add GST</button>
      </div>

      {showAltEmail && (
        <div className="mb-3">
          <input
            className={FIELD_INPUT}
            type="email"
            placeholder="Alternate email"
            value={altEmail}
            onChange={(e) => setAltEmail(e.target.value)}
          />
        </div>
      )}

      {showGst && (
        <div className="mb-3">
          <input
            className={FIELD_INPUT}
            placeholder="GSTIN (not saved yet — see component notes)"
            value={gstin}
            onChange={(e) => setGstin(e.target.value.toUpperCase())}
          />
        </div>
      )}

      <div className="mb-3">
        <input
          className={FIELD_INPUT}
          placeholder="Pickup Location"
          value={pickupLocation}
          onChange={(e) => onPickupLocationChange(e.target.value)}
        />
      </div>
      <div>
        <input
          className={FIELD_INPUT}
          placeholder="Drop Location"
          value={dropLocation}
          onChange={(e) => onDropLocationChange(e.target.value)}
        />
      </div>
    </div>
  );
}