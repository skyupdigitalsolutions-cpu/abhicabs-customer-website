import React, { useRef } from "react";
import { LazyMotion, domAnimation, m, MotionConfig, useScroll, useTransform, useReducedMotion } from "framer-motion";

// FINAL CTA (id="contact" — the header utility bar's Support link and the
// footer's Contact link scroll here). Same props and copy as before.

const EASE_OUT = [0.22, 1, 0.36, 1];
const GOLD = "linear-gradient(180deg, #FFD54A 0%, #FFC107 55%, #F0A500 100%)";
// Same promises the hero makes — nothing new claimed here.
const TRUST = ["Verified Drivers", "Transparent Pricing", "24×7 Support"];

const stage = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};
const line = {
  hidden: { y: "105%" },
  show: { y: "0%", transition: { duration: 0.85, ease: EASE_OUT } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_OUT } },
};
const underline = {
  hidden: { pathLength: 0, opacity: 0 },
  show: { pathLength: 1, opacity: 1, transition: { duration: 0.9, ease: EASE_OUT, delay: 0.75 } },
};
const trustRow = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};
const trustItem = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE_OUT } },
};

export default function CTASection({ onBookMode, id = "contact" }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();

  // Background drifts slower than the page for a little depth
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], reduce ? ["0%", "0%"] : ["-8%", "8%"]);

  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <section
          ref={ref}
          id={id}
          style={{ margin: "clamp(46px,6vw,80px) 0 0", position: "relative", overflow: "hidden", background: "#0d0d0d", isolation: "isolate" }}
        >
          {/* Photo — parallax + slow settle-in zoom */}
          <m.div aria-hidden style={{ position: "absolute", top: "-10%", bottom: "-10%", left: 0, right: 0, y: bgY, zIndex: -2 }}>
            <m.img
              src="/images/dashboard-pov.jpg"
              alt=""
              initial={{ scale: 1.12 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 2.2, ease: EASE_OUT }}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </m.div>

          {/* Overlays: dark wash, vignette, warm glow rising from the bottom */}
          <div aria-hidden style={{ position: "absolute", inset: 0, zIndex: -1, pointerEvents: "none", background: "linear-gradient(180deg,rgba(13,13,13,.82),rgba(13,13,13,.9))" }} />
          <div aria-hidden style={{ position: "absolute", inset: 0, zIndex: -1, pointerEvents: "none", background: "radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,.55) 100%)" }} />
          <m.div
            aria-hidden
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            style={{ position: "absolute", left: "50%", bottom: "-45%", width: "min(900px,120%)", height: "90%", transform: "translateX(-50%)", zIndex: -1, pointerEvents: "none", background: "radial-gradient(ellipse at center, rgba(255,193,7,.22) 0%, transparent 65%)" }}
          />

          <m.div
            variants={stage}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            style={{ position: "relative", maxWidth: 820, margin: "0 auto", padding: "clamp(64px,9vw,112px) 22px", textAlign: "center" }}
          >
            <h2 style={{ fontWeight: 800, fontSize: "clamp(30px,4.4vw,56px)", lineHeight: 1.12, color: "#fff", margin: 0, letterSpacing: "-.025em" }}>
              {/* Each phrase rises out of its own mask */}
              <span style={{ display: "inline-block", overflow: "hidden", verticalAlign: "bottom", paddingBottom: "0.08em" }}>
                <m.span variants={line} style={{ display: "inline-block" }}>Wherever the Road</m.span>
              </span>{" "}
              <span style={{ display: "inline-block", position: "relative", verticalAlign: "bottom" }}>
                <span style={{ display: "inline-block", overflow: "hidden", paddingBottom: "0.08em" }}>
                  <m.span
                    variants={line}
                    style={{
                      display: "inline-block",
                      background: GOLD,
                      WebkitBackgroundClip: "text",
                      backgroundClip: "text",
                      color: "transparent",
                    }}
                  >
                    Takes You.
                  </m.span>
                </span>
                {/* A road-like curve draws itself under the gold phrase */}
                <svg
                  aria-hidden
                  viewBox="0 0 200 14"
                  preserveAspectRatio="none"
                  style={{ position: "absolute", left: "2%", right: "2%", bottom: "-0.12em", width: "96%", height: "0.26em", overflow: "visible" }}
                >
                  <m.path
                    variants={underline}
                    d="M2 10 C 50 2, 110 2, 198 8"
                    fill="none"
                    stroke="#FFC107"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h2>

            <m.p variants={fadeUp} style={{ fontSize: 16.5, lineHeight: 1.6, color: "rgba(255,255,255,.72)", fontWeight: 400, margin: "22px auto 34px", maxWidth: 500 }}>
              Book your next journey across Karnataka and Hyderabad.
            </m.p>

            <m.div variants={fadeUp} style={{ display: "flex", flexWrap: "wrap", gap: 14, justifyContent: "center" }}>
              {/* Primary */}
              <m.button
                type="button"
                onClick={() => onBookMode("one-way")}
                initial="rest"
                animate="rest"
                whileHover="hover"
                whileTap={{ scale: 0.97 }}
                variants={{ rest: { y: 0 }, hover: { y: -2 } }}
                className="relative isolate overflow-hidden"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 10, padding: "16px 32px", borderRadius: 9999,
                  background: GOLD, color: "#111", fontWeight: 700, fontSize: 16, border: "none", cursor: "pointer",
                  boxShadow: "0 18px 36px -14px rgba(255,193,7,.65), inset 0 1px 0 rgba(255,255,255,.55)",
                }}
              >
                <m.span
                  aria-hidden
                  variants={{ rest: { x: "-120%" }, hover: { x: "120%", transition: { duration: 0.8, ease: EASE_OUT } } }}
                  style={{ position: "absolute", inset: 0, zIndex: -1, pointerEvents: "none", background: "linear-gradient(110deg, transparent 30%, rgba(255,255,255,.55) 50%, transparent 70%)" }}
                />
                Book a Cab
                <m.svg
                  variants={{ rest: { x: 0 }, hover: { x: 4 } }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden
                >
                  <path d="M5 12h14M13 6l6 6-6 6" stroke="#111" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </m.svg>
              </m.button>

              {/* Secondary — frosted glass */}
              <m.button
                type="button"
                onClick={() => onBookMode("group-coach")}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                className="hover:!border-white hover:!bg-white/10"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 9, padding: "16px 32px", borderRadius: 9999,
                  background: "rgba(255,255,255,.05)", border: "1.5px solid rgba(255,255,255,.35)", color: "#fff",
                  fontWeight: 600, fontSize: 16, cursor: "pointer",
                  backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
                  transition: "border-color .2s, background-color .2s",
                }}
              >
                Request Group Quote
              </m.button>
            </m.div>

            {/* Trust row */}
            <m.ul
              variants={trustRow}
              style={{ listStyle: "none", padding: 0, margin: "30px 0 0", display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "10px 22px" }}
            >
              {TRUST.map((t) => (
                <m.li key={t} variants={trustItem} style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13.5, fontWeight: 500, color: "rgba(255,255,255,.7)" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <circle cx="12" cy="12" r="10" fill="rgba(255,193,7,.16)" />
                    <path d="M8 12.5l2.5 2.5 5-5.5" stroke="#FFC107" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {t}
                </m.li>
              ))}
            </m.ul>
          </m.div>
        </section>
      </MotionConfig>
    </LazyMotion>
  );
}