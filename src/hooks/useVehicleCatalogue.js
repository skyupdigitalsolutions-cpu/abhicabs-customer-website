import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getVehicleCatalogue,
  getRentalRates,
  invalidateVehicleCatalogueCache,
} from "../api/services/vehicles";

/**
 * Group vehicles by `groupKey` for fuel-variant toggling.
 *
 * Two catalogue rows sharing a groupKey (e.g. swift-dzire and swift-dzire-cng)
 * become ONE entry in the returned list, with a `variants` array the UI can
 * render as a Petrol/CNG toggle. A standalone class (groupKey === its own key,
 * variantLabel is null) is a group of one — `variants` is a single-element
 * array and no toggle is drawn.
 *
 * The "default" variant (the one whose card shows before the rider taps the
 * toggle) is the member with the lowest sortOrder, which is what the backend's
 * migration sets: Petrol at sortOrder 10, CNG at sortOrder 11.
 */
function groupVariants(flatList) {
  const groups = new Map();
  for (const v of flatList) {
    const gk = v.groupKey || v.key;
    if (!groups.has(gk)) groups.set(gk, []);
    groups.get(gk).push(v);
  }

  const result = [];
  for (const [, members] of groups) {
    // Sort by sortOrder so the default (lowest) is first.
    members.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    const lead = members[0];
    // If only one member OR no variantLabel, it's a standalone vehicle.
    const hasVariants = members.length > 1 && members.some((m) => m.variantLabel);
    result.push({
      ...lead,
      variants: hasVariants ? members : null,
    });
  }

  // Preserve the overall sort order from the original list.
  result.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  return result;
}

/**
 * The live fleet, straight from the backend (GET /vehicles), with each
 * vehicle's real local-package rate card attached from
 * GET /fares/rental-packages. There is no bundled fallback fleet: while the
 * request is in flight `loading` is true, and if it fails `error` is set so
 * the screen can show a proper retry state.
 *
 * Each vehicle gets `rate` = { label, hours, km, packageFare, extraPerKm,
 * extraPerHour } or null when the backend has no package for that class.
 *
 * `vehicles` is the FLAT list (every variant is its own entry).
 * `grouped` is the GROUPED list (variants merged into one entry with a
 * `variants` array for the fuel toggle).
 */
export default function useVehicleCatalogue({ withRates = true } = {}) {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const list = await getVehicleCatalogue();
        if (cancelled) return;
        setVehicles(list.map((v) => ({ ...v, rate: null })));
        setLoading(false);

        if (withRates && list.length) {
          const rates = await getRentalRates();
          if (cancelled) return;
          setVehicles(list.map((v) => ({ ...v, rate: rates.get(v.key) || null })));
        }
      } catch (err) {
        if (cancelled) return;
        setError(err?.message || "Couldn't load vehicles.");
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [nonce, withRates]);

  const grouped = useMemo(() => groupVariants(vehicles), [vehicles]);

  const retry = useCallback(() => {
    invalidateVehicleCatalogueCache();
    setNonce((n) => n + 1);
  }, []);

  return { vehicles, grouped, loading, error, retry, isLive: !loading && !error };
}
