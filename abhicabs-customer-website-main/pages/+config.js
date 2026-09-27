import vikeReact from "vike-react/config";
import Layout from "../src/components/Layout";

export default {
  extends: [vikeReact],
  // This is a front-end demo whose "API" is a Redux store persisted to
  // localStorage (see src/store). That only exists in the browser, so the
  // whole app runs client-side rendered — swap this on once a real backend
  // is wired up.
  ssr: false,
  title: "ABHI CABS — Your Journey, Our Responsibility",
  Layout,
  // Real brand favicon (the "A" road-and-pin mark). Uses the pre-rasterized
  // .ico rather than the raw .svg — the source logo is a highly detailed
  // illustrated mark (hundreds of small shading paths), and browsers
  // rendering that SVG live at actual favicon size (16-32px) were dropping
  // most of the detail, including the black "A" frame itself, leaving only
  // a thin yellow squiggle visible. Rasterizing at high resolution first
  // and downscaling with proper image resampling (done once, ahead of
  // time, in public/favicon.ico) avoids that entirely. See pages/+Head.jsx
  // for the additional apple-touch-icon and larger PNG sizes this basic
  // config option doesn't cover.
  favicon: "/favicon.ico",
  // Tailwind utility classes applied straight to <html>/<body> via Vike's
  // own config, instead of a hand-written `html { scroll-behavior: smooth }`
  // / `body { @apply ... }` rule in global.css.
  htmlAttributes: { lang: "en", class: "scroll-smooth" },
  bodyAttributes: { class: "font-sans bg-bg text-text antialiased" }
};
