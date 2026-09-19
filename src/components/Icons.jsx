import React from "react";

const base = { fill: "none", xmlns: "http://www.w3.org/2000/svg" };
const s = (w = "1.8") => ({ stroke: "currentColor", strokeWidth: w, strokeLinecap: "round", strokeLinejoin: "round" });

// ── Navigation & UI ──────────────────────────────────────────────────────────
export function IconPin({ className = "w-4 h-4" }) {
  return <svg {...base} viewBox="0 0 24 24" className={className}><path d="M12 21s7-6.2 7-11.5A7 7 0 105 9.5C5 14.8 12 21 12 21z" {...s()} /><circle cx="12" cy="9.5" r="2.3" {...s()} /></svg>;
}
export function IconCheck({ className = "w-4 h-4" }) {
  return <svg {...base} viewBox="0 0 24 24" className={className}><path d="M20 6L9 17l-5-5" {...s("2.4")} /></svg>;
}
export function IconArrowRight({ className = "w-4 h-4" }) {
  return <svg {...base} viewBox="0 0 24 24" className={className}><path d="M5 12h14M13 6l6 6-6 6" {...s()} /></svg>;
}
export function IconSwap({ className = "w-4 h-4" }) {
  return <svg {...base} viewBox="0 0 24 24" className={className}><path d="M17 2l4 4-4 4M3 11V9a4 4 0 014-4h14M7 22l-4-4 4-4M21 13v2a4 4 0 01-4 4H3" {...s()} /></svg>;
}
export function IconClock({ className = "w-4 h-4" }) {
  return <svg {...base} viewBox="0 0 24 24" className={className}><circle cx="12" cy="12" r="9" {...s()} /><path d="M12 7v5l3 2" {...s()} /></svg>;
}
export function IconPlane({ className = "w-4 h-4" }) {
  return <svg {...base} viewBox="0 0 24 24" className={className}><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" {...s()} /></svg>;
}
export function IconMenu() {
  return <svg viewBox="0 0 24 24" className="w-4.5 h-4.5" fill="none"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
}
export function IconClose({ className = "w-4.5 h-4.5" }) {
  return <svg viewBox="0 0 24 24" className={className} fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
}
export function IconList({ className = "w-4 h-4" }) {
  return <svg {...base} viewBox="0 0 24 24" className={className}><path d="M4 7h16M4 12h16M4 17h10" {...s()} /></svg>;
}
export function IconAlert({ className = "w-6 h-6" }) {
  return <svg {...base} viewBox="0 0 24 24" className={className}><path d="M12 9v4m0 4h.01M12 3l9 16H3l9-16z" {...s()} /></svg>;
}
export function IconChevronRight({ className = "w-4 h-4" }) {
  return <svg {...base} viewBox="0 0 24 24" className={className}><path d="M9 18l6-6-6-6" {...s()} /></svg>;
}
export function IconExternalLink({ className = "w-4 h-4" }) {
  return <svg {...base} viewBox="0 0 24 24" className={className}><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" {...s()} /></svg>;
}

// ── People & identity ────────────────────────────────────────────────────────
export function IconUser({ className = "w-4 h-4" }) {
  return <svg {...base} viewBox="0 0 24 24" className={className}><path d="M12 12a4 4 0 100-8 4 4 0 000 8zM4 20a8 8 0 0116 0" {...s()} /></svg>;
}
export function IconUsers({ className = "w-4 h-4" }) {
  return <svg {...base} viewBox="0 0 24 24" className={className}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" {...s()} /><circle cx="9" cy="7" r="4" {...s()} /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" {...s()} /></svg>;
}
export function IconBriefcase({ className = "w-4 h-4" }) {
  return <svg {...base} viewBox="0 0 24 24" className={className}><rect x="2" y="7" width="20" height="14" rx="2" {...s()} /><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" {...s()} /></svg>;
}
export function IconBuilding({ className = "w-4 h-4" }) {
  return <svg {...base} viewBox="0 0 24 24" className={className}><path d="M3 21h18M3 7l9-4 9 4M4 21V7M20 21V7" {...s()} /><path d="M9 21v-4h6v4M9 11h1m4 0h1M9 15h1m4 0h1" {...s()} /></svg>;
}

