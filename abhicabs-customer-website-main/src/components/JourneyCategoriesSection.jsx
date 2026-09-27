import React from "react";
import { LazyMotion, domAnimation, m, MotionConfig } from "framer-motion";

// "EDITORIAL" section, titled "Plan Your Next Journey". Fixed 240px card
// height, bottom-left label over a black gradient.
// Styles are exactly as in the Figma build — framer-motion only adds the
// scroll reveal, hover and tap motion.

const EASE_OUT = [0.22, 1, 0.36, 1];

const header = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_OUT } },
};
const grid = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};
const card = {
  hidden: { opacity: 0, y: 26, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: EASE_OUT } },
  hover: { y: -6, transition: { type: "spring", stiffness: 360, damping: 24 } },
};
// Label follows the card: slides up after the card lands, lifts a touch more on hover.
// Every label the card passes down is mapped, so hover-out returns to "show".
const label = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT, delay: 0.15 } },
  hover: { opacity: 1, y: -4, transition: { type: "spring", stiffness: 360, damping: 22 } },
};

export default function JourneyCategoriesSection({ categories }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <section style={{ maxWidth: 1280, margin: "0 auto", padding: "clamp(46px,6vw,80px) 22px 0" }}>
          <m.div
            variants={header}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.6 }}
            style={{ marginBottom: 34 }}
          >
            <m.span variants={fadeUp} style={{ display: "inline-block", fontWeight: 700, fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase", color: "#B8860B" }}>Plan Ahead</m.span>
            <m.h2 variants={fadeUp} style={{ fontWeight: 800, fontSize: "clamp(26px,3.4vw,42px)", lineHeight: 1.12, margin: "8px 0 0", letterSpacing: "-.02em" }}>Plan Your Next Journey</m.h2>
          </m.div>

          <m.div
            variants={grid}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 18 }}
          >
            {categories.map((c) => (
              <m.div
                key={c}
                variants={card}
                whileHover="hover"
                whileTap={{ scale: 0.98 }}
                style={{ position: "relative", borderRadius: 18, overflow: "hidden", height: 240, cursor: "pointer", background: "linear-gradient(135deg,#e5e5e5,#c9c9c9)" }}
              >
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top,rgba(0,0,0,.75),transparent 60%)", pointerEvents: "none" }} />
                <m.div variants={label} style={{ position: "absolute", left: 18, bottom: 16, pointerEvents: "none" }}>
                  <div style={{ fontWeight: 700, fontSize: 18, color: "#fff" }}>{c}</div>
                </m.div>
              </m.div>
            ))}
          </m.div>
        </section>
      </MotionConfig>
    </LazyMotion>
  );
}