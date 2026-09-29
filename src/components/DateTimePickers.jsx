import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { LazyMotion, domMax, m, AnimatePresence, MotionConfig } from "framer-motion";
import { IconClock } from "./Icons";
import { toISODate, fromISODate, formatDate } from "../lib/dateTime";

// ─────────────────────────────────────────────────────────────────────────────
// Shared calendar + time pickers.
//
// These were born inside BookingWidget; they live here so that EVERY screen
// that asks for a date or a time (home widget, /booking-search inline form,
// My Bookings filters) uses the same calendar and the same 12-hour time
// picker, with the same look and the same keyboard behaviour.
//
// Values are unchanged: date "YYYY-MM-DD", time "HH:mm", and onChange still
// receives { target: { value } } so they drop into existing handlers.
// ─────────────────────────────────────────────────────────────────────────────

export const EASE_OUT = [0.22, 1, 0.36, 1];

// Vertical gradients read as a soft, lit surface (more refined than the
// earlier 135° diagonal). Active is always yellow; inactive has a dark
// variant (on the black tab bar) and a light variant (on the white card).
export const GRADIENT = {
  active: "linear-gradient(180deg, #FFD54A 0%, #FFC107 55%, #F0A500 100%)",
  activeShadow:
    "0 8px 18px -8px rgba(240,165,0,.75), inset 0 1px 0 rgba(255,255,255,.6), inset 0 -1px 0 rgba(0,0,0,.08)",
  dark: {
    base: "linear-gradient(180deg, #1F1F1F 0%, #131313 100%)",
    hover: "linear-gradient(180deg, #2E2B22 0%, #171612 100%)",
    ring: "rgba(255,255,255,.06)",
    ringHover: "rgba(255,193,7,.38)",
    text: "rgba(255,255,255,.72)",
  },
  // Inactive on the white card: a visible pale-gold gradient. It stays in the
  // yellow family but is clearly softer than the saturated active pill
  // (no glow, lighter stops, brown text instead of black).
  light: {
    base: "linear-gradient(180deg, #FFFDF5 0%, #FDEFC4 55%, #F8E09A 100%)",
    hover: "linear-gradient(180deg, #FFF8DD 0%, #FBE39A 55%, #F5D06A 100%)",
    ring: "rgba(224,154,0,.28)",
    ringHover: "rgba(224,154,0,.55)",
    text: "#6B4E00",
  },
};


