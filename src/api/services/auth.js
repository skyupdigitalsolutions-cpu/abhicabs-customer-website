// Auth service — real backend architecture: Register and Login are two
// genuinely separate flows (confirmed against a fresh backend upload).
//
//   Register: POST /auth/register { name, email, phone } — logs in
//     immediately, NO OTP step at all.
//   Login:    POST /auth/otp/request { phone } — explicitly checks
//     registration status first and refuses with 404 NOT_REGISTERED if
//     the number has no account.
//             POST /auth/otp/verify { phone, code } — only ever logs into
//     an existing account; never creates one.
import { api, ApiError } from "../client";
import { USE_MOCK, MOCK_FALLBACK } from "../config";
import { setTokens, clearTokens } from "../tokens";

function isGenuineNetworkFailure(err) {
  return err instanceof ApiError && (err.status === 0 || err.code === "NETWORK_ERROR");
}

export function hasPlaceholderEmail(email) {
  return !email || email.includes("@placeholder.local");
}

export function isNotRegistered(err) {
  return err instanceof ApiError && err.code === "NOT_REGISTERED";
}

// ── Register ─────────────────────────────────────────────────────────────────
export async function register({ name, email, phone }) {
  if (USE_MOCK) {
    setTokens({ accessToken: "mock-access", refreshToken: "mock-refresh" });
    return { user: { name, email, phone }, mock: true };
  }

  const data = await api.post("/auth/register", { name, email, phone }, { auth: false });
  if (data.accessToken) {
    setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
  }

  // FIX: Call GET /customers/me immediately after registration.
  // The backend's register() only creates a User row — the Customer row
  // (which the admin Customers page reads from) is created lazily by
  // customerService.findOrCreate() inside GET /customers/me.
  // Without this call, new registrants are invisible in the admin dashboard
  // until they open the app. This is a silent best-effort call — if it
  // fails it does not break registration.
  try {
    await api.get("/customers/me");
  } catch {
    // Non-fatal — Customer row creation failed or endpoint unavailable.
    // Registration itself already succeeded.
  }

  return data;
}

// ── Login (existing accounts only) ───────────────────────────────────────────
export async function requestOtp(mobile) {
  if (USE_MOCK) return { sent: true, mock: true };
  try {
    return await api.post("/auth/otp/request", { phone: mobile }, { auth: false });
  } catch (err) {
    if (MOCK_FALLBACK && isGenuineNetworkFailure(err)) return { sent: true, mock: true };
    throw err;
  }
}

export async function verifyOtp(mobile, otp) {
  if (USE_MOCK) {
    setTokens({ accessToken: "mock-access", refreshToken: "mock-refresh" });
    return { user: { mobile }, mock: true };
  }
  try {
    const data = await api.post("/auth/otp/verify", { phone: mobile, code: otp }, { auth: false });
    if (data.accessToken) {
      setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    }

    // Same fix for OTP login — ensure the Customer row exists for returning
    // users who registered before this fix was deployed.
    try {
      await api.get("/customers/me");
    } catch {
      // Non-fatal.
    }

    return data;
  } catch (err) {
    if (MOCK_FALLBACK && isGenuineNetworkFailure(err)) {
      setTokens({ accessToken: "mock-access", refreshToken: "mock-refresh" });
      return { user: { mobile }, mock: true };
    }
    throw err;
  }
}

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
}