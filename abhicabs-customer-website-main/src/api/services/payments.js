// Payments service
// POST /payments/orders  body: { bookingId, purpose } → { orderId, ... }
// GET  /payments/:id     → { status, ... }
import { api } from "../client";
import { USE_MOCK, MOCK_FALLBACK, RAZORPAY_KEY_ID } from "../config";

// ── Mock ──────────────────────────────────────────────────────────────────────
function mockOrder(bookingId, purpose) {
  const id = "order_mock_" + Date.now();
  return { orderId: id, paymentId: id, amount: 0, currency: "INR", bookingId, purpose, status: "CREATED", reused: false };
}
async function mockPoll() {
  await new Promise((r) => setTimeout(r, 1200));
  return { status: Math.random() < 0.94 ? "CAPTURED" : "FAILED" };
}

// ── Razorpay Checkout ─────────────────────────────────────────────────────────
let checkoutScriptPromise = null;
function loadRazorpayScript() {
  if (typeof window === "undefined") return Promise.reject(new Error("Browser only"));
  if (window.Razorpay) return Promise.resolve();
  if (checkoutScriptPromise) return checkoutScriptPromise;
  checkoutScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load the payment widget."));
    document.body.appendChild(script);
  });
  return checkoutScriptPromise;
}

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
          theme: { color: "#FFC107" },
          handler: () => resolve({ completed: true }),
          modal: { ondismiss: () => reject(new Error("Payment cancelled.")) },
        });
        rzp.on("payment.failed", (resp) => {
          reject(new Error(resp?.error?.description || "Payment failed. Please try again."));
        });
        rzp.open();
      })
      .catch(reject);
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

// POST /payments/orders — body must match createOrderSchema: { bookingId, purpose }
// bookingId must be a UUID (the booking.id, not bookingNumber)
//
// The backend responds with { payment, reused }, where `payment` carries:
//   id              → internal payment id  (use for GET /payments/:id polling)
//   providerOrderId → Razorpay order id    (use for the Checkout `order_id`)
//   amount          → rupees, priced by the backend (source of truth for the charge)
// We normalise it to a flat shape the payment page can consume directly.
export async function createPaymentOrder(bookingId, purpose = "FULL") {
  if (USE_MOCK) return mockOrder(bookingId, purpose);
  try {
    const data = await api.post("/payments/orders", { bookingId, purpose }, { idempotent: true });
    const payment = data?.payment || data || {};
    return {
      orderId:   payment.providerOrderId,      // → Razorpay Checkout order_id
      paymentId: payment.id,                   // → GET /payments/:id
      amount:    payment.amount,               // backend-priced amount (rupees)
      currency:  payment.currency || "INR",
      status:    payment.status,
      reused:    data?.reused ?? false,
      raw:       data,
    };
  } catch (err) {
    if (MOCK_FALLBACK) return mockOrder(bookingId, purpose);
    throw err;
  }
}

// GET /payments/:id — poll for captured/failed
export async function getPaymentStatus(paymentId) {
  if (USE_MOCK) return mockPoll();
  try {
    return await api.get(`/payments/${paymentId}`);
  } catch (err) {
    if (MOCK_FALLBACK) return mockPoll();
    throw err;
  }
}

// Poll until terminal state
export async function waitForPayment(paymentId, { attempts = 10, intervalMs = 1500 } = {}) {
  for (let i = 0; i < attempts; i++) {
    const result = await getPaymentStatus(paymentId);
    const status = result?.status;
    if (status === "CAPTURED") return { success: true, status };
    if (status === "FAILED")   return { success: false, status };
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return { success: false, status: "TIMEOUT" };
}
