import React, { useEffect, useMemo, useState, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { usePageContext } from "vike-react/usePageContext";
import { navigate } from "vike/client/router";
import { selectJourney, createJourney } from "../../src/store/slices/journeySlice";
import { setSelectedCab } from "../../src/store/slices/selectionSlice";
import { VEHICLE_RATES, fmtINR } from "../../src/data/mockData";
import { faresApi, bookingsApi } from "../../src/api";
import StateBlock, { Spinner } from "../../src/components/StateBlock";
import { IconPin, IconZap } from "../../src/components/Icons";
import { useToast } from "../../src/hooks/useToast";
import { GOOGLE_MAPS_API_KEY } from "../../src/api/config";
import LocationMapPicker from "../../src/components/LocationMapPicker";


// Derives a customer-facing "type" from the vehicle's real name, since the
// raw `category` field (sedan/suv/premium/tempo/bus/luxury) doesn't match
// how these are actually grouped for browsing — e.g. "Force Urbania" and
// "20 Seater Urbania Premium" both carry category:"tempo"/"luxury" but are
// genuinely a distinct type from a plain Tempo Traveller.
function getVehicleType(v) {
  const n = v.name.toLowerCase();
  if (n.includes("urbania")) return "Urbania";
  if (n.includes("tempo traveler") || n.includes("tempo traveller")) return "Tempo Traveller";
  if (n.includes("bharat benz") || n.includes("ashok leyland")) return "Coach";
  if (v.category === "sedan") return "Sedan";
  return "MPV";
}

// Rebuilt to match the Figma bundler export's "Select Cars" structure
// exactly: a black route/trip summary bar, a sticky sidebar of real filters
// (vehicle type, seats, AC, sort — each derived from the actual vehicle
// list, not hardcoded), and a results list. This replaces the previous
// two-step "pick a broad group, then see its cars" flow with the spec's
// single filtered list, while keeping every real behavior intact: backend
// fare fetching, surge pricing, local/outstation fare calculation, and
// selecting a vehicle into Redux before navigating to checkout.
export default function Page() {
  const pageContext = usePageContext();
  const journeyId = pageContext.urlParsed?.search?.j || null;
  const browseType = pageContext.urlParsed?.search?.type || null; // e.g. "group"
  const urlSeater  = pageContext.urlParsed?.search?.seater  || null; // e.g. "13" from group section
  const urlVehicle = pageContext.urlParsed?.search?.vehicle || null; // e.g. "swift-desire" from fleet card
  const dispatch = useDispatch();
  const toast = useToast();

  // A journey created inline (browse mode) is tracked in local state as well as
  // the URL. Client-side navigation to the SAME page with a new ?j= query does
  // not reliably refresh pageContext here (and can remount, losing it), which
  // left the page stuck in browse mode — so selecting a vehicle bounced the
  // user to /#booking. Keying browse mode off BOTH the URL and this local id
  // makes the transition happen in place, no matter how routing behaves.
  const [createdJourneyId, setCreatedJourneyId] = useState(null);
  const effectiveJourneyId = journeyId || createdJourneyId;

  const journey = useSelector(selectJourney(effectiveJourneyId));
  // Browse mode = no real trip yet. Check the effective id (URL param OR the
  // one just created inline), NOT the resolved journey — selectJourney() falls
  // back to the last search, which would otherwise mask "no search done".
  const browseMode = !effectiveJourneyId;

  // Reset body scroll lock in case a modal from the previous page left it set
  useEffect(() => {
    document.body.style.overflow = "";
  }, []);

  const [loading, setLoading] = useState(!browseMode);
  const [apiVehicles, setApiVehicles] = useState(null);
  const [serviceAreaError, setServiceAreaError] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  // FIX: previously auto-selected Tempo Traveller/Urbania/Coach as an
  // already-applied filter when arriving via the "Group / Coach" tile.
  // Per feedback, the filter should offer only these as choices — not
  // pre-select any of them — so the vehicle list restriction below (not
  // this state) is what scopes things to group-relevant vehicles; the user
  // still actively picks among them via the pills.
  const [typeFilters, setTypeFilters] = useState([]);
  // Pre-populate seat filter from URL param (e.g. ?seater=13 from group section)
  const [seatFilters, setSeatFilters] = useState(() =>
    urlSeater ? [Number(urlSeater)] : []
  );

  // Inline trip form (browse mode) — lets the user set trip type + details
  // right here without redirecting to the home booking widget.
  const today = new Date().toISOString().split("T")[0];
  const [inlineTrip, setInlineTrip] = useState({
    tripType: "one-way", pickup: "", drop: "", date: today, time: "", returnDate: "", stops: [],
  });
  const [inlineMapField, setInlineMapField] = useState(null);
  const setInline = (k) => (e) => setInlineTrip((f) => ({ ...f, [k]: e.target.value }));
  // Only meaningful in Group/Coach browse mode, where there's no real trip
  // type yet — lets the customer indicate one here, which then carries
  // through to a real search (see selectVehicle) instead of being lost.
  // Inline trip-detail fields for the Group/Coach filter — filled in right
  // here instead of redirecting to the homepage widget, so the customer
  // never loses their place. Same field set BookingWidget itself collects.
  const todayStr = new Date().toISOString().slice(0, 10);
  // Via stops — same feature as the main booking widget, and same
  // restriction: only meaningful for one-way/round-trip (a Local package or
  // an Airport transfer doesn't have intermediate stops the way a
  // point-to-point trip does).

  // Maps SDK is loaded by LocationMapPicker's singleton loader — poll for it.
  const [mapsLoaded, setMapsLoaded] = useState(
    () => typeof window !== "undefined" && !!window.google?.maps?.places
  );
  useEffect(() => {
    if (mapsLoaded || !GOOGLE_MAPS_API_KEY) return;
    const iv = setInterval(() => {
      if (window.google?.maps?.places) { setMapsLoaded(true); clearInterval(iv); }
    }, 200);
    return () => clearInterval(iv);
  }, [mapsLoaded]);

  // Attach Google Places Autocomplete to an inline input by ref.
  const inlinePickupAcRef = useRef(null);
  const inlineDropAcRef = useRef(null);
  function attachInlineAc(field, storedRef) {
    return (el) => {
      if (!el || !mapsLoaded || storedRef.current) return;
      storedRef.current = new window.google.maps.places.Autocomplete(el, {
        componentRestrictions: { country: "in" },
        fields: ["formatted_address", "name"],
      });
      storedRef.current.addListener("place_changed", () => {
        const p = storedRef.current.getPlace();
        const addr = p?.formatted_address || p?.name || el.value;
        setInlineTrip((f) => ({ ...f, [field]: addr }));
      });
    };
  }



  const [ac, setAc] = useState("all"); // all | on | off
  const [sort, setSort] = useState("recommended");

  // Real surge, straight from the backend's quote — every option in
  // apiVehicles carries the same surge info (one demand-pricing decision per
  // list, priced once for the whole journey), so the first one speaks for all.
  const realSurge = !browseMode && apiVehicles?.length ? apiVehicles[0] : null;
  const surge = Boolean(realSurge?.surge);
  const surgeMultiplier = realSurge?.surgeMultiplier || 1.0;
  const surgePct = realSurge?.surgePct || 0;

  useEffect(() => {
    if (browseMode || !journey) return;
    let cancelled = false;
    setLoading(true);
    setServiceAreaError(null);
    faresApi.getFareOptions(journey)
      .then((options) => {
        if (cancelled) return;
        setApiVehicles(options);
        // Funnel: record that this visitor got as far as viewing fares, so an
        // abandoned booking shows up in the ERP. Fire-and-forget; the backend
        // dedups this into one attempt row and advances its stage.
        bookingsApi.trackDraft({
          stage: "FARES_VIEWED",
          pickupAddress: journey.pickup,
          dropAddress: journey.drop,
          estimatedFare: options?.[0]?.fare,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setApiVehicles(null);
        // Surface service-area errors with a clear actionable message
        if (err?.code === "OUTSIDE_SERVICE_AREA" || (err?.message || "").includes("service area")) {
          setServiceAreaError(err.message || "Pickup is outside the Bengaluru service area.");
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [journey?.id]);

  const isLocal = !browseMode && journey?.tripType === "local";
  const isRound = !browseMode && journey?.tripType === "round-trip";

  function calcFare(v) {
    let base;
    if (isLocal) {
      base = v.local.base8hr80km;
    } else {
      const km = 200;
      const totalKm = isRound ? km * 1.9 : km;
      base = Math.round(v.outstation.perKm * totalKm);
    }
    return Math.round(base * surgeMultiplier);
  }

  const GROUP_TYPES = ["Coach"];
  const allSource = (apiVehicles && apiVehicles.length ? apiVehicles : VEHICLE_RATES)
    .filter((v) => Number(v.seats) <= 33); // show vehicles up to 33 seaters only
  // Arriving via "Group / Coach" scopes the whole page to actual
  // coaches/buses only — not the smaller Tempo Traveller/Urbania vans,
  // which are a different vehicle class even though they're also used for
  // group travel. The Vehicle Type filter then only offers "Coach" as a
  // choice here, and nothing is pre-selected — the list is already scoped
  // by the vehicles available, not by an applied filter.
  // When arriving via a fleet card (?vehicle=...), show the full catalogue
  // regardless of type=group — the specific vehicle may not be a Coach.
  const source = (browseType === "group" && !urlVehicle)
    ? allSource.filter((v) => GROUP_TYPES.includes(getVehicleType(v)))
    : allSource;

  // Available filter options derived from the actual vehicle list, not
  // hardcoded — so a filter pill never appears for something that isn't
  // actually available to pick.
  const availableTypes = useMemo(() => [...new Set(source.map((v) => getVehicleType(v)))], [source]);
  const availableSeats = useMemo(() => [...new Set(source.map((v) => v.seats))].sort((a, b) => a - b), [source]);

  const vehicles = useMemo(() => {
    let list = source;
    if (typeFilters.length) list = list.filter((v) => typeFilters.includes(getVehicleType(v)));
    if (seatFilters.length) list = list.filter((v) => seatFilters.includes(Number(v.seats)));

    if (ac === "on") list = list.filter((v) => v.ac);
    if (ac === "off") list = list.filter((v) => !v.ac);
    list = list.map((v) => ({
      ...v,
      id: v.id || v.vehicleId,
      fare: v.fare != null ? v.fare : calcFare(v),
    }));
    if (sort === "lowhigh") list = [...list].sort((a, b) => a.fare - b.fare);
    if (sort === "highlow") list = [...list].sort((a, b) => b.fare - a.fare);
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, typeFilters, seatFilters, ac, sort]);

  function toggleType(t) {
    setTypeFilters((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }
  function toggleSeat(s) {
    const n = Number(s);
    setSeatFilters((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]));
  }
  function clearFilters() {
    setTypeFilters([]); setSeatFilters([]); setAc("all"); setSort("recommended");
  }

  // Submit the inline trip form — creates a journey and stays on this page,
  // updating the URL so fares load without a redirect to home.
  function submitInlineTrip(e) {
    e?.preventDefault?.();
    if (inlineTrip.tripType !== "local" && !inlineTrip.pickup.trim()) { toast("Please enter a pickup location", "error"); return; }
    if ((inlineTrip.tripType === "one-way" || inlineTrip.tripType === "round-trip" || inlineTrip.tripType === "airport") && !inlineTrip.drop.trim()) { toast("Please enter a destination", "error"); return; }
    if (inlineTrip.tripType === "local" && !inlineTrip.pickup.trim()) { toast("Please enter a pickup location", "error"); return; }
    if (!inlineTrip.date) { toast("Please select a date", "error"); return; }
    if (!inlineTrip.time) { toast("Please select a time", "error"); return; }
    if (inlineTrip.tripType === "round-trip" && !inlineTrip.returnDate) { toast("Please select a return date", "error"); return; }

    const journeyObj = {
      tripType: inlineTrip.tripType,
      pickup: inlineTrip.pickup,
      drop: inlineTrip.drop,
      date: inlineTrip.date,
      time: inlineTrip.time,
      returnDate: inlineTrip.returnDate,
      stops: (inlineTrip.stops || []).filter((s) => s.trim()),
    };
    const action = dispatch(createJourney(journeyObj));
    const newId = action.payload.id;
    // Switch this page into non-browse mode IN PLACE. We update the URL with
    // history.replaceState (so it's shareable / survives refresh) rather than
    // Vike navigate(), which could remount the page and drop the state — the
    // exact cause of "after adding details it goes back to home".
    setCreatedJourneyId(newId);
    try {
      const qs = new URLSearchParams();
      qs.set("j", newId);
      if (urlVehicle) qs.set("vehicle", urlVehicle);
      window.history.replaceState({}, "", `/booking-search?${qs.toString()}`);
    } catch { /* non-browser / SSR guard */ }
  }

  function selectVehicle(v) {
    if (browseMode) {
      // No real trip yet — a fare/booking can't be attached to nothing. Keep
      // the user HERE and reveal the trip-details panel, rather than bouncing
      // them back to the home page (which felt like the flow "resetting").
      toast(
        browseType === "group"
          ? "Choose a trip type and fill in the details on the left to get a real fare."
          : "Set your pickup, drop and date in the trip details panel to get a real fare.",
        "error"
      );
      setShowFilters(true);
      try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch { /* SSR guard */ }
      return;
    }
    dispatch(setSelectedCab({
      vehicleId: v.id,
      fare: v.fare,
      baseFare: Math.round(v.fare / surgeMultiplier),
      surge,
      surgeMultiplier,
      surgePct: v.surgePct ?? surgePct,
      surgeFee: surge ? Math.round(v.fare - v.fare / surgeMultiplier) : 0,
      driverBhata: v.driverAllowance || v.outstation?.driverBhata || 0,
      journeyId: journey.id,
      vehicleName: v.name,
      vehicleSeats: v.seats,
      vehicleAc: v.ac,
      vehicleImg: v.img,
      vehicleImgFallback: v.imgFallback || v.img,
      // Real backend fields — carried through so checkout can render the
      // actual fare breakdown (driver allowance, night allowance, surge,
      // minimum-fare top-up, rounding) without re-quoting.
      vehicleClass: v.vehicleClass || null,
      breakdown: v.breakdown || [],
      nightAllowance: v.nightAllowance || 0,
    }));
    navigate("/checkout");
  }

  const filterPillStyle = (active) => ({
    height: 38,
    display: "inline-flex",
    alignItems: "center",
    padding: "0 16px", borderRadius: 9999, border: active ? "1.5px solid #111" : "1.5px solid #E5E5E5",
    background: active ? "#111" : "#fff", color: active ? "#FFC107" : "#666", fontWeight: 600, fontSize: 12.5, cursor: "pointer",
  });

  const groupFieldStyle = {
    padding: "9px 11px", borderRadius: 9, border: "1px solid #E5E5E5", background: "#fff",
    fontSize: 13, fontWeight: 500, color: "#111", outline: "none", width: "100%",
  };
  const groupMapBtnStyle = {
    flexShrink: 0, width: 34, height: 34, borderRadius: 9, border: "1px solid #E5E5E5", background: "#fff",
    display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#B8860B",
  };

  return (
    <main style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 22px 60px" }}>
      {/* Summary bar — real route/date/time when a search was actually
          completed; a simple heading + prompt to search when just browsing
          (e.g. arrived via a homepage tile with no trip specified yet). */}
      {browseMode ? (
        <div style={{ background: "#111", borderRadius: 18, padding: "18px 22px", color: "#fff", marginBottom: 22 }}>
          <div style={{ fontWeight: 700, fontSize: 19 }}>
            {urlVehicle
              ? "Available Vehicles"
              : browseType === "group"
                ? "Group & Coach Vehicles"
                : browseType === "fleet"
                  ? "Available Vehicles"
                  : "Browse Our Fleet"}
          </div>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,.6)", margin: "4px 0 0" }}>
            Set your trip details in the filters panel to get a real fare.
          </p>
        </div>
      ) : (
        <div style={{ background: "#111", borderRadius: 18, padding: "18px 22px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "16px 26px", color: "#fff", marginBottom: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <IconPin className="w-4 h-4 text-primary" />
            <span style={{ fontWeight: 700, fontSize: 22 }}>{journey.pickup}</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="#FFC107" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span style={{ fontWeight: 700, fontSize: 22 }}>{journey.drop}</span>
          </div>
          <span style={{ width: 1, height: 22, background: "rgba(255,255,255,.2)" }} className="hidden sm:block" />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 14, color: "rgba(255,255,255,.75)", fontWeight: 500 }}>
            <span>{journey.date}</span>
            <span>{(() => {
              if (!journey.time) return "";
              const [hh, mm] = journey.time.split(":").map(Number);
              const ap = hh < 12 ? "AM" : "PM";
              const h  = hh % 12 || 12;
              return `${h}:${String(mm).padStart(2,"0")} ${ap}`;
            })()}</span>
            <span style={{ textTransform: "capitalize" }}>{journey.tripType?.replace("-", " ")}</span>
            {journey.passengers && <span>{journey.passengers} passenger(s)</span>}
          </div>
          <button
            onClick={() => navigate("/#booking")}
            className="hover:!bg-[#FFB300]"
            style={{ marginLeft: "auto", padding: "10px 18px", borderRadius: 9999, background: "#FFC107", color: "#111", fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer" }}
          >
            Modify Search
          </button>
        </div>
      )}

      {surge && (
        <div style={{ marginBottom: 22, background: "#FFF4E5", border: "1px solid #FBBF77", borderRadius: 12, padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
          <IconZap className="w-5 h-5 text-amber-500 shrink-0" />
          <div>
            <b style={{ color: "#92400E", fontSize: 14.5 }}>Surge pricing active — {surgePct}% added</b>
            <p style={{ color: "#B45309", fontSize: 13, margin: 0 }}>
              {realSurge?.surgeTier ? `Demand is high in this area right now. ` : ""}
              Prices below already include this fee.
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <StateBlock icon={<Spinner />} title="Finding available cabs…" description="Matching vehicles to your journey." />
      ) : serviceAreaError ? (
        <div style={{ maxWidth: 520, margin: "40px auto", background: "#fff", border: "1px solid #EFEFEF", borderRadius: 20, padding: 32, textAlign: "center" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#FFF7ED", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M12 21s7-5.5 7-11a7 7 0 10-14 0c0 5.5 7 11 7 11z" stroke="#F59E0B" strokeWidth="2" strokeLinejoin="round"/>
              <circle cx="12" cy="10" r="2" fill="#F59E0B"/>
            </svg>
          </div>
          <h3 style={{ fontWeight: 700, fontSize: 18, margin: "0 0 10px", color: "#111" }}>Location Outside Service Area</h3>
          <p style={{ fontSize: 14, color: "#666", lineHeight: 1.6, margin: "0 0 6px" }}>
            ABHI CABS operates across <strong>Karnataka, Telangana, Andhra Pradesh and Maharashtra</strong>.
          </p>
          <p style={{ fontSize: 13.5, color: "#888", lineHeight: 1.6, margin: "0 0 22px" }}>
            Your selected location appears to be outside our service states. Please enter a valid
            pickup address within one of our operating states and try again.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <a
              href="/#booking"
              style={{ display: "block", padding: "13px 0", borderRadius: 12, background: "#FFC107", color: "#111", fontWeight: 700, fontSize: 15, textDecoration: "none" }}
            >
              ← Change Pickup Location
            </a>
            <a
              href="/#contact-form"
              style={{ display: "block", padding: "13px 0", borderRadius: 12, border: "1.5px solid #E5E5E5", color: "#555", fontWeight: 600, fontSize: 14, textDecoration: "none" }}
            >
              Request a Custom Booking
            </a>
          </div>
        </div>
      ) : (
        <>
        {/* Seater pre-selected banner */}
        {urlSeater && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#FFFBEA", border: "1.5px solid #FFC107", borderRadius: 12, padding: "12px 16px", marginBottom: 16 }}>
            <span style={{ fontSize: 20 }}>🚌</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 700, fontSize: 14, margin: 0, color: "#111" }}>
                Showing {urlSeater} Seater {urlVehicle ? "vehicles" : "coaches"}
              </p>
              <p style={{ fontSize: 12.5, color: "#666", margin: "2px 0 0" }}>
                {urlVehicle ? "Your selected vehicle is shown first." : `Vehicles with ${urlSeater} seats are pre-filtered below.`}
              </p>
            </div>
            <button
              onClick={() => { setSeatFilters([]); window.history.replaceState({}, "", "/booking-search?type=group"); }}
              style={{ background: "none", border: "none", color: "#B8860B", fontWeight: 600, fontSize: 12.5, cursor: "pointer", textDecoration: "underline", whiteSpace: "nowrap" }}
            >
              Clear
            </button>
          </div>
        )}

        {/* Mobile filter toggle */}
        <div className="lg:hidden mb-3">
          <button
            onClick={() => setShowFilters(v => !v)}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 10, border: "1.5px solid #E5E5E5", background: "#fff", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 6h16M7 12h10M10 18h4" stroke="#111" strokeWidth="2" strokeLinecap="round"/></svg>
            {showFilters ? "Hide Filters" : "Show Filters"}
          </button>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 22, alignItems: "flex-start" }}>
          {/* FILTERS */}
          <aside className={showFilters ? "" : "hidden lg:block"} style={{ flex: "1 1 240px", minWidth: "min(100%,240px)", position: "sticky", top: 120, background: "#fff", border: "1px solid #EFEFEF", borderRadius: 18, padding: 22 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ fontWeight: 700, fontSize: 16, margin: 0 }}>Filters</h3>
              <button onClick={clearFilters} style={{ background: "none", border: "none", color: "#B8860B", fontWeight: 600, fontSize: 12.5, cursor: "pointer" }}>Clear all</button>
            </div>

            {/* ── Trip details (browse mode only — set trip type + route inline) ── */}
            {browseMode && (
              <div style={{ marginBottom: 22, paddingBottom: 20, borderBottom: "1px solid #F0F0F0" }}>
                <div style={{ fontWeight: 600, fontSize: 12, color: "#666", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 10 }}>Trip Type</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                  {[
                    { key: "one-way",    label: "One Way"    },
                    { key: "round-trip", label: "Round Trip" },
                    { key: "local",      label: "Local"      },
                    { key: "airport",    label: "Airport"    },
                  ].map((t) => (
                    <button
                      key={t.key}
                      onClick={() => setInlineTrip((f) => ({ ...f, tripType: t.key }))}
                      style={filterPillStyle(inlineTrip.tripType === t.key)}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {/* From + To — stacked (sidebar is narrow) */}
                  {inlineTrip.tripType !== "local" && (
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: ".05em", display: "block", marginBottom: 5 }}>
                        {inlineTrip.tripType === "airport" ? "Pickup" : "From"}
                      </label>
                      <div style={{ display: "flex", gap: 6 }}>
                        <input
                          ref={attachInlineAc("pickup", inlinePickupAcRef)}
                          value={inlineTrip.pickup}
                          onChange={setInline("pickup")}
                          placeholder="Pickup location"
                          style={{ flex: 1, height: 42, borderRadius: 9, border: "1px solid #E5E5E5", padding: "0 12px", fontSize: 13, outline: "none", minWidth: 0 }}
                        />
                        <button type="button" onClick={() => setInlineMapField("pickup")} title="Pick on map"
                          style={{ flexShrink: 0, width: 42, height: 42, borderRadius: 9, border: "1px solid #E5E5E5", background: "#FFFBEB", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>📍</button>
                      </div>
                    </div>
                  )}

                  {(inlineTrip.tripType === "one-way" || inlineTrip.tripType === "round-trip" || inlineTrip.tripType === "airport") && (
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: ".05em", display: "block", marginBottom: 5 }}>To</label>
                      <div style={{ display: "flex", gap: 6 }}>
                        <input
                          ref={attachInlineAc("drop", inlineDropAcRef)}
                          value={inlineTrip.drop}
                          onChange={setInline("drop")}
                          placeholder="Destination"
                          style={{ flex: 1, height: 42, borderRadius: 9, border: "1px solid #E5E5E5", padding: "0 12px", fontSize: 13, outline: "none", minWidth: 0 }}
                        />
                        <button type="button" onClick={() => setInlineMapField("drop")} title="Pick on map"
                          style={{ flexShrink: 0, width: 42, height: 42, borderRadius: 9, border: "1px solid #E5E5E5", background: "#FFFBEB", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>📍</button>
                      </div>
                    </div>
                  )}

                  {/* Stops (one-way & round-trip) */}
                  {(inlineTrip.tripType === "one-way" || inlineTrip.tripType === "round-trip") && (
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: ".05em", display: "block", marginBottom: 5 }}>Stops</label>
                      {(inlineTrip.stops || []).map((s, i) => (
                        <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                          <input value={s} onChange={(e) => setInlineTrip((f) => { const st = [...(f.stops||[])]; st[i] = e.target.value; return { ...f, stops: st }; })} placeholder={`Stop ${i + 1}`}
                            style={{ flex: 1, height: 42, borderRadius: 9, border: "1px solid #E5E5E5", padding: "0 12px", fontSize: 13, outline: "none", minWidth: 0 }} />
                          <button type="button" onClick={() => setInlineTrip((f) => ({ ...f, stops: (f.stops||[]).filter((_, x) => x !== i) }))}
                            style={{ flexShrink: 0, width: 38, height: 42, borderRadius: 9, border: "1px solid #E5E5E5", background: "#fff", cursor: "pointer" }}>−</button>
                        </div>
                      ))}
                      {(inlineTrip.stops || []).length < 4 && (
                        <button type="button" onClick={() => setInlineTrip((f) => ({ ...f, stops: [...(f.stops||[]), ""] }))}
                          style={{ background: "none", border: "none", color: "#B8860B", fontWeight: 600, fontSize: 12.5, cursor: "pointer", padding: "2px 0" }}>+ Add a stop</button>
                      )}
                    </div>
                  )}

                  {/* Date + Time — stacked */}
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: ".05em", display: "block", marginBottom: 5 }}>Date</label>
                    <input type="date" min={today} value={inlineTrip.date} onChange={setInline("date")}
                      style={{ width: "100%", height: 42, borderRadius: 9, border: "1px solid #E5E5E5", padding: "0 12px", fontSize: 13, outline: "none" }} />
                  </div>

                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: ".05em", display: "block", marginBottom: 5 }}>Time</label>
                    <input type="time" value={inlineTrip.time} onChange={setInline("time")}
                      style={{ width: "100%", height: 42, borderRadius: 9, border: "1px solid #E5E5E5", padding: "0 12px", fontSize: 13, outline: "none" }} />
                  </div>

                  {inlineTrip.tripType === "round-trip" && (
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: ".05em", display: "block", marginBottom: 5 }}>Return Date</label>
                      <input type="date" min={inlineTrip.date || today} value={inlineTrip.returnDate} onChange={setInline("returnDate")}
                        style={{ width: "100%", height: 42, borderRadius: 9, border: "1px solid #E5E5E5", padding: "0 12px", fontSize: 13, outline: "none" }} />
                    </div>
                  )}

                  <button onClick={submitInlineTrip}
                    style={{ height: 46, borderRadius: 9999, border: "none", background: "#FFC107", color: "#111", fontWeight: 800, fontSize: 14, cursor: "pointer", marginTop: 4 }}>
                    Search Available Cabs →
                  </button>
                </div>
              </div>
            )}

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 600, fontSize: 12, color: "#666", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 10 }}>Vehicle Type</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <button onClick={() => setTypeFilters([])} style={filterPillStyle(typeFilters.length === 0)}>All</button>
                {availableTypes.map((t) => (
                  <button key={t} onClick={() => toggleType(t)} style={filterPillStyle(typeFilters.includes(t))}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 600, fontSize: 12, color: "#666", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 10 }}>Seats</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {availableSeats.map((s) => (
                  <button key={s} onClick={() => toggleSeat(s)} style={filterPillStyle(seatFilters.includes(s))}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 600, fontSize: 12, color: "#666", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 10 }}>AC</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setAc("all")} style={filterPillStyle(ac === "all")}>All</button>
                <button onClick={() => setAc("on")} style={filterPillStyle(ac === "on")}>AC</button>
                <button onClick={() => setAc("off")} style={filterPillStyle(ac === "off")}>Non-AC</button>
              </div>
            </div>

            <div>
              <div style={{ fontWeight: 600, fontSize: 12, color: "#666", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 10 }}>Sort By</div>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                style={{ width: "100%", padding: "11px 12px", borderRadius: 11, border: "1.5px solid #E5E5E5", background: "#F7F7F7", fontSize: 13.5, fontWeight: 500, color: "#111" }}
              >
                <option value="recommended">Recommended</option>
                <option value="lowhigh">Price: Low → High</option>
                <option value="highlow">Price: High → Low</option>
              </select>
            </div>
          </aside>

          {/* RESULTS */}
          <div style={{ flex: "1 1 560px", minWidth: "min(100%,320px)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h2 style={{ fontWeight: 700, fontSize: 19, margin: 0 }}>Available Vehicles</h2>
              <span style={{ fontSize: 13, color: "#666", fontWeight: 500 }}>{vehicles.length} found</span>
            </div>

            {vehicles.length === 0 ? (
              <div style={{ background: "#fff", border: "1px dashed #E5E5E5", borderRadius: 20, padding: 48, textAlign: "center" }}>
                <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 6 }}>No vehicles match these filters</div>
                <p style={{ fontSize: 14, color: "#666", margin: "0 0 16px" }}>Try clearing some filters or reducing passenger count.</p>
                <button onClick={clearFilters} style={{ height: 48, padding: "0 28px", borderRadius: 9999, background: "#111", color: "#fff", fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer" }}>Clear Filters</button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {[...vehicles].sort((a, b) => {
                  // Pin the URL-selected vehicle to the top
                  if (urlVehicle) {
                    if (a.id === urlVehicle) return -1;
                    if (b.id === urlVehicle) return 1;
                  }
                  return 0;
                }).map((v, idx) => {
                  const type = getVehicleType(v);
                  const isPinned = urlVehicle && v.id === urlVehicle;
                  // Use vehicleClass+idx as key to guarantee uniqueness even if
                  // two catalogue entries share the same id after merging
                  const cardKey = `${v.vehicleClass || v.id || "v"}-${idx}`;
                  return (
                    <div key={cardKey} className="vehicle-card-wrap" style={{ background: "#fff", border: isPinned ? "2px solid #FFC107" : "1px solid #EFEFEF", borderRadius: 20, overflow: "hidden", display: "flex", flexWrap: "wrap", position: "relative", boxShadow: isPinned ? "0 0 0 4px rgba(255,193,7,.15)" : "none" }}>
                      {isPinned && (
                        <div style={{ position: "absolute", top: 14, left: 14, zIndex: 10, background: "#FFC107", color: "#111", fontSize: 11, fontWeight: 700, letterSpacing: ".06em", padding: "3px 10px", borderRadius: 9999, textTransform: "uppercase" }}>
                          ✓ Your Selection
                        </div>
                      )}
                      <div className="vehicle-card-image" style={{ flex: "1 1 320px", minWidth: "min(100%, 280px)", minHeight: 200, position: "relative" }}>
                        <img src={v.img || v.imgFallback} alt={v.name} onError={(e) => { const fb = v.imgFallback || "/images/sedan-studio.jpg"; if (e.currentTarget.src.indexOf(fb) === -1) { e.currentTarget.src = fb; } }} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", position: "absolute", inset: 0 }} />
                      </div>
                      <div style={{ flex: "2 1 320px", padding: "20px 22px", display: "flex", flexDirection: "column" }}>
                        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                          <h3 style={{ fontWeight: 700, fontSize: 20, margin: 0 }}>{v.name}</h3>
                          <span style={{ fontSize: 11.5, fontWeight: 600, color: "#111", background: "#FFF7DE", padding: "4px 10px", borderRadius: 9999 }}>{type}</span>
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, margin: "10px 0 14px", fontSize: 12.5, color: "#666", fontWeight: 500 }}>
                          <span>{v.seats} Seater</span>
                          <span>{v.ac ? "A/C" : "Non-A/C"}</span>
                          <span>{v.bags} Bags</span>
                        </div>
                        {!browseMode && v.vehicleClass ? (
                          // Real quote for THIS journey, straight from the backend —
                          // not a rate-card reference number.
                          <div style={{ padding: "12px 0", borderTop: "1px dashed #EFEFEF", borderBottom: "1px dashed #EFEFEF", marginBottom: 14 }}>
                            <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                              <span style={{ fontWeight: 800, fontSize: 22, color: "#111" }}>{fmtINR(v.fare)}</span>
                              <span style={{ fontSize: 12, color: "#999" }}>total for this trip</span>
                              {v.surge && (
                                <span style={{ fontSize: 11, fontWeight: 700, color: "#B45309", background: "#FFF4E5", padding: "3px 9px", borderRadius: 9999 }}>
                                  +{v.surgePct}% surge
                                </span>
                              )}
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 6, fontSize: 11.5, color: "#888" }}>
                              {v.driverAllowance > 0 && <span>Incl. driver allowance {fmtINR(v.driverAllowance)}</span>}
                              {v.nightAllowance > 0 && <span>Incl. night allowance {fmtINR(v.nightAllowance)}</span>}
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 24, padding: "12px 0", borderTop: "1px dashed #EFEFEF", borderBottom: "1px dashed #EFEFEF", marginBottom: 14 }}>
                            <div><div style={{ fontSize: 11, color: "#999", fontWeight: 500 }}>Local (8/12 hr · 80 km)</div><div style={{ fontWeight: 700, fontSize: 15, color: "#111" }}>{fmtINR(v.local?.base8hr80km ?? 0)}</div></div>
                            <div><div style={{ fontSize: 11, color: "#999", fontWeight: 500 }}>Outstation per km</div><div style={{ fontWeight: 700, fontSize: 15, color: "#B8860B" }}>₹{v.outstation?.perKm ?? 0}/km</div></div>
                            <div><div style={{ fontSize: 11, color: "#999", fontWeight: 500 }}>Extra KM</div><div style={{ fontWeight: 700, fontSize: 15, color: "#111" }}>₹{v.local?.extraKm ?? 0}/km</div></div>
                          </div>
                        )}
                        <div style={{ display: "flex", gap: 10, marginTop: "auto", flexWrap: "wrap" }}>
                          <button
                            onClick={() => { dispatch(setSelectedCab({ vehicleId: v.id, fare: v.fare, journeyId: journey.id, img: v.img, vehicleImg: v.img, vehicleImgFallback: v.imgFallback || v.img })); navigate("/cab-details"); }}
                            style={{ flex: "1 1 140px", height: 48, borderRadius: 9999, border: "2px solid #111", background: "#fff", color: "#111", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
                          >
                            View Details
                          </button>
                          <button
                            onClick={() => selectVehicle(v)}
                            className="hover:!bg-[#FFB300]"
                            style={{ flex: "1 1 140px", height: 48, borderRadius: 9999, border: "none", background: "#FFC107", color: "#111", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
                          >
                            Select Vehicle
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <p style={{ marginTop: 18, fontSize: 11.5, color: "#999", fontWeight: 400, textAlign: "center" }}>
              {apiVehicles?.length
                ? "Fares are calculated live for your exact route, including surge, driver allowance and night charges where they apply."
                : "Showing sample fares from the rate sheet — search a real trip above to get live pricing for your route."}
            </p>
          </div>
        </div>
        </>
      )}

      {/* Map picker for the inline trip form */}
      <LocationMapPicker
        open={!!inlineMapField}
        title={inlineMapField === "drop" ? "Select Drop Location" : "Select Pickup Location"}
        initialAddress={inlineMapField ? inlineTrip[inlineMapField] : ""}
        onClose={() => setInlineMapField(null)}
        onConfirm={(address) => {
          setInlineTrip((f) => ({ ...f, [inlineMapField]: address }));
          setInlineMapField(null);
        }}
      />
    </main>
  );
}

function MapPinIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M9 20l-6-3V4l6 3 6-3 6 3v13l-6-3-6 3z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M9 4v13M15 7v13" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}