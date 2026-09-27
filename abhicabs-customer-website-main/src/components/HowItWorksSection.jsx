import React from "react";
import { LazyMotion, domAnimation, m, MotionConfig } from "framer-motion";

// Same layout and styles as before; the IntersectionObserver + CSS transitions
// are replaced by framer-motion so the whole sequence is one timeline:
// heading → steps rise in → track fills while the dot travels → each badge
// pulses as the dot reaches it.

const EASE_OUT = [0.22, 1, 0.36, 1];
const TRACK_EASE = [0.4, 0, 0.2, 1]; // same curve as the old CSS transition
const TRACK_DELAY = 0.3;
const TRACK_DURATION = 1.1;

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_OUT } },
};
const trackFill = {
  hidden: { scaleX: 0 },
  show: { scaleX: 1, transition: { duration: TRACK_DURATION, ease: TRACK_EASE, delay: TRACK_DELAY } },
};
// The dot's layer is exactly as wide as the track, so sliding it from -100% → 0%
// carries the dot from the first badge to the last.
const dotTravel = {
  hidden: { x: "-100%" },
  show: { x: "0%", transition: { duration: TRACK_DURATION, ease: TRACK_EASE, delay: TRACK_DELAY } },
};
const stepIn = {
  hidden: { opacity: 0, y: 28 },
  show: (i) => ({ opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE_OUT, delay: i * 0.22 } }),
};
const badgePop = {
  hidden: { scale: 0.7 },
  show: (i) => ({ scale: 1, transition: { type: "spring", stiffness: 420, damping: 18, delay: i * 0.22 + 0.05 } }),
};

export default function HowItWorksSection({ steps }) {
  const n = steps.length;
  // When the travelling dot reaches badge i
  const arrival = (i) => TRACK_DELAY + TRACK_DURATION * (n > 1 ? i / (n - 1) : 0);
  const ringPulse = {
    hidden: { scale: 1, opacity: 0 },
    show: (i) => ({
      scale: [1, 1.45],
      opacity: [0.55, 0],
      transition: { duration: 0.9, ease: "easeOut", delay: arrival(i) },
    }),
  };

  const trackInset = {
    top: 34, // center of 70px badge
    left: "calc(100% / (2 * " + n + "))",
    right: "calc(100% / (2 * " + n + "))",
  };

  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <m.section
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          style={{ maxWidth: 1100, margin: "0 auto", padding: "clamp(46px,6vw,80px) 22px 0" }}
        >
          {/* Heading */}
          <m.div
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
            style={{ textAlign: "center", maxWidth: 620, margin: "0 auto 56px" }}
          >
            <m.span variants={fadeUp} style={{ display: "inline-block", fontWeight: 700, fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase", color: "#B8860B" }}>
              How It Works
            </m.span>
            <m.h2 variants={fadeUp} style={{ fontWeight: 800, fontSize: "clamp(26px,3.4vw,42px)", lineHeight: 1.12, margin: "8px 0 0", letterSpacing: "-.02em" }}>
              Book Your Journey in 3 Simple Steps
            </m.h2>
          </m.div>

          {/* Steps row — grid so connector lines can span full gap */}
          <div style={{
            display: "grid",
            gridTemplateColumns: `repeat(${n}, 1fr)`,
            alignItems: "start",
            position: "relative",
          }}>
            {/* Connector track behind the icons */}
            <div style={{
              position: "absolute",
              ...trackInset,
              height: 3,
              background: "#E8E8E8",
              borderRadius: 3,
              zIndex: 0,
              overflow: "hidden",
            }}>
              {/* Animated yellow fill */}
              <m.div
                variants={trackFill}
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "linear-gradient(90deg, #FFC107, #FFD54F)",
                  borderRadius: 3,
                  originX: 0,
                }}
              />
            </div>

            {/* Travelling dot — in its own layer (not inside the 3px track, whose
                overflow:hidden was clipping the 12px dot to a sliver) */}
            <div aria-hidden style={{ position: "absolute", ...trackInset, height: 3, zIndex: 0, pointerEvents: "none" }}>
              <m.div variants={dotTravel} style={{ position: "absolute", inset: 0 }}>
                <div style={{
                  position: "absolute",
                  top: "50%",
                  right: -6,
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  background: "#fff",
                  border: "3px solid #FFC107",
                  transform: "translateY(-50%)",
                  boxShadow: "0 0 8px rgba(255,193,7,.6)",
                  boxSizing: "border-box",
                }} />
              </m.div>
            </div>

            {steps.map((s, i) => {
              const isLast = i === n - 1;
              return (
                <m.div
                  key={s.n}
                  custom={i}
                  variants={stepIn}
                  style={{
                    textAlign: "center",
                    padding: "0 12px",
                    position: "relative",
                    zIndex: 1,
                  }}
                >
                  {/* Number badge */}
                  <m.div
                    custom={i}
                    variants={badgePop}
                    style={{
                      width: 70,
                      height: 70,
                      margin: "0 auto 20px",
                      borderRadius: 22,
                      background: isLast ? "#FFC107" : "#111",
                      color: isLast ? "#111" : "#FFC107",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "'Montserrat',sans-serif",
                      fontWeight: 800,
                      fontSize: 23,
                      boxShadow: isLast
                        ? "0 8px 28px rgba(255,193,7,.5)"
                        : "0 8px 24px rgba(0,0,0,.18)",
                      position: "relative",
                      zIndex: 2,
                    }}
                  >
                    {/* Pulse ring — fires as the travelling dot arrives */}
                    <m.span
                      aria-hidden
                      custom={i}
                      variants={ringPulse}
                      style={{
                        position: "absolute",
                        inset: 0,
                        borderRadius: 22,
                        border: "2px solid #FFC107",
                        pointerEvents: "none",
                      }}
                    />
                    {s.n}
                  </m.div>

                  <h3 style={{ fontWeight: 700, fontSize: 18, margin: "0 0 8px" }}>{s.title}</h3>
                  <p style={{ fontSize: 14, lineHeight: 1.6, color: "#666", fontWeight: 400, margin: 0 }}>{s.desc}</p>
                </m.div>
              );
            })}
          </div>
        </m.section>
      </MotionConfig>
    </LazyMotion>
  );
}