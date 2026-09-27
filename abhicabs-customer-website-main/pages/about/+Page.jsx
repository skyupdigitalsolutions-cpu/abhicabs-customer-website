import React from "react";
import { IconCheck, IconShield } from "../../src/components/Icons";
import { EYEBROW } from "../../src/components/ui/classNames";
import SectionHead from "../../src/components/ui/SectionHead";
import Button from "../../src/components/ui/Button";
import Card from "../../src/components/ui/Card";

export default function Page() {
  return (
    <>
      <section className="pt-9 md:pt-13 pb-9 bg-gradient-to-b from-primary-tint to-bg border-b border-border">
        <div className="max-w-[1264px] mx-auto px-6">
          <Breadcrumb items={[["Home", "/"], ["About Us", null]]} />
          <h1 className="text-[28px] md:text-[42px] font-bold tracking-tight">About Abhi Cabs</h1>
          <p className="mt-2.5 text-text-secondary text-[16px] max-w-[600px]">
            A Bangalore-born cab service built around one idea: your journey is our responsibility, from the moment you book to the moment you arrive.
          </p>
        </div>
      </section>

      <section className="py-14 md:py-20">
        <div className="max-w-[1264px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-11 lg:gap-13 items-center">
          <div>
            <div className={EYEBROW}>Our Story</div>
            <h2 className="text-[30px] font-bold tracking-tight">Built by people who drive these roads every day</h2>
            <p className="mt-4 text-text-secondary text-[15.5px] leading-relaxed">
              Abhi Cabs started with a simple frustration: booking a reliable outstation cab shouldn't feel like a gamble.
              We set out to build a service where pricing is clear before you ride, drivers are properly vetted, and support
              is a real person away — not a chatbot loop. What began as a handful of trusted local drivers has grown into a
              full outstation, local and airport transfer network across Karnataka and beyond.
            </p>
            <div className="flex flex-wrap gap-9 mt-6.5">
              <Stat value="10,000+" label="Rides completed" />
              <Stat value="150+" label="Verified drivers" />
              <Stat value="25+" label="Cities covered" />
            </div>
          </div>
          <img src="/images/dashboard-pov.jpg" alt="Driver's view on an ABHI Cabs trip" className="rounded-[22px] shadow-elevated w-full aspect-[5/4] object-cover" />
        </div>
      </section>

      <section className="py-14 md:py-20 bg-white border-y border-border">
        <div className="max-w-[1264px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-11 lg:gap-13 items-center">
          <img src="/images/interior-seats.jpg" alt="Comfortable cab interior" className="rounded-[22px] shadow-elevated w-full aspect-[5/4] object-cover order-2 lg:order-1" />
          <div className="order-1 lg:order-2">
            <div className={EYEBROW}>Our Mission</div>
            <h2 className="text-[30px] font-bold tracking-tight">Make every trip predictable, comfortable and safe</h2>
            <p className="mt-4 text-text-secondary text-[15.5px] leading-relaxed">
              We measure ourselves against three things on every trip: was the price exactly what was quoted, was the car
              clean and on time, and did the passenger feel safe start to finish. If any of those slip, we hear about it —
              and we fix it.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-6.5">
              <div className="flex gap-3.5">
                <div className="w-11.5 h-11.5 rounded-xl bg-primary-tint text-primary flex items-center justify-center shrink-0"><IconCheck className="w-4.5 h-4.5" /></div>
                <div><h4 className="text-[16px] font-bold">Customer Commitment</h4><p className="mt-1 text-[14px] text-text-secondary">Fair pricing, real support, no surprises.</p></div>
              </div>
              <div className="flex gap-3.5">
                <div className="w-11.5 h-11.5 rounded-xl bg-primary-tint text-primary flex items-center justify-center shrink-0"><IconShield className="w-4.5 h-4.5" /></div>
                <div><h4 className="text-[16px] font-bold">Safety First</h4><p className="mt-1 text-[14px] text-text-secondary">Verified drivers, GPS-tracked trips, in-app SOS.</p></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-14 md:py-20">
        <div className="max-w-[1264px] mx-auto px-6">
          <SectionHead
            center
            className="mb-11"
            eyebrow="Service Coverage"
            title="Where We Drive"
            description="Outstation trips, local rentals and airport transfers across Karnataka and neighbouring states."
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5.5">
            <CoverageCard img="/images/sedan-cityscape.jpg" title="City & Local" desc="Bangalore, Mysore, Mangalore and more." />
            <CoverageCard img="/images/mountain-road-full.jpg" title="Outstation & Hill Routes" desc="Coorg, Ooty, Wayanad and beyond." />
            <CoverageCard img="/images/airport-family-full.jpg" title="Airport Transfers" desc="Kempegowda International Airport, day or night." />
          </div>
        </div>
      </section>

      <section className="pb-14 md:pb-20">
        <div className="max-w-[1264px] mx-auto px-6">
          <div className="bg-gradient-to-br from-primary-dark to-primary rounded-[22px] p-9 md:p-13 text-white grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-7.5 items-center">
            <div>
              <h2 className="text-[30px] font-bold tracking-tight">Ready when you are</h2>
              <p className="mt-3 text-white/85 text-[15.5px]">Book your next ride in under a minute, or reach out if you'd like to talk to our team first.</p>
            </div>
            <div className="flex lg:justify-end">
              <Button href="/#booking" variant="inverse" size="lg">Book a Cab</Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function Stat({ value, label }) {
  return (
    <div>
      <b className="text-[28px] font-extrabold text-primary block">{value}</b>
      <span className="text-[13px] text-text-secondary">{label}</span>
    </div>
  );
}

function CoverageCard({ img, title, desc }) {
  return (
    <Card className="overflow-hidden">
      <img src={img} alt={title} className="aspect-[4/2.6] object-cover w-full" />
      <div className="p-5">
        <h4 className="text-[16px] font-bold">{title}</h4>
        <p className="text-text-secondary text-[13.5px] mt-1.5">{desc}</p>
      </div>
    </Card>
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
