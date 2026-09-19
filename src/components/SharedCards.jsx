import React from "react";
import { IconPin, IconStar } from "./Icons";
import Button from "./ui/Button";
import Card from "./ui/Card";


export function ReviewCard({ stars = 5, quote, name, meta }) {
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2);
  return (
    <Card className="p-5.5">
      <div className="flex gap-0.5 text-warning">{Array.from({length: stars}).map((_, i) => <IconStar key={i} className="w-3.5 h-3.5" />)}</div>
      <p className="mt-3 text-[14.5px] leading-relaxed">"{quote}"</p>
      <div className="mt-4 flex items-center gap-2.5">
        <div className="w-9.5 h-9.5 rounded-full bg-primary-tint text-primary flex items-center justify-center font-bold text-[14px]">{initials}</div>
        <div>
          <b className="text-[14px] block">{name}</b>
          <span className="text-[12.5px] text-text-secondary">{meta}</span>
        </div>
      </div>
    </Card>
  );
}

export function JourneyBar({ journey, showModify = true }) {
  const modeLabel = { "one-way": "One Way", "round-trip": "Round Trip", local: "Local", airport: "Airport" }[journey.tripType] || journey.tripType;
  const hasStops = Array.isArray(journey.stops) && journey.stops.length > 0;

  // Build full route array: pickup → stops → drop
  const routePoints = [
    journey.pickup || "Pickup",
    ...(journey.stops || []),
    journey.drop || "Destination"
  ];

  return (
    <Card className="p-5 flex flex-wrap items-center justify-between gap-4.5 mb-7">
      <div className="flex flex-col gap-1.5 min-w-0">
        {hasStops ? (
          <div className="flex flex-wrap items-center gap-1.5 font-bold text-[15px]">
            <IconPin className="w-4 h-4 text-primary shrink-0" />
            {routePoints.map((pt, i) => (
              <React.Fragment key={i}>
                <span className={i === 0 || i === routePoints.length - 1 ? "text-text" : "text-primary/70 text-[13px] font-semibold"}>{pt}</span>
                {i < routePoints.length - 1 && <span className="text-primary/40 text-[13px]">→</span>}
              </React.Fragment>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-3.5 font-bold text-[16px]">
            <IconPin className="w-4.5 h-4.5 text-primary" />
            {journey.pickup || "Pickup"} → {journey.drop || "Destination"}
          </div>
        )}
        {hasStops && (
          <div className="text-[12px] text-text-secondary ml-6">
            {journey.stops.length} via stop{journey.stops.length > 1 ? "s" : ""}: {journey.stops.join(" · ")}
          </div>
        )}
      </div>
      <div className="flex gap-5.5 flex-wrap">
        <MetaItem label="Trip Type" value={modeLabel} />
        <MetaItem label="Date" value={journey.date || "-"} />
        <MetaItem label="Time" value={journey.time || "-"} />
        <MetaItem label="Passengers" value={journey.passengers || "-"} />
      </div>
      {showModify && <Button href="/#booking" variant="outline" size="sm">Modify Search</Button>}
    </Card>
  );
}

function MetaItem({ label, value }) {
  return (
    <div className="text-[13px] text-text-secondary">
      {label}
      <b className="block text-[14.5px] text-text mt-0.5">{value}</b>
    </div>
  );
}

export function FareRow({ label, value, total }) {
  return (
    <div className={`flex justify-between text-[14px] py-2 ${total ? "border-t border-border mt-1.5 pt-3.5 font-extrabold text-text text-[17px]" : "text-text-secondary"}`}>
      <span>{label}</span>
      <span className={total ? "text-primary" : ""}>{value}</span>
    </div>
  );
}
