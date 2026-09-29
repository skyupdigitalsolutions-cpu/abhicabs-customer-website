import React, { useState, useEffect, useRef, useCallback, useId } from "react";
import { useGoogleMapsReady, bindPlacesAutocomplete, pointFromPlace as mapsPointFromPlace } from "../lib/googleMaps";
import { createPortal } from "react-dom";
import { useDispatch } from "react-redux";
import { navigate } from "vike/client/router";
import {
  LazyMotion,
  domMax,
  m,
  AnimatePresence,
  MotionConfig,
  LayoutGroup,
} from "framer-motion";
import { createJourney } from "../store/slices/journeySlice";
import { useToast } from "../hooks/useToast";
import { IconArrowRight, IconSwap, IconClock, IconPlane, IconPin, IconZap } from "./Icons";
import LocationMapPicker from "./LocationMapPicker";
import { GOOGLE_MAPS_API_KEY } from "../api/config";
import { AIRPORTS } from "../data/airports";
import { isSameCityTrip, ensureCitiesLoaded } from "../api/cities";
import { createSupportTicket } from "../api/services/support";
import {
  EASE_OUT,
  GRADIENT,
  BW_CSS,
  TW,
  useAnchoredPopover,
  Popover,
  DatePicker,
  TimePicker12hr,
  ChevronIcon,
} from "./DateTimePickers";
import { toISODate, pickupTimeError, returnTimeError } from "../lib/dateTime";

// States this business actually operates in (Karnataka, Telangana, Andhra
// Pradesh, Maharashtra). ANY location inside these four states is serviceable
// — Mysore, Mandya, Hubli, etc. are all Karnataka and must never be flagged as
// out of area.
//
// Matching mirrors the backend's service-area allowlist (src/lib/serviceArea.js):
// the state name arrives as free text from Google (sometimes the whole
// formatted address, sometimes a misspelling), so we compare with case,
// spaces and punctuation stripped, and accept common aliases/misspellings and
// substring hits. A strict === check would wrongly reject a valid Karnataka
// pickup just because Google spelled the field differently this week.
const ALLOWED_STATES = [
  { name: "Karnataka", aliases: ["ka", "karnatak", "karnataka"] },
  { name: "Telangana", aliases: ["tg", "ts", "telangana", "telengana", "telangna"] },
  { name: "Andhra Pradesh", aliases: ["ap", "andhra", "andhrapradesh", "andrapradesh", "andhrapradhesh"] },
  { name: "Maharashtra", aliases: ["mh", "maharashtra", "maharastra", "maharashtr", "maharashta"] },
];

// Lower-case, strip everything that is not a letter or digit.
function normaliseState(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Is this free-text state/address inside one of our four serviced states?
// Returns true when we can't tell (empty/unknown) so a missing state component
// never blocks a booking — the backend stays the final authority.
function isAllowedState(value) {
  const n = normaliseState(value);
  if (!n) return true; // unknown → don't block here; backend decides
  for (const s of ALLOWED_STATES) {
    if (n === normaliseState(s.name)) return true;
    if (s.aliases.some((a) => n === normaliseState(a))) return true;
  }
  // Substring: Google sometimes returns the whole formatted address.
  for (const s of ALLOWED_STATES) {
    if (n.includes(normaliseState(s.name))) return true;
  }
  return false;
}

const TABS = [
  { mode: "one-way",    label: "One Way",    icon: <IconArrowRight className="w-3.5 h-3.5" /> },
  { mode: "round-trip", label: "Round Trip", icon: <IconSwap className="w-3.5 h-3.5" /> },
  { mode: "local",      label: "Local",      icon: <IconClock className="w-3.5 h-3.5" /> },
  { mode: "airport",    label: "Airport",    icon: <IconPlane className="w-3.5 h-3.5" /> },
];

/* ═══════════════════════════════════════════════════════════════════════ */
/* Design tokens                                                          */
/* ═══════════════════════════════════════════════════════════════════════ */
const panelVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE_OUT } },
  exit:    { opacity: 0, y: -6, transition: { duration: 0.16, ease: "easeIn" } },
};

const popIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 520, damping: 34 } },
  exit:    { opacity: 0, scale: 0.95, transition: { duration: 0.14 } },
};

const collapse = {
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: "auto", transition: { duration: 0.3, ease: EASE_OUT } },
  exit:    { opacity: 0, height: 0, transition: { duration: 0.2, ease: "easeIn" } },
};

const PILL_SPRING = { type: "spring", stiffness: 500, damping: 38 };


/* ═══════════════════════════════════════════════════════════════════════ */

const today = toISODate(new Date());

const AIRPORT_OPTIONS = AIRPORTS.map((a) => ({
  value: a.code,
  label: a.city,
  description: a.name.replace(/\s*\([A-Z]+\)\s*$/, ""),
  badge: a.code,
  triggerLabel: `${a.city} · ${a.code}`,
}));

function terminalOptions(code) {
  return (AIRPORTS.find((a) => a.code === code)?.terminals || []).map((t) => {
    const [head, tail] = t.split(" — ");
    return { value: t, label: head, description: tail, triggerLabel: head };
  });
}

const PACKAGE_OPTIONS = [
  { value: "4 hrs / 40 km",   label: "4 hrs / 40 km",   description: "Half day" },
  { value: "8 hrs / 80 km",   label: "8 hrs / 80 km",   description: "Full day" },
  { value: "12 hrs / 120 km", label: "12 hrs / 120 km", description: "Extended day" },
];


function emptyFields() {
  return {
    pickup: "", drop: "", date: today, time: "",
    returnDate: "", returnTime: "",
    package: "8 hrs / 80 km",
    airport: "BLR",
    airportTerminal: "",
    airportDirection: "drop",
  };
}

function isSurgeTime(date, time) {
  if (!date || !time) return false;
  try {
    const pickup = new Date(`${date}T${time}`);
    const diff = (pickup - Date.now()) / 60000;
    return diff >= 0 && diff <= 30;
  } catch { return false; }
}

function extractStateFromPlace(place) {
  const comp = place?.address_components?.find((c) => c.types.includes("administrative_area_level_1"));
  // Fall back to the formatted address so isAllowedState()'s substring match can
  // still resolve the state when Google omits the admin_area_level_1 component.
  return comp?.long_name || place?.formatted_address || null;
}

