import React from "react";

/**
 * A compact toggle for fuel variants (Petrol / CNG / Diesel).
 *
 * Props:
 *   variants   — array of vehicle objects, each with `variantLabel` and `key`
 *   activeKey  — the currently selected variant's key
 *   onChange   — (variantVehicle) => void
 *   size       — "sm" (card inline) or "md" (modal)
 */
export default function FuelToggle({ variants, activeKey, onChange, size = "sm" }) {
  if (!variants || variants.length < 2) return null;

  const isSm = size === "sm";
  const pad = isSm ? "3px 9px" : "5px 14px";
  const fs = isSm ? 11 : 12.5;
  const gap = isSm ? 3 : 4;
  const radius = 9999;

  return (
    <div
      role="radiogroup"
      aria-label="Fuel type"
      style={{
        display: "inline-flex",
        gap,
        background: "#F3F2EF",
        borderRadius: radius,
        padding: isSm ? 2 : 3,
      }}
    >
      {variants.map((v) => {
        const active = v.key === activeKey;
        return (
          <button
            key={v.key}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(v)}
            style={{
              padding: pad,
              fontSize: fs,
              fontWeight: active ? 700 : 500,
              color: active ? "#111" : "#888",
              background: active ? "#fff" : "transparent",
              border: "none",
              borderRadius: radius,
              cursor: "pointer",
              transition: "all .18s",
              boxShadow: active ? "0 1px 3px rgba(0,0,0,.1)" : "none",
              lineHeight: 1.2,
            }}
          >
            {v.variantLabel || v.fuel || v.key}
          </button>
        );
      })}
    </div>
  );
}
