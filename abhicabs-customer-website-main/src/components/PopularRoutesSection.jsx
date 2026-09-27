import React, { useId, useMemo, useState } from "react";
import { LazyMotion, domMax, m, MotionConfig, AnimatePresence, LayoutGroup } from "framer-motion";

// This section carries id="services" (the header nav's "Services" link
// scrolls here). Card markup and styles are unchanged from the Figma build —
// motion is applied to a wrapper around each card, never the card itself,
// so the card's own hover lift keeps working.
const BADGE_COLORS = {
  Intercity: { bg: "rgba(255,193,7,.9)", fg: "#111" },
  Outstation: { bg: "#111", fg: "#fff" },
  "Long Distance": { bg: "rgba(255,255,255,.9)", fg: "#111" },
};

const EASE_OUT = [0.22, 1, 0.36, 1];
const DARK = "linear-gradient(180deg, #3A3A3A 0%, #1C1C1C 55%, #0B0B0B 100%)";
const LIGHT = "linear-gradient(180deg, #FFFFFF 0%, #F3F2EF 100%)";

const header = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_OUT } },
};
const grid = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};
const cardWrap = {
  hidden: { opacity: 0, y: 24, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.55, ease: EASE_OUT } },
  exit: { opacity: 0, scale: 0.96, transition: { duration: 0.18, ease: "easeIn" } },
};

export default function PopularRoutesSection({ routes, onBook, id = "services" }) {
  const scope = useId();
  const [filter, setFilter] = useState("All");

  // Filter chips come from the data itself — only badges that actually exist
  const badges = useMemo(() => [...new Set(routes.map((r) => r.badge).filter(Boolean))], [routes]);
  const showFilters = badges.length > 1;
  const visible = filter === "All" ? routes : routes.filter((r) => r.badge === filter);

  return (
    <LazyMotion features={domMax} strict>
      <MotionConfig reducedMotion="user">
        <LayoutGroup id={scope}>
          <section id={id} style={{ maxWidth: 1280, margin: "0 auto", padding: "clamp(46px,6vw,80px) 22px 0" }}>
            {/* Header */}
            <m.div
              variants={header}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.6 }}
              style={{ textAlign: "center", maxWidth: 620, margin: "0 auto 30px" }}
            >
              <m.span variants={fadeUp} style={{ display: "inline-block", fontWeight: 700, fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase", color: "#B8860B" }}>
                Routes
              </m.span>
              <m.h2 variants={fadeUp} style={{ fontWeight: 800, fontSize: "clamp(26px,3.4vw,42px)", lineHeight: 1.12, margin: "8px 0 6px", letterSpacing: "-.02em" }}>
                Popular Routes
              </m.h2>
              <m.p variants={fadeUp} style={{ fontSize: 15.5, color: "#666", fontWeight: 400, margin: 0 }}>
                Explore some of the routes travellers book most often.
              </m.p>

              {/* Trip-type filter — black gradient pill glides to the active chip */}
              {showFilters && (
                <m.div
                  variants={fadeUp}
                  role="tablist"
                  aria-label="Filter routes by trip type"
                  className="mx-auto mt-6 inline-flex max-w-full gap-1 overflow-x-auto rounded-full border border-[#ECE9E2] p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  style={{ background: LIGHT }}
                >
                  {["All", ...badges].map((b) => {
                    const active = filter === b;
                    const count = b === "All" ? routes.length : routes.filter((r) => r.badge === b).length;
                    return (
                      <m.button
                        key={b}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => setFilter(b)}
                        whileTap={{ scale: 0.96 }}
                        className={`relative isolate inline-flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-[13.5px] font-semibold outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-[#FFC107] ${
                          active ? "text-white" : "text-[#3D3A33] hover:text-[#141414]"
                        }`}
                      >
                        {active && (
                          <m.span
                            aria-hidden
                            layoutId="routes-filter-pill"
                            transition={{ type: "spring", stiffness: 450, damping: 36 }}
                            className="absolute inset-0 -z-10 rounded-full"
                            style={{ background: DARK, boxShadow: "0 8px 18px -8px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.14)" }}
                          />
                        )}
                        {b}
                        <span
                          className={`rounded-full px-1.5 py-px text-[11px] font-bold tabular-nums transition-colors duration-200 ${
                            active ? "bg-[#FFC107] text-[#141414]" : "bg-[#ECE9E2] text-[#77736A]"
                          }`}
                        >
                          {count}
                        </span>
                      </m.button>
                    );
                  })}
                </m.div>
              )}
            </m.div>

            {/* Cards — fixed column widths (1 / 2 / 3 / 4 per row by breakpoint),
                so a filtered view keeps the same card size as "All" instead of
                stretching 2 cards across the whole row. Partial rows stay left-aligned. */}
            <m.div
              variants={grid}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.15 }}
              className="relative flex flex-wrap justify-start gap-5"
            >
              <AnimatePresence mode="popLayout">
                {visible.map((r) => {
                  const badge = BADGE_COLORS[r.badge] || BADGE_COLORS.Intercity;
                  return (
                    <m.div
                      key={`${r.from}-${r.to}`}
                      layout
                      variants={cardWrap}
                      exit="exit"
                      transition={{ layout: { type: "spring", stiffness: 380, damping: 34 } }}
                      // grid wrapper → the card fills the cell, so every card in a row is the same height
                      className="grid w-full flex-none sm:w-[calc((100%_-_20px)/2)] lg:w-[calc((100%_-_40px)/3)] xl:w-[calc((100%_-_60px)/4)]"
                    >
                      {/* ── Card: unchanged ── */}
                      <div style={{ borderRadius: 20, overflow: "hidden", border: "1px solid #EFEFEF", background: "#fff" }} className="hover:-translate-y-1.5 transition-transform">
                        <div style={{ position: "relative", height: 172, overflow: "hidden" }}>
                          <img src={r.img} alt={`${r.from} to ${r.to}`} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }} />
                          <span style={{ position: "absolute", top: 12, left: 12, padding: "5px 11px", borderRadius: 9999, background: badge.bg, color: badge.fg, fontWeight: 600, fontSize: 11, zIndex: 2 }}>
                            {r.badge}
                          </span>
                        </div>
                        <div style={{ padding: "18px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                          <div style={{ fontWeight: 700, fontSize: 16 }}>{r.from} → {r.to}</div>
                          <button
                            onClick={() => onBook(r)}
                            className="hover:!bg-black"
                            style={{ flex: "none", padding: "9px 15px", borderRadius: 9999, background: "#111", color: "#fff", fontWeight: 600, fontSize: 12.5, border: "none", cursor: "pointer" }}
                          >
                            Book Route
                          </button>
                        </div>
                      </div>
                    </m.div>
                  );
                })}
              </AnimatePresence>
            </m.div>
          </section>
        </LayoutGroup>
      </MotionConfig>
    </LazyMotion>
  );
}