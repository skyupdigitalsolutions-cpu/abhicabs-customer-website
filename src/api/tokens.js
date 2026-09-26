// SSR-safe token storage. Vike renders on the server where localStorage
// doesn't exist, so every access is guarded.
import { TOKEN_KEYS } from "./config";

const hasWindow = typeof window !== "undefined";

// Marks the current access token as belonging to an anonymous GUEST session
// (POST /guest/session) rather than a real logged-in account. Guests get a
// working access token but no refresh token, so the app can browse, quote and
// book without anyone signing in — yet the header still treats them as
// logged-out (see isAuthenticated below).
const GUEST_KEY = "abhicabs_is_guest";

export function getAccessToken() {
  if (!hasWindow) return null;
  try { return window.localStorage.getItem(TOKEN_KEYS.access); }
  catch { return null; }
}

export function getRefreshToken() {
  if (!hasWindow) return null;
  try { return window.localStorage.getItem(TOKEN_KEYS.refresh); }
  catch { return null; }
}

export function setTokens({ accessToken, refreshToken }) {
  if (!hasWindow) return;
  try {
    if (accessToken) window.localStorage.setItem(TOKEN_KEYS.access, accessToken);
    if (refreshToken) {
      window.localStorage.setItem(TOKEN_KEYS.refresh, refreshToken);
      // A real login supersedes any guest session.
      window.localStorage.removeItem(GUEST_KEY);
    }
  } catch { /* ignore quota / privacy-mode errors */ }
}

// Store a guest access token (no refresh token exists for guest sessions).
export function setGuestToken(accessToken) {
  if (!hasWindow || !accessToken) return;
  try {
    window.localStorage.setItem(TOKEN_KEYS.access, accessToken);
    window.localStorage.removeItem(TOKEN_KEYS.refresh);
    window.localStorage.setItem(GUEST_KEY, "1");
  } catch { /* ignore */ }
}

export function isGuestSession() {
  if (!hasWindow) return false;
  try { return window.localStorage.getItem(GUEST_KEY) === "1"; }
  catch { return false; }
}

export function clearTokens() {
  if (!hasWindow) return;
  try {
    window.localStorage.removeItem(TOKEN_KEYS.access);
    window.localStorage.removeItem(TOKEN_KEYS.refresh);
    window.localStorage.removeItem(GUEST_KEY);
  } catch { /* ignore */ }
}

// A guest token is NOT a real login — the header/account UI should still show
// the visitor as logged out even though a guest token is quietly powering
// fares/booking/payment underneath.
export function isAuthenticated() {
  return !!getAccessToken() && !isGuestSession();
}

const USER_NAME_KEY = "abhicabs_user_name";

export function storeUserName(name) {
  if (!hasWindow || !name) return;
  try { window.localStorage.setItem(USER_NAME_KEY, name); } catch { /* ignore */ }
}

export function getStoredUserName() {
  if (!hasWindow) return null;
  try { return window.localStorage.getItem(USER_NAME_KEY); } catch { return null; }
}

export function clearStoredUserName() {
  if (!hasWindow) return;
  try { window.localStorage.removeItem(USER_NAME_KEY); } catch { /* ignore */ }
}
