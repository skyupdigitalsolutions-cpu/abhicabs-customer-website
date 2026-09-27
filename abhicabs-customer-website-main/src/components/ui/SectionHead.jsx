import React from "react";

// Brand-aligned section head — yellow underline accent matching brand guidelines
export default function SectionHead({ eyebrow, title, description, center = false, className = "" }) {
  return (
    <div className={`max-w-[640px] ${center ? "text-center mx-auto" : ""} ${className}`.trim()}>
      {eyebrow && (
        <div className={`flex items-center gap-2.5 mb-3 ${center ? "justify-center" : ""}`}>
          {/* Brand yellow underline bar — matches the short yellow rule in brand guidelines */}
          <span className="h-[3px] w-8 bg-primary rounded-full" />
          <span className="text-[12px] font-black uppercase tracking-[0.2em] text-text-secondary">{eyebrow}</span>
        </div>
      )}
      <h2 className="text-[28px] md:text-[38px] font-black tracking-tight text-text">{title}</h2>
      {description && <p className="mt-3 text-[17px] text-text-secondary">{description}</p>}
    </div>
  );
}
