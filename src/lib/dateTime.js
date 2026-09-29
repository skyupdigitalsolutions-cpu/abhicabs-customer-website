// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for how dates and times are shown across the site.
// ─────────────────────────────────────────────────────────────────────────────
// Storage format never changes:
//   date  → "YYYY-MM-DD"  (local calendar date, what the API layer expects)
//   time  → "HH:mm"       (24-hour, what the API layer expects)
// Only what the customer READS goes through these helpers:
//   date  → "30 Sep 2026"
//   time  → "2:30 PM"
//   both  → "30 Sep 2026, 2:30 PM"
//
// Month names are hard-coded (not Intl) so every browser prints exactly the
// same text — en-IN spells September "Sept" in some ICU versions and "Sep" in
// others, which is the kind of drift this file exists to prevent.
//
// Nothing here throws. A value that can't be parsed is returned as-is (or the
// fallback), so a screen never goes blank because of an unexpected shape.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const HHMM_RE = /^(\d{1,2}):(\d{2})(?::\d{2})?$/;

// Local calendar date. toISOString() would give the UTC date, which is
// "yesterday" in India between 00:00 and 05:30.
export function toISODate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// "YYYY-MM-DD" → local Date (midnight), or null.
export function fromISODate(s) {
  if (!s) return null;
  const [y, mo, d] = String(s).split("-").map(Number);
  return y ? new Date(y, mo - 1, d) : null;
}

// Accepts a Date, "YYYY-MM-DD", or a full ISO timestamp. Returns a Date or null.
export function parseDate(value) {
  if (value == null || value === "") return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const str = String(value).trim();
  const m = ISO_DATE_RE.exec(str);
  if (m) {
    // Build in local time — new Date("2026-09-30") is parsed as UTC.
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  const d = new Date(str);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * formatDate("2026-09-30")                      → "30 Sep 2026"
 * formatDate("2026-09-30", { weekday: true })   → "Wed, 30 Sep 2026"
 * formatDate(d, { year: "auto" })               → "30 Sep" when d is this year
 */
export function formatDate(value, { weekday = false, year = true, fallback = "" } = {}) {
  if (value == null || value === "") return fallback;
  const d = parseDate(value);
  if (!d) return String(value);
  const showYear = year === "auto" ? d.getFullYear() !== new Date().getFullYear() : !!year;
  const core = `${d.getDate()} ${MONTHS[d.getMonth()]}${showYear ? ` ${d.getFullYear()}` : ""}`;
  return weekday ? `${WEEKDAYS_SHORT[d.getDay()]}, ${core}` : core;
}

/**
 * formatTime("14:30")                 → "2:30 PM"
 * formatTime(new Date(...))           → "2:30 PM"
 * formatTime("2026-09-30T09:00:00Z")  → "2:30 PM" (local)
 */
export function formatTime(value, { fallback = "" } = {}) {
  if (value == null || value === "") return fallback;
  let hh;
  let mm;
  const hm = typeof value === "string" ? HHMM_RE.exec(value.trim()) : null;
  if (hm) {
    hh = Number(hm[1]);
    mm = Number(hm[2]);
  } else {
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    hh = d.getHours();
    mm = d.getMinutes();
  }
  if (Number.isNaN(hh) || Number.isNaN(mm)) return String(value);
  return `${hh % 12 || 12}:${String(mm).padStart(2, "0")} ${hh < 12 ? "AM" : "PM"}`;
}

/**
 * formatDateTime("2026-09-30", "14:30")      → "30 Sep 2026, 2:30 PM"
 * formatDateTime("2026-09-30T09:00:00Z")     → local date + time
 * Either part may be missing; whatever exists is shown.
 */
export function formatDateTime(dateValue, timeValue, opts = {}) {
  const fallback = opts.fallback ?? "";
  // Single full timestamp / Date given.
  if (timeValue === undefined && dateValue != null && dateValue !== "" && !ISO_DATE_RE.test(String(dateValue))) {
    const d = parseDate(dateValue);
    if (!d) return String(dateValue);
    return `${formatDate(d, opts)}, ${formatTime(d)}`;
  }
  const dPart = formatDate(dateValue, opts);
  const tPart = formatTime(timeValue);
  return [dPart, tPart].filter(Boolean).join(", ") || fallback;
}
