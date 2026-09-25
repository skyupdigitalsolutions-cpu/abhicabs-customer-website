import React, { useState } from "react";
import { LazyMotion, domAnimation, m, MotionConfig } from "framer-motion";
// Map geometry lives in coverageMapData.js (same folder as this file).
import { MAP_DATA } from "./coverageMapData";

const STATE_ORDER = ["Maharashtra", "Karnataka", "Telangana", "Andhra Pradesh"];
const IS_NEW = { Maharashtra: true, "Andhra Pradesh": true };

/* ── Motion variants (styles are untouched; these only animate in) ───── */
const EASE_OUT = [0.22, 1, 0.36, 1];
const VIEW = { once: true, amount: 0.25 };

const stagger = (gap = 0.09, delay = 0) => ({
  hidden: {},
  show: { transition: { staggerChildren: gap, delayChildren: delay } },
});
const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_OUT } },
};
const cardIn = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.55, ease: EASE_OUT } },
};
// Map sequence: states grow in one by one → connectors fade in → pins drop in
const stateIn = {
  hidden: { opacity: 0, scale: 0.92 },
  show: (i) => ({ opacity: 1, scale: 1, transition: { duration: 0.7, ease: EASE_OUT, delay: 0.1 + i * 0.12 } }),
};
const connectorsIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.8, delay: 0.7 } },
};
const pinIn = {
  hidden: { opacity: 0, y: -18 },
  show: (i) => ({ opacity: 1, y: 0, transition: { type: "spring", stiffness: 380, damping: 18, delay: 0.85 + i * 0.1 } }),
};
const labelIn = {
  hidden: { opacity: 0, x: 12 },
  show: { opacity: 1, x: 0, transition: { duration: 0.6, ease: EASE_OUT, delay: 0.3 } },
};
const arrowNudge = { rest: { x: 0 }, hover: { x: 4, transition: { type: "spring", stiffness: 400, damping: 18 } } };

function MiniMap({ name }) {
  const md = MAP_DATA.states[name]?.mini;
  if (!md) return null;
  const gid = "acM" + name.replace(/\s/g, "");
  return (
    <svg
      viewBox={`0 0 ${md.w} ${md.h}`}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      style={{ display: "block", maxHeight: 66 }}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFD24A" />
          <stop offset="100%" stopColor="#B8790A" />
        </linearGradient>
      </defs>
      <path d={md.d} fill={`url(#${gid})`} stroke="#FFE79A" strokeWidth={0.9} strokeLinejoin="round" />
    </svg>
  );
}

