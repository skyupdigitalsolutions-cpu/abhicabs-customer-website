import React, { useState } from "react";
import { navigate } from "vike/client/router";
import { fmtINR, VEHICLE_RATES } from "../data/mockData";

export default function GroupFleetSection({ vehicles, id = "group-fleet" }) {
  const [modal, setModal] = useState(null);
  const [activeImg, setActiveImg] = useState(0);

  function openModal(v) {
    // Try to find rich data from VEHICLE_RATES by matching name or seats
    const rich = VEHICLE_RATES.find(r =>
      r.name === v.name ||
      String(r.seats) === String(v.seats).replace(/[^0-9]/g, "")
    );
    setModal(rich || v);
    setActiveImg(0);
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    setModal(null);
    document.body.style.overflow = "";
  }

  function handleBook() {
    closeModal();
    navigate("/#booking");
  }

  return (
    <>
      <section id={id} style={{ maxWidth: 1280, margin: "0 auto", padding: "clamp(46px,6vw,80px) 22px 0" }}>
        <div style={{ textAlign: "center", maxWidth: 620, margin: "0 auto 34px" }}>
          <span style={{ display: "inline-block", fontWeight: 700, fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase", color: "#B8860B" }}>Featured Vehicles</span>
          <h2 style={{ fontWeight: 800, fontSize: "clamp(26px,3.4vw,42px)", lineHeight: 1.12, margin: "8px 0 0", letterSpacing: "-.02em" }}>Premium &amp; Group Fleet</h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,230px),1fr))", gap: 18 }}>
          {vehicles.map((v) => (
            <div key={v.name} style={{ background: "#fff", border: "1px solid #EFEFEF", borderRadius: 18, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <div style={{ aspectRatio: "16/9", background: "#F0F0F0", position: "relative", overflow: "hidden" }}>
                <img src={v.img} alt={v.name} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }} />
                <span style={{ position: "absolute", top: 9, left: 10, fontSize: 10, fontWeight: 600, color: "#111", background: "#FFC107", padding: "3px 9px", borderRadius: 9999 }}>
                  {v.seats}
                </span>
              </div>
              <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", flex: 1 }}>
                <h3 style={{ fontWeight: 700, fontSize: 15, margin: "0 0 4px", lineHeight: 1.25 }}>{v.name}</h3>
                <div style={{ fontSize: 12, color: "#666", fontWeight: 500, marginBottom: 12 }}>{v.type}</div>
                <button
                  onClick={() => openModal(v)}
                  className="hover:!bg-[#111] hover:!text-white"
                  style={{ marginTop: "auto", width: "100%", padding: 10, borderRadius: 10, border: "1.5px solid #111", background: "#fff", color: "#111", fontWeight: 600, fontSize: 13, cursor: "pointer", transition: "all .18s" }}
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Vehicle Detail Modal ─────────────────────────────────────────── */}
      {modal && (
        <div
          onClick={(e) => e.target === e.currentTarget && closeModal()}
          style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
        >
          <div style={{ background: "#fff", borderRadius: 24, width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.22)" }}>

            {/* Image */}
            <div style={{ position: "relative", aspectRatio: "16/9", background: "#F7F7F7", borderRadius: "24px 24px 0 0", overflow: "hidden" }}>
              <img
                src={modal.gallery?.[activeImg] || modal.img}
                alt={modal.name}
                style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
              />
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
                    <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }} />
                  </button>
                ))}
              </div>
            )}

            {/* Details */}
            <div style={{ padding: "18px 24px 24px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
                <h2 style={{ fontWeight: 800, fontSize: 22, margin: 0 }}>{modal.name}</h2>
                <span style={{ fontSize: 12, fontWeight: 600, background: "#FFF7DE", color: "#B8860B", padding: "5px 12px", borderRadius: 9999, flexShrink: 0 }}>
                  {modal.category
                    ? `${modal.category.charAt(0).toUpperCase() + modal.category.slice(1)} · ${modal.seats} Seater`
                    : modal.seats}
                </span>
              </div>

              {/* Specs */}
              <div style={{ display: "flex", gap: 20, fontSize: 13.5, color: "#666", fontWeight: 500, marginBottom: 16 }}>
                <span>👤 {modal.seats} Seats</span>
                {modal.ac !== undefined && <span>❄️ {modal.ac ? "A/C" : "Non A/C"}</span>}
                {modal.bags && <span>🧳 {modal.bags} Bags</span>}
              </div>

              {/* Rate grid */}
              {(modal.local || modal.outstation) && (
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
                    <div style={{ fontWeight: 700, fontSize: 15, color: "#111" }}>{fmtINR(modal.outstation?.driverBhata ?? 700)}</div>
                  </div>
                </div>
              )}

              {/* Features */}
              {modal.features?.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
                  {modal.features.map((f) => (
                    <span key={f} style={{ fontSize: 12, fontWeight: 500, background: "#F0F7FF", color: "#1a56db", padding: "4px 10px", borderRadius: 9999 }}>{f}</span>
                  ))}
                </div>
              )}

              {/* CTAs */}
              <div style={{ display: "flex", gap: 12 }}>
                <button
                  onClick={closeModal}
                  style={{ flex: 1, padding: "14px 0", borderRadius: 12, border: "1.5px solid #E5E5E5", background: "#fff", color: "#111", fontWeight: 600, fontSize: 14.5, cursor: "pointer" }}
                >
                  Close
                </button>
                <button
                  onClick={handleBook}
                  style={{ flex: 1, padding: "14px 0", borderRadius: 12, border: "none", background: "#FFC107", color: "#111", fontWeight: 700, fontSize: 14.5, cursor: "pointer" }}
                >
                  Book This Vehicle
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
