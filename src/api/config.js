/**
 * src/api/config.js
 *
 * ROOT CAUSE FIX — three bugs that caused the customer website to never
 * actually talk to the backend:
 *
 * BUG 1: bare `import.meta.env` object assignment
 *   Old:  const env = (typeof import.meta !== "undefined" && import.meta.env) || {};
 *   Vike's SSR renderer replaces bare `import.meta.env` with `null` at the
 *   module level. So env = {} on the server, and every env var read from
 *   env.VITE_* returns undefined.
 *   Fix:  Access each variable individually with import.meta.env.VITE_*
 *   Vite/Vike can statically inline each specific property access.
 *
 * BUG 2: MOCK_FALLBACK evaluated to TRUE when env var was undefined
 *   Old:  String(env.VITE_MOCK_FALLBACK).toLowerCase() !== "false"
 *         String(undefined) = "undefined" → "undefined" !== "false" → TRUE
 *   Your .env says VITE_MOCK_FALLBACK=false but the runtime value was always
 *   TRUE. This meant EVERY failed API call silently returned mock data instead
 *   of an error — auth, booking, fares, payments — all falling back to fake
 *   data invisibly. The UI appeared to "work" but nothing ever reached the
 *   backend database.
 *   Fix:  Default to "false" (not "true") when env var is missing.
 *
 * BUG 3: USE_MOCK also affected by the same undefined evaluation
 *   String(undefined) = "undefined" → "undefined" === "true" → FALSE (accidentally OK)
 *   Fixed to be explicit either way.
 */

function safeEnv(key, fallback) {
  try {
    switch (key) {
      case 'VITE_API_BASE_URL':    return import.meta.env.VITE_API_BASE_URL    ?? fallback;
      case 'VITE_USE_MOCK':        return import.meta.env.VITE_USE_MOCK        ?? fallback;
      case 'VITE_MOCK_FALLBACK':   return import.meta.env.VITE_MOCK_FALLBACK   ?? fallback;
      case 'VITE_RAZORPAY_KEY_ID': return import.meta.env.VITE_RAZORPAY_KEY_ID ?? fallback;
      case 'VITE_GOOGLE_MAPS_API_KEY': return import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? fallback;
      default:                     return fallback;
    }
  } catch {
    return fallback;
  }
}

// Backend base URL
export const API_BASE_URL =
  safeEnv('VITE_API_BASE_URL', 'http://localhost:4000/api/v1');

// Master switch: true = skip backend entirely, use mock data
export const USE_MOCK =
  String(safeEnv('VITE_USE_MOCK', 'false')).toLowerCase() === 'true';

// Fallback switch: true = silently return mock data on network errors
// BUG FIX: default is now 'false' not 'true'
// Old behaviour: undefined env var → MOCK_FALLBACK = true (masked ALL errors)
// New behaviour: undefined env var → MOCK_FALLBACK = false (shows real errors)
export const MOCK_FALLBACK =
  String(safeEnv('VITE_MOCK_FALLBACK', 'false')).toLowerCase() === 'true';

// Auth token localStorage keys
export const TOKEN_KEYS = {
  access:  'abhicabs_access_token',
  refresh: 'abhicabs_refresh_token',
};

// Request timeout (ms)
export const REQUEST_TIMEOUT = 15000;

// Razorpay public key
export const RAZORPAY_KEY_ID = safeEnv('VITE_RAZORPAY_KEY_ID', '');

// Google Maps JavaScript API key — powers the real embedded map on the Live
// Tracking page. Leave blank and the page shows a clear message instead of a
// broken map (no silent fallback to a placeholder image).
export const GOOGLE_MAPS_API_KEY = safeEnv('VITE_GOOGLE_MAPS_API_KEY', '');