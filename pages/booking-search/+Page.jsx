import React, { useEffect, useMemo, useState, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { usePageContext } from "vike-react/usePageContext";
import { navigate } from "vike/client/router";
import { selectJourney, createJourney } from "../../src/store/slices/journeySlice";
import { setSelectedCab } from "../../src/store/slices/selectionSlice";
import { fmtINR, shortAddress, toBackendVehicleClass } from "../../src/data/mockData";
import useVehicleCatalogue from "../../src/hooks/useVehicleCatalogue";
import { faresApi, bookingsApi } from "../../src/api";
import StateBlock, { Spinner } from "../../src/components/StateBlock";
import { IconPin, IconZap } from "../../src/components/Icons";
import { useToast } from "../../src/hooks/useToast";
import { GOOGLE_MAPS_API_KEY } from "../../src/api/config";
import { isSameCityTrip, ensureCitiesLoaded } from "../../src/api/cities";
import { AIRPORTS } from "../../src/data/airports";
import BackLink, { recordNavStep } from "../../src/components/BackLink";
import LocationMapPicker from "../../src/components/LocationMapPicker";


// Derives a customer-facing "type" from the vehicle's real name, since the
// raw `category` field (sedan/suv/premium/tempo/bus/luxury) doesn't match
// how these are actually grouped for browsing — e.g. "Force Urbania" and
// "20 Seater Urbania Premium" both carry category:"tempo"/"luxury" but are
// genuinely a distinct type from a plain Tempo Traveller.
// Local calendar date (not UTC — toISOString() is a day behind in India
// between 00:00 and 05:30 IST). See BookingWidget.jsx's toISODate for the
// original fix this mirrors.
function toLocalISODate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getVehicleType(v) {
  const n = v.name.toLowerCase();
  if (n.includes("urbania")) return "Urbania";
  if (n.includes("tempo traveler") || n.includes("tempo traveller")) return "Tempo Traveller";
  if (n.includes("bharat benz") || n.includes("ashok leyland") || /\b(bus|coach)\b/.test(n)) return "Coach";
  // A vehicle this size is a coach whatever the admin named it.
  if (Number(v.seats) >= 20) return "Coach";
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
  // Read the query from the REAL address bar in the browser. This page updates
  // the URL in place (history.replaceState) when a trip is entered inline, and
  // Vike's pageContext for that history entry keeps the ORIGINAL URL — so on
  // Back from checkout pageContext said "no ?j=" and the page reopened in
  // browse mode with every location/date/time blank, even though the trip was
  // still saved. On the server (first render) both sources are the same URL.
  // …but only while the address bar is actually showing THIS page. On Back
  // from checkout the page's first render can run a beat before the address
  // bar has switched from /checkout, and reading it then made the page think
  // there was no trip and no seater; pageContext already has the right URL at
  // that moment, so fall back to it.
  const locationIsThisPage = typeof window !== "undefined" && window.location.pathname.startsWith("/booking-search");
  const search = locationIsThisPage
    ? Object.fromEntries(new URLSearchParams(window.location.search))
    : (pageContext.urlParsed?.search || {});
  const journeyId  = search.j || null;
  const browseType = search.type || null;    // e.g. "group"
  const urlSeater  = search.seater || null;  // e.g. "13" from group section
  // The vehicle the customer has committed to: from ?vehicle= (fleet card),
  // or from tapping "Book Now" on a card here (pickedKey, set below).
  // Either way, once the trip is entered it goes straight to checkout with
  // THAT vehicle — previously a card tap only opened the trip form, and after
  // searching the customer was dumped back on the list to pick it again.
  const [pickedKey, setPickedKey] = useState(null);
  const urlVehicle = search.vehicle || pickedKey || null;
  const dispatch = useDispatch();
  const toast = useToast();

  // A journey created inline (browse mode) is tracked in local state as well as
  // the URL. Client-side navigation to the SAME page with a new ?j= query does
  // not reliably refresh pageContext here (and can remount, losing it), which
  // left the page stuck in browse mode — so selecting a vehicle bounced the
  // user to /#booking. Keying browse mode off BOTH the URL and this local id
  // makes the transition happen in place, no matter how routing behaves.
  const [createdJourneyId, setCreatedJourneyId] = useState(null);
  // "Clear Locations" must beat the ?j= that pageContext still reports —
  // history.replaceState updates the address bar but NOT pageContext, so
  // without this override the cleared trip would immediately come back.
  const [locationsCleared, setLocationsCleared] = useState(false);
  const effectiveJourneyId = locationsCleared ? null : (journeyId || createdJourneyId);

  const journey = useSelector(selectJourney(effectiveJourneyId));
  // Browse mode = no real trip yet. Check the effective id (URL param OR the
  // one just created inline), NOT the resolved journey — selectJourney() falls
  // back to the last search, which would otherwise mask "no search done".
  const browseMode = !effectiveJourneyId;

  // Reset body scroll lock in case a modal from the previous page left it set
  useEffect(() => {
    document.body.style.overflow = "";
    recordNavStep("/booking-search");
    // Live serviced-city list for same-city detection. Never throws.
    ensureCitiesLoaded();
  }, []);

  const [loading, setLoading] = useState(!browseMode);
  const [apiVehicles, setApiVehicles] = useState(null);
  const [serviceAreaError, setServiceAreaError] = useState(null);
  // Any OTHER reason the backend couldn't price this trip (no rate card for
  // the city, validation, backend down). Previously an unrecognised failure
  // left both errors null and the page quietly fell back to VEHICLE_RATES
  // sample prices — which still rendered "Select Vehicle" and let the whole
  // booking go through unpriced. A trip the backend won't quote is a trip we
  // cannot take, so this now blocks selection the same way.
  const [fareError, setFareError] = useState(null);
  const [showFilters, setShowFilters] = useState(browseMode);
  // Browsing a specific vehicle (no trip yet) starts with the trip-details
  // panel already open — previously it stayed hidden until "Select Vehicle"
  // forced it open with a toast, which felt like a redundant second search
  // right after the vehicle looked already chosen ("✓ Your Selection").
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
  // Keep it in step with the address (e.g. returning with ?seater=12).
  useEffect(() => {
    if (urlSeater) setSeatFilters([Number(urlSeater)]);
  }, [urlSeater]);

  // Inline trip form (browse mode) — lets the user set trip type + details
  // right here without redirecting to the home booking widget.
  // FIX: toISOString() returns the UTC date, which is "yesterday" in India
  // between 00:00 and 05:30 IST — that silently pre-filled/pre-selected the
  // wrong (past) date and let it slip through as the min selectable date.
  // BookingWidget.jsx already had this exact fix; porting it here too.
  const today = toLocalISODate(new Date());
  const [inlineTrip, setInlineTrip] = useState({
    tripType: "one-way", pickup: "", drop: "", date: today, time: "", returnDate: "", returnTime: "", package: "8 hrs / 80 km",
    airport: "", airportTerminal: "", airportDirection: "drop", stops: [],
  });
  // Pre-fill the trip panel from the saved trip whenever one is loaded (e.g.
  // coming back from checkout), so any edit starts from what the customer
  // already chose instead of blank fields.
  useEffect(() => {
    if (!journey || !effectiveJourneyId) return;
    setInlineTrip((f) => ({
      ...f,
      tripType:   journey.tripType   || f.tripType,
      pickup:     journey.pickup     || "",
      drop:       journey.drop       || "",
      date:       journey.date       || f.date,
      time:       journey.time       || "",
      returnDate: journey.returnDate || "",
      returnTime: journey.returnTime || "",
      package:    journey.package    || f.package,
      stops:      Array.isArray(journey.stops) ? journey.stops : [],
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journey?.id, effectiveJourneyId]);
  const [inlineMapField, setInlineMapField] = useState(null);
  // Coordinates for the inline pickup/drop, used by the same-city radius test.
  const [inlinePoints, setInlinePoints] = useState({ pickup: null, drop: null });
  const setInline = (k) => (e) => {
    // Typing over a chosen place makes its coordinates stale — drop them so
    // the same-city radius test never measures a point the text no longer
    // corresponds to.
    if (k === "pickup" || k === "drop") setInlinePoints((p) => ({ ...p, [k]: null }));
    setInlineTrip((f) => ({ ...f, [k]: e.target.value }));
  };
  // Reverse pickup <-> destination for the inline edit form: swap both the
  // text fields and their captured coordinates so the same-city radius test
  // keeps measuring the right points.
  function swapPickupDrop() {
    setInlineTrip((f) => ({ ...f, pickup: f.drop, drop: f.pickup }));
    setInlinePoints((p) => ({ pickup: p.drop, drop: p.pickup }));
  }
  // Only meaningful in Group/Coach browse mode, where there's no real trip
  // type yet — lets the customer indicate one here, which then carries
  // through to a real search (see selectVehicle) instead of being lost.
  // Inline trip-detail fields for the Group/Coach filter — filled in right
  // here instead of redirecting to the homepage widget, so the customer
  // never loses their place. Same field set BookingWidget itself collects.
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
        // `geometry` is needed for the same-city (local radius) test — that
        // is a kilometre rule, so it cannot run off the address text.
        fields: ["formatted_address", "name", "geometry"],
      });
      storedRef.current.addListener("place_changed", () => {
        const p = storedRef.current.getPlace();
        const addr = p?.formatted_address || p?.name || el.value;
        const loc = p?.geometry?.location;
        const pt = loc
          ? {
              lat: typeof loc.lat === "function" ? loc.lat() : loc.lat,
              lng: typeof loc.lng === "function" ? loc.lng() : loc.lng,
            }
          : null;
        setInlineTrip((f) => ({ ...f, [field]: addr }));
        setInlinePoints((pts) => ({ ...pts, [field]: pt }));
      });
    };
  }



  const [ac, setAc] = useState("all"); // all | on | off
  const [sort, setSort] = useState("recommended");
  // When a specific vehicle was chosen up front, the priced result for it is
  // all the customer needs to continue — the rest of the catalogue is opt-in
  // via "See other vehicles", not the default answer to "I picked this one".
  const [showOtherVehicles, setShowOtherVehicles] = useState(false);
  // Same-city pickup/drop → offer an hourly package. One-time prompt.
  const [sameCityOpen, setSameCityOpen] = useState(false);
  // True while the direct-vehicle fast path is pricing the trip and heading
  // straight to checkout, so the vehicle list never flashes on screen.
  const [autoPricing, setAutoPricing] = useState(false);

  // The live fleet from GET /vehicles (public, no auth) — the admin-managed
  // catalogue. Used for browse mode, so the vehicles shown before a trip is
  // priced are the same ones the backend will actually quote, not a bundled
  // list that can drift from it.
  const {
    vehicles: catalogueList,
    loading: catalogueLoading,
    error: catalogueError,
    retry: retryCatalogue,
  } = useVehicleCatalogue();
  const catalogue = catalogueList.length ? catalogueList : null;
  const [sameCityAsked, setSameCityAsked] = useState(false);

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
    setFareError(null);
    faresApi.getFareOptions(journey)
      .then((options) => {
        if (cancelled) return;
        // An empty options list means the backend had nothing bookable for
        // this route/city — treat it as un-priceable, not as "show samples".
        if (!options || options.length === 0) {
          setApiVehicles(null);
          setFareError("We couldn't price this trip. It may be outside the area we currently serve.");
          return;
        }
        setApiVehicles(options);
        // Funnel: record that this visitor got as far as viewing fares, so an
        // abandoned booking shows up in the ERP. Fire-and-forget; the backend
        // dedups this into one attempt row and advances its stage.
        bookingsApi.trackDraft({
          stage: "FARES_VIEWED",
          tripType:      journey.tripType,
          pickupAddress: journey.pickup,
          dropAddress:   journey.drop || undefined,
          stops:         (journey.stops || []).length ? journey.stops : undefined,
          pickupDate:    journey.date,
          pickupTime:    journey.time,
          returnDate:    journey.returnDate || undefined,
          returnTime:    journey.returnTime || undefined,
          rentalPackage: journey.package || undefined,
          estimatedFare: options?.[0]?.fare,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setApiVehicles(null);
        // Surface service-area errors with a clear actionable message.
        // Broadened: the backend signals this under several codes/wordings,
        // and matching only "OUTSIDE_SERVICE_AREA" meant the others fell
        // through to the silent sample-price path below.
        const code = String(err?.code || "").toUpperCase();
        const msg  = String(err?.message || "").toLowerCase();
        const isServiceArea =
          code === "OUTSIDE_SERVICE_AREA" ||
          code === "CITY_NOT_SERVICED" ||
          code === "NO_SERVICE_AREA" ||
          msg.includes("service area") ||
          msg.includes("not serviced") ||
          msg.includes("outside our service");
        if (isServiceArea) {
          setServiceAreaError(err.message || "Pickup is outside the area we currently serve.");
        } else {
          // Anything else the backend refused to price — still not bookable.
          setFareError(err?.message || "We couldn't get a fare for this trip right now.");
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  // Keyed on browseMode as well: selectJourney() falls back to the last trip,
  // so journey?.id alone could stay the same while this page moved from "no
  // trip" to "this trip" (e.g. on Back from checkout), and fares never loaded.
  }, [journey?.id, browseMode]);

  const isLocal = !browseMode && journey?.tripType === "local";
  const isRound = !browseMode && journey?.tripType === "round-trip";

  const GROUP_MIN_SEATS = 12;

  // ── Direct vehicle selection ──────────────────────────────────────────────
  // The customer picked a SPECIFIC vehicle (e.g. Swift Desire) from a fleet
  // card, so `?vehicle=swift-desire` is in the URL. The backend, though,
  // prices per CLASS (hatchback/sedan/suv/tempo) and returns one option per
  // class — which mergeOptionWithCatalogue then labels with that class's
  // first catalogue match. The result was that after entering trip details
  // the chosen vehicle vanished and the customer was handed a generic
  // "sedan" list to choose from all over again.
  //
  // Instead: take the priced option for the chosen vehicle's class, and
  // re-badge it with the chosen vehicle's own identity (name, photo, seats,
  // bags, features) while keeping the backend's real fare, breakdown,
  // surge and vehicleClass untouched — those are what get booked.
  // ?vehicle= may carry a backend catalogue key (swift-dzire) or a bundled
  // local id (swift-desire) depending on which screen linked here, so resolve
  // against the live catalogue first and fall back to the bundled list.
  const chosenVehicle = useMemo(() => {
    if (!urlVehicle) return null;
    const key = toBackendVehicleClass(urlVehicle) || urlVehicle;
    return (catalogue || []).find((v) => v.id === key) || null;
  }, [urlVehicle, catalogue]);

  // Real quotes are on screen.
  const pricedMode = !browseMode && Boolean(apiVehicles?.length);

  // WHAT EXISTS IS WHATEVER THE BACKEND SAYS EXISTS.
  //
  // vehicle_catalog.key == the vehicleClass on fare_configs, one row per real
  // car (swift-dzire, innova-crysta, tempo-17, benz-33 …) — the generic
  // 'sedan'/'suv' rows were retired as first-seed placeholders. And
  // quote.service.quoteAllClasses only prices classes with an ACTIVE
  // catalogue row, so /fares/options already returns exactly the fleet the
  // admin has switched on. Render that list directly; the bundled
  // VEHICLE_RATES is a cosmetic fallback for browse mode only, never a
  // second opinion on what is bookable.
  const allSource = useMemo(() => {
    if (pricedMode) return apiVehicles;
    return catalogue || [];
  }, [pricedMode, apiVehicles, catalogue]);

  // The chosen vehicle is the priced row whose class matches its backend key.
  const chosenKey = chosenVehicle ? toBackendVehicleClass(chosenVehicle) : null;
  const pricedChosen = useMemo(() => {
    if (!chosenKey || !pricedMode) return null;
    return (
      allSource.find((v) => String(v.vehicleClass || "").toLowerCase() === chosenKey) ||
      allSource.find((v) => String(v.id || "").toLowerCase() === chosenKey) ||
      null
    );
  }, [chosenKey, pricedMode, allSource]);

  const chosenUnavailable = Boolean(chosenVehicle && pricedMode && !pricedChosen);

  // Arriving via "Group / Coach" scopes the whole page to actual
  // coaches/buses only — not the smaller Tempo Traveller/Urbania vans,
  // which are a different vehicle class even though they're also used for
  // group travel. The Vehicle Type filter then only offers "Coach" as a
  // choice here, and nothing is pre-selected — the list is already scoped
  // by the vehicles available, not by an applied filter.
  // When arriving via a fleet card (?vehicle=...), show the full catalogue
  // regardless of type=group — the specific vehicle may not be a Coach.
  // "Group" = every vehicle built for groups, i.e. 12 seats and up — exactly
  // the range the homepage seater buttons offer (12–33). This used to keep
  // only vehicles typed "Coach" (the 22/28/33-seat Bharat Benz buses), so
  // picking 12, 13, 16 or 17 seats always ended in "0 found" even though the
  // Tempo Travellers and Urbanias with those seat counts were in the fleet.
  const source = useMemo(() => (
    browseType === "group"
      ? allSource.filter((v) => Number(v.seats) >= GROUP_MIN_SEATS)
      : allSource
  ), [browseType, allSource]);

  // Available filter options derived from the actual vehicle list, not
  // hardcoded — so a filter pill never appears for something that isn't
  // actually available to pick.
  const availableTypes = useMemo(() => [...new Set(source.map((v) => getVehicleType(v)))], [source]);
  const availableSeats = useMemo(() => [...new Set(source.map((v) => v.seats))].sort((a, b) => a - b), [source]);

  const vehicles = useMemo(() => {
    let list = source;
    // The chosen vehicle replaces its class's generic stand-in, so the
    // customer keeps seeing the vehicle they actually picked.
    // Chosen vehicle leads the list. No re-badging needed any more: every
    // card is already its own real catalogue vehicle.
    if (pricedChosen) {
      list = [pricedChosen, ...list.filter((v) => v.id !== pricedChosen.id)];
    }
    if (typeFilters.length) list = list.filter((v) => typeFilters.includes(getVehicleType(v)));
    if (seatFilters.length) {
      const exact = list.filter((v) => seatFilters.includes(Number(v.seats)));
      // The requested size has no active vehicle right now (e.g. it was
      // retired on the backend). Rather than a dead-end "0 found", offer the
      // next sizes up that can still carry the whole group.
      if (!exact.length && seatFilters.length === 1) {
        const want = seatFilters[0];
        list = list.filter((v) => Number(v.seats) >= want).sort((a, b) => a.seats - b.seats);
      } else {
        list = exact;
      }
    }

    if (ac === "on") list = list.filter((v) => v.ac);
    if (ac === "off") list = list.filter((v) => !v.ac);
    list = list.map((v) => ({
      ...v,
      id: v.id || v.vehicleId,
      // Browse mode has no trip, so no fare — never an invented one.
      fare: v.fare != null ? v.fare : null,
    }));
    // Unpriced vehicles (no bundled rate card, no quote yet) sort last in
    // both directions rather than NaN-ing the comparator.
    const fareOf = (x) => (x.fare == null ? null : Number(x.fare));
    const byFare = (dir) => (a, b) => {
      const fa = fareOf(a), fb = fareOf(b);
      if (fa == null && fb == null) return 0;
      if (fa == null) return 1;
      if (fb == null) return -1;
      return dir * (fa - fb);
    };
    if (sort === "lowhigh") list = [...list].sort(byFare(1));
    if (sort === "highlow") list = [...list].sort(byFare(-1));
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, pricedChosen, typeFilters, seatFilters, ac, sort]);
  // True when the seat filter found no exact match and fell back to larger sizes.
  const seatFallback = seatFilters.length === 1 && vehicles.length > 0 &&
    !vehicles.some((v) => Number(v.seats) === seatFilters[0]);

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

  // Wipe the pickup/drop (and the priced trip built from them) and drop the
  // page back into browse mode with the trip form open, so the customer can
  // enter fresh locations in place. Keeps the chosen vehicle (?vehicle=) —
  // only the locations are cleared.
  function clearLocations() {
    setLocationsCleared(true);
    setCreatedJourneyId(null);
    setApiVehicles(null);
    setServiceAreaError(null);
    setFareError(null);
    setAutoPricing(false);
    setSameCityAsked(false);
    setInlineTrip((f) => ({ ...f, pickup: "", drop: "", stops: [] }));
    setInlinePoints({ pickup: null, drop: null });
    setShowFilters(true);
    // Drop ?j= from the URL so a refresh doesn't restore the cleared trip.
    try {
      const qs = new URLSearchParams();
      if (urlVehicle) qs.set("vehicle", urlVehicle);
      if (browseType) qs.set("type", browseType);
      const q = qs.toString();
      window.history.replaceState(window.history.state, "", `/booking-search${q ? `?${q}` : ""}`);
    } catch { /* SSR guard */ }
    try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch { /* SSR guard */ }
  }

  // Submit the inline trip form — creates a journey and stays on this page,
  // updating the URL so fares load without a redirect to home.
  function submitInlineTrip(e) {
    e?.preventDefault?.();
    if (inlineTrip.tripType !== "local" && !inlineTrip.pickup.trim()) { toast("Please enter a pickup location", "error"); return; }
    if (inlineTrip.tripType === "airport") {
      // Same requirements as the homepage widget: an airport AND a terminal,
      // plus the other side of the journey. Without this the two forms made
      // different airport bookings from the same site.
      if (!inlineTrip.airport) { toast("Please select an airport", "error"); return; }
      if (!inlineTrip.airportTerminal) { toast("Please select the airport terminal", "error"); return; }
      const otherSide = inlineTrip.airportDirection === "pickup" ? inlineTrip.drop : inlineTrip.pickup;
      if (!String(otherSide || "").trim()) {
        toast(inlineTrip.airportDirection === "pickup" ? "Please enter a destination" : "Please enter a pickup location", "error");
        return;
      }
    } else if ((inlineTrip.tripType === "one-way" || inlineTrip.tripType === "round-trip") && !inlineTrip.drop.trim()) {
      toast("Please enter a destination", "error"); return;
    }
    if (inlineTrip.tripType === "local" && !inlineTrip.pickup.trim()) { toast("Please enter a pickup location", "error"); return; }
    if (!inlineTrip.date) { toast("Please select a date", "error"); return; }
    if (!inlineTrip.time) { toast("Please select a time", "error"); return; }
    if (inlineTrip.tripType === "round-trip" && !inlineTrip.returnDate) { toast("Please select a return date", "error"); return; }
    if (inlineTrip.tripType === "round-trip" && !inlineTrip.returnTime) { toast("Please select a return time", "error"); return; }
    if (inlineTrip.tripType === "round-trip" && inlineTrip.returnDate && inlineTrip.returnDate < inlineTrip.date) {
      toast("Return date cannot be before the pickup date", "error"); return;
    }
    // PAST DATE/TIME CHECK — same 30-minute rule as the main booking widget
    // (BookingWidget.jsx), so a past/too-soon time is blocked here too instead
    // of only on the homepage form. Must be fixed before moving on.
    const pickupDt = new Date(inlineTrip.date + "T" + inlineTrip.time);
    if (pickupDt < new Date(Date.now() + 30 * 60 * 1000)) {
      toast("Pickup time must be at least 30 minutes from now — please update it", "error");
      return;
    }
    if (inlineTrip.tripType === "round-trip" && inlineTrip.returnDate && inlineTrip.returnTime) {
      const returnDt = new Date(inlineTrip.returnDate + "T" + inlineTrip.returnTime);
      if (returnDt <= pickupDt) {
        toast("Return date & time must be after the pickup time", "error");
        return;
      }
    }

    // Same-city pickup and drop = an hourly hire. Switch to a local package
    // rather than quoting an intercity fare for a trip inside one city.
    if (
      (inlineTrip.tripType === "one-way" || inlineTrip.tripType === "round-trip") &&
      !sameCityAsked &&
      isSameCityTrip(inlinePoints.pickup, inlinePoints.drop)
    ) {
      setSameCityOpen(true);
      return;
    }

    submitInlineJourney();
  }

  // Split out so the same-city prompt can finish the submit, optionally
  // switching the trip to a local package.
  function submitInlineJourney(localPackage = null) {
    const effType = localPackage ? "local" : inlineTrip.tripType;
    // Same label the homepage widget builds, so an airport trip booked here is
    // indistinguishable from one booked there.
    const airportLabel =
      (AIRPORTS.find((a) => a.code === inlineTrip.airport)?.name || inlineTrip.airport) +
      (inlineTrip.airportTerminal ? " — " + inlineTrip.airportTerminal : "");
    const journeyObj = {
      tripType: effType,
      pickup: effType === "airport" && inlineTrip.airportDirection === "pickup"
        ? airportLabel
        : inlineTrip.pickup,
      // Local = no destination (see BookingWidget) — don't carry a drop
      // typed before the trip type was switched.
      drop: effType === "local"
        ? ""
        : (effType === "airport" && inlineTrip.airportDirection === "drop" ? airportLabel : inlineTrip.drop),
      date: inlineTrip.date,
      time: inlineTrip.time,
      returnDate: effType === "local" ? "" : inlineTrip.returnDate,
      returnTime: effType === "local" ? "" : inlineTrip.returnTime,
      package: effType === "local" ? (localPackage || inlineTrip.package) : "",
      stops: effType === "local" || effType === "airport"
        ? []
        : (inlineTrip.stops || []).filter((s) => s.trim()),
    };
    const action = dispatch(createJourney(journeyObj));
    const newId = action.payload.id;
    // Switch this page into non-browse mode IN PLACE. We update the URL with
    // history.replaceState (so it's shareable / survives refresh) rather than
    // Vike navigate(), which could remount the page and drop the state — the
    // exact cause of "after adding details it goes back to home".
    setLocationsCleared(false);
    setCreatedJourneyId(newId);
    try {
      const qs = new URLSearchParams();
      qs.set("j", newId);
      if (urlVehicle) qs.set("vehicle", urlVehicle);
      if (browseType) qs.set("type", browseType);
      if (seatFilters.length === 1) qs.set("seater", String(seatFilters[0]));
      window.history.replaceState(window.history.state, "", `/booking-search?${qs.toString()}`);
    } catch { /* non-browser / SSR guard */ }

    // ── Direct-vehicle fast path ──────────────────────────────────────────
    // The customer already picked this exact vehicle before entering trip
    // details, so re-showing a vehicle list is a pointless extra step — they
    // would just tap the same car again. Price it here and go straight to
    // checkout. If pricing fails we fall through and the normal list (or the
    // service-area / couldn't-price screen) renders as before.
    if (chosenVehicle) {
      setAutoPricing(true);
      const wantClass = chosenKey || toBackendVehicleClass(chosenVehicle);
      faresApi.getFareOptions({ ...journeyObj, id: newId })
        .then((options) => {
          const opt = (options || []).find(
            (o) => String(o.vehicleClass || "").toLowerCase() === wantClass
          );
          if (!opt) { setAutoPricing(false); return; } // fall back to the list
          const ctx = {
            surge: Boolean(opt.surge),
            surgeMultiplier: opt.surgeMultiplier || 1,
            surgePct: opt.surgePct || 0,
          };
          // Price + class from the backend; identity from the real catalogue
          // vehicle the customer picked (the backend prices per class, so the
          // quote itself carries the class representative's details).
          selectAndGoToCheckout({
            ...opt,
            id: chosenVehicle.id,
            vehicleId: chosenVehicle.id,
            name: chosenVehicle.name,
            img: chosenVehicle.img,
            imgFallback: chosenVehicle.imgFallback,
            gallery: chosenVehicle.gallery,
            seats: chosenVehicle.seats,
            bags: chosenVehicle.bags,
            ac: chosenVehicle.ac,
            category: chosenVehicle.category,
          }, newId, ctx);
        })
        .catch(() => setAutoPricing(false)); // the main effect surfaces the error
    }
  }

  function selectVehicle(v) {
    if (browseMode) {
      // No trip yet, so nothing to price. Remember THIS vehicle and take the
      // customer to the trip form; submitting it prices this vehicle and goes
      // straight to checkout (see the direct-vehicle fast path).
      setPickedKey(v.id);
      toast(`Enter your trip details to book the ${v.name}.`, "success");
      setShowFilters(true);
      setTimeout(() => {
        try {
          document.getElementById("trip-details-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
        } catch { /* SSR guard */ }
      }, 50);
      return;
    }
    // HARD STOP — the backend refused to price this trip (outside service
    // area, no rate card, etc.). The fare on this card is then only a
    // rate-sheet sample, never a real quote, so it must not become a booking.
    // This is a belt-and-braces guard: the list is already hidden in these
    // states, but nothing else in the flow re-checks serviceability before
    // /checkout → /payment.
    if (serviceAreaError || fareError) {
      toast(
        serviceAreaError || "We couldn't price this trip — please request a custom booking.",
        "error"
      );
      return;
    }
    // A vehicle without a real backend quote (no vehicleClass = it came from
    // the local rate sheet, not /fares/options) can't be booked either.
    if (!v.vehicleClass) {
      toast("This trip hasn't been priced yet — please search again or request a custom booking.", "error");
      return;
    }
    selectAndGoToCheckout(v, journey.id, { surge, surgeMultiplier, surgePct });
  }

  // Puts a priced vehicle into the store and moves to checkout. Shared by the
  // card's "Continue Booking" button and by the direct-vehicle fast path in
  // submitInlineJourney, so both produce an identical selection payload.
  function selectAndGoToCheckout(v, journeyId, ctx) {
    const mult = ctx?.surgeMultiplier || 1;
    dispatch(setSelectedCab({
      vehicleId: v.id,
      fare: v.fare,
      baseFare: Math.round(v.fare / mult),
      surge: Boolean(ctx?.surge),
      surgeMultiplier: mult,
      surgePct: v.surgePct ?? ctx?.surgePct ?? 0,
      surgeFee: ctx?.surge ? Math.round(v.fare - v.fare / mult) : 0,
      // Only the backend-quoted allowance. The old `|| v.outstation.driverBhata`
      // fallback pulled a number off the local rate card that was never part
      // of the quoted total (see the payment-summary fix).
      driverBhata: Number(v.driverAllowance || 0),
      journeyId,
      vehicleName: v.name,
      vehicleSeats: v.seats,
      vehicleAc: v.ac,
      vehicleImg: v.img,
      vehicleImgFallback: v.imgFallback || v.img,
      vehicleBags: v.bags || null,
      vehicleCategory: v.category || null,
      // Real backend fields — carried through so checkout can render the
      // actual fare breakdown (driver allowance, night allowance, surge,
      // minimum-fare top-up, rounding) without re-quoting.
      vehicleClass: v.vehicleClass || null,
      breakdown: v.breakdown || [],
      nightAllowance: v.nightAllowance || 0,
    }));
    navigate("/checkout");
  }

  // "View Details" — the vehicle's specs and indicative rates are useful to
  // browse even before a trip is chosen. In browse mode (no trip type / no
  // pickup-drop selected yet) we DON'T attach a journey or a fare, so the
  // details page can't show a fabricated route (the old Bengaluru→Mysuru
  // default) or a made-up total. It shows the vehicle + rate card and a prompt
  // to enter trip details. With a real journey, it carries the real fare through.
  function viewDetails(v) {
    if (browseMode) {
      dispatch(setSelectedCab({
        vehicleId: v.id,
        browse: true,
        journeyId: null,
        fare: null,
        vehicleName: v.name,
        vehicleSeats: v.seats,
        vehicleAc: v.ac,
        img: v.img,
        vehicleImg: v.img,
        vehicleImgFallback: v.imgFallback || v.img,
        vehicleBags: v.bags || null,
        vehicleCategory: v.category || null,
      }));
      navigate("/cab-details");
      return;
    }
    dispatch(setSelectedCab({
      vehicleId: v.id,
      fare: v.fare,
      journeyId: journey.id,
      img: v.img,
      vehicleImg: v.img,
      vehicleImgFallback: v.imgFallback || v.img,
      vehicleBags: v.bags || null,
      vehicleCategory: v.category || null,
    }));
    navigate("/cab-details");
  }

  const filterPillStyle = (active) => ({
    height: 38,
    display: "inline-flex",
    alignItems: "center",
    padding: "0 16px", borderRadius: 9999, border: active ? "1.5px solid #111" : "1.5px solid #E5E5E5",
    background: active ? "#111" : "#fff", color: active ? "#FFC107" : "#666", fontWeight: 600, fontSize: 12.5, cursor: "pointer",
  });

  const clearFieldBtnStyle = {
    flexShrink: 0, width: 36, height: 42, borderRadius: 9, border: "1px solid #E5E5E5",
    background: "#fff", color: "#999", cursor: "pointer", fontSize: 13, lineHeight: 1,
  };

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
      <BackLink to="/" label="Back" />

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
        <div className="summary-bar" style={{ background: "#111", borderRadius: 18, padding: "18px 22px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "16px 26px", color: "#fff", marginBottom: 22 }}>
          <div className="summary-bar-route" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <IconPin className="w-4 h-4 text-primary" />
            <span title={journey.pickup} style={{ fontWeight: 700, fontSize: 22 }}>{shortAddress(journey.pickup)}</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="#FFC107" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span title={journey.drop} style={{ fontWeight: 700, fontSize: 22 }}>{shortAddress(journey.drop)}</span>
          </div>
          <span style={{ width: 1, height: 22, background: "rgba(255,255,255,.2)" }} className="hidden sm:block" />
          <div className="summary-bar-meta" style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 14, color: "rgba(255,255,255,.75)", fontWeight: 500 }}>
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
            onClick={() => navigate(`/?j=${encodeURIComponent(effectiveJourneyId)}#booking`)}
            className="summary-bar-btn hover:!bg-[#FFB300]"
            style={{ marginLeft: "auto", padding: "10px 18px", borderRadius: 9999, background: "#FFC107", color: "#111", fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer" }}
          >
            Modify Search
          </button>
          {/* Drop the locations entirely and re-open the trip form here, so a
              wrong pickup/drop can be cleared without going back to the
              homepage widget and re-entering everything. */}
          <button
            onClick={clearLocations}
            className="summary-bar-btn"
            style={{ padding: "10px 16px", borderRadius: 9999, background: "transparent", color: "rgba(255,255,255,.75)", fontWeight: 600, fontSize: 13, border: "1px solid rgba(255,255,255,.28)", cursor: "pointer" }}
          >
            Clear Locations
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

      {autoPricing ? (
        <StateBlock
          icon={<Spinner />}
          title={`Pricing your ${chosenVehicle?.name || "vehicle"}…`}
          description="Taking you straight to checkout."
        />
      ) : loading ? (
        <StateBlock icon={<Spinner />} title="Finding available cabs…" description="Matching vehicles to your journey." />
      ) : (browseMode && catalogueLoading) ? (
        <StateBlock icon={<Spinner />} title="Loading our fleet…" description="Fetching available vehicles." />
      ) : (browseMode && catalogueError) ? (
        <StateBlock
          tone="empty"
          icon={<IconPin className="w-6.5 h-6.5" />}
          title="We couldn't load the fleet"
          description={catalogueError}
          action={<button onClick={retryCatalogue} style={{ height: 44, padding: "0 24px", borderRadius: 9999, background: "#111", color: "#fff", fontWeight: 700, border: "none", cursor: "pointer" }}>Try again</button>}
        />
      ) : (serviceAreaError || fareError) ? (
        <div style={{ maxWidth: 520, margin: "40px auto", background: "#fff", border: "1px solid #EFEFEF", borderRadius: 20, padding: 32, textAlign: "center" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#FFF7ED", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M12 21s7-5.5 7-11a7 7 0 10-14 0c0 5.5 7 11 7 11z" stroke="#F59E0B" strokeWidth="2" strokeLinejoin="round"/>
              <circle cx="12" cy="10" r="2" fill="#F59E0B"/>
            </svg>
          </div>
          <h3 style={{ fontWeight: 700, fontSize: 18, margin: "0 0 10px", color: "#111" }}>
            {serviceAreaError ? "Location Outside Service Area" : "We couldn't price this trip"}
          </h3>
          <p style={{ fontSize: 14, color: "#666", lineHeight: 1.6, margin: "0 0 6px" }}>
            {serviceAreaError || fareError}
          </p>
          <p style={{ fontSize: 13.5, color: "#888", lineHeight: 1.6, margin: "0 0 22px" }}>
            {serviceAreaError
              ? "We currently operate within a service radius around specific cities, not every address in a state — please enter a pickup closer to one of our serviced cities and try again."
              : "This trip can't be booked online until we can quote it. Change the pickup or drop and try again, or send us a request and our team will confirm availability and price for you."}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button
              type="button"
              onClick={clearLocations}
              style={{ display: "block", width: "100%", padding: "13px 0", borderRadius: 12, background: "#FFC107", color: "#111", fontWeight: 700, fontSize: 15, border: "none", cursor: "pointer" }}
            >
              ← Change Pickup Location
            </button>
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
                {seatFallback
                  ? `No ${urlSeater} seater is available right now`
                  : `Showing ${urlSeater} Seater ${urlVehicle ? "vehicles" : "group vehicles"}`}
              </p>
              <p style={{ fontSize: 12.5, color: "#666", margin: "2px 0 0" }}>
                {urlVehicle
                  ? "Your selected vehicle is shown first."
                  : seatFallback
                    ? `Showing the next larger vehicles that fit ${urlSeater} or more passengers.`
                    : `Vehicles with ${urlSeater} seats are pre-filtered below.`}
              </p>
            </div>
            <button
              onClick={() => { setSeatFilters([]); window.history.replaceState(window.history.state, "", "/booking-search?type=group"); }}
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

        <div className="booking-search-layout" style={{ display: "flex", flexWrap: "wrap", gap: 22, alignItems: "flex-start" }}>
          {/* FILTERS */}
          <aside className={`booking-search-sidebar ${showFilters ? "" : "hidden lg:block"}`} style={{ flex: "1 1 240px", minWidth: "min(100%,240px)", position: "sticky", top: 120, background: "#fff", border: "1px solid #EFEFEF", borderRadius: 18, padding: 22 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ fontWeight: 700, fontSize: 16, margin: 0 }}>Filters</h3>
              <button onClick={clearFilters} style={{ background: "none", border: "none", color: "#B8860B", fontWeight: 600, fontSize: 12.5, cursor: "pointer" }}>Clear all</button>
            </div>

            {/* ── Trip details — always editable here. Before a search it sets
                 the trip; after one it is pre-filled with that trip, so the
                 route / date / trip type can be changed in place instead of
                 disappearing once prices load. ── */}
            {(
              <div id="trip-details-panel" style={{ marginBottom: 22, paddingBottom: 20, borderBottom: "1px solid #F0F0F0", scrollMarginTop: 90 }}>
                <div style={{ fontWeight: 600, fontSize: 12, color: "#666", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 10 }}>Trip Type</div>
                <div className="filter-pills" style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
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
                        {inlineTrip.tripType === "airport" ? "Pickup (your address)" : "From"}
                      </label>
                      <div style={{ display: "flex", gap: 6 }}>
                        <input
                          ref={attachInlineAc("pickup", inlinePickupAcRef)}
                          value={inlineTrip.pickup}
                          onChange={setInline("pickup")}
                          placeholder="Pickup location"
                          style={{ flex: 1, height: 42, borderRadius: 9, border: "1px solid #E5E5E5", padding: "0 12px", fontSize: 13, outline: "none", minWidth: 0 }}
                        />
                        {inlineTrip.pickup && (
                          <button type="button" title="Clear pickup" aria-label="Clear pickup"
                            onClick={() => { setInlineTrip((f) => ({ ...f, pickup: "" })); setInlinePoints((p) => ({ ...p, pickup: null })); }}
                            style={clearFieldBtnStyle}>✕</button>
                        )}
                        <button type="button" onClick={() => setInlineMapField("pickup")} title="Pick on map"
                          style={{ flexShrink: 0, width: 42, height: 42, borderRadius: 9, border: "1px solid #E5E5E5", background: "#FFFBEB", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>📍</button>
                      </div>
                    </div>
                  )}

                  {(inlineTrip.tripType === "one-way" || inlineTrip.tripType === "round-trip" || inlineTrip.tripType === "airport") && (
                    <div style={{ display: "flex", justifyContent: "center", margin: "-6px 0" }}>
                      <button
                        type="button"
                        onClick={swapPickupDrop}
                        title="Reverse pickup and destination"
                        aria-label="Reverse pickup and destination"
                        style={{
                          width: 34, height: 34, borderRadius: "50%", border: "1px solid #E5E5E5",
                          background: "#fff", cursor: "pointer", display: "flex", alignItems: "center",
                          justifyContent: "center", boxShadow: "0 1px 4px rgba(0,0,0,.08)",
                          color: "#B8860B", fontSize: 15, lineHeight: 1, padding: 0,
                        }}
                      >
                        ⇅
                      </button>
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
                        {inlineTrip.drop && (
                          <button type="button" title="Clear destination" aria-label="Clear destination"
                            onClick={() => { setInlineTrip((f) => ({ ...f, drop: "" })); setInlinePoints((p) => ({ ...p, drop: null })); }}
                            style={clearFieldBtnStyle}>✕</button>
                        )}
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
                          <button type="button" onClick={() => setInlineMapField(`stop:${i}`)} title="Pick on map"
                            style={{ flexShrink: 0, width: 42, height: 42, borderRadius: 9, border: "1px solid #E5E5E5", background: "#FFFBEB", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>📍</button>
                          <button type="button" onClick={() => setInlineTrip((f) => ({ ...f, stops: (f.stops||[]).filter((_, x) => x !== i) }))} title="Remove stop"
                            style={{ flexShrink: 0, width: 38, height: 42, borderRadius: 9, border: "1px solid #E5E5E5", background: "#fff", cursor: "pointer" }}>−</button>
                        </div>
                      ))}
                      {(inlineTrip.stops || []).length < 4 && (
                        <button type="button" onClick={() => setInlineTrip((f) => ({ ...f, stops: [...(f.stops||[]), ""] }))}
                          style={{ background: "none", border: "none", color: "#B8860B", fontWeight: 600, fontSize: 12.5, cursor: "pointer", padding: "2px 0" }}>+ Add a stop</button>
                      )}
                    </div>
                  )}

                  {/* Airport + terminal + direction — mirrors the homepage
                      widget, so both forms build the same airport journey. */}
                  {inlineTrip.tripType === "airport" && (
                    <>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: ".05em", display: "block", marginBottom: 5 }}>Direction</label>
                        <div className="filter-pills" style={{ display: "flex", gap: 8 }}>
                          {[
                            { key: "drop", label: "To airport" },
                            { key: "pickup", label: "From airport" },
                          ].map((d) => (
                            <button
                              key={d.key}
                              type="button"
                              onClick={() => setInlineTrip((f) => ({ ...f, airportDirection: d.key }))}
                              style={{
                                flex: 1, height: 38, borderRadius: 9999, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
                                border: inlineTrip.airportDirection === d.key ? "none" : "1px solid #E5E5E5",
                                background: inlineTrip.airportDirection === d.key ? "#111" : "#fff",
                                color: inlineTrip.airportDirection === d.key ? "#FFC107" : "#444",
                              }}
                            >
                              {d.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: ".05em", display: "block", marginBottom: 5 }}>Airport</label>
                        <select
                          value={inlineTrip.airport}
                          onChange={(e) => setInlineTrip((f) => ({ ...f, airport: e.target.value, airportTerminal: "" }))}
                          style={{ width: "100%", height: 42, borderRadius: 9, border: "1px solid #E5E5E5", padding: "0 10px", fontSize: 13, outline: "none", background: "#fff" }}
                        >
                          <option value="">Select airport</option>
                          {AIRPORTS.map((a) => (
                            <option key={a.code} value={a.code}>{a.name}</option>
                          ))}
                        </select>
                      </div>

                      {inlineTrip.airport && (
                        <div>
                          <label style={{ fontSize: 11, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: ".05em", display: "block", marginBottom: 5 }}>Terminal</label>
                          <select
                            value={inlineTrip.airportTerminal}
                            onChange={setInline("airportTerminal")}
                            style={{ width: "100%", height: 42, borderRadius: 9, border: "1px solid #E5E5E5", padding: "0 10px", fontSize: 13, outline: "none", background: "#fff" }}
                          >
                            <option value="">Select terminal</option>
                            {(AIRPORTS.find((a) => a.code === inlineTrip.airport)?.terminals || []).map((t) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </>
                  )}

                  {/* Local package — required for an hourly trip, and must
                      match what the backend has configured, or the booking is
                      rejected at payment with "rental package not available". */}
                  {inlineTrip.tripType === "local" && (
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: ".05em", display: "block", marginBottom: 5 }}>Package</label>
                      <select
                        value={inlineTrip.package}
                        onChange={setInline("package")}
                        style={{ width: "100%", height: 42, borderRadius: 9, border: "1px solid #E5E5E5", padding: "0 10px", fontSize: 13, outline: "none", background: "#fff" }}
                      >
                        <option value="4 hrs / 40 km">4 hrs / 40 km</option>
                        <option value="8 hrs / 80 km">8 hrs / 80 km</option>
                        <option value="12 hrs / 120 km">12 hrs / 120 km</option>
                      </select>
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
                    <InlineTimeField value={inlineTrip.time} onChange={setInline("time")} />
                  </div>

                  {inlineTrip.tripType === "round-trip" && (
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: ".05em", display: "block", marginBottom: 5 }}>Return Date</label>
                      <input type="date" min={inlineTrip.date || today} value={inlineTrip.returnDate} onChange={setInline("returnDate")}
                        style={{ width: "100%", height: 42, borderRadius: 9, border: "1px solid #E5E5E5", padding: "0 12px", fontSize: 13, outline: "none" }} />
                    </div>
                  )}

                  {inlineTrip.tripType === "round-trip" && (
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: ".05em", display: "block", marginBottom: 5 }}>Return Time</label>
                      <InlineTimeField value={inlineTrip.returnTime} onChange={setInline("returnTime")} placeholder="Select return time" />
                    </div>
                  )}

                  <button onClick={submitInlineTrip}
                    style={{ height: 46, borderRadius: 9999, border: "none", background: "#FFC107", color: "#111", fontWeight: 800, fontSize: 14, cursor: "pointer", marginTop: 4 }}>
                    {chosenVehicle
                      ? `Confirm Trip Details — Book ${chosenVehicle.name} →`
                      : browseMode ? "Search Available Cabs →" : "Update Search →"}
                  </button>
                </div>
              </div>
            )}

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 600, fontSize: 12, color: "#666", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 10 }}>Vehicle Type</div>
              <div className="filter-pills" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
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
              <div className="filter-pills" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {availableSeats.map((s) => (
                  <button key={s} onClick={() => toggleSeat(s)} style={filterPillStyle(seatFilters.includes(s))}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 600, fontSize: 12, color: "#666", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 10 }}>AC</div>
              <div className="filter-pills" style={{ display: "flex", gap: 8 }}>
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
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, gap: 10, flexWrap: "wrap" }}>
              <h2 style={{ fontWeight: 700, fontSize: 19, margin: 0 }}>
                {pricedChosen && !showOtherVehicles ? "Your Vehicle" : "Available Vehicles"}
              </h2>
              <span style={{ fontSize: 13, color: "#666", fontWeight: 500 }}>
                {pricedChosen && !showOtherVehicles ? "Priced for your trip" : `${vehicles.length} found`}
              </span>
            </div>

            {/* Chose a specific vehicle → confirm THAT one, don't re-open the
                whole class list they already narrowed down from. */}
            {pricedChosen && !showOtherVehicles && (
              <p style={{ margin: "-6px 0 14px", fontSize: 13, color: "#666" }}>
                {chosenVehicle?.name} is ready to book for this trip.{" "}
                <button
                  onClick={() => setShowOtherVehicles(true)}
                  style={{ background: "none", border: "none", padding: 0, color: "#B8860B", fontWeight: 700, fontSize: 13, cursor: "pointer", textDecoration: "underline" }}
                >
                  See other vehicles
                </button>
              </p>
            )}
            {pricedChosen && showOtherVehicles && (
              <p style={{ margin: "-6px 0 14px", fontSize: 13, color: "#666" }}>
                Showing all vehicles for this trip.{" "}
                <button
                  onClick={() => setShowOtherVehicles(false)}
                  style={{ background: "none", border: "none", padding: 0, color: "#B8860B", fontWeight: 700, fontSize: 13, cursor: "pointer", textDecoration: "underline" }}
                >
                  Back to {chosenVehicle?.name}
                </button>
              </p>
            )}

            {chosenUnavailable && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "#FFF7ED", border: "1.5px solid #FBBF77", borderRadius: 12, padding: "12px 16px", marginBottom: 14 }}>
                <span style={{ fontSize: 18, lineHeight: 1 }}>⚠️</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 700, fontSize: 13.5, margin: 0, color: "#92400E" }}>
                    {chosenVehicle?.name} isn’t available for this trip
                  </p>
                  <p style={{ fontSize: 12.5, color: "#B45309", margin: "2px 0 0" }}>
                    Here are the vehicles we can offer instead.
                  </p>
                </div>
              </div>
            )}

            {vehicles.length === 0 ? (
              <div style={{ background: "#fff", border: "1px dashed #E5E5E5", borderRadius: 20, padding: 48, textAlign: "center" }}>
                <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 6 }}>No vehicles match these filters</div>
                <p style={{ fontSize: 14, color: "#666", margin: "0 0 16px" }}>Try clearing some filters or reducing passenger count.</p>
                <button onClick={clearFilters} style={{ height: 48, padding: "0 28px", borderRadius: 9999, background: "#111", color: "#fff", fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer" }}>Clear Filters</button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {(pricedChosen && !showOtherVehicles
                  ? [pricedChosen]
                  : [...vehicles].sort((a, b) => {
                      // Pin the chosen vehicle to the top — by class when a
                      // real quote exists, else by catalogue id.
                      const isA = urlVehicle && a.id === urlVehicle;
                      const isB = urlVehicle && b.id === urlVehicle;
                      if (isA && !isB) return -1;
                      if (isB && !isA) return 1;
                      return 0;
                    })
                ).map((v, idx) => {
                  const type = getVehicleType(v);
                  // Pin by CLASS once a real quote is in play — the backend
                  // prices per class, and two classes can share one catalogue
                  // id (see classMatched in fares.js), which previously lit up
                  // two cards as "Your Selection" for a single choice.
                  // Each card is now a real catalogue vehicle with its own
                  // unique id, so identity is unambiguous again.
                  const isPinned = Boolean(chosenKey && (v.id === chosenKey || String(v.vehicleClass || "").toLowerCase() === chosenKey));
                  // Key on the priced class so two options can't collide.
                  const cardKey = `${v.vehicleClass || v.id || "v"}-${idx}`;
                  return (
                    <div key={cardKey} className="vehicle-card-wrap" style={{ background: "#fff", border: isPinned ? "2px solid #FFC107" : "1px solid #EFEFEF", borderRadius: 20, overflow: "hidden", display: "flex", flexWrap: "wrap", position: "relative", boxShadow: isPinned ? "0 0 0 4px rgba(255,193,7,.15)" : "none" }}>
                      {isPinned && (
                        <div style={{ position: "absolute", top: 14, left: 14, zIndex: 10, background: "#FFC107", color: "#111", fontSize: 11, fontWeight: 700, letterSpacing: ".06em", padding: "3px 10px", borderRadius: 9999, textTransform: "uppercase" }}>
                          {browseMode ? "✓ Pre-selected" : "✓ Your Selection"}
                        </div>
                      )}
                      <div className="vehicle-card-image" style={{ flex: "1 1 240px", minWidth: "min(100%, 220px)", minHeight: 200, position: "relative" }}>
                        <img className="vehicle-photo" src={v.img || v.imgFallback} alt={v.name} onError={(e) => { const fb = v.imgFallback; if (fb && e.currentTarget.src !== fb) { e.currentTarget.src = fb; } }} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", position: "absolute", inset: 0 }} />
                      </div>
                      <div style={{ flex: "2 1 320px", padding: "20px 22px", display: "flex", flexDirection: "column" }}>
                        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                          <h3 style={{ fontWeight: 700, fontSize: 20, margin: 0 }}>{v.name}</h3>
                          <span style={{ fontSize: 11.5, fontWeight: 600, color: "#111", background: "#FFF7DE", padding: "4px 10px", borderRadius: 9999 }}>{type}</span>
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, margin: "10px 0 14px", fontSize: 12.5, color: "#666", fontWeight: 500 }}>
                          <span>{v.seats} Seater</span>
                          <span>{v.ac ? "A/C" : "Non-A/C"}</span>
                          {v.bags && <span>{v.bags}</span>}
                        </div>
                        {!browseMode && v.vehicleClass && v.fare != null && Number(v.fare) > 0 ? (
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
                            {v.rate ? (
                              <>
                                <div><div style={{ fontSize: 11, color: "#999", fontWeight: 500 }}>Local ({v.rate.hours} hr · {v.rate.km} km)</div><div style={{ fontWeight: 700, fontSize: 15, color: "#111" }}>{fmtINR(v.rate.packageFare)}</div></div>
                                <div><div style={{ fontSize: 11, color: "#999", fontWeight: 500 }}>Extra KM</div><div style={{ fontWeight: 700, fontSize: 15, color: "#111" }}>{fmtINR(v.rate.extraPerKm)}/km</div></div>
                                <div><div style={{ fontSize: 11, color: "#999", fontWeight: 500 }}>Outstation</div><div style={{ fontWeight: 700, fontSize: 15, color: "#B8860B" }}>Live quote</div></div>
                              </>
                            ) : (
                              <div style={{ fontSize: 12.5, color: "#888" }}>
                                Enter your trip details above for a live fare.
                              </div>
                            )}
                          </div>
                        )}
                        <div style={{ display: "flex", gap: 10, marginTop: "auto", flexWrap: "wrap" }}>
                          <button
                            onClick={() => viewDetails(v)}
                            style={{ flex: "1 1 140px", height: 48, borderRadius: 9999, border: "2px solid #111", background: "#fff", color: "#111", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
                          >
                            View Details
                          </button>
                          <button
                            onClick={() => selectVehicle(v)}
                            className="hover:!bg-[#FFB300]"
                            style={{ flex: "1 1 140px", height: 48, borderRadius: 9999, border: "none", background: "#FFC107", color: "#111", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
                          >
                            {browseMode ? "Book Now" : (isPinned ? "Continue Booking →" : "Select Vehicle")}
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
                : "Enter your trip details to get the live fare for your exact route."}
            </p>
          </div>
        </div>
        </>
      )}

      {/* Same-city → confirm an hourly package instead of an intercity fare */}
      {sameCityOpen && (
        <div
          onClick={() => setSameCityOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(14,14,14,.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 22, padding: 24, width: "100%", maxWidth: 420, boxShadow: "0 24px 64px rgba(0,0,0,.28)" }}
          >
            <h3 style={{ fontWeight: 700, fontSize: 18, margin: "0 0 6px" }}>Both stops are in the same city</h3>
            <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "#77736A", margin: "0 0 18px" }}>
              For travel within one city an hourly package is cheaper than an outstation
              fare. Pick a package to continue.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { value: "4 hrs / 40 km",   description: "Half day" },
                { value: "8 hrs / 80 km",   description: "Full day" },
                { value: "12 hrs / 120 km", description: "Extended day" },
              ].map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => {
                    setSameCityAsked(true);
                    setSameCityOpen(false);
                    setInlineTrip((f) => ({ ...f, tripType: "local", package: p.value }));
                    submitInlineJourney(p.value);
                  }}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "13px 16px", borderRadius: 13, border: "1.5px solid #E5E5E5", background: "#fff", cursor: "pointer", textAlign: "left" }}
                >
                  <span>
                    <span style={{ display: "block", fontWeight: 700, fontSize: 14.5 }}>{p.value}</span>
                    <span style={{ display: "block", fontSize: 12, color: "#8A857C" }}>{p.description}</span>
                  </span>
                  <span aria-hidden style={{ color: "#B8860B", fontWeight: 800 }}>→</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => { setSameCityAsked(true); setSameCityOpen(false); submitInlineJourney(); }}
              style={{ width: "100%", marginTop: 14, padding: "12px 0", borderRadius: 12, border: "none", background: "transparent", color: "#77736A", fontWeight: 600, fontSize: 13, cursor: "pointer", textDecoration: "underline" }}
            >
              No, keep it as an outstation trip
            </button>
          </div>
        </div>
      )}

      {/* Map picker for the inline trip form */}
      <LocationMapPicker
        open={!!inlineMapField}
        title={
          inlineMapField === "drop" ? "Select Drop Location"
          : (typeof inlineMapField === "string" && inlineMapField.startsWith("stop:"))
            ? `Select Stop ${Number(inlineMapField.split(":")[1]) + 1} Location`
          : "Select Pickup Location"
        }
        initialAddress={
          !inlineMapField ? ""
          : inlineMapField.startsWith("stop:")
            ? ((inlineTrip.stops || [])[Number(inlineMapField.split(":")[1])] || "")
          : (inlineTrip[inlineMapField] || "")
        }
        onClose={() => setInlineMapField(null)}
        onConfirm={(address, _stateName, point) => {
          setInlineTrip((f) => {
            if (typeof inlineMapField === "string" && inlineMapField.startsWith("stop:")) {
              const idx = Number(inlineMapField.split(":")[1]);
              const st = [...(f.stops || [])];
              st[idx] = address;
              return { ...f, stops: st };
            }
            return { ...f, [inlineMapField]: address };
          });
          if (inlineMapField === "pickup" || inlineMapField === "drop") {
            setInlinePoints((pts) => ({ ...pts, [inlineMapField]: point || null }));
          }
          setInlineMapField(null);
        }}
      />
    </main>
  );
}

