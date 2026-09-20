import { IconList, IconAlert } from "../../src/components/Icons";
import React, { useEffect, useState } from "react";
import { useToast } from "../../src/hooks/useToast";
import { isAuthenticated } from "../../src/api/tokens";
import { listMyBookings, getInvoice, cancelBooking as cancelBookingApi } from "../../src/api/services/bookings";
import StateBlock from "../../src/components/StateBlock";
import Button from "../../src/components/ui/Button";
import { fmtINR, VEHICLE_RATES } from "../../src/data/mockData";

const STATUS_LABEL = { upcoming: "Upcoming", ongoing: "Ongoing", completed: "Completed", cancelled: "Cancelled" };
const STATUS_COLORS = {
  upcoming: { bg: "#FFF7DE", fg: "#B8860B" },
  ongoing: { bg: "#E5F0FF", fg: "#1155CC" },
  completed: { bg: "#e7f6ed", fg: "#1a8a4a" },
  cancelled: { bg: "#FEE2E2", fg: "#B23B00" },
};

// FIX: the backend's cancellation validator requires a real reason (min 3
// characters) "for reporting and future analysis" — but the frontend never
// actually asked the customer for one, it just sent the same hardcoded
// string ("Cancelled by customer") every single time, which technically
// satisfied the validation while making the whole "analysis" purpose
// pointless. A fixed set of categories (rather than free text) makes the
// reasons actually countable/reportable, with "Other" as an escape hatch
// for anything that doesn't fit.
const CANCEL_REASONS = [
  "Change of plans",
  "Booked by mistake",
  "Found a better price elsewhere",
  "Trip is no longer needed",
  "Other",
];

// Rebuilt to match the Figma bundler export's visual language (page
// header, tab bar, booking rows) exactly, while preserving all the real
// business logic already fixed here: required login (no guest lookup),
// server-side date filtering, real pagination, a validated cancel-reason
// modal, and a real invoice modal. The spec's Upcoming/Completed/Cancelled
// tabs are implemented as a genuine client-side filter over the already
// -fetched, already-real bookings (using the existing displayStatus field)
// rather than the spec's fake tab handlers with no real backing.
function CancelReasonModal({ open, onClose, onConfirm, cancelling }) {
  const [reason, setReason] = useState(CANCEL_REASONS[0]);
  const [otherText, setOtherText] = useState("");

  useEffect(() => {
    if (open) { setReason(CANCEL_REASONS[0]); setOtherText(""); }
  }, [open]);

  if (!open) return null;

  const isOther = reason === "Other";
  const finalReason = isOther ? otherText.trim() : reason;
  const isValid = finalReason.length >= 3;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 20, padding: 28, maxWidth: 440, width: "100%" }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Cancel this booking?</h3>
        <p style={{ marginTop: 8, color: "#666", fontSize: 14.5 }}>
          Free cancellation applies before your cancellation window closes. This action cannot be undone.
        </p>

        <p style={{ marginTop: 16, fontSize: 13, fontWeight: 700 }}>Reason for cancelling <span style={{ color: "#B23B00" }}>*</span></p>
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
          {CANCEL_REASONS.map((r) => (
            <label key={r} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13.5, cursor: "pointer" }}>
              <input type="radio" name="cancel-reason" checked={reason === r} onChange={() => setReason(r)} className="accent-primary w-4 h-4" />
              {r}
            </label>
          ))}
        </div>

        {isOther && (
          <textarea
            style={{ width: "100%", marginTop: 10, border: "1px solid #E5E5E5", borderRadius: 10, padding: 12, fontSize: 13.5, minHeight: 70 }}
            placeholder="Please tell us why (minimum 3 characters)"
            value={otherText}
            onChange={(e) => setOtherText(e.target.value)}
          />
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 13, borderRadius: 11, border: "1.5px solid #E5E5E5", background: "#fff", fontWeight: 600, cursor: "pointer" }}>Keep Booking</button>
          <button
            disabled={!isValid || cancelling}
            onClick={() => onConfirm(finalReason)}
            style={{ flex: 1, padding: 13, borderRadius: 11, border: "none", background: (!isValid || cancelling) ? "#f3a8a8" : "#DC2626", color: "#fff", fontWeight: 700, cursor: (!isValid || cancelling) ? "default" : "pointer" }}
          >
            {cancelling ? "Cancelling…" : "Cancel Booking"}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Rebuilt to require a real login and show only real, authenticated data —
 * no more local-device booking tracking, no more guest lookup-by-ID (both
 * are genuine privacy concerns: anyone with a booking ID could view it, and
 * a fake driver/vehicle was shown that never existed on the backend).
 *
 * Real backend booking status (PENDING/CONFIRMED/ALLOCATED/EN_ROUTE/
 * ONGOING/ARRIVED/COMPLETED/CANCELLED/EXPIRED) mapped to this page's four
 * display buckets.
 */
