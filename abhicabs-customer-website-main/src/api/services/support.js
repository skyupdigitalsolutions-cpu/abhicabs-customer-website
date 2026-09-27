// Support / Contact Us service
//
// FIX: The Contact page (`pages/contact/+Page.jsx`) imports `createSupportTicket`
// from this file, but this file never existed — so every "Send Message" click
// threw a module-not-found error and nothing was ever submitted anywhere.
//
// The backend does NOT have a "support tickets" system. It has the existing
// public Contact form endpoint:
//   POST /api/v1/contact  { name, mobile, email, topic, message }
//   -> creates a `Contact` row (prisma model `Contact`, status NEW)
//   -> visible to staff at GET /api/v1/admin/contacts (Admin -> Support)
//
// No new backend route, controller, service, or model is created here —
// this file only calls the endpoint that already exists.
import { api } from "../client";

/**
 * Submit the website Contact Us form to the existing backend contact inbox.
 * Field names match the backend's createContactSchema exactly:
 *   name, mobile, email, topic, message (all required by the backend).
 *
 * @param {{ name: string, phone: string, email: string, topic: string, message: string }} fields
 * @returns {Promise<{ id: string, createdAt: string }>}
 */
export async function createSupportTicket({ name, phone, email, topic, message }) {
  const data = await api.post(
    "/contact",
    { name, mobile: phone, email, topic, message },
    { auth: false } // public endpoint — no login required to contact support
  );
  return data; // { id, createdAt }
}
