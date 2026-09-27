import React, { useEffect, useId, useState } from "react";
import { LazyMotion, domMax, m, MotionConfig, AnimatePresence, LayoutGroup, useAnimate, useReducedMotion } from "framer-motion";
import { useToast } from "../hooks/useToast";
import { createSupportTicket } from "../api/services/support";

const TOPICS = ["Booking Support", "Payment Support", "Cancellation Support", "Corporate Enquiry", "Other"];

// Homepage section placed directly before FAQ. Wired to the same backend
// endpoint the /contact page uses (POST /api/v1/contact via
// createSupportTicket) — submissions land in the `contacts` table and show
// up in Admin → Support. Submission logic is unchanged.

const EASE_OUT = [0.22, 1, 0.36, 1];
const GOLD = "linear-gradient(180deg, #FFD54A 0%, #FFC107 55%, #F0A500 100%)";

const header = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_OUT } },
};
const panel = (fromX) => ({
  hidden: { opacity: 0, x: fromX, y: 12 },
  show: {
    opacity: 1, x: 0, y: 0,
    transition: { duration: 0.7, ease: EASE_OUT, when: "beforeChildren", staggerChildren: 0.07 },
  },
});
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE_OUT } },
};

export default function ContactFormSection({ id = "contact-form" }) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState("Booking Support");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [attempt, setAttempt] = useState(0); // bumps on each failed validation → fields shake
  const [sent, setSent] = useState(false);

  // Clear a field's error as soon as the user fixes it
  const clearErr = (key) => errors[key] && setErrors((e) => ({ ...e, [key]: false }));

  async function submit(e) {
    e.preventDefault();
    const errs = {};
    if (!name.trim()) errs.name = true;
    if (!/^\d{10}$/.test(mobile.trim())) errs.mobile = true;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errs.email = true;
    if (!message.trim()) errs.message = true;
    setErrors(errs);
    if (Object.keys(errs).length) {
      setAttempt((a) => a + 1);
      toast("Please fix the highlighted fields", "error");
      return;
    }

    setSubmitting(true);
    try {
      await createSupportTicket({
        name: name.trim(),
        phone: mobile.trim(),
        email: email.trim(),
        topic,
        message: message.trim(),
      });
      toast("Message sent — our team will get back to you shortly.", "success");
      setName(""); setMobile(""); setEmail(""); setMessage(""); setTopic("Booking Support");
      setSent(true);
    } catch (err) {
      toast(err.message || "Couldn't send your message — please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  // Success panel dismisses itself after a while
  useEffect(() => {
    if (!sent) return;
    const t = setTimeout(() => setSent(false), 8000);
    return () => clearTimeout(t);
  }, [sent]);

  return (
    <LazyMotion features={domMax} strict>
      <MotionConfig reducedMotion="user">
        <section id={id} style={{ maxWidth: 1100, margin: "0 auto", padding: "clamp(46px,6vw,80px) 22px 0" }}>
          <m.div
            variants={header}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.6 }}
            style={{ textAlign: "center", margin: "0 auto 38px" }}
          >
            <m.span variants={fadeUp} style={{ display: "inline-block", fontWeight: 700, fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase", color: "#B8860B" }}>Get In Touch</m.span>
            <m.h2 variants={fadeUp} style={{ fontWeight: 800, fontSize: "clamp(26px,3.4vw,42px)", lineHeight: 1.12, margin: "8px 0 0", letterSpacing: "-.02em" }}>Send Us a Message</m.h2>
            <m.p variants={fadeUp} style={{ fontSize: 15.5, color: "#666", fontWeight: 400, margin: "8px 0 0" }}>Booking help, payments, cancellations, or anything else — we usually reply within a few hours.</m.p>
          </m.div>

          <m.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-[1fr_1.3fr]"
          >
            {/* ── Contact details (warm light card) ─────────────────── */}
            <m.aside
              variants={panel(-24)}
              className="relative isolate flex flex-col overflow-hidden rounded-[22px] border border-[#ECE9E2] bg-[linear-gradient(160deg,#FFFFFF_0%,#FFFBEE_100%)] p-7 text-[#141414] shadow-[0_24px_48px_-32px_rgba(20,20,20,0.35)]"
            >
              {/* Faint dot texture + soft gold glow */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 -z-10"
                style={{ backgroundImage: "radial-gradient(rgba(176,122,0,.07) 1px,transparent 1px)", backgroundSize: "24px 24px" }}
              />
              <m.div
                aria-hidden
                animate={{ scale: [1, 1.1, 1], opacity: [0.8, 1, 0.8] }}
                transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
                className="pointer-events-none absolute -right-24 -top-24 -z-10 h-72 w-72 rounded-full"
                style={{ background: "radial-gradient(circle, rgba(255,193,7,.22), transparent 68%)" }}
              />

              <m.h3 variants={item} className="m-0 mb-1 text-[18px] font-bold text-[#141414]">Abhi Cabs Contact Details</m.h3>
              <m.p variants={item} className="m-0 mb-6 text-[13.5px] text-[#77736A]">Reach us directly — we&apos;re happy to help.</m.p>

              <div className="flex flex-col gap-2">
                <ContactMethod
                  href="tel:+910000000000"
                  icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6.6 10.8a13 13 0 006.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.5.6.6 0 1 .5 1 1V20c0 .6-.4 1-1 1A17 17 0 013 4c0-.6.5-1 1-1h3.4c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.5.1.4 0 .8-.3 1L6.6 10.8z" fill="currentColor" /></svg>}
                  title="Phone"
                  sub="+91 00000 00000 · 24×7"
                />
                <ContactMethod
                  href="mailto:support@abhicabs.com"
                  icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.8" /><path d="M4 7l8 6 8-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>}
                  title="Email"
                  sub="support@abhicabs.com"
                />
                <ContactMethod
                  icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 21s7-6 7-11.5A7 7 0 005 9.5C5 15 12 21 12 21z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><circle cx="12" cy="9.5" r="2.4" stroke="currentColor" strokeWidth="1.8" /></svg>}
                  title="Office Address"
                  sub="#45, 2nd Floor, MG Road, Bengaluru – 560 001, Karnataka"
                />
              </div>

              {/* Availability pill — same 24×7 promise as the phone line */}
              <m.div variants={item} className="mt-auto pt-6">
                <span className="inline-flex items-center gap-2.5 rounded-full border border-[#ECE9E2] bg-white px-3.5 py-2 text-[12.5px] font-semibold text-[#3D3A33] shadow-[0_1px_2px_rgba(20,20,20,0.04)]">
                  <span className="relative grid h-2.5 w-2.5 place-items-center">
                    <m.span
                      aria-hidden
                      animate={{ scale: [1, 2.2], opacity: [0.6, 0] }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
                      className="absolute inset-0 rounded-full bg-[#22C55E]"
                    />
                    <span className="relative h-2.5 w-2.5 rounded-full bg-[#22C55E]" />
                  </span>
                  Support available 24×7
                </span>
              </m.div>
            </m.aside>

            {/* ── Form ───────────────────────────────────────────────── */}
            <m.div
              variants={panel(24)}
              className="relative overflow-hidden rounded-[22px] border border-[#ECE9E2] bg-white p-7 shadow-[0_24px_48px_-32px_rgba(20,20,20,0.35)]"
            >
              <form onSubmit={submit} noValidate>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <m.div variants={item}>
                    <FormField label="Full Name" required error={errors.name && "Please enter your name"} attempt={attempt}>
                      {(p) => <input {...p} value={name} onChange={(e) => { setName(e.target.value); clearErr("name"); }} placeholder="Your full name" autoComplete="name" />}
                    </FormField>
                  </m.div>
                  <m.div variants={item}>
                    <FormField label="Mobile Number" required error={errors.mobile && "Enter a valid 10-digit mobile number"} attempt={attempt}>
                      {(p) => <input {...p} type="tel" inputMode="numeric" value={mobile} onChange={(e) => { setMobile(e.target.value.replace(/\D/g, "")); clearErr("mobile"); }} maxLength={10} placeholder="10-digit mobile" autoComplete="tel-national" />}
                    </FormField>
                  </m.div>
                  <m.div variants={item} className="sm:col-span-2">
                    <FormField label="Email" required error={errors.email && "Please enter a valid email address"} attempt={attempt}>
                      {(p) => <input {...p} type="email" value={email} onChange={(e) => { setEmail(e.target.value); clearErr("email"); }} placeholder="you@email.com" autoComplete="email" />}
                    </FormField>
                  </m.div>

                  {/* Topic — tappable chips instead of a native <select> */}
                  <m.div variants={item} className="sm:col-span-2">
                    <TopicPicker value={topic} onChange={setTopic} />
                  </m.div>

                  <m.div variants={item} className="sm:col-span-2">
                    <FormField label="Message" required error={errors.message && "Please enter a message"} attempt={attempt}>
                      {(p) => <textarea {...p} className={`${p.className} min-h-[110px] resize-y`} placeholder="How can we help?" value={message} onChange={(e) => { setMessage(e.target.value); clearErr("message"); }} />}
                    </FormField>
                  </m.div>
                </div>

                <m.div variants={item}>
                  <SubmitButton submitting={submitting} />
                </m.div>
              </form>

              {/* Success panel slides over the form after a successful send */}
              <AnimatePresence>
                {sent && (
                  <m.div
                    key="sent"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    role="status"
                    className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/95 p-8 text-center backdrop-blur-sm"
                  >
                    <m.span
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 380, damping: 18, delay: 0.05 }}
                      className="mb-4 grid h-16 w-16 place-items-center rounded-full text-[#141414]"
                      style={{ background: GOLD, boxShadow: "0 16px 32px -14px rgba(240,165,0,.8), inset 0 1px 0 rgba(255,255,255,.55)" }}
                    >
                      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <m.path
                          d="M5 12.5l4.5 4.5L19 7.5"
                          stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.45, ease: "easeOut", delay: 0.25 }}
                        />
                      </svg>
                    </m.span>
                    <m.h3
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="m-0 text-[20px] font-extrabold text-[#141414]"
                    >
                      Message sent
                    </m.h3>
                    <m.p
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.38 }}
                      className="m-0 mt-1.5 max-w-[320px] text-[14px] leading-relaxed text-[#6B675F]"
                    >
                      Thanks for reaching out. Our team will get back to you shortly.
                    </m.p>
                    <m.button
                      type="button"
                      onClick={() => setSent(false)}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      whileTap={{ scale: 0.97 }}
                      className="mt-5 rounded-full border border-[#E8E5DE] bg-white px-5 py-2.5 text-[13.5px] font-semibold text-[#141414] transition-colors hover:border-[#F0D27A] hover:bg-[#FFFBEA]"
                    >
                      Send another message
                    </m.button>
                  </m.div>
                )}
              </AnimatePresence>
            </m.div>
          </m.div>
        </section>
      </MotionConfig>
    </LazyMotion>
  );
}

