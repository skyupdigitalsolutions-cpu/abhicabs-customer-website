import React from "react";
import { navigate } from "vike/client/router";

/**
 * "One step back", not "start over".
 *
 * The back links on checkout/payment/booking-search were plain <a href="…">
 * to a FIXED page. Two problems with that:
 *
 *   1. A bare <a> is a full document load. Vike remounts everything and the
 *      page you came from is rebuilt from scratch — filters reset, scroll
 *      position lost, the vehicle list re-fetched. Going "back" cost more
 *      than going forward did.
 *   2. The fixed target was often not where the customer actually came from.
 *      /booking-search without the ?j= drops the priced trip; "Change Pickup
 *      Location" pointed at /#booking, i.e. all the way home.
 *
 * So: use the real history entry when there is one inside this site, which
 * restores the previous page exactly as it was. Only when there is no such
 * entry (someone opened a shared /checkout link directly) fall back to the
 * explicit `to` page.
 *
 * `to` stays on the anchor so middle-click and "open in new tab" still work.
 */

const STACK_KEY = "ac_nav_stack";

/** Called once per page mount — records where we've been within the site. */
export function recordNavStep(path) {
  if (typeof window === "undefined") return;
  try {
    const stack = JSON.parse(sessionStorage.getItem(STACK_KEY) || "[]");
    if (stack[stack.length - 1] !== path) {
      stack.push(path);
      // Only the depth matters; keep it short.
      sessionStorage.setItem(STACK_KEY, JSON.stringify(stack.slice(-10)));
    }
  } catch { /* private mode / storage disabled */ }
}

function hasInternalHistory() {
  if (typeof window === "undefined") return false;
  try {
    const stack = JSON.parse(sessionStorage.getItem(STACK_KEY) || "[]");
    return stack.length > 1;
  } catch {
    return false;
  }
}

export default function BackLink({ to, label = "Back", style, className }) {
  function onClick(e) {
    // Let the browser handle modified clicks (new tab, etc.) normally.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    if (hasInternalHistory()) {
      try {
        const stack = JSON.parse(sessionStorage.getItem(STACK_KEY) || "[]");
        stack.pop();
        sessionStorage.setItem(STACK_KEY, JSON.stringify(stack));
      } catch { /* ignore */ }
      window.history.back();
      return;
    }
    navigate(to);
  }

  return (
    <a
      href={to}
      onClick={onClick}
      className={className ?? "inline-flex items-center gap-1.5 hover:!text-[#111]"}
      style={style ?? { color: "#666", fontWeight: 600, fontSize: 13.5, marginBottom: 18 }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
    </a>
  );
}
