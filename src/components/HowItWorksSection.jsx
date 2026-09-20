import React, { useEffect, useRef, useState } from "react";

export default function HowItWorksSection({ steps }) {
  const ref = useRef(null);
  const lineRefs = useRef([]);
  const [visible, setVisible] = useState(false);
  const [lineWidths, setLineWidths] = useState([]);

  // Trigger when section scrolls into view
  useEffect(() => {
    if (!ref.current || visible) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.25 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [visible]);

  // Measure the actual pixel gaps between step boxes so lines are exact
  useEffect(() => {
    function measure() {
      if (!ref.current) return;
      const stepEls = ref.current.querySelectorAll(".how-step");
      if (stepEls.length < 2) return;
      const widths = [];
      for (let i = 0; i < stepEls.length - 1; i++) {
        const a = stepEls[i].getBoundingClientRect();
        const b = stepEls[i + 1].getBoundingClientRect();
        widths.push(Math.max(0, b.left - a.right));
      }
      setLineWidths(widths);
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  return (
    <section ref={ref} style={{ maxWidth: 1100, margin: "0 auto", padding: "clamp(46px,6vw,80px) 22px 0" }}>
      {/* Heading */}
      <div style={{ textAlign: "center", maxWidth: 620, margin: "0 auto 56px" }}>
        <span style={{ display: "inline-block", fontWeight: 700, fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase", color: "#B8860B" }}>
          How It Works
        </span>
        <h2 style={{ fontWeight: 800, fontSize: "clamp(26px,3.4vw,42px)", lineHeight: 1.12, margin: "8px 0 0", letterSpacing: "-.02em" }}>
          Book Your Journey in 3 Simple Steps
        </h2>
      </div>

      {/* Steps row */}
      <div style={{ position: "relative", display: "flex", justifyContent: "center", alignItems: "flex-start", gap: 0 }}>
        {steps.map((s, i) => {
          const isLast = i === steps.length - 1;
          const isActive = visible;
          const lineDelay = i * 0.45; // stagger each line

          return (
            <React.Fragment key={s.n}>
              {/* Step card */}
              <div
                className="how-step"
                style={{
                  flex: "1 1 0", maxWidth: 260, textAlign: "center", padding: "0 16px",
                  opacity: visible ? 1 : 0,
                  transform: visible ? "translateY(0)" : "translateY(24px)",
                  transition: `opacity .5s ${i * 0.18}s, transform .5s ${i * 0.18}s`,
                }}
              >
                {/* Number badge */}
                <div
                  style={{
                    width: 70, height: 70, margin: "0 auto 20px", borderRadius: 22,
                    background: isLast ? "#FFC107" : "#111",
                    color: isLast ? "#111" : "#FFC107",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "'Montserrat',sans-serif", fontWeight: 800, fontSize: 23,
                    boxShadow: isLast
                      ? "0 8px 24px rgba(255,193,7,.45)"
                      : "0 8px 24px rgba(0,0,0,.18)",
                  }}
                >
                  {s.n}
                </div>
                <h3 style={{ fontWeight: 700, fontSize: 18, margin: "0 0 8px" }}>{s.title}</h3>
                <p style={{ fontSize: 14, lineHeight: 1.6, color: "#666", fontWeight: 400, margin: 0 }}>{s.desc}</p>
              </div>

              {/* Connector line between steps */}
              {!isLast && (
                <div
                  style={{
                    alignSelf: "flex-start",
                    marginTop: 34, // align with center of 70px badge
                    flex: "0 0 auto",
                    width: lineWidths[i] > 0 ? lineWidths[i] : 60,
                    height: 2,
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {/* Track */}
                  <div style={{ position: "absolute", inset: 0, background: "#E5E5E5", borderRadius: 2 }} />
                  {/* Animated fill */}
                  <div
                    style={{
                      position: "absolute", inset: 0, background: "#FFC107", borderRadius: 2,
                      transformOrigin: "left center",
                      transform: `scaleX(${visible ? 1 : 0})`,
                      transition: `transform 0.6s cubic-bezier(.4,0,.2,1) ${lineDelay + 0.4}s`,
                    }}
                  />
                  {/* Moving dot */}
                  {visible && (
                    <div
                      style={{
                        position: "absolute", top: "50%", left: 0,
                        width: 10, height: 10, borderRadius: "50%",
                        background: "#FFC107", border: "2px solid #fff",
                        transform: "translate(-50%,-50%)",
                        animation: `moveDot 0.6s cubic-bezier(.4,0,.2,1) ${lineDelay + 0.4}s forwards`,
                        opacity: 0,
                      }}
                    />
                  )}
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      <style>{`
        @keyframes moveDot {
          0%   { left: 0%;   opacity: 1; }
          100% { left: 100%; opacity: 1; }
        }
      `}</style>
    </section>
  );
}