/* ── Pieces ─────────────────────────────────────────────────────────── */

function ContactMethod({ icon, title, sub, href }) {
  const Tag = href ? m.a : m.div;
  return (
    <Tag
      href={href}
      variants={item}
      initial="hidden"
      whileInView="show"
      whileHover={href ? "hover" : undefined}
      viewport={{ once: true }}
      className={`group -mx-3 flex items-start gap-3.5 rounded-2xl px-3 py-3 text-inherit no-underline transition-colors duration-200 ${
        href ? "hover:bg-[#FFF6D6] focus-visible:bg-[#FFF6D6] focus-visible:outline-none" : ""
      }`}
    >
      <span className="grid h-10 w-10 flex-none place-items-center rounded-xl border border-[#F6E3A1] bg-[#FFF7DE] text-[#B07A00] transition-colors duration-200 group-hover:border-[#FFC107] group-hover:bg-[#FFC107] group-hover:text-[#141414]">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[14.5px] font-bold text-[#141414]">{title}</div>
        <div className="text-[13px] leading-snug text-[#6B675F]">{sub}</div>
      </div>
      {href && (
        <m.span
          aria-hidden
          variants={{ hidden: { opacity: 0, x: -6 }, show: { opacity: 0, x: -6 }, hover: { opacity: 1, x: 0 } }}
          transition={{ duration: 0.2 }}
          className="self-center text-[#B07A00]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </m.span>
      )}
    </Tag>
  );
}

const FIELD_BASE =
  "w-full rounded-[12px] border px-3.5 py-3 text-base md:text-[14.5px] font-medium text-[#141414] outline-none transition-[border-color,background-color,box-shadow] duration-200 placeholder:font-normal placeholder:text-[#A8A49B]";
const FIELD_OK =
  "border-[#E8E5DE] bg-[#F8F7F3] hover:border-[#D3CFC5] hover:bg-white focus:border-[#FFC107] focus:bg-white focus:shadow-[0_0_0_4px_rgba(255,193,7,0.18)]";
const FIELD_ERR =
  "border-[#E7A58A] bg-[#FFF7F3] focus:border-[#D9653B] focus:bg-white focus:shadow-[0_0_0_4px_rgba(217,101,59,0.15)]";

// Render-prop field: gives the input its id, classes and aria wiring, and
// shakes the field when a submit fails validation.
function FormField({ label, required, error, attempt, children }) {
  const id = useId();
  const errId = `${id}-err`;
  const [scope, animate] = useAnimate();
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!error || !attempt || reduce || !scope.current) return;
    animate(scope.current, { x: [0, -7, 7, -5, 5, -2, 0] }, { duration: 0.45, ease: "easeInOut" });
  }, [attempt]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={scope} className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-bold text-[#141414]">
        {label} {required && <span className="text-[#B23B00]">*</span>}
      </label>
      {children({
        id,
        className: `${FIELD_BASE} ${error ? FIELD_ERR : FIELD_OK}`,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": error ? errId : undefined,
      })}
      <AnimatePresence initial={false}>
        {error && (
          <m.span
            key="err"
            id={errId}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden text-[12.5px] text-[#B23B00]"
          >
            {error}
          </m.span>
        )}
      </AnimatePresence>
    </div>
  );
}

