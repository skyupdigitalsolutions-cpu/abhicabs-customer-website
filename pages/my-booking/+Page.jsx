import { formatDateTime } from "../../src/lib/dateTime";
import React, { useEffect, useState, useCallback } from "react";
import { navigate } from "vike/client/router";
import { fmtINR } from "../../src/data/mockData";
import { bookingsApi } from "../../src/api";
import { normaliseRealBooking } from "../../src/hooks/useBookingLookup";
import useVehicleLookup from "../../src/hooks/useVehicleLookup";
import VehicleHero from "../../src/components/VehicleHero";
import StateBlock, { Spinner } from "../../src/components/StateBlock";
import Button from "../../src/components/ui/Button";
import BackLink, { recordNavStep } from "../../src/components/BackLink";
import { IconPin } from "../../src/components/Icons";
import { isAuthenticated } from "../../src/api/tokens";
import { openLogin, AUTH_CHANGED } from "../../src/lib/authEvents";

// Same real-backend status -> display-bucket mapping the Booking Details page
// uses, so both screens agree on what "Upcoming"/"Ongoing"/etc. mean.
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

const STATUS_LABEL = { upcoming: "Upcoming", ongoing: "Ongoing", completed: "Completed", cancelled: "Cancelled" };
const STATUS_COLORS = {
  upcoming: { bg: "#FFF7DE", fg: "#B8860B" },
  ongoing: { bg: "#E5F0FF", fg: "#1155CC" },
  completed: { bg: "#e7f6ed", fg: "#1a8a4a" },
  cancelled: { bg: "#FEE2E2", fg: "#B23B00" },
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "upcoming", label: "Upcoming" },
  { key: "ongoing", label: "Ongoing" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

const PAGE_SIZE = 20;

export default function Page() {
  const lookupVehicle = useVehicleLookup();

  // SSR renders this too, where localStorage (and therefore isAuthenticated)
  // isn't available — gate every auth-dependent branch behind a mounted flag
  // so the server and first client paint agree, then re-check on the client.
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);

  const [bookings, setBookings] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter, setFilter] = useState("all");

  // Fetch one page of the signed-in customer's real bookings and normalise each
  // raw record into the one shape both this list and Booking Details render from.
  const loadPage = useCallback(async (pageNum, append) => {
    try {
      const data = await bookingsApi.listMyBookings({ page: pageNum, limit: PAGE_SIZE });
      const items = Array.isArray(data?.items) ? data.items : [];
      const normalised = items.map(normaliseRealBooking);
      setBookings((prev) => (append ? [...prev, ...normalised] : normalised));
      setPage(data?.pagination?.page || pageNum);
      setTotalPages(data?.pagination?.totalPages || 1);
      setStatus("ready");
    } catch (err) {
      if (!append) {
        setError(err?.message || "We couldn't load your bookings right now.");
        setStatus("error");
      }
    }
  }, []);

  // On mount (client only), decide whether we're really signed in. A guest
  // session is treated as logged-out here — the backend list is keyed on the
  // account, so a guest would only ever see an empty list; prompt sign-in
  // instead. Reload automatically once the in-place login popup reports success.
  useEffect(() => {
    recordNavStep("/my-booking");
    setReady(true);

    function sync() {
      const isAuthed = isAuthenticated();
      setAuthed(isAuthed);
      if (isAuthed) {
        setStatus("loading");
        setError("");
        loadPage(1, false);
      } else {
        setStatus("ready");
      }
    }
    sync();

    window.addEventListener(AUTH_CHANGED, sync);
    return () => window.removeEventListener(AUTH_CHANGED, sync);
  }, [loadPage]);

  async function loadMore() {
    if (loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    await loadPage(page + 1, true);
    setLoadingMore(false);
  }

  function retry() {
    setStatus("loading");
    setError("");
    loadPage(1, false);
  }

  const visible = filter === "all"
    ? bookings
    : bookings.filter((b) => toDisplayStatus(b.status) === filter);

  // Per-bucket counts for the filter pills (from everything loaded so far).
  const counts = bookings.reduce((acc, b) => {
    const d = toDisplayStatus(b.status);
    acc[d] = (acc[d] || 0) + 1;
    return acc;
  }, {});

  const pillStyle = (active) => ({
    padding: "8px 16px", borderRadius: 9999, border: "none",
    fontWeight: 600, fontSize: 13, cursor: "pointer",
    background: active ? "#111" : "#F3F3F3",
    color: active ? "#FFC107" : "#555",
    whiteSpace: "nowrap",
  });

  return (
    <main className="page-main" style={{ maxWidth: 880, margin: "0 auto", padding: "24px 22px 70px" }}>
      <BackLink to="/" label="Back" />

      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontWeight: 800, fontSize: "clamp(22px,3vw,32px)", margin: "0 0 6px", letterSpacing: "-.02em" }}>My Bookings</h1>
        <p style={{ fontSize: 14.5, color: "#666", margin: 0 }}>Your trips with ABHI CABS — tap any booking to see full details.</p>
      </div>

      {/* Nothing renders auth-dependent until the client has mounted, so SSR
          and hydration match. */}
      {!ready ? (
        <StateBlock icon={<Spinner />} title="Loading…" />
      ) : !authed ? (
        <StateBlock
          tone="info"
          icon={<IconPin className="w-6.5 h-6.5" />}
          title="Sign in to see your bookings"
          description="Your booking history is tied to your account. Sign in with your mobile number to view and manage your trips."
          action={<Button onClick={() => openLogin()}>Sign In</Button>}
        />
      ) : status === "loading" ? (
        <StateBlock icon={<Spinner />} title="Loading your bookings…" description="Fetching your trips." />
      ) : status === "error" ? (
        <StateBlock
          tone="error"
          icon={<IconPin className="w-6.5 h-6.5" />}
          title="We couldn't load your bookings"
          description={error}
          action={<Button onClick={retry}>Try Again</Button>}
        />
      ) : bookings.length === 0 ? (
        <StateBlock
          tone="empty"
          icon={<IconPin className="w-6.5 h-6.5" />}
          title="No bookings yet"
          description="When you book a cab, it'll show up here so you can track and manage it."
          action={<Button href="/#booking">Book a Cab</Button>}
        />
      ) : (
        <>
          {/* Status filter pills */}
          <div style={{ display: "flex", gap: 8, marginBottom: 22, flexWrap: "wrap" }}>
            {FILTERS.map((f) => {
              const count = f.key === "all" ? bookings.length : (counts[f.key] || 0);
              return (
                <button key={f.key} style={pillStyle(filter === f.key)} onClick={() => setFilter(f.key)}>
                  {f.label}{count ? ` (${count})` : ""}
                </button>
              );
            })}
          </div>

          {visible.length === 0 ? (
            <div style={{ background: "#fff", border: "1px dashed #E5E5E5", borderRadius: 20, padding: "40px 32px", textAlign: "center" }}>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>No {STATUS_LABEL[filter]?.toLowerCase()} bookings</div>
              <p style={{ fontSize: 14, color: "#666", margin: 0 }}>Try a different filter to see your other trips.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {visible.map((b) => (
                <BookingCard key={b.bookingId} booking={b} lookupVehicle={lookupVehicle} />
              ))}
            </div>
          )}

          {/* Load more — only while the filtered view is the full list, since
              server pagination can't be scoped to a client-side status tab. */}
          {filter === "all" && page < totalPages && (
            <div style={{ textAlign: "center", marginTop: 22 }}>
              <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? "Loading…" : "Load more"}
              </Button>
            </div>
          )}
        </>
      )}
    </main>
  );
}

