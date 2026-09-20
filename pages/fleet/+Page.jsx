import React, { useState, useEffect } from "react";
import { usePageContext } from "vike-react/usePageContext";
import { VEHICLE_RATES, fmtINR } from "../../src/data/mockData";
import Button from "../../src/components/ui/Button";
import SectionHead from "../../src/components/ui/SectionHead";
import { IconSeat, IconLuggage, IconAC, IconCar, IconBus, IconTruck, IconCheck, IconClose, IconStar, IconWrench, IconId, IconGPS, IconInsurance, IconChevronRight } from "../../src/components/Icons";

const TABS = [
  { id: "all",    label: "All",          icon: "all" },
  { id: "sedan",  label: "Sedan",        icon: "sedan" },
  { id: "suv",    label: "SUV",          icon: "suv" },
  { id: "luxury", label: "Luxury",       icon: "luxury" },
  { id: "tempo",  label: "Tempo / Coach",icon: "tempo" },
  { id: "bus",    label: "Bus",          icon: "bus" },
];

const CATEGORY_INFO = {
  sedan:  { title: "Sedan",         desc: "Ideal for solo travellers and small groups up to 4. Fuel-efficient and comfortable for city and outstation rides." },
  suv:    { title: "SUV / MPV",     desc: "Spacious 7–8 seater SUVs perfect for families and groups needing extra luggage space." },
  luxury: { title: "Luxury Vehicles",desc: "Premium SUVs and coaches with top-tier comfort, captain seats, and premium amenities." },
  tempo:  { title: "Tempo / Mini Coach", desc: "9–20 seater tempos and coaches for group outings, pilgrimages, school trips, and corporate events." },
  bus:    { title: "Full-size Bus",  desc: "22–49 seater buses with large luggage bays. Perfect for large corporate groups, weddings, and tours." },
};

