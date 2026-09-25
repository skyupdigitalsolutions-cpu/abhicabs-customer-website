import React, { useEffect, useRef } from "react";
import { LazyMotion, domAnimation, m, MotionConfig, animate, useInView, useReducedMotion } from "framer-motion";

const EASE_OUT = [0.22, 1, 0.36, 1];
const COUNT_EASE = [0.16, 1, 0.3, 1];
const GOLD_BG = "linear-gradient(135deg, #FFD54A 0%, #FFC107 45%, #F5AE00 100%)";

// Parses "10,000+" → { prefix: "", number: 10000, decimals: 0, suffix: "+" }
// and "4.8★" → { number: 4.8, decimals: 1, suffix: "★" }. Values it can't
// count (e.g. "24/7") come back with number: null and are shown as-is.
function parseValue(raw) {
  if (!raw) return { prefix: "", number: null, decimals: 0, suffix: raw };
  const s = String(raw).replace(/,/g, "");
  const match = s.match(/^([^0-9]*)(\d+(?:\.\d+)?)([^0-9]*)$/);
  if (!match) return { prefix: "", number: null, decimals: 0, suffix: raw };
  const decimals = match[2].includes(".") ? match[2].split(".")[1].length : 0;
  return { prefix: match[1] || "", number: parseFloat(match[2]), decimals, suffix: match[3] || "" };
}

function formatNumber(v, decimals) {
  const n = decimals ? Number(v.toFixed(decimals)) : Math.round(v);
  return n.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/* ── Motion variants ─────────────────────────────────────────────────── */
const grid = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};
const statIn = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_OUT } },
};
const barIn = {
  hidden: { scaleX: 0 },
  show: { scaleX: 1, transition: { duration: 0.5, ease: EASE_OUT, delay: 0.35 } },
};
const dividerIn = {
  hidden: { scaleY: 0 },
  show: { scaleY: 1, transition: { duration: 0.6, ease: EASE_OUT, delay: 0.2 } },
};

// Counts from 0 to the target by writing straight to the DOM — no React
// re-render per frame. An invisible copy of the final value reserves the
// width so the layout doesn't shift while digits are added.
function CountUp({ number, decimals, start, delay }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!start || !ref.current) return;
    if (reduce) {
      ref.current.textContent = formatNumber(number, decimals);
      return;
    }
    const controls = animate(0, number, {
      duration: 1.8,
      delay,
      ease: COUNT_EASE,
      onUpdate: (v) => { if (ref.current) ref.current.textContent = formatNumber(v, decimals); },
    });
    return () => controls.stop();
  }, [start, number, decimals, delay, reduce]);

  return (
    <span className="inline-grid">
      <span className="invisible [grid-area:1/1]">{formatNumber(number, decimals)}</span>
      <span ref={ref} className="[grid-area:1/1] text-center">{formatNumber(0, decimals)}</span>
    </span>
  );
}

function StatCard({ value, label, start, index, showDivider }) {
  const { prefix, number, decimals, suffix } = parseValue(value);

  return (
    <m.div variants={statIn} className="relative px-2 text-center">
      {/* Hairline divider between stats (desktop only) */}
      {showDivider && (
        <m.span
          aria-hidden
          variants={dividerIn}
          className="absolute left-[-10px] top-1/2 hidden h-14 w-px -translate-y-1/2 origin-center bg-[rgba(17,17,17,0.14)] md:block"
        />
      )}

      {/* Real value for screen readers / crawlers; the animated one is decorative */}
      <span className="sr-only">{value} {label}</span>

      <div
        aria-hidden
        className="tabular-nums"
        style={{
          fontFamily: "'Montserrat',sans-serif", fontWeight: 800,
          fontSize: "clamp(34px,4.4vw,52px)", color: "#111", lineHeight: 1, letterSpacing: "-.02em",
        }}
      >
        {number !== null ? (
          <>
            {prefix}
            <CountUp number={number} decimals={decimals} start={start} delay={0.2 + index * 0.12} />
            {suffix && <span style={{ color: "#3a2f00", marginLeft: 1 }}>{suffix}</span>}
          </>
        ) : (
          value
        )}
      </div>

      <m.span
        aria-hidden
        variants={barIn}
        className="mx-auto mt-3.5 block h-[3px] w-6 origin-center rounded-full bg-[#111]"
      />
      <div aria-hidden style={{ fontWeight: 600, fontSize: 14, color: "#3a2f00", marginTop: 10 }}>{label}</div>
    </m.div>
  );
}

export default function StatsBarSection({ stats, disclaimer }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });

  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <section
          ref={ref}
          className="relative isolate overflow-hidden"
          style={{ margin: "clamp(46px,6vw,80px) 0 0", background: GOLD_BG }}
        >
          {/* Subtle dot texture */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10"
            style={{
              backgroundImage: "radial-gradient(rgba(17,17,17,.07) 1px, transparent 1px)",
              backgroundSize: "22px 22px",
            }}
          />
          {/* Soft light pooling in the corners */}
          <div
            aria-hidden
            className="pointer-events-none absolute -left-24 -top-24 -z-10 h-72 w-72 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(255,255,255,.45) 0%, transparent 70%)" }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-28 -right-20 -z-10 h-80 w-80 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(240,150,0,.35) 0%, transparent 70%)" }}
          />
          {/* One light sweep across the band when it comes into view */}
          <m.div
            aria-hidden
            initial={{ x: "-120%" }}
            animate={inView ? { x: "120%" } : undefined}
            transition={{ duration: 1.6, ease: "easeInOut", delay: 0.2 }}
            className="pointer-events-none absolute inset-y-0 left-0 -z-10 w-1/2"
            style={{ background: "linear-gradient(100deg, transparent 0%, rgba(255,255,255,.35) 50%, transparent 100%)" }}
          />

          <div style={{ maxWidth: 1100, margin: "0 auto", padding: "clamp(40px,5vw,60px) 22px" }}>
            <m.div
              variants={grid}
              initial="hidden"
              animate={inView ? "show" : "hidden"}
              className="grid grid-cols-2 gap-x-5 gap-y-9 md:[grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]"
            >
              {stats.map((s, i) => (
                <StatCard
                  key={s.label}
                  value={s.value}
                  label={s.label}
                  start={inView}
                  index={i}
                  showDivider={i > 0}
                />
              ))}
            </m.div>

            {disclaimer && (
              <m.p
                initial={{ opacity: 0 }}
                animate={inView ? { opacity: 1 } : undefined}
                transition={{ duration: 0.6, delay: 0.2 + stats.length * 0.12 + 0.6 }}
                style={{ textAlign: "center", margin: "28px 0 0", fontSize: 11.5, color: "#6b5900", fontWeight: 500 }}
              >
                {disclaimer}
              </m.p>
            )}
          </div>
        </section>
      </MotionConfig>
    </LazyMotion>
  );
}