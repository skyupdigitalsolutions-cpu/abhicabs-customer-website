// Payments service — Razorpay, driven entirely by the backend.
//
// Backend:
//   POST /payments/orders   { bookingId, purpose: ADVANCE|BALANCE|FULL }
//     → { payment: { id, providerOrderId, amount, currency, status, purpose },
//         reused, provider: "razorpay"|"mock", keyId }
//   GET  /payments/:id      → { payment: { status: CREATED|AUTHORISED|CAPTURED|FAILED, … } }
//   POST /payments/:id/simulate-webhook  (mock provider, non-prod only)
//
// The backend decides the amount (from the booking it froze), creates the
// Razorpay order, and hands back the PUBLIC key id — so there is no Razorpay
// key in the frontend build, and switching test → live is a server env change.
// The payment is confirmed server-side by Razorpay's signed webhook; the site
// only polls for that result. It never marks a payment paid on its own.
import { api } from "../client";
import { USE_MOCK } from "../config";

export const PAYMENT_STATUS = {
  CREATED: "CREATED",
  AUTHORISED: "AUTHORISED",
  CAPTURED: "CAPTURED",
  FAILED: "FAILED",
};

// ── Razorpay Checkout script ──────────────────────────────────────────────────
let checkoutScriptPromise = null;
function loadRazorpayScript() {
  if (typeof window === "undefined") return Promise.reject(new Error("Browser only"));
  if (window.Razorpay) return Promise.resolve();
  if (checkoutScriptPromise) return checkoutScriptPromise;
  checkoutScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      checkoutScriptPromise = null; // allow a retry
      reject(new Error("Could not load the payment window. Check your connection and try again."));
    };
    document.body.appendChild(script);
  });
  return checkoutScriptPromise;
}

function paymentError(message, code) {
  const e = new Error(message);
  e.code = code;
  return e;
}

// ── Create order ──────────────────────────────────────────────────────────────

/**
 * Creates (or reuses the open) backend payment order for a booking.
 * Returns a flat shape the payment page consumes directly.
 */
export async function createPaymentOrder(bookingId, purpose = "FULL") {
  if (USE_MOCK) {
    const id = "order_mock_" + Date.now();
    return { orderId: id, paymentId: id, amount: 0, currency: "INR", status: "CREATED", provider: "mock", keyId: null, reused: false, purpose };
  }
  const data = await api.post("/payments/orders", { bookingId, purpose }, { idempotent: true });
  const payment = data?.payment || {};
  if (!payment.id) throw paymentError("The server didn't return a payment order.", "NO_ORDER");
  return {
    orderId:   payment.providerOrderId || null,   // Razorpay order_id
    paymentId: payment.id,                        // internal id → GET /payments/:id
    amount:    Number(payment.amount),            // rupees, priced by the backend
    currency:  payment.currency || "INR",
    status:    payment.status,
    purpose:   payment.purpose || purpose,
    provider:  data?.provider || "razorpay",
    keyId:     data?.keyId || null,               // Razorpay PUBLIC key from the server
    reused:    Boolean(data?.reused),
  };
}

// ── Checkout ──────────────────────────────────────────────────────────────────

/**
 * Opens Razorpay Checkout for a backend-created order.
 * Resolves with Razorpay's handler payload once the customer completes
 * payment; rejects with code PAYMENT_CANCELLED / PAYMENT_FAILED otherwise.
 */
export function openRazorpayCheckout({ order, name, email, contact, description }) {
  return new Promise((resolve, reject) => {
    if (!order?.keyId) {
      reject(paymentError("Online payment isn't configured on the server yet. Please choose another payment option.", "NO_GATEWAY_KEY"));
      return;
    }
    if (!order?.orderId) {
      reject(paymentError("The payment order is missing its gateway reference. Please try again.", "NO_ORDER"));
      return;
    }
    loadRazorpayScript()
      .then(() => {
        let settled = false;
        const rzp = new window.Razorpay({
          key: order.keyId,
          order_id: order.orderId,
          // Amount/currency are taken from the order by Razorpay; passed for
          // display consistency only.
          amount: Math.round(Number(order.amount || 0) * 100),
          currency: order.currency || "INR",
          name: "ABHI CABS",
          description: description || "Cab booking payment",
          prefill: {
            name: name || undefined,
            email: email || undefined,
            contact: contact || undefined,
          },
          notes: { paymentId: order.paymentId },
          theme: { color: "#FFC107" },
          retry: { enabled: true },
          handler: (resp) => {
            settled = true;
            resolve({
              razorpayPaymentId: resp?.razorpay_payment_id,
              razorpayOrderId: resp?.razorpay_order_id,
              razorpaySignature: resp?.razorpay_signature,
            });
          },
          modal: {
            ondismiss: () => {
              if (!settled) reject(paymentError("Payment was cancelled.", "PAYMENT_CANCELLED"));
            },
          },
        });
        rzp.on("payment.failed", (resp) => {
          // Razorpay keeps the window open for a retry; only record the reason.
          // If the customer then closes it, ondismiss rejects.
          order.lastError = resp?.error?.description || "Payment failed.";
        });
        rzp.open();
      })
      .catch(reject);
  });
}

/**
 * Mock provider only (backend PAYMENT_PROVIDER=mock, non-production): drive a
 * signed "captured" webhook through the backend's real ingest pipeline, so the
 * booking is marked paid exactly as a real Razorpay webhook would.
 */
export async function completeMockPayment(order) {
  if (USE_MOCK) return { changed: true };
  return api.post(`/payments/${order.paymentId}/simulate-webhook`, {
    eventId: `web_${order.paymentId}_${Date.now()}`,
    status: "captured",
  });
}

// ── Status ────────────────────────────────────────────────────────────────────

export async function getPaymentStatus(paymentId) {
  if (USE_MOCK) return { status: PAYMENT_STATUS.CAPTURED };
  const data = await api.get(`/payments/${paymentId}`);
  return data?.payment || data || {};
}

/**
 * Poll until the webhook moves the payment to a terminal state.
 * Returns { success, status, pending }:
 *   success  — CAPTURED
 *   pending  — still CREATED/AUTHORISED when time ran out (webhook is late);
 *              the money may already be taken, so callers must NOT offer to
 *              pay again.
 */
export async function waitForPayment(paymentId, { timeoutMs = 60000, intervalMs = 2000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  let last = null;
  while (Date.now() < deadline) {
    try {
      const p = await getPaymentStatus(paymentId);
      last = p?.status || last;
      if (last === PAYMENT_STATUS.CAPTURED) return { success: true, status: last, pending: false };
      if (last === PAYMENT_STATUS.FAILED) {
        return { success: false, status: last, pending: false, reason: p?.failureReason || null };
      }
    } catch {
      // Transient network error — keep polling until the deadline.
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return { success: false, status: last || "TIMEOUT", pending: true };
}
