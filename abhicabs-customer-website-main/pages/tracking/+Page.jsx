/**
 * pages/tracking/+Page.jsx
 *
 * FIXED: Added live Socket.IO connection so the trip progress bar updates in
 * real time when the backend emits trip:status events.
 *
 * Flow:
 * 1. Page loads, fetches booking from GET /bookings/:id
 * 2. Connects socket, emits booking:watch so backend joins this client to
 *    the booking:<id> room
 * 3. Listens for trip:status → updates stage bar instantly
 * 4. Also listens for booking:allocated → shows "driver assigned" toast
 * 5. Disconnects on unmount
 *
 * Falls back to a 15s REST poll if socket is unavailable.
 */
import React, { useEffect, useState, useRef } from "react";
import { useSelector } from "react-redux";
import { usePageContext } from "vike-react/usePageContext";
import { selectBooking, selectActiveBooking } from "../../src/store/slices/bookingSlice";
import { useToast } from "../../src/hooks/useToast";
import { getBooking, getBookingSummary } from "../../src/api/services/bookings";
import { fmtINR } from "../../src/data/mockData";
import { API_BASE_URL, USE_MOCK } from "../../src/api/config";
import { getAccessToken } from "../../src/api/tokens";
import StateBlock from "../../src/components/StateBlock";
import Button from "../../src/components/ui/Button";
import Card from "../../src/components/ui/Card";
import { IconPin, IconCheck } from "../../src/components/Icons";
import TrackingMap from "../../src/components/TrackingMap";

// FIX: relabeled per business requirement — a booking is "Pending" until a
// driver actually holds it, "Confirmed" once one does. Approximated purely
// from booking.status (CONFIRMED vs ALLOCATED+), since the backend doesn't
// expose a separate "driver has accepted" signal to this endpoint (no
// acceptedAt field, no socket event on accept) — adding that would need a
// backend change, which this deliberately avoids. This is self-correcting:
// if a driver declines an offer, the backend reverts the booking to
// CONFIRMED automatically, so this flips back to "Pending" on its own.
const STAGES = ["Pending", "Confirmed", "En Route", "Trip In Progress", "Trip Completed"];

function toStageIndex(status) {
  switch (status) {
    case "CONFIRMED": return 0;
    case "ALLOCATED": return 1;
    case "EN_ROUTE":  return 2;
    case "ONGOING":   return 3;
    case "COMPLETED": return 4;
    default: return 0;
  }
}

// Driver name/phone/vehicle details are deliberately withheld from the
// customer-facing tracking page for now, per an explicit product decision —
// held back until the real WhatsApp/SMS notification provider is actually
// connected (currently MSG91 is a stub, "not implemented yet" — see
// notify.provider.js on the backend), rather than exposing a driver's real
// phone number to a customer with no corresponding official notification
// trail. Flip this back to true once that's live; nothing else needs to
// change — every place that reads it below already checks this one flag.
const SHOW_DRIVER_CONTACT_DETAILS = false;

const POLL_INTERVAL = 15000; // 15s REST fallback poll

