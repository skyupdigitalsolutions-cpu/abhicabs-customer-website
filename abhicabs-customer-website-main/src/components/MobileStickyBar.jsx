import React from "react";
import Button from "./ui/Button";

/**
 * Persistent bottom bar shown only below the md breakpoint, so the primary
 * action (book / continue / pay) stays reachable with a thumb on long pages
 * without duplicating the desktop layout. Pages using this should add
 * `pb-24 md:pb-0` (or similar) further up so content doesn't end up hidden
 * behind it on mobile.
 */
export default function MobileStickyBar({ label, sub, ctaLabel, href, onClick, disabled }) {
  return (
    <div
      // pb-[max(...)] is Tailwind's arbitrary-value syntax — no inline `style`
      // attribute needed for the safe-area inset.
      className="md:hidden fixed inset-x-0 bottom-0 z-[150] bg-white border-t border-border px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center justify-between gap-3 shadow-[0_-6px_20px_rgba(0,0,0,0.06)]"
    >
      <div className="min-w-0">
        {label && <div className="text-[15px] font-extrabold text-text truncate">{label}</div>}
        {sub && <div className="text-[12px] text-text-secondary truncate">{sub}</div>}
      </div>
      <Button href={href} onClick={onClick} disabled={disabled} className="shrink-0">{ctaLabel}</Button>
    </div>
  );
}
