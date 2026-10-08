import React from "react";
import { LazyMotion, domAnimation, m, MotionConfig } from "framer-motion";

// "Free Cancellations — up to 1 hour before your trip".
// Matches the policy stated on Cab Details and /cancellation: no fee up to
// 1 hour before pickup. Photo on the left (car stays visible), copy on the
// right over the dark panel. Stacks photo-over-text on mobile (see
// .fc-banner* in global.css).

const EASE_OUT = [0.22, 1, 0.36, 1];

const card = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.65, ease: EASE_OUT, when: "beforeChildren", staggerChildren: 0.08 } },
};
const photo = {
  hidden: { scale: 1.1 },
  show: { scale: 1, transition: { duration: 1.4, ease: EASE_OUT } },
  hover: { scale: 1.05, transition: { duration: 0.9, ease: EASE_OUT } },
};
const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT } },
  hover: { opacity: 1, y: 0 },
};

const POINTS = [
  "No cancellation fee up to 1 hour before pickup",
  "Fuel, driver & taxes included in your fare",
  "24×7 support if your plans change",
];

export default function FreeCancellationBannerSection({ bookHref = "/#booking" }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <section className="fc-section" aria-labelledby="fc-title">
          <m.div
            className="fc-banner"
            variants={card}
            initial="hidden"
            whileInView="show"
            whileHover="hover"
            viewport={{ once: true, amount: 0.3 }}
          >
            <div className="fc-photo">
              <m.img
                variants={photo}
                src="/images/mountain-road-full.jpg"
                alt="Abhi Cabs car on a hill road"
                loading="lazy"
              />
              <div className="fc-photo-fade" aria-hidden />
            </div>

            <div className="fc-content">
              <m.div variants={item} className="fc-badge-row">
                <span className="fc-shield" aria-hidden>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2.5l7.5 3v6c0 4.6-3.2 8.6-7.5 10-4.3-1.4-7.5-5.4-7.5-10v-6l7.5-3z" fill="#111" />
                    <text x="12" y="15.6" textAnchor="middle" fontSize="10.5" fontWeight="800" fill="#FFC107" fontFamily="Arial, sans-serif">₹</text>
                  </svg>
                </span>
                <span className="fc-eyebrow">Book with confidence</span>
              </m.div>

              <m.h2 variants={item} id="fc-title" className="fc-title">
                Free <span>Cancellations</span>
              </m.h2>
              <m.p variants={item} className="fc-sub">
                up to <b>1 hour</b> before your trip
              </m.p>

              <m.ul variants={item} className="fc-points">
                {POINTS.map((p) => (
                  <li key={p}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <circle cx="12" cy="12" r="10" fill="rgba(255,193,7,.18)" />
                      <path d="M7.5 12.5l3 3 6-6.5" stroke="#FFC107" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {p}
                  </li>
                ))}
              </m.ul>

              <m.div variants={item} className="fc-actions">
                <a href={bookHref} className="fc-cta">
                  Book a Cab
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
                <a href="/cancellation" className="fc-link">View cancellation policy</a>
              </m.div>
            </div>
          </m.div>
        </section>
      </MotionConfig>
    </LazyMotion>
  );
}