export default function Page() {
  const pageContext = usePageContext();
  const bookingId   = pageContext.urlParsed?.search?.b || null;
  const localById   = useSelector(selectBooking(bookingId));
  const localActive = useSelector(selectActiveBooking);
  const toast       = useToast();

  const [realBooking, setRealBooking] = useState(null);
  // Driver/vehicle assignment + last-known live GPS fix, from the summary
  // aggregate endpoint (GET /bookings/:id/summary) — the backend already
  // computes this; the customer app just wasn't calling it.
  const [allocation,  setAllocation]  = useState(null);
  const [liveLocation, setLiveLocation] = useState(null); // { lat, lng, at }
  const [loading,     setLoading]     = useState(!!bookingId);
  const socketRef = useRef(null);
  const pollRef   = useRef(null);

  // ── REST fetch ─────────────────────────────────────────────────────────────
  function fetchBooking() {
    if (!bookingId) return;
    getBooking(bookingId)
      .then((data) => {
        const b = data?.booking || data;
        setRealBooking(b);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  // Pulls the aggregate (driver name/phone, vehicle, last GPS fix) in one call.
  function fetchSummary() {
    if (!bookingId || USE_MOCK) return;
    getBookingSummary(bookingId)
      .then((data) => {
        if (!data) return;
        if (data.booking) setRealBooking(data.booking);
        setAllocation(data.allocation || null);
        if (data.liveLocation) {
          setLiveLocation({
            lat: data.liveLocation.lat,
            lng: data.liveLocation.lng,
            at: data.liveLocation.at || data.liveLocation.updatedAt || null,
          });
        }
      })
      .catch(() => { /* summary is best-effort; the base booking fetch already covers status */ });
  }

  // ── Socket + polling setup ─────────────────────────────────────────────────
  useEffect(() => {
    if (!bookingId) { setLoading(false); return; }

    fetchBooking();
    fetchSummary();

    if (USE_MOCK) {
      // Mock mode: just poll
      pollRef.current = setInterval(fetchBooking, POLL_INTERVAL);
      return () => clearInterval(pollRef.current);
    }

    let cancelled = false;

    (async () => {
      try {
        const { io } = await import("socket.io-client");
        const accessToken = getAccessToken();
        if (!accessToken || cancelled) return;

        const base = API_BASE_URL.replace(/\/api\/v1\/?$/, "");
        const socket = io(base, {
          auth: { token: accessToken },
          transports: ["websocket"],
          reconnection: true,
        });
        socketRef.current = socket;

        socket.on("connect", () => {
          // Join the booking room so we receive updates for this specific booking
          socket.emit("booking:watch", bookingId, (ack) => {
            if (!ack?.ok) console.warn("[tracking] booking:watch ack failed", ack);
          });
        });

        // ── Live trip status update ───────────────────────────────────────
        socket.on("trip:status", (payload) => {
          if (payload.bookingId !== bookingId) return;
          setRealBooking((prev) => prev ? { ...prev, status: payload.status } : prev);

          // Show a toast for meaningful status changes.
          // Wording matches the relabeled stages above: CONFIRMED here is
          // the "booking received, finding a driver" state (shown as
          // "Pending"), ALLOCATED is when the trip is genuinely confirmed
          // with a driver holding it (shown as "Confirmed").
          const labels = {
            CONFIRMED:  "Booking received — finding your driver…",
            ALLOCATED:  "Booking confirmed — driver on the way!",
            EN_ROUTE:   "Driver is en route to pickup.",
            ONGOING:    "Trip has started.",
            COMPLETED:  "Trip completed. Thank you!",
            CANCELLED:  "Booking was cancelled.",
          };
          if (labels[payload.status]) {
            toast.success(labels[payload.status], { duration: 5000 });
          }
        });

        // ── Driver allocated ──────────────────────────────────────────────
        socket.on("booking:allocated", (payload) => {
          if (payload.bookingId !== bookingId) return;
          setRealBooking((prev) => prev ? { ...prev, status: "ALLOCATED" } : prev);
          toast.success("Booking confirmed — driver on the way!", { duration: 5000 });
          // Refetch the summary to pick up driver name/phone/vehicle once the
          // allocation row is committed (small delay for the write to land).
          setTimeout(fetchSummary, 2000);
        });

        // ── Live driver GPS position ───────────────────────────────────────
        // Emitted by location.controller.js on every accepted driver ping
        // while this booking is being watched. Only relevant once a driver
        // is on the trip, which the backend already gates on its side.
        socket.on("trip:location", (payload) => {
          if (payload.bookingId !== bookingId) return;
          setLiveLocation({ lat: payload.lat, lng: payload.lng, at: payload.at });
        });

        // ── Payment received ──────────────────────────────────────────────
        socket.on("payment:received", (payload) => {
          if (payload.bookingId !== bookingId) return;
          toast.success(`Payment of ₹${payload.amount} received.`, { duration: 5000 });
        });

        // Fallback poll in case socket drops
        pollRef.current = setInterval(() => { fetchBooking(); fetchSummary(); }, POLL_INTERVAL);

      } catch {
        // Socket.IO not available — fall back to polling only
        pollRef.current = setInterval(fetchBooking, POLL_INTERVAL);
      }
    })();

    return () => {
      cancelled = true;
      if (socketRef.current) {
        socketRef.current.emit("booking:unwatch", bookingId);
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      clearInterval(pollRef.current);
    };
  }, [bookingId]);

  const localBooking = localById || localActive;

  if (loading) {
    return (
      <p className="text-center py-16 text-text-secondary">Loading trip status…</p>
    );
  }

  if (!realBooking && !localBooking) {
    return (
      <section className="py-11">
        <div className="max-w-[520px] mx-auto px-6">
          <StateBlock
            tone="empty"
            icon={<IconPin className="w-6.5 h-6.5" />}
            title="No active trip to track"
            description="Open live tracking from an upcoming booking in My Booking."
            action={<Button href="/my-booking">Go to My Booking</Button>}
          />
        </div>
      </section>
    );
  }

  const pickup       = realBooking?.pickupAddress || localBooking?.pickup;
  const drop         = realBooking?.dropAddress   || localBooking?.drop;
  const bookingNumber = realBooking?.bookingNumber || localBooking?.bookingId;
  const fare         = realBooking?.finalFare ?? realBooking?.estimatedFare ?? localBooking?.fare;
  const pickupAt     = realBooking?.pickupAt;
  const currentIdx   = realBooking
    ? toStageIndex(realBooking.status)
    : (localBooking?.status === "completed" ? 4 : 1);

  const isCancelled = realBooking?.status === "CANCELLED";
  const isCompleted = realBooking?.status === "COMPLETED";

  // FIX: once a trip is actually COMPLETED there's nothing left to "live
  // track" — no more GPS updates will ever arrive. Shows a one-time Thank
  // You popup instead of leaving the (now permanently stale) map/GPS UI
  // on screen. Dismissible; only shown once per page load.
  const [showThankYou, setShowThankYou] = useState(false);
  useEffect(() => {
    if (isCompleted) setShowThankYou(true);
  }, [isCompleted]);

  return (
    <>
      <section className="pt-9 md:pt-13 pb-9 bg-gradient-to-b from-primary-tint to-bg border-b border-border">
        <div className="max-w-[1264px] mx-auto px-6">
          <Breadcrumb items={[["Home", "/"], ["My Booking", "/my-booking"], ["Live Tracking", null]]} />
          <h1 className="text-[28px] md:text-[42px] font-bold tracking-tight">Live Tracking</h1>
        </div>
      </section>

      <section className="py-9 md:py-11">
        <div className="max-w-[1264px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-7 items-start">
          <div>
            {isCancelled ? (
              <div className="rounded-xl p-6 text-center" style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
                <p className="font-bold text-lg" style={{ color: '#DC2626' }}>Booking Cancelled</p>
                <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>This booking has been cancelled.</p>
                <Button href="/my-booking" className="mt-4">View My Bookings</Button>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-1 px-1 mb-2">
                <div className="flex justify-between relative min-w-[480px] sm:min-w-0 py-1">
                  <div className="absolute top-[19px] left-5 right-5 h-0.5 bg-border" />
                  {STAGES.map((s, i) => (
                    <div key={s} className="relative z-10 text-center flex-1 px-1">
                      <div className={`w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center text-[13px] font-bold border-[2.5px] ${
                        i < currentIdx
                          ? "bg-success border-success text-white"
                          : i === currentIdx
                          ? "bg-primary border-primary text-white shadow-[0_0_0_5px_var(--color-primary-tint)]"
                          : "bg-white border-border text-text-secondary"
                      }`}>
                        {i < currentIdx ? <IconCheck className="w-3.5 h-3.5" /> : i + 1}
                      </div>
                      <div className={`text-[11.5px] sm:text-[12px] font-semibold whitespace-nowrap ${i <= currentIdx ? "text-text" : "text-text-secondary"}`}>
                        {s}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="sm:hidden text-[11.5px] text-text-secondary mb-5">← Swipe to see all trip stages</p>

            {/* Live map — only meaningful while a trip can still move.
                Once COMPLETED, no more GPS updates will ever arrive, so
                showing the map/GPS UI would just be permanently stale. */}
            {isCompleted ? (
              <div className="rounded-xl p-8 text-center" style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                <p className="text-[40px] leading-none mb-2">🎉</p>
                <p className="font-bold text-lg text-text">Trip Completed!</p>
                <p className="text-[13.5px] text-text-secondary mt-1">Thanks for riding with ABHI CABS.</p>
              </div>
            ) : (
              <>
                <TrackingMap
                  pickup={realBooking?.pickupLat != null ? { lat: Number(realBooking.pickupLat), lng: Number(realBooking.pickupLng), address: pickup } : null}
                  drop={realBooking?.dropLat != null ? { lat: Number(realBooking.dropLat), lng: Number(realBooking.dropLng), address: drop } : null}
                  driverPosition={liveLocation}
                />
                <p className="text-[12px] text-text-secondary mt-2">
                  {liveLocation
                    ? `Live GPS fix received${liveLocation.at ? " at " + new Date(liveLocation.at).toLocaleTimeString("en-IN") : ""}.`
                    : "Live status updates are active. The driver marker appears once a GPS fix is received."}
                </p>
              </>
            )}
          </div>

          <div>
            {!isCompleted && (
              <Card className="p-5.5 mb-4.5">
                <div className="flex items-center gap-2 text-text-secondary">
                  <IconPin className="w-5 h-5 shrink-0" />
                  {SHOW_DRIVER_CONTACT_DETAILS && allocation?.driverName ? (
                    <p className="text-[13.5px]">
                      <b className="text-text">{allocation.driverName}</b>
                      {allocation.vehicleModel && <> · {allocation.vehicleModel}</>}
                      {allocation.vehicleNumber && <> ({allocation.vehicleNumber})</>}
                    </p>
                  ) : (
                    <p className="text-[13.5px]">
                      {currentIdx >= 1
                        ? "Driver confirmed — details will appear shortly."
                        : "Finding a driver for your trip…"}
                    </p>
                  )}
                </div>
                <div className="flex gap-2.5 mt-4">
                  <Button
                    size="sm"
                    href={SHOW_DRIVER_CONTACT_DETAILS && allocation?.driverPhone ? `tel:${allocation.driverPhone}` : undefined}
                    onClick={SHOW_DRIVER_CONTACT_DETAILS && allocation?.driverPhone ? undefined : () => toast("Driver contact details aren't available yet.")}
                  >
                    Call Driver
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => toast("In-app messaging coming soon.")}>
                    Message Driver
                  </Button>
                </div>
              </Card>
            )}

            <Card className="p-5">
              <h4 className="text-[15px] font-bold mb-2.5">Trip</h4>
              <Row label="Route"       value={pickup && drop ? `${pickup} → ${drop}` : (pickup || "—")} />
              {pickupAt && <Row label="Pickup Time" value={new Date(pickupAt).toLocaleString("en-IN")} />}
              <Row label="Booking ID" value={bookingNumber || "—"} />
              {fare != null && <Row label="Fare" value={fmtINR(fare)} />}
              <Row label="Status" value={realBooking?.status || "—"} />
              <Button href="/#contact-form" variant="outline" block className="mt-4">
                Contact Support
              </Button>
            </Card>
          </div>
        </div>
      </section>

      {/* One-time Thank You popup — shown once when the trip is confirmed
          COMPLETED. No real customer mobile app exists yet in this project,
          so the "Download App" button is an honest placeholder (toasts
          "coming soon") rather than a fake store link. */}
      {showThankYou && (
        <div className="fixed inset-0 bg-black/50 z-[500] flex items-center justify-center p-5" onClick={() => setShowThankYou(false)}>
          <div className="bg-white rounded-2xl p-7 max-w-[420px] w-full shadow-lifted text-center" onClick={(e) => e.stopPropagation()}>
            <p className="text-[44px] leading-none mb-3">🎉</p>
            <h3 className="text-xl font-bold">Thank You for Riding with Us!</h3>
            <p className="mt-2.5 text-text-secondary text-[14.5px]">
              We hope you had a great trip. Get the ABHI CABS app for faster booking and live tracking on the go, next time.
            </p>
            <div className="flex flex-col gap-2.5 mt-5.5">
              <Button onClick={() => toast("App download coming soon!", "success")}>
                Download App
              </Button>
              <Button variant="outline" href="/my-booking">
                View My Bookings
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between text-[14px] py-2 text-text-secondary">
      <span>{label}</span>
      <span className="font-semibold text-text">{value}</span>
    </div>
  );
}

function Breadcrumb({ items }) {
  return (
    <div className="flex items-center gap-2 text-[13.5px] text-text-secondary mb-3.5">
      {items.map(([label, href], i) => (
        <React.Fragment key={label}>
          {i > 0 && <span>/</span>}
          {href
            ? <a href={href} className="font-semibold hover:text-primary">{label}</a>
            : <span>{label}</span>}
        </React.Fragment>
      ))}
    </div>
  );
}