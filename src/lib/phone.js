/**
 * Indian mobile number -- ONE rule, used by every form and by the API.
 *
 * Accepted (all mean the same number): 9876543210, 98765 43210, 98765-43210,
 * (98765) 43210, +91 98765 43210, 919876543210, 09876543210, 0091 98765 43210.
 *
 * Rejected: anything that is not letters-free, does not reduce to EXACTLY ten
 * digits after removing one country/trunk prefix, or does not start with 6-9.
 *
 * The old shortcut everywhere was "strip non-digits and keep the LAST 10". That
 * silently turns a typo into a different, valid-looking number: 98765432101
 * (one digit too many) became 8765432101, and "abc9876543210" passed.
 */
export function parseIndianMobile(raw) {
  const s = String(raw == null ? '' : raw).trim();
  if (!s) return null;
  // Digits, spaces, dashes, dots, brackets; a single leading "+" only.
  if (!/^\+?[\d\s\-().]+$/.test(s)) return null;
  let d = s.replace(/\D/g, '');
  if (d.length === 14 && d.startsWith('0091')) d = d.slice(4);
  else if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  else if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d) ? d : null;
}

/** True when `raw` is a valid Indian mobile number in any accepted spelling. */
export function isIndianMobile(raw) {
  return parseIndianMobile(raw) !== null;
}

/**
 * For a text box's onChange: keeps digits only, drops a pasted +91 / 91 / 0
 * prefix, and stops at ten digits, so pasting "+91 98765 43210" gives
 * "9876543210" while typing is simply limited to ten digits.
 */
export function cleanPhoneInput(raw) {
  let d = String(raw == null ? '' : raw).replace(/\D/g, '');
  if (d.length === 14 && d.startsWith('0091')) d = d.slice(4);
  else if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  else if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  return d.slice(0, 10);
}
