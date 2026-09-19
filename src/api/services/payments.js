// Payments service
import { api } from "../client";
import { USE_MOCK, MOCK_FALLBACK, RAZORPAY_KEY_ID } from "../config";

// ── Mock ─────────────────────────────────────────────────────────────────────
function mockOrder(bookingId, purpose) {
  return { orderId: "order_mock_" + Date.now(), bookingId, purpose, status: "CREATED" };
}
async function mockPoll() {
  await new Promise((r) => setTimeout(r, 1200));
  // 94% success rate to mirror the old mock behaviour
  return { status: Math.random() < 0.94 ? "CAPTURED" : "FAILED" };
}

// ── Razorpay Checkout.js — loads once, cached ───────────────────────────────
// This is the actual customer-facing payment popup (card/UPI/wallet entry).
// Creating an order on the backend only reserves the amount with the
// gateway — nothing is ever actually charged until the customer completes
// this widget. The real payment status is confirmed server-side by the
// backend's webhook handler; the `handler` callback below just tells us the
// customer finished the popup so we can start polling for that confirmation.
let checkoutScriptPromise = null;
function loadRazorpayScript() {
  if (typeof window === "undefined") return Promise.reject(new Error("Razorpay Checkout can only run in the browser"));
  if (window.Razorpay) return Promise.resolve();
  if (checkoutScriptPromise) return checkoutScriptPromise;
  checkoutScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load the payment widget. Check your connection and try again."));
    document.body.appendChild(script);
  });
  return checkoutScriptPromise;
}

/**
 * Opens the real Razorpay Checkout popup for a previously created order.
 * Resolves when the customer completes the widget (payment attempted —
 * final confirmation is still via webhook, checked by waitForPayment()).
 * Rejects if the customer closes the popup without paying, or if the
 * widget itself can't load (no key configured, network issue, etc).
 */
export function openRazorpayCheckout({ order, amount, name, email, contact, description }) {
  return new Promise((resolve, reject) => {
    if (!RAZORPAY_KEY_ID) {
      reject(new Error("Payment isn't configured yet — missing VITE_RAZORPAY_KEY_ID."));
      return;
    }
    loadRazorpayScript()
      .then(() => {
        const rzp = new window.Razorpay({
          key: RAZORPAY_KEY_ID,
          amount: Math.round(Number(amount) * 100), // paise
          currency: "INR",
          name: "ABHI CABS",
          description: description || "Cab booking payment",
          order_id: order.orderId,
          prefill: { name, email, contact },
          theme: { color: "#0A0A0B" },
          handler: () => resolve({ completed: true }),
          modal: {
            ondismiss: () => reject(new Error("Payment cancelled.")),
          },
        });
        rzp.on("payment.failed", (resp) => {
          reject(new Error(resp?.error?.description || "Payment failed. Please try again."));
        });
        rzp.open();
      })
      .catch(reject);
  });
}

// ── Public API ───────────────────────────────────────────────────────────────

// Create a gateway order — purpose: "ADVANCE" | "BALANCE" | "FULL"
// Real backend field is `purpose`, not `kind` — confirmed against
// src/validators/payment.schemas.js's createOrderSchema.
export async function createPaymentOrder(bookingId, purpose = "FULL") {
  if (USE_MOCK) return mockOrder(bookingId, purpose);
  try {
    return await api.post("/payments/orders", { bookingId, purpose }, { idempotent: true });
  } catch (err) {
    if (MOCK_FALLBACK) return mockOrder(bookingId, purpose);
    throw err;
  }
}

// Poll a payment until it's CAPTURED or FAILED (real capture happens via webhook)
export async function getPaymentStatus(paymentId) {
  if (USE_MOCK) return mockPoll();
  try {
    return await api.get(`/payments/${paymentId}`);
  } catch (err) {
    if (MOCK_FALLBACK) return mockPoll();
    throw err;
  }
}

// Convenience: poll until terminal state (with a max attempt cap)
export async function waitForPayment(paymentId, { attempts = 10, intervalMs = 1500 } = {}) {
  for (let i = 0; i < attempts; i++) {
    const { status } = await getPaymentStatus(paymentId);
    if (status === "CAPTURED") return { success: true, status };
    if (status === "FAILED") return { success: false, status };
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return { success: false, status: "TIMEOUT" };
}