function fmtTime12(hhmm) {
  if (!hhmm) return "";
  const [h, m] = String(hhmm).split(":").map(Number);
  if (Number.isNaN(h)) return "";
  const ampm = h < 12 ? "AM" : "PM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m || 0).padStart(2, "0")} ${ampm}`;
}

// Custom time dropdown — replaces the browser's native <input type="time"> so
// the inline filter form matches the main booking card's picker (no native
// spinner). Emits the same "HH:MM" value via an event-shaped onChange so it
// drops straight into setInline("time").
function InlineTimeField({ value, onChange, placeholder = "Select time" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onDoc(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const slots = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{ width: "100%", height: 42, borderRadius: 9, border: "1px solid #E5E5E5", padding: "0 12px", fontSize: 13, background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", textAlign: "left", color: value ? "#111" : "#999" }}
      >
        <span>{value ? fmtTime12(value) : placeholder}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="9" stroke="#B8860B" strokeWidth="2" />
          <path d="M12 7v5l3 2" stroke="#B8860B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div style={{ position: "absolute", top: 46, left: 0, right: 0, zIndex: 60, maxHeight: 220, overflowY: "auto", background: "#fff", border: "1px solid #E5E5E5", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,.12)" }}>
          {slots.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => { onChange({ target: { value: v } }); setOpen(false); }}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 12px", fontSize: 13, border: "none", background: v === value ? "#FFF7E0" : "#fff", color: "#111", cursor: "pointer", fontWeight: v === value ? 700 : 400 }}
            >
              {fmtTime12(v)}
            </button>
          ))}
        </div>
      )}
    </div>
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