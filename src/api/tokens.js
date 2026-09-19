// SSR-safe token storage. Vike renders on the server where localStorage
// doesn't exist, so every access is guarded.
import { TOKEN_KEYS } from "./config";

const hasWindow = typeof window !== "undefined";

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
    if (refreshToken) window.localStorage.setItem(TOKEN_KEYS.refresh, refreshToken);
  } catch { /* ignore quota / privacy-mode errors */ }
}

export function clearTokens() {
  if (!hasWindow) return;
  try {
    window.localStorage.removeItem(TOKEN_KEYS.access);
    window.localStorage.removeItem(TOKEN_KEYS.refresh);
  } catch { /* ignore */ }
}

export function isAuthenticated() {
  return !!getAccessToken();
}
