import React, { useState, useEffect, useRef, useCallback } from "react";
import { useDispatch } from "react-redux";
import { navigate } from "vike/client/router";
import { createJourney } from "../store/slices/journeySlice";
import { useToast } from "../hooks/useToast";
import { IconArrowRight, IconSwap, IconClock, IconPlane, IconPin, IconZap } from "./Icons";
import Button from "./ui/Button";
import { FIELD_INPUT, FIELD_LABEL } from "./ui/classNames";
import LocationMapPicker from "./LocationMapPicker";
import { useJsApiLoader } from "@react-google-maps/api";
import { isAuthenticated } from "../api/tokens";
import { GOOGLE_MAPS_API_KEY } from "../api/config";
import { createSupportTicket } from "../api/services/support";

const MAPS_LIBRARIES = ["places"];

// States this business actually operates in — matches the real "Serving
// Karnataka & Hyderabad" copy already used in the Header/Footer, extended
// to the full states involved (Telangana for Hyderabad) plus their direct
// neighbors Andhra Pradesh and Maharashtra.
const ALLOWED_STATES = ["Karnataka", "Telangana", "Andhra Pradesh", "Maharashtra"];

const TABS = [
  { mode: "one-way",    label: "One Way",    icon: <IconArrowRight className="w-3.5 h-3.5" /> },
  { mode: "round-trip", label: "Round Trip", icon: <IconSwap className="w-3.5 h-3.5" /> },
  { mode: "local",      label: "Local",      icon: <IconClock className="w-3.5 h-3.5" /> },
  { mode: "airport",    label: "Airport",    icon: <IconPlane className="w-3.5 h-3.5" /> },
];

const today = new Date().toISOString().split("T")[0];

