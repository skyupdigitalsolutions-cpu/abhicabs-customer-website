// ─────────────────────────────────────────────────────────────────────────────
// Core HTTP client for the ABHI CABS backend
// ─────────────────────────────────────────────────────────────────────────────
// Handles:
//   • Bearer JWT auth (Authorization header)
//   • Automatic access-token refresh on 401 (single-use rotating refresh token)
//   • Idempotency-Key header for create actions
//   • Standard response envelope: { success, data } | { success, error }
//   • Request timeout
// ─────────────────────────────────────────────────────────────────────────────

import { API_BASE_URL, REQUEST_TIMEOUT } from "./config";
import { getAccessToken, getRefreshToken, setTokens, setGuestToken, clearTokens } from "./tokens";

// Thrown for any non-successful API response. Carries the backend error object.
export class ApiError extends Error {
  constructor(message, { code, status, fields } = {}) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.fields = fields;
  }
}

// Generate a UUID-ish idempotency key (crypto when available)
function idempotencyKey() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "idem-" + Date.now() + "-" + Math.random().toString(36).slice(2, 10);
}

// Prevent multiple simultaneous refreshes — share one in-flight refresh promise.
let refreshPromise = null;

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new ApiError("Not authenticated", { code: "NO_REFRESH_TOKEN", status: 401 });

  // Reuse an in-flight refresh if one is already running
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        clearTokens();
        throw new ApiError("Session expired", { code: "REFRESH_FAILED", status: 401 });
      }
      // Refresh tokens are single-use — store the rotated pair
      setTokens({
        accessToken: json.data.accessToken,
        refreshToken: json.data.refreshToken
      });
      return json.data.accessToken;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// ─────────────────────────────────────────────────────────────────────────────
// Guest sessions — LOGIN IS NOT MANDATORY.
// A visitor who hasn't signed in still needs a bearer token, because /fares,
// /bookings and /payments all require auth. POST /guest/session (public) mints
// a short-lived USER token with no signup and no OTP, so browsing, quoting,
// booking and paying all work anonymously. Contact details (name/phone) are
// collected on the booking form and sent as guestName/guestPhone at booking
// time — never demanded up front.
// Guest tokens are short-lived and have no refresh token, so on expiry we just
// mint a fresh one and retry (see the 401 handler below).
// ─────────────────────────────────────────────────────────────────────────────
let guestPromise = null;

async function ensureGuestSession(force = false) {
  if (!force && getAccessToken()) return getAccessToken();
  if (guestPromise) return guestPromise;

  guestPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/guest/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json().catch(() => ({}));
      const token = json?.data?.accessToken;
      if (!res.ok || !json.success || !token) {
        throw new ApiError("Could not start a guest session", {
          code: "GUEST_SESSION_FAILED", status: res.status || 0,
        });
      }
      setGuestToken(token);
      return token;
    } finally {
      guestPromise = null;
    }
  })();

  return guestPromise;
}

// Build a query string from a plain object, skipping null/undefined/"" values.
// FIX: api.get(path, { params }) used to silently drop `params` entirely —
// `request()` never read it, so no query string was ever appended. This broke
// pagination (e.g. My Booking's listMyBookings({ page, limit })) without
// throwing any error; every request just returned page 1 of everything.
function buildQueryString(params) {
  if (!params) return "";
  const usable = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "");
  if (!usable.length) return "";
  const qs = new URLSearchParams();
  for (const [k, v] of usable) qs.append(k, v);
  return `?${qs.toString()}`;
}

// Core request function
async function request(method, path, { body, headers = {}, auth = true, idempotent = false, idempotencyKey: explicitIdemKey, params, _retried = false } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  const reqHeaders = { Accept: "application/json", ...headers };
  if (body !== undefined) reqHeaders["Content-Type"] = "application/json";
  if (idempotent) reqHeaders["Idempotency-Key"] = explicitIdemKey || idempotencyKey();

  // Login is NOT mandatory: if this call needs auth and there is no token yet,
  // transparently start a guest session so fares/booking/payment all work for
  // an anonymous visitor. auth:false calls (register, otp, guest/session,
  // public catalogue, draft tracking) skip this entirely.
  if (auth && !getAccessToken()) {
    try { await ensureGuestSession(); } catch { /* fall through; request may still 401 and recover below */ }
  }

  const token = auth ? getAccessToken() : null;
  if (token) reqHeaders["Authorization"] = `Bearer ${token}`;

  const fullPath = `${path}${buildQueryString(params)}`;

  let res;
  try {
    res = await fetch(`${API_BASE_URL}${fullPath}`, {
      method,
      headers: reqHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });
  } catch (err) {
    clearTimeout(timer);
    // Network error / backend unreachable / timeout — bubble up so callers can fall back to mock
    throw new ApiError(
      err.name === "AbortError" ? "Request timed out" : "Cannot reach the server",
      { code: "NETWORK_ERROR", status: 0 }
    );
  }
  clearTimeout(timer);

  // 401 → recover ONCE, then retry the original request.
  //   • Logged-in user (has a refresh token): rotate the access token.
  //   • Guest / no session (or refresh fails): mint a fresh guest token.
  // Either way the visitor is never bounced to a login wall mid-flow.
  if (res.status === 401 && auth && !_retried) {
    try {
      if (getRefreshToken()) {
        await refreshAccessToken();
      } else {
        await ensureGuestSession(true);
      }
    } catch {
      // A real refresh failed — don't dead-end; continue as a guest.
      clearTokens();
      try {
        await ensureGuestSession(true);
      } catch {
        throw new ApiError("Could not start a session", { code: "SESSION_FAILED", status: 401 });
      }
    }
    return request(method, path, { body, headers, auth, idempotent, idempotencyKey: explicitIdemKey, params, _retried: true });
  }

  const json = await res.json().catch(() => ({}));

  if (!res.ok || json.success === false) {
    const e = json.error || {};
    throw new ApiError(e.message || `Request failed (${res.status})`, {
      code: e.code, status: res.status, fields: e.fields
    });
  }

  // Unwrap the { success, data } envelope — return data directly
  return json.data !== undefined ? json.data : json;
}

// Public verbs
export const api = {
  get:   (path, opts)       => request("GET", path, opts),
  post:  (path, body, opts) => request("POST", path, { ...opts, body }),
  put:   (path, body, opts) => request("PUT", path, { ...opts, body }),
  patch: (path, body, opts) => request("PATCH", path, { ...opts, body }),
  del:   (path, opts)       => request("DELETE", path, opts)
};