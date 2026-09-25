import React, { useEffect, useState } from "react";
import { navigate } from "vike/client/router";
import { LazyMotion, domAnimation, m, MotionConfig, AnimatePresence } from "framer-motion";
import { fmtINR, VEHICLE_RATES } from "../data/mockData";

const EASE_OUT = [0.22, 1, 0.36, 1];
const GOLD = "linear-gradient(180deg, #FFD54A 0%, #FFC107 55%, #F0A500 100%)";

const headerReveal = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_OUT } },
};
const grid = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};
const cardReveal = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE_OUT } },
};

export default function GroupFleetSection({ vehicles, id = "group-fleet" }) {
  const [modal, setModal] = useState(null);
  const [activeImg, setActiveImg] = useState(0);

  function openModal(v) {
    // Try to find rich data from VEHICLE_RATES by matching name or seats
    const rich = VEHICLE_RATES.find(r =>
      r.name === v.name ||
      String(r.seats) === String(v.seats).replace(/[^0-9]/g, "")
    );
    setModal(rich || v);
    setActiveImg(0);
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    setModal(null);
    document.body.style.overflow = "";
  }

  // Restore page scroll if the component unmounts with the modal open
  useEffect(() => () => { document.body.style.overflow = ""; }, []);

  // Esc closes the modal
  useEffect(() => {
    if (!modal) return;
    const onKey = (e) => { if (e.key === "Escape") closeModal(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [modal]);

  function handleBook() {
    closeModal();
    navigate("/#booking");
  }

  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <section id={id} style={{ maxWidth: 1280, margin: "0 auto", padding: "clamp(46px,6vw,80px) 22px 0" }}>
          <m.div
            variants={headerReveal}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.6 }}
            style={{ textAlign: "center", maxWidth: 620, margin: "0 auto 34px" }}
          >
            <span style={{ display: "inline-block", fontWeight: 700, fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase", color: "#B8860B" }}>Featured Vehicles</span>
            <h2 style={{ fontWeight: 800, fontSize: "clamp(26px,3.4vw,42px)", lineHeight: 1.12, margin: "8px 0 0", letterSpacing: "-.02em" }}>Premium &amp; Group Fleet</h2>
          </m.div>

          <m.div
            variants={grid}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.15 }}
            style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,230px),1fr))", gap: 18 }}
          >
            {vehicles.map((v) => (
              // Card markup and styles are unchanged — only the wrapper is animated
              <m.div
                key={v.name}
                variants={cardReveal}
                style={{ background: "#fff", border: "1px solid #EFEFEF", borderRadius: 18, overflow: "hidden", display: "flex", flexDirection: "column" }}
              >
                <div style={{ aspectRatio: "16/9", background: "#F0F0F0", position: "relative", overflow: "hidden" }}>
                  <img src={v.img} alt={v.name} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }} />
                  <span style={{ position: "absolute", top: 9, left: 10, fontSize: 10, fontWeight: 600, color: "#111", background: "#FFC107", padding: "3px 9px", borderRadius: 9999 }}>
                    {v.seats}
                  </span>
                </div>
                <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", flex: 1 }}>
                  <h3 style={{ fontWeight: 700, fontSize: 15, margin: "0 0 4px", lineHeight: 1.25 }}>{v.name}</h3>
                  <div style={{ fontSize: 12, color: "#666", fontWeight: 500, marginBottom: 12 }}>{v.type}</div>
                  <button
                    onClick={() => openModal(v)}
                    className="hover:!bg-[#111] hover:!text-white"
                    style={{ marginTop: "auto", width: "100%", padding: 10, borderRadius: 10, border: "1.5px solid #111", background: "#fff", color: "#111", fontWeight: 600, fontSize: 13, cursor: "pointer", transition: "all .18s" }}
                  >
                    View Details
                  </button>
                </div>
              </m.div>
            ))}
          </m.div>
        </section>

        {/* ── Vehicle Detail Modal ───────────────────────────────────────── */}
        <AnimatePresence>
          {modal && (
            <m.div
              key="group-fleet-modal"
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
                {/* Image — crossfades when a thumbnail is picked */}
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
                        <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }} />
                      </m.button>
                    ))}
                  </div>
                )}

                {/* Details — sections rise in one after another */}
                <m.div
                  initial="hidden"
                  animate="show"
                  variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.12 } } }}
                  style={{ padding: "18px 24px 24px" }}
                >
                  <m.div variants={cardReveal} style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
                    <h2 style={{ fontWeight: 800, fontSize: 22, margin: 0 }}>{modal.name}</h2>
                    <span style={{ fontSize: 12, fontWeight: 600, background: "#FFF7DE", color: "#B8860B", padding: "5px 12px", borderRadius: 9999, flexShrink: 0 }}>
                      {modal.category
                        ? `${modal.category.charAt(0).toUpperCase() + modal.category.slice(1)} · ${modal.seats} Seater`
                        : modal.seats}
                    </span>
                  </m.div>

                  <m.div variants={cardReveal} style={{ display: "flex", gap: 20, fontSize: 13.5, color: "#666", fontWeight: 500, marginBottom: 16 }}>
                    <span>👤 {modal.seats} Seats</span>
                    {modal.ac !== undefined && <span>❄️ {modal.ac ? "A/C" : "Non A/C"}</span>}
                    {modal.bags && <span>🧳 {modal.bags} Bags</span>}
                  </m.div>

                  {(modal.local || modal.outstation) && (
                    <m.div variants={cardReveal} style={{ background: "#F7F7F7", borderRadius: 14, padding: "16px 18px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px 10px", marginBottom: 20 }}>
                      <Rate label="Local Package" value={fmtINR(modal.local?.base8hr80km ?? 0)} />
                      <Rate label="Outstation" value={`₹${modal.outstation?.perKm ?? 0}/km`} gold />
                      <Rate label="Extra Hour" value="₹150" />
                      <Rate label="Extra KM" value={`₹${modal.local?.extraKm ?? modal.outstation?.perKm ?? 0}`} />
                      <Rate label="Min / day" value="300 km" />
                      <Rate label="Driver Allowance" value={fmtINR(modal.outstation?.driverBhata ?? 700)} />
                    </m.div>
                  )}

                  {modal.features?.length > 0 && (
                    <m.div variants={cardReveal} style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
                      {modal.features.map((f) => (
                        <span key={f} style={{ fontSize: 12, fontWeight: 500, background: "#F0F7FF", color: "#1a56db", padding: "4px 10px", borderRadius: 9999 }}>{f}</span>
                      ))}
                    </m.div>
                  )}

                  <m.div variants={cardReveal} style={{ display: "flex", gap: 12 }}>
                    <m.button
                      onClick={closeModal}
                      whileTap={{ scale: 0.97 }}
                      style={{ flex: 1, padding: "14px 0", borderRadius: 12, border: "1.5px solid #E5E5E5", background: "#fff", color: "#111", fontWeight: 600, fontSize: 14.5, cursor: "pointer" }}
                    >
                      Close
                    </m.button>
                    <m.button
                      onClick={handleBook}
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.97 }}
                      style={{ flex: 1, padding: "14px 0", borderRadius: 12, border: "none", background: GOLD, boxShadow: "0 10px 22px -10px rgba(240,165,0,.8), inset 0 1px 0 rgba(255,255,255,.55)", color: "#111", fontWeight: 700, fontSize: 14.5, cursor: "pointer" }}
                    >
                      Book This Vehicle
                    </m.button>
                  </m.div>
                </m.div>
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