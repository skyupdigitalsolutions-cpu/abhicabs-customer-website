import React from "react";
import { LazyMotion, domAnimation, m, MotionConfig, useReducedMotion } from "framer-motion";

const HELPLINE_HREF = "tel:+910000000000";
const EASE_OUT = [0.22, 1, 0.36, 1];
const GOLD = "linear-gradient(180deg, #FFD54A 0%, #FFC107 55%, #F0A500 100%)";

const COLUMNS = [
  {
    title: "Quick Links",
    links: [
      ["Home", "/"],
      ["About", "/#about"],
      ["Services", "/#services"],
      ["Cities", "/#cities"],
      ["Contact", "/#contact-form"],
    ],
  },
  {
    title: "Services",
    links: [
      ["One Way", "/#booking"],
      ["Round Trip", "/#booking"],
      ["Local Rental", "/#booking"],
      ["Airport Transfer", "/#booking"],
      ["Group Transportation", "/#booking"],
    ],
  },
  {
    title: "Destinations",
    links: [
      ["Bengaluru", "/#cities"],
      ["Mysuru", "/#cities"],
      ["Mangaluru", "/#cities"],
      ["Hyderabad", "/#cities"],
      ["Warangal", "/#cities"],
      ["Nizamabad", "/#cities"],
    ],
  },
];

const CONTACTS = [
  {
    label: "Phone",
    href: HELPLINE_HREF,
    icon: <path d="M6.6 10.8a13 13 0 006.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.5.6.6 0 1 .5 1 1V20c0 .6-.4 1-1 1A17 17 0 013 4c0-.6.5-1 1-1h3.4c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.5.1.4 0 .8-.3 1L6.6 10.8z" fill="currentColor" />,
  },
  {
    label: "Email",
    href: "mailto:support@abhicabs.com",
    icon: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
        <path d="M4 7l8 6 8-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </>
    ),
  },
  {
    label: "WhatsApp",
    href: "https://wa.me/910000000000",
    external: true,
    icon: (
      <>
        <path d="M4 20l1.3-3.9A8 8 0 1112 20a8 8 0 01-3.9-1L4 20z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M9.2 8.8c.2-.5.5-.5.8-.5h.5c.2 0 .4 0 .5.4l.6 1.4c.1.2 0 .4-.1.6l-.4.5c-.1.1-.2.3 0 .5.5.9 1.3 1.6 2.2 2.1.2.1.4.1.5-.1l.5-.6c.1-.2.4-.2.6-.1l1.4.7c.2.1.3.3.3.5 0 .8-.6 1.6-1.4 1.7-.9.1-2.3-.2-3.9-1.5-1.3-1.1-2.1-2.4-2.3-3.3-.2-.9 0-1.7.2-2.2z" fill="currentColor" />
      </>
    ),
  },
];

/* ── Motion ──────────────────────────────────────────────────────────── */
const grid = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};
const col = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_OUT, staggerChildren: 0.04, delayChildren: 0.1 } },
};
const linkIn = {
  hidden: { opacity: 0, x: -6 },
  show: { opacity: 1, x: 0, transition: { duration: 0.35, ease: EASE_OUT } },
};

function FooterLink({ href, children, external }) {
  return (
    <m.li variants={linkIn}>
      <a
        href={href}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        className="group inline-flex items-center gap-2 text-[14px] text-white/60 no-underline outline-none transition-colors duration-200 hover:text-[#FFC107] focus-visible:text-[#FFC107]"
      >
        {/* Gold dash grows in on hover */}
        <span aria-hidden className="h-px w-0 bg-[#FFC107] transition-[width] duration-300 ease-out group-hover:w-3 group-focus-visible:w-3" />
        {children}
      </a>
    </m.li>
  );
}

