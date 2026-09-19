import React from "react";

// Extra icon links beyond the basic `favicon` option in +config.js (which
// only covers a single <link rel="icon">). All generated from the real
// uploaded logo's icon mark (the "A" road-and-pin), rasterized at high
// resolution and downscaled with proper image resampling — NOT the raw
// .svg, which browsers rasterize live at tiny display sizes and were
// dropping most of this icon's fine detail (see public/favicon.ico's
// generation note in pages/+config.js for why).
export default function HeadDefault() {
  return (
    <>
      <link rel="icon" type="image/x-icon" href="/favicon.ico" />
      <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
      <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />
      <meta name="theme-color" content="#FFC107" />
    </>
  );
}
