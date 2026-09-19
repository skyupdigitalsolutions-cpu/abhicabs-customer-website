import React from "react";

export default function LegalLayout({ title, children }) {
  return (
    <>
      <section className="pt-9 md:pt-13 pb-9 bg-gradient-to-b from-primary-tint to-bg border-b border-border">
        <div className="max-w-[1264px] mx-auto px-6">
          <div className="flex items-center gap-2 text-[13.5px] text-text-secondary mb-3.5">
            <a href="/" className="font-semibold hover:text-primary">Home</a><span>/</span><span>{title}</span>
          </div>
          <h1 className="text-[28px] md:text-[42px] font-bold tracking-tight">{title}</h1>
        </div>
      </section>
      <section className="py-14">
        <div className="max-w-[820px] mx-auto px-6">
          <p className="text-[13px] text-text-secondary mb-4.5">Last updated: 18 August 2026</p>
          <div className="flex flex-col gap-1 [&_h2]:text-[19px] [&_h2]:font-bold [&_h2]:mt-7 [&_h2]:mb-2.5 [&_h2:first-child]:mt-0 [&_p]:text-[14.5px] [&_p]:text-text-secondary [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mt-2 [&_li]:text-[14.5px] [&_li]:text-text-secondary [&_li]:leading-relaxed [&_li]:mb-1.5 [&_a]:text-primary [&_a]:font-semibold">
            {children}
          </div>
        </div>
      </section>
    </>
  );
}
