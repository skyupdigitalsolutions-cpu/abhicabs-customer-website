import React, { useId, useState } from "react";
import { LazyMotion, domAnimation, m, MotionConfig, AnimatePresence } from "framer-motion";

// FAQ accordion — same props as before, plus an optional `contactHref`
// (defaults to the Contact section that sits directly above; pass null to hide).
const EASE_OUT = [0.22, 1, 0.36, 1];
const GOLD = "linear-gradient(180deg, #FFD54A 0%, #FFC107 55%, #F0A500 100%)";

const header = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_OUT } },
};
const list = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } } };
const itemIn = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT } },
};

export default function FAQSection({ faqs, defaultOpenIndex = 0, contactHref = "#contact-form" }) {
  const [openIdx, setOpenIdx] = useState(defaultOpenIndex);
  const baseId = useId();

  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <section style={{ maxWidth: 820, margin: "0 auto", padding: "clamp(46px,6vw,80px) 22px 0" }}>
          <m.div
            variants={header}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.6 }}
            style={{ textAlign: "center", margin: "0 auto 38px" }}
          >
            <m.span variants={fadeUp} style={{ display: "inline-block", fontWeight: 700, fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase", color: "#B8860B" }}>FAQ</m.span>
            <m.h2 variants={fadeUp} style={{ fontWeight: 800, fontSize: "clamp(26px,3.4vw,42px)", lineHeight: 1.12, margin: "8px 0 0", letterSpacing: "-.02em" }}>Frequently Asked Questions</m.h2>
          </m.div>

          <m.div
            variants={list}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.15 }}
            className="flex flex-col gap-3"
          >
            {faqs.map((f, i) => (
              <FAQItem
                key={f.q}
                q={f.q}
                a={f.a}
                open={openIdx === i}
                onToggle={() => setOpenIdx(openIdx === i ? -1 : i)}
                id={`${baseId}-${i}`}
              />
            ))}
          </m.div>

          {contactHref && (
            <m.div
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.8 }}
              transition={{ duration: 0.55, ease: EASE_OUT }}
              className="mt-8 flex flex-col items-center justify-between gap-4 rounded-2xl border border-[#ECE9E2] bg-[linear-gradient(160deg,#FFFFFF_0%,#FFFBEE_100%)] px-6 py-5 text-center sm:flex-row sm:text-left"
            >
              <div>
                <div className="text-[15px] font-bold text-[#141414]">Still have questions?</div>
                <div className="mt-0.5 text-[13.5px] text-[#77736A]">Our team is happy to help with anything not covered here.</div>
              </div>
              <m.a
                href={contactHref}
                initial="rest"
                animate="rest"
                whileHover="hover"
                whileTap={{ scale: 0.97 }}
                className="inline-flex flex-none items-center gap-2 rounded-full px-5 py-2.5 text-[14px] font-bold text-[#141414] no-underline"
                style={{ background: GOLD, boxShadow: "0 10px 22px -12px rgba(240,165,0,.8), inset 0 1px 0 rgba(255,255,255,.55)" }}
              >
                Contact us
                <m.svg
                  variants={{ rest: { x: 0 }, hover: { x: 3 } }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden
                >
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </m.svg>
              </m.a>
            </m.div>
          )}
        </section>
      </MotionConfig>
    </LazyMotion>
  );
}

function FAQItem({ q, a, open, onToggle, id }) {
  const btnId = `${id}-q`;
  const panelId = `${id}-a`;

  return (
    <m.div
      variants={itemIn}
      className={`relative overflow-hidden rounded-2xl border transition-[border-color,box-shadow,background-color] duration-300 ${
        open
          ? "border-[#F0D27A] bg-[linear-gradient(180deg,#FFFFFF_0%,#FFFBEE_100%)] shadow-[0_18px_36px_-24px_rgba(240,165,0,0.55)]"
          : "border-[#ECE9E2] bg-white hover:border-[#E0D9C8]"
      }`}
    >
      {/* Gold accent bar on the open item */}
      <m.span
        aria-hidden
        initial={false}
        animate={{ scaleY: open ? 1 : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.3, ease: EASE_OUT }}
        className="absolute bottom-3 left-0 top-3 w-[3px] origin-top rounded-r-full"
        style={{ background: GOLD }}
      />

      <h3 className="m-0">
        <button
          id={btnId}
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={panelId}
          className="group flex w-full cursor-pointer items-center justify-between gap-4 border-0 bg-transparent px-[22px] py-[18px] text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#FFC107]"
        >
          <span className={`text-[15px] leading-snug text-[#141414] transition-[font-weight] ${open ? "font-bold" : "font-semibold"}`}>
            {q}
          </span>

          {/* Plus → minus: the vertical bar collapses when open */}
          <span
            className={`relative grid h-8 w-8 flex-none place-items-center rounded-[10px] border transition-colors duration-300 ${
              open
                ? "border-transparent text-[#141414]"
                : "border-[#ECE9E2] bg-[#F8F7F3] text-[#3D3A33] group-hover:border-[#F0D27A] group-hover:bg-[#FFFBEA]"
            }`}
          >
            <m.span
              aria-hidden
              initial={false}
              animate={{ opacity: open ? 1 : 0 }}
              transition={{ duration: 0.25 }}
              className="absolute inset-0 rounded-[10px]"
              style={{ background: GOLD, boxShadow: "inset 0 1px 0 rgba(255,255,255,.55)" }}
            />
            <m.svg
              aria-hidden
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"
              initial={false}
              animate={{ rotate: open ? 180 : 0 }}
              transition={{ duration: 0.35, ease: EASE_OUT }}
              className="relative"
            >
              <path d="M5 12h14" />
              <m.path
                d="M12 5v14"
                initial={false}
                animate={{ scaleY: open ? 0 : 1 }}
                transition={{ duration: 0.3, ease: EASE_OUT }}
                style={{ transformOrigin: "center", transformBox: "fill-box" }}
              />
            </m.svg>
          </span>
        </button>
      </h3>

      <AnimatePresence initial={false}>
        {open && (
          <m.div
            key="panel"
            id={panelId}
            role="region"
            aria-labelledby={btnId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1, transition: { height: { duration: 0.35, ease: EASE_OUT }, opacity: { duration: 0.25, delay: 0.08 } } }}
            exit={{ height: 0, opacity: 0, transition: { height: { duration: 0.28, ease: EASE_OUT }, opacity: { duration: 0.15 } } }}
            style={{ overflow: "hidden" }}
          >
            <m.p
              initial={{ y: -6 }}
              animate={{ y: 0 }}
              exit={{ y: -6 }}
              transition={{ duration: 0.3, ease: EASE_OUT }}
              className="m-0 px-[22px] pb-5 text-[14px] leading-[1.7] text-[#6B675F]"
            >
              {a}
            </m.p>
          </m.div>
        )}
      </AnimatePresence>
    </m.div>
  );
}