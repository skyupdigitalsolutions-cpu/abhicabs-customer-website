import React from "react";
import Button from "./ui/Button";
import { fmtINR } from "../data/mockData";
import { IconSeat, IconAC, IconLuggage } from "./Icons";

const catColors = {
  sedan:  "bg-blue-50 text-blue-700",
  suv:    "bg-green-50 text-green-700",
  luxury: "bg-purple-50 text-purple-700",
  tempo:  "bg-orange-50 text-orange-700",
  bus:    "bg-red-50 text-red-700",
};

export default function VehicleCard({ vehicle: v, ctaHref = "/#booking", ctaLabel = "Book Now" }) {
  return (
    <div className="bg-white border border-border rounded-2xl overflow-hidden flex flex-col group hover:shadow-lifted transition-shadow">
      {/* Image */}
      <div className="relative aspect-[16/9] overflow-hidden">
        <img
          src={v.img}
          alt={v.name}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <span className={`absolute top-2.5 left-2.5 text-[11px] font-bold px-2.5 py-1 rounded-full capitalize ${catColors[v.category] || "bg-gray-100 text-gray-600"}`}>
          {v.category}
        </span>
        {!v.ac && (
          <span className="absolute top-2.5 right-2.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-gray-800 text-white">Non A/C</span>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <h3 className="font-bold text-[15px] leading-tight">{v.name}</h3>
        <div className="flex gap-3 text-[12.5px] text-text-secondary flex-wrap">
          <span className="flex items-center gap-1"><IconSeat className="w-3.5 h-3.5" /> {v.seats} Seats</span>
          <span className="flex items-center gap-1"><IconAC className="w-3.5 h-3.5" /> {v.ac ? "A/C" : "Non-A/C"}</span>
          <span className="flex items-center gap-1"><IconLuggage className="w-3.5 h-3.5" /> {v.bags} Bags</span>
        </div>
        <p className="text-[12.5px] text-text-secondary flex-1">{v.tagline}</p>

        {/* Rate pills */}
        <div className="grid grid-cols-2 gap-1.5">
          <div className="bg-primary-tint rounded-[8px] px-2.5 py-1.5 text-center border border-primary/20">
            <div className="text-[10px] text-text-secondary font-semibold">Local/8hr</div>
            <div className="text-[14px] font-black text-brand-black">{fmtINR(v.local.base8hr80km)}</div>
          </div>
          <div className="bg-brand-black/5 rounded-[8px] px-2.5 py-1.5 text-center">
            <div className="text-[10px] text-text-secondary font-semibold">Outstation</div>
            <div className="text-[14px] font-black text-brand-black">{fmtINR(v.outstation.perKm)}<span className="text-[10px] font-normal">/km</span></div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-1">
          <a href="/fleet" className="flex-1 border-2 border-brand-black text-brand-black text-[13px] font-black py-2 rounded-[10px] hover:bg-primary hover:border-primary transition-colors text-center">
            View Details
          </a>
          <Button href={ctaHref} size="sm" className="flex-1 text-[13px]">{ctaLabel}</Button>
        </div>
      </div>
    </div>
  );
}
