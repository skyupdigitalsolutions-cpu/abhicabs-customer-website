import { useEffect, useState } from "react";
import { getVehicleByKey, getRentalRates, peekVehicle } from "../api/services/vehicles";
import { toBackendVehicleClass } from "../data/mockData";

/**
 * The backend catalogue vehicle behind the current cab selection.
 *
 * Resolves by the priced `vehicleClass` first (that is what gets booked),
 * then `vehicleId`. Until GET /vehicles answers — or if the class has been
 * retired since it was selected — it falls back to the display fields that
 * were already copied onto the selection from the backend when it was made,
 * so a priced, in-progress booking never drops to "No cab selected".
 */
export default function useSelectedVehicle(selected, { withRate = false } = {}) {
  const key = toBackendVehicleClass(selected?.vehicleClass || selected?.vehicleId) || null;

  const fromSelection =
    selected && (selected.vehicleName || selected.vehicleImg)
      ? {
          id: key || selected.vehicleId,
          key,
          vehicleClass: key,
          name: selected.vehicleName || "Selected vehicle",
          img: selected.vehicleImg || selected.vehicleImgFallback || "",
          imgFallback: selected.vehicleImgFallback || selected.vehicleImg || "",
          seats: selected.vehicleSeats,
          ac: selected.vehicleAc,
          bags: selected.vehicleBags || null,
          category: selected.vehicleCategory || null,
          features: [],
          rate: null,
        }
      : null;

  const [vehicle, setVehicle] = useState(() => (key && peekVehicle(key)) || null);
  const [rate, setRate] = useState(null);

  useEffect(() => {
    if (!key) { setVehicle(null); return; }
    let cancelled = false;
    getVehicleByKey(key)
      .then((v) => { if (!cancelled) setVehicle(v); })
      .catch(() => {});
    if (withRate) {
      getRentalRates()
        .then((m) => { if (!cancelled) setRate(m.get(key) || null); })
        .catch(() => {});
    }
    return () => { cancelled = true; };
  }, [key, withRate]);

  if (vehicle) return { ...vehicle, rate };
  return fromSelection ? { ...fromSelection, rate } : null;
}