function TopicPicker({ value, onChange }) {
  const groupId = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <span id={groupId} className="text-[13px] font-bold text-[#141414]">Topic</span>
      <LayoutGroup id={groupId}>
        <div role="radiogroup" aria-labelledby={groupId} className="flex flex-wrap gap-2">
          {TOPICS.map((t) => {
            const active = value === t;
            return (
              <m.button
                key={t}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onChange(t)}
                whileTap={{ scale: 0.96 }}
                className={`relative isolate rounded-full border px-3.5 py-2 text-[13px] font-semibold outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-[#FFC107] focus-visible:ring-offset-1 ${
                  active
                    ? "border-transparent text-[#141414]"
                    : "border-[#E8E5DE] bg-[#F8F7F3] text-[#3D3A33] hover:border-[#F0D27A] hover:bg-[#FFFBEA]"
                }`}
              >
                {active && (
                  <m.span
                    aria-hidden
                    layoutId="topic-pill"
                    transition={{ type: "spring", stiffness: 450, damping: 36 }}
                    className="absolute inset-0 -z-10 rounded-full"
                    style={{ background: GOLD, boxShadow: "0 8px 18px -10px rgba(240,165,0,.8), inset 0 1px 0 rgba(255,255,255,.55)" }}
                  />
                )}
                {t}
              </m.button>
            );
          })}
        </div>
      </LayoutGroup>
    </div>
  );
}