function BookingCard({ booking, lookupVehicle }) {
  const displayStatus = toDisplayStatus(booking.status);
  const sc = STATUS_COLORS[displayStatus];
  const href = `/booking-details?b=${encodeURIComponent(booking.bookingId)}`;

  return (
    <a
      href={href}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        navigate(href);
      }}
      className="hover:!border-[#FFC107]"
      style={{
        display: "flex", flexWrap: "wrap", background: "#fff", border: "1px solid #EFEFEF",
        borderRadius: 18, overflow: "hidden", textDecoration: "none", color: "inherit",
        transition: "border-color .15s, box-shadow .15s",
      }}
    >
      {/* Thumbnail */}
      <div style={{ flex: "0 0 180px", maxWidth: 180, minWidth: 140, minHeight: 130, background: "#F7F7F7", position: "relative" }}>
        <VehicleHero booking={booking} lookupVehicle={lookupVehicle} />
      </div>

      {/* Body */}
      <div style={{ flex: "1 1 320px", padding: "16px 18px", display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800, fontSize: 16, minWidth: 0 }}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={booking.pickup}>{booking.pickup || "—"}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}><path d="M5 12h14M13 6l6 6-6 6" stroke="#FFC107" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={booking.drop}>{booking.drop || "—"}</span>
          </div>
          <span style={{ fontSize: 11.5, fontWeight: 700, padding: "4px 11px", borderRadius: 9999, background: sc.bg, color: sc.fg, flexShrink: 0 }}>
            {STATUS_LABEL[displayStatus]}
          </span>
        </div>

        <p style={{ fontSize: 12.5, color: "#888", margin: "0 0 12px" }}>Booking {booking.bookingId}</p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 18px", fontSize: 13, color: "#555", marginBottom: 14 }}>
          <span>{formatDateTime(booking.date, booking.time) || "—"}</span>
          {booking.vehicle && <span>{booking.vehicle}</span>}
        </div>

        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginTop: "auto", gap: 10 }}>
          <span style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 800, fontSize: 19 }}>{fmtINR(booking.fare)}</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 700, fontSize: 13, color: "#B8860B" }}>
            View details
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
        </div>
      </div>
    </a>
  );
}
