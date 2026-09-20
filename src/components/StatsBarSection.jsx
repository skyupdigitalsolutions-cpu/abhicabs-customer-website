import React, { useEffect, useRef, useState } from "react";

// Parses "10,000+" → { prefix: "", number: 10000, suffix: "+" }
function parseValue(raw) {
  if (!raw) return { prefix: "", number: null, suffix: raw };
  const s = String(raw).replace(/,/g, "");
  // Special cases like "24/7"
  const m = s.match(/^([^0-9]*)(\d+(?:\.\d+)?)([^0-9]*)$/);
  if (!m) return { prefix: "", number: null, suffix: raw };
  return { prefix: m[1] || "", number: parseFloat(m[2]), suffix: m[3] || "" };
}

function useCountUp(target, duration = 1800, active = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!active || target === null) return;
    let start = null;
    const from = 0;
    function step(ts) {
      if (!start) start = ts;
      const pct = Math.min((ts - start) / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - pct, 3);
      setCount(Math.round(from + (target - from) * eased));
      if (pct < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }, [active, target, duration]);
  return count;
}

function StatCard({ value, label, active }) {
  const { prefix, number, suffix } = parseValue(value);
  const count = useCountUp(number, 1800, active);

  function formatNumber(n) {
    if (n >= 1000) return n.toLocaleString("en-IN");
    return n;
  }

  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          fontFamily: "'Montserrat',sans-serif", fontWeight: 800,
          fontSize: "clamp(34px,4.4vw,52px)", color: "#111", lineHeight: 1,
        }}
      >
        {number !== null
          ? `${prefix}${formatNumber(active ? count : 0)}${suffix}`
          : value}
      </div>
      <div style={{ fontWeight: 600, fontSize: 14, color: "#3a2f00", marginTop: 6 }}>{label}</div>
    </div>
  );
}

export default function StatsBarSection({ stats, disclaimer }) {
  const ref = useRef(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!ref.current || active) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setActive(true); observer.disconnect(); } },
      { threshold: 0.3 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [active]);

  return (
    <section ref={ref} style={{ margin: "clamp(46px,6vw,80px) 0 0", background: "#FFC107" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "clamp(40px,5vw,60px) 22px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 20 }}>
          {stats.map((s) => (
            <StatCard key={s.label} value={s.value} label={s.label} active={active} />
          ))}
        </div>
        {disclaimer && (
          <p style={{ textAlign: "center", margin: "24px 0 0", fontSize: 11.5, color: "#6b5900", fontWeight: 500 }}>{disclaimer}</p>
        )}
      </div>
    </section>
  );
}
