import React, { useState } from "react";

// Vehicle photo for a booking (Booking Confirmed / Booking Details).
//
// Source order: the image saved with the booking (`vehicleImg`, set when the
// booking was made in this browser) → the catalogue photo for its
// `vehicleClass` (needed when the booking is opened from a link or after a
// refresh, where only the server record exists). If a photo URL fails to load
// it falls back to the catalogue's own placeholder, then to the taxi icon.
export default function VehicleHero({ booking, lookupVehicle }) {
  const [failed, setFailed] = useState(0);
  const catalogue = lookupVehicle(booking.vehicleClass || booking.vehicleId);
  const chain = [booking.vehicleImg, catalogue?.img, catalogue?.imgFallback]
    .filter((u, i, a) => u && a.indexOf(u) === i);
  const img = chain[failed];

  if (!img) {
    return (
      <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#FFF7DE,#F7F7F7)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="72" height="72" viewBox="0 0 24 24" fill="none"><path d="M4 16l1.5-5A2 2 0 017.4 9.5h9.2a2 2 0 011.9 1.5L20 16" stroke="#B8860B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><rect x="2.5" y="16" width="19" height="4" rx="1.5" stroke="#B8860B" strokeWidth="1.5" /><circle cx="7" cy="20" r="1.6" fill="#B8860B" /><circle cx="17" cy="20" r="1.6" fill="#B8860B" /><path d="M8 9.5l1-3.5h6l1 3.5" stroke="#B8860B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
    );
  }
  return (
    <img
      key={img}
      className="vehicle-photo"
      src={img}
      alt={booking.vehicle || "Vehicle"}
      onError={() => setFailed((n) => n + 1)}
      style={{ width: "100%", height: "100%", objectFit: "cover" }}
    />
  );
}
