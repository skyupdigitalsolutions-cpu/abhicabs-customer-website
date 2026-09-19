import React from "react";

// ABHI CABS brand: Primary = Yellow (#FFC107) with Black text
// Per brand guidelines: black gives strength, yellow gives energy & visibility

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-full font-bold whitespace-nowrap " +
  "transition-all active:scale-[.97] focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100";

const SIZES = {
  md: "px-6 py-3 text-[15px]",
  lg: "px-7 py-4 text-base",
  sm: "px-4 py-2 text-[13.5px]"
};

const VARIANTS = {
  // Brand primary: Yellow bg + Black text (brand guidelines)
  primary: "bg-primary text-brand-black shadow-brand hover:bg-primary-dark",
  // Outline: Black border + Black text, yellow hover — for LIGHT backgrounds only.
  outline: "bg-white text-brand-black border-2 border-brand-black hover:bg-primary hover:border-primary hover:text-brand-black",
  // Outline for DARK backgrounds (e.g. sections on bg-brand-black): white
  // text/border on a transparent fill. Previously this look was attempted
  // by passing text-white/border-white className overrides on top of the
  // "outline" variant above, but that variant already hardcodes
  // bg-white/text-brand-black/border-brand-black — Tailwind's cascade
  // resolves conflicting utility classes by their order in the generated
  // stylesheet, not by the order they appear in the class attribute, so the
  // override wasn't guaranteed to win and rendered as a white pill with
  // invisible (white-on-white) text. This variant exists so dark-background
  // outline buttons don't need to fight the light-background one at all.
  outlineInverse: "bg-transparent text-white border-2 border-white/30 hover:bg-white/10 hover:border-white/50",
  // Ghost
  ghost: "bg-transparent text-text hover:bg-black/5",
  danger: "bg-error text-white",
  dangerOutline: "bg-white text-error border border-red-200",
  // On dark/black backgrounds — yellow fill
  inverse: "bg-primary text-brand-black hover:bg-primary-dark font-bold"
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