function BigMap({ hovered }) {
  const md = MAP_DATA;
  return (
    <svg
      viewBox={`0 0 ${md.vb.w} ${md.vb.h}`}
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      <defs>
        <linearGradient id="acSG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFD24A" />
          <stop offset="100%" stopColor="#B8790A" />
        </linearGradient>
        <filter id="acGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* State fills — each wrapped in an animated group; the path itself is unchanged */}
      {STATE_ORDER.filter(n => md.states[n]).map((n, i) => {
        const hi = hovered === n;
        return (
          <m.g key={n} custom={i} variants={stateIn} style={{ transformBox: "fill-box", transformOrigin: "center" }}>
            <path
              d={md.states[n].big}
              fill="url(#acSG)"
              stroke="#FFE79A"
              strokeWidth={hi ? 1.8 : 1}
              strokeLinejoin="round"
              filter="url(#acGlow)"
              opacity={hovered ? (hi ? 1 : 0.5) : 0.85}
              style={{ transition: "opacity .25s, stroke-width .25s" }}
            />
          </m.g>
        );
      })}

      {/* Connector lines */}
      <m.g variants={connectorsIn}>
        {md.connectors.map((d, i) => (
          <path
            key={`c${i}`}
            d={d}
            fill="none"
            stroke="#FFC107"
            strokeWidth={1.5}
            strokeDasharray="1 7"
            strokeLinecap="round"
            opacity={0.9}
          >
            <animate attributeName="stroke-dashoffset" from="0" to="-64" dur="2s" repeatCount="indefinite" />
          </path>
        ))}
      </m.g>

      {/* City pins — drop in after the map */}
      {STATE_ORDER.filter(n => md.pins[n]).map((n, i) => {
        const p = md.pins[n];
        const hi = hovered === n;
        const w = n.length * 7 + 22;
        return (
          <g key={`p${n}`} transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`}>
            <m.g custom={i} variants={pinIn}>
              <circle r="5" fill="#FFC107" opacity="0.4">
                <animate attributeName="r" values="5;17;5" dur="2.6s" repeatCount="indefinite" />
                <animate attributeName="opacity" values=".5;0;.5" dur="2.6s" repeatCount="indefinite" />
              </circle>
              <path
                d="M0 -15 C7.2 -15 10.5 -9 10.5 -4.5 C10.5 2.5 0 12 0 12 C0 12 -10.5 2.5 -10.5 -4.5 C-10.5 -9 -7.2 -15 0 -15 Z"
                fill="#fff"
                transform={`scale(${hi ? 1.18 : 1})`}
                style={{ transition: "transform .2s" }}
              />
              <circle cy={-4.5} r={3.6} fill="#111" />
              <g transform="translate(0 16)">
                <rect x={(-w / 2).toFixed(1)} y="0" width={w} height="21" rx="6" fill="#111" />
                <text
                  x="0"
                  y="14.5"
                  fill="#FFC107"
                  fontSize="11"
                  fontWeight="700"
                  fontFamily="Poppins,system-ui,sans-serif"
                  textAnchor="middle"
                >
                  {n}
                </text>
              </g>
            </m.g>
          </g>
        );
      })}
    </svg>
  );
}

// coverage prop accepted for backwards-compat (new design uses baked-in state paths)
export default function CoverageSection({ id = "cities", coverage }) { // eslint-disable-line no-unused-vars
  const [hovered, setHovered] = useState(null);

  const handleRequest = () => {
    // Scroll to booking form or open enquiry modal
    const el = document.getElementById("booking") || document.querySelector("form");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <section id={id} style={{ maxWidth: 1280, margin: "0 auto", padding: "clamp(24px,4vw,48px) 22px" }}>
          <div style={{ background: "#0d0d0d", borderRadius: 28, position: "relative", overflow: "hidden" }}>
            {/* Dot grid */}
            <div style={{
              position: "absolute", inset: 0,
              backgroundImage: "radial-gradient(rgba(255,255,255,.045) 1px,transparent 1px)",
              backgroundSize: "28px 28px", pointerEvents: "none"
            }} />
            {/* Glow orb — slow breathe */}
            <m.div
              aria-hidden
              animate={{ scale: [1, 1.08, 1], opacity: [0.85, 1, 0.85] }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
              style={{
                position: "absolute", top: -140, right: -40,
                width: 520, height: 520, borderRadius: "50%",
                background: "radial-gradient(circle,rgba(255,193,7,.16),transparent 68%)",
                pointerEvents: "none"
              }}
            />

            <div style={{ position: "relative", display: "flex", flexWrap: "wrap" }}>
              {/* LEFT */}
              <m.div
                variants={stagger(0.09, 0.05)}
                initial="hidden"
                whileInView="show"
                viewport={VIEW}
                style={{ flex: "1 1 440px", minWidth: "min(100%, 340px)", padding: "clamp(30px,3.6vw,56px)" }}
              >
                <m.span variants={fadeUp} style={{
                  display: "inline-block", fontWeight: 700, fontSize: 12,
                  letterSpacing: ".16em", textTransform: "uppercase", color: "#FFC107"
                }}>Coverage</m.span>
                <m.h2 variants={fadeUp} style={{
                  fontWeight: 800, fontSize: "clamp(30px,4vw,52px)", lineHeight: 1.04,
                  margin: "12px 0 16px", letterSpacing: "-.025em", color: "#fff"
                }}>
                  Built Around<br />Your <span style={{ color: "#FFC107" }}>Routes</span>
                </m.h2>
                <m.p variants={fadeUp} style={{
                  fontSize: 15.5, lineHeight: 1.6, color: "rgba(255,255,255,.62)",
                  fontWeight: 400, margin: "0 0 28px", maxWidth: 460
                }}>
                  Extensive travel coverage across Karnataka, Telangana, Maharashtra and Andhra Pradesh — wherever you travel, we&apos;ve got you covered.
                </m.p>

                {/* State cards grid */}
                <m.div variants={stagger(0.08)} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(118px,1fr))", gap: 14 }}>
                  {STATE_ORDER.map(name => (
                    // Animated wrapper; the card below keeps its own styles and hover lift
                    <m.div key={name} variants={cardIn} style={{ display: "grid" }}>
                      <div
                        onMouseEnter={() => setHovered(name)}
                        onMouseLeave={() => setHovered(null)}
                        style={{
                          background: hovered === name ? "rgba(255,193,7,.06)" : "rgba(255,255,255,.045)",
                          border: `1px solid ${hovered === name ? "rgba(255,193,7,.45)" : "rgba(255,255,255,.09)"}`,
                          borderRadius: 18, padding: "16px 14px 14px", cursor: "default",
                          position: "relative", transition: "transform .2s, border-color .2s, background .2s",
                          transform: hovered === name ? "translateY(-4px)" : "none"
                        }}
                      >
                        {IS_NEW[name] && (
                          <span style={{
                            position: "absolute", top: 10, right: 10,
                            fontSize: 8.5, fontWeight: 700, letterSpacing: ".06em",
                            color: "#111", background: "#FFC107", padding: "2px 7px", borderRadius: 9999
                          }}>NEW</span>
                        )}
                        <div style={{ height: 66, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
                          <MiniMap name={name} />
                        </div>
                        <div style={{ textAlign: "center", fontWeight: 700, fontSize: 13.5, color: "#fff" }}>{name}</div>
                        <div style={{ width: 26, height: 3, borderRadius: 2, background: "#FFC107", margin: "8px auto 0" }} />
                      </div>
                    </m.div>
                  ))}
                </m.div>
              </m.div>

              {/* RIGHT: Map */}
              <m.div
                initial="hidden"
                whileInView="show"
                viewport={VIEW}
                style={{
                  flex: "1 1 480px", minWidth: "min(100%, 320px)",
                  position: "relative", minHeight: "clamp(360px,42vw,540px)"
                }}
              >
                <m.div variants={labelIn} style={{
                  position: "absolute", top: "clamp(20px,3vw,40px)", right: "clamp(20px,3vw,44px)",
                  textAlign: "right", zIndex: 3, pointerEvents: "none"
                }}>
                  <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: ".2em", color: "rgba(255,255,255,.42)", lineHeight: 1.9 }}>
                    FOUR STATES<br />COUNTLESS<br />DESTINATIONS
                  </div>
                  <div style={{ width: 44, height: 3, background: "#FFC107", margin: "10px 0 0 auto", borderRadius: 2 }} />
                </m.div>
                <div style={{ position: "absolute", inset: 0 }}>
                  <BigMap hovered={hovered} />
                </div>
              </m.div>
            </div>

            {/* Request band */}
            <m.div
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.5 }}
              style={{
                position: "relative",
                margin: "0 clamp(16px,2vw,28px)",
                background: "#FFC107", borderRadius: 22,
                padding: "clamp(22px,2.6vw,30px) clamp(24px,3vw,40px)",
                display: "flex", flexWrap: "wrap", alignItems: "center", gap: "20px 28px"
              }}
            >
              <span style={{
                flex: "none", width: 54, height: 54, borderRadius: 15,
                background: "rgba(17,17,17,.1)", display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <rect x="5" y="3" width="14" height="18" rx="2.5" stroke="#111" strokeWidth="1.8" />
                  <path d="M9 8h6M9 12h6M9 16h3" stroke="#111" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </span>
              <div style={{ flex: "1 1 300px", minWidth: "min(100%, 260px)" }}>
                <div style={{ fontWeight: 700, fontSize: 11.5, letterSpacing: ".16em", textTransform: "uppercase", color: "#7a5c00", marginBottom: 5 }}>
                  Travelling to another city?
                </div>
                <h3 style={{ fontWeight: 800, fontSize: "clamp(22px,2.6vw,30px)", color: "#111", margin: "0 0 6px", letterSpacing: "-.02em" }}>
                  Send a Travel Request
                </h3>
                <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "#3a2f00", fontWeight: 500, margin: 0, maxWidth: 520 }}>
                  Tell us your destination and our team will check availability and get back to you with the best options.
                </p>
              </div>
              <m.button
                onClick={handleRequest}
                aria-label="Send a travel request"
                initial="rest"
                animate="rest"
                whileHover="hover"
                whileTap={{ scale: 0.92 }}
                variants={{ rest: { scale: 1 }, hover: { scale: 1.08 } }}
                transition={{ type: "spring", stiffness: 380, damping: 20 }}
                style={{
                  flex: "none", width: 60, height: 60, borderRadius: "50%",
                  background: "#111", border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center"
                }}
              >
                <m.svg variants={arrowNudge} width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12h14M13 6l6 6-6 6" stroke="#FFC107" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </m.svg>
              </m.button>
            </m.div>

            {/* Feature row */}
            <m.div
              variants={stagger(0.12, 0.1)}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.5 }}
              style={{
                position: "relative",
                display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
                gap: 4, padding: "clamp(24px,3vw,40px) clamp(20px,3vw,44px) clamp(28px,3.4vw,48px)"
              }}
            >
              <m.div variants={fadeUp} style={{ display: "flex", alignItems: "center", gap: 14, padding: "6px 22px 6px 0", borderRight: "1px solid rgba(255,255,255,.08)" }}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
                  <path d="M3 13l1.6-4.4A2.5 2.5 0 017 7h10a2.5 2.5 0 012.4 1.6L21 13v5h-2.5M3 18v-5m0 5h2.5m0 0a1.75 1.75 0 103.5 0m-3.5 0h9m0 0a1.75 1.75 0 103.5 0" stroke="#FFC107" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#fff" }}>Wide Coverage</div>
                  <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.55)", fontWeight: 400, marginTop: 2 }}>Across 4 states and beyond.</div>
                </div>
              </m.div>
              <m.div variants={fadeUp} style={{ display: "flex", alignItems: "center", gap: 14, padding: "6px 22px", borderRight: "1px solid rgba(255,255,255,.08)" }}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
                  <circle cx="9" cy="8" r="3.2" stroke="#FFC107" strokeWidth="1.8" />
                  <path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" stroke="#FFC107" strokeWidth="1.8" strokeLinecap="round" />
                  <path d="M16 6.5a3 3 0 010 5.6M17.5 19c0-2.2-1-3.9-2.5-4.7" stroke="#FFC107" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#fff" }}>Dedicated Support</div>
                  <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.55)", fontWeight: 400, marginTop: 2 }}>We plan the best route for you.</div>
                </div>
              </m.div>
              <m.div variants={fadeUp} style={{ display: "flex", alignItems: "center", gap: 14, padding: "6px 0 6px 22px" }}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
                  <path d="M12 3l7 2.5v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9v-5L12 3z" stroke="#FFC107" strokeWidth="1.8" strokeLinejoin="round" />
                  <path d="M9 12l2 2 4-4" stroke="#FFC107" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#fff" }}>Reliable Travel</div>
                  <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.55)", fontWeight: 400, marginTop: 2 }}>Safe, comfortable and on time.</div>
                </div>
              </m.div>
            </m.div>
          </div>
        </section>
      </MotionConfig>
    </LazyMotion>
  );
}