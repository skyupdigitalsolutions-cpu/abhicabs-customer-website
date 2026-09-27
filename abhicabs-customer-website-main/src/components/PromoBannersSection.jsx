import React from "react";
import { LazyMotion, domAnimation, m, MotionConfig } from "framer-motion";

// Two banners with genuinely different layouts (not a shared variant system):
// the first is a full-bleed dark photo with left-aligned text; the second is
// solid yellow with the photo confined to the right 52% and text on the left.
// Layout and styles are unchanged — framer-motion adds the reveal and hover.

const EASE_OUT = [0.22, 1, 0.36, 1];

// Banner: rises in on scroll (second one slightly later), then staggers its text.
const banner = {
  hidden: { opacity: 0, y: 28 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: EASE_OUT, delay: i * 0.12, when: "beforeChildren", staggerChildren: 0.08 },
  }),
};

// Photo: settles from a slight zoom on reveal, slow push-in on hover.
// Every label the banner can pass down is mapped, so hover-out returns to "show".
const photo = {
  hidden: { scale: 1.12 },
  show: { scale: 1, transition: { duration: 1.4, ease: EASE_OUT } },
  hover: { scale: 1.06, transition: { duration: 0.9, ease: EASE_OUT } },
};

const textItem = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT } },
  hover: { opacity: 1, y: 0 },
};

const arrowNudge = {
  hidden: { x: 0 },
  show: { x: 0 },
  hover: { x: 4, transition: { type: "spring", stiffness: 400, damping: 20 } },
};

export default function PromoBannersSection({ onOutstation, onGroup }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <section style={{ maxWidth: 1280, margin: "0 auto", padding: "clamp(46px,6vw,80px) 22px 0" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 22 }}>
            {/* Outstation */}
            <m.div
              custom={0}
              variants={banner}
              initial="hidden"
              whileInView="show"
              whileHover="hover"
              viewport={{ once: true, amount: 0.35 }}
              style={{ position: "relative", borderRadius: 22, overflow: "hidden", minHeight: 260, display: "flex", isolation: "isolate" }}
            >
              <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
                <m.img
                  variants={photo}
                  src="/images/weekend.jpg"
                  alt="Outstation trips"
                  style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top", willChange: "transform" }}
                />
              </div>
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,rgba(13,13,13,.9),rgba(13,13,13,.5))", pointerEvents: "none" }} />
              <div style={{ position: "relative", padding: "clamp(24px,3vw,40px)", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-start" }}>
                <m.span variants={textItem} style={{ fontWeight: 700, fontSize: 11.5, letterSpacing: ".14em", textTransform: "uppercase", color: "#FFC107" }}>Outstation</m.span>
                <m.h3 variants={textItem} style={{ fontWeight: 800, fontSize: "clamp(24px,2.8vw,34px)", color: "#fff", margin: "10px 0 8px", lineHeight: 1.1 }}>Weekend Getaway?</m.h3>
                <m.p variants={textItem} style={{ fontSize: 14.5, color: "rgba(255,255,255,.75)", fontWeight: 400, margin: "0 0 20px", maxWidth: 300 }}>
                  Take the road to your next destination in comfort.
                </m.p>
                <m.button
                  variants={textItem}
                  whileTap={{ scale: 0.96 }}
                  onClick={onOutstation}
                  className="hover:!bg-[#FFB300]"
                  style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 24px", borderRadius: 9999, background: "#FFC107", color: "#111", fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer", transition: "background-color .2s" }}
                >
                  Book Outstation
                  <m.svg variants={arrowNudge} width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                  </m.svg>
                </m.button>
              </div>
            </m.div>

            {/* Group Travel */}
            <m.div
              custom={1}
              variants={banner}
              initial="hidden"
              whileInView="show"
              whileHover="hover"
              viewport={{ once: true, amount: 0.35 }}
              style={{ position: "relative", borderRadius: 22, overflow: "hidden", minHeight: 260, display: "flex", background: "#FFC107", isolation: "isolate" }}
            >
              <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "52%", overflow: "hidden" }}>
                <m.img
                  variants={photo}
                  src="/images/40seater.jpg"
                  alt="Group travel"
                  style={{ width: "100%", height: "100%", objectFit: "cover", willChange: "transform" }}
                />
              </div>
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,#FFC107 40%,rgba(255,193,7,.2) 62%,transparent)", pointerEvents: "none" }} />
              <div style={{ position: "relative", padding: "clamp(24px,3vw,40px)", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-start", maxWidth: "60%" }}>
                <m.span variants={textItem} style={{ fontWeight: 700, fontSize: 11.5, letterSpacing: ".14em", textTransform: "uppercase", color: "#7a5c00" }}>Group Travel</m.span>
                <m.h3 variants={textItem} style={{ fontWeight: 800, fontSize: "clamp(24px,2.8vw,34px)", color: "#111", margin: "10px 0 8px", lineHeight: 1.1 }}>Travelling With a Group?</m.h3>
                <m.p variants={textItem} style={{ fontSize: 14.5, color: "#3a2f00", fontWeight: 500, margin: "0 0 20px" }}>
                  Comfortable vehicles for every group size.
                </m.p>
                <m.button
                  variants={textItem}
                  whileTap={{ scale: 0.96 }}
                  onClick={onGroup}
                  className="hover:!bg-black"
                  style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 24px", borderRadius: 9999, background: "#111", color: "#fff", fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer", transition: "background-color .2s" }}
                >
                  Explore Group Travel
                  <m.svg variants={arrowNudge} width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M5 12h14M13 6l6 6-6 6" stroke="#FFC107" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                  </m.svg>
                </m.button>
              </div>
            </m.div>
          </div>
        </section>
      </MotionConfig>
    </LazyMotion>
  );
}