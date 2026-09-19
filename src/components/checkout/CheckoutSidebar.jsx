import Button from "../ui/Button";
import { FareBreakupSection } from "./FareBreakupSection";
import { PaymentOptionsCard } from "./PaymentOptionsCard";
import { CouponOffersSection } from "./CouponOffersSection";

/**
 * Complete right-column restructure matching the reference exactly:
 *   [Free cancellation banner]
 *   [Journey card]
 *   [ONE card: Payment Options → Coupon & Offers → PROCEED → Fare Break-up]
 *
 * Real vs honestly-non-functional, for anyone reading this later:
 *   REAL    — Journey, Payment Options (ZERO/PARTIAL/FULL), Fare Break-up
 *             (all backed by data/fields your backend genuinely has)
 *   UI-ONLY — Coupon & Offers (no backend coupon system exists at all;
 *             see CouponOffersSection's own header comment)
 *
 * Props:
 *   journey          { pickup, drop, dateLabel, vehicleName, seats }
 *   quote            real fare quote object from POST /fares/estimate —
 *                    used for quote.breakdown (array) and quote.total
 *   paymentMode      "ZERO" | "PARTIAL" | "FULL" — lifted state
 *   onPaymentModeChange(mode)
 *   totalPayable     the real total to charge
 *   cancellationWindowLabel   e.g. "30 min" — matches your real
 *                    cancellation policy's free-cancel window (confirmed:
 *                    cancellation.service.js defaults CANCEL_FREE_MINUTES
 *                    to 30 unless you've set it to something else — don't
 *                    hardcode "1 hr" here unless you've actually changed
 *                    that env var to 60)
 *   onConfirmPay()   wires to your existing confirm/pay handler
 *   confirming       boolean — disables PROCEED + shows a loading label
 */
export function CheckoutSidebar({
  journey,
  quote,
  paymentMode,
  onPaymentModeChange,
  totalPayable,
  cancellationWindowLabel = "30 min",
  onConfirmPay,
  confirming,
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 bg-[#fffbeb] border border-[#fde68a] text-[#92400e] rounded-xl px-4 py-3 text-[13px] font-semibold">
        <span>🕐</span>
        Free cancellation till {cancellationWindowLabel} of departure
      </div>

      <div className="bg-white border border-border rounded-2xl p-5">
        <h3 className="text-[15px] font-bold mb-3.5">Journey</h3>
        <Row label="Route" value={`${journey.pickup} → ${journey.drop}`} />
        <Row label="Date & Time" value={journey.dateLabel} />
        <Row label="Vehicle" value={journey.vehicleName} />
        <Row label="Seats" value={journey.seats} />
      </div>

      <div className="bg-white border border-border rounded-2xl p-5">
        <PaymentOptionsCard
          totalPayable={totalPayable}
          advancePercent={25}
          paymentMode={paymentMode}
          onChange={onPaymentModeChange}
        />

        <div className="mt-4 pt-4 border-t border-border">
          <CouponOffersSection />
        </div>

        <Button block className="mt-4" onClick={onConfirmPay} disabled={confirming}>
          {confirming ? "Processing…" : "PROCEED"}
        </Button>

        <FareBreakupSection breakdown={quote?.breakdown ?? []} total={quote?.total ?? totalPayable} />
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between text-[13.5px] py-1.5">
      <span className="text-text-secondary">{label}</span>
      <span className="font-medium text-text">{value}</span>
    </div>
  );
}