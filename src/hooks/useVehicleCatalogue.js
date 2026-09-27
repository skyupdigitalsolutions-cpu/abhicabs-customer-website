import { useEffect, useState } from "react";
import { getVehicleCatalogue } from "../api/services/vehicles";
import { VEHICLE_RATES, localVehicleForKey } from "../data/mockData";

/**
 * The live fleet, straight from GET /vehicles (public, no auth).
 *
 * This is the admin-managed vehicle_catalog: one ACTIVE row per real car, and
 * its `key` is the same value fare_configs prices against. Showing anything
 * else means offering cars the backend will not quote — which is exactly what
 * the bundled VEHICLE_RATES list was doing, including sizes that had been
 * retired on the backend.
 *
 * The bundled list survives only as (a) cosmetics the catalogue doesn't carry
 * — feature bullets, per-km display rates — and (b) a first-render fallback
 * so the page is never blank while the fetch is in flight.
 */
export default function useVehicleCatalogue() {
  const [vehicles, setVehicles] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getVehicleCatalogue()
      .then((rows) => {
        if (cancelled || !Array.isArray(rows) || !rows.length) return;
        setVehicles(
          rows
            .filter((r) => r && r.isActive !== false)
            .map((r) => {
              const local = localVehicleForKey(r.key);
              return {
                id: r.key,
                vehicleClass: r.key,
                name: r.name,
                seats: r.seats,
                bags: r.luggage || local?.bags,
                ac: local?.ac ?? true,
                img: r.heroUrl || local?.img,
                imgFallback: local?.img,
                gallery: (r.images || []).map((i) => i.url).filter(Boolean),
                tagline: r.blurb || local?.tagline,
                detail: r.detail,
                features: local?.features,
                category: local?.category,
                local: local?.local,
                outstation: local?.outstation,
                rating: r.rating ?? null,
              };
            })
        );
      })
      .catch(() => { /* keep the bundled fallback */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Never blank: bundled list until the real one lands.
  return { vehicles: vehicles || VEHICLE_RATES, isLive: Boolean(vehicles), loading };
}