// Scoped stylesheet: hover/focus states are far cleaner in CSS than inline.
// .bw-portal carries the same tokens for things rendered into <body>.
export const BW_CSS = `
.bw-root, .bw-portal {
  --bw-yellow: #FFC107;
  --bw-ink: #141414;
  --bw-text: #2B2925;
  --bw-muted: #77736A;
  --bw-faint: #A8A49B;
  --bw-line: #E8E5DE;
  --bw-line-strong: #D3CFC5;
  --bw-surface: #F8F7F3;
  --bw-tint: #FFF8DF;
}
.bw-label {
  display: flex; align-items: center; gap: 6px;
  font-size: 12px; font-weight: 600; letter-spacing: .01em;
  color: var(--bw-muted); padding-left: 2px;
}
.bw-field {
  position: relative; display: flex; align-items: center; gap: 10px;
  height: 52px; padding: 0 8px 0 8px; min-width: 0;
  border: 1px solid var(--bw-line); border-radius: 14px;
  background: var(--bw-surface);
  transition: border-color .2s, background-color .2s, box-shadow .2s;
}
.bw-field--plain { padding-left: 14px; }
.bw-field:hover { border-color: var(--bw-line-strong); background: #fff; }
.bw-field:focus-within, .bw-field.is-open {
  border-color: var(--bw-yellow); background: #fff;
  box-shadow: 0 0 0 4px rgba(255,193,7,.18);
}
.bw-field--button { cursor: pointer; user-select: none; }
.bw-field--button:focus-visible { outline: none; border-color: var(--bw-yellow); box-shadow: 0 0 0 4px rgba(255,193,7,.18); }
.bw-chip {
  flex: none; width: 34px; height: 34px; border-radius: 10px;
  display: grid; place-items: center;
  background: #fff; border: 1px solid var(--bw-line); color: var(--bw-ink);
  font-size: 12.5px; font-weight: 700;
  transition: background-color .2s, border-color .2s, color .2s;
}
.bw-chip--from { background: var(--bw-tint); border-color: #F6E3A1; color: #B07A00; }
.bw-field:focus-within .bw-chip, .bw-field.is-open .bw-chip {
  background: var(--bw-yellow); border-color: var(--bw-yellow); color: var(--bw-ink);
}
.bw-input {
  flex: 1; min-width: 0; border: 0; outline: 0; background: transparent;
  font-size: 15px; font-weight: 500; color: var(--bw-ink);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.bw-input::placeholder, .bw-input.is-placeholder { color: var(--bw-faint); font-weight: 400; }
@media (max-width: 767px) { .bw-input { font-size: 16px; } } /* stops iOS zoom-on-focus */
.bw-icon-btn {
  flex: none; width: 32px; height: 32px; border-radius: 9px; border: 0;
  display: grid; place-items: center; background: transparent;
  color: var(--bw-muted); cursor: pointer;
  transition: background-color .2s, color .2s;
}
.bw-icon-btn:hover { background: rgba(255,193,7,.16); color: var(--bw-ink); }
.bw-icon-btn:focus-visible { outline: 2px solid var(--bw-yellow); outline-offset: 1px; }
.bw-icon-btn:disabled { opacity: .5; cursor: default; }

.bw-addstop {
  width: 100%; height: 52px; display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  border: 1.5px dashed var(--bw-line-strong); border-radius: 14px; background: transparent;
  color: var(--bw-text); font-weight: 600; font-size: 14px; white-space: nowrap; cursor: pointer;
  transition: border-color .2s, background-color .2s, color .2s;
}
.bw-addstop:hover { border-color: var(--bw-yellow); background: #FFFBEA; color: var(--bw-ink); }
.bw-addstop:focus-visible { outline: none; border-color: var(--bw-yellow); box-shadow: 0 0 0 4px rgba(255,193,7,.18); }
.bw-addstop-plus {
  width: 22px; height: 22px; border-radius: 999px; display: grid; place-items: center;
  background: ${GRADIENT.active}; color: var(--bw-ink);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.6);
}

.bw-cta {
  position: relative; overflow: hidden; isolation: isolate;
  /* 350px wide, centered; shrinks to fit on screens narrower than that */
  width: 100%; max-width: 350px; margin-inline: auto;
  height: 54px; border: 0; border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 15.5px; letter-spacing: .01em; color: var(--bw-ink);
  cursor: pointer; background: ${GRADIENT.active};
  box-shadow: 0 14px 28px -14px rgba(240,165,0,.85), inset 0 1px 0 rgba(255,255,255,.55), inset 0 -2px 0 rgba(0,0,0,.08);
}
.bw-cta-shine {
  position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(110deg, transparent 30%, rgba(255,255,255,.55) 50%, transparent 70%);
  transform: translateX(-120%);
  transition: transform .8s cubic-bezier(.22,1,.36,1);
}
.bw-cta:hover .bw-cta-shine { transform: translateX(120%); }
.bw-cta:focus-visible { outline: 2px solid var(--bw-ink); outline-offset: 3px; }

.bw-surge {
  display: flex; align-items: center; gap: 12px; padding: 10px 14px;
  border-radius: 14px; border: 1px solid rgba(255,193,7,.45);
  background: linear-gradient(90deg, #FFF6D6 0%, #FFFCF2 100%);
}
.bw-surge-icon {
  flex: none; width: 32px; height: 32px; border-radius: 999px; display: grid; place-items: center;
  background: ${GRADIENT.active}; color: var(--bw-ink);
}

.bw-segment { display: inline-flex; gap: 4px; padding: 4px; border-radius: 999px; background: #F1EFE9; }

.bw-pop {
  background: #fff; border: 1px solid var(--bw-line); border-radius: 18px;
  box-shadow: 0 24px 48px -16px rgba(20,20,20,.28), 0 2px 6px rgba(20,20,20,.06);
  padding: 14px;
}
.bw-pop-title { font-size: 11.5px; font-weight: 600; color: var(--bw-muted); margin: 0 0 6px 2px; }
.bw-tcell {
  padding: 8px 0; border-radius: 10px; border: 0; cursor: pointer;
  font-size: 14px; font-weight: 500; color: var(--bw-text); background: #F6F5F1;
  transition: background-color .15s, color .15s;
}
.bw-field.has-error, .bw-field.has-error:hover { border-color: #E0662A; background: #FFF8F4; }
.bw-field.has-error:focus-within, .bw-field.has-error.is-open { border-color: #E0662A; box-shadow: 0 0 0 4px rgba(224,102,42,.16); background: #fff; }
.bw-time-error { color: #C2410C; font-size: 12px; font-weight: 500; line-height: 1.3; }
.bw-tcell:hover:not(:disabled):not(.is-active) { background: #FFF1C2; }
.bw-tcell:disabled { color: #CBC7BE; cursor: not-allowed; background: #FAFAF8; }
.bw-tcell.is-active { background: ${GRADIENT.active}; color: var(--bw-ink); font-weight: 700; box-shadow: ${GRADIENT.activeShadow}; }

@media (prefers-reduced-motion: reduce) {
  .bw-cta-shine { transition: none; }
}
`;

