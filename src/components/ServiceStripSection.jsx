import React, { useEffect, useId, useState } from "react";
import { LazyMotion, domMax, m, MotionConfig, LayoutGroup } from "framer-motion";

// Quick-select service cards under the booking widget.
// All five cards share one style. The selected card is filled with the
// brand yellow gradient, and that fill glides to whichever card you pick.

const EASE_OUT = [0.22, 1, 0.36, 1];
const GOLD = "linear-gradient(180deg, #FFD54A 0%, #FFC107 55%, #F0A500 100%)";

const ITEMS = [
  {
    mode: "one-way",
    label: "One Way",
    description: "Point-to-point trips",
    icon: <path d="M5 12h14M13 6l6 6-6 6" />,
  },
  {
    mode: "round-trip",
    label: "Round Trip",
    description: "Go and come back",
    icon: <path d="M17 4l3 3-3 3M20 7H8a4 4 0 00-4 4M7 20l-3-3 3-3M4 17h12a4 4 0 004-4" />,
  },
  {
    mode: "local",
    label: "Local Rental",
    description: "4, 8 or 12 hour packages",
    icon: <path d="M4 20V9l7-4 7 4v11M9 20v-5h4v5" />,
  },
  {
    mode: "airport",
    label: "Airport Transfer",
    description: "Drops and pickups",
    icon: (
      <path d="M10 3.6c.5-1 1.9-.9 2.2.2l1.3 4.9 6 1.8c.9.3.9 1.6 0 1.9l-6 1.8-1.3 4.9c-.3 1.1-1.7 1.2-2.2.2l-2.2-4.4-4.4-1.5c-1-.3-1-1.7 0-2l4.4-1.5L10 3.6z" />
    ),
  },
  {
    mode: "group-coach",
    label: "Group / Coach",
    description: "For groups and events",
    href: "/booking-search?type=group",
    icon: <path d="M3 17V7a2 2 0 012-2h11a2 2 0 012 2v10M3 17h17M3 17v2h3v-2M17 17v2h3v-2M6 9h9M6 12.5h9" />,
  },
];

const grid = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};
const cardReveal = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT } },
};

export default function ServiceStripSection({ onSelect, activeMode }) {
  const scope = useId();
  // Works on its own (defaults to One Way) and stays in sync with the
  // booking widget when the parent passes activeMode.
  const [selected, setSelected] = useState(activeMode || "one-way");
  useEffect(() => {
    if (activeMode) setSelected(activeMode);
  }, [activeMode]);

  function handleSelect(mode) {
    setSelected(mode);
    onSelect?.(mode);
  }

  return (
    <LazyMotion features={domMax} strict>
      <MotionConfig reducedMotion="user">
        <LayoutGroup id={scope}>
          <section
            aria-label="Choose a service"
            style={{ maxWidth: 1280, margin: "0 auto", padding: "clamp(34px,4vw,52px) 22px 0" }}
          >
            <m.div
              variants={grid}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.3 }}
              className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
            >
              {ITEMS.map((it, i) => (
                <ServiceCard
                  key={it.mode}
                  item={it}
                  active={selected === it.mode}
                  onSelect={handleSelect}
                  // 5 cards in a 2-col grid: the last one spans the row on mobile
                  className={i === ITEMS.length - 1 ? "col-span-2 sm:col-span-1" : ""}
                />
              ))}
            </m.div>
          </section>
        </LayoutGroup>
      </MotionConfig>
    </LazyMotion>
  );
}

function ServiceCard({ item, active, onSelect, className = "" }) {
  const Tag = item.href ? m.a : m.button;
  const tagProps = item.href
    ? { href: item.href, onClick: () => onSelect(item.mode), "aria-current": active ? "true" : undefined }
    : { type: "button", onClick: () => onSelect(item.mode), "aria-pressed": active };

  return (
    <m.div variants={cardReveal} className={`min-w-0 ${className}`}>
      <Tag
        {...tagProps}
        whileHover={active ? undefined : { y: -2 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 400, damping: 28 }}
        className={[
          "relative isolate flex h-full w-full min-w-0 items-center gap-3 rounded-2xl border px-4 py-3.5 text-left no-underline outline-none",
          "transition-[border-color,box-shadow] duration-200",
          "focus-visible:ring-2 focus-visible:ring-[#FFC107] focus-visible:ring-offset-2",
          active
            ? "border-transparent shadow-[0_14px_28px_-14px_rgba(240,165,0,0.8)]"
            : "border-[#ECE9E2] bg-white hover:border-[#F0D27A] hover:shadow-[0_10px_24px_-16px_rgba(20,20,20,0.25)]",
        ].join(" ")}
      >
        {/* Selected fill — shared layout element, glides between cards */}
        {active && (
          <m.span
            aria-hidden
            layoutId="service-active"
            transition={{ type: "spring", stiffness: 420, damping: 36 }}
            className="absolute inset-0 -z-10 rounded-2xl"
            style={{ background: GOLD, boxShadow: "inset 0 1px 0 rgba(255,255,255,.55)" }}
          />
        )}

        <span
          className={[
            "grid h-11 w-11 flex-none place-items-center rounded-xl transition-colors duration-200",
            active ? "bg-white/70 text-[#141414]" : "bg-[#FFF7DE] text-[#141414]",
          ].join(" ")}
        >
          <svg
            width="21" height="21" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"
            aria-hidden
          >
            {item.icon}
          </svg>
        </span>

        {/* No truncation — long labels wrap onto a second line instead of "Airport Tran…" */}
        <span className="min-w-0 flex-1">
          <span className="block text-[14.5px] font-bold leading-snug text-[#141414]">
            {item.label}
          </span>
          <span
            className={`mt-0.5 block text-[12.5px] leading-snug transition-colors duration-200 ${
              active ? "font-semibold text-[#5C4300]" : "font-medium text-[#8A857B]"
            }`}
          >
            {item.description}
          </span>
        </span>
      </Tag>
    </m.div>
  );
}