import { useCallback, useEffect, useState } from "react";
import {
  getVehicleCatalogue,
  getRentalRates,
  invalidateVehicleCatalogueCache,
} from "../api/services/vehicles";

/**
 * The live fleet, straight from the backend (GET /vehicles), with each
 * vehicle's real local-package rate card attached from
 * GET /fares/rental-packages. There is no bundled fallback fleet: while the
 * request is in flight `loading` is true, and if it fails `error` is set so
 * the screen can show a proper retry state.
 *
 * Each vehicle gets `rate` = { label, hours, km, packageFare, extraPerKm,
 * extraPerHour } or null when the backend has no package for that class.
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

  const retry = useCallback(() => {
    invalidateVehicleCatalogueCache();
    setNonce((n) => n + 1);
  }, []);

  return { vehicles, loading, error, retry, isLive: !loading && !error };
}