export const TW = {
  trigger:
    "group relative flex h-[52px] w-full min-w-0 items-center gap-2.5 rounded-[14px] border pl-2 pr-3 text-left outline-none transition-[border-color,background-color,box-shadow] duration-200",
  triggerIdle:
    "border-[#E8E5DE] bg-[#F8F7F3] hover:border-[#D3CFC5] hover:bg-white focus-visible:border-[#FFC107] focus-visible:bg-white focus-visible:shadow-[0_0_0_4px_rgba(255,193,7,0.18)]",
  triggerOpen: "border-[#FFC107] bg-white shadow-[0_0_0_4px_rgba(255,193,7,0.18)]",
  chip: "grid h-[34px] w-[34px] flex-none place-items-center rounded-[10px] border transition-colors duration-200",
  chipIdle:
    "border-[#E8E5DE] bg-white text-[#141414] group-focus-visible:border-[#FFC107] group-focus-visible:bg-[#FFC107]",
  chipOpen: "border-[#FFC107] bg-[#FFC107] text-[#141414]",
  value: "min-w-0 flex-1 truncate text-[15px] font-medium text-[#141414]",
  placeholder: "font-normal text-[#A8A49B]",
  pop: "rounded-[18px] border border-[#E8E5DE] bg-white shadow-[0_24px_48px_-16px_rgba(20,20,20,0.28),0_2px_6px_rgba(20,20,20,0.06)]",
  gold: "bg-[linear-gradient(180deg,#FFD54A_0%,#FFC107_55%,#F0A500_100%)] shadow-[0_8px_18px_-8px_rgba(240,165,0,0.75),inset_0_1px_0_rgba(255,255,255,0.6)]",
  navBtn:
    "grid h-8 w-8 place-items-center rounded-[10px] text-[#2B2925] transition-colors hover:bg-[#F6F5F1] disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC107]",
  dayBase:
    "relative grid h-9 place-items-center rounded-[10px] text-[13.5px] tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC107] focus-visible:ring-offset-1",
  daySelected:
    "font-bold text-[#141414] bg-[linear-gradient(180deg,#FFD54A_0%,#FFC107_55%,#F0A500_100%)] shadow-[0_8px_18px_-8px_rgba(240,165,0,0.75),inset_0_1px_0_rgba(255,255,255,0.6)]",
  dayDisabled: "cursor-not-allowed text-[#D3CFC5] line-through decoration-[#E3DFD6]",
  dayOutside: "font-medium text-[#B9B5AC] hover:bg-[#F6F5F1]",
  dayIdle: "font-medium text-[#2B2925] hover:bg-[#FFF1C2]",
  quick:
    "rounded-full border border-[#E8E5DE] bg-[linear-gradient(180deg,#FFFFFF_0%,#F6F4EE_100%)] px-3 py-1.5 text-[12.5px] font-semibold text-[#2B2925] transition-colors hover:border-[#F0C24A] hover:bg-[linear-gradient(180deg,#FFFDF5_0%,#FDEFC4_100%)] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC107]",
  quickActive:
    "rounded-full border border-transparent px-3 py-1.5 text-[12.5px] font-bold text-[#141414] bg-[linear-gradient(180deg,#FFD54A_0%,#FFC107_55%,#F0A500_100%)] shadow-[0_8px_18px_-8px_rgba(240,165,0,0.75),inset_0_1px_0_rgba(255,255,255,0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141414]",
  option: "flex cursor-pointer select-none items-center gap-3 rounded-[12px] px-2.5 py-2 transition-colors",
  badge:
    "grid h-9 min-w-[48px] place-items-center rounded-[10px] bg-[linear-gradient(180deg,#2B2B2B_0%,#141414_100%)] px-2 text-[11.5px] font-bold tracking-[0.06em] text-[#FFC107]",
};

