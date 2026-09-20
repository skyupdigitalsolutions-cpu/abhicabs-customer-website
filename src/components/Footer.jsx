import React from "react";

const HELPLINE_HREF = "tel:+910000000000";
const linkClass = "text-[14px] text-white/60 hover:!text-primary";
const headClass = "text-[12.5px] font-bold text-white tracking-[.08em] uppercase mb-4";

// Rebuilt to match the Figma bundler export exactly. Converted from inline
// style={{}} objects to Tailwind utility classes (including clamp()
// responsive values and the auto-fit grid, both expressible as Tailwind
// arbitrary values) for consistency with the rest of the codebase.
export default function Footer() {
  return (
    <footer className="bg-[#0b0b0b] pt-[clamp(46px,6vw,72px)] pb-0 mt-[clamp(46px,6vw,80px)]">
      <div className="max-w-[1280px] mx-auto px-[22px]">
        <div className="footer-grid grid grid-cols-4 gap-6">
          <div className="max-w-[340px]">
            <div className="mb-3.5">
              <img
                src="/images/abhi-cabs-logo-footer.png"
                alt="Abhi Cabs"
                className="w-[160px] object-contain"
                style={{ mixBlendMode: "screen" }}
              />
            </div>
            <p className="text-[13.5px] leading-relaxed text-white/55 font-normal m-0">
              Reliable chauffeur-driven transportation across Karnataka and Hyderabad. From city cabs to 49-seat coaches.
            </p>
          </div>

          <div className="row-start-2 col-start-1">
            <h4 className={headClass}>Quick Links</h4>
            <div className="flex flex-col gap-4 pb-8">
              <a href="/" className={linkClass}>Home</a>
              <a href="/#about" className={linkClass}>About</a>
              <a href="/#services" className={linkClass}>Services</a>
              <a href="/#cities" className={linkClass}>Cities</a>
              <a href="/#contact-form" className={linkClass}>Contact</a>
            </div>
          </div>

          <div className="row-start-2 col-start-2">
            <h4 className={headClass}>Services</h4>
            <div className="flex flex-col gap-4">
              <a href="/#booking" className={linkClass}>One Way</a>
              <a href="/#booking" className={linkClass}>Round Trip</a>
              <a href="/#booking" className={linkClass}>Local Rental</a>
              <a href="/#booking" className={linkClass}>Airport Transfer</a>
              <a href="/#booking" className={linkClass}>Group Transportation</a>
            </div>
          </div>

          <div className="row-start-2 col-start-3">
            <h4 className={headClass}>Destinations</h4>
            <div className="flex flex-col gap-4">
              <a href="/#cities" className={linkClass}>Bengaluru</a>
              <a href="/#cities" className={linkClass}>Mysuru</a>
              <a href="/#cities" className={linkClass}>Mangaluru</a>
              <a href="/#cities" className={linkClass}>Hyderabad</a>
              <a href="/#cities" className={linkClass}>Warangal</a>
              <a href="/#cities" className={linkClass}>Nizamabad</a>
            </div>
          </div>

          <div className="row-start-2 col-start-4">
            <h4 className={headClass}>Contact</h4>
            <div className="flex flex-col gap-4">
              <a href={HELPLINE_HREF} className={linkClass}>Phone</a>
              <a href="mailto:support@abhicabs.com" className={linkClass}>Email</a>
              <a href="https://wa.me/910000000000" className={linkClass}>WhatsApp</a>
              <span className="text-[14px] text-white/60">24×7 Support</span>
            </div>
          </div>
        </div>

        <div className="mt-12 py-6 border-t border-white/10 flex flex-wrap gap-3.5 items-center justify-between">
          <span className="text-[13px] text-white/45">© 2026 Abhi Cabs. All Rights Reserved.</span>
          <div className="flex gap-5">
            <a href="/privacy" className="text-[13px] text-white/45 hover:!text-primary">Privacy Policy</a>
            <a href="/terms" className="text-[13px] text-white/45 hover:!text-primary">Terms</a>
            <a href="/cancellation" className="text-[13px] text-white/45 hover:!text-primary">Cancellation Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