// Re-binds Places Autocomplete whenever the <input> element changes.
/** {lat,lng} from a Places result, or null. Google returns functions here. */
function pointFromPlace(place) {
  const loc = place?.geometry?.location;
  if (!loc) return null;
  const lat = typeof loc.lat === "function" ? loc.lat() : loc.lat;
  const lng = typeof loc.lng === "function" ? loc.lng() : loc.lng;
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

function bindAutocomplete(el, slotRef, onPlace) {
  if (!el || !window.google?.maps?.places?.Autocomplete) return;
  if (slotRef.current?.el === el) return;
  if (slotRef.current) window.google.maps.event.clearInstanceListeners(slotRef.current.ac);
  const ac = new window.google.maps.places.Autocomplete(el, {
    componentRestrictions: { country: "in" },
    fields: ["formatted_address", "name", "address_components", "geometry"],
  });
  ac.addListener("place_changed", () => onPlace(ac.getPlace()));
  slotRef.current = { el, ac };
}

export default function BookingWidget({ initialMode = "one-way", presetPickup = "", presetDrop = "", presetJourney = null, onModeChange }) {
  const dispatch = useDispatch();
  const toast = useToast();
  const layoutScope = useId();
  const [mode, setMode] = useState(presetJourney?.tripType || initialMode);

  // The trip-type tabs used to own `mode` privately, so the quick-select
  // service cards below the widget had no idea which tab was open and kept
  // showing "One Way" highlighted regardless. Report every change (and the
  // starting mode) upward so the two stay in sync.
  const selectMode = React.useCallback((m) => {
    setMode(m);
    onModeChange?.(m);
  }, [onModeChange]);
  useEffect(() => {
    onModeChange?.(presetJourney?.tripType || initialMode);
    // Warm the serviced-city list so same-city detection uses the live
    // list rather than the bundled fallback. Never throws.
    ensureCitiesLoaded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [fields, setFields] = useState(() => ({
    ...emptyFields(),
    ...(presetJourney
      ? {
          pickup: presetJourney.pickup || "",
          drop: presetJourney.drop || "",
          date: presetJourney.date || today,
          time: presetJourney.time || "",
          returnDate: presetJourney.returnDate || "",
          returnTime: presetJourney.returnTime || "",
          package: presetJourney.package || "8 hrs / 80 km",
          airport: presetJourney.airport || "BLR",
          airportTerminal: presetJourney.airportTerminal || "",
          airportDirection: presetJourney.airportDirection || "drop",
        }
      : { pickup: presetPickup, drop: presetDrop }),
  }));
  const [surge, setSurge] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [mapPickerField, setMapPickerField] = useState(null);
  function setFieldDirect(key, value) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  const [pickupState, setPickupState] = useState(null);
  const [dropState, setDropState] = useState(null);
  const [outOfAreaOpen, setOutOfAreaOpen] = useState(false);
  // Same-city pickup/drop → offer an hourly package instead of an
  // intercity fare. `sameCityAsked` makes it a one-time prompt, so choosing
  // "keep as outstation" isn't re-asked on every submit.
  // Coordinates for the chosen pickup/drop. `geometry` was already being
  // requested from Places and then thrown away; the same-city test needs real
  // points because it is a kilometre rule, not a name match.
  const [pickupPoint, setPickupPoint] = useState(null);
  const [dropPoint, setDropPoint] = useState(null);
  const [sameCityOpen, setSameCityOpen] = useState(false);
  const [sameCityAsked, setSameCityAsked] = useState(false);
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requestName, setRequestName] = useState("");
  const [requestPhone, setRequestPhone] = useState("");
  // The contact endpoint requires an email, and this form used to satisfy
  // that by inventing `phone_<number>@placeholder.local` — which reached the
  // admin inbox looking like a real address. Ask for it instead.
  const [requestEmail, setRequestEmail] = useState("");

  async function submitOutOfAreaRequest() {
    if (!requestName.trim() || !/^\d{10}$/.test(requestPhone.trim())) {
      toast("Please enter your name and a valid 10-digit mobile number", "error");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(requestEmail.trim())) {
      toast("Please enter a valid email address so we can send you the quote", "error");
      return;
    }
    setRequestSubmitting(true);
    try {
      await createSupportTicket({
        name: requestName.trim(),
        phone: requestPhone.trim(),
        email: requestEmail.trim(),
        topic: "Out-of-Area Booking Request",
        message:
          `Route: ${fields.pickup || "—"} → ${fields.drop || "—"}\n` +
          `Trip type: ${mode}\n` +
          `Date: ${fields.date || "—"} · Time: ${fields.time || "—"}\n` +
          `(Requested from outside our regular service states — Karnataka, Telangana, Andhra Pradesh, Maharashtra.)`,
      });
      toast("Request sent! Our team will reach out to confirm availability.", "success");
      setOutOfAreaOpen(false);
      setRequestName(""); setRequestPhone("");
    } catch (err) {
      toast(err.message || "Couldn't send your request — please try again.", "error");
    } finally {
      setRequestSubmitting(false);
    }
  }

  // Loads Google Maps itself (it used to wait for the map popup to do it,
  // so suggestions never appeared until a map had been opened).
  const mapsLoaded = useGoogleMapsReady();

  const pickupAutocompleteRef = useRef(null);
  const dropAutocompleteRef = useRef(null);

  const attachPickup = useCallback((el) => {
    if (!mapsLoaded) return;
    bindAutocomplete(el, pickupAutocompleteRef, (place) => {
      const value = place?.formatted_address || place?.name || "";
      if (value) setFieldDirect("pickup", value);
      setPickupState(extractStateFromPlace(place));
      setPickupPoint(pointFromPlace(place));
    });
  }, [mapsLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  const attachDrop = useCallback((el) => {
    if (!mapsLoaded) return;
    bindAutocomplete(el, dropAutocompleteRef, (place) => {
      const value = place?.formatted_address || place?.name || "";
      if (value) setFieldDirect("drop", value);
      setDropState(extractStateFromPlace(place));
      setDropPoint(pointFromPlace(place));
    });
  }, [mapsLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  const pickupAutocomplete = GOOGLE_MAPS_API_KEY ? { attachTo: attachPickup } : null;
  const dropAutocomplete   = GOOGLE_MAPS_API_KEY ? { attachTo: attachDrop }   : null;

  const initialStops = presetJourney?.stops?.length
    ? presetJourney.stops.map((v, i) => ({ id: i + 1, value: v }))
    : [];
  const stopIdRef = useRef(initialStops.length);
  const [stops, setStops] = useState(initialStops); // [{ id, value }]

  // Per-stop Places Autocomplete — one slot per stop id, created lazily as
  // stop inputs mount (mirrors attachPickup/attachDrop above).
  const stopAutocompleteRefs = useRef({}); // { [stopId]: { el, ac } }
  const attachStop = useCallback((id) => (el) => {
    if (!mapsLoaded) return;
    if (!stopAutocompleteRefs.current[id]) stopAutocompleteRefs.current[id] = { current: null };
    bindAutocomplete(el, stopAutocompleteRefs.current[id], (place) => {
      const value = place?.formatted_address || place?.name || "";
      if (value) updateStop(id, value);
    });
  }, [mapsLoaded]); // eslint-disable-line react-hooks/exhaustive-deps
  const stopAutocomplete = (id) => (GOOGLE_MAPS_API_KEY ? { attachTo: attachStop(id) } : null);

  const set = (key) => (e) => {
    // Typing over a chosen place makes its coordinates stale. Drop them, so
    // the same-city check never measures a point the text no longer matches.
    if (key === "pickup") setPickupPoint(null);
    if (key === "drop") setDropPoint(null);
    setFields((f) => ({ ...f, [key]: e.target.value }));
  };
  function swapPickupDrop() {
    setPickupPoint((p) => { setDropPoint(p); return dropPoint; });
    setFields((f) => ({ ...f, pickup: f.drop, drop: f.pickup }));
    setPickupState(dropState);
    setDropState(pickupState);
  }

  useEffect(() => {
    setSurge(isSurgeTime(fields.date, fields.time));
  }, [fields.date, fields.time]);

  useEffect(() => {
    if (mode === "local" || mode === "airport") setStops([]);
  }, [mode]);

  function addStop() {
    if (stops.length >= 4) return;
    setStops((s) => [...s, { id: ++stopIdRef.current, value: "" }]);
  }
  function updateStop(id, val) {
    setStops((s) => s.map((st) => (st.id === id ? { ...st, value: val } : st)));
  }
  function removeStop(id) {
    setStops((s) => s.filter((st) => st.id !== id));
    delete stopAutocompleteRefs.current[id];
  }

  // mapPickerField is "pickup" | "drop" | `stop:<id>` while the picker is open.
  const openStopIdMatch = typeof mapPickerField === "string" && mapPickerField.startsWith("stop:")
    ? Number(mapPickerField.slice(5))
    : null;
  const openStopIndex = openStopIdMatch != null ? stops.findIndex((s) => s.id === openStopIdMatch) : -1;
  function mapPickerInitialAddress() {
    if (openStopIdMatch != null) return stops[openStopIndex]?.value || "";
    return mapPickerField ? fields[mapPickerField] : "";
  }
  function mapPickerTitle() {
    if (openStopIdMatch != null) return `Select Stop ${openStopIndex + 1} Location`;
    return mapPickerField === "drop" ? "Select Drop Location" : "Select Pickup Location";
  }
  function handleMapPickerConfirm(address, stateName, point) {
    if (openStopIdMatch != null) {
      updateStop(openStopIdMatch, address);
    } else {
      setFieldDirect(mapPickerField, address);
      if (mapPickerField === "pickup") { setPickupState(stateName); setPickupPoint(point || null); }
      if (mapPickerField === "drop")   { setDropState(stateName);   setDropPoint(point || null); }
    }
    setMapPickerField(null);
  }

  function handleSubmit(e) {
    e.preventDefault();

    // ── 1. PICKUP LOCATION
    if (mode !== "local" && mode !== "airport" && !fields.pickup.trim()) {
      toast("Please enter a pickup location", "error"); return;
    }
    if (mode === "airport" && fields.airportDirection === "pickup" && !fields.drop.trim()) {
      toast("Please enter your drop location", "error"); return;
    }
    if (mode === "airport" && fields.airportDirection === "drop" && !fields.pickup.trim()) {
      toast("Please enter your pickup location", "error"); return;
    }
    if (mode === "local" && !fields.pickup.trim()) {
      toast("Please enter a pickup location for local trip", "error"); return;
    }

    // ── 2. DROP / DESTINATION
    if ((mode === "one-way" || mode === "round-trip") && !fields.drop.trim()) {
      toast("Please enter a destination", "error"); return;
    }

    // ── 3. AIRPORT SPECIFICS
    if (mode === "airport") {
      if (!fields.airport) { toast("Please select an airport", "error"); return; }
      if (!fields.airportTerminal) { toast("Please select the airport terminal", "error"); return; }
    }

    // ── 4. LOCAL PACKAGE
    if (mode === "local" && !fields.package) {
      toast("Please select a local package (e.g. 4 hrs / 40 km)", "error"); return;
    }

    // ── 5. DATE
    if (!fields.date) { toast("Please select a pickup date", "error"); return; }
    if (mode === "round-trip" && !fields.returnDate) {
      toast("Please select a return date", "error"); return;
    }
    if (mode === "round-trip" && fields.returnDate && fields.returnDate < fields.date) {
      toast("Return date cannot be before the pickup date", "error"); return;
    }

    // ── 6. TIME
    if (!fields.time) { toast("Please select a pickup time", "error"); return; }
    if (mode === "round-trip" && !fields.returnTime) {
      toast("Please select a return time", "error"); return;
    }

    // ── 7. PAST DATE/TIME CHECK
    if (fields.date && fields.time) {
      const pickupDt = new Date(fields.date + "T" + fields.time);
      if (pickupDt < new Date(Date.now() + 30 * 60 * 1000)) {
        toast("Pickup time must be at least 30 minutes from now", "error"); return;
      }
    }
    if (mode === "round-trip" && fields.returnDate && fields.returnTime) {
      const returnDt = new Date(fields.returnDate + "T" + fields.returnTime);
      const pickupDt = new Date(fields.date + "T" + (fields.time || "00:00"));
      if (returnDt <= pickupDt) {
        toast("Return date & time must be after the pickup time", "error"); return;
      }
    }

    // ── 8. VIA STOPS
    const filledStops = stops.map((s) => s.value).filter((v) => v.trim());
    if (stops.length > 0 && filledStops.length < stops.length) {
      toast("Please fill in all stop fields or remove empty ones", "error"); return;
    }

    const outOfAreaField =
      (pickupState && !isAllowedState(pickupState)) ? "pickup" :
      (mode !== "local" && dropState && !isAllowedState(dropState)) ? "drop" :
      null;
    if (outOfAreaField) {
      setOutOfAreaOpen(true);
      return;
    }

    // Same-city pickup and drop = an hourly hire, not an outstation run.
    // Charging intercity per-km for a trip that never leaves the city
    // overcharges the customer, so confirm a local package first. Shown
    // once — "keep as outstation" proceeds unchanged.
    if (
      (mode === "one-way" || mode === "round-trip") &&
      !sameCityAsked &&
      isSameCityTrip(pickupPoint, dropPoint)
    ) {
      setSameCityOpen(true);
      return;
    }

    submitJourney();
  }

  // Builds and dispatches the journey. Split out of handleSubmit so the
  // same-city prompt can call it afterwards, optionally switching the trip
  // to a local package.
  function submitJourney(localPackage = null) {
    const filledStops = stops.map((s) => s.value).filter((v) => v.trim());
    const airportLabel =
      (AIRPORTS.find((a) => a.code === fields.airport)?.name || fields.airport) +
      (fields.airportTerminal ? " — " + fields.airportTerminal : "");
    const effMode = localPackage ? "local" : mode;

    const journey = {
      tripType: effMode,
      pickup: effMode === "airport" && fields.airportDirection === "pickup" ? airportLabel : fields.pickup,
      // A Local (hourly) package has no destination — the drop input is
      // hidden for that mode, but any address typed before switching modes
      // stayed in state and rode along into the journey, showing a bogus
      // "A → B" route on checkout/payment for what is a single-city hire.
      drop: effMode === "local"
        ? ""
        : (effMode === "airport" && fields.airportDirection === "drop" ? airportLabel : fields.drop),
      date: fields.date,
      time: fields.time,
      returnDate: effMode === "local" ? "" : fields.returnDate,
      returnTime: effMode === "local" ? "" : fields.returnTime,
      package: effMode === "local" ? (localPackage || fields.package) : "",
      stops: effMode === "local" || effMode === "airport" ? [] : filledStops,
      surge,
      surgeMultiplier: surge ? 1.05 : 1.0,
    };

    const action = dispatch(createJourney(journey));
    navigate("/booking-search?j=" + action.payload.id);
  }

  const [touched, setTouched] = useState({});
  const touch = (key) => () => setTouched((t) => ({ ...t, [key]: true }));

  function fieldErr(key, condition, msg) {
    return (
      <AnimatePresence initial={false}>
        {touched[key] && condition && (
          <m.p
            key="err"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            style={{ color: "#C2410C", fontSize: 12, marginTop: 2, fontWeight: 500, paddingLeft: 2 }}
          >
            {msg}
          </m.p>
        )}
      </AnimatePresence>
    );
  }

  // ── Shared field renderers
  const fromField = (
    <Field label="From" filled={!!fields.pickup.trim()}>
      <Input
        icon={<IconPin className="w-4 h-4" />} chipClass="bw-chip--from"
        placeholder="Pickup city or address"
        value={fields.pickup} onChange={set("pickup")} required
        onMapClick={() => setMapPickerField("pickup")} autocomplete={pickupAutocomplete}
      />
    </Field>
  );
  const toField = (
    <Field label="To" filled={!!fields.drop.trim()}>
      <Input
        icon={<FlagIcon />}
        placeholder="Where to?"
        value={fields.drop} onChange={set("drop")} required
        onMapClick={() => setMapPickerField("drop")} autocomplete={dropAutocomplete}
      />
    </Field>
  );
  const dateField = (label = "Pick Up Date", withErr = false) => (
    <Field label={label}>
      <DatePicker
        ariaLabel={label} min={today} value={fields.date}
        onChange={(e) => {
          const v = e.target.value;
          // Clear a return date that would now fall before the pickup date
          setFields((f) => ({ ...f, date: v, returnDate: f.returnDate && f.returnDate < v ? "" : f.returnDate }));
          if (withErr) touch("date")();
        }}
      />
      {withErr && fieldErr("date", !fields.date, "Please select a date")}
    </Field>
  );
  const timeField = (withErr = false) => (
    <Field label="Time">
      <TimePicker12hr
        value={fields.time} error={pickupTimeError(fields.date, fields.time)}
        onChange={(e) => { set("time")(e); if (withErr) touch("time")(); }}
      />
      {withErr && fieldErr("time", !fields.time, "Please select a time")}
    </Field>
  );
  const returnDateField = (
    <Field label="Return Date">
      <DatePicker ariaLabel="Return date" placeholder="Add return" min={fields.date || today} value={fields.returnDate} onChange={set("returnDate")} />
    </Field>
  );
  /*
   * Return TIME. Submit already refused a round trip without one ("Please
   * select a return time") but no input existed to supply it, so Round Trip
   * could not be completed from this widget at all. The inline trip form on
   * /booking-search has had this field; the two forms must accept exactly the
   * same trip, since either can produce the same booking.
   *
   * error: the return must come after the pickup (same-day or cross-day);
   * shown inline, and handleSubmit still blocks it.
   */
  const returnTimeField = (
    <Field label="Return Time">
      <TimePicker12hr
        value={fields.returnTime}
        error={returnTimeError(fields.date, fields.time, fields.returnDate, fields.returnTime)}
        onChange={set("returnTime")}
      />
    </Field>
  );
  // Passenger selection removed — the vehicle's seat capacity already conveys
  // how many people it carries, so a separate passenger count is redundant.

  // One-way & round-trip share a layout; round-trip adds Return Date.
  function renderRouteRow(withReturn) {
    if (stops.length === 0) {
      return (
        <div className="flex flex-wrap gap-3 sm:gap-4 items-start">
          <div className="flex-1 min-w-[210px]">{fromField}</div>
          <SwapButton onClick={swapPickupDrop} />
          <div className="flex-1 min-w-[210px]">{toField}</div>
          <div className="w-full sm:w-[136px]">
            <Field label="Stops"><AddStopTile onAdd={addStop} /></Field>
          </div>
          {/* Date + time travel together, so the time never wraps onto a
              row of its own and stretches across the whole form. */}
          <div className="w-full sm:w-auto sm:flex-[2_1_340px] grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>{dateField("Pick Up Date", !withReturn)}</div>
            <div>{timeField(!withReturn)}</div>
          </div>
          {withReturn && (
            <div className="w-full sm:w-auto sm:flex-[2_1_340px] grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>{returnDateField}</div>
              <div>{returnTimeField}</div>
            </div>
          )}
        </div>
      );
    }
    return (
      <div className="relative flex flex-wrap gap-3 sm:gap-4 items-end">
        <div className="w-full sm:w-auto sm:flex-[1_1_230px]">{fromField}</div>
        <SwapButton onClick={swapPickupDrop} />
        <StopFields
          stops={stops}
          onChange={updateStop}
          onRemove={removeStop}
          onMapClick={(id) => setMapPickerField(`stop:${id}`)}
          autocompleteFor={stopAutocomplete}
        />
        {stops.length < 4 && (
          <m.div layout="position" className="w-full sm:w-[136px]">
            <AddStopTile onAdd={addStop} />
          </m.div>
        )}
        <m.div layout="position" className="w-full sm:w-auto sm:flex-[1_1_230px]">{toField}</m.div>
        <m.div layout="position" className="w-full sm:w-auto sm:flex-[2_1_340px] grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>{dateField()}</div>
          <div>{timeField()}</div>
        </m.div>
        {withReturn && (
          <m.div layout="position" className="w-full sm:w-auto sm:flex-[2_1_340px] grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>{returnDateField}</div>
            <div>{returnTimeField}</div>
          </m.div>
        )}
      </div>
    );
  }

  const nonAirportField = fields.airportDirection === "pickup" ? "drop" : "pickup";

  return (
    <LazyMotion features={domMax} strict>
      <MotionConfig reducedMotion="user">
        <LayoutGroup id={layoutScope}>
          <style>{BW_CSS}</style>
          <div className="bw-root relative z-20">
            {/* Tabs */}
            <div className="bw-tabs flex gap-1 p-[6px] overflow-x-auto bg-[#0E0E0E]" role="tablist" aria-label="Trip type">
              {TABS.map((t) => (
                <GradientPill
                  key={t.mode}
                  tone="dark"
                  active={mode === t.mode}
                  layoutId="bw-tab-pill"
                  onClick={() => selectMode(t.mode)}
                  role="tab"
                  aria-selected={mode === t.mode}
                >
                  {t.icon}{t.label}
                </GradientPill>
              ))}
            </div>
            {/* Hairline gold seam between the dark bar and the form */}
            <div aria-hidden style={{ height: 1, background: "linear-gradient(90deg, transparent 0%, rgba(255,193,7,.6) 50%, transparent 100%)" }} />

            {/* Surge banner */}
            <AnimatePresence initial={false}>
              {surge && (
                <m.div key="surge" variants={collapse} initial="initial" animate="animate" exit="exit" style={{ overflow: "hidden" }}>
                  <div className="mx-4 sm:mx-6 mt-4 bw-surge">
                    <span className="bw-surge-icon">
                      <m.span
                        animate={{ scale: [1, 1.15, 1] }}
                        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                        className="inline-flex"
                      >
                        <IconZap className="w-4 h-4" />
                      </m.span>
                    </span>
                    <div className="min-w-0">
                      <div style={{ fontWeight: 700, fontSize: 13.5, color: "#7A5200" }}>Immediate booking · 5% surge applies</div>
                      <div style={{ fontSize: 12.5, color: "#8F6A1A" }}>Pickup within 30 minutes. The surge is shown on each vehicle.</div>
                    </div>
                  </div>
                </m.div>
              )}
            </AnimatePresence>

            <AnimatedHeight>
              <form onSubmit={handleSubmit} className="px-4 pt-5 pb-4 sm:px-6 sm:pt-6 sm:pb-6">
                <AnimatePresence mode="popLayout" initial={false}>
                  {mode === "one-way" && (
                    <m.div key="one-way" variants={panelVariants} initial="initial" animate="animate" exit="exit">
                      {renderRouteRow(false)}
                      <SearchButton className="mt-5" />
                    </m.div>
                  )}

                  {mode === "round-trip" && (
                    <m.div key="round-trip" variants={panelVariants} initial="initial" animate="animate" exit="exit">
                      {renderRouteRow(true)}
                      <SearchButton className="mt-5" />
                    </m.div>
                  )}

                  {mode === "local" && (
                    <m.div key="local" variants={panelVariants} initial="initial" animate="animate" exit="exit">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                        <Field label="Pickup Location" filled={!!fields.pickup.trim()}>
                          <Input
                            icon={<IconPin className="w-4 h-4" />} chipClass="bw-chip--from"
                            placeholder="Pickup city or address"
                            value={fields.pickup} onChange={set("pickup")} required
                            onMapClick={() => setMapPickerField("pickup")} autocomplete={pickupAutocomplete}
                          />
                        </Field>
                        <Field label="Package">
                          <Dropdown ariaLabel="Package" icon={<PackageIcon />} value={fields.package} onChange={set("package")} options={PACKAGE_OPTIONS} />
                        </Field>
                        {dateField("Date")}
                        {timeField()}
                      </div>
                      <SearchButton className="mt-5" />
                    </m.div>
                  )}

                  {mode === "airport" && (
                    <m.div key="airport" variants={panelVariants} initial="initial" animate="animate" exit="exit">
                      <div className="bw-segment mb-5" role="radiogroup" aria-label="Airport transfer direction">
                        {[["drop", "Drop to Airport"], ["pickup", "Pickup from Airport"]].map(([val, label]) => (
                          <GradientPill
                            key={val}
                            tone="light"
                            size="lg"
                            active={fields.airportDirection === val}
                            layoutId="bw-airport-pill"
                            onClick={() => setFields((f) => ({ ...f, airportDirection: val }))}
                            role="radio"
                            aria-checked={fields.airportDirection === val}
                          >
                            <PlaneDirIcon landing={val === "pickup"} />
                            {label}
                          </GradientPill>
                        ))}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                        <Field label="Airport">
                          <Dropdown
                            ariaLabel="Airport"
                            placeholder="Choose airport"
                            icon={<IconPlane className="w-4 h-4" />}
                            options={AIRPORT_OPTIONS}
                            value={fields.airport}
                            onChange={(e) => {
                              const code = e.target.value;
                              setFields((f) => {
                                if (code === f.airport) return f; // re-picking the same airport keeps the terminal
                                const terminals = AIRPORTS.find((a) => a.code === code)?.terminals || [];
                                // Single-terminal airports are pre-selected — one less step
                                return { ...f, airport: code, airportTerminal: terminals.length === 1 ? terminals[0] : "" };
                              });
                              touch("airport")();
                            }}
                            onBlur={touch("airport")}
                          />
                          {fieldErr("airport", !fields.airport, "Please select an airport")}
                        </Field>

                        <AnimatePresence initial={false} mode="popLayout">
                          {fields.airport && (
                            <m.div key={`terminal-${fields.airport}`} variants={popIn} initial="initial" animate="animate" exit="exit">
                              <Field label="Terminal" filled={!!fields.airportTerminal}>
                                <Dropdown
                                  ariaLabel="Terminal"
                                  placeholder="Select terminal"
                                  icon={<TerminalIcon />}
                                  options={terminalOptions(fields.airport)}
                                  value={fields.airportTerminal}
                                  onChange={(e) => { set("airportTerminal")(e); touch("airportTerminal")(); }}
                                  onBlur={touch("airportTerminal")}
                                />
                                {fieldErr("airportTerminal", !fields.airportTerminal, "Please select a terminal")}
                              </Field>
                            </m.div>
                          )}
                        </AnimatePresence>

                        <m.div layout="position">
                          <Field
                            label={nonAirportField === "drop" ? "Drop Location" : "Pickup Location"}
                            filled={!!fields[nonAirportField].trim()}
                          >
                            <Input
                              icon={nonAirportField === "pickup" ? <IconPin className="w-4 h-4" /> : <FlagIcon />}
                              chipClass={nonAirportField === "pickup" ? "bw-chip--from" : ""}
                              placeholder="City or address"
                              value={fields[nonAirportField]}
                              onChange={set(nonAirportField)}
                              required
                              onMapClick={() => setMapPickerField(nonAirportField)}
                              autocomplete={nonAirportField === "drop" ? dropAutocomplete : pickupAutocomplete}
                              trailing={
                                <LiveLocationButton
                                  onLocate={(address, components) => {
                                    setFieldDirect(nonAirportField, address);
                                    const st = components?.find((c) => c.types.includes("administrative_area_level_1"))?.long_name || null;
                                    if (nonAirportField === "pickup") setPickupState(st); else setDropState(st);
                                  }}
                                />
                              }
                            />
                          </Field>
                        </m.div>

                        <m.div layout="position">{dateField("Date")}</m.div>
                        <m.div layout="position">{timeField()}</m.div>
                        <m.div layout="position" className="flex items-end">
                          <SearchButton />
                        </m.div>
                      </div>
                    </m.div>
                  )}
                </AnimatePresence>
              </form>
            </AnimatedHeight>

            <LocationMapPicker
              open={!!mapPickerField}
              title={mapPickerTitle()}
              initialAddress={mapPickerInitialAddress()}
              onClose={() => setMapPickerField(null)}
              onConfirm={handleMapPickerConfirm}
            />

            {mounted && createPortal(
              <AnimatePresence>
                {sameCityOpen && (
                  <m.div
                    key="bw-samecity-backdrop"
                    className="bw-portal fixed inset-0 z-[9999] flex items-center justify-center p-4"
                    style={{ background: "rgba(14,14,14,.55)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => setSameCityOpen(false)}
                  >
                    <m.div
                      role="dialog"
                      aria-modal="true"
                      aria-labelledby="bw-samecity-title"
                      className="bw-pop w-full max-w-[440px]"
                      style={{ padding: 26, borderRadius: 22 }}
                      initial={{ opacity: 0, scale: 0.95, y: 16 }}
                      animate={{ opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 420, damping: 32 } }}
                      exit={{ opacity: 0, scale: 0.97, y: 8, transition: { duration: 0.15 } }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="bw-surge-icon" style={{ width: 44, height: 44, marginBottom: 14 }}>
                        <IconClock className="w-5 h-5" />
                      </span>
                      <h3 id="bw-samecity-title" style={{ fontWeight: 700, fontSize: 18, margin: "0 0 6px", color: "#141414" }}>
                        Both stops are in the same city
                      </h3>
                      <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "#77736A", margin: "0 0 18px" }}>
                        For travel within one city an hourly package is cheaper than an
                        outstation fare. Pick a package to continue.
                      </p>
                      <div className="flex flex-col gap-2.5">
                        {PACKAGE_OPTIONS.map((p) => (
                          <m.button
                            key={p.value}
                            type="button"
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                              setSameCityAsked(true);
                              setSameCityOpen(false);
                              setFields((f) => ({ ...f, package: p.value }));
                              submitJourney(p.value);
                            }}
                            style={{
                              display: "flex", alignItems: "center", justifyContent: "space-between",
                              width: "100%", padding: "13px 16px", borderRadius: 13,
                              border: "1.5px solid #E5E5E5", background: "#fff", cursor: "pointer", textAlign: "left",
                            }}
                          >
                            <span>
                              <span style={{ display: "block", fontWeight: 700, fontSize: 14.5, color: "#141414" }}>{p.label}</span>
                              <span style={{ display: "block", fontSize: 12, color: "#8A857C" }}>{p.description}</span>
                            </span>
                            <span aria-hidden style={{ color: "#B8860B", fontWeight: 800 }}>→</span>
                          </m.button>
                        ))}
                      </div>
                      <m.button
                        type="button"
                        whileTap={{ scale: 0.97 }}
                        onClick={() => {
                          setSameCityAsked(true);
                          setSameCityOpen(false);
                          submitJourney();
                        }}
                        style={{
                          width: "100%", marginTop: 16, padding: "12px 0", borderRadius: 12,
                          border: "none", background: "transparent", color: "#77736A",
                          fontWeight: 600, fontSize: 13, cursor: "pointer", textDecoration: "underline",
                        }}
                      >
                        No, keep it as an outstation trip
                      </m.button>
                    </m.div>
                  </m.div>
                )}
                {outOfAreaOpen && (
                  <m.div
                    key="ooa-backdrop"
                    className="bw-portal fixed inset-0 z-[9999] flex items-center justify-center p-4"
                    style={{ background: "rgba(14,14,14,.55)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => setOutOfAreaOpen(false)}
                  >
                    <m.div
                      role="dialog"
                      aria-modal="true"
                      aria-labelledby="bw-ooa-title"
                      className="bw-pop w-full max-w-[440px]"
                      style={{ padding: 26, borderRadius: 22 }}
                      initial={{ opacity: 0, scale: 0.95, y: 16 }}
                      animate={{ opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 420, damping: 32 } }}
                      exit={{ opacity: 0, scale: 0.97, y: 8, transition: { duration: 0.15 } }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="bw-surge-icon" style={{ width: 44, height: 44, marginBottom: 14 }}>
                        <IconPin className="w-5 h-5" />
                      </span>
                      <h3 id="bw-ooa-title" style={{ fontWeight: 700, fontSize: 18, margin: "0 0 6px", color: "#141414" }}>
                        Outside our regular service area
                      </h3>
                      <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "#77736A", margin: "0 0 18px" }}>
                        We operate directly in Karnataka, Telangana, Andhra Pradesh and Maharashtra. Leave your
                        details and our team will confirm availability and pricing for this trip.
                      </p>
                      <div className="flex flex-col gap-3">
                        <Field label="Your Name">
                          <Input placeholder="Full name" value={requestName} onChange={(e) => setRequestName(e.target.value)} />
                        </Field>
                        <Field label="Mobile Number">
                          <Input type="tel" inputMode="numeric" placeholder="10-digit mobile number" value={requestPhone} onChange={(e) => setRequestPhone(e.target.value.replace(/\D/g, ""))} maxLength={10} />
                        </Field>
                        <Field label="Email">
                          <Input type="email" inputMode="email" placeholder="you@example.com" value={requestEmail} onChange={(e) => setRequestEmail(e.target.value)} />
                        </Field>
                      </div>
                      <div className="flex gap-3 mt-6">
                        <m.button
                          type="button" whileTap={{ scale: 0.97 }}
                          onClick={() => setOutOfAreaOpen(false)}
                          className="flex-1"
                          style={{ height: 48, borderRadius: 13, border: "1px solid #E8E5DE", background: "linear-gradient(180deg, #FFFFFF 0%, #F4F2EC 100%)", fontWeight: 600, fontSize: 14, color: "#2B2925", cursor: "pointer" }}
                        >
                          Cancel
                        </m.button>
                        <m.button
                          type="button" whileTap={{ scale: 0.97 }}
                          onClick={submitOutOfAreaRequest}
                          disabled={requestSubmitting}
                          className="flex-1 disabled:opacity-60"
                          style={{ height: 48, borderRadius: 13, border: 0, background: GRADIENT.active, boxShadow: GRADIENT.activeShadow, fontWeight: 700, fontSize: 14, color: "#141414", cursor: "pointer" }}
                        >
                          {requestSubmitting ? "Sending…" : "Request Booking"}
                        </m.button>
                      </div>
                    </m.div>
                  </m.div>
                )}
              </AnimatePresence>,
              document.body
            )}
          </div>
        </LayoutGroup>
      </MotionConfig>
    </LazyMotion>
  );
}

/* ═══════════════════════════════════════════════════════════════════════ */
/* Building blocks                                                        */
/* ═══════════════════════════════════════════════════════════════════════ */

// Yellow gradient when active; dark or light gradient when inactive.
function GradientPill({ active, onClick, children, layoutId, tone = "dark", size = "md", className = "", ...rest }) {
  const t = GRADIENT[tone];
  const sizeCls = size === "lg" ? "h-10 px-5 text-[14px]" : "px-5 py-2.5 text-[14.5px]";
  return (
    <m.button
      type="button"
      onClick={onClick}
      initial="rest"
      animate="rest"
      whileHover={active ? undefined : "hover"}
      whileTap={{ scale: 0.96 }}
      className={`no-touch-target relative isolate inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition-colors duration-200 ${sizeCls} ${className}`}
      style={{
        color: active ? "#141414" : t.text,
        backgroundImage: t.base,
        boxShadow: `inset 0 0 0 1px ${t.ring}`,
      }}
      {...rest}
    >
      <m.span
        aria-hidden
        variants={{ rest: { opacity: 0 }, hover: { opacity: 1 } }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 rounded-full -z-10"
        style={{ backgroundImage: t.hover, boxShadow: `inset 0 0 0 1px ${t.ringHover}` }}
      />
      {active && (
        <m.span
          aria-hidden
          layoutId={layoutId}
          transition={PILL_SPRING}
          className="absolute inset-0 rounded-full -z-10"
          style={{ backgroundImage: GRADIENT.active, boxShadow: GRADIENT.activeShadow }}
        />
      )}
      <span className="relative inline-flex items-center gap-2">{children}</span>
    </m.button>
  );
}

function SearchButton({ className = "" }) {
  return (
    <m.button
      type="submit"
      initial="rest"
      animate="rest"
      whileHover="hover"
      whileTap={{ scale: 0.985 }}
      className={`bw-cta ${className}`}
    >
      <span className="bw-cta-shine" aria-hidden />
      <span className="relative inline-flex items-center gap-2.5">
        <SearchIcon />
        Search Available Cabs
        <m.span
          variants={{ rest: { x: 0 }, hover: { x: 4 } }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          className="inline-flex"
        >
          <ArrowIcon />
        </m.span>
      </span>
    </m.button>
  );
}

function AnimatedHeight({ children }) {
  const innerRef = useRef(null);
  const [height, setHeight] = useState("auto");
  useEffect(() => {
    const el = innerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) => {
      setHeight(entry.borderBoxSize?.[0]?.blockSize ?? entry.target.offsetHeight);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <m.div initial={false} animate={{ height }} transition={{ duration: 0.3, ease: EASE_OUT }} style={{ overflow: "hidden" }}>
      <div ref={innerRef} style={{ position: "relative" }}>{children}</div>
    </m.div>
  );
}

function AddStopTile({ onAdd }) {
  return (
    <m.button type="button" onClick={onAdd} whileTap={{ scale: 0.97 }} className="bw-addstop">
      <span className="bw-addstop-plus"><PlusIcon /></span>
      Add stop
    </m.button>
  );
}

function StopFields({ stops, onChange, onRemove, onMapClick, autocompleteFor }) {
  return (
    <AnimatePresence mode="popLayout">
      {stops.map((stop, i) => (
        <m.div
          key={stop.id}
          layout
          variants={popIn}
          initial="initial"
          animate="animate"
          exit="exit"
          className="w-full sm:w-[230px]"
        >
          <Field label={`Stop ${i + 1}`} filled={!!stop.value.trim()}>
            <Input
              icon={<span>{i + 1}</span>}
              placeholder="Stop location"
              value={stop.value}
              onChange={(e) => onChange(stop.id, e.target.value)}
              onMapClick={onMapClick ? () => onMapClick(stop.id) : undefined}
              autocomplete={autocompleteFor ? autocompleteFor(stop.id) : null}
              trailing={
                <button type="button" onClick={() => onRemove(stop.id)} aria-label={`Remove stop ${i + 1}`} className="bw-icon-btn">
                  <CloseIcon />
                </button>
              }
            />
          </Field>
        </m.div>
      ))}
    </AnimatePresence>
  );
}

function SwapButton({ onClick }) {
  return (
    <div className="flex flex-col gap-1.5 shrink-0">
      <span className="bw-label" style={{ opacity: 0 }} aria-hidden>&nbsp;</span>
      <button
        type="button"
        onClick={onClick}
        title="Swap pickup and drop"
        aria-label="Swap pickup and drop locations"
        className="bw-icon-btn"
        style={{ width: 40, height: 40, borderRadius: 9999, border: "1px solid var(--bw-line)", background: "#fff" }}
      >
        <SwapIcon />
      </button>
    </div>
  );
}

function Field({ label, filled = false, children }) {
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <span className="bw-label">
        {label}
        <AnimatePresence initial={false}>
          {filled && (
            <m.span
              key="ok"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 22 }}
              aria-hidden
              style={{ width: 14, height: 14, borderRadius: 999, background: GRADIENT.active, display: "inline-grid", placeItems: "center", color: "#141414" }}
            >
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </m.span>
          )}
        </AnimatePresence>
      </span>
      {children}
    </div>
  );
}

function Input({ icon, chipClass = "", className = "", onMapClick, autocomplete, trailing, ...props }) {
  return (
    <div className={`bw-field ${icon ? "" : "bw-field--plain"}`}>
      {icon && <span className={`bw-chip ${chipClass}`}>{icon}</span>}
      <input
        {...props}
        ref={autocomplete ? autocomplete.attachTo : null}
        className={`bw-input ${className}`}
      />
      {onMapClick && (
        <button type="button" onClick={onMapClick} aria-label="Pick on map" title="Pick on map" className="bw-icon-btn">
          <MapIcon />
        </button>
      )}
      {trailing}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════ */
/* Custom DatePicker + Dropdown (Tailwind)                                */
/* Both render their panel in a portal, flip above the field when there   */
/* isn't room below, and are fully keyboard-operable.                     */
/* ═══════════════════════════════════════════════════════════════════════ */

// Full literal class strings so Tailwind's scanner picks them all up.
// ── Dropdown (custom select) ────────────────────────────────────────────
// options: [{ value, label, description?, badge?, triggerLabel?, disabled? }]
// onChange receives { target: { value } } — same shape as a native <select>.
function Dropdown({ value, onChange, onBlur, options, placeholder = "Select", icon, ariaLabel }) {
  const listId = useId();
  const pop = useAnchoredPopover({
    estimatedHeight: Math.min(options.length * 58 + 16, 336),
    minWidth: 280,
    onClose: onBlur,
  });
  const listRef = useRef(null);
  const selectedIdx = options.findIndex((o) => o.value === value);
  const selectedOpt = options[selectedIdx];
  const [active, setActive] = useState(-1);
  const typeahead = useRef({ query: "", time: 0 });

  function openList() {
    setActive(selectedIdx >= 0 ? selectedIdx : options.findIndex((o) => !o.disabled));
    pop.show();
  }
  function choose(i) {
    const o = options[i];
    if (!o || o.disabled) return;
    onChange({ target: { value: o.value } });
    pop.hide(true);
  }
  function step(from, delta) {
    let i = from;
    for (let n = 0; n < options.length; n++) {
      i = (i + delta + options.length) % options.length;
      if (!options[i].disabled) return i;
    }
    return from;
  }
  function onListKey(e) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => step(a, 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => step(a < 0 ? 0 : a, -1)); }
    else if (e.key === "Home") { e.preventDefault(); setActive(step(-1, 1)); }
    else if (e.key === "End") { e.preventDefault(); setActive(step(0, -1)); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); choose(active); }
    else if (e.key === "Tab") { pop.hide(false); }
    else if (e.key.length === 1 && /\S/.test(e.key)) {
      // Type-ahead: "mu" jumps to Mumbai
      const now = Date.now();
      const t = typeahead.current;
      t.query = now - t.time > 600 ? e.key.toLowerCase() : t.query + e.key.toLowerCase();
      t.time = now;
      const idx = options.findIndex((o) => !o.disabled && String(o.label).toLowerCase().startsWith(t.query));
      if (idx >= 0) setActive(idx);
    }
  }

  useEffect(() => {
    if (!pop.open) return;
    const id = requestAnimationFrame(() => listRef.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(id);
  }, [pop.open]);

  useEffect(() => {
    if (!pop.open || active < 0) return;
    listRef.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, pop.open]);

  return (
    <>
      <button
        ref={pop.triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={pop.open}
        aria-controls={pop.open ? listId : undefined}
        aria-label={selectedOpt ? `${ariaLabel}: ${selectedOpt.label}` : ariaLabel}
        onClick={() => (pop.open ? pop.hide() : openList())}
        onKeyDown={(e) => {
          if ((e.key === "ArrowDown" || e.key === "ArrowUp") && !pop.open) { e.preventDefault(); openList(); }
        }}
        className={`${TW.trigger} ${pop.open ? TW.triggerOpen : TW.triggerIdle}`}
      >
        {icon && <span className={`${TW.chip} ${pop.open ? TW.chipOpen : TW.chipIdle}`}>{icon}</span>}
        <span className={`${TW.value} ${selectedOpt ? "" : TW.placeholder}`}>
          {selectedOpt ? (selectedOpt.triggerLabel ?? selectedOpt.label) : placeholder}
        </span>
        <m.span animate={{ rotate: pop.open ? 180 : 0 }} transition={{ duration: 0.2 }} className="inline-flex text-[#77736A]">
          <ChevronIcon />
        </m.span>
      </button>

      <Popover pop={pop} className="p-1.5">
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          tabIndex={-1}
          aria-label={ariaLabel}
          aria-activedescendant={active >= 0 ? `${listId}-opt-${active}` : undefined}
          onKeyDown={onListKey}
          className="m-0 max-h-[320px] list-none overflow-y-auto overscroll-contain p-0 outline-none"
        >
          {options.map((o, i) => {
            const isSel = i === selectedIdx;
            const isActive = i === active;
            return (
              <li
                key={o.value}
                id={`${listId}-opt-${i}`}
                role="option"
                aria-selected={isSel}
                aria-disabled={o.disabled || undefined}
                data-idx={i}
                onMouseMove={() => !o.disabled && active !== i && setActive(i)}
                onMouseDown={(e) => e.preventDefault()} /* keep focus on the list */
                onClick={() => choose(i)}
                className={`${TW.option} ${isActive ? "bg-[#FFF6D6]" : ""} ${o.disabled ? "cursor-not-allowed opacity-40" : ""}`}
              >
                {o.badge && <span className={TW.badge}>{o.badge}</span>}
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-[14.5px] text-[#141414] ${isSel ? "font-bold" : "font-semibold"}`}>{o.label}</span>
                  {o.description && <span className="block truncate text-[12.5px] text-[#77736A]">{o.description}</span>}
                </span>
                <AnimatePresence initial={false}>
                  {isSel && (
                    <m.span
                      key="check"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 24 }}
                      className={`grid h-5 w-5 flex-none place-items-center rounded-full text-[#141414] ${TW.gold}`}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </m.span>
                  )}
                </AnimatePresence>
              </li>
            );
          })}
        </ul>
      </Popover>
    </>
  );
}

function LiveLocationButton({ onLocate }) {
  const [loading, setLoading] = useState(false);

  function handleClick() {
    if (!navigator.geolocation) return;
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLoading(false);
        const { latitude: lat, longitude: lng } = pos.coords;
        if (window.google?.maps) {
          new window.google.maps.Geocoder().geocode(
            { location: { lat, lng } },
            (results, status) => {
              if (status === "OK" && results?.[0]) {
                onLocate(results[0].formatted_address, results[0].address_components);
              }
            }
          );
        } else {
          onLocate(`${lat.toFixed(5)}, ${lng.toFixed(5)}`, []);
        }
      },
      () => setLoading(false),
      { timeout: 8000 }
    );
  }

  return (
    <button type="button" title="Use my current location" aria-label="Use my current location" onClick={handleClick} disabled={loading} className="bw-icon-btn">
      {loading ? (
        <m.span
          animate={{ rotate: 360 }}
          transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }}
          style={{ width: 15, height: 15, borderRadius: "50%", border: "2px solid #FFC107", borderTopColor: "transparent", display: "block" }}
        />
      ) : (
        <LocateIcon />
      )}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════════ */
/* Icons (1.7px stroke, currentColor)                                     */
/* ═══════════════════════════════════════════════════════════════════════ */
const svgProps = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };

function FlagIcon() {
  return <svg {...svgProps}><path d="M5 21V4" /><path d="M5 4h11l-2 4 2 4H5" /></svg>;
}
function SwapIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" width="16" height="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 7h12l-3.5-3.5" /><path d="M17 17H5l3.5 3.5" />
    </svg>
  );
}
function PackageIcon() {
  return <svg {...svgProps}><circle cx="12" cy="13" r="7.5" /><path d="M12 9.5V13l2.5 1.5M9.5 2.5h5" /></svg>;
}
function UsersIcon() {
  return <svg {...svgProps}><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><circle cx="17.5" cy="9" r="2.6" /><path d="M15.5 12.3c2.3.5 4 2.5 4 4.9" /></svg>;
}
function TerminalIcon() {
  return <svg {...svgProps}><path d="M4 21V8l8-4 8 4v13" /><path d="M9 21v-6h6v6M4 21h16" /></svg>;
}
function MapIcon() {
  return <svg {...svgProps}><path d="M9 20l-6-3V4l6 3 6-3 6 3v13l-6-3-6 3z" /><path d="M9 7v13M15 4v13" /></svg>;
}
function LocateIcon() {
  return <svg {...svgProps}><circle cx="12" cy="12" r="3.2" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="7.5" /><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22" /></svg>;
}
function CloseIcon() {
  return <svg {...svgProps} width={14} height={14} strokeWidth={2}><path d="M6 6l12 12M18 6L6 18" /></svg>;
}
function PlusIcon() {
  return <svg {...svgProps} width={12} height={12} strokeWidth={2.6}><path d="M12 5v14M5 12h14" /></svg>;
}
function SearchIcon() {
  return <svg {...svgProps} width={18} height={18} strokeWidth={2.2}><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.2-4.2" /></svg>;
}
function ArrowIcon() {
  return <svg {...svgProps} width={18} height={18} strokeWidth={2.2}><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
}
function PlaneDirIcon({ landing }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden style={{ transform: landing ? "rotate(180deg) scaleX(-1)" : "none" }}>
      <path d="M22 16.5 12 12V4a1.5 1.5 0 0 0-3 0v8L2 16.5V19l7-2v3l-2 1.5V23l3.5-1 3.5 1v-1.5L12 20v-3l7 2v-2.5Z" fill="currentColor" />
    </svg>
  );
}