// ── Shared: anchored popover state (position, flip, outside click, Esc) ──
export function useAnchoredPopover({ estimatedHeight = 360, minWidth = 280, onClose } = {}) {
  const triggerRef = useRef(null);
  const popRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const measure = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const width = Math.min(Math.max(r.width, minWidth), vw - 16);
    const left = Math.min(Math.max(8, r.left), vw - width - 8);
    const spaceBelow = vh - r.bottom;
    const placeAbove = spaceBelow < estimatedHeight + 16 && r.top > spaceBelow;
    setPos({
      left,
      width,
      top: placeAbove ? undefined : r.bottom + 8,
      bottom: placeAbove ? vh - r.top + 8 : undefined,
      placeAbove,
    });
  }, [estimatedHeight, minWidth]);

  const show = useCallback(() => { measure(); setOpen(true); }, [measure]);
  const hide = useCallback((returnFocus = false) => {
    setOpen(false);
    onCloseRef.current?.();
    if (returnFocus) triggerRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e) => {
      if (triggerRef.current?.contains(e.target) || popRef.current?.contains(e.target)) return;
      hide(false);
    };
    const onKey = (e) => { if (e.key === "Escape") { e.preventDefault(); hide(true); } };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, hide, measure]);

  return { triggerRef, popRef, open, pos, show, hide, mounted };
}

