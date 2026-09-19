import React, { useState } from "react";
import SectionHead from "./ui/SectionHead";
import VehicleCard from "./VehicleCard";
import { IconCar, IconStar, IconTruck, IconBus, IconArrowRight } from "./Icons";

const ICONS = { all: IconCar, sedan: IconCar, suv: IconCar, luxury: IconStar, tempo: IconTruck, bus: IconBus };

// Reusable "Choose Your Ride" fleet section (category tabs + filtered
// vehicle grid) — extracted from the homepage's inline FleetSection() so it
// can be reused with a different tab/vehicle set elsewhere.
//
// Container per Figma dev-mode spec: Width Fixed 1280px, padding top 80px,
// left/right 22px, gap 6px between the heading block and the fleet listing
// block (was max-w-[1264px] py-14/22 px-6 mb-8 on the heading — corrected
// here; note the 6px top-level gap is notably tighter than this section
// looked before, worth a visual check once live).
//
// Props:
// - vehicles: VehicleCard[] — required, the full vehicle list to filter.
// - tabs: [{ id, label, icon }] — required, icon is one of
//   "all" | "sedan" | "suv" | "luxury" | "tempo" | "bus".
// - categoryField: which field on each vehicle holds its category id,
//   matched against a tab's id (default "category"); "all" tab id always
//   shows every vehicle regardless of this field.
// - onStartBooking: href for the "Start Your Booking" CTA under the grid.
// - onViewAll: () => void — called when "View All Vehicles" is pressed.
// - eyebrow / title / description: optional copy overrides.
// - id: anchor id for the section (default "fleet").
// - className: optional extra classes on the outer <section>.
export default function FleetChooseRideSection({
  vehicles,
  tabs,
  categoryField = "category",
  onStartBooking = "#booking",
  onViewAll,
  eyebrow = "Our Fleet",
  title = "Choose Your Ride",
  description = "From everyday city travel to large group journeys, choose the vehicle that fits your trip.",
  id = "fleet",
  className = "",
}) {
  const [active, setActive] = useState(tabs[0]?.id ?? "all");
  const filtered = active === "all" ? vehicles : vehicles.filter((v) => v[categoryField] === active);

  return (
    <section id={id} className={`bg-white ${className}`}>
      <div className="max-w-[1280px] mx-auto px-[22px] pt-20 pb-14 md:pb-22 flex flex-col gap-[6px]">
        <SectionHead eyebrow={eyebrow} title={title} description={description} />

        <div>
          {/* Category Tabs */}
          <div className="flex gap-2 flex-wrap justify-center mb-8">
            {tabs.map((t) => {
              const Icon = ICONS[t.icon] || IconCar;
              return (
                <button
                  key={t.id}
                  onClick={() => setActive(t.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[13.5px] font-semibold border transition-all ${
                    active === t.id
                      ? "bg-brand-black text-primary border-brand-black shadow-brand"
                      : "bg-white text-text-secondary border-border hover:border-brand-black hover:text-brand-black"
                  }`}
                >
                  <span className="inline-flex">
                    <Icon className="w-3.5 h-3.5" />
                  </span>{" "}
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Vehicle grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5.5">
            {filtered.map((v) => (
              <VehicleCard key={v.id} vehicle={v} />
            ))}
          </div>

          {/* View Fleet CTA — stays on this page (per explicit instruction:
              no navigating away for these homepage content buttons) instead
              of linking to a separate fleet page. */}
          <div className="text-center mt-10">
            <a
              href={onStartBooking}
              className="inline-flex items-center gap-2 bg-brand-black text-primary font-black px-6 py-3 rounded-full hover:bg-primary hover:text-brand-black transition-all"
            >
              Start Your Booking <IconArrowRight className="w-4 h-4" />
            </a>
          </div>

          <div className="text-right mt-4">
            <button onClick={onViewAll} className="text-primary font-semibold text-[14px] inline-flex items-center gap-1.5">
              View All Vehicles <IconArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
