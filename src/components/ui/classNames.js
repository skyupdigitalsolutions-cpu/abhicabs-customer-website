// Plain JS constants holding Tailwind utility strings — these replace the
// old `.field-input`, `.field-label`, `.eyebrow`, `.status-pill` classes that
// lived in global.css under `@apply`. Nothing here is custom CSS; it's just
// avoiding repeating the same utility string at every call site.

export const FIELD_INPUT =
  "w-full border border-border rounded-[10px] px-3.5 py-3 text-base md:text-[14.5px] text-text " +
  "bg-[#fbfbfe] outline-none transition-colors focus:border-primary focus:bg-white";

export const FIELD_LABEL = "text-[12.5px] font-bold text-text-secondary uppercase tracking-wide";

// The little dash before "TOP ROUTES" / "OUR SERVICES" style eyebrows is
// drawn with the `before:` pseudo-element variant + Tailwind's `content-['']`
// utility — no custom ::before CSS rule needed.
export const EYEBROW =
  "inline-flex items-center gap-2 text-[13px] font-bold tracking-widest uppercase text-primary mb-3.5 " +
  "before:content-[''] before:w-4.5 before:h-0.5 before:bg-primary before:rounded-full before:inline-block";

const STATUS_BASE = "text-[12px] font-bold px-3.5 py-1.5 rounded-full uppercase tracking-wide inline-block";

export const STATUS_CLASSES = {
  upcoming: `${STATUS_BASE} bg-primary-tint text-primary`,
  ongoing: `${STATUS_BASE} bg-warning-tint text-amber-700`,
  completed: `${STATUS_BASE} bg-success-tint text-green-700`,
  cancelled: `${STATUS_BASE} bg-error-tint text-red-700`
};
