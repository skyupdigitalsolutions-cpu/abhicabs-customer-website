import React, { useRef, useState } from "react";
import { useToast } from "../../src/hooks/useToast";
import Button from "../../src/components/ui/Button";
import { FIELD_LABEL, FIELD_INPUT } from "../../src/components/ui/classNames";
import { authApi } from "../../src/api";
import { hasPlaceholderEmail, isNotRegistered } from "../../src/api/services/auth";
import { requestNotificationPermission } from "../../src/lib/firebase";

const OTP_LENGTH = 6; // matches the real backend's OTP_LENGTH (see src/config/env.js)

export default function Page() {
  const toast = useToast();
  const [authMode, setAuthMode] = useState("login"); // "login" | "register"
  const [step, setStep] = useState("form"); // form -> otp -> email

  const [mobile, setMobile] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(""));
  const [otpError, setOtpError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [profileEmail, setProfileEmail] = useState("");
  const otpRefs = useRef([]);

  function resetForm() {
    setStep("form");
    setOtp(Array(OTP_LENGTH).fill(""));
    setOtpError("");
    setFormError("");
  }

  // ── Register — real backend: POST /auth/register { name, email, phone }.
  // Logs in immediately; there's no OTP step for registration at all.
  async function submitRegister() {
    if (!name.trim()) { setFormError("Enter your name."); return; }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setFormError("Enter a valid email."); return; }
    if (!/^\d{10}$/.test(mobile.trim())) { setFormError("Enter a valid 10-digit mobile number."); return; }
    setFormError("");
    setSubmitting(true);
    try {
      await authApi.register({ name: name.trim(), email: email.trim(), phone: mobile.trim() });
      requestNotificationPermission();
      toast("Welcome to ABHI CABS!", "success");
      setTimeout(() => { window.location.href = "/my-booking"; }, 700);
    } catch (err) {
      setFormError(err.message || "Couldn't create your account. Please try again.");
      setSubmitting(false);
    }
  }

  // ── Login — real backend: POST /auth/otp/request { phone }. Now
  // explicitly refuses (404 NOT_REGISTERED) if this number has no account.
  async function submitLogin() {
    if (!/^\d{10}$/.test(mobile.trim())) { setFormError("Enter a valid 10-digit mobile number."); return; }
    setFormError("");
    setSubmitting(true);
    try {
      await authApi.requestOtp(mobile.trim());
    } catch (err) {
      if (isNotRegistered(err)) {
        setFormError("This number isn't registered yet.");
      } else {
        setFormError(err.message || "Couldn't send the code right now. Please try again shortly.");
      }
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    setOtp(Array(OTP_LENGTH).fill(""));
    setOtpError("");
    setStep("otp");
    setTimeout(() => otpRefs.current[0]?.focus(), 50);
  }

  async function resendOtp() {
    setResending(true);
    setOtpError("");
    try {
      await authApi.requestOtp(mobile.trim());
      setOtp(Array(OTP_LENGTH).fill(""));
      otpRefs.current[0]?.focus();
      toast("Code resent");
    } catch (err) {
      setOtpError(err.message || "Couldn't resend the code. Please try again.");
    } finally {
      setResending(false);
    }
  }

  function handleOtpChange(i, val) {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[i] = digit;
    setOtp(next);
    setOtpError("");
    if (digit && otpRefs.current[i + 1]) otpRefs.current[i + 1].focus();
  }

  function handleOtpKeyDown(i, e) {
    if (e.key === "Backspace" && !otp[i] && otpRefs.current[i - 1]) otpRefs.current[i - 1].focus();
  }

  async function verifyOtp() {
    const code = otp.join("");
    if (code.length < OTP_LENGTH) {
      setOtpError(`Enter all ${OTP_LENGTH} digits.`);
      return;
    }
    setVerifying(true);
    setOtpError("");
    try {
      const result = await authApi.verifyOtp(mobile.trim(), code);
      requestNotificationPermission();

      // Only a legacy pre-redesign account might still have a placeholder
      // email — a real login never needs to ask for one otherwise.
      const u = result.user || {};
      if (hasPlaceholderEmail(u.email)) {
        setStep("email");
      } else {
        toast("Welcome back!", "success");
        setTimeout(() => { window.location.href = "/my-booking"; }, 700);
      }
    } catch (err) {
      setOtpError(err.message || "That code didn't work. Check it and try again.");
      setOtp(Array(OTP_LENGTH).fill(""));
      otpRefs.current[0]?.focus();
    } finally {
      setVerifying(false);
    }
  }

  async function finishWithEmail(skip) {
    if (!skip && profileEmail.trim()) {
      try { await authApi.updateProfile({ email: profileEmail.trim() }); } catch { /* optional, ignore failure */ }
    }
    toast("Welcome back!", "success");
    setTimeout(() => { window.location.href = "/my-booking"; }, 700);
  }

  return (
    <section className="py-14 md:py-20">
      <div className="max-w-[420px] mx-auto px-6">
        <div className="bg-white border border-border rounded-2xl shadow-elevated p-8">
          {step === "form" && (
            <>
              <h2 className="text-[22px] font-bold text-center">
                {authMode === "register" ? "Register" : "Login"}
              </h2>
              <p className="text-center mt-2 text-text-secondary text-[14px]">
                {authMode === "register" ? "New here? Create your account." : "Enter your mobile number to continue"}
              </p>

              {authMode === "register" && (
                <>
                  <div className="mt-6.5">
                    <label className={FIELD_LABEL}>Your name</label>
                    <input type="text" placeholder="e.g. Priya Sharma" value={name}
                      onChange={(e) => setName(e.target.value)} className={`${FIELD_INPUT} mt-1.5`} />
                  </div>
                  <div className="mt-4">
                    <label className={FIELD_LABEL}>Email</label>
                    <input type="email" placeholder="you@example.com" value={email}
                      onChange={(e) => setEmail(e.target.value)} className={`${FIELD_INPUT} mt-1.5`} />
                  </div>
                </>
              )}

              <div className={authMode === "register" ? "mt-4" : "mt-6.5"}>
                <label className={FIELD_LABEL}>Mobile Number <span className="text-error">*</span></label>
                <div className="mt-1.5 flex items-center gap-2.5 border border-border rounded-[10px] px-3.5 py-3 bg-[#fbfbfe] focus-within:border-primary focus-within:bg-white">
                  <span className="text-text-secondary font-semibold">+91</span>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="10-digit mobile number"
                    value={mobile}
                    onChange={(e) => { setMobile(e.target.value.replace(/\D/g, "")); setFormError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && (authMode === "register" ? submitRegister() : submitLogin())}
                    className="border-none bg-transparent outline-none text-base md:text-[14.5px] w-full"
                  />
                </div>
              </div>

              {formError && (
                <div className="mt-2">
                  <span className="text-[12.5px] text-error block">{formError}</span>
                  {authMode === "login" && formError.includes("isn't registered") && (
                    <button onClick={() => { setAuthMode("register"); setFormError(""); }} className="text-[12.5px] text-primary font-bold mt-1">
                      Register instead →
                    </button>
                  )}
                </div>
              )}

              <Button
                onClick={authMode === "register" ? submitRegister : submitLogin}
                size="lg" block className="mt-4" disabled={submitting}
              >
                {submitting ? "Please wait…" : authMode === "register" ? "Create Account" : "Send OTP"}
              </Button>

              <p className="text-center mt-4 text-[13px] text-text-secondary">
                {authMode === "register" ? (
                  <>Already have an account?{" "}
                    <button onClick={() => { setAuthMode("login"); setName(""); setEmail(""); setFormError(""); }} className="text-primary font-bold">Login</button>
                  </>
                ) : (
                  // FIX: this used to also show an unconditional "New here?
                  // Register" link, freely reachable without ever entering a
                  // phone number first. A returning customer who forgot they
                  // already had an account could click straight through to
                  // Register and create a SECOND account with the same phone
                  // number but a different email — POST /auth/register only
                  // checks email uniqueness, not phone, so nothing stopped
                  // this at the database level either. The only remaining
                  // path to Register is now the "Register instead →" link
                  // above, which only appears after a real login attempt
                  // confirms this phone genuinely has no account yet — so a
                  // returning customer is always caught and logged in
                  // instead of duplicated.
                  <>New here? Just enter your mobile number above to get started.</>
                )}
              </p>

              <p className="text-center text-[12px] text-text-secondary mt-4">
                By continuing, you agree to our <a href="/terms" className="text-primary font-semibold">Terms</a> &amp;{" "}
                <a href="/privacy" className="text-primary font-semibold">Privacy Policy</a>.
              </p>
            </>
          )}

          {step === "otp" && (
            <>
              <h2 className="text-[22px] font-bold text-center">Verify OTP</h2>
              <p className="text-center mt-2 text-text-secondary text-[14px]">We've sent a {OTP_LENGTH}-digit code to +91 {mobile}</p>
              <div className="flex gap-2 justify-between mt-6.5">
                {otp.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => (otpRefs.current[i] = el)}
                    maxLength={1}
                    inputMode="numeric"
                    value={d}
                    disabled={verifying}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    className="w-9.5 h-13 text-center text-xl font-bold border border-border rounded-[10px] outline-none focus:border-primary disabled:opacity-50"
                  />
                ))}
              </div>
              {otpError && <p className="text-[12.5px] text-error mt-3 text-center">{otpError}</p>}
              <Button onClick={verifyOtp} size="lg" block className="mt-6" disabled={verifying}>
                {verifying ? "Verifying…" : "Verify & Continue"}
              </Button>
              <div className="text-center mt-5 text-[13.5px] text-text-secondary">
                <button onClick={resendOtp} disabled={resending} className="text-primary font-bold disabled:opacity-50">
                  {resending ? "Sending…" : "Resend OTP"}
                </button>
                {" · "}
                <button onClick={resetForm} className="text-primary font-bold">
                  Change Number
                </button>
              </div>
            </>
          )}

          {step === "email" && (
            // Only reached for a legacy account (created before email
            // became a required registration field) that still carries a
            // placeholder email.
            <>
              <h2 className="text-[22px] font-bold text-center">Almost there</h2>
              <p className="text-center mt-2 text-text-secondary text-[14px]">Add an email (optional) to receive booking receipts</p>
              <div className="mt-6.5">
                <label className={FIELD_LABEL}>Email</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && finishWithEmail(false)}
                  className={`${FIELD_INPUT} mt-1.5`}
                />
              </div>
              <Button onClick={() => finishWithEmail(false)} size="lg" block className="mt-4">Continue</Button>
              <button onClick={() => finishWithEmail(true)} className="w-full text-center mt-3 text-[13px] text-text-secondary font-semibold">
                Skip for now
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}