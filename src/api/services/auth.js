// Auth service — matches the ACTUAL backend routes:
//
//   Register: POST /auth/register   { name, email, phone }
//             → logs in immediately, no OTP step
//   Login:    POST /auth/otp/request { email }
//             POST /auth/otp/verify  { email, code }

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

// ── Register ──────────────────────────────────────────────────────────────────
// POST /auth/register — { name, email, phone }
// Phone is required by the backend schema.
export async function register({ name, email, phone }) {
  if (USE_MOCK) {
    setTokens({ accessToken: "mock-access", refreshToken: "mock-refresh" });
    return { user: { name, email, phone }, mock: true };
  }

  const data = await api.post(
    "/auth/register",
    { name, email, phone },
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

// ── OTP Login ─────────────────────────────────────────────────────────────────
// POST /auth/otp/request — { email }
export async function requestOtp(email) {
  if (USE_MOCK) return { sent: true, mock: true };
  try {
    return await api.post("/auth/otp/request", { email }, { auth: false });
  } catch (err) {
    if (MOCK_FALLBACK && isGenuineNetworkFailure(err)) return { sent: true, mock: true };
    throw err;
  }
}

// POST /auth/otp/verify — { email, code }
export async function verifyOtp(email, code) {
  if (USE_MOCK) {
    setTokens({ accessToken: "mock-access", refreshToken: "mock-refresh" });
    return { user: { email }, mock: true };
  }
  try {
    const data = await api.post("/auth/otp/verify", { email, code }, { auth: false });
    if (data.accessToken) {
      setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      storeUserName(data.user?.name || data.name || "");
    }
    try { await api.get("/customers/me"); } catch { /* non-fatal */ }
    return data;
  } catch (err) {
    if (MOCK_FALLBACK && isGenuineNetworkFailure(err)) {
      setTokens({ accessToken: "mock-access", refreshToken: "mock-refresh" });
      return { user: { email }, mock: true };
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
