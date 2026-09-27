// Auth service — matches the ACTUAL backend routes:
//
//   Register: POST /auth/register    { name, email, phone }
//             → logs in immediately, no OTP step
//   Login:    POST /auth/otp/request { phone }   (mobile number based)
//             POST /auth/otp/verify  { phone, code }
//
// The backend resolves the account by the LAST 10 DIGITS of the phone, so any
// spelling ("+91 98765 43210", "09876543210", "9876543210") maps to the same
// account. We still normalise to 10 digits here before sending, to keep the
// request body clean and the masked-number UI accurate.

import { api, ApiError } from "../client";
import { USE_MOCK, MOCK_FALLBACK } from "../config";
import { setTokens, clearTokens, storeUserName, clearStoredUserName } from "../tokens";

function isGenuineNetworkFailure(err) {
  return err instanceof ApiError && (err.status === 0 || err.code === "NETWORK_ERROR");
}

export function hasPlaceholderEmail(email) {
  return !email || email.includes("@placeholder.local");
}

export function isNotRegistered(err) {
  return err instanceof ApiError && err.code === "NOT_REGISTERED";
}

// Keep only the last 10 digits — matches the backend's indianPhone normaliser.
export function normalisePhone(phone) {
  return String(phone || "").replace(/\D/g, "").slice(-10);
}

// ── Register ──────────────────────────────────────────────────────────────────
// POST /auth/register — { name, email, phone }
// Phone is required by the backend schema. Returns tokens (auto-login).
export async function register({ name, email, phone }) {
  const mobile = normalisePhone(phone);
  if (USE_MOCK) {
    setTokens({ accessToken: "mock-access", refreshToken: "mock-refresh" });
    return { user: { name, email, phone: mobile }, mock: true };
  }

  // Only send an email when the customer actually gave one. A fabricated
  // placeholder address lands in the CRM as if it were real contact detail,
  // and anything mailed to it bounces silently.
  const body = { name, phone: mobile };
  const cleanEmail = String(email || "").trim();
  if (cleanEmail) body.email = cleanEmail;

  const data = await api.post(
    "/auth/register",
    body,
    { auth: false }
  );
  if (data.accessToken) {
    setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    storeUserName(name);
  }

  // Ensure Customer row exists (created lazily by /customers/me).
  try { await api.get("/customers/me"); } catch { /* non-fatal */ }

  return data;
}

// ── OTP Login (mobile number based) ─────────────────────────────────────────────
// POST /auth/otp/request — { phone }
export async function requestOtp(phone) {
  const mobile = normalisePhone(phone);
  if (USE_MOCK) return { sent: true, mock: true };
  try {
    return await api.post("/auth/otp/request", { phone: mobile }, { auth: false });
  } catch (err) {
    if (MOCK_FALLBACK && isGenuineNetworkFailure(err)) return { sent: true, mock: true };
    throw err;
  }
}

// POST /auth/otp/verify — { phone, code }
export async function verifyOtp(phone, code) {
  const mobile = normalisePhone(phone);
  if (USE_MOCK) {
    setTokens({ accessToken: "mock-access", refreshToken: "mock-refresh" });
    return { user: { phone: mobile }, mock: true };
  }
  try {
    const data = await api.post("/auth/otp/verify", { phone: mobile, code }, { auth: false });
    if (data.accessToken) {
      setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      storeUserName(data.user?.name || data.name || "");
    }
    try { await api.get("/customers/me"); } catch { /* non-fatal */ }
    return data;
  } catch (err) {
    if (MOCK_FALLBACK && isGenuineNetworkFailure(err)) {
      setTokens({ accessToken: "mock-access", refreshToken: "mock-refresh" });
      return { user: { phone: mobile }, mock: true };
    }
    throw err;
  }
}

// ── Shared ────────────────────────────────────────────────────────────────────
export async function updateProfile(fields) {
  if (USE_MOCK) return { ...fields, mock: true };
  try {
    return await api.patch("/users/profile", fields);
  } catch (err) {
    if (MOCK_FALLBACK && isGenuineNetworkFailure(err)) return { ...fields, mock: true };
    throw err;
  }
}

export async function getMe() {
  if (USE_MOCK) return null;
  return api.get("/auth/me");
}

export async function logout() {
  if (!USE_MOCK) {
    try { await api.post("/auth/logout", {}); } catch { /* ignore */ }
  }
  clearTokens();
  clearStoredUserName();
}
