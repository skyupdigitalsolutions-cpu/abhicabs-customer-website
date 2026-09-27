import React from "react";
import { IconArrowRight } from "./Icons";
import Button from "./ui/Button";

// FIX (Figma redesign): badge pill (Intercity/Outstation/Long Distance),
// "Book Route" instead of "Book", price no longer shown on the card itself
// to match the new, simpler card design.
export default function RouteCard({ route, onBook }) {
  return (
    <div className="bg-white border border-border rounded-2xl overflow-hidden transition-all hover:-translate-y-1 hover:shadow-elevated">
      <div className="aspect-[4/2.7] bg-primary-tint relative overflow-hidden">
        {route.badge && (
          <span className="absolute top-2.5 left-2.5 z-10 bg-primary text-brand-black text-[10.5px] font-bold px-2.5 py-1 rounded-full">
            {route.badge}
          </span>
        )}
        {route.img ? (
          <img src={route.img} alt={`Road to ${route.to}`} loading="lazy" className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary-light to-primary text-white">
            <IconArrowRight className="w-8 h-8" />
          </div>
        )}
      </div>
      <div className="p-4 flex items-center justify-between gap-3">
        <div className="text-[14.5px] font-bold leading-tight">{route.from} → {route.to}</div>
        <Button size="sm" onClick={() => onBook(route)} className="shrink-0">Book Route</Button>
      </div>
    </div>
  );
}
