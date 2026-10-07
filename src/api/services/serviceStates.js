// ─────────────────────────────────────────────────────────────────────────────
// Service states — the states a pickup may start in, loaded LIVE
// ─────────────────────────────────────────────────────────────────────────────
//   GET /service-states (public)  →  { states: ["Karnataka", "Telangana", …] }
//
// Opening a state in the admin panel (Rate Cards → Service States) shows up here
// without a website change. The bundled list below is only the first-paint and
// offline fallback; the backend stays the authority on whether a pickup is
// accepted, and the booking flow keys off its OUTSIDE_SERVICE_STATES error, not
// off this list.
import { api } from "../client";
import { USE_MOCK } from "../config";

export const FALLBACK_SERVICE_STATES = [
  "Karnataka",
  "Telangana",
  "Andhra Pradesh",
  "Maharashtra",
];

let _states = null;
let _promise = null;

export function getServiceStateNames() {
  return _states && _states.length ? _states : FALLBACK_SERVICE_STATES;
}

export function ensureServiceStatesLoaded() {
  if (USE_MOCK) return Promise.resolve(getServiceStateNames());
  if (_states) return Promise.resolve(_states);
  if (_promise) return _promise;

  _promise = (async () => {
    try {
      const data = await api.get("/service-states", { auth: false });
      const rows = Array.isArray(data?.states) ? data.states : Array.isArray(data) ? data : [];
      const names = rows
        .map((r) => (typeof r === "string" ? r : r?.name))
        .map((n) => String(n || "").trim())
        .filter(Boolean);
      if (names.length) _states = names;
    } catch {
      // Keep the bundled list — never block the page on this.
    } finally {
      _promise = null;
    }
    return getServiceStateNames();
  })();

  return _promise;
}

/** "Karnataka, Telangana and Maharashtra" */
export function joinStateNames(names = getServiceStateNames()) {
  if (names.length <= 1) return names[0] || "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}