// ── Transport ────────────────────────────────────────────────────────────────
export function IconCar({ className = "w-4 h-4" }) {
  return <svg {...base} viewBox="0 0 24 24" className={className}><path d="M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v9a2 2 0 01-2 2h-2" {...s()} /><circle cx="7.5" cy="17.5" r="2.5" {...s()} /><circle cx="17.5" cy="17.5" r="2.5" {...s()} /></svg>;
}
export function IconBus({ className = "w-4 h-4" }) {
  return <svg {...base} viewBox="0 0 24 24" className={className}><path d="M8 6v6M15 6v6M2 12h19.6M18 18h2a1 1 0 001-1V7a5 5 0 00-5-5H8C5.24 2 3 4.24 3 7v10a1 1 0 001 1h2" {...s()} /><circle cx="8" cy="18" r="2" {...s()} /><circle cx="16" cy="18" r="2" {...s()} /></svg>;
}
export function IconTruck({ className = "w-4 h-4" }) {
  return <svg {...base} viewBox="0 0 24 24" className={className}><path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z" {...s()} /><circle cx="5.5" cy="18.5" r="2.5" {...s()} /><circle cx="18.5" cy="18.5" r="2.5" {...s()} /></svg>;
}
export function IconMapPin({ className = "w-4 h-4" }) {
  return <svg {...base} viewBox="0 0 24 24" className={className}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" {...s()} /><circle cx="12" cy="10" r="3" {...s()} /></svg>;
}
export function IconNavigation({ className = "w-4 h-4" }) {
  return <svg {...base} viewBox="0 0 24 24" className={className}><polygon points="3,11 22,2 13,21 11,13" {...s()} /></svg>;
}
export function IconRoute({ className = "w-4 h-4" }) {
  return <svg {...base} viewBox="0 0 24 24" className={className}><circle cx="6" cy="19" r="3" {...s()} /><path d="M9 19h8.5a3.5 3.5 0 000-7h-11a3.5 3.5 0 010-7H15" {...s()} /><circle cx="18" cy="5" r="3" {...s()} /></svg>;
}

// ── Luggage / seat / amenity ─────────────────────────────────────────────────
export function IconLuggage({ className = "w-4 h-4" }) {
  return <svg {...base} viewBox="0 0 24 24" className={className}><rect x="4" y="8" width="16" height="13" rx="2" {...s()} /><path d="M16 8V6a2 2 0 00-2-2h-4a2 2 0 00-2 2v2M12 13v3M10 13v3" {...s()} /></svg>;
}
export function IconSeat({ className = "w-4 h-4" }) {
  return <svg {...base} viewBox="0 0 24 24" className={className}><path d="M6 20v-4a6 6 0 016-6h4a2 2 0 012 2v4M4 16h16M8 20h8" {...s()} /><circle cx="12" cy="5" r="3" {...s()} /></svg>;
}
export function IconAC({ className = "w-4 h-4" }) {
  return <svg {...base} viewBox="0 0 24 24" className={className}><path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07" {...s("1.5")} /><circle cx="12" cy="12" r="3" {...s()} /></svg>;
}
export function IconStar({ className = "w-4 h-4" }) {
  return <svg {...base} viewBox="0 0 24 24" className={className}><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" {...s()} /></svg>;
}
export function IconWifi({ className = "w-4 h-4" }) {
  return <svg {...base} viewBox="0 0 24 24" className={className}><path d="M5 12.55a11 11 0 0114.08 0M1.42 9a16 16 0 0121.16 0M8.53 16.11a6 6 0 016.95 0" {...s()} /><circle cx="12" cy="20" r="1" fill="currentColor" /></svg>;
}

