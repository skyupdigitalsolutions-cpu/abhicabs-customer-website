// Tiny event bus for "sign in without leaving this page".
//
// Checkout used to send a guest to /login, which then dropped them on
// My Bookings — their trip, vehicle and half-typed details left behind.
// Now any page can ask the global LoginPopup (mounted in Layout) to open in
// place, and listen for AUTH_CHANGED to refresh itself once the user is in.
export const OPEN_LOGIN = "abhicabs:open-login";
export const AUTH_CHANGED = "abhicabs:auth-changed";
const RETURN_KEY = "abhicabs_login_return";

/** Open the sign-in popup over the current page (no navigation, no reload). */
export function openLogin(opts = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_LOGIN, { detail: { stayOnPage: true, ...opts } }));
}

/** Tell the page (header, checkout…) that the user just signed in. */
export function notifyAuthChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(AUTH_CHANGED));
}

/** Remember where to come back to if the full /login page is used instead. */
export function rememberReturnTo(path) {
  if (typeof window === "undefined") return;
  const target = path || window.location.pathname + window.location.search;
  if (target.startsWith("/login")) return;
  try { sessionStorage.setItem(RETURN_KEY, target); } catch { /* ignore */ }
}

/**
 * onClick for a "Sign in" <a href="/login">: a plain click opens the popup in
 * place; a modified click (new tab/window) still goes to /login, but comes
 * back here afterwards.
 */
export function signInClick(e) {
  rememberReturnTo();
  if (e && (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0)) return;
  e?.preventDefault();
  openLogin();
}
