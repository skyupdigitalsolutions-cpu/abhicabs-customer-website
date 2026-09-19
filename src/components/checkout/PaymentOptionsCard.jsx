import { fmtINR } from "../../data/mockData";

/**
 * Visual restructure only — the underlying logic is exactly what checkout
 * already has: the real backend's `paymentMode` field is ZERO/PARTIAL/FULL
 * (confirmed against booking.schemas.js), which maps directly onto "Book at
 * zero" / "Part Pay" / "Full Pay" from the reference design. Nothing new is
 * being invented here, just restyled into the card/radio layout.
 *
 * Usage:
 *   <PaymentOptionsCard
 *     totalPayable={totalPayable}
 *     advancePercent={25}
 *     paymentMode={paymentMode}        // "ZERO" | "PARTIAL" | "FULL"
 *     onChange={setPaymentMode}
 *   />
 */
const OPTIONS = [
  { key: "ZERO", title: "Book at zero", sub: (total) => `Pay ${fmtINR(total)} Later` },
  { key: "PARTIAL", title: "Part Pay", sub: (total, pct) => `Pay ${pct}% now and rest to the driver` },
  { key: "FULL", title: "Full Pay", sub: () => "Full amount" },
];

export function PaymentOptionsCard({ totalPayable, advancePercent = 25, paymentMode, onChange }) {
  const amountFor = (key) => {
    if (key === "ZERO") return 0;
    if (key === "PARTIAL") return Math.round((totalPayable * advancePercent) / 100);
    return totalPayable;
  };

  return (
    <div>
      <p className="text-[15px] font-bold mb-3">Payment Options</p>
      <div className="border border-border rounded-xl overflow-hidden">
        {OPTIONS.map((opt, i) => {
          const selected = paymentMode === opt.key;
          return (
            <button
              key={opt.key}
              onClick={() => onChange(opt.key)}
              className={`w-full flex items-center justify-between px-4 py-3.5 text-left ${i > 0 ? "border-t border-border" : ""} ${selected ? "bg-primary/10" : ""}`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center shrink-0 ${selected ? "border-primary" : "border-[#D1D5DB]"}`}
                >
                  {selected && <span className="w-2 h-2 rounded-full bg-primary" />}
                </span>
                <div>
                  <p className="text-[14px] font-bold text-text">{opt.title}</p>
                  <p className="text-[12px] text-text-secondary">{opt.sub(totalPayable, advancePercent)}</p>
                </div>
              </div>
              <span className="text-[15px] font-bold text-text">{fmtINR(amountFor(opt.key))}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}