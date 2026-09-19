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
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from "./tokens";

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

  // 401 → try one token refresh, then retry the original request once
  if (res.status === 401 && auth && !_retried && getRefreshToken()) {
    try {
      await refreshAccessToken();
      return request(method, path, { body, headers, auth, idempotent, idempotencyKey: explicitIdemKey, params, _retried: true });
    } catch {
      clearTokens();
      throw new ApiError("Session expired — please log in again", { code: "UNAUTHENTICATED", status: 401 });
    }
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