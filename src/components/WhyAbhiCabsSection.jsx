import React, { useRef } from "react";
import { LazyMotion, domAnimation, m, MotionConfig, useScroll, useTransform, useReducedMotion } from "framer-motion";

// "WHY CHOOSE US" — photo on one side, reasons on the other.
// One orchestrated moment: the photo unmasks, then the reasons draw in.

const EASE_OUT = [0.22, 1, 0.36, 1];
const GOLD = "linear-gradient(180deg, #FFD54A 0%, #FFC107 55%, #F0A500 100%)";

const photoReveal = {
  hidden: { clipPath: "inset(10% 10% 10% 10% round 24px)", opacity: 0 },
  show: {
    clipPath: "inset(0% 0% 0% 0% round 24px)",
    opacity: 1,
    transition: { duration: 1.1, ease: EASE_OUT },
  },
};

const badgeReveal = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_OUT, delay: 0.7 } },
};

const copy = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.15 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_OUT } },
};

const list = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};
const reasonItem = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE_OUT } },
};
// Hairline draws left → right as each reason appears
const hairline = {
  hidden: { scaleX: 0 },
  show: { scaleX: 1, transition: { duration: 0.8, ease: EASE_OUT } },
};
const goldTick = {
  hidden: { scaleX: 0 },
  show: { scaleX: 1, transition: { duration: 0.5, ease: EASE_OUT, delay: 0.25 } },
};
const chipPop = {
  hidden: { scale: 0.6, opacity: 0 },
  show: { scale: 1, opacity: 1, transition: { type: "spring", stiffness: 420, damping: 22, delay: 0.1 } },
};

export default function WhyAbhiCabsSection({
  reasons,
  imageSrc,
  imageAlt = "Professional Indian chauffeur beside a clean premium car",
  id = "about",
}) {
  const sectionRef = useRef(null);
  const reduce = useReducedMotion();

  // Gentle parallax on the photo while the section scrolls past
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start end", "end start"] });
  const photoY = useTransform(scrollYProgress, [0, 1], reduce ? ["0%", "0%"] : ["-6%", "6%"]);

  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <section
          ref={sectionRef}
          id={id}
          style={{ maxWidth: 1280, margin: "0 auto", padding: "clamp(46px,6vw,80px) 22px 0", position: "relative" }}
        >
          <div className="flex flex-wrap items-stretch" style={{ gap: "clamp(28px,4vw,64px)" }}>
            {/* ── Photo ─────────────────────────────────────────────── */}
            <m.div
              variants={photoReveal}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.3 }}
              className="relative overflow-hidden rounded-[24px] shadow-[0_30px_60px_-30px_rgba(20,20,20,0.45)]"
              style={{ flex: "1 1 320px", minWidth: "min(100%,320px)", minHeight: 420 }}
            >
              <m.img
                src={imageSrc}
                alt={imageAlt}
                style={{
                  position: "absolute", top: "-8%", left: 0, width: "100%", height: "116%",
                  objectFit: "cover", objectPosition: "center 20%", y: photoY, willChange: "transform",
                }}
              />
              {/* Soft bottom shade so the badge reads on any photo */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5"
                style={{ background: "linear-gradient(0deg, rgba(13,13,13,.45) 0%, transparent 100%)" }}
              />

              {/* Floating badge */}
              <m.div variants={badgeReveal} className="absolute bottom-4 left-4 right-4 sm:right-auto">
                <m.div
                  animate={reduce ? undefined : { y: [0, -4, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1.4 }}
                  className="flex items-center gap-3 rounded-2xl border border-white/60 bg-white/90 px-3.5 py-3 shadow-[0_18px_36px_-18px_rgba(20,20,20,0.5)] backdrop-blur-md"
                >
                  <span
                    className="grid h-10 w-10 flex-none place-items-center rounded-xl text-[#141414]"
                    style={{ background: GOLD, boxShadow: "inset 0 1px 0 rgba(255,255,255,.55)" }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6l7-3z" />
                      <path d="M9 12l2 2 4-4" />
                    </svg>
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[14px] font-bold leading-tight text-[#141414]">Verified Drivers</span>
                    <span className="block text-[12.5px] font-medium leading-snug text-[#77736A]">24×7 support on every trip</span>
                  </span>
                </m.div>
              </m.div>
            </m.div>

            {/* ── Copy ──────────────────────────────────────────────── */}
            <m.div
              variants={copy}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.25 }}
              className="flex flex-col justify-center"
              style={{ flex: "1 1 380px", minWidth: "min(100%,320px)" }}
            >
              <m.span
                variants={fadeUp}
                style={{ display: "inline-block", fontWeight: 700, fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase", color: "#B8860B" }}
              >
                Why Abhi Cabs
              </m.span>
              <m.h2
                variants={fadeUp}
                style={{ fontWeight: 800, fontSize: "clamp(28px,3.6vw,44px)", lineHeight: 1.1, margin: "10px 0 30px", letterSpacing: "-.02em", color: "#141414" }}
              >
                More Than Just a Ride.
              </m.h2>

              <m.ul variants={list} className="m-0 grid list-none grid-cols-1 gap-x-8 gap-y-6 p-0 sm:grid-cols-2">
                {reasons.map((w) => (
                  <m.li key={w.title} variants={reasonItem} className="relative pt-5">
                    {/* Hairline + short gold accent across the top of each reason */}
                    <m.span aria-hidden variants={hairline} className="absolute inset-x-0 top-0 h-px origin-left bg-[#ECE9E2]" />
                    <m.span
                      aria-hidden
                      variants={goldTick}
                      className="absolute left-0 top-[-0.5px] h-[2px] w-10 origin-left rounded-full"
                      style={{ background: GOLD }}
                    />

                    <div className="flex gap-3.5">
                      <m.span
                        variants={chipPop}
                        aria-hidden
                        className="grid h-10 w-10 flex-none place-items-center rounded-xl border border-[#F6E3A1] bg-[#FFF7DE] text-[#B07A00]"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12.5l4.5 4.5L19 7.5" />
                        </svg>
                      </m.span>
                      <div className="min-w-0">
                        <h3 className="m-0 mb-1 text-[15.5px] font-bold leading-snug text-[#141414]">{w.title}</h3>
                        <p className="m-0 text-[13.5px] leading-relaxed text-[#6B675F]">{w.desc}</p>
                      </div>
                    </div>
                  </m.li>
                ))}
              </m.ul>
            </m.div>
          </div>
        </section>
      </MotionConfig>
    </LazyMotion>
  );
}