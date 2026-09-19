import React from "react";
import { OfferCard } from "../../src/components/SharedCards";

const OFFERS = [
  { discount: "₹500 OFF", title: "First Booking", code: "ABHI500", meta: "Valid on your first outstation trip · Min. fare ₹2,000 · Demo offer for development" },
  { discount: "10% OFF", title: "Weekday Local Rides", code: "LOCAL10", meta: "Valid Monday–Friday on local packages · Demo offer for development" },
  { discount: "₹300 OFF", title: "Airport Transfers", code: "FLYABHI", meta: "Valid on all airport pickups & drops · Demo offer for development" },
  { discount: "₹750 OFF", title: "Round Trip Getaways", code: "TRIP750", meta: "Valid on round trips over 400 km · Demo offer for development" },
  { discount: "15% OFF", title: "Corporate Accounts", code: "CORP15", meta: "For registered corporate billing accounts · Demo offer for development", ctaHref: "/contact#corporate", ctaLabel: "Contact Corporate Team" },
  { discount: "₹200 OFF", title: "Refer & Earn", code: "REFER200", meta: "When a friend completes their first ride · Demo offer for development" }
];

export default function Page() {
  return (
    <>
      <section className="pt-9 md:pt-13 pb-9 bg-gradient-to-b from-primary-tint to-bg border-b border-border">
        <div className="max-w-[1264px] mx-auto px-6">
          <Breadcrumb items={[["Home", "/"], ["Offers", null]]} />
          <h1 className="text-[28px] md:text-[42px] font-bold tracking-tight">Current Offers</h1>
          <p className="mt-2.5 text-text-secondary text-[16px]">Demo offers shown for development — replace with live offers once connected to the promotions API.</p>
        </div>
      </section>

      <section className="py-14">
        <div className="max-w-[1264px] mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5.5">
          {OFFERS.map((o) => (
            <OfferCard key={o.code} {...o} />
          ))}
        </div>
      </section>
    </>
  );
}

function Breadcrumb({ items }) {
  return (
    <div className="flex items-center gap-2 text-[13.5px] text-text-secondary mb-3.5">
      {items.map(([label, href], i) => (
        <React.Fragment key={label}>
          {i > 0 && <span>/</span>}
          {href ? <a href={href} className="font-semibold hover:text-primary">{label}</a> : <span>{label}</span>}
        </React.Fragment>
      ))}
    </div>
  );
}