// Returns the minimum selectable time (HH:MM) — current time + 30 min buffer
// when the chosen date is today, otherwise no restriction.
function getMinTime(selectedDate) {
  if (selectedDate !== today) return undefined;
  const now = new Date(Date.now() + 30 * 60 * 1000); // +30 min buffer
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function emptyFields() {
  return {
    pickup: "", drop: "", date: today, time: "10:00",
    returnDate: "", returnTime: "18:00",
    package: "8 hrs / 80 km",
    passengers: "2",
    airport: "Kempegowda International Airport (BLR)",
    airportDirection: "drop"
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

export default function BookingWidget({ initialMode = "one-way", presetPickup = "", presetDrop = "" }) {
  const dispatch = useDispatch();
  const toast = useToast();
  const [mode, setMode] = useState(initialMode);
  const [fields, setFields] = useState({ ...emptyFields(), pickup: presetPickup, drop: presetDrop });
  const [surge, setSurge] = useState(false);

  // Real map-based location picking — tracks which field ("pickup", "drop",
  // etc.) the picker modal is currently filling in, so one modal instance
  // can serve every location field across every mode instead of
  // duplicating it per field.
  const [mapPickerField, setMapPickerField] = useState(null);
  function setFieldDirect(key, value) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  // States this business actually operates in — matches the real footer/
  // header copy ("Serving Karnataka & Hyderabad") plus its real neighbors.
  // Tracked per field (pickup/drop) using the real structured state data
  // Google returns, not string-matching the address text, since address
  // text alone is unreliable (city names repeat across states, "Bangalore"
  // could be typed without "Karnataka" in it at all).
  const [pickupState, setPickupState] = useState(null);
  const [dropState, setDropState] = useState(null);
  const [outOfAreaOpen, setOutOfAreaOpen] = useState(false);
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requestName, setRequestName] = useState("");
  const [requestPhone, setRequestPhone] = useState("");

  async function submitOutOfAreaRequest() {
    if (!requestName.trim() || !/^\d{10}$/.test(requestPhone.trim())) {
      toast("Please enter your name and a valid 10-digit mobile number", "error");
      return;
    }
    setRequestSubmitting(true);
    try {
      await createSupportTicket({
        name: requestName.trim(),
        phone: requestPhone.trim(),
        email: `phone_${requestPhone.trim()}@placeholder.local`,
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

  function extractStateFromPlace(place) {
    const comp = place?.address_components?.find((c) => c.types.includes("administrative_area_level_1"));
    return comp?.long_name || null;
  }

  // Live Google Places Autocomplete directly on the From/To inputs — loaded
  // here (not just inside the modal) so suggestions are ready the moment
  // someone starts typing, without needing to open the map first. Only two
  // handlers needed total: every mode reuses the same fields.pickup/
  // fields.drop state keys, so "pickup" and "drop" cover every occurrence.
  const { isLoaded: mapsLoaded } = useJsApiLoader({
    id: "abhi-cabs-google-maps",
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: MAPS_LIBRARIES,
  });
  const pickupAutocompleteRef = useRef(null);
  const dropAutocompleteRef = useRef(null);

  // Attach google.maps.places.Autocomplete to an input element.
  //
  // Key design decisions:
  //   1. useCallback with [mapsLoaded] dependency → stable function reference
  //      across renders. React's ref callback is called with null on detach and
  //      the DOM node on attach — a new function identity every render would
  //      cause React to detach+reattach on every render, breaking the listener.
  //   2. We use google.maps.places.Autocomplete (the classic API) directly on
  //      the existing <input> element. PlaceAutocompleteElement (new API) is a
  //      Web Component that creates its OWN input — it cannot wrap an existing
  //      one, so using it here would require replacing all our inputs with it,
  //      which would break the widget's controlled-input value binding.
  //   3. The ac ref is stored outside the callback so React ref detach (null)
  //      doesn't lose it — we just ignore the null call.

  const attachPickup = useCallback((inputDomEl) => {
    if (!inputDomEl || !mapsLoaded || !window.google?.maps?.places?.Autocomplete) return;
    if (pickupAutocompleteRef.current) return; // already attached
    const ac = new window.google.maps.places.Autocomplete(inputDomEl, {
      componentRestrictions: { country: "in" },
      fields: ["formatted_address", "name", "address_components", "geometry"],
    });
    pickupAutocompleteRef.current = ac;
    ac.addListener("place_changed", () => {
      const place = ac.getPlace();
      const value = place?.formatted_address || place?.name || "";
      if (value) setFieldDirect("pickup", value);
      setPickupState(extractStateFromPlace(place));
    });
  }, [mapsLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  const attachDrop = useCallback((inputDomEl) => {
    if (!inputDomEl || !mapsLoaded || !window.google?.maps?.places?.Autocomplete) return;
    if (dropAutocompleteRef.current) return; // already attached
    const ac = new window.google.maps.places.Autocomplete(inputDomEl, {
      componentRestrictions: { country: "in" },
      fields: ["formatted_address", "name", "address_components", "geometry"],
    });
    dropAutocompleteRef.current = ac;
    ac.addListener("place_changed", () => {
      const place = ac.getPlace();
      const value = place?.formatted_address || place?.name || "";
      if (value) setFieldDirect("drop", value);
      setDropState(extractStateFromPlace(place));
    });
  }, [mapsLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  const pickupAutocomplete = GOOGLE_MAPS_API_KEY ? { attachTo: attachPickup } : null;
  const dropAutocomplete   = GOOGLE_MAPS_API_KEY ? { attachTo: attachDrop }   : null;

  // Via stops — simple list of intermediate city names (no separate date/time)
  const [stops, setStops] = useState([]); // e.g. ["Mysore", "Coorg"]

  const set = (key) => (e) => setFields((f) => ({ ...f, [key]: e.target.value }));

  useEffect(() => {
    setSurge(isSurgeTime(fields.date, fields.time));
  }, [fields.date, fields.time]);

  useEffect(() => {
    // Clear stops when switching to non-applicable modes
    if (mode === "local" || mode === "airport") setStops([]);
  }, [mode]);

  // Stop helpers
  function addStop() {
    if (stops.length >= 4) return; // max 4 via stops
    setStops((s) => [...s, ""]);
  }
  function updateStop(i, val) {
    setStops((s) => s.map((v, idx) => idx === i ? val : v));
  }
  function removeStop(i) {
    setStops((s) => s.filter((_, idx) => idx !== i));
  }

  function handleSubmit(e) {
    e.preventDefault();

    if (mode !== "local" && !fields.pickup.trim()) {
      toast("Please enter a pickup location", "error"); return;
    }
    if (mode !== "local" && mode !== "airport" && !fields.drop.trim()) {
      toast("Please enter a drop location", "error"); return;
    }

    // Validate via stops — no empty stop boxes
    const filledStops = stops.filter((s) => s.trim());
    if (stops.length > 0 && filledStops.length < stops.length) {
      toast("Please fill in all via stop fields or remove empty ones", "error"); return;
    }

    // Past date/time check
    if (fields.date && fields.time) {
      const pickupDt = new Date(fields.date + "T" + fields.time);
      if (pickupDt < new Date(Date.now() + 30 * 60 * 1000)) {
        toast("Please select a pickup time at least 30 minutes from now", "error");
        return;
      }
    }

    // Out-of-service-area check — only when we actually have confirmed
    // state data (from Places Autocomplete or the map picker, both of
    // which return real structured address components). A location typed
    // manually without selecting a suggestion has no resolved state, so it
    // isn't blocked here — we can't verify it, and falsely blocking a
    // valid in-area booking would be worse than letting an unverified one
    // through to the same manual checks the business already relies on.
    const outOfAreaField =
      (pickupState && !ALLOWED_STATES.includes(pickupState)) ? "pickup" :
      (mode !== "local" && dropState && !ALLOWED_STATES.includes(dropState)) ? "drop" :
      null;
    if (outOfAreaField) {
      setOutOfAreaOpen(true);
      return;
    }

    const journey = {
      tripType: mode,
      pickup: fields.pickup,
      drop: mode === "airport" ? fields.drop || fields.airport : fields.drop,
      date: fields.date,
      time: fields.time,
      returnDate: fields.returnDate,
      returnTime: fields.returnTime,
      package: mode === "local" ? fields.package : "",
      passengers: fields.passengers,
      stops: filledStops,          // intermediate waypoints
      surge,
      surgeMultiplier: surge ? 1.05 : 1.0
    };

    const action = dispatch(createJourney(journey));
    navigate("/booking-search?j=" + action.payload.id);
  }

  // Stops (via) are added/removed with addStop/updateStop/removeStop below,
  // and rendered directly inline between the From/To fields in one-way
  // mode — see that block further down.

  return (
    <div className="relative z-20">
      {/* Tabs — solid black bar per Figma spec: gap 2px, padding 6px,
          yellow pill for the active tab. */}
      <div className="flex gap-[2px] p-[6px] overflow-x-auto bg-brand-black">
        {TABS.map((t) => (
          <button key={t.mode} type="button" onClick={() => setMode(t.mode)}
            className={`no-touch-target flex items-center gap-2 whitespace-nowrap px-5 py-2.5 rounded-full font-semibold text-[14.5px] transition-colors ${
              mode === t.mode ? "bg-primary text-brand-black" : "text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Surge banner */}
      {surge && (
        <div className="mx-3.5 mt-1 bg-amber-50 border border-amber-300 rounded-[10px] px-4 py-2.5 flex items-center gap-2.5">
          <IconZap className="w-4.5 h-4.5 text-amber-500 shrink-0" />
          <div>
            <span className="font-bold text-amber-700 text-[13.5px]">Immediate booking — 5% surge fee applied</span>
            <span className="text-amber-600 text-[12px] block">Pickup within 30 minutes. Surge shown on each vehicle.</span>
          </div>
        </div>
      )}

        <form onSubmit={handleSubmit} className="p-3.5 sm:p-5.5">

          {/* ── ONE WAY ──
              Single compact row (From / To / Add Stops / Pick Up Date /
              Time) when there are no stops — matching the original
              reference exactly. Only once a stop is actually added does
              the row split: From/To stay together up top, the stop
              field(s) appear directly below them, and Add Stops/Date/Time
              move down to their own row beneath — so the layout only
              changes "based on requirement" (an actual stop existing),
              never by default. The "Add Stops" stepper is real: each click
              adds/removes an actual named input, not just a silent count. */}
          {mode === "one-way" && (
            <>
              {stops.length === 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_160px_150px_140px] gap-3.5 items-end">
                  <Field label="From">
                    <Input icon={<IconPin className="w-4 h-4 text-primary" />} placeholder="Enter pickup city or address" value={fields.pickup} onChange={set("pickup")} required onMapClick={() => setMapPickerField("pickup")} autocomplete={pickupAutocomplete} />
                  </Field>
                  <Field label="To">
                    <Input icon={<IconPin className="w-4 h-4 text-amber-400" />} placeholder="Select destination" value={fields.drop} onChange={set("drop")} required onMapClick={() => setMapPickerField("drop")} autocomplete={dropAutocomplete} />
                  </Field>
                  <Field label="Add Stops">
                    <div className="flex items-center border border-border rounded-[10px] overflow-hidden bg-[#fbfbfe]">
                      <button type="button" disabled className="flex-1 py-3 text-text-secondary font-bold disabled:opacity-40">−</button>
                      <span className="px-2 font-bold text-[14px] text-text">0</span>
                      <button type="button" onClick={addStop}
                        className="flex-1 py-3 bg-primary text-brand-black font-bold">+</button>
                    </div>
                  </Field>
                  <Field label="Pick Up Date">
                    <Input type="date" min={today} value={fields.date} onChange={set("date")} required />
                  </Field>
                  <Field label="Time">
                    <TimePicker12hr value={fields.time} onChange={set("time")} min={getMinTime(fields.date)} />
                  </Field>
                </div>
              ) : (
                <div className="flex flex-wrap gap-3.5 items-end">
                  <div className="w-full sm:w-[220px]">
                    <Field label="From">
                      <Input icon={<IconPin className="w-4 h-4 text-primary" />} placeholder="Enter pickup city or address" value={fields.pickup} onChange={set("pickup")} required onMapClick={() => setMapPickerField("pickup")} autocomplete={pickupAutocomplete} />
                    </Field>
                  </div>

                  {/* Stop fields — appear here, between From and To, in the
                      same flowing row (not stacked below). Each has its own
                      inline − (remove this stop) and, on the last one, a +
                      (add another) button, matching the reference exactly.
                      Fixed width, same as every other field here — none of
                      these fields stretch to fill leftover row space. */}
                  {stops.map((stop, i) => (
                    <div key={i} className="w-full sm:w-[240px]">
                      <Field label={`Stop ${i + 1}`}>
                        <div className="flex items-center gap-1.5">
                          <Input
                            icon={<IconPin className="w-3.5 h-3.5 text-text-secondary shrink-0" />}
                            placeholder="Enter Stop Location"
                            value={stop}
                            onChange={(e) => updateStop(i, e.target.value)}
                            className="flex-1"
                          />
                          <button
                            type="button"
                            onClick={() => removeStop(i)}
                            aria-label="Remove this stop"
                            className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-text-secondary font-bold shrink-0 hover:bg-gray-50"
                          >
                            −
                          </button>
                          {i === stops.length - 1 && stops.length < 4 && (
                            <button
                              type="button"
                              onClick={addStop}
                              aria-label="Add another stop"
                              className="w-8 h-8 rounded-full bg-primary text-brand-black font-bold shrink-0 flex items-center justify-center"
                            >
                              +
                            </button>
                          )}
                        </div>
                      </Field>
                    </div>
                  ))}

                  <div className="w-full sm:w-[220px]">
                    <Field label="To">
                      <Input icon={<IconPin className="w-4 h-4 text-amber-400" />} placeholder="Select destination" value={fields.drop} onChange={set("drop")} required onMapClick={() => setMapPickerField("drop")} autocomplete={dropAutocomplete} />
                    </Field>
                  </div>
                  <div className="w-full sm:w-[170px]">
                    <Field label="Pick Up Date">
                      <Input type="date" min={today} value={fields.date} onChange={set("date")} required />
                    </Field>
                  </div>
                  <div className="w-full sm:w-[160px]">
                    <Field label="Time">
                      <TimePicker12hr value={fields.time} onChange={set("time")} min={getMinTime(fields.date)} />
                    </Field>
                  </div>
                </div>
              )}

              <Button type="submit" size="lg" block className="mt-4">Search Available Cabs</Button>
            </>
          )}

          {/* ── ROUND TRIP ── */}
          {mode === "round-trip" && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <Field label="Pickup">
                  <Input icon={<IconPin className="w-4 h-4 text-primary" />} placeholder="Enter pickup city or address" value={fields.pickup} onChange={set("pickup")} required onMapClick={() => setMapPickerField("pickup")} autocomplete={pickupAutocomplete} />
                </Field>
                <Field label="Destination">
                  <Input icon={<IconPin className="w-4 h-4 text-amber-400" />} placeholder="To city or address" value={fields.drop} onChange={set("drop")} required onMapClick={() => setMapPickerField("drop")} autocomplete={dropAutocomplete} />
                </Field>
                <Field label="Pickup Date">
                  <Input type="date" min={today} value={fields.date} onChange={set("date")} required />
                </Field>
                <Field label="Pickup Time">
                  <TimePicker12hr value={fields.time} onChange={set("time")} min={getMinTime(fields.date)} />
                </Field>
                <Field label="Return Date">
                  <Input type="date" min={fields.date || today} value={fields.returnDate} onChange={set("returnDate")} required />
                </Field>
              </div>

              <Button type="submit" size="lg" block className="mt-4">Search Available Cabs</Button>
            </>
          )}

          {/* ── LOCAL ── */}
          {mode === "local" && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <Field label="Pickup Location">
                  <Input icon={<IconPin className="w-4 h-4 text-text-secondary" />} placeholder="Enter pickup city or address" value={fields.pickup} onChange={set("pickup")} required onMapClick={() => setMapPickerField("pickup")} autocomplete={pickupAutocomplete} />
                </Field>
                <Field label="Package / Duration">
                  <select className={FIELD_INPUT} value={fields.package} onChange={set("package")}>
                    <option>4 hrs / 40 km</option>
                    <option>8 hrs / 80 km</option>
                    <option>12 hrs / 120 km</option>
                  </select>
                </Field>
                <Field label="Date">
                  <Input type="date" min={today} value={fields.date} onChange={set("date")} required />
                </Field>
                <Field label="Time">
                  <TimePicker12hr value={fields.time} onChange={set("time")} min={getMinTime(fields.date)} />
                </Field>
              </div>
              <div className="mt-3.5">
                <Button type="submit" size="lg" block>Search Available Cabs</Button>
              </div>
            </>
          )}

          {/* ── AIRPORT ── */}
          {mode === "airport" && (
            <>
              <div className="flex gap-2 mb-3.5">
                {[["drop", "Drop to Airport"], ["pickup", "Pickup from Airport"]].map(([val, label]) => (
                  <button type="button" key={val}
                    onClick={() => setFields((f) => ({ ...f, airportDirection: val }))}
                    className={`border rounded-full px-4.5 py-2 font-semibold text-[13.5px] transition-colors ${
                      fields.airportDirection === val
                        ? "bg-primary border-primary text-white"
                        : "border-border text-text-secondary bg-white"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <Field label="Airport">
                  <select className={FIELD_INPUT} value={fields.airport} onChange={set("airport")}>
                    <option>Kempegowda International Airport (BLR)</option>
                  </select>
                </Field>
                <Field label={fields.airportDirection === "pickup" ? "Airport (Pickup)" : "Pickup Location"}>
                  <Input placeholder="Enter pickup city or address" value={fields.pickup} onChange={set("pickup")} required onMapClick={() => setMapPickerField("pickup")} autocomplete={pickupAutocomplete} />
                </Field>
                <Field label={fields.airportDirection === "pickup" ? "Drop Location" : "Destination"}>
                  <Input placeholder="Enter destination" value={fields.drop} onChange={set("drop")} required onMapClick={() => setMapPickerField("drop")} autocomplete={dropAutocomplete} />
                </Field>
                <Field label="Date">
                  <Input type="date" min={today} value={fields.date} onChange={set("date")} required />
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-3.5">
                <Field label="Time">
                  <TimePicker12hr value={fields.time} onChange={set("time")} min={getMinTime(fields.date)} />
                </Field>

                <div className="flex items-end">
                  <Button type="submit" size="lg" block>Search Available Cabs</Button>
                </div>
              </div>
            </>
          )}

        </form>

        <LocationMapPicker
          open={!!mapPickerField}
          title={mapPickerField === "drop" ? "Select Drop Location" : "Select Pickup Location"}
          initialAddress={mapPickerField ? fields[mapPickerField] : ""}
          onClose={() => setMapPickerField(null)}
          onConfirm={(address, stateName) => {
            setFieldDirect(mapPickerField, address);
            if (mapPickerField === "pickup") setPickupState(stateName);
            if (mapPickerField === "drop") setDropState(stateName);
            setMapPickerField(null);
          }}
        />

        {/* Out-of-service-area — offers a manual request instead of a live
            search/instant booking, since this business doesn't directly
            operate outside Karnataka, Telangana, Andhra Pradesh and
            Maharashtra. Goes through the same real Contact/Support
            endpoint used elsewhere for this "not a live flow yet" pattern
            (e.g. the earlier Group/Coach request), not a fake confirmation. */}
        {outOfAreaOpen && (
          <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4" onClick={() => setOutOfAreaOpen(false)}>
            <div className="bg-white rounded-[20px] w-full max-w-[440px] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-bold text-[17px] m-0 mb-2">Outside our regular service area</h3>
              <p className="text-[13.5px] text-text-secondary m-0 mb-4 leading-relaxed">
                We currently operate directly in Karnataka, Telangana, Andhra Pradesh and Maharashtra.
                Your trip falls outside these states — leave your details and our team will get back to you
                to confirm availability and pricing.
              </p>
              <div className="flex flex-col gap-3">
                <Field label="Your Name">
                  <Input placeholder="Full name" value={requestName} onChange={(e) => setRequestName(e.target.value)} />
                </Field>
                <Field label="Mobile Number">
                  <Input type="tel" placeholder="10-digit mobile number" value={requestPhone} onChange={(e) => setRequestPhone(e.target.value)} maxLength={10} />
                </Field>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={() => setOutOfAreaOpen(false)} className="flex-1 py-3 rounded-[11px] border border-border font-semibold text-[14px]">
                  Cancel
                </button>
                <button
                  onClick={submitOutOfAreaRequest}
                  disabled={requestSubmitting}
                  className="flex-1 py-3 rounded-[11px] bg-primary text-brand-black font-bold text-[14px] disabled:opacity-60"
                >
                  {requestSubmitting ? "Sending…" : "Request Booking"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <label className={FIELD_LABEL}>{label}</label>
      {children}
    </div>
  );
}


// ── 12-hour AM/PM Time Picker ─────────────────────────────────────────────
// value / onChange use "HH:MM" (24hr) internally so the rest of the form
// doesn't need to change; the picker just renders in 12hr format.
function TimePicker12hr({ value, onChange, min }) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef(null);

  // Parse "HH:MM" → { h12, minute, ampm }
  function parse(v) {
    if (!v) return { h12: 10, minute: 0, ampm: "AM" };
    const [hh, mm] = v.split(":").map(Number);
    const ampm = hh < 12 ? "AM" : "PM";
    const h12 = hh % 12 || 12;
    return { h12, minute: mm, ampm };
  }

  // Convert back to "HH:MM"
  function toHHMM(h12, minute, ampm) {
    let hh = h12 % 12;
    if (ampm === "PM") hh += 12;
    return `${String(hh).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }

  const { h12, minute, ampm } = parse(value);

  function isDisabled(h12c, minutec, ampmc) {
    if (!min) return false;
    const candidate = toHHMM(h12c, minutec, ampmc);
    return candidate < min;
  }

  function select(h12c, minutec, ampmc) {
    const v = toHHMM(h12c, minutec, ampmc);
    if (isDisabled(h12c, minutec, ampmc)) return;
    onChange({ target: { value: v } });
    setOpen(false);
  }

  // Close on outside click
  React.useEffect(() => {
    if (!open) return;
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const displayTime = (() => {
    const v = toHHMM(h12, minute, ampm);
    if (!v) return "Select time";
    const [hh, mm] = v.split(":").map(Number);
    const ap = hh < 12 ? "AM" : "PM";
    const h = hh % 12 || 12;
    return `${h}:${String(mm).padStart(2, "0")} ${ap}`;
  })();

  const hours = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const minutes = [0, 15, 30, 45];

  return (
    <div ref={ref} style={{ position: "relative", width: "100%" }}>
      {/* Trigger */}
      <div
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2.5 border border-border rounded-[10px] px-3.5 py-3 bg-[#fbfbfe] focus-within:border-brand-black focus-within:bg-white transition-colors cursor-pointer select-none"
        style={{ minWidth: 110 }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, opacity: 0.45 }}>
          <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1.7" />
          <path d="M12 7v5.5l3.5 2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
        <span style={{ fontSize: 14.5, color: "#111", fontWeight: 500, whiteSpace: "nowrap" }}>{displayTime}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ marginLeft: "auto", flexShrink: 0, opacity: 0.4 }}>
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 999,
          background: "#fff", border: "1px solid #E5E5E5", borderRadius: 14,
          boxShadow: "0 8px 32px rgba(0,0,0,0.13)", padding: 14, minWidth: 240,
        }}>
          {/* AM / PM toggle */}
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            {["AM", "PM"].map((ap) => (
              <button
                key={ap} type="button"
                onClick={() => select(h12, minute, ap)}
                style={{
                  flex: 1, padding: "7px 0", borderRadius: 9, border: "none",
                  fontWeight: 700, fontSize: 13.5, cursor: "pointer",
                  background: ampm === ap ? "#FFC107" : "#F3F3F3",
                  color: ampm === ap ? "#111" : "#666",
                  opacity: isDisabled(h12, minute, ap) ? 0.35 : 1,
                }}
              >{ap}</button>
            ))}
          </div>

          {/* Hour grid */}
          <div style={{ fontSize: 11, fontWeight: 600, color: "#999", letterSpacing: ".08em", marginBottom: 6 }}>HOUR</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 5, marginBottom: 12 }}>
            {hours.map((hr) => {
              const dis = isDisabled(hr, minute, ampm);
              const active = hr === h12;
              return (
                <button
                  key={hr} type="button"
                  onClick={() => select(hr, minute, ampm)}
                  disabled={dis}
                  style={{
                    padding: "6px 0", borderRadius: 8, border: "none",
                    fontWeight: active ? 700 : 500, fontSize: 13.5, cursor: dis ? "not-allowed" : "pointer",
                    background: active ? "#111" : "#F5F5F5",
                    color: active ? "#FFC107" : dis ? "#ccc" : "#333",
                  }}
                >{hr}</button>
              );
            })}
          </div>

          {/* Minute options */}
          <div style={{ fontSize: 11, fontWeight: 600, color: "#999", letterSpacing: ".08em", marginBottom: 6 }}>MINUTE</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 5 }}>
            {minutes.map((mn) => {
              const dis = isDisabled(h12, mn, ampm);
              const active = mn === minute;
              return (
                <button
                  key={mn} type="button"
                  onClick={() => select(h12, mn, ampm)}
                  disabled={dis}
                  style={{
                    padding: "6px 0", borderRadius: 8, border: "none",
                    fontWeight: active ? 700 : 500, fontSize: 13.5, cursor: dis ? "not-allowed" : "pointer",
                    background: active ? "#111" : "#F5F5F5",
                    color: active ? "#FFC107" : dis ? "#ccc" : "#333",
                  }}
                >{String(mn).padStart(2, "0")}</button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Input({ icon, className = "", onMapClick, autocomplete, ...props }) {
  // autocomplete?.attachTo is a stable useCallback — pass it as the ref
  // callback directly. React calls it with the DOM node on mount and null
  // on unmount; the callback ignores null so no cleanup is needed.
  const inputEl = (
    <input
      {...props}
      ref={autocomplete ? autocomplete.attachTo : null}
      className={`border-none bg-transparent outline-none text-base md:text-[14.5px] text-text w-full min-w-0 ${className}`}
    />
  );
  return (
    <div className="flex items-center gap-2.5 border border-border rounded-[10px] px-3.5 py-3 bg-[#fbfbfe] focus-within:border-brand-black focus-within:bg-white transition-colors">
      {icon}
      {inputEl}
      {onMapClick && (
        <button
          type="button"
          onClick={onMapClick}
          aria-label="Pick on map"
          className="shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-primary hover:bg-primary-tint transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M9 20l-6-3V4l6 3 6-3 6 3v13l-6-3-6 3z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
            <path d="M9 4v13M15 7v13" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  );
}