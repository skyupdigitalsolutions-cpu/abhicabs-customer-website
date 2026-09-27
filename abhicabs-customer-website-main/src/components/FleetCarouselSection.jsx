import React, { useRef, useState, useEffect, useCallback } from "react";
import { navigate } from "vike/client/router";
import { LazyMotion, domAnimation, m, MotionConfig, AnimatePresence, useScroll, useSpring } from "framer-motion";
import { fmtINR } from "../data/mockData";

const EASE_OUT = [0.22, 1, 0.36, 1];
const GOLD = "linear-gradient(180deg, #FFD54A 0%, #FFC107 55%, #F0A500 100%)";
const LIGHT = "linear-gradient(180deg, #FFFFFF 0%, #F3F2EF 100%)";
const DARK = "linear-gradient(180deg, #3A3A3A 0%, #1C1C1C 55%, #0B0B0B 100%)";

const headerReveal = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_OUT } },
};
const track = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};
const cardReveal = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE_OUT } },
};

export default function FleetCarouselSection({ vehicles, onViewAll }) {
  const scrollRef = useRef(null);
  const [modal, setModal] = useState(null);   // vehicle object or null
  const [activeImg, setActiveImg] = useState(0);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  // Scroll progress of the track → gold progress bar under the carousel
  const { scrollXProgress } = useScroll({ container: scrollRef });
  const progress = useSpring(scrollXProgress, { stiffness: 260, damping: 32, mass: 0.4 });

  // Which directions can still move — drives the active/inactive buttons
  const updateEdges = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateEdges();
    el.addEventListener("scroll", updateEdges, { passive: true });
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateEdges) : null;
    ro?.observe(el);
    return () => {
      el.removeEventListener("scroll", updateEdges);
      ro?.disconnect();
    };
  }, [updateEdges, vehicles?.length]);

  function scrollBy(dir) {
    scrollRef.current?.scrollBy({ left: dir * 300, behavior: "smooth" }); // 280 card + 20 gap
  }

  function openModal(v) {
    setModal(v);
    setActiveImg(0);
    document.body.style.overflow = "hidden";
  }

  // Close modal and restore scroll when component unmounts (e.g. navigating away)
  useEffect(() => {
    return () => {
      setModal(null);
      document.body.style.overflow = "";
    };
  }, []);

  function closeModal() {
    setModal(null);
    document.body.style.overflow = "";
  }

  // Esc closes the modal
  useEffect(() => {
    if (!modal) return;
    const onKey = (e) => { if (e.key === "Escape") closeModal(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [modal]);

  function selectVehicle() {
    const seats = modal?.seats;
    const vehicleId = modal?.id;
    const params = new URLSearchParams({ type: "fleet" }); // fleet = full catalogue, not coach-only
    if (seats) params.set("seater", String(seats));
    if (vehicleId) params.set("vehicle", vehicleId);
    closeModal();
    navigate(`/booking-search?${params.toString()}`);
  }

  const scrollable = canPrev || canNext;

  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <section id="fleet" style={{ maxWidth: 1280, margin: "0 auto", padding: "clamp(46px,6vw,80px) 22px 0" }}>
          <m.div
            variants={headerReveal}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.5 }}
            style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 26 }}
          >
            <div>
              <span style={{ display: "inline-block", fontWeight: 700, fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase", color: "#B8860B" }}>Our Fleet</span>
              <h2 style={{ fontWeight: 800, fontSize: "clamp(26px,3.4vw,42px)", lineHeight: 1.12, margin: "8px 0 6px", letterSpacing: "-.02em" }}>Choose Your Ride</h2>
              <p style={{ fontSize: 15.5, color: "#666", fontWeight: 400, margin: 0, maxWidth: 520 }}>
                From everyday city travel to large group journeys, choose the vehicle that fits your trip.
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <NavButton dir={-1} enabled={canPrev} onClick={() => scrollBy(-1)} />
              <NavButton dir={1} enabled={canNext} onClick={() => scrollBy(1)} />
            </div>
          </m.div>

          {/* Track — overflow-x auto (scrollbar hidden) so phones can swipe too */}
          <m.div
            ref={scrollRef}
            className="ac-scroll [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            variants={track}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.25 }}
            style={{ display: "flex", gap: 20, overflowX: "auto", scrollBehavior: "smooth", paddingBottom: 12, scrollSnapType: "x mandatory" }}
          >
            {vehicles.map((v) => (
              // Card markup and styles are unchanged — only the wrapper is animated
              <m.div
                key={v.id}
                variants={cardReveal}
                style={{ flex: "0 0 280px", scrollSnapAlign: "start", background: "#fff", border: "1px solid #EFEFEF", borderRadius: 20, overflow: "hidden", display: "flex", flexDirection: "column" }}
              >
                {/* Vehicle image */}
                <div style={{ aspectRatio: "16/9", background: "#F7F7F7", position: "relative", overflow: "hidden", flex: "none" }}>
                  <img src={v.img} alt={v.name} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }} />
                </div>

                {/* Card body */}
                <div style={{ padding: 20, display: "flex", flexDirection: "column", flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                    <h3 style={{ fontWeight: 700, fontSize: 17, margin: 0 }}>{v.name}</h3>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#666", background: "#F7F7F7", padding: "4px 9px", borderRadius: 9999, flexShrink: 0 }}>{v.seats} Seater</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: "#666", fontWeight: 500, margin: "6px 0 14px" }}>
                    {v.ac ? "A/C" : "Non-A/C"} · {v.category}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
                    <span style={{ color: "#666" }}>Local from</span>
                    <span style={{ fontWeight: 700, color: "#111" }}>₹{v.local?.base8hr80km ?? "—"}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                    <span style={{ color: "#666" }}>Outstation</span>
                    <span style={{ fontWeight: 700, color: "#B8860B" }}>₹{v.outstation?.perKm ?? "—"}/km</span>
                  </div>
                  <button
                    onClick={() => openModal(v)}
                    className="hover:!bg-[#111] hover:!text-white"
                    style={{ marginTop: "auto", paddingTop: 14, width: "100%", padding: 11, borderRadius: 11, border: "1.5px solid #111", background: "#fff", color: "#111", fontWeight: 600, fontSize: 13.5, cursor: "pointer", flexShrink: 0 }}
                  >
                    View Details
                  </button>
                </div>
              </m.div>
            ))}
          </m.div>

          {/* Progress + View All */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginTop: 10 }}>
            <div
              aria-hidden
              className="relative h-[4px] w-[140px] overflow-hidden rounded-full bg-[#ECE9E2] transition-opacity duration-300"
              style={{ opacity: scrollable ? 1 : 0 }}
            >
              <m.span
                className="absolute inset-y-0 left-0 w-full origin-left rounded-full"
                style={{ scaleX: progress, background: GOLD }}
              />
            </div>

            <m.button
              onClick={onViewAll}
              initial="rest"
              animate="rest"
              whileHover="hover"
              className="hover:!text-[#B8860B]"
              style={{ background: "none", border: "none", color: "#111", fontWeight: 600, fontSize: 14, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              View All Vehicles
              <m.svg
                variants={{ rest: { x: 0 }, hover: { x: 4 } }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                width="16" height="16" viewBox="0 0 24 24" fill="none"
              >
                <path d="M5 12h14M13 6l6 6-6 6" stroke="#FFC107" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </m.svg>
            </m.button>
          </div>
        </section>

        {/* ── Vehicle Detail Modal ───────────────────────────────────────── */}
        <AnimatePresence>
          {modal && (
            <m.div
              key="fleet-modal"
              onClick={(e) => e.target === e.currentTarget && closeModal()}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
            >
              <m.div
                role="dialog"
                aria-modal="true"
                aria-label={modal.name}
                initial={{ opacity: 0, y: 24, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 380, damping: 32 } }}
                exit={{ opacity: 0, y: 12, scale: 0.98, transition: { duration: 0.15 } }}
                style={{ background: "#fff", borderRadius: 24, width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.22)" }}
              >
                {/* Vehicle image — crossfades when a thumbnail is picked */}
                <div style={{ position: "relative", aspectRatio: "16/9", background: "#F7F7F7", borderRadius: "24px 24px 0 0", overflow: "hidden" }}>
                  <AnimatePresence initial={false}>
                    <m.img
                      key={modal.gallery?.[activeImg] || modal.img}
                      src={modal.gallery?.[activeImg] || modal.img}
                      alt={modal.name}
                      initial={{ opacity: 0, scale: 1.03 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.35, ease: EASE_OUT }}
                      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
                    />
                  </AnimatePresence>
                  <m.button
                    onClick={closeModal}
                    aria-label="Close"
                    whileHover={{ rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 300, damping: 18 }}
                    style={{ position: "absolute", top: 12, right: 12, zIndex: 1, width: 36, height: 36, borderRadius: "50%", background: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,.15)" }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="#111" strokeWidth="2.2" strokeLinecap="round" /></svg>
                  </m.button>
                </div>

                {/* Thumbnails */}
                {modal.gallery?.length > 1 && (
                  <div style={{ display: "flex", gap: 8, padding: "10px 20px 0" }}>
                    {modal.gallery.map((src, i) => (
                      <m.button
                        key={i}
                        onClick={() => setActiveImg(i)}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        aria-label={`Show image ${i + 1}`}
                        style={{ width: 64, height: 44, borderRadius: 8, overflow: "hidden", border: activeImg === i ? "2px solid #FFC107" : "2px solid transparent", opacity: activeImg === i ? 1 : 0.55, cursor: "pointer", padding: 0, transition: "opacity .2s, border-color .2s" }}
                      >
                        <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </m.button>
                    ))}
                  </div>
                )}

                {/* Details */}
                <div style={{ padding: "18px 24px 24px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
                    <h2 style={{ fontWeight: 800, fontSize: 22, margin: 0 }}>{modal.name}</h2>
                    <span style={{ fontSize: 12, fontWeight: 600, background: "#FFF7DE", color: "#B8860B", padding: "5px 12px", borderRadius: 9999, flexShrink: 0 }}>
                      {modal.category?.charAt(0).toUpperCase() + modal.category?.slice(1)} · {modal.seats} Seater
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: 20, fontSize: 13.5, color: "#666", fontWeight: 500, marginBottom: 16 }}>
                    <span>👤 {modal.seats} Seater</span>
                    <span>❄️ {modal.ac ? "A/C" : "Non A/C"}</span>
                    <span>🧳 {modal.bags} Bags</span>
                  </div>

                  <div style={{ background: "#F7F7F7", borderRadius: 14, padding: "16px 18px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px 10px", marginBottom: 20 }}>
                    <Rate label="Local Package" value={fmtINR(modal.local?.base8hr80km ?? 0)} />
                    <Rate label="Outstation" value={`₹${modal.outstation?.perKm ?? 0}/km`} gold />
                    <Rate label="Extra Hour" value="₹150" />
                    <Rate label="Extra KM" value={`₹${modal.local?.extraKm ?? modal.outstation?.perKm ?? 0}`} />
                    <Rate label="Min / day" value="300 km" />
                    <Rate label="Driver Allowance" value={fmtINR(modal.outstation?.driverBhata ?? 500)} />
                  </div>

                  <div style={{ display: "flex", gap: 12 }}>
                    <m.button
                      onClick={closeModal}
                      whileTap={{ scale: 0.97 }}
                      style={{ flex: 1, padding: "14px 0", borderRadius: 12, border: "1.5px solid #E5E5E5", background: "#fff", color: "#111", fontWeight: 600, fontSize: 14.5, cursor: "pointer" }}
                    >
                      Close
                    </m.button>
                    <m.button
                      onClick={selectVehicle}
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.97 }}
                      style={{ flex: 1, padding: "14px 0", borderRadius: 12, border: "none", background: GOLD, boxShadow: "0 10px 22px -10px rgba(240,165,0,.8), inset 0 1px 0 rgba(255,255,255,.55)", color: "#111", fontWeight: 700, fontSize: 14.5, cursor: "pointer" }}
                    >
                      Select Vehicle
                    </m.button>
                  </div>
                </div>
              </m.div>
            </m.div>
          )}
        </AnimatePresence>
      </MotionConfig>
    </LazyMotion>
  );
}

function Rate({ label, value, gold = false }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "#999", fontWeight: 500, marginBottom: 4 }}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: 15, color: gold ? "#B8860B" : "#111" }}>{value}</div>
    </div>
  );
}

