import React, { useState } from "react";
import { useToast } from "../hooks/useToast";
import { createSupportTicket } from "../api/services/support";

const TOPICS = ["Booking Support", "Payment Support", "Cancellation Support", "Corporate Enquiry", "Other"];

// New homepage section, placed directly before FAQ. Wired to the same real
// backend endpoint the dedicated /contact page already uses
// (POST /api/v1/contact via createSupportTicket) — not a decorative form,
// submissions land in the same `contacts` table and show up immediately in
// Admin -> Support.
export default function ContactFormSection({ id = "contact-form" }) {
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
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errs.email = true;
    if (!message.trim()) errs.message = true;
    setErrors(errs);
    if (Object.keys(errs).length) {
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
    } catch (err) {
      toast(err.message || "Couldn't send your message — please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section id={id} style={{ maxWidth: 1100, margin: "0 auto", padding: "clamp(46px,6vw,80px) 22px 0" }}>
      <div style={{ textAlign: "center", margin: "0 auto 36px" }}>
        <span style={{ display: "inline-block", fontWeight: 700, fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase", color: "#B8860B" }}>Get In Touch</span>
        <h2 style={{ fontWeight: 800, fontSize: "clamp(26px,3.4vw,42px)", lineHeight: 1.12, margin: "8px 0 0", letterSpacing: "-.02em" }}>Send Us a Message</h2>
        <p style={{ fontSize: 15.5, color: "#666", fontWeight: 400, margin: "8px 0 0" }}>Booking help, payments, cancellations, or anything else — we usually reply within a few hours.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.3fr] gap-6 items-stretch">
        {/* Contact details — same real numbers/addresses used in Header/Footer */}
        <div style={{ background: "#fff", border: "1px solid #EFEFEF", borderRadius: 20, padding: 28, color: "#111" }}>
          <h3 style={{ fontWeight: 700, fontSize: 17, margin: "0 0 20px" }}>Abhi Cabs Contact Details</h3>
          <ContactMethod
            href="tel:+910000000000"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6.6 10.8a13 13 0 006.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.5.6.6 0 1 .5 1 1V20c0 .6-.4 1-1 1A17 17 0 013 4c0-.6.5-1 1-1h3.4c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.5.1.4 0 .8-.3 1L6.6 10.8z" fill="#B8860B" /></svg>}
            title="Phone"
            sub="+91 00000 00000 · 24×7"
          />
          <ContactMethod
            href="mailto:support@abhicabs.com"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2.5" stroke="#B8860B" strokeWidth="1.8" /><path d="M4 7l8 6 8-6" stroke="#B8860B" strokeWidth="1.8" strokeLinecap="round" /></svg>}
            title="Email"
            sub="support@abhicabs.com"
          />
          <ContactMethod
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 21s7-6 7-11.5A7 7 0 005 9.5C5 15 12 21 12 21z" stroke="#B8860B" strokeWidth="1.8" strokeLinejoin="round" /><circle cx="12" cy="9.5" r="2.4" stroke="#B8860B" strokeWidth="1.8" /></svg>}
            title="Office Address"
            sub="#45, 2nd Floor, MG Road, Bengaluru – 560 001, Karnataka"
            last
          />
        </div>

        <form onSubmit={submit} style={{ background: "#fff", border: "1px solid #EFEFEF", borderRadius: 20, padding: 28 }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Full Name" required error={errors.name && "Please enter your name"}>
              <input style={fieldStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" />
            </FormField>
            <FormField label="Mobile Number" required error={errors.mobile && "Enter a valid 10-digit mobile number"}>
              <input style={fieldStyle} type="tel" value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))} maxLength={10} placeholder="10-digit mobile" />
            </FormField>
            <FormField label="Email" required error={errors.email && "Please enter a valid email address"}>
              <input style={fieldStyle} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
            </FormField>
            <FormField label="Topic">
              <select style={fieldStyle} value={topic} onChange={(e) => setTopic(e.target.value)}>
                {TOPICS.map((t) => <option key={t}>{t}</option>)}
              </select>
            </FormField>
            <div className="sm:col-span-2">
              <FormField label="Message" required error={errors.message && "Please enter a message"}>
                <textarea style={{ ...fieldStyle, minHeight: 100, resize: "vertical" }} placeholder="How can we help?" value={message} onChange={(e) => setMessage(e.target.value)} />
              </FormField>
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="hover:!bg-[#FFB300]"
            style={{
              width: "100%", marginTop: 20, padding: 16, borderRadius: 12, border: "none",
              background: "#FFC107", color: "#111", fontWeight: 700, fontSize: 16,
              cursor: submitting ? "default" : "pointer", opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? "Sending…" : "Send Message"}
          </button>
        </form>
      </div>
    </section>
  );
}

function ContactMethod({ icon, title, sub, href, last }) {
  const Tag = href ? "a" : "div";
  return (
    <Tag
      href={href}
      className={href ? "hover:!opacity-80" : undefined}
      style={{ display: "flex", gap: 14, alignItems: "flex-start", paddingBottom: 18, marginBottom: 18, borderBottom: last ? "none" : "1px solid #EFEFEF", color: "inherit", textDecoration: "none" }}
    >
      <span style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(255,193,7,.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {icon}
      </span>
      <div>
        <div style={{ fontWeight: 700, fontSize: 14.5 }}>{title}</div>
        <div style={{ fontSize: 13, color: "#666" }}>{sub}</div>
      </div>
    </Tag>
  );
}

const fieldStyle = {
  width: "100%", padding: "13px 14px", borderRadius: 11, border: "1.5px solid #E5E5E5",
  background: "#F7F7F7", fontSize: 14, fontWeight: 500, color: "#111", outline: "none",
};

function FormField({ label, required, error, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label style={{ fontSize: 13, fontWeight: 700, color: "#111" }}>
        {label} {required && <span style={{ color: "#B23B00" }}>*</span>}
      </label>
      {children}
      {error && <span style={{ fontSize: 12.5, color: "#B23B00" }}>{error}</span>}
    </div>
  );
}