export default function FleetPage() {
  const ctx = usePageContext();
  const [activeTab, setActiveTab] = useState("all");
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [activeImg, setActiveImg] = useState(0);
  const [highlightSeater, setHighlightSeater] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    const seater = params.get("seater");
    const tab    = params.get("tab");

    if (seater) {
      const n = parseInt(seater, 10);
      setHighlightSeater(n);
      // Auto-switch to the right tab based on seater size
      if (n <= 8)       setActiveTab("suv");
      else if (n <= 20) setActiveTab("tempo");
      else              setActiveTab("bus");
    } else if (tab) {
      setActiveTab(tab);
    }
  }, []);

  const filtered = activeTab === "all"
    ? VEHICLE_RATES
    : VEHICLE_RATES.filter((v) => v.category === activeTab);

  function openModal(v) {
    setSelectedVehicle(v);
    setActiveImg(0);
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    setSelectedVehicle(null);
    document.body.style.overflow = "";
  }

  return (
    <>
      {/* Hero */}
      <section className="pt-11 pb-9 bg-gradient-to-b from-primary-tint to-bg border-b border-border">
        <div className="max-w-[1264px] mx-auto px-6 text-center">
          <p className="text-[12.5px] font-bold uppercase tracking-widest text-primary mb-3">Our Fleet</p>
          <h1 className="text-[32px] md:text-[48px] font-bold tracking-tight leading-tight">
            Every Vehicle.<br className="hidden sm:block" /> Every Group Size.
          </h1>
          <p className="mt-4 text-[16px] text-text-secondary max-w-[520px] mx-auto">
            From sedans to 49-seater buses — all A/C, all verified, all ready for your journey.
          </p>
          <Button href="/#booking" size="lg" className="mt-6">Book a Vehicle</Button>
        </div>
      </section>

      {/* Stats bar */}
      <div className="bg-primary text-white py-4">
        <div className="max-w-[1264px] mx-auto px-6 flex items-center justify-center gap-8 md:gap-16 flex-wrap">
          {[["17+","Vehicle Types"],["4–49","Seat Options"],["100%","Verified Drivers"],["24×7","Support"]].map(([n,l])=>(
            <div key={l} className="text-center">
              <div className="text-[22px] font-extrabold">{n}</div>
              <div className="text-[12px] text-white/70 font-semibold">{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs + Grid */}
      <section className="py-12 md:py-16">
        <div className="max-w-[1264px] mx-auto px-6">

          {/* Seater selection notice — shown when navigating from group section */}
          {highlightSeater && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, background: "#FFFBEA", border: "1.5px solid #FFC107", borderRadius: 14, padding: "14px 18px", marginBottom: 22 }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>🚌</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 700, fontSize: 14.5, margin: 0, color: "#111" }}>
                  Showing vehicles for {highlightSeater} Seater
                </p>
                <p style={{ fontSize: 13, color: "#666", margin: "3px 0 0" }}>
                  Vehicles matching your selection are marked <strong style={{ color: "#B8860B" }}>★ Your Selection</strong>.
                  <button
                    onClick={() => { setHighlightSeater(null); setActiveTab("all"); }}
                    style={{ marginLeft: 10, color: "#B8860B", fontWeight: 600, background: "none", border: "none", cursor: "pointer", fontSize: 13, textDecoration: "underline" }}
                  >
                    Clear filter
                  </button>
                </p>
              </div>
            </div>
          )}

          {/* Category tabs */}
          <div className="flex gap-2 flex-wrap justify-center mb-10">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 px-5 py-2.5 rounded-full text-[14px] font-semibold border-2 transition-all ${
                  activeTab === t.id
                    ? "bg-primary text-white border-primary shadow-brand"
                    : "bg-white text-text-secondary border-border hover:border-primary hover:text-primary"
                }`}
              >
                {t.icon === "all" && <IconCar className="w-4 h-4" />}
                {t.icon === "sedan" && <IconCar className="w-4 h-4" />}
                {t.icon === "suv" && <IconCar className="w-4 h-4" />}
                {t.icon === "luxury" && <IconStar className="w-4 h-4" />}
                {t.icon === "tempo" && <IconTruck className="w-4 h-4" />}
                {t.icon === "bus" && <IconBus className="w-4 h-4" />}
                {t.label}
              </button>
            ))}
          </div>

          {/* Category description */}
          {activeTab !== "all" && CATEGORY_INFO[activeTab] && (
            <div className="max-w-[640px] mx-auto text-center mb-8">
              <h2 className="text-[20px] font-bold">{CATEGORY_INFO[activeTab].title}</h2>
              <p className="text-text-secondary mt-1.5 text-[14.5px]">{CATEGORY_INFO[activeTab].desc}</p>
            </div>
          )}

          {/* Vehicle grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map((v) => (
              <FleetCard key={v.id} vehicle={v} onView={() => openModal(v)} highlightSeater={highlightSeater} />
            ))}
          </div>
        </div>
      </section>

      {/* Why Abhi Cabs Fleet */}
      <section className="py-12 bg-primary-tint border-y border-border">
        <div className="max-w-[1264px] mx-auto px-6">
          <SectionHead center className="mb-9" eyebrow="Fleet Standards" title="Why Our Fleet Stands Out" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              ["wrench","Maintained Every Trip","Each vehicle is inspected and cleaned before every booking."],
              ["id","Verified Drivers","KYC-verified, trained, and rated drivers for every ride."],
              ["gps","GPS Tracked","Live GPS on every vehicle — you know where your cab is, always."],
              ["insurance","Insured Fleet","All vehicles carry valid insurance, fitness certificate, and PUC."],
            ].map(([icon,title,desc])=>(
              <div key={title} className="bg-white rounded-2xl p-5 border border-border">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                {icon === "wrench" && <IconWrench className="w-5 h-5 text-primary" />}
                {icon === "id" && <IconId className="w-5 h-5 text-primary" />}
                {icon === "gps" && <IconGPS className="w-5 h-5 text-primary" />}
                {icon === "insurance" && <IconInsurance className="w-5 h-5 text-primary" />}
              </div>
                <h3 className="font-bold text-[15.5px]">{title}</h3>
                <p className="text-[13.5px] text-text-secondary mt-1.5">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Vehicle Detail Modal */}
      {selectedVehicle && (
        <VehicleModal vehicle={selectedVehicle} activeImg={activeImg} setActiveImg={setActiveImg} onClose={closeModal} />
      )}
    </>
  );
}

// ─── Fleet Card ──────────────────────────────────────────────────────────────
function FleetCard({ vehicle: v, onView, highlightSeater }) {
  const catColors = {
    sedan:  "bg-blue-50 text-blue-700",
    suv:    "bg-green-50 text-green-700",
    luxury: "bg-purple-50 text-purple-700",
    tempo:  "bg-orange-50 text-orange-700",
    bus:    "bg-red-50 text-red-700",
  };

  const isHighlighted = highlightSeater && v.seats === highlightSeater;
  return (
    <div
      className="bg-white overflow-hidden flex flex-col group hover:shadow-lifted transition-shadow"
      style={{
        borderRadius: 18,
        border: isHighlighted ? "2px solid #FFC107" : "1px solid var(--color-border)",
        boxShadow: isHighlighted ? "0 0 0 4px rgba(255,193,7,.18)" : undefined,
      }}
    >
      {/* Image */}
      <div className="relative aspect-[16/9] overflow-hidden">
        <img
          src={v.img}
          alt={v.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {/* Category badge */}
        <span className={`absolute top-2.5 left-2.5 text-[11px] font-bold px-2.5 py-1 rounded-full capitalize ${catColors[v.category] || "bg-gray-100 text-gray-600"}`}>
          {v.category}
        </span>
        {/* Non-AC badge */}
        {!v.ac && (
          <span className="absolute top-2.5 right-2.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-gray-800 text-white">Non A/C</span>
        )}
        {/* Your selection badge when coming from group section */}
        {isHighlighted && (
          <span style={{ position: "absolute", bottom: 8, right: 8, background: "#FFC107", color: "#111", fontWeight: 700, fontSize: 11, padding: "4px 10px", borderRadius: 9999 }}>
            ★ Your Selection
          </span>
        )}
        {/* Gallery count */}
        {v.gallery?.length > 1 && (
          <span className="absolute bottom-2.5 right-2.5 text-[11px] bg-black/50 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
            {v.gallery.length} photos
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <h3 className="font-bold text-[15px] leading-tight">{v.name}</h3>
        <div className="flex gap-3 text-[12.5px] text-text-secondary">
          <span className="flex items-center gap-1"><IconSeat className="w-3.5 h-3.5" />{v.seats} Seats</span>
          <span className="flex items-center gap-1"><IconAC className="w-3.5 h-3.5" />{v.ac ? "A/C" : "Non-A/C"}</span>
          <span className="flex items-center gap-1"><IconLuggage className="w-3.5 h-3.5" />{v.bags} Bags</span>
        </div>
        <p className="text-[12.5px] text-text-secondary flex-1 line-clamp-2">{v.tagline}</p>

        {/* Rates */}
        <div className="grid grid-cols-2 gap-1.5 mt-1">
          <div className="bg-[#f4f6ff] rounded-[8px] px-2.5 py-1.5 text-center">
            <div className="text-[10px] text-text-secondary font-semibold">Local/8hr</div>
            <div className="text-[14px] font-extrabold text-primary">{fmtINR(v.local.base8hr80km)}</div>
          </div>
          <div className="bg-[#f4fff6] rounded-[8px] px-2.5 py-1.5 text-center">
            <div className="text-[10px] text-text-secondary font-semibold">Outstation</div>
            <div className="text-[14px] font-extrabold text-success">{fmtINR(v.outstation.perKm)}<span className="text-[10px] font-normal">/km</span></div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-2">
          <button
            onClick={onView}
            className="flex-1 border border-primary text-primary text-[13px] font-bold py-2 rounded-[10px] hover:bg-primary-tint transition-colors"
          >
            View Details
          </button>
          <Button href="/#booking" size="sm" className="flex-1 text-[13px]">Book Now</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Vehicle Detail Modal ─────────────────────────────────────────────────────
function VehicleModal({ vehicle: v, activeImg, setActiveImg, onClose }) {
  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-[20px] w-full max-w-[860px] max-h-[92vh] overflow-y-auto shadow-2xl">
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-white z-10 rounded-t-[20px]">
          <h2 className="text-[18px] font-bold">{v.name}</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
          >
            <IconClose className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-[1fr_340px] gap-6">
          {/* Left — Gallery */}
          <div>
            {/* Main image */}
            <div className="rounded-[14px] overflow-hidden aspect-[16/9] mb-3">
              <img
                src={v.gallery?.[activeImg] || v.img}
                alt={v.name}
                className="w-full h-full object-cover"
              />
            </div>
            {/* Thumbnails */}
            {v.gallery?.length > 1 && (
              <div className="flex gap-2">
                {v.gallery.map((src, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImg(i)}
                    className={`rounded-[8px] overflow-hidden w-20 aspect-[4/3] border-2 transition-all ${
                      activeImg === i ? "border-primary" : "border-transparent opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img src={src} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Features */}
            {v.features?.length > 0 && (
              <div className="mt-5">
                <h3 className="font-bold text-[15px] mb-3">Features & Amenities</h3>
                <div className="grid grid-cols-2 gap-2">
                  {v.features.map((f) => (
                    <div key={f} className="flex items-center gap-2 text-[13.5px] text-text-secondary">
                      <IconCheck className="w-4 h-4 text-success shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right — Details & Rates */}
          <div className="flex flex-col gap-4">
            {/* Quick specs */}
            <div className="bg-[#f8f9fc] rounded-[14px] p-4 grid grid-cols-2 gap-3">
              {[
                ["Seats", `${v.seats} Passengers`],
                ["Luggage", `${v.bags} Bags`],
                ["A/C", v.ac ? "Yes" : "No"],
                ["Category", v.category.charAt(0).toUpperCase() + v.category.slice(1)],
              ].map(([label, val]) => (
                <div key={label}>
                  <div className="text-[11px] text-text-secondary font-semibold uppercase tracking-wide">{label}</div>
                  <div className="text-[15px] font-bold mt-0.5">{val}</div>
                </div>
              ))}
            </div>

            {/* Rates */}
            <div className="border border-border rounded-[14px] p-4">
              <h3 className="font-bold text-[15px] mb-3">Rate Card</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-[11.5px] text-text-secondary font-semibold uppercase tracking-wide mb-1">Local Package</div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-[13.5px] text-text-secondary">8 hrs / 80 km base</span>
                    <span className="text-[18px] font-extrabold text-primary">{fmtINR(v.local.base8hr80km)}</span>
                  </div>
                  <div className="text-[12px] text-text-secondary mt-0.5">Extra km: {fmtINR(v.local.extraKm)}/km</div>
                </div>
                <div className="border-t border-border pt-3">
                  <div className="text-[11.5px] text-text-secondary font-semibold uppercase tracking-wide mb-1">Outstation / One Way</div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-[13.5px] text-text-secondary">Per km rate</span>
                    <span className="text-[18px] font-extrabold text-success">{fmtINR(v.outstation.perKm)}<span className="text-[12px] font-normal">/km</span></span>
                  </div>
                  <div className="text-[12px] text-text-secondary mt-0.5">Driver bhata: {fmtINR(v.outstation.driverBhata)}/day</div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-[8px] px-3 py-2 text-[12px] text-amber-700">
                  Immediate bookings (within 30 min) carry a 5% surge fee
                </div>
              </div>
            </div>

            {/* What's included */}
            <div className="bg-success-tint rounded-[14px] p-4">
              <h3 className="font-bold text-[14px] mb-2.5 text-success">Included in Fare</h3>
              {["Fuel charges","Driver charges","GST (corporate bookings)","24×7 support"].map((item) => (
                <div key={item} className="flex items-center gap-2 text-[13px] text-success mb-1.5">
                  <IconCheck className="w-3.5 h-3.5 shrink-0" /> {item}
                </div>
              ))}
            </div>

            <div className="bg-red-50 rounded-[14px] p-4">
              <h3 className="font-bold text-[14px] mb-2.5 text-red-600">Charged Extra</h3>
              {["Toll fees & state taxes","Parking charges","Airport entry charges","Night charges (if applicable)"].map((item) => (
                <div key={item} className="flex items-center gap-2 text-[13px] text-red-600 mb-1.5">
                  <IconChevronRight className="w-3.5 h-3.5 shrink-0" /> {item}
                </div>
              ))}
            </div>

            <Button href="/#booking" size="lg" block>Book This Vehicle</Button>
          </div>
        </div>
      </div>
    </div>
  );
}