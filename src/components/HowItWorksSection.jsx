import React, { useEffect, useRef, useState } from "react";

export default function HowItWorksSection({ steps }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.2 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
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

      {/* Steps row — grid so connector lines can span full gap */}
      <div style={{
        display: "grid",
        gridTemplateColumns: `repeat(${steps.length}, 1fr)`,
        alignItems: "start",
        position: "relative",
      }}>
        {/* Full-width connector track behind the icons — sits behind everything */}
        <div style={{
          position: "absolute",
          top: 34, // center of 70px badge
          left: "calc(100% / (2 * " + steps.length + "))",
          right: "calc(100% / (2 * " + steps.length + "))",
          height: 3,
          background: "#E8E8E8",
          borderRadius: 3,
          zIndex: 0,
          overflow: "hidden",
        }}>
          {/* Animated yellow fill */}
          <div style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(90deg, #FFC107, #FFD54F)",
            borderRadius: 3,
            transformOrigin: "left center",
            transform: `scaleX(${visible ? 1 : 0})`,
            transition: "transform 1.1s cubic-bezier(.4,0,.2,1) 0.3s",
          }} />

          {/* Travelling dot */}
          <div style={{
            position: "absolute",
            top: "50%",
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: "#fff",
            border: "3px solid #FFC107",
            transform: "translateY(-50%)",
            boxShadow: "0 0 8px rgba(255,193,7,.6)",
            left: visible ? "calc(100% - 6px)" : "-6px",
            transition: "left 1.1s cubic-bezier(.4,0,.2,1) 0.3s",
          }} />
        </div>

        {steps.map((s, i) => {
          const isLast = i === steps.length - 1;
          return (
            <div
              key={s.n}
              style={{
                textAlign: "center",
                padding: "0 12px",
                position: "relative",
                zIndex: 1,
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(28px)",
                transition: `opacity .55s ${i * 0.22}s, transform .55s ${i * 0.22}s`,
              }}
            >
              {/* Number badge */}
              <div style={{
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
                transition: `box-shadow .4s ${i * 0.22 + 0.3}s`,
              }}>
                {s.n}
              </div>

              <h3 style={{ fontWeight: 700, fontSize: 18, margin: "0 0 8px" }}>{s.title}</h3>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: "#666", fontWeight: 400, margin: 0 }}>{s.desc}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}