import React, { useState } from "react";

// Rebuilt to match the Figma bundler export exactly.
export default function FAQSection({ faqs, defaultOpenIndex = 0 }) {
  const [openIdx, setOpenIdx] = useState(defaultOpenIndex);

  return (
    <section style={{ maxWidth: 820, margin: "0 auto", padding: "clamp(46px,6vw,80px) 22px 0" }}>
      <div style={{ textAlign: "center", margin: "0 auto 36px" }}>
        <span style={{ display: "inline-block", fontWeight: 700, fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase", color: "#B8860B" }}>FAQ</span>
        <h2 style={{ fontWeight: 800, fontSize: "clamp(26px,3.4vw,42px)", lineHeight: 1.12, margin: "8px 0 0", letterSpacing: "-.02em" }}>Frequently Asked Questions</h2>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {faqs.map((f, i) => {
          const isOpen = openIdx === i;
          return (
            <div key={f.q} style={{ border: "1px solid #E5E5E5", borderRadius: 16, overflow: "hidden", background: "#fff" }}>
              <button
                onClick={() => setOpenIdx(isOpen ? -1 : i)}
                aria-expanded={isOpen}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "18px 22px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}
              >
                <span style={{ fontWeight: 600, fontSize: 15, color: "#111" }}>{f.q}</span>
                <span style={{ flex: "none", width: 28, height: 28, borderRadius: 8, background: "#F7F7F7", display: "flex", alignItems: "center", justifyContent: "center", transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="#111" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
              </button>
              {isOpen && (
                <p style={{ margin: 0, padding: "0 22px 20px", fontSize: 14, lineHeight: 1.65, color: "#666", fontWeight: 400 }}>{f.a}</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
