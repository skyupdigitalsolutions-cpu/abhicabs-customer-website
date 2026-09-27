import React, { useId, useState } from "react";
import { navigate } from "vike/client/router";
import { LazyMotion, domMax, m, MotionConfig, AnimatePresence, LayoutGroup } from "framer-motion";

const EASE_OUT = [0.22, 1, 0.36, 1];

// One coordinated reveal: eyebrow → heading → copy → pills → hint → buttons
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_OUT } },
};
const pillGroup = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};
const pillItem = {
  hidden: { opacity: 0, y: 12, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: EASE_OUT } },
};

export default function GroupTransportBannerSection({ seaterOptions, onRequestQuote }) {
  const [selected, setSelected] = useState(null);
  const scope = useId();

  function handleExplore() {
    const params = new URLSearchParams({ type: "group" });
    if (selected) params.set("seater", selected);
    navigate(`/booking-search?${params.toString()}`);
  }

  const hint = selected
    ? `${selected} Seater selected — click below to search available coaches`
    : "Select a seater size above, then search for available vehicles";

  return (
    <LazyMotion features={domMax} strict>
      <MotionConfig reducedMotion="user">
        <LayoutGroup id={scope}>
          <section style={{ margin: "clamp(46px,6vw,80px) 0 0", background: "#111", position: "relative", overflow: "hidden" }}>
            {/* Ambient glow — slow drift + breathe */}
            <m.div
              aria-hidden
              animate={{ x: [0, -24, 0], y: [0, 18, 0], scale: [1, 1.08, 1], opacity: [0.9, 1, 0.9] }}
              transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
              style={{ position: "absolute", top: -100, right: -80, width: 380, height: 380, borderRadius: "50%", background: "radial-gradient(circle,rgba(255,193,7,.16),transparent 70%)", pointerEvents: "none" }}
            />

            <m.div
              variants={container}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.35 }}
              style={{ maxWidth: 1280, margin: "0 auto", padding: "clamp(48px,6vw,82px) 22px", position: "relative" }}
            >
              <div style={{ maxWidth: 640 }}>
                <m.span variants={fadeUp} style={{ display: "inline-block", fontWeight: 700, fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase", color: "#FFC107" }}>
                  Group Transportation
                </m.span>
                <m.h2 variants={fadeUp} style={{ fontWeight: 800, fontSize: "clamp(28px,3.8vw,46px)", lineHeight: 1.1, margin: "10px 0 0", letterSpacing: "-.02em", color: "#fff" }}>
                  Travelling With a Group?
                </m.h2>
                <m.p variants={fadeUp} style={{ fontSize: 16, lineHeight: 1.6, color: "rgba(255,255,255,.65)", fontWeight: 400, margin: "16px 0 0", maxWidth: 520 }}>
                  From family tours and corporate travel to school and college groups, travel together in comfort — 12 to 33 seat coaches available.
                </m.p>
              </div>

              {/* Seater pills — the gold fill glides to the selected size */}
              <m.div
                variants={pillGroup}
                role="group"
                aria-label="Seater size"
                className="ac-scroll"
                style={{ display: "flex", flexWrap: "wrap", gap: 12, margin: "28px 0 8px" }}
              >
                {seaterOptions.map((n) => {
                  const isActive = selected === n;
                  return (
                    <m.button
                      key={n}
                      type="button"
                      variants={pillItem}
                      whileHover={isActive ? undefined : { y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelected(isActive ? null : n)}
                      aria-pressed={isActive}
                      className="relative isolate"
                      style={{
                        padding: "14px 20px", borderRadius: 14, fontWeight: 700, fontSize: 15, cursor: "pointer",
                        border: isActive ? "1.5px solid #FFC107" : "1px solid rgba(255,255,255,.14)",
                        background: "rgba(255,255,255,.05)",
                        color: isActive ? "#111" : "#fff",
                        transition: "color .18s, border-color .18s",
                      }}
                    >
                      <AnimatePresence>
                        {isActive && (
                          <m.span
                            aria-hidden
                            layoutId="seater-fill"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ type: "spring", stiffness: 450, damping: 36 }}
                            style={{ position: "absolute", inset: 0, zIndex: -1, borderRadius: 12.5, background: "#FFC107", boxShadow: "0 10px 24px -10px rgba(255,193,7,.7)" }}
                          />
                        )}
                      </AnimatePresence>
                      {n} Seater
                    </m.button>
                  );
                })}
              </m.div>

              {/* Hint text — crossfades when the selection changes */}
              <m.div variants={fadeUp} style={{ minHeight: 20, margin: "0 0 24px" }}>
                <AnimatePresence mode="wait" initial={false}>
                  <m.p
                    key={selected ?? "none"}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                    aria-live="polite"
                    style={{ fontSize: 13, color: selected ? "rgba(255,193,7,.85)" : "rgba(255,255,255,.45)", margin: 0 }}
                  >
                    {hint}
                  </m.p>
                </AnimatePresence>
              </m.div>

              <m.div variants={fadeUp} style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
                {/* Primary — width animates smoothly as the label changes */}
                <m.button
                  type="button"
                  layout
                  onClick={handleExplore}
                  initial="rest"
                  animate="rest"
                  whileHover="hover"
                  whileTap={{ scale: 0.97 }}
                  variants={{ rest: { y: 0 }, hover: { y: -2 } }}
                  transition={{ layout: { type: "spring", stiffness: 400, damping: 34 } }}
                  className="hover:!bg-[#FFB300]"
                  style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "15px 28px", borderRadius: 9999, background: "#FFC107", color: "#111", fontWeight: 700, fontSize: 15, cursor: "pointer", border: "none", boxShadow: "0 12px 28px -12px rgba(255,193,7,.75)" }}
                >
                  <AnimatePresence mode="popLayout" initial={false}>
                    <m.span
                      key={selected ?? "all"}
                      layout="position"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                    >
                      {selected ? `Search ${selected} Seater` : "Search Group Vehicles"}
                    </m.span>
                  </AnimatePresence>
                  <m.svg
                    layout="position"
                    variants={{ rest: { x: 0 }, hover: { x: 4 } }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden
                  >
                    <path d="M5 12h14M13 6l6 6-6 6" stroke="#111" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                  </m.svg>
                </m.button>

                <m.button
                  type="button"
                  onClick={onRequestQuote}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  className="hover:!border-white"
                  style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "15px 28px", borderRadius: 9999, background: "transparent", border: "1.5px solid rgba(255,255,255,.3)", color: "#fff", fontWeight: 600, fontSize: 15, cursor: "pointer", transition: "border-color .2s" }}
                >
                  Request Group Quote
                </m.button>
              </m.div>
            </m.div>
          </section>
        </LayoutGroup>
      </MotionConfig>
    </LazyMotion>
  );
}