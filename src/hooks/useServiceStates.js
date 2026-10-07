import { useEffect, useState } from "react";
import {
  ensureServiceStatesLoaded,
  getServiceStateNames,
  joinStateNames,
} from "../api/services/serviceStates";

/**
 * The states we pick up in, live from GET /service-states.
 * Renders with the bundled list first, then swaps in the real one.
 * Returns { states, sentence } — sentence is "A, B and C".
 */
export default function useServiceStates() {
  const [states, setStates] = useState(getServiceStateNames);

  useEffect(() => {
    let cancelled = false;
    ensureServiceStatesLoaded().then((names) => {
      if (!cancelled) setStates(names);
    });
    return () => { cancelled = true; };
  }, []);

  return { states, sentence: joinStateNames(states) };
}
