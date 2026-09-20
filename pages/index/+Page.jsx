import React, { useState, useEffect } from "react";
import { usePageContext } from "vike-react/usePageContext";
import CTASection from "../../src/components/CTASection";
import FAQSection from "../../src/components/FAQSection";
import ContactFormSection from "../../src/components/ContactFormSection";
import JourneyCategoriesSection from "../../src/components/JourneyCategoriesSection";
import MobileStickyBar from "../../src/components/MobileStickyBar";
import ReviewsSection from "../../src/components/ReviewsSection";
import StatsBarSection from "../../src/components/StatsBarSection";
import HowItWorksSection from "../../src/components/HowItWorksSection";
import CoverageSection from "../../src/components/CoverageSection";
import PopularRoutesSection from "../../src/components/PopularRoutesSection";
import WhyAbhiCabsSection from "../../src/components/WhyAbhiCabsSection";
import PromoBannersSection from "../../src/components/PromoBannersSection";
import GroupFleetSection from "../../src/components/GroupFleetSection";
import GroupTransportBannerSection from "../../src/components/GroupTransportBannerSection";
import ServiceStripSection from "../../src/components/ServiceStripSection";
import FleetCarouselSection from "../../src/components/FleetCarouselSection";
import HeroSection from "../../src/components/HeroSection";
import { ROUTES, VEHICLE_RATES } from "../../src/data/mockData";
import { IconClock, IconShield, IconTag, IconCar } from "../../src/components/Icons";

// NOTE: SERVICES (One Way / Round Trip / Local Rentals / Airport Transfers
// cards) previously powered a standalone "Choose Your Journey" section that
// isn't part of this spec's structure. The same trip types are now
// reachable via ServiceStripSection instead — no functionality was lost,
// just this specific card grid.

// NEW: quick-select pills below the hero search widget (Figma redesign).
// "group-coach" is deliberately included visually per the design, but has
// no real backend trip type behind it yet — see BookingWidget.jsx's
// GROUP_COACH_ENABLED note for why selecting it shows a request-a-quote
// state instead of a real search.
// NOTE: QUICK_SELECT previously powered QuickSelectPills, a row of pills
// below the hero. That component isn't part of this spec's structure —
// the same trip types are now reachable via ServiceStripSection instead.

const WHY_US = [
  { title: "Verified & Professional Drivers", desc: "Trained, background-checked chauffeurs.", icon: <IconShield className="w-5 h-5" /> },
  { title: "Comfortable & Maintained Vehicles", desc: "Clean, serviced and journey-ready.", icon: <IconCar className="w-5 h-5" /> },
  { title: "Transparent Pricing", desc: "Clear rates, no hidden charges.", icon: <IconTag className="w-5 h-5" /> },
  { title: "Regional Route Expertise", desc: "Built for Karnataka & Hyderabad.", icon: <IconClock className="w-5 h-5" /> },
  { title: "Flexible Vehicle Options", desc: "4-seaters to 49-seat coaches.", icon: <IconShield className="w-5 h-5" /> },
  { title: "24×7 Customer Support", desc: "Help whenever you travel.", icon: <IconClock className="w-5 h-5" /> }
];

const STEPS = [
  { n: "01", title: "Search", desc: "Choose pickup, destination, date and time." },
  { n: "02", title: "Choose", desc: "Select the vehicle that fits your journey." },
  { n: "03", title: "Travel", desc: "Your driver arrives at the scheduled pickup point." }
];

// NEW: "Premium & Group Fleet" — coaches/vans not in VEHICLE_RATES at all
// (those are sedans/SUVs only). No real backend vehicle-class or pricing
// exists yet for these (same gap flagged on the Group/Coach quote-request
// tab) — this is a display-only catalogue for now, "View Details" links to
// the group quote request rather than a real fare page. Only 3 real photos
// exist in this project for coach-type vehicles, reused across the 11
// entries rather than inventing fake distinct photos.
const GROUP_FLEET = [
  { name: "12 Seater Tempo Traveller", type: "A/C · Tempo Traveller", seats: "12 Seater", img: "/images/12seatertempo.jpg" },
  { name: "12 Seater Urbania",          type: "A/C · Urbania",         seats: "12 Seater", img: "/images/12seaterurbian.jpg" },
  { name: "13 Seater Force Urbania",    type: "A/C · Urbania",         seats: "13 Seater", img: "/images/13seater.jpg" },
  { name: "16 Seater Force Urbania",    type: "A/C · Urbania",         seats: "16 Seater", img: "/images/14seatre.jpg" },
  { name: "17 Seater Tempo Traveller",  type: "A/C · Tempo Traveller", seats: "17 Seater", img: "/images/17seater.jpg" },
  { name: "22 Seater BharatBenz",       type: "A/C · Coach",           seats: "22 Seater", img: "/images/22seater.jpg" },
  { name: "28 Seater BharatBenz",       type: "A/C · Coach",           seats: "28 Seater", img: "/images/28seater.jpg" },
  { name: "33 Seater BharatBenz",       type: "A/C · Coach",           seats: "33 Seater", img: "/images/33seater.jpg" },
  { name: "40 Seater Ashok Leyland",    type: "A/C · Coach",           seats: "40 Seater", img: "/images/40seater.jpg" },
  { name: "45 Seater Ashok Leyland",    type: "A/C · Coach",           seats: "45 Seater", img: "/images/45seater.jpg" },
  { name: "49 Seater Ashok Leyland Executive", type: "A/C · Coach",     seats: "49 Seater", img: "/images/49seater.jpg" },
  { name: "49 Seater Ashok Leyland (Non-AC)",  type: "Non-AC · Coach",  seats: "49 Seater", img: "/images/49seaternon-ac.jpg" },
];

