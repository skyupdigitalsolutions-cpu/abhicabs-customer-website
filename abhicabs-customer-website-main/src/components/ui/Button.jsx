import React from "react";

// ABHI CABS brand: Primary = Yellow (#FFC107) with Black text
// Per brand guidelines: black gives strength, yellow gives energy & visibility
//
// STANDARDISED SIZING — every button across the site uses one of these three
// sizes so heights, padding and font-size stay perfectly consistent.
//   sm  → 40px tall — compact actions (chips, inline actions)
//   md  → 48px tall — the DEFAULT for almost every button
//   lg  → 56px tall — primary page CTAs (Search, Confirm, Pay)

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-full font-bold whitespace-nowrap leading-none " +
  "transition-all active:scale-[.97] focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100";

// Fixed heights guarantee identical vertical size regardless of content.
const SIZES = {
  sm: "h-10 px-5 text-[14px]",      // 40px
  md: "h-12 px-7 text-[15px]",      // 48px  ← default
  lg: "h-14 px-8 text-[16px]",      // 56px
};

const VARIANTS = {
  primary: "bg-primary text-brand-black shadow-brand hover:bg-primary-dark",
  outline: "bg-white text-brand-black border-2 border-brand-black hover:bg-primary hover:border-primary hover:text-brand-black",
  outlineInverse: "bg-transparent text-white border-2 border-white/30 hover:bg-white/10 hover:border-white/50",
  ghost: "bg-transparent text-text hover:bg-black/5",
  danger: "bg-error text-white hover:opacity-90",
  dangerOutline: "bg-white text-error border-2 border-red-200 hover:bg-red-50",
  inverse: "bg-primary text-brand-black hover:bg-primary-dark font-bold",
};

export default function Button({
  as, href, variant = "primary", size = "md",
  block = false, className = "", children, ...props
}) {
  const classes = [BASE, SIZES[size], VARIANTS[variant], block ? "w-full" : "", className]
    .filter(Boolean).join(" ");

  if (href) return <a href={href} className={classes} {...props}>{children}</a>;
  const Tag = as || "button";
  return <Tag className={classes} {...props}>{children}</Tag>;
}