// ── Money / invoice ──────────────────────────────────────────────────────────
export function IconTag({ className = "w-4 h-4" }) {
  return <svg {...base} viewBox="0 0 24 24" className={className}><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" {...s()} /><circle cx="7" cy="7" r="1.5" fill="currentColor" /></svg>;
}
export function IconReceipt({ className = "w-4 h-4" }) {
  return <svg {...base} viewBox="0 0 24 24" className={className}><path d="M4 2v22l3-2 2 2 3-2 3 2 2-2 3 2V2z" {...s()} /><path d="M9 7h6M9 12h6M9 17h3" {...s()} /></svg>;
}
export function IconCreditCard({ className = "w-4 h-4" }) {
  return <svg {...base} viewBox="0 0 24 24" className={className}><rect x="1" y="4" width="22" height="16" rx="2" {...s()} /><line x1="1" y1="10" x2="23" y2="10" {...s()} /></svg>;
}
export function IconDollar({ className = "w-4 h-4" }) {
  return <svg {...base} viewBox="0 0 24 24" className={className}><line x1="12" y1="1" x2="12" y2="23" {...s()} /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" {...s()} /></svg>;
}
export function IconBanknote({ className = "w-4 h-4" }) {
  return <svg {...base} viewBox="0 0 24 24" className={className}><rect x="1" y="4" width="22" height="16" rx="2" {...s()} /><circle cx="12" cy="12" r="3" {...s()} /></svg>;
}
export function IconPercent({ className = "w-4 h-4" }) {
  return <svg {...base} viewBox="0 0 24 24" className={className}><line x1="19" y1="5" x2="5" y2="19" {...s()} /><circle cx="6.5" cy="6.5" r="2.5" {...s()} /><circle cx="17.5" cy="17.5" r="2.5" {...s()} /></svg>;
}

// ── Alerts / status ──────────────────────────────────────────────────────────
export function IconZap({ className = "w-4 h-4" }) {
  return <svg {...base} viewBox="0 0 24 24" className={className}><polygon points="13,2 3,14 12,14 11,22 21,10 12,10" {...s()} /></svg>;
}
export function IconShield({ className = "w-4 h-4" }) {
  return <svg {...base} viewBox="0 0 24 24" className={className}><path d="M12 3l8 3v6c0 4.4-3.2 8.3-8 9-4.8-.7-8-4.6-8-9V6l8-3z" {...s()} /></svg>;
}
export function IconInfo({ className = "w-4 h-4" }) {
  return <svg {...base} viewBox="0 0 24 24" className={className}><circle cx="12" cy="12" r="10" {...s()} /><line x1="12" y1="16" x2="12" y2="12" {...s()} /><line x1="12" y1="8" x2="12.01" y2="8" {...s("2.5")} /></svg>;
}
export function IconXCircle({ className = "w-4 h-4" }) {
  return <svg {...base} viewBox="0 0 24 24" className={className}><circle cx="12" cy="12" r="10" {...s()} /><line x1="15" y1="9" x2="9" y2="15" {...s()} /><line x1="9" y1="9" x2="15" y2="15" {...s()} /></svg>;
}
export function IconCheckCircle({ className = "w-4 h-4" }) {
  return <svg {...base} viewBox="0 0 24 24" className={className}><path d="M22 11.08V12a10 10 0 11-5.93-9.14" {...s()} /><polyline points="22,4 12,14.01 9,11.01" {...s()} /></svg>;
}
export function IconLoader({ className = "w-4 h-4" }) {
  return <svg {...base} viewBox="0 0 24 24" className={className}><line x1="12" y1="2" x2="12" y2="6" {...s()} /><line x1="12" y1="18" x2="12" y2="22" {...s()} /><line x1="4.93" y1="4.93" x2="7.76" y2="7.76" {...s()} /><line x1="16.24" y1="16.24" x2="19.07" y2="19.07" {...s()} /><line x1="2" y1="12" x2="6" y2="12" {...s()} /><line x1="18" y1="12" x2="22" y2="12" {...s()} /><line x1="4.93" y1="19.07" x2="7.76" y2="16.24" {...s()} /><line x1="16.24" y1="7.76" x2="19.07" y2="4.93" {...s()} /></svg>;
}

