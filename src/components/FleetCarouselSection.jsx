import React, { useRef, useState } from "react";
import { navigate } from "vike/client/router";
import { fmtINR } from "../data/mockData";

export default function FleetCarouselSection({ vehicles, onViewAll }) {
  const scrollRef = useRef(null);
  const [modal, setModal] = useState(null);   // vehicle object or null
  const [activeImg, setActiveImg] = useState(0);

  function scrollBy(dir) {
    scrollRef.current?.scrollBy({ left: dir * 300, behavior: "smooth" });
  }

  function openModal(v) {
    setModal(v);
    setActiveImg(0);
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    setModal(null);
    document.body.style.overflow = "";
  }

  function selectVehicle() {
    const seats = modal?.seats;
    const vehicleId = modal?.id;
    const params = new URLSearchParams({ type: "group" });
    if (seats) params.set("seater", String(seats));
    if (vehicleId) params.set("vehicle", vehicleId);
    closeModal();
    navigate(`/booking-search?${params.toString()}`);
  }

  return (
    <>
      <section id="fleet" style={{ maxWidth: 1280, margin: "0 auto", padding: "clamp(46px,6vw,80px) 22px 0" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 26 }}>
          <div>
            <span style={{ display: "inline-block", fontWeight: 700, fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase", color: "#B8860B" }}>Our Fleet</span>
            <h2 style={{ fontWeight: 800, fontSize: "clamp(26px,3.4vw,42px)", lineHeight: 1.12, margin: "8px 0 6px", letterSpacing: "-.02em" }}>Choose Your Ride</h2>
            <p style={{ fontSize: 15.5, color: "#666", fontWeight: 400, margin: 0, maxWidth: 520 }}>
              From everyday city travel to large group journeys, choose the vehicle that fits your trip.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => scrollBy(-1)} aria-label="Previous" style={{ width: 44, height: 44, borderRadius: "50%", border: "1.5px solid #E5E5E5", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="#111" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <button onClick={() => scrollBy(1)} aria-label="Next" style={{ width: 44, height: 44, borderRadius: "50%", border: "none", background: "#111", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="#FFC107" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="ac-scroll"
          style={{ display: "flex", gap: 20, overflowX: "hidden", scrollBehavior: "smooth", paddingBottom: 12, scrollSnapType: "x mandatory" }}
        >
          {vehicles.map((v) => (
            <div
              key={v.id}
              style={{ flex: "0 0 280px", scrollSnapAlign: "start", background: "#fff", border: "1px solid #EFEFEF", borderRadius: 20, overflow: "hidden", display: "flex", flexDirection: "column" }}
            >
              {/* Vehicle image */}
              <div style={{ aspectRatio: "16/9", background: "#F7F7F7", position: "relative", overflow: "hidden", flex: "none" }}>
                <img src={v.img} alt={v.name} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }} />
              </div>

              {/* Card body */}
              <div style={{ padding: 20, display: "flex", flexDirection: "column", flex: 1 }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                  <h3 style={{ fontWeight: 700, fontSize: 17, margin: 0 }}>{v.name}</h3>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#666", background: "#F7F7F7", padding: "4px 9px", borderRadius: 9999, flexShrink: 0 }}>{v.seats} Seater</span>
                </div>
                <div style={{ fontSize: 12.5, color: "#666", fontWeight: 500, margin: "6px 0 14px" }}>
                  {v.ac ? "A/C" : "Non-A/C"} · {v.category}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
                  <span style={{ color: "#666" }}>Local from</span>
                  <span style={{ fontWeight: 700, color: "#111" }}>₹{v.local?.base8hr80km ?? "—"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                  <span style={{ color: "#666" }}>Outstation</span>
                  <span style={{ fontWeight: 700, color: "#B8860B" }}>₹{v.outstation?.perKm ?? "—"}/km</span>
                </div>
                <button
                  onClick={() => openModal(v)}
                  className="hover:!bg-[#111] hover:!text-white"
                  style={{ marginTop: "auto", paddingTop: 14, width: "100%", padding: 11, borderRadius: 11, border: "1.5px solid #111", background: "#fff", color: "#111", fontWeight: 600, fontSize: 13.5, cursor: "pointer", flexShrink: 0 }}
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: "right", marginTop: 6 }}>
          <button
            onClick={onViewAll}
            className="hover:!text-[#B8860B]"
            style={{ background: "none", border: "none", color: "#111", fontWeight: 600, fontSize: 14, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            View All Vehicles
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="#FFC107" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
      </section>

      {/* ── Vehicle Detail Modal ────────────────────────────────────────────── */}
      {modal && (
        <div
          onClick={(e) => e.target === e.currentTarget && closeModal()}
          style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
        >
          <div style={{ background: "#fff", borderRadius: 24, width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.22)" }}>

            {/* Vehicle image */}
            <div style={{ position: "relative", aspectRatio: "16/9", background: "#F7F7F7", borderRadius: "24px 24px 0 0", overflow: "hidden" }}>
              <img
                src={modal.gallery?.[activeImg] || modal.img}
                alt={modal.name}
                style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
              />
              {/* Close button */}
              <button
                onClick={closeModal}
                style={{ position: "absolute", top: 12, right: 12, width: 36, height: 36, borderRadius: "50%", background: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,.15)" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="#111" strokeWidth="2.2" strokeLinecap="round" /></svg>
              </button>
            </div>

            {/* Thumbnails */}
            {modal.gallery?.length > 1 && (
              <div style={{ display: "flex", gap: 8, padding: "10px 20px 0" }}>
                {modal.gallery.map((src, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImg(i)}
                    style={{ width: 64, height: 44, borderRadius: 8, overflow: "hidden", border: activeImg === i ? "2px solid #FFC107" : "2px solid transparent", opacity: activeImg === i ? 1 : 0.55, cursor: "pointer", padding: 0 }}
                  >
                    <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </button>
                ))}
              </div>
            )}

            {/* Details */}
            <div style={{ padding: "18px 24px 24px" }}>
              {/* Name + badge */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
                <h2 style={{ fontWeight: 800, fontSize: 22, margin: 0 }}>{modal.name}</h2>
                <span style={{ fontSize: 12, fontWeight: 600, background: "#FFF7DE", color: "#B8860B", padding: "5px 12px", borderRadius: 9999, flexShrink: 0 }}>
                  {modal.category?.charAt(0).toUpperCase() + modal.category?.slice(1)} · {modal.seats} Seater
                </span>
              </div>

              {/* Quick specs */}
              <div style={{ display: "flex", gap: 20, fontSize: 13.5, color: "#666", fontWeight: 500, marginBottom: 16 }}>
                <span>👤 {modal.seats} Seater</span>
                <span>❄️ {modal.ac ? "A/C" : "Non A/C"}</span>
                <span>🧳 {modal.bags} Bags</span>
              </div>

              {/* Rate grid — matching Image 2 layout */}
              <div style={{ background: "#F7F7F7", borderRadius: 14, padding: "16px 18px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px 10px", marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 11, color: "#999", fontWeight: 500, marginBottom: 4 }}>Local Package</div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#111" }}>{fmtINR(modal.local?.base8hr80km ?? 0)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#999", fontWeight: 500, marginBottom: 4 }}>Outstation</div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#B8860B" }}>₹{modal.outstation?.perKm ?? 0}/km</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#999", fontWeight: 500, marginBottom: 4 }}>Extra Hour</div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#111" }}>₹150</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#999", fontWeight: 500, marginBottom: 4 }}>Extra KM</div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#111" }}>₹{modal.local?.extraKm ?? modal.outstation?.perKm ?? 0}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#999", fontWeight: 500, marginBottom: 4 }}>Min / day</div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#111" }}>300 km</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#999", fontWeight: 500, marginBottom: 4 }}>Driver Allowance</div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#111" }}>{fmtINR(modal.outstation?.driverBhata ?? 500)}</div>
                </div>
              </div>

              {/* CTA buttons — matching Image 2 */}
              <div style={{ display: "flex", gap: 12 }}>
                <button
                  onClick={closeModal}
                  style={{ flex: 1, padding: "14px 0", borderRadius: 12, border: "1.5px solid #E5E5E5", background: "#fff", color: "#111", fontWeight: 600, fontSize: 14.5, cursor: "pointer" }}
                >
                  Close
                </button>
                <button
                  onClick={selectVehicle}
                  style={{ flex: 1, padding: "14px 0", borderRadius: 12, border: "none", background: "#FFC107", color: "#111", fontWeight: 700, fontSize: 14.5, cursor: "pointer" }}
                >
                  Select Vehicle
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}