function toDisplayStatus(realStatus) {
  switch (realStatus) {
    case "COMPLETED": return "completed";
    case "CANCELLED":
    case "EXPIRED": return "cancelled";
    case "EN_ROUTE":
    case "ONGOING":
    case "ARRIVED": return "ongoing";
    default: return "upcoming"; // PENDING, CONFIRMED, ALLOCATED
  }
}

function derivePaymentStatus(b) {
  if (b.paymentMode === "ZERO") return "Pay on trip (cash)";
  const balance = Number(b.balanceDue ?? 0);
  const advance = Number(b.advancePaid ?? 0);
  if (balance <= 0) return "Paid";
  if (advance > 0) return "Partially paid";
  return "Payment pending";
}

const TABS = [
  { id: "upcoming", label: "Upcoming" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
];

export default function Page() {
  const toast = useToast();

  const [loggedIn, setLoggedIn] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loadStatus, setLoadStatus] = useState("loading");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cancelId, setCancelId] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [invoiceBookingId, setInvoiceBookingId] = useState(null);
  const [showAppPopup, setShowAppPopup] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  // Tabs from the spec — a real client-side filter over the bookings
  // already fetched below, keyed by the same displayStatus this page
  // already computes. "Ongoing" folds into "Upcoming" since the spec only
  // has 3 tabs, not 4.
  const [bkTab, setBkTab] = useState("upcoming");

  useEffect(() => {
    const authed = isAuthenticated();
    setLoggedIn(authed);
    if (!authed) return;
    loadBookings(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function loadBookings(pageToLoad = 1, append = false) {
    if (append) setLoadingMore(true); else setLoadStatus("loading");
    const params = { page: pageToLoad, limit: 10 };
    if (dateFrom) params.from = new Date(dateFrom).toISOString();
    if (dateTo)   params.to   = new Date(dateTo + "T23:59:59").toISOString();
    listMyBookings(params)
      .then((res) => {
        const rows = res?.items || [];
        const mapped = rows.map((b) => ({
          ...b,
          displayStatus: toDisplayStatus(b.status),
          paymentStatusReal: derivePaymentStatus(b),
        }));
        setBookings((prev) => (append ? [...prev, ...mapped] : mapped));
        setPage(res?.pagination?.page || pageToLoad);
        setTotalPages(res?.pagination?.totalPages || 1);
        setLoadStatus("ready");
      })
      .catch((err) => {
        console.error("[my-booking] failed to load bookings:", err);
        if (!append) setLoadStatus("error");
      })
      .finally(() => setLoadingMore(false));
  }

  function clearDateFilterAndReload() {
    setLoadStatus("loading");
    listMyBookings({ page: 1, limit: 10 })
      .then((res) => {
        const rows = res?.items || [];
        const mapped = rows.map((b) => ({
          ...b,
          displayStatus: toDisplayStatus(b.status),
          paymentStatusReal: derivePaymentStatus(b),
        }));
        setBookings(mapped);
        setPage(res?.pagination?.page || 1);
        setTotalPages(res?.pagination?.totalPages || 1);
        setLoadStatus("ready");
      })
      .catch((err) => {
        console.error("[my-booking] failed to load bookings:", err);
        setLoadStatus("error");
      });
  }

  async function confirmCancel(reason) {
    if (!cancelId) return;
    setCancelling(true);
    try {
      await cancelBookingApi(cancelId, reason);
      toast("Booking cancelled", "success");
      setCancelId(null);
      loadBookings();
    } catch (err) {
      toast(err.message || "Could not cancel — please try again.", "error");
    } finally {
      setCancelling(false);
      setCancelId(null);
    }
  }

  const filtered = bookings.filter((b) =>
    bkTab === "upcoming" ? (b.displayStatus === "upcoming" || b.displayStatus === "ongoing") : b.displayStatus === bkTab
  );

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "32px 22px 70px" }}>
      <h1 style={{ fontWeight: 800, fontSize: "clamp(24px,3vw,34px)", margin: "0 0 18px", letterSpacing: "-.02em" }}>My Bookings</h1>

      {loggedIn === false && (
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          <StateBlock
            tone="empty"
            icon={<IconAlert className="w-6.5 h-6.5" />}
            title="Log in to see your bookings"
            description="For your privacy, booking history is only shown to signed-in accounts — there's no guest lookup on this page anymore."
            action={<Button href="/login">Log In</Button>}
          />
        </div>
      )}

      {loggedIn === true && (
        <>
          {/* Tab bar — per spec */}
          <div style={{ display: "flex", gap: 6, background: "#fff", border: "1px solid #EFEFEF", padding: 5, borderRadius: 12, marginBottom: 22, width: "max-content", maxWidth: "100%", overflowX: "auto" }}>
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setBkTab(t.id)}
                style={{
                  padding: "10px 18px", borderRadius: 9, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13.5,
                  background: bkTab === t.id ? "#111" : "transparent",
                  color: bkTab === t.id ? "#FFC107" : "#666",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Date range search — real backend filter (GET /bookings ?from/&to) */}
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 12, marginBottom: 22, background: "#fff", border: "1px solid #EFEFEF", borderRadius: 16, padding: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 12.5, fontWeight: 700, color: "#666" }}>From</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ border: "1px solid #E5E5E5", borderRadius: 10, padding: "8px 12px", fontSize: 13.5 }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 12.5, fontWeight: 700, color: "#666" }}>To</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ border: "1px solid #E5E5E5", borderRadius: 10, padding: "8px 12px", fontSize: 13.5 }} />
            </div>
            <button onClick={() => loadBookings(1, false)} className="hover:!bg-[#FFB300]" style={{ padding: "10px 18px", borderRadius: 9999, background: "#FFC107", color: "#111", fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer" }}>
              Search
            </button>
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(""); setDateTo(""); clearDateFilterAndReload(); }} style={{ padding: "10px 18px", borderRadius: 9999, background: "transparent", border: "none", color: "#666", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                Clear
              </button>
            )}
          </div>

          {loadStatus === "loading" && <p style={{ textAlign: "center", padding: "64px 0", color: "#666" }}>Loading your bookings…</p>}

          {loadStatus === "error" && (
            <div style={{ maxWidth: 480, margin: "0 auto" }}>
              <StateBlock tone="error" icon={<IconAlert className="w-6 h-6" />}
                title="Couldn't load your bookings"
                description="Please try again in a moment."
                action={<Button onClick={() => loadBookings(1, false)}>Retry</Button>} />
            </div>
          )}

          {loadStatus === "ready" && (
            filtered.length === 0 ? (
              <div style={{ background: "#fff", border: "1px dashed #E5E5E5", borderRadius: 20, padding: 56, textAlign: "center" }}>
                <div style={{ width: 60, height: 60, margin: "0 auto 16px", borderRadius: 16, background: "#F7F7F7", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
                    <rect x="3.5" y="6" width="17" height="14" rx="2.5" stroke="#999" strokeWidth="2" />
                    <path d="M8 4v4M16 4v4M3.5 11h17" stroke="#999" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
                <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 6 }}>No {STATUS_LABEL[bkTab].toLowerCase()} bookings</div>
                <p style={{ fontSize: 14, color: "#666", margin: "0 0 18px" }}>Your bookings will appear here once you complete a booking.</p>
                <a href="/#booking" style={{ display: "inline-block", padding: "12px 24px", borderRadius: 9999, background: "#FFC107", color: "#111", fontWeight: 700, fontSize: 14 }}>Book a Cab</a>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {filtered.map((b) => {
                  const sc = STATUS_COLORS[b.displayStatus];
                  const vehicleName = b.vehicleClass ? b.vehicleClass.charAt(0).toUpperCase() + b.vehicleClass.slice(1) : "";
                  return (
                    <div key={b.id} style={{ background: "#fff", border: "1px solid #EFEFEF", borderRadius: 18, padding: "20px 22px", display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center" }}>
                      <span style={{ width: 64, height: 46, borderRadius: 10, background: "#F7F7F7", flex: "none", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {(() => {
                          const img = b.vehicleImg ||
                            VEHICLE_RATES.find(v => v.id === b.vehicleId)?.img ||
                            VEHICLE_RATES.find(v => v.category === b.vehicleClass)?.img;
                          return img
                            ? <img src={img} alt={vehicleName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            : <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M4 16l1.5-5A2 2 0 017.4 9.5h9.2a2 2 0 011.9 1.5L20 16" stroke="#B8860B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><rect x="2.5" y="16" width="19" height="4" rx="1.5" stroke="#B8860B" strokeWidth="1.5" /><circle cx="7" cy="20" r="1.6" fill="#B8860B" /><circle cx="17" cy="20" r="1.6" fill="#B8860B" /><path d="M8 9.5l1-3.5h6l1 3.5" stroke="#B8860B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
                        })()}
                      </span>
                      <div style={{ flex: "1 1 200px", minWidth: 160 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 700, fontSize: 15.5 }}>{b.pickupAddress} → {b.dropAddress}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 9999, background: sc.bg, color: sc.fg }}>
                            {STATUS_LABEL[b.displayStatus]}
                          </span>
                        </div>
                        <div style={{ fontSize: 12.5, color: "#666", fontWeight: 500, marginTop: 4 }}>
                          {[vehicleName, b.pickupAt ? new Date(b.pickupAt).toLocaleString("en-IN") : null, b.bookingNumber].filter(Boolean).join(" · ")}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 800, fontSize: 18 }}>{fmtINR(b.finalFare ?? b.estimatedFare ?? 0)}</div>
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <a href={`/booking-details?b=${b.id}`} style={{ padding: "10px 16px", borderRadius: 10, border: "1.5px solid #111", background: "#fff", color: "#111", fontWeight: 600, fontSize: 13 }}>View Details</a>
                        {/* FIX: previously also showed for "upcoming" bookings —
                            there's nothing to track before the ride has actually
                            started, so this is now genuinely restricted to
                            "ongoing" only (also matches the reference, which
                            shows no Track Ride button on an upcoming booking). */}
                        {b.displayStatus === "ongoing" && (
                          <button onClick={() => setShowAppPopup(true)} style={{ padding: "10px 16px", borderRadius: 10, border: "1.5px solid #111", background: "#fff", color: "#111", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Track Ride</button>
                        )}
                        {b.displayStatus === "upcoming" && (
                          <button onClick={() => setCancelId(b.id)} style={{ padding: "10px 16px", borderRadius: 10, border: "1.5px solid #E5E5E5", background: "#fff", color: "#B23B00", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Cancel</button>
                        )}
                        {b.displayStatus === "completed" && (
                          <button onClick={() => setInvoiceBookingId(b.id)} style={{ padding: "10px 16px", borderRadius: 10, border: "none", background: "transparent", color: "#666", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>View Invoice</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {loadStatus === "ready" && bookings.length > 0 && page < totalPages && (
            <div style={{ display: "flex", justifyContent: "center", marginTop: 24 }}>
              <button onClick={() => loadBookings(page + 1, true)} disabled={loadingMore} style={{ padding: "12px 24px", borderRadius: 12, border: "1.5px solid #E5E5E5", background: "#fff", fontWeight: 600, cursor: "pointer" }}>
                {loadingMore ? "Loading…" : "Load More Bookings"}
              </button>
            </div>
          )}
        </>
      )}

      <CancelReasonModal
        open={!!cancelId}
        cancelling={cancelling}
        onClose={() => setCancelId(null)}
        onConfirm={confirmCancel}
      />

      {invoiceBookingId && (
        <InvoiceViewModal bookingId={invoiceBookingId} onClose={() => setInvoiceBookingId(null)} />
      )}

      {showAppPopup && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setShowAppPopup(false)}>
          <div style={{ background: "#fff", borderRadius: 20, padding: 28, maxWidth: 400, width: "100%", textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
            <p style={{ fontSize: 40, lineHeight: 1, marginBottom: 12 }}>📱</p>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Track Your Ride in the App</h3>
            <p style={{ marginTop: 10, color: "#666", fontSize: 14.5 }}>
              Live ride tracking is available in the ABHI CABS app — download it to see your driver's location in real time.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 22 }}>
              <button onClick={() => toast("App download coming soon!", "success")} className="hover:!bg-[#FFB300]" style={{ padding: 14, borderRadius: 12, border: "none", background: "#FFC107", color: "#111", fontWeight: 700, cursor: "pointer" }}>
                Download App
              </button>
              <button onClick={() => setShowAppPopup(false)} style={{ padding: 14, borderRadius: 12, border: "1.5px solid #E5E5E5", background: "#fff", fontWeight: 600, cursor: "pointer" }}>
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function InvoiceViewModal({ bookingId, onClose }) {
  const [invoice, setInvoice] = useState(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let cancelled = false;
    getInvoice(bookingId)
      .then((data) => { if (!cancelled) { setInvoice(data?.invoice || data); setStatus("ready"); } })
      .catch(() => { if (!cancelled) setStatus("error"); });
    return () => { cancelled = true; };
  }, [bookingId]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 20, maxWidth: 520, width: "100%", maxHeight: "85vh", overflowY: "auto", padding: 24 }} onClick={(e) => e.stopPropagation()}>
        {status === "loading" && <p style={{ textAlign: "center", padding: "40px 0", color: "#666" }}>Loading invoice…</p>}
        {status === "error" && (
          <StateBlock tone="error" icon={<IconAlert className="w-6 h-6" />}
            title="Invoice not available yet"
            description="The invoice is generated automatically once the trip is completed." />
        )}
        {status === "ready" && invoice && (
          <>
            <p style={{ fontWeight: 700, fontSize: 18, margin: "0 0 4px" }}>{invoice.invoiceNumber}</p>
            <p style={{ fontSize: 13, color: "#666", margin: "0 0 16px" }}>{invoice.type === "TAX" ? "Tax Invoice" : "Bill of Supply"}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {(invoice.lines || []).map((l) => (
                <div key={l.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "#666" }}>{l.description}</span>
                  <span>{fmtINR(l.amount)}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 700, paddingTop: 8, marginTop: 4, borderTop: "1px solid #E5E5E5" }}>
                <span>Total</span>
                <span>{fmtINR(invoice.totalAmount)}</span>
              </div>
            </div>
            <button onClick={onClose} style={{ width: "100%", marginTop: 20, padding: 13, borderRadius: 11, border: "1.5px solid #E5E5E5", background: "#fff", fontWeight: 600, cursor: "pointer" }}>Close</button>
          </>
        )}
      </div>
    </div>
  );
}