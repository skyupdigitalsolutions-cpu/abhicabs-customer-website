import React, { useRef } from "react";
import {
  LazyMotion,
  domAnimation,
  m,
  MotionConfig,
  useScroll,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import BookingWidget from "./BookingWidget";

/* ------------------------------------------------------------------ */
/* Motion tokens — one orchestrated page-load sequence, nothing else. */
/* ------------------------------------------------------------------ */
const EASE_OUT = [0.22, 1, 0.36, 1];

const heroContent = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.2 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE_OUT } },
};

// Headline lines reveal from under a mask (parent has overflow: hidden)
const headlineLine = {
  hidden: { y: "105%" },
  show: { y: "0%", transition: { duration: 0.85, ease: EASE_OUT } },
};

const featureGrid = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const featureItem = {
  hidden: { opacity: 0, x: -12 },
  show: { opacity: 1, x: 0, transition: { duration: 0.5, ease: EASE_OUT } },
};

const checkIcon = {
  hidden: { scale: 0 },
  show: { scale: 1, transition: { type: "spring", stiffness: 420, damping: 18 } },
};

const FEATURES = ["Verified Drivers", "Transparent Pricing", "Comfortable Vehicles", "24×7 Support"];

export default function HeroSection({ widgetKey, widgetProps }) {
  const heroRef = useRef(null);
  const prefersReducedMotion = useReducedMotion();

  // Subtle parallax on the background photo while the hero scrolls out.
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", prefersReducedMotion ? "0%" : "12%"]);

  return (
    // LazyMotion + `m` keeps the bundle small (~5kb vs ~34kb for full `motion`).
    // reducedMotion="user" auto-disables transform animations for users who opt out.
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        {/* HERO */}
        <section
          ref={heroRef}
          style={{ position: "relative", background: "#0d0d0d", overflow: "hidden" }}
        >
          {/* Photo layer: extended 15% above so parallax never exposes a gap */}
          <m.div
            style={{
              position: "absolute",
              top: "-15%",
              left: 0,
              right: 0,
              bottom: 0,
              y: bgY,
              willChange: "transform",
            }}
          >
            <m.img
              src="/images/Herosection.jpg"
              alt=""
              initial={{ scale: 1.1, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1.6, ease: EASE_OUT }}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </m.div>

          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(100deg,rgba(13,13,13,.95) 0%,rgba(13,13,13,.82) 38%,rgba(13,13,13,.35) 72%,rgba(13,13,13,.15) 100%)",
              pointerEvents: "none",
            }}
          />

          <div
            style={{
              position: "relative",
              maxWidth: 1280,
              margin: "0 auto",
              padding: "clamp(48px,7vw,92px) 22px clamp(120px,12vw,150px)",
            }}
          >
            <m.div
              variants={heroContent}
              initial="hidden"
              animate="show"
              style={{ maxWidth: 750 }}
            >
              <m.span
                variants={fadeUp}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 9,
                  padding: "8px 15px",
                  borderRadius: 9999,
                  background: "rgba(255,193,7,.13)",
                  border: "1px solid rgba(255,193,7,.35)",
                  color: "#FFC107",
                  fontWeight: 600,
                  fontSize: 12,
                  letterSpacing: ".05em",
                }}
              >
                PREMIUM MOBILITY · KARNATAKA &amp; HYDERABAD
              </m.span>

              <h1
                style={{
                  fontWeight: 800,
                  fontSize: "clamp(38px,6vw,74px)",
                  lineHeight: 1.02,
                  color: "#fff",
                  margin: "22px 0 0",
                  letterSpacing: "-.025em",
                  maxWidth: "min(850px, 100%)",
                }}
              >
                {/* Each line is a mask; the inner span slides up into view */}
                <span style={{ display: "block", overflow: "hidden", paddingBottom: "0.06em" }}>
                  <m.span variants={headlineLine} style={{ display: "block" }}>
                    Travel Far.
                  </m.span>
                </span>
                <span style={{ display: "block", overflow: "hidden", paddingBottom: "0.06em" }}>
                  <m.span
                    variants={headlineLine}
                    style={{ display: "block", color: "#FFC107", whiteSpace: "nowrap" }}
                  >
                    Travel Comfortably.
                  </m.span>
                </span>
              </h1>

              <m.p
                variants={fadeUp}
                style={{
                  fontSize: "clamp(15px,1.7vw,19px)",
                  lineHeight: 1.6,
                  color: "rgba(255,255,255,.72)",
                  fontWeight: 400,
                  margin: "20px 0 0",
                  maxWidth: 540,
                }}
              >
                Reliable chauffeur-driven cabs, airport transfers, outstation travel and group
                transportation — all in one place.
              </m.p>

              <m.div
                variants={featureGrid}
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(180px, 1fr))",
                  gap: "12px 40px",
                  marginTop: 26,
                  maxWidth: 480,
                }}
              >
                {FEATURES.map((f) => (
                  <m.span
                    key={f}
                    variants={featureItem}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      color: "#fff",
                      fontWeight: 500,
                      fontSize: 14,
                    }}
                  >
                    <m.svg variants={checkIcon} width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" fill="#FFC107" />
                      <path
                        d="M8 12.5l2.5 2.5 5-5.5"
                        stroke="#111"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </m.svg>
                    {f}
                  </m.span>
                ))}
              </m.div>
            </m.div>
          </div>
        </section>

        {/* BOOKING ENGINE (overlaps hero) */}
        {/* FIX: clamp() args were reversed (min > max), so it always resolved to -40px.
            Correct order is clamp(MIN, PREFERRED, MAX). */}
        <section
          id="booking"
          style={{ position: "relative", marginTop: "clamp(-110px,-9vw,-40px)", zIndex: 5 }}
        >
          <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 22px" }}>
            {/* Animate the card, not the <section>, so the section's stacking
                context and negative margin stay untouched. */}
            <m.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.75, ease: EASE_OUT }}
              style={{
                background: "#fff",
                borderRadius: 22,
                boxShadow: "0 30px 70px rgba(0,0,0,.22)",
                border: "1px solid #EFEFEF",
                overflow: "hidden",
              }}
            >
              <BookingWidget key={widgetKey} {...widgetProps} />
            </m.div>
          </div>
        </section>
      </MotionConfig>
    </LazyMotion>
  );
}