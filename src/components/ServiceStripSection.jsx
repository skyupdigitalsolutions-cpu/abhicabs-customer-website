import React from "react";

// New section from the Figma bundler export — a row of 5 quick-select
// service buttons directly under the booking widget. Not previously built.
export default function ServiceStripSection({ onSelect }) {
  const items = [
    { mode: "one-way", label: "One Way", bg: "#fff", iconBg: "#FFF7DE", text: "#111",
      icon: <path d="M5 12h14M13 6l6 6-6 6" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /> },
    { mode: "round-trip", label: "Round Trip", bg: "#fff", iconBg: "#FFF7DE", text: "#111",
      icon: <path d="M17 4l3 3-3 3M20 7H8a4 4 0 00-4 4M7 20l-3-3 3-3M4 17h12a4 4 0 004-4" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /> },
    { mode: "local", label: "Local Rental", bg: "#fff", iconBg: "#FFF7DE", text: "#111",
      icon: <path d="M4 20V9l7-4 7 4v11M9 20v-5h4v5" stroke="#111" strokeWidth="2" strokeLinejoin="round" /> },
    { mode: "airport", label: "Airport Transfer", bg: "#fff", iconBg: "#FFF7DE", text: "#111",
      icon: <path d="M10 3.6c.5-1 1.9-.9 2.2.2l1.3 4.9 6 1.8c.9.3.9 1.6 0 1.9l-6 1.8-1.3 4.9c-.3 1.1-1.7 1.2-2.2.2l-2.2-4.4-4.4-1.5c-1-.3-1-1.7 0-2l4.4-1.5L10 3.6z" stroke="#111" strokeWidth="1.9" strokeLinejoin="round" /> },
    { mode: "group-coach", label: "Group / Coach", bg: "#111", iconBg: "rgba(255,193,7,.18)", text: "#fff",
      href: "/booking-search?type=group",
      icon: <path d="M3 17V7a2 2 0 012-2h11a2 2 0 012 2v10M3 17h17M3 17v2h3v-2M17 17v2h3v-2M6 9h9M6 12.5h9" stroke="#FFC107" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /> },
  ];

  return (
    <section style={{ maxWidth: 1280, margin: "0 auto", padding: "clamp(34px,4vw,52px) 22px 0" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 14 }}>
        {items.map((it) => {
          const Tag = it.href ? "a" : "button";
          return (
            <Tag
              key={it.label}
              href={it.href}
              onClick={it.href ? undefined : () => onSelect(it.mode)}
              className="transition-transform hover:-translate-y-1"
              style={{
                display: "flex", alignItems: "center", gap: 13, padding: "16px 18px",
                borderRadius: 16, border: "1px solid #EFEFEF", background: it.bg,
                cursor: "pointer", textAlign: "left", textDecoration: "none",
              }}
            >
              <span style={{ width: 44, height: 44, flex: "none", borderRadius: 12, background: it.iconBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">{it.icon}</svg>
              </span>
              <span style={{ fontWeight: 600, fontSize: 14.5, color: it.text }}>{it.label}</span>
            </Tag>
          );
        })}
      </div>
    </section>
  );
}
