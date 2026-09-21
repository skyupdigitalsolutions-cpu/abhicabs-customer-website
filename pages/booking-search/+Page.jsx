import React, { useEffect, useMemo, useState, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { usePageContext } from "vike-react/usePageContext";
import { navigate } from "vike/client/router";
import { selectJourney, createJourney } from "../../src/store/slices/journeySlice";
import { setSelectedCab } from "../../src/store/slices/selectionSlice";
import { VEHICLE_RATES, fmtINR } from "../../src/data/mockData";
import { faresApi } from "../../src/api";
import StateBlock, { Spinner } from "../../src/components/StateBlock";
import { IconPin, IconZap } from "../../src/components/Icons";
import { useToast } from "../../src/hooks/useToast";
import { useJsApiLoader, Autocomplete } from "@react-google-maps/api";
import { GOOGLE_MAPS_API_KEY } from "../../src/api/config";
import LocationMapPicker from "../../src/components/LocationMapPicker";

const MAPS_LIBRARIES = ["places"];

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
  const journey = useSelector(selectJourney(journeyId));
  // FIX: this used to check `!journey` — but selectJourney(id) falls back
  // to the user's last real search (from localStorage) whenever no id is
  // given, specifically so pages like Confirmation/Checkout can be
  // resilient to a missing param. That same fallback was fooling this page:
  // arriving via a homepage tile (no ?j= at all) would silently pick up a
  // real, unrelated past search and render it as if it were the current
  // one. Checking the URL param itself, not the resolved journey, is the
  // only way to tell "no search was actually done" from "a search was
  // done and its id happens to match the fallback".
  const browseMode = !journeyId;

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
  // Only meaningful in Group/Coach browse mode, where there's no real trip
  // type yet — lets the customer indicate one here, which then carries
  // through to a real search (see selectVehicle) instead of being lost.
  const [tripTypeFilter, setTripTypeFilter] = useState(null);
  // Inline trip-detail fields for the Group/Coach filter — filled in right
  // here instead of redirecting to the homepage widget, so the customer
  // never loses their place. Same field set BookingWidget itself collects.
  const [groupTripFields, setGroupTripFields] = useState({ pickup: "", drop: "", date: "", time: "", returnDate: "" });
  const todayStr = new Date().toISOString().slice(0, 10);
  // Via stops — same feature as the main booking widget, and same
  // restriction: only meaningful for one-way/round-trip (a Local package or
  // an Airport transfer doesn't have intermediate stops the way a
  // point-to-point trip does).
  const [groupStops, setGroupStops] = useState([]);
  function addGroupStop() {
    if (groupStops.length >= 4) return;
    setGroupStops((s) => [...s, ""]);
  }
  function updateGroupStop(i, val) {
    setGroupStops((s) => s.map((v, idx) => (idx === i ? val : v)));
  }
  function removeGroupStop(i) {
    setGroupStops((s) => s.filter((_, idx) => idx !== i));
  }

  // Real map integration — same Google Places Autocomplete + map-pin
  // picker used on the main booking widget, so these fields aren't a
  // step down just because they live in a filter sidebar.
  const { isLoaded: mapsLoaded } = useJsApiLoader({
    id: "abhi-cabs-google-maps",
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: MAPS_LIBRARIES,
  });
  const groupPickupAutoRef = useRef(null);
  const groupDropAutoRef = useRef(null);
  const [groupMapPickerField, setGroupMapPickerField] = useState(null);

  function makeGroupAutocomplete(key, ref) {
    return {
      onLoad: (autocomplete) => { ref.current = autocomplete; autocomplete.setComponentRestrictions({ country: "in" }); },
      onPlaceChanged: () => {
        const place = ref.current?.getPlace();
        const value = place?.formatted_address || place?.name;
        if (value) setGroupTripFields((f) => ({ ...f, [key]: value }));
      },
    };
  }
  const groupPickupAutocomplete = mapsLoaded && GOOGLE_MAPS_API_KEY ? makeGroupAutocomplete("pickup", groupPickupAutoRef) : null;
  const groupDropAutocomplete = mapsLoaded && GOOGLE_MAPS_API_KEY ? makeGroupAutocomplete("drop", groupDropAutoRef) : null;

  useEffect(() => {
    if (tripTypeFilter === "local" || tripTypeFilter === "airport") setGroupStops([]);
  }, [tripTypeFilter]);

  function submitGroupTrip() {
    if (!groupTripFields.pickup.trim()) { toast("Please enter a pickup location", "error"); return; }
    if (tripTypeFilter !== "local" && !groupTripFields.drop.trim()) { toast("Please enter a drop location", "error"); return; }
    if (!groupTripFields.date || !groupTripFields.time) { toast("Please choose a date and time", "error"); return; }
    if (tripTypeFilter === "round-trip" && !groupTripFields.returnDate) { toast("Please choose a return date", "error"); return; }
    const filledStops = groupStops.filter((s) => s.trim());
    if (groupStops.length > 0 && filledStops.length < groupStops.length) {
      toast("Please fill in all via stop fields or remove empty ones", "error"); return;
    }

    const action = dispatch(createJourney({
      tripType: tripTypeFilter,
      pickup: groupTripFields.pickup.trim(),
      drop: tripTypeFilter === "local" ? "" : groupTripFields.drop.trim(),
      stops: filledStops,
      date: groupTripFields.date,
      time: groupTripFields.time,
      returnDate: tripTypeFilter === "round-trip" ? groupTripFields.returnDate : "",
      returnTime: "18:00",
      package: tripTypeFilter === "local" ? "8hr80km" : "",
      passengers: "2",
    }));
    // type=group is kept in the URL alongside the new real journey id, so
    // the vehicle list stays scoped to Coach vehicles (see `source` below)
    // even though this is no longer a browse-only view.
    navigate(`/booking-search?j=${action.payload.id}&type=group`);
  }

  const [ac, setAc] = useState("all"); // all | on | off
  const [sort, setSort] = useState("recommended");

  const surge = !browseMode && (journey?.surge || false);
  const surgeMultiplier = !browseMode && journey?.surgeMultiplier ? journey.surgeMultiplier : 1.0;

  useEffect(() => {
    if (browseMode || !journey) return;
    let cancelled = false;
    setLoading(true);
    setServiceAreaError(null);
    faresApi.getFareOptions(journey)
      .then((options) => { if (!cancelled) setApiVehicles(options); })
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
  const allSource = apiVehicles && apiVehicles.length ? apiVehicles : VEHICLE_RATES;
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
    setTypeFilters([]); setSeatFilters([]); setAc("all"); setSort("recommended"); setTripTypeFilter(null);
  }

  function selectVehicle(v) {
    if (browseMode) {
      // No real trip yet — a fare/booking can't be attached to nothing.
      // For Group/Coach, the fix is right there in the sidebar (Trip Type +
      // its fields); for a generic browse visit, send them to the real
      // booking widget instead.
      if (browseType === "group") {
        toast("Please choose a trip type and fill in the details in the filter to get a real fare.", "error");
      } else {
        toast("Please enter your pickup, drop and date to get a real fare for this vehicle.");
        navigate("/#booking");
      }
      return;
    }
    dispatch(setSelectedCab({
      vehicleId: v.id,
      fare: v.fare,
      baseFare: Math.round(v.fare / surgeMultiplier),
      surge,
      surgeMultiplier,
      surgeFee: surge ? Math.round(v.fare - v.fare / surgeMultiplier) : 0,
      driverBhata: v.outstation?.driverBhata || 0,
      journeyId: journey.id,
      vehicleName: v.name,
      vehicleSeats: v.seats,
      vehicleAc: v.ac,
    }));
    navigate("/checkout");
  }

  const filterPillStyle = (active) => ({
    padding: "8px 14px", borderRadius: 9999, border: active ? "1.5px solid #111" : "1.5px solid #E5E5E5",
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
        <div style={{ background: "#111", borderRadius: 18, padding: "18px 22px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "14px 20px", color: "#fff", marginBottom: 22 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 19 }}>
              {browseType === "group" ? "Group & Coach Vehicles" : "Browse Our Fleet"}
            </div>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,.6)", margin: "4px 0 0" }}>
              Enter your pickup, drop and date to get a real fare for any of these.
            </p>
          </div>
          <button
            onClick={() => navigate("/#booking")}
            className="hover:!bg-[#FFB300]"
            style={{ marginLeft: "auto", padding: "10px 18px", borderRadius: 9999, background: "#FFC107", color: "#111", fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer" }}
          >
            Start a Search
          </button>
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
            <span>{journey.time}</span>
            <span>{journey.tripType}</span>
            <span>{journey.passengers} passenger(s)</span>
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
            <b style={{ color: "#92400E", fontSize: 14.5 }}>Surge pricing active — 5% added</b>
            <p style={{ color: "#B45309", fontSize: 13, margin: 0 }}>Immediate bookings (within 30 mins) carry a 5% surge. Prices below include this fee.</p>
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
                Showing {urlSeater} Seater coaches
              </p>
              <p style={{ fontSize: 12.5, color: "#666", margin: "2px 0 0" }}>
                Vehicles with {urlSeater} seats are pre-filtered below.
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

            {browseType === "group" && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontWeight: 600, fontSize: 12, color: "#666", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 10 }}>Trip Type</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {[
                    { key: "one-way", label: "One Way" },
                    { key: "round-trip", label: "Round Trip" },
                    { key: "local", label: "Local" },
                    { key: "airport", label: "Airport" },
                  ].map((t) => (
                    <button
                      key={t.key}
                      onClick={() => setTripTypeFilter(tripTypeFilter === t.key ? null : t.key)}
                      style={filterPillStyle(tripTypeFilter === t.key)}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Filled in right here instead of redirecting anywhere —
                    exactly the fields BookingWidget itself would ask for
                    this trip type. */}
                {tripTypeFilter && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12, padding: 12, background: "#FAFAFA", border: "1px solid #EFEFEF", borderRadius: 12 }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      {groupPickupAutocomplete ? (
                        <Autocomplete onLoad={groupPickupAutocomplete.onLoad} onPlaceChanged={groupPickupAutocomplete.onPlaceChanged} className="flex-1 min-w-0">
                          <input
                            placeholder="Pickup city"
                            value={groupTripFields.pickup}
                            onChange={(e) => setGroupTripFields((f) => ({ ...f, pickup: e.target.value }))}
                            style={groupFieldStyle}
                          />
                        </Autocomplete>
                      ) : (
                        <input
                          placeholder="Pickup city"
                          value={groupTripFields.pickup}
                          onChange={(e) => setGroupTripFields((f) => ({ ...f, pickup: e.target.value }))}
                          style={{ ...groupFieldStyle, flex: 1 }}
                        />
                      )}
                      <button type="button" onClick={() => setGroupMapPickerField("pickup")} aria-label="Pick pickup on map" style={groupMapBtnStyle}>
                        <MapPinIcon />
                      </button>
                    </div>

                    {/* Via stops — same feature as the main widget, only for
                        one-way/round-trip trips. */}
                    {(tripTypeFilter === "one-way" || tripTypeFilter === "round-trip") && (
                      <>
                        {groupStops.map((stop, i) => (
                          <div key={i} style={{ display: "flex", gap: 6 }}>
                            <input
                              placeholder={`Via Stop ${i + 1}`}
                              value={stop}
                              onChange={(e) => updateGroupStop(i, e.target.value)}
                              style={{ ...groupFieldStyle, flex: 1 }}
                            />
                            <button type="button" onClick={() => removeGroupStop(i)} aria-label="Remove stop" style={{ ...groupMapBtnStyle, color: "#B23B00" }}>
                              −
                            </button>
                          </div>
                        ))}
                        {groupStops.length < 4 && (
                          <button
                            type="button"
                            onClick={addGroupStop}
                            style={{ alignSelf: "flex-start", background: "none", border: "none", color: "#B8860B", fontWeight: 700, fontSize: 12, cursor: "pointer", padding: "2px 0" }}
                          >
                            + Add a Stop
                          </button>
                        )}
                      </>
                    )}
                    {tripTypeFilter !== "local" && (
                      <div style={{ display: "flex", gap: 6 }}>
                        {groupDropAutocomplete ? (
                          <Autocomplete onLoad={groupDropAutocomplete.onLoad} onPlaceChanged={groupDropAutocomplete.onPlaceChanged} className="flex-1 min-w-0">
                            <input
                              placeholder={tripTypeFilter === "airport" ? "Airport / destination" : "Drop city"}
                              value={groupTripFields.drop}
                              onChange={(e) => setGroupTripFields((f) => ({ ...f, drop: e.target.value }))}
                              style={groupFieldStyle}
                            />
                          </Autocomplete>
                        ) : (
                          <input
                            placeholder={tripTypeFilter === "airport" ? "Airport / destination" : "Drop city"}
                            value={groupTripFields.drop}
                            onChange={(e) => setGroupTripFields((f) => ({ ...f, drop: e.target.value }))}
                            style={{ ...groupFieldStyle, flex: 1 }}
                          />
                        )}
                        <button type="button" onClick={() => setGroupMapPickerField("drop")} aria-label="Pick drop on map" style={groupMapBtnStyle}>
                          <MapPinIcon />
                        </button>
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        type="date"
                        min={todayStr}
                        value={groupTripFields.date}
                        onChange={(e) => setGroupTripFields((f) => ({ ...f, date: e.target.value }))}
                        style={{ ...groupFieldStyle, flex: 1 }}
                      />
                      <input
                        type="time"
                        value={groupTripFields.time}
                        onChange={(e) => setGroupTripFields((f) => ({ ...f, time: e.target.value }))}
                        style={{ ...groupFieldStyle, flex: 1 }}
                      />
                    </div>
                    {tripTypeFilter === "round-trip" && (
                      <input
                        type="date"
                        min={groupTripFields.date || todayStr}
                        value={groupTripFields.returnDate}
                        onChange={(e) => setGroupTripFields((f) => ({ ...f, returnDate: e.target.value }))}
                        style={groupFieldStyle}
                        placeholder="Return date"
                      />
                    )}
                    <button
                      onClick={submitGroupTrip}
                      className="hover:!bg-[#FFB300]"
                      style={{ marginTop: 4, padding: "10px", borderRadius: 9, border: "none", background: "#FFC107", color: "#111", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
                    >
                      Search
                    </button>
                  </div>
                )}
              </div>
            )}

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
                <button onClick={clearFilters} style={{ padding: "11px 22px", borderRadius: 9999, background: "#111", color: "#fff", fontWeight: 600, fontSize: 13.5, border: "none", cursor: "pointer" }}>Clear Filters</button>
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
                        <img src={v.img} alt={v.name} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", position: "absolute", inset: 0 }} />
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
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 24, padding: "12px 0", borderTop: "1px dashed #EFEFEF", borderBottom: "1px dashed #EFEFEF", marginBottom: 14 }}>
                          <div><div style={{ fontSize: 11, color: "#999", fontWeight: 500 }}>Local (8/12 hr · 80 km)</div><div style={{ fontWeight: 700, fontSize: 15, color: "#111" }}>{fmtINR(v.local?.base8hr80km ?? 0)}</div></div>
                          <div><div style={{ fontSize: 11, color: "#999", fontWeight: 500 }}>Outstation per km</div><div style={{ fontWeight: 700, fontSize: 15, color: "#B8860B" }}>₹{v.outstation?.perKm ?? 0}/km</div></div>
                          <div><div style={{ fontSize: 11, color: "#999", fontWeight: 500 }}>Extra KM</div><div style={{ fontWeight: 700, fontSize: 15, color: "#111" }}>₹{v.local?.extraKm ?? 0}/km</div></div>
                        </div>
                        <div style={{ display: "flex", gap: 10, marginTop: "auto", flexWrap: "wrap" }}>
                          <button
                            onClick={() => { dispatch(setSelectedCab({ vehicleId: v.id, fare: v.fare, journeyId: journey.id })); navigate("/cab-details"); }}
                            style={{ flex: "1 1 130px", padding: 12, borderRadius: 11, border: "1.5px solid #111", background: "#fff", color: "#111", fontWeight: 600, fontSize: 13.5, cursor: "pointer" }}
                          >
                            View Details
                          </button>
                          <button
                            onClick={() => selectVehicle(v)}
                            className="hover:!bg-[#FFB300]"
                            style={{ flex: "1 1 130px", padding: 12, borderRadius: 11, border: "none", background: "#FFC107", color: "#111", fontWeight: 700, fontSize: 13.5, cursor: "pointer" }}
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
              Fares are from the client rate sheet. Outstation totals use a sample 150 km estimate until a routing API is connected.
            </p>
          </div>
        </div>
        </>
      )}

      <LocationMapPicker
        open={!!groupMapPickerField}
        title={groupMapPickerField === "drop" ? "Select Drop Location" : "Select Pickup Location"}
        initialAddress={groupMapPickerField ? groupTripFields[groupMapPickerField] : ""}
        onClose={() => setGroupMapPickerField(null)}
        onConfirm={(address) => {
          setGroupTripFields((f) => ({ ...f, [groupMapPickerField]: address }));
          setGroupMapPickerField(null);
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