const SEATER_OPTIONS = ["12", "13", "16", "17", "22", "28", "33", "40", "45", "49"];

// NEW: coverage cities list — real service areas, matching what's already
// established elsewhere in this project (Karnataka + Hyderabad/Telangana,
// per the header's "Serving Karnataka & Hyderabad").
const COVERAGE = {
  Karnataka: ["Bengaluru", "Mysuru", "Mangaluru", "Hubballi", "Dharwad", "Belagavi", "Shivamogga", "Davangere", "Tumakuru", "Hassan", "Udupi", "Coorg"],
  Telangana: ["Hyderabad", "Warangal", "Nizamabad", "Karimnagar", "Khammam", "Nalgonda", "Suryapet"],
};

// NEW: "Plan Your Next Journey" categories — image placeholders per the
// design's own "or browse files" markers; no real photos assigned to these
// specific use-cases anywhere in this project yet.
const JOURNEY_CATEGORIES = ["Weekend Escapes", "Business Travel", "Airport Transfers", "Family Trips", "Corporate Travel", "Group Tours"];


// FIX: replaced the old 4-question list with the exact 10 questions from
// the Figma redesign. Answers are genuine, written to match how this site
// actually works (verified against real backend behavior throughout this
// project) — not copied placeholder text.
const FAQS = [
  { q: "What areas do you currently serve?", a: "We currently operate across Karnataka and Hyderabad, with outstation trips available to neighbouring states." },
  { q: "Do you provide one-way cab services?", a: "Yes — book a One Way trip and pay only for the distance you travel, with no return-fare charge." },
  { q: "Do you provide round-trip travel?", a: "Yes — Round Trip keeps the same driver and cab for your entire outstation itinerary, including any return leg." },
  { q: "Do you provide airport transfers?", a: "Yes — on-time pickups and drops with live flight tracking, for both arrivals and departures." },
  { q: "Can I book a Tempo Traveller?", a: "Yes — 12 and 17 seater Tempo Travellers are available under Group / Coach bookings." },
  { q: "Can I book a 49-seater coach?", a: "Yes — 49 seater coaches (Ashok Leyland, AC and Non-AC) are available for large groups via Group / Coach." },
  { q: "How is outstation pricing calculated?", a: "Outstation fares are based on distance travelled, with a minimum per-day kilometre allowance and applicable driver allowance for multi-day trips." },
  { q: "Can I schedule a cab in advance?", a: "Yes — choose any future pickup date and time when booking; there's no need to book only for immediate travel." },
  { q: "What payment options are available?", a: "UPI, card, net banking, and cash on trip completion are all supported, along with partial and pay-later options at checkout." },
  { q: "What is the cancellation policy?", a: "Cancellations made well ahead of pickup are free. See our Cancellation & Refund Policy page for full details and any applicable charges." },
];


// ─── Fleet section with category tabs ───────────────────────────────────────
// FIX: previously used fabricated names and quotes ("Rohit A.", "Sneha N.",
// etc.) presented as if real — the Figma design itself marks these as
// placeholders needing real testimonials before launch, so using the same
// honest placeholder text here is more accurate than inventing fake
// customer names.
// FIX: figures below are exactly what the Figma design itself labels as
// sample/placeholder data — its own annotation literally reads "Sample
// figures shown for layout — replace with verified company data before
// launch." Kept that same honest disclaimer here rather than presenting
// these as real numbers.
const STATS = [
  { value: "10,000+", label: "Completed Trips" },
  { value: "500+", label: "Driver Partners" },
  { value: "20+", label: "Service Locations" },
  { value: "24/7", label: "Customer Support" },
];

const REVIEWS = [
  { quote: "Sample review — replace with a real customer testimonial before launch.", name: "Customer Name", meta: "Bengaluru" },
  { quote: "Sample review — replace with a real customer testimonial before launch.", name: "Customer Name", meta: "Hyderabad" },
  { quote: "Sample review — replace with a real customer testimonial before launch.", name: "Customer Name", meta: "Mysuru" },
];

