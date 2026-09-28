import { useEffect, useState, useCallback } from "react";
import { getVehicleCatalogue, normaliseKey } from "../api/services/vehicles";
import { toBackendVehicleClass } from "../data/mockData";

/**
 * Returns lookup(keyOrId) → backend catalogue vehicle | null. Re-renders the
 * caller once GET /vehicles has loaded, so booking lists/receipts pick up the
 * real vehicle name and photo for a stored vehicleClass.
 */
export default function useVehicleLookup() {
  const [list, setList] = useState([]);
  useEffect(() => {
    let cancelled = false;
    getVehicleCatalogue()
      .then((rows) => { if (!cancelled) setList(rows || []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);
  return useCallback((key) => {
    const k = normaliseKey(toBackendVehicleClass(key) || key);
    return k ? list.find((v) => v.key === k) || null : null;
  }, [list]);
}
