import React from "react";
import { LazyMotion, domAnimation, m, MotionConfig } from "framer-motion";

// Customer reviews — same data shape as before: { quote, name, meta, stars?, avatar? }.
const EASE_OUT = [0.22, 1, 0.36, 1];
const GOLD = "linear-gradient(180deg, #FFD54A 0%, #FFC107 55%, #F0A500 100%)";

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
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};
// Card reveals, then its stars pop in one by one.
const card = {
  hidden: { opacity: 0, y: 26 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: EASE_OUT, when: "beforeChildren", staggerChildren: 0.06 },
  },
};
const star = {
  hidden: { opacity: 0, scale: 0.4, rotate: -30 },
  show: { opacity: 1, scale: 1, rotate: 0, transition: { type: "spring", stiffness: 500, damping: 16 } },
};

function initials(name = "") {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function Stars({ count = 5 }) {
  const filled = Math.max(0, Math.min(5, Math.round(count)));
  return (
    <div className="flex items-center gap-1" role="img" aria-label={`${filled} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <m.svg key={i} variants={star} width="17" height="17" viewBox="0 0 24 24" aria-hidden>
          <path
            d="M12 2.8l2.8 5.7 6.3.9-4.55 4.43 1.07 6.27L12 17.13l-5.62 2.97 1.07-6.27L2.9 9.4l6.3-.9L12 2.8z"
            fill={i < filled ? "#FFC107" : "#ECE9E2"}
          />
        </m.svg>
      ))}
    </div>
  );
}

export default function ReviewsSection({ reviews }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <section style={{ maxWidth: 1280, margin: "0 auto", padding: "clamp(46px,6vw,80px) 22px 0" }}>
          <m.div
            variants={header}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.6 }}
            style={{ textAlign: "center", maxWidth: 620, margin: "0 auto 38px" }}
          >
            <m.span variants={fadeUp} style={{ display: "inline-block", fontWeight: 700, fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase", color: "#B8860B" }}>
              Reviews
            </m.span>
            <m.h2 variants={fadeUp} style={{ fontWeight: 800, fontSize: "clamp(26px,3.4vw,42px)", lineHeight: 1.12, margin: "8px 0 0", letterSpacing: "-.02em" }}>
              What Our Customers Say
            </m.h2>
          </m.div>

          <m.div
            variants={grid}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.15 }}
            className="grid gap-[22px]"
            style={{ gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,280px),1fr))" }}
          >
            {reviews.map((r, i) => (
              <m.figure
                key={r.name ? `${r.name}-${i}` : i}
                variants={card}
                whileHover={{ y: -4 }}
                transition={{ type: "spring", stiffness: 380, damping: 26 }}
                className="group relative isolate m-0 flex flex-col gap-5 overflow-hidden rounded-[20px] border border-[#ECE9E2] bg-[linear-gradient(180deg,#FFFFFF_0%,#FCFBF8_100%)] p-7 shadow-[0_1px_2px_rgba(20,20,20,0.04)] transition-[border-color,box-shadow] duration-300 hover:border-[#F0D27A] hover:shadow-[0_22px_44px_-24px_rgba(240,165,0,0.45)]"
              >
                {/* Large quote mark, top-right */}
                <svg
                  aria-hidden
                  width="64" height="64" viewBox="0 0 24 24"
                  className="pointer-events-none absolute -right-1 -top-1 -z-10 text-[#FFC107] opacity-[0.14] transition-opacity duration-300 group-hover:opacity-25"
                >
                  <path
                    fill="currentColor"
                    d="M9.6 6C6.5 7.3 4.5 10 4.5 13.4V18h6v-6H7.6c.2-2 1.4-3.5 3.3-4.3L9.6 6zm9 0c-3.1 1.3-5.1 4-5.1 7.4V18h6v-6h-2.9c.2-2 1.4-3.5 3.3-4.3L18.6 6z"
                  />
                </svg>

                <Stars count={r.stars || 5} />

                <blockquote className="m-0 flex-1 text-[14.5px] leading-[1.7] text-[#2B2925]">
                  “{r.quote}”
                </blockquote>

                <figcaption className="flex items-center gap-3 border-t border-[#EFECE6] pt-4">
                  {r.avatar ? (
                    <img
                      src={r.avatar}
                      alt=""
                      className="h-11 w-11 flex-none rounded-full object-cover ring-2 ring-white shadow-[0_0_0_1px_#ECE9E2]"
                    />
                  ) : (
                    <span
                      aria-hidden
                      className="grid h-11 w-11 flex-none place-items-center rounded-full text-[14px] font-bold text-[#141414]"
                      style={{ background: GOLD, boxShadow: "inset 0 1px 0 rgba(255,255,255,.55)" }}
                    >
                      {initials(r.name)}
                    </span>
                  )}
                  <div className="min-w-0">
                    <div className="truncate text-[14px] font-bold text-[#141414]">{r.name}</div>
                    {r.meta && <div className="truncate text-[12.5px] font-medium text-[#8A857B]">{r.meta}</div>}
                  </div>
                </figcaption>
              </m.figure>
            ))}
          </m.div>
        </section>
      </MotionConfig>
    </LazyMotion>
  );
}