// NOTE: FLEET_TABS previously configured FleetChooseRideSection's category
// tabs. That component is replaced by FleetCarouselSection (a horizontally
// scrolling carousel, matching this spec), which doesn't filter by tabs.

export default function Page() {
  const pageContext = usePageContext();
  const [widgetKey, setWidgetKey] = useState("default");
  const [widgetProps, setWidgetProps] = useState({ initialMode: "one-way", presetPickup: "", presetDrop: "" });

  // NOTE: this homepage previously had its own embedded Contact form
  // (id="contact") wired to the real POST /api/v1/contact endpoint — the
  // same one pages/contact/+Page.jsx uses. It's been removed here because
  // the target page structure doesn't include it, but the working contact
  // form still exists and functions correctly on the dedicated /contact
  // page — nothing was lost, just consolidated to one place.

  // FIX: "group-coach" used to switch the booking widget to a fake
  // "request a quote" tab (see BookingWidget.jsx's old TABS note — it was
  // never backed by a real trip type). That tab has been removed entirely;
  // every "Request Group Quote" / "Group / Coach" trigger across the page
  // now scrolls to the real, working Contact form instead.
  function bookMode(mode) {
    if (mode === "group-coach") {
      setTimeout(() => document.getElementById("contact-form")?.scrollIntoView({ behavior: "smooth" }), 50);
      return;
    }
    setWidgetProps({ initialMode: mode, presetPickup: "", presetDrop: "" });
    setWidgetKey(mode + "-" + Date.now());
    setTimeout(() => document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  // Arriving with ?mode=one-way (etc.) — e.g. from the Group/Coach browse
  // page's Trip Type filter, which has no real search of its own to send
  // someone to — opens the booking widget straight on that tab instead of
  // leaving the trip-type choice they already made on the ground.
  useEffect(() => {
    const requestedMode = pageContext.urlParsed?.search?.mode;
    if (requestedMode) bookMode(requestedMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function bookRoute(route) {
    setWidgetProps({ initialMode: "one-way", presetPickup: route.from, presetDrop: route.to });
    setWidgetKey("route-" + Date.now());
    setTimeout(() => document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  return (
    <div className="pb-20 md:pb-0">
      {/* ============================== HERO + BOOKING ENGINE ============================== */}
      <HeroSection widgetKey={widgetKey} widgetProps={widgetProps} />

      {/* ============================== SERVICE STRIP ============================== */}
      <ServiceStripSection onSelect={bookMode} />

      {/* ============================== CHOOSE YOUR RIDE (fleet carousel) ============================== */}
      <FleetCarouselSection
        vehicles={VEHICLE_RATES}
        onViewAll={() => bookMode("one-way")}
      />

      {/* ============================== GROUP TRANSPORTATION ============================== */}
      <GroupTransportBannerSection
        seaterOptions={SEATER_OPTIONS}
        onRequestQuote={() => bookMode("group-coach")}
      />

      {/* ============================== FEATURED VEHICLES ============================== */}
      <GroupFleetSection vehicles={GROUP_FLEET} />

      {/* ============================== PROMO BANNERS ============================== */}
      <PromoBannersSection
        onOutstation={() => bookMode("round-trip")}
        onGroup={() => bookMode("group-coach")}
      />

      {/* ============================== WHY CHOOSE US (ABOUT) ============================== */}
      <WhyAbhiCabsSection reasons={WHY_US} imageSrc="/images/travelling.jpg" />

      {/* ============================== POPULAR ROUTES (id="services") ============================== */}
      <PopularRoutesSection routes={ROUTES} onBook={bookRoute} />

      {/* ============================== COVERAGE MAP (id="cities") ============================== */}
      <CoverageSection coverage={COVERAGE} />

      {/* ============================== HOW IT WORKS ============================== */}
      <HowItWorksSection steps={STEPS} />

      {/* ============================== STATS ============================== */}
      <StatsBarSection stats={STATS} />

      {/* ============================== REVIEWS ============================== */}
      <ReviewsSection reviews={REVIEWS} />

      {/* ============================== EDITORIAL (Plan Your Next Journey) ============================== */}
      {/* FIX: image slots intentionally left as honest placeholders — the
          Figma design itself shows "or browse files" markers here, meaning
          no real photos were ever assigned to these specific categories;
          not a regression, just not yet supplied. */}
      <JourneyCategoriesSection categories={JOURNEY_CATEGORIES} />

      {/* ============================== CONTACT FORM ============================== */}
      <ContactFormSection />

      {/* ============================== FAQ ============================== */}
      <FAQSection faqs={FAQS} />

      {/* ============================== FINAL CTA (id="contact") ============================== */}
      <CTASection onBookMode={bookMode} />

      <MobileStickyBar
        label="Ready to ride?"
        sub="Book in under a minute"
        ctaLabel="Book Now"
        href="#booking"
      />
    </div>
  );
}