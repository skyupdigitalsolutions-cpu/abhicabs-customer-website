import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { navigate } from "vike/client/router";
import { selectMobileNavOpen, setMobileNavOpen } from "../store/slices/uiSlice";
import { isAuthenticated, getStoredUserName } from "../api/tokens";
import { authApi } from "../api";
import { useToast } from "../hooks/useToast";

const NAV_LINKS = [
  { href: "/",          label: "Home" },
  { href: "/#about",    label: "About" },
  { href: "/#fleet",    label: "Vehicles" },
  { href: "/#booking",  label: "Outstation" },
  { href: "/#blogs",    label: "Blogs" },
];

const HELPLINE_HREF    = "tel:+910000000000";
const HELPLINE_DISPLAY = "+91 00000 00000";

// ── User icon (shown before login) ───────────────────────────────────────────
function UserIcon({ size = 18, color = "#111" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="3.4" stroke={color} strokeWidth="2" />
      <path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function Header() {
  const dispatch = useDispatch();
  const open = useSelector(selectMobileNavOpen);
  const toast = useToast();

  const [loggedIn, setLoggedIn]   = useState(false);
  const [userName, setUserName]   = useState("");
  const [dropdownOpen, setDropdown] = useState(false);

  useEffect(() => {
    const auth = isAuthenticated();
    setLoggedIn(auth);
    if (auth) {
      // Try stored name first (instant), then fetch from /auth/me in background
      const stored = getStoredUserName();
      if (stored) setUserName(stored);
      authApi.getMe()
        .then((data) => {
          const name = data?.name || data?.user?.name || stored || "";
          if (name) {
            setUserName(name);
            import("../api/tokens").then(({ storeUserName }) => storeUserName(name));
          }
        })
        .catch(() => { /* keep stored name */ });
    }
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    function close() { setDropdown(false); }
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [dropdownOpen]);

  async function handleLogout() {
    await authApi.logout();
    setLoggedIn(false);
    setUserName("");
    setDropdown(false);
    navigate("/");
  }

  // First name only for greeting
  const firstName = userName?.trim().split(" ")[0] || "";

  return (
    <>
      {/* ── Utility bar ─────────────────────────────────────────────── */}
      <div className="bg-brand-black text-white">
        <div className="max-w-[1280px] mx-auto px-[22px] h-[38px] flex items-center justify-between gap-4 text-[12.5px] font-medium">
          <span className="inline-flex items-center gap-1.5 text-white/85">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 21s7-5.5 7-11a7 7 0 10-14 0c0 5.5 7 11 7 11z" stroke="#FFC107" strokeWidth="2" strokeLinejoin="round" />
              <circle cx="12" cy="10" r="2.3" stroke="#FFC107" strokeWidth="2" />
            </svg>
            Serving Karnataka &amp; Hyderabad
          </span>
          <div className="ac-util-hide flex items-center gap-[22px]">
            <a href="/#contact-form" className="inline-flex items-center gap-1.5 text-white/70 hover:!text-primary">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" strokeWidth="2" />
                <path d="M4 7l8 6 8-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Support
            </a>
            <a href={HELPLINE_HREF} className="inline-flex items-center gap-1.5 text-white/70 hover:!text-primary">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M6.6 10.8a13 13 0 006.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.5.6.6 0 1 .5 1 1V20c0 .6-.4 1-1 1A17 17 0 013 4c0-.6.5-1 1-1h3.4c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.5.1.4 0 .8-.3 1L6.6 10.8z" fill="currentColor" />
              </svg>
              {HELPLINE_DISPLAY}
            </a>
            <span className="inline-flex items-center gap-1.5 text-primary font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_0_3px_rgba(255,193,7,.25)]" />
              24/7 Assistance
            </span>
          </div>
        </div>
      </div>

      {/* ── Main nav ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white border-b border-black/5">
        <div className="max-w-[1280px] mx-auto px-[22px] h-[72px] flex items-center justify-between gap-4 relative">

          {/* Logo */}
          <a href="/" className="flex items-center gap-2.5 shrink-0">
            <img src="/images/abhi-cabs-icon.svg" alt="Abhi Cabs" className="w-10 h-10 object-contain" />
            <span className="leading-none">
              <span className="block font-extrabold text-[20px] tracking-[.01em] text-brand-black" style={{ fontFamily: "'Montserrat',sans-serif" }}>
                ABHI<span className="text-primary">CABS</span>
              </span>
              <span className="block text-[8.5px] font-semibold tracking-[.24em] text-[#999] mt-0.5">
                RIDE WITH TRUST
              </span>
            </span>
          </a>

          {/* Desktop nav links */}
          <nav className="hidden lg:flex items-center" aria-label="Primary">
            {NAV_LINKS.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className={`px-3.5 py-2.5 font-medium text-[14.5px] rounded-lg hover:!bg-[#F7F7F7] hover:!text-brand-black ${
                  l.label === "Home" ? "text-brand-black" : "text-[#555]"
                }`}
              >
                {l.label}
              </a>
            ))}
          </nav>

          {/* Desktop right actions */}
          <div className="flex items-center gap-3 shrink-0">
            {loggedIn ? (
              /* ── Logged in: Hi [Name] dropdown ── */
              <div className="relative hidden lg:block">
                <button
                  onClick={(e) => { e.stopPropagation(); setDropdown((v) => !v); }}
                  className="inline-flex items-center gap-2 font-semibold text-[13.5px] text-brand-black hover:!text-[#B8860B] bg-none border-none cursor-pointer"
                >
                  {/* Avatar circle */}
                  <span className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-brand-black font-bold text-[13px] shrink-0">
                    {firstName ? firstName[0].toUpperCase() : <UserIcon size={15} color="#111" />}
                  </span>
                  <span>Hi, {firstName || "there"}</span>
                  {/* Chevron */}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ transition: "transform .2s", transform: dropdownOpen ? "rotate(180deg)" : "rotate(0)" }}>
                    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {/* Dropdown */}
                {dropdownOpen && (
                  <div
                    className="absolute right-0 mt-2 w-44 bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-[#F0F0F0] overflow-hidden z-50"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <a
                      href="/my-booking"
                      onClick={() => setDropdown(false)}
                      className="flex items-center gap-2.5 px-4 py-3 text-[13.5px] font-semibold text-brand-black hover:!bg-[#FAFAFA]"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                        <rect x="3" y="4" width="18" height="17" rx="2.5" stroke="#111" strokeWidth="1.8" />
                        <path d="M8 2v4M16 2v4M3 10h18" stroke="#111" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                      My Bookings
                    </a>
                    <div className="h-px bg-[#F0F0F0]" />
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-3 text-[13.5px] font-semibold text-[#E53E3E] hover:!bg-[#FFF5F5] border-none bg-white cursor-pointer"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                        <path d="M16 17l5-5-5-5M21 12H9M9 3H5a2 2 0 00-2 2v14a2 2 0 002 2h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* ── Not logged in: Login icon + Sign In ── */
              <a
                href="/login"
                className="hidden lg:inline-flex items-center gap-1.5 font-semibold text-[13.5px] text-brand-black hover:!text-[#B8860B]"
              >
                <UserIcon size={17} />
                Sign In
              </a>
            )}

            <button
              onClick={() => toast("App download coming soon!", "success")}
              className="hidden lg:inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-primary text-brand-black font-semibold text-[14px] shadow-[0_6px_18px_rgba(255,193,7,.4)] border-none cursor-pointer hover:!bg-[#FFB300]"
            >
              Download App
            </button>

            {/* Mobile hamburger */}
            <button
              className="lg:hidden w-[42px] h-[42px] rounded-[11px] border-[1.5px] border-[#E5E5E5] bg-white flex items-center justify-center cursor-pointer"
              onClick={() => dispatch(setMobileNavOpen(!open))}
              aria-label="Menu"
            >
              {open ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="#111" strokeWidth="2.2" strokeLinecap="round" /></svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M4 12h16M4 17h16" stroke="#111" strokeWidth="2" strokeLinecap="round" /></svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile drawer ────────────────────────────────────────────── */}
      <div className={`lg:hidden fixed inset-x-0 top-[110px] bottom-0 bg-white z-40 overflow-y-auto px-6 py-5 transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}>
        {NAV_LINKS.map((l) => (
          <a
            key={l.label}
            href={l.href}
            onClick={() => dispatch(setMobileNavOpen(false))}
            className="block py-4 text-[15px] font-semibold border-b border-[#E5E5E5] text-brand-black"
          >
            {l.label}
          </a>
        ))}

        <div className="flex flex-col gap-3 mt-6">
          {loggedIn ? (
            <>
              {/* Greeting row in mobile */}
              <div className="flex items-center gap-2.5 py-3 px-1">
                <span className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-brand-black font-bold text-[14px]">
                  {firstName ? firstName[0].toUpperCase() : "U"}
                </span>
                <span className="font-semibold text-[15px]">Hi, {firstName || "there"}</span>
              </div>
              <a
                href="/my-booking"
                onClick={() => dispatch(setMobileNavOpen(false))}
                className="w-full py-3 rounded-xl border border-[#E5E5E5] font-semibold text-center text-brand-black"
              >
                My Bookings
              </a>
              <button
                onClick={() => { handleLogout(); dispatch(setMobileNavOpen(false)); }}
                className="w-full py-3 rounded-xl border border-[#FECACA] text-[#E53E3E] font-semibold bg-white cursor-pointer"
              >
                Logout
              </button>
            </>
          ) : (
            <a
              href="/login"
              onClick={() => dispatch(setMobileNavOpen(false))}
              className="w-full py-3 rounded-xl border border-[#E5E5E5] font-semibold text-center inline-flex items-center justify-center gap-2"
            >
              <UserIcon size={16} />
              Sign In
            </a>
          )}
          <a
            href="/#booking"
            onClick={() => dispatch(setMobileNavOpen(false))}
            className="w-full py-3 rounded-full text-center font-bold bg-primary text-brand-black"
          >
            Book Now
          </a>
        </div>
      </div>
    </>
  );
}