export function Popover({ pop, label, className = "", children }) {
  if (!pop.mounted) return null;
  return createPortal(
    <AnimatePresence>
      {pop.open && pop.pos && (
        <m.div
          ref={pop.popRef}
          aria-label={label}
          initial={{ opacity: 0, y: pop.pos.placeAbove ? 6 : -6, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: pop.pos.placeAbove ? 4 : -4, scale: 0.98 }}
          transition={{ duration: 0.18, ease: EASE_OUT }}
          style={{
            position: "fixed",
            left: pop.pos.left,
            width: pop.pos.width,
            top: pop.pos.top,
            bottom: pop.pos.bottom,
            zIndex: 99999,
            transformOrigin: pop.pos.placeAbove ? "bottom left" : "top left",
          }}
          className={`${TW.pop} ${className}`}
        >
          {children}
        </m.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

// ── Date helpers (local time, never UTC) ────────────────────────────────
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const fmtMonthTitle = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" });
const fmtFull = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
function addMonthsClamped(d, n) {
  const first = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  return new Date(first.getFullYear(), first.getMonth(), Math.min(d.getDate(), last));
}
function sameDay(a, b) {
  return !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function sameMonth(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth(); }
function formatTriggerDate(d) {
  // Same wording as every other date on the site; year only when it is not this year.
  return formatDate(d, { weekday: true, year: "auto" });
}

// ── DatePicker ──────────────────────────────────────────────────────────
// value/min are "YYYY-MM-DD"; onChange receives { target: { value } } so it
// drops into the existing set("date") handlers unchanged.
export function DatePicker({ value, onChange, min, placeholder = "Select date", ariaLabel = "Choose date", showQuickPicks = true }) {
  const pop = useAnchoredPopover({ estimatedHeight: 410, minWidth: 312 });
  const selected = fromISODate(value);
  const minDate = fromISODate(min);
  const todayDate = fromISODate(toISODate(new Date()));
  const initial = selected || minDate || todayDate;

  const [view, setView] = useState(() => startOfMonth(initial));
  const [focusDate, setFocusDate] = useState(initial);
  const [dir, setDir] = useState(0);
  const gridRef = useRef(null);
  const keyNav = useRef(false);

  const isDisabled = (d) => !!minDate && d < minDate;
  const canPrev = !minDate || view > startOfMonth(minDate);

  function openPicker() {
    const base = selected || minDate || todayDate;
    setView(startOfMonth(base));
    setFocusDate(base);
    setDir(0);
    pop.show();
  }
  function commit(d) {
    if (isDisabled(d)) return;
    onChange({ target: { value: toISODate(d) } });
    pop.hide(true);
  }
  function navMonth(n) {
    const next = addMonthsClamped(focusDate, n);
    setDir(n);
    setView(startOfMonth(next));
    setFocusDate(next);
  }
  function moveFocus(next) {
    if (!sameMonth(next, view)) { setDir(next > focusDate ? 1 : -1); setView(startOfMonth(next)); }
    keyNav.current = true;
    setFocusDate(next);
  }
  function onGridKey(e) {
    const deltas = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    let next = null;
    if (deltas[e.key] !== undefined) next = addDays(focusDate, deltas[e.key]);
    else if (e.key === "PageUp") next = addMonthsClamped(focusDate, -1);
    else if (e.key === "PageDown") next = addMonthsClamped(focusDate, 1);
    else if (e.key === "Home") next = addDays(focusDate, -focusDate.getDay());
    else if (e.key === "End") next = addDays(focusDate, 6 - focusDate.getDay());
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); commit(focusDate); return; }
    if (next) { e.preventDefault(); moveFocus(next); }
  }

  const focusDay = () =>
    gridRef.current?.querySelector(`[data-date="${toISODate(focusDate)}"]`)?.focus({ preventScroll: true });

  // Focus the active day when the panel opens, and after keyboard moves
  useEffect(() => {
    if (!pop.open) return;
    const id = requestAnimationFrame(focusDay);
    return () => cancelAnimationFrame(id);
  }, [pop.open]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!pop.open || !keyNav.current) return;
    keyNav.current = false;
    const id = requestAnimationFrame(focusDay);
    return () => cancelAnimationFrame(id);
  }, [focusDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const gridStart = addDays(view, -view.getDay());
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i)); // fixed 6 rows = no height jump

  const tomorrow = addDays(todayDate, 1);
  const saturday = addDays(todayDate, ((6 - todayDate.getDay() + 7) % 7) || 7);
  const quick = [["Today", todayDate], ["Tomorrow", tomorrow], ["Saturday", saturday]]
    .filter(([, d], i, arr) => arr.findIndex(([, x]) => sameDay(x, d)) === i);

  return (
    <>
      <button
        ref={pop.triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={pop.open}
        aria-label={selected ? `${ariaLabel}: ${fmtFull.format(selected)}` : ariaLabel}
        onClick={() => (pop.open ? pop.hide() : openPicker())}
        onKeyDown={(e) => { if (e.key === "ArrowDown" && !pop.open) { e.preventDefault(); openPicker(); } }}
        className={`${TW.trigger} ${pop.open ? TW.triggerOpen : TW.triggerIdle}`}
      >
        <span className={`${TW.chip} ${pop.open ? TW.chipOpen : TW.chipIdle}`}><CalendarIcon /></span>
        <span className={`${TW.value} ${selected ? "" : TW.placeholder}`}>
          {selected ? formatTriggerDate(selected) : placeholder}
        </span>
        <m.span animate={{ rotate: pop.open ? 180 : 0 }} transition={{ duration: 0.2 }} className="inline-flex text-[#77736A]">
          <ChevronIcon />
        </m.span>
      </button>

      <Popover pop={pop} label={ariaLabel} className="p-3.5">
        <div role="dialog" aria-label={ariaLabel}>
          {/* Month header */}
          <div className="mb-3 flex items-center justify-between gap-2">
            <button type="button" onClick={() => navMonth(-1)} disabled={!canPrev} aria-label="Previous month" className={TW.navBtn}>
              <ChevronIcon className="rotate-90" />
            </button>
            <div className="overflow-hidden">
              <m.p
                key={toISODate(view)}
                initial={dir === 0 ? false : { opacity: 0, y: dir > 0 ? 8 : -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, ease: EASE_OUT }}
                aria-live="polite"
                className="m-0 text-[15px] font-bold tracking-[-0.01em] text-[#141414]"
              >
                {fmtMonthTitle.format(view)}
              </m.p>
            </div>
            <button type="button" onClick={() => navMonth(1)} aria-label="Next month" className={TW.navBtn}>
              <ChevronIcon className="-rotate-90" />
            </button>
          </div>

          {/* Weekday row */}
          <div className="grid grid-cols-7 gap-1 pb-1.5">
            {WEEKDAYS.map((w) => (
              <span key={w} className="text-center text-[11.5px] font-semibold text-[#A8A49B]">{w}</span>
            ))}
          </div>

          {/* Day grid — remounts per month so it slides in from the right direction */}
          <m.div
            key={toISODate(view)}
            ref={gridRef}
            onKeyDown={onGridKey}
            initial={dir === 0 ? false : { opacity: 0, x: dir * 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.24, ease: EASE_OUT }}
            className="grid grid-cols-7 gap-1"
          >
            {days.map((d) => {
              const iso = toISODate(d);
              const isSel = sameDay(d, selected);
              const isToday = sameDay(d, todayDate);
              const dis = isDisabled(d);
              const state = isSel ? TW.daySelected : dis ? TW.dayDisabled : !sameMonth(d, view) ? TW.dayOutside : TW.dayIdle;
              return (
                <button
                  key={iso}
                  type="button"
                  data-date={iso}
                  tabIndex={sameDay(d, focusDate) ? 0 : -1}
                  aria-disabled={dis || undefined}
                  aria-pressed={isSel}
                  aria-current={isToday ? "date" : undefined}
                  aria-label={fmtFull.format(d)}
                  onClick={() => commit(d)}
                  className={`${TW.dayBase} ${state}`}
                >
                  {d.getDate()}
                  {isToday && !isSel && (
                    <span aria-hidden className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[#F0A500]" />
                  )}
                </button>
              );
            })}
          </m.div>

          {/* Quick picks (Today / Tomorrow / Saturday) — hidden for history filters */}
          {showQuickPicks && (
          <div className="mt-3 flex flex-wrap gap-1.5 border-t border-[#EFECE6] pt-3">
            {quick.map(([label, d]) => (
              <button
                key={label}
                type="button"
                disabled={isDisabled(d)}
                onClick={() => commit(d)}
                className={sameDay(d, selected) ? TW.quickActive : TW.quick}
              >
                {label}
                <span className="ml-1 font-medium opacity-60">{d.getDate()}</span>
              </button>
            ))}
          </div>
          )}
        </div>
      </Popover>
    </>
  );
}


// ── 12-hour Time Picker ─────────────────────────────────────────────────
// Picking AM/PM or an hour keeps the panel open; picking minutes commits
// and closes — one open, two taps, instead of reopening between choices.
// Every hour/minute is always selectable. If the chosen time is not acceptable
// (e.g. in the past) the caller passes `error`; it is shown in red on the field
// and inside the panel, and the submit handlers still block the booking.
export function TimePicker12hr({ value, onChange, error = "", placeholder = "Select time", ariaLabel = "Choose pickup time" }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  function parse(v) {
    if (!v) return { h12: 10, minute: 0, ampm: "AM" };
    const [hh, mm] = v.split(":").map(Number);
    return { h12: hh % 12 || 12, minute: mm, ampm: hh < 12 ? "AM" : "PM" };
  }
  function toHHMM(h12, minute, ampm) {
    let hh = h12 % 12;
    if (ampm === "PM") hh += 12;
    return `${String(hh).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }

  const { h12, minute, ampm } = parse(value);

  function select(h12c, minutec, ampmc, close = false) {
    onChange({ target: { value: toHHMM(h12c, minutec, ampmc) } });
    if (close) setOpen(false);
  }

  function measure() {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const width = Math.max(r.width, 264);
    // Clamp so the popover always stays within the viewport horizontally —
    // unclamped, opening this near the right edge on a narrow phone screen
    // pushed the panel (and its 6-wide hour grid) off-screen.
    const left = Math.min(Math.max(8, r.left), vw - width - 8) + window.scrollX;
    setPos({ top: r.bottom + window.scrollY + 8, left, width });
  }

  function togglePicker() {
    if (open) { setOpen(false); return; }
    measure();
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    function handler(e) {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target)
      ) setOpen(false);
    }
    function onKey(e) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [open]);

  const displayTime = (() => {
    if (!value) return null;
    const [hh, mm] = value.split(":").map(Number);
    return `${hh % 12 || 12}:${String(mm).padStart(2, "0")} ${hh < 12 ? "AM" : "PM"}`;
  })();

  const hours = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const minutes = [0, 15, 30, 45];

  const dropdown = mounted ? createPortal(
    <AnimatePresence>
      {open && (
        <m.div
          key="tp-dropdown"
          ref={dropdownRef}
          className="bw-portal bw-pop"
          role="dialog"
          aria-label={ariaLabel}
          initial={{ opacity: 0, y: -6, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.98 }}
          transition={{ duration: 0.18, ease: EASE_OUT }}
          style={{
            position: "absolute",
            top: pos.top,
            left: pos.left,
            width: pos.width,
            zIndex: 99999,
            transformOrigin: "top left",
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-.01em", color: displayTime ? "#141414" : "#C9C5BC", fontVariantNumeric: "tabular-nums" }}>
              {displayTime || "--:--"}
            </span>
            <div className="bw-segment" style={{ padding: 3 }}>
              {["AM", "PM"].map((ap) => (
                <button
                  key={ap}
                  type="button"
                  onClick={() => select(h12, minute, ap)}
                  className={`bw-tcell ${ampm === ap ? "is-active" : ""}`}
                  style={{ padding: "5px 12px", borderRadius: 999, fontSize: 12.5, background: ampm === ap ? undefined : "transparent" }}
                >
                  {ap}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p role="alert" className="bw-time-error" style={{ margin: "-4px 0 10px 2px" }}>{error}</p>
          )}

          <p className="bw-pop-title">Hour</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6, marginBottom: 12 }}>
            {hours.map((hr) => (
              <button
                key={hr} type="button"
                onClick={() => select(hr, minute, ampm)}
                className={`bw-tcell ${hr === h12 && value ? "is-active" : ""}`}
              >
                {hr}
              </button>
            ))}
          </div>

          <p className="bw-pop-title">Minute</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
            {minutes.map((mn) => (
              <button
                key={mn} type="button"
                onClick={() => select(h12, mn, ampm, true)}
                className={`bw-tcell ${mn === minute && value ? "is-active" : ""}`}
              >
                :{String(mn).padStart(2, "0")}
              </button>
            ))}
          </div>
        </m.div>
      )}
    </AnimatePresence>,
    document.body
  ) : null;

  return (
    <>
    <div ref={triggerRef} className="relative w-full">
      <div
        role="button"
        tabIndex={0}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-invalid={error ? true : undefined}
        onClick={togglePicker}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); togglePicker(); } }}
        className={`bw-field bw-field--button ${open ? "is-open" : ""} ${error ? "has-error" : ""}`}
      >
        <span className="bw-chip"><IconClock className="w-4 h-4" /></span>
        <span className={`bw-input ${displayTime ? "" : "is-placeholder"}`}>{displayTime || placeholder}</span>
        <m.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} className="inline-flex" style={{ marginRight: 6, color: "#77736A" }}>
          <ChevronIcon />
        </m.span>
      </div>
      {dropdown}
    </div>
    {error && !open && (
      <p role="alert" className="bw-time-error" style={{ marginTop: 4, paddingLeft: 2 }}>{error}</p>
    )}
    </>
  );
}


// ── Icons used by the pickers ───────────────────────────────────────────────
const svgProps = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
export function CalendarIcon() {
  return <svg {...svgProps}><rect x="3.5" y="5" width="17" height="15" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /></svg>;
}
export function ChevronIcon({ className = "" }) {
  return <svg {...svgProps} width={14} height={14} strokeWidth={2} className={className}><path d="M6 9l6 6 6-6" /></svg>;
}

// ── PickerScope ─────────────────────────────────────────────────────────────
// BookingWidget already provides LazyMotion + the .bw-root styles. Anywhere
// else, wrap the pickers in <PickerScope> to get the same motion context,
// design tokens and CSS. `compact` makes the trigger 42px tall so it lines up
// with plain 42px inputs/selects in denser forms.
export function PickerScope({ children, compact = false, className = "" }) {
  return (
    <LazyMotion features={domMax} strict>
      <MotionConfig reducedMotion="user">
        <style>{BW_CSS}</style>
        {compact && (
          <style>{`.bw-compact .bw-field, .bw-compact button[aria-haspopup="dialog"] { height: 42px !important; }
.bw-compact .bw-chip { width: 30px; height: 30px; }`}</style>
        )}
        <div className={`bw-root ${compact ? "bw-compact" : ""} ${className}`.trim()}>{children}</div>
      </MotionConfig>
    </LazyMotion>
  );
}