/* ── Prev / Next ─────────────────────────────────────────────────────────
   Active (can still scroll that way): black gradient, gold arrow, soft shadow.
   Inactive (at the start/end): white gradient, faded arrow, hairline border.
   The black layer fades in/out, so switching state is animated too.       */
function NavButton({ dir, enabled, onClick }) {
  const state = enabled ? "on" : "off";
  return (
    <m.button
      type="button"
      onClick={onClick}
      disabled={!enabled}
      aria-label={dir < 0 ? "Previous vehicles" : "Next vehicles"}
      initial={false}
      animate={state}
      whileHover={enabled ? "hover" : undefined}
      whileTap={enabled ? { scale: 0.92 } : undefined}
      variants={{
        on:    { scale: 1,    boxShadow: "0 12px 24px -10px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(0,0,0,0)" },
        off:   { scale: 1,    boxShadow: "0 0 0 0 rgba(0,0,0,0), inset 0 0 0 1px rgba(20,20,20,0.10)" },
        hover: { scale: 1.07, boxShadow: "0 16px 28px -10px rgba(0,0,0,0.7), inset 0 0 0 1px rgba(0,0,0,0)" },
      }}
      transition={{ type: "spring", stiffness: 380, damping: 24 }}
      className="relative isolate grid h-12 w-12 place-items-center rounded-full border-0 outline-none focus-visible:ring-2 focus-visible:ring-[#FFC107] focus-visible:ring-offset-2 enabled:cursor-pointer disabled:cursor-not-allowed"
      style={{ background: LIGHT }}
    >
      {/* Black fill (active) — sits over the white base */}
      <m.span
        aria-hidden
        variants={{ on: { opacity: 1 }, off: { opacity: 0 }, hover: { opacity: 1 } }}
        transition={{ duration: 0.25 }}
        className="absolute inset-0 -z-10 rounded-full"
        style={{ background: DARK, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.14)" }}
      />
      {/* Arrow — gold on black when active, faded grey on white when inactive */}
      <m.span
        aria-hidden
        variants={{
          on:    { x: 0,       color: "#FFC107" },
          off:   { x: 0,       color: "#BDBAB2" },
          hover: { x: dir * 2, color: "#FFD54A" },
        }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
        className="inline-flex"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d={dir < 0 ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} />
        </svg>
      </m.span>
    </m.button>
  );
}