// ── Communication ────────────────────────────────────────────────────────────
export function IconPhone({ className = "w-4 h-4" }) {
  return <svg {...base} viewBox="0 0 24 24" className={className}><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 11a19.79 19.79 0 01-3.07-8.67A2 2 0 012 .18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" {...s()} /></svg>;
}
export function IconMail({ className = "w-4 h-4" }) {
  return <svg {...base} viewBox="0 0 24 24" className={className}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" {...s()} /><polyline points="22,6 12,13 2,6" {...s()} /></svg>;
}
export function IconWhatsapp({ className = "w-4 h-4" }) {
  return <svg {...base} viewBox="0 0 24 24" className={className}><path d="M21 11.5a8.4 8.4 0 01-8.9 8.4A8.9 8.9 0 015 18.3L3 21l1.9-4.9a8.4 8.4 0 1116-4.6z" {...s()} /></svg>;
}
export function IconMessageSquare({ className = "w-4 h-4" }) {
  return <svg {...base} viewBox="0 0 24 24" className={className}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" {...s()} /></svg>;
}

// ── Tools & Settings ─────────────────────────────────────────────────────────
export function IconWrench({ className = "w-4 h-4" }) {
  return <svg {...base} viewBox="0 0 24 24" className={className}><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" {...s()} /></svg>;
}
export function IconId({ className = "w-4 h-4" }) {
  return <svg {...base} viewBox="0 0 24 24" className={className}><rect x="2" y="4" width="20" height="16" rx="2" {...s()} /><circle cx="8" cy="10" r="2" {...s()} /><path d="M12 10h5M12 14h5M6 14h3" {...s()} /></svg>;
}
export function IconPrinter({ className = "w-4 h-4" }) {
  return <svg {...base} viewBox="0 0 24 24" className={className}><polyline points="6,9 6,2 18,2 18,9" {...s()} /><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" {...s()} /><rect x="6" y="14" width="12" height="8" {...s()} /></svg>;
}
export function IconDownload({ className = "w-4 h-4" }) {
  return <svg {...base} viewBox="0 0 24 24" className={className}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" {...s()} /><polyline points="7,10 12,15 17,10" {...s()} /><line x1="12" y1="15" x2="12" y2="3" {...s()} /></svg>;
}
export function IconEdit({ className = "w-4 h-4" }) {
  return <svg {...base} viewBox="0 0 24 24" className={className}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" {...s()} /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" {...s()} /></svg>;
}
export function IconCamera({ className = "w-4 h-4" }) {
  return <svg {...base} viewBox="0 0 24 24" className={className}><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" {...s()} /><circle cx="12" cy="13" r="4" {...s()} /></svg>;
}
export function IconGPS({ className = "w-4 h-4" }) {
  return <svg {...base} viewBox="0 0 24 24" className={className}><circle cx="12" cy="12" r="10" {...s()} /><circle cx="12" cy="12" r="3" {...s()} /><line x1="12" y1="2" x2="12" y2="5" {...s()} /><line x1="12" y1="19" x2="12" y2="22" {...s()} /><line x1="2" y1="12" x2="5" y2="12" {...s()} /><line x1="19" y1="12" x2="22" y2="12" {...s()} /></svg>;
}
export function IconInsurance({ className = "w-4 h-4" }) {
  return <svg {...base} viewBox="0 0 24 24" className={className}><path d="M12 3l8 3v6c0 4.4-3.2 8.3-8 9-4.8-.7-8-4.6-8-9V6l8-3z" {...s()} /><path d="M9 12l2 2 4-4" {...s()} /></svg>;
}