export default function Footer() {
  const reduce = useReducedMotion();
  const toTop = () => window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });

  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <footer className="relative isolate mt-[clamp(46px,6vw,80px)] overflow-hidden bg-[#0b0b0b] pt-[clamp(52px,6vw,80px)]">
          {/* Gold seam along the top edge */}
          <m.div
            aria-hidden
            initial={{ scaleX: 0, opacity: 0 }}
            whileInView={{ scaleX: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, ease: EASE_OUT }}
            className="absolute inset-x-0 top-0 h-px"
            style={{ background: "linear-gradient(90deg, transparent 0%, rgba(255,193,7,.7) 50%, transparent 100%)" }}
          />
          {/* Faint dot texture + soft glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10"
            style={{ backgroundImage: "radial-gradient(rgba(255,255,255,.035) 1px,transparent 1px)", backgroundSize: "26px 26px" }}
          />
          <m.div
            aria-hidden
            animate={{ opacity: [0.7, 1, 0.7], scale: [1, 1.08, 1] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            className="pointer-events-none absolute -left-32 -top-40 -z-10 h-[420px] w-[420px] rounded-full"
            style={{ background: "radial-gradient(circle, rgba(255,193,7,.12), transparent 68%)" }}
          />

          <div className="mx-auto max-w-[1280px] px-[22px]">
            <m.div
              variants={grid}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.2 }}
              className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-3 lg:grid-cols-[1.5fr_repeat(4,1fr)] lg:gap-x-8"
            >
              {/* Brand */}
              <m.div variants={col} className="col-span-2 max-w-[360px] md:col-span-3 lg:col-span-1">
                <img
                  src="/images/abhi-cabs-logo-footer.png"
                  alt="Abhi Cabs"
                  className="mb-4 w-[160px] object-contain"
                  style={{ mixBlendMode: "screen" }}
                />
                <p className="m-0 text-[13.5px] font-normal leading-relaxed text-white/55">
                  Reliable chauffeur-driven transportation across Karnataka and Hyderabad. From city cabs to 49-seat coaches.
                </p>
                <m.a
                  href="/#booking"
                  initial="rest"
                  animate="rest"
                  whileHover="hover"
                  whileTap={{ scale: 0.97 }}
                  className="mt-6 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[13.5px] font-bold text-[#141414] no-underline"
                  style={{ background: GOLD, boxShadow: "0 12px 26px -12px rgba(255,193,7,.6), inset 0 1px 0 rgba(255,255,255,.55)" }}
                >
                  Book a Ride
                  <m.svg
                    variants={{ rest: { x: 0 }, hover: { x: 3 } }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden
                  >
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </m.svg>
                </m.a>
              </m.div>

              {/* Link columns */}
              {COLUMNS.map((c) => (
                <m.nav key={c.title} variants={col} aria-label={c.title}>
                  <h4 className="m-0 mb-5 text-[12.5px] font-bold uppercase tracking-[.08em] text-white">
                    {c.title}
                    <span aria-hidden className="mt-2 block h-[2px] w-5 rounded-full" style={{ background: GOLD }} />
                  </h4>
                  <ul className="m-0 flex list-none flex-col gap-3.5 p-0">
                    {c.links.map(([label, href]) => (
                      <FooterLink key={label} href={href}>{label}</FooterLink>
                    ))}
                  </ul>
                </m.nav>
              ))}

              {/* Contact */}
              <m.div variants={col}>
                <h4 className="m-0 mb-5 text-[12.5px] font-bold uppercase tracking-[.08em] text-white">
                  Contact
                  <span aria-hidden className="mt-2 block h-[2px] w-5 rounded-full" style={{ background: GOLD }} />
                </h4>
                <ul className="m-0 flex list-none flex-col gap-3 p-0">
                  {CONTACTS.map((c) => (
                    <m.li key={c.label} variants={linkIn}>
                      <a
                        href={c.href}
                        {...(c.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                        className="group inline-flex items-center gap-3 text-[14px] text-white/60 no-underline outline-none transition-colors duration-200 hover:text-white focus-visible:text-white"
                      >
                        <span className="grid h-8 w-8 flex-none place-items-center rounded-[10px] border border-white/10 bg-white/[0.04] text-[#FFC107] transition-colors duration-200 group-hover:border-[#FFC107] group-hover:bg-[#FFC107] group-hover:text-[#141414] group-focus-visible:border-[#FFC107]">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>{c.icon}</svg>
                        </span>
                        {c.label}
                      </a>
                    </m.li>
                  ))}
                  <m.li variants={linkIn} className="pt-1">
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[12.5px] font-semibold text-white/75">
                      <span className="relative grid h-2 w-2 place-items-center">
                        <m.span
                          aria-hidden
                          animate={{ scale: [1, 2.3], opacity: [0.6, 0] }}
                          transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
                          className="absolute inset-0 rounded-full bg-[#22C55E]"
                        />
                        <span className="relative h-2 w-2 rounded-full bg-[#22C55E]" />
                      </span>
                      24×7 Support
                    </span>
                  </m.li>
                </ul>
              </m.div>
            </m.div>

            {/* Bottom bar */}
            <m.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 py-6"
            >
              <span className="text-[13px] text-white/45">© 2026 Abhi Cabs. All Rights Reserved.</span>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                {[["Privacy Policy", "/privacy"], ["Terms", "/terms"], ["Cancellation Policy", "/cancellation"]].map(([l, h]) => (
                  <a key={l} href={h} className="text-[13px] text-white/45 no-underline transition-colors duration-200 hover:text-[#FFC107]">{l}</a>
                ))}
                <m.button
                  type="button"
                  onClick={toTop}
                  aria-label="Back to top"
                  initial="rest"
                  animate="rest"
                  whileHover="hover"
                  whileTap={{ scale: 0.92 }}
                  className="ml-1 grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-white/[0.04] text-[#FFC107] transition-colors duration-200 hover:border-[#FFC107] hover:bg-[#FFC107] hover:text-[#141414]"
                >
                  <m.svg
                    variants={{ rest: { y: 0 }, hover: { y: -2 } }}
                    transition={{ type: "spring", stiffness: 400, damping: 18 }}
                    width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden
                  >
                    <path d="M12 19V5M6 11l6-6 6 6" />
                  </m.svg>
                </m.button>
              </div>
            </m.div>
          </div>
        </footer>
      </MotionConfig>
    </LazyMotion>
  );
}