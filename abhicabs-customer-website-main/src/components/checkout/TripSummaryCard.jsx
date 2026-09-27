/**
 * src/components/checkout/TripSummaryCard.jsx
 *
 * Matches the reference layout exactly: a "Review Your Booking" header bar,
 * followed by the trip summary line (route, car type, fuel type, pickup
 * date + included kms). Purely presentational — every field here is data
 * your checkout page already has (journey + selected vehicle details), just
 * restyled to match the reference's compact card look.
 *
 * Usage:
 *   <TripSummaryCard
 *     pickup="Bangalore" drop="Mysore" tripType="Oneway"
 *     carTypeLabel="Wagon R, Swift" fuelType="CNG"
 *     pickupDateLabel="7th September 2026, 12:00 AM"
 *     includedKm={145}
 *   />
 */
export function TripSummaryCard({ pickup, drop, tripType, carTypeLabel, fuelType, pickupDateLabel, includedKm }) {
  return (
    <div className="bg-white border border-border rounded-2xl overflow-hidden">
      <div className="bg-primary text-black px-5 py-3 font-bold text-[15px]">
        Review Your Booking
      </div>
      <div className="p-5">
        <h2 className="text-[19px] font-bold text-text">
          {pickup} → {drop} <span className="text-text-secondary font-normal text-[15px]">({tripType})</span>
        </h2>
        <div className="mt-2 space-y-1 text-[13.5px] text-text-secondary">
          <p><span className="font-semibold text-text">Car Type:</span> {carTypeLabel} <span className="text-text-secondary/70">(or similar)</span></p>
          <p><span className="font-semibold text-text">Fuel Type:</span> {fuelType}</p>
          <p>
            <span className="font-semibold text-text">Pickup Date:</span> {pickupDateLabel}
            {includedKm != null && <> · <span className="font-semibold text-text">Kms included:</span> {includedKm} kms</>}
          </p>
        </div>
      </div>
    </div>
  );
}