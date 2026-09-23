import React, { useState } from "react";
import { navigate } from "vike/client/router";
import { useToast } from "../../src/hooks/useToast";
import { createSupportTicket } from "../../src/api/services/support";
import Button from "../../src/components/ui/Button";
import Card from "../../src/components/ui/Card";
import { FIELD_INPUT } from "../../src/components/ui/classNames";
import { IconPhone, IconWhatsapp, IconMail, IconBriefcase } from "../../src/components/Icons";

const FAQS = [
  { q: "How do I get help with an existing booking?", a: "Use My Booking to look up your trip with your Booking ID, then choose Contact Support from that booking, or call our 24×7 line with the Booking ID handy." },
  { q: "What if my payment fails?", a: "If a payment fails, no amount is deducted. You can retry immediately with the same or a different payment method from the checkout page." },
  { q: "How do cancellations work?", a: "Cancellations made more than 1 hour before pickup are free. See our Cancellation & Refund Policy for full details." },
  { q: "Can I change my pickup time after booking?", a: "Yes — contact support with your Booking ID as early as possible and we'll do our best to accommodate the change." }
];

const TOPICS = ["Booking Support", "Payment Support", "Cancellation Support", "Corporate Enquiry", "Other"];

export default function Page() {
  const toast = useToast();
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState("Booking Support");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  async function submit(e) {
    e.preventDefault();
    const errs = {};
    if (!name.trim()) errs.name = true;
    if (!/^\d{10}$/.test(mobile.trim())) errs.mobile = true;
    // Backend's createContactSchema requires a valid email — validate it here
    // too so the user gets an inline error instead of a generic API failure.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errs.email = true;
    if (!message.trim()) errs.message = true;
    setErrors(errs);
    if (Object.keys(errs).length) {
      toast("Please fix the highlighted fields", "error");
      return;
    }

    setSubmitting(true);
    try {
      // Submits to the existing backend contact inbox: POST /api/v1/contact.
      // The submission lands in the `contacts` table and appears immediately
      // in Admin -> Support (GET /api/v1/admin/contacts).
      const result = await createSupportTicket({
        name: name.trim(),
        phone: mobile.trim(),
        email: email.trim(),
        topic,
        message: message.trim(),
      });
      // Save ticket locally so user can track status later
      if (result?.id && typeof window !== "undefined") {
        try {
          const stored = JSON.parse(localStorage.getItem("abhicabs_tickets") || "[]");
          stored.unshift({
            id: result.id,
            topic,
            message: message.trim(),
            name: name.trim(),
            email: email.trim(),
            phone: mobile.trim(),
            status: "Open",
            submittedAt: result.createdAt || new Date().toISOString(),
          });
          localStorage.setItem("abhicabs_tickets", JSON.stringify(stored.slice(0, 20)));
        } catch { /* ignore */ }
      }
      toast("Ticket raised! Redirecting to your ticket status…", "success");
      setName(""); setMobile(""); setEmail(""); setMessage(""); setTopic("Booking Support");
      setTimeout(() => navigate("/support-tickets"), 1500);
    } catch (err) {
      toast(err.message || "Couldn't send your message — please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <section className="pt-9 md:pt-13 pb-9 bg-gradient-to-b from-primary-tint to-bg border-b border-border">
        <div className="max-w-[1264px] mx-auto px-6">
          <Breadcrumb items={[["Home", "/"], ["Contact & Support", null]]} />
          <h1 className="text-[28px] md:text-[42px] font-bold tracking-tight">Contact &amp; Support</h1>
          <p className="mt-2.5 text-text-secondary text-[16px]">Reach us for booking help, payments, cancellations, or anything else.</p>
        </div>
      </section>

      <section className="py-14">
        <div className="max-w-[1264px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-[1fr_1.15fr] gap-8">
          <div>
            <Card className="p-5.5">
              <Method icon={<IconPhone className="w-5 h-5" />} title="Phone" sub="+91 80 4567 8901 · 24×7" />
              <Method icon={<IconWhatsapp className="w-5 h-5" />} title="WhatsApp" sub="+91 98450 12345" />
              <Method icon={<IconMail className="w-5 h-5" />} title="Email" sub="support@abhicabs.in" />
              <Method icon={<IconBriefcase className="w-5 h-5" />} title="Corporate Enquiries" sub="corporate@abhicabs.in" id="corporate" last />
            </Card>

            <Card className="p-5.5 mt-6">
              <h4 className="text-[15px] font-bold mb-3.5">Frequently Asked</h4>
              {FAQS.map((f, i) => (
                <details key={f.q} open={i === 0} className="border-b border-border py-4 last:border-0">
                  <summary className="font-bold text-[15px] cursor-pointer list-none flex justify-between items-center">
                    {f.q}
                    <span className="text-primary text-xl font-normal">+</span>
                  </summary>
                  <p className="mt-2.5 text-[14px] text-text-secondary leading-relaxed">{f.a}</p>
                </details>
              ))}
            </Card>
          </div>

          <form onSubmit={submit} className="bg-white border border-border rounded-2xl shadow-card p-6.5">
            <h3 className="text-[17.5px] font-bold mb-4.5">Send Us a Message</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Full Name" required error={errors.name && "Please enter your name"}>
                <input className={FIELD_INPUT} value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field label="Mobile Number" required error={errors.mobile && "Enter a valid 10-digit mobile number"}>
                <input className={FIELD_INPUT} type="tel" value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))} maxLength={10} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Email" required error={errors.email && "Please enter a valid email address"}>
                  <input className={FIELD_INPUT} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Topic">
                  <select className={FIELD_INPUT} value={topic} onChange={(e) => setTopic(e.target.value)}>
                    {TOPICS.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Message" required error={errors.message && "Please enter a message"}>
                  <textarea className={`${FIELD_INPUT} min-h-[100px]`} placeholder="How can we help?" value={message} onChange={(e) => setMessage(e.target.value)} />
                </Field>
              </div>
            </div>
            <Button type="submit" size="lg" block className="mt-5" disabled={submitting}>
              {submitting ? "Sending…" : "Send Message"}
            </Button>
          </form>
        </div>
      </section>
    </>
  );
}

function Method({ icon, title, sub, id, last }) {
  return (
    <div id={id} className={`flex gap-3.5 py-4.5 ${last ? "" : "border-b border-border"}`}>
      <div className="w-11 h-11 rounded-xl bg-primary-tint text-primary flex items-center justify-center shrink-0">{icon}</div>
      <div><b className="block text-[15px]">{title}</b><span className="text-[13.5px] text-text-secondary">{sub}</span></div>
    </div>
  );
}

function Field({ label, required, error, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13px] font-bold text-text">{label} {required && <span className="text-error">*</span>}</label>
      {children}
      {error && <span className="text-[12.5px] text-error">{error}</span>}
    </div>
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