import React from "react";

// Rebuilt to match the Figma bundler export exactly ("WHY CHOOSE US").
export default function WhyAbhiCabsSection({ reasons, imageSrc, imageAlt = "Professional Indian chauffeur beside a clean premium car", id = "about" }) {
  return (
    <section id={id} style={{ maxWidth: 1280, margin: "0 auto", padding: "clamp(46px,6vw,80px) 22px 0" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "clamp(28px,4vw,56px)", alignItems: "stretch" }}>
        <div style={{ flex: "1 1 320px", minWidth: "min(100%,320px)", borderRadius: 22, overflow: "hidden", minHeight: 380, position: "relative" }}>
          <img src={imageSrc} alt={imageAlt} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 20%", position: "absolute", inset: 0 }} />
        </div>
        <div style={{ flex: "1 1 360px", minWidth: "min(100%,320px)" }}>
          <span style={{ display: "inline-block", fontWeight: 700, fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase", color: "#B8860B" }}>Why Abhi Cabs</span>
          <h2 style={{ fontWeight: 800, fontSize: "clamp(28px,3.6vw,44px)", lineHeight: 1.1, margin: "10px 0 24px", letterSpacing: "-.02em" }}>More Than Just a Ride.</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: "20px 24px" }}>
            {reasons.map((w, i) => (
              <div key={w.title} style={{ display: "flex", gap: 14 }}>
                <span style={{ flex: "none", fontFamily: "'Montserrat',sans-serif", fontWeight: 800, fontSize: 20, color: "#FFC107", width: 38, height: 38, borderRadius: 10, background: "#FFF7DE", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 style={{ fontWeight: 700, fontSize: 15.5, margin: "0 0 3px" }}>{w.title}</h3>
                  <p style={{ fontSize: 13, color: "#666", fontWeight: 400, margin: 0, lineHeight: 1.55 }}>{w.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
