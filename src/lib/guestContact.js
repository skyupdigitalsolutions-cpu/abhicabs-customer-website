// The backend invents an email for every website guest checkout
// (guest-<uuid>@guest.invalid). It exists only to satisfy a NOT NULL column on
// a throwaway account: it can never receive mail, and it is not the customer's
// address. The name / phone / email the customer actually typed are stored on
// the booking (guestName / guestPhone / guestEmail).
//
// Older accounts may also carry a fabricated @placeholder.local address. Neither
// kind should ever be shown to a customer as "their email".

const GENERATED = /@(guest\.invalid|placeholder\.local)$/i;
const GUEST_ACCOUNT = /@guest\.invalid$/i;

/** True for an address the system made up rather than one a person typed. */
export function isGeneratedEmail(email) {
  return GENERATED.test(String(email || "").trim());
}

/** True when this email marks a throwaway guest-checkout account. */
export function isGuestAccountEmail(email) {
  return GUEST_ACCOUNT.test(String(email || "").trim());
}

/** The email, or "" if it is a generated one. */
export function realEmailOrEmpty(email) {
  return email && !isGeneratedEmail(email) ? String(email).trim() : "";
}
