/**
 * src/api/config.js
 * Each variable accessed individually so Vike/Vite can statically inline them.
 */

const PROD_API_BASE = 'https://abhicabsbackend-production.up.railway.app/api/v1';

// Decide which backend the app talks to, with one firm rule that keeps the
// deployed site permanently connected:
//
//   If the app is NOT being served from localhost, it must use the hosted
//   backend — never a localhost URL — regardless of build flags or a stray
//   VITE_API_BASE_URL baked in at build time.
//
// This is what prevents the "Cannot reach the server" error from recurring:
// a deployed build can accidentally inline a dev value (Vike/Vite inlines
// import.meta.env at build time), which would point every request at the
// visitor's own machine (nothing listening there, and http-on-https is blocked
// as mixed content). By deciding from the actual runtime host, the live site is
// always wired to the real backend. Only a genuine localhost page keeps the
// configured dev URL, and a non-localhost custom API URL is still honoured so
// you can still point at a different backend via env when you mean to.
function resolveApiBase() {
  const configured = import.meta.env.VITE_API_BASE_URL ?? PROD_API_BASE;
  const pointsAtLocalhost = /\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:|\/|$)/i.test(configured);

  // Runtime guard (browser) — the decisive one for the live site.
  if (typeof window !== 'undefined' && window.location) {
    const host = window.location.hostname || '';
    const servedLocally =
      host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host.endsWith('.local');
    if (!servedLocally) return pointsAtLocalhost ? PROD_API_BASE : configured;
    return configured; // genuine local development
  }

  // Build-time guard (SSR / non-browser) — a production build must not ship a
  // localhost base.
  if (import.meta.env.PROD && pointsAtLocalhost) return PROD_API_BASE;
  return configured;
}

export const API_BASE_URL = resolveApiBase();

export const USE_MOCK =
  String(import.meta.env.VITE_USE_MOCK ?? 'false').toLowerCase() === 'true';

export const MOCK_FALLBACK =
  String(import.meta.env.VITE_MOCK_FALLBACK ?? 'false').toLowerCase() === 'true';

export const TOKEN_KEYS = {
  access:  'abhicabs_access_token',
  refresh: 'abhicabs_refresh_token',
};

export const REQUEST_TIMEOUT = 15000;

export const GOOGLE_MAPS_API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '';