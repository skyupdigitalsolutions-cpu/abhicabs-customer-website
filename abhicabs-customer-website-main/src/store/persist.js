// Thin persistence helpers. These are the only place that touches
// localStorage, so swapping in a real backend later means replacing the
// thunks in the slices, not this file.

const isBrowser = typeof window !== "undefined";

export function loadState(key, fallback) {
  if (!isBrowser) return fallback;
  try {
    const raw = localStorage.getItem("abhi_" + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function saveState(key, value) {
  if (!isBrowser) return;
  try {
    localStorage.setItem("abhi_" + key, JSON.stringify(value));
  } catch {
    /* storage full or unavailable — fail silently in this demo */
  }
}