function SubmitButton({ submitting }) {
  return (
    <m.button
      type="submit"
      disabled={submitting}
      initial="rest"
      animate="rest"
      whileHover={submitting ? undefined : "hover"}
      whileTap={submitting ? undefined : { scale: 0.985 }}
      className="group relative isolate mt-6 flex h-[54px] w-full items-center justify-center overflow-hidden rounded-[14px] border-0 text-[15.5px] font-bold text-[#141414] disabled:cursor-default disabled:opacity-75"
      style={{ background: GOLD, boxShadow: "0 14px 28px -14px rgba(240,165,0,.85), inset 0 1px 0 rgba(255,255,255,.55), inset 0 -2px 0 rgba(0,0,0,.08)" }}
    >
      {/* Light sweep on hover */}
      <m.span
        aria-hidden
        variants={{ rest: { x: "-120%" }, hover: { x: "120%", transition: { duration: 0.8, ease: EASE_OUT } } }}
        className="pointer-events-none absolute inset-0 -z-10"
        style={{ background: "linear-gradient(110deg, transparent 30%, rgba(255,255,255,.55) 50%, transparent 70%)" }}
      />
      <AnimatePresence mode="wait" initial={false}>
        {submitting ? (
          <m.span key="sending" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }} className="inline-flex items-center gap-2.5">
            <m.span
              aria-hidden
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
              className="block h-4 w-4 rounded-full border-2 border-[#141414] border-t-transparent"
            />
            Sending…
          </m.span>
        ) : (
          <m.span key="idle" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }} className="inline-flex items-center gap-2.5">
            Send Message
            {/* CSS hover nudge: the label's own enter/exit animation would block variant propagation */}
            <svg
              width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden
              className="transition-transform duration-200 group-hover:translate-x-1 group-hover:-translate-y-0.5"
            >
              <path d="M4 12l16-8-6 16-2.5-6.5L4 12z" />
            </svg>
          </m.span>
        )}
      </AnimatePresence>
    </m.button>
  );
}