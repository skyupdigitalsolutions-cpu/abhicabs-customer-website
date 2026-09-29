import { isIndianMobile, cleanPhoneInput } from "../../src/lib/phone";
import React, { useRef, useState, useEffect } from "react";
import { useToast } from "../../src/hooks/useToast";
import Button from "../../src/components/ui/Button";
import { FIELD_LABEL, FIELD_INPUT } from "../../src/components/ui/classNames";
import { authApi } from "../../src/api";
import { isNotRegistered, normalisePhone } from "../../src/api/services/auth";
import { requestNotificationPermission } from "../../src/lib/firebase";
import { isAuthenticated } from "../../src/api/tokens";
import { navigate } from "vike/client/router";

// The backend OTP length is configurable (OTP_LENGTH, 4–8 digits). We accept
// any code in that range rather than hard-coding a box count, so the login
// never breaks if the server is set to 4 or 6 digits.
const OTP_MIN = 4;
const OTP_MAX = 8;

// Mask a 10-digit mobile number for display: "98•••••210".
function maskPhone(phone) {
  const p = normalisePhone(phone);
  if (p.length !== 10) return p;
  return `${p.slice(0, 2)}•••••${p.slice(-3)}`;
}

export default function Page() {
  const toast = useToast();

  // If already logged in, redirect away immediately
  useEffect(() => {
    if (isAuthenticated()) {
      const returnTo = typeof sessionStorage !== "undefined"
        ? sessionStorage.getItem("abhicabs_login_return") || "/my-booking"
        : "/my-booking";
      sessionStorage?.removeItem("abhicabs_login_return");
      navigate(returnTo);
    }
  }, []);

  const [authMode, setAuthMode] = useState("login"); // "login" | "register"
  const [step, setStep] = useState("form");          // "form" | "otp"

  // form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // otp fields
  const [code, setCode] = useState("");
  const [otpError, setOtpError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const codeRef = useRef(null);

  function resetForm() {
    setStep("form");
    setCode("");
    setOtpError("");
    setFormError("");
  }

  const goHome = () => {
    const returnTo = typeof sessionStorage !== "undefined"
      ? sessionStorage.getItem("abhicabs_login_return") || "/my-booking"
      : "/my-booking";
    sessionStorage?.removeItem("abhicabs_login_return");
    window.location.href = returnTo;
  };

  // ── Register ─────────────────────────────────────────────────────────────
  // POST /auth/register { name, email, phone } — logs in immediately
  async function submitRegister() {
    if (!name.trim())                        { setFormError("Enter your name."); return; }
    if (!/\S+@\S+\.\S+/.test(email.trim()))  { setFormError("Enter a valid email."); return; }
    if (!isIndianMobile(phone)) { setFormError("Enter a valid 10-digit mobile number."); return; }
    setFormError("");
    setSubmitting(true);
    try {
      await authApi.register({ name: name.trim(), email: email.trim(), phone: normalisePhone(phone) });
      requestNotificationPermission();
      toast("Welcome to ABHI CABS!", "success");
      setTimeout(goHome, 700);
    } catch (err) {
      setFormError(err.message || "Couldn't create your account. Please try again.");
      setSubmitting(false);
    }
  }

  // ── Login: request OTP by MOBILE NUMBER ──────────────────────────────────
  // POST /auth/otp/request { phone }
  async function submitLogin() {
    if (!isIndianMobile(phone)) {
      setFormError("Enter a valid 10-digit mobile number."); return;
    }
    setFormError("");
    setSubmitting(true);
    try {
      await authApi.requestOtp(phone);
      setCode("");
      setOtpError("");
      setStep("otp");
      setTimeout(() => codeRef.current?.focus(), 50);
    } catch (err) {
      if (isNotRegistered(err)) {
        setFormError("No account found for this mobile number.");
      } else {
        setFormError(err.message || "Couldn't send the code. Try again shortly.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function resendOtp() {
    setResending(true);
    setOtpError("");
    try {
      await authApi.requestOtp(phone);
      setCode("");
      codeRef.current?.focus();
      toast("Code resent");
    } catch (err) {
      setOtpError(err.message || "Couldn't resend. Try again.");
    } finally {
      setResending(false);
    }
  }

  function handleCodeChange(val) {
    setCode(val.replace(/\D/g, "").slice(0, OTP_MAX));
    setOtpError("");
  }

  async function submitVerify() {
    if (code.length < OTP_MIN) { setOtpError(`Enter the ${OTP_MIN}–${OTP_MAX} digit code we sent you.`); return; }
    setVerifying(true);
    setOtpError("");
    try {
      await authApi.verifyOtp(phone, code);
      requestNotificationPermission();
      toast("Welcome back!", "success");
      setTimeout(goHome, 700);
    } catch (err) {
      setOtpError(err.message || "That code didn't work. Check it and try again.");
      setCode("");
      codeRef.current?.focus();
    } finally {
      setVerifying(false);
    }
  }

  return (
    <section className="py-14 md:py-20">
      <div className="max-w-[420px] mx-auto px-6">
        <div className="bg-white border border-border rounded-2xl shadow-elevated p-8">

          {step === "form" && (
            <>
              <h2 className="text-[22px] font-bold text-center">
                {authMode === "register" ? "Create Account" : "Sign In"}
              </h2>
              <p className="text-center mt-2 text-text-secondary text-[14px]">
                {authMode === "register"
                  ? "Register to start booking your rides."
                  : "We'll send a one-time code to your mobile number."}
              </p>

              {authMode === "register" && (
                <div className="mt-6">
                  <label className={FIELD_LABEL}>Your Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Priya Sharma"
                    value={name}
                    onChange={(e) => { setName(e.target.value); setFormError(""); }}
                    className={`${FIELD_INPUT} mt-1.5`}
                  />
                </div>
              )}

              {authMode === "register" && (
                <div className="mt-4">
                  <label className={FIELD_LABEL}>Email</label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setFormError(""); }}
                    className={`${FIELD_INPUT} mt-1.5`}
                  />
                </div>
              )}

              <div className={authMode === "register" ? "mt-4" : "mt-6"}>
                <label className={FIELD_LABEL}>
                  Mobile Number {authMode === "register" && <span className="text-error">*</span>}
                </label>
                <div className="mt-1.5 flex items-center gap-2.5 border border-border rounded-[10px] px-3.5 py-3 bg-[#fbfbfe] focus-within:border-primary focus-within:bg-white">
                  <span className="text-text-secondary font-semibold">+91</span>
                  <input
                    type="tel"
                    inputMode="numeric"
                                        placeholder="10-digit mobile number"
                    value={phone}
                    onChange={(e) => { setPhone(cleanPhoneInput(e.target.value)); setFormError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && (authMode === "register" ? submitRegister() : submitLogin())}
                    className="border-none bg-transparent outline-none text-base md:text-[14.5px] w-full"
                  />
                </div>
              </div>

              {formError && (
                <div className="mt-2">
                  <span className="text-[12.5px] text-error block">{formError}</span>
                  {authMode === "login" && formError.includes("No account") && (
                    <button
                      onClick={() => { setAuthMode("register"); setFormError(""); }}
                      className="text-[12.5px] text-primary font-bold mt-1"
                    >
                      Register instead →
                    </button>
                  )}
                </div>
              )}

              <Button
                onClick={authMode === "register" ? submitRegister : submitLogin}
                size="lg" block className="mt-5"
                disabled={submitting}
              >
                {submitting
                  ? "Please wait…"
                  : authMode === "register" ? "Create Account" : "Send Code"}
              </Button>

              <p className="text-center mt-4 text-[13px] text-text-secondary">
                {authMode === "register" ? (
                  <>Already have an account?{" "}
                    <button
                      onClick={() => { setAuthMode("login"); setName(""); setEmail(""); setFormError(""); }}
                      className="text-primary font-bold"
                    >Sign In</button>
                  </>
                ) : (
                  <>New here?{" "}
                    <button
                      onClick={() => { setAuthMode("register"); setFormError(""); }}
                      className="text-primary font-bold"
                    >Create Account</button>
                  </>
                )}
              </p>

              <p className="text-center text-[12px] text-text-secondary mt-4">
                By continuing, you agree to our{" "}
                <a href="/terms" className="text-primary font-semibold">Terms</a> &amp;{" "}
                <a href="/privacy" className="text-primary font-semibold">Privacy Policy</a>.
              </p>
            </>
          )}

          {step === "otp" && (
            <>
              <h2 className="text-[22px] font-bold text-center">Enter Code</h2>
              <p className="text-center mt-2 text-text-secondary text-[14px]">
                We sent a code by SMS to{" "}
                <span className="font-semibold text-text">+91 {maskPhone(phone)}</span>
              </p>

              <div className="mt-6">
                <input
                  ref={codeRef}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  disabled={verifying}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submitVerify()}
                  placeholder="Enter code"
                  className="w-full text-center text-2xl font-bold tracking-[0.5em] border border-border rounded-[12px] py-3.5 outline-none focus:border-primary transition-colors disabled:opacity-50"
                />
              </div>

              {otpError && (
                <p className="text-[12.5px] text-error mt-3 text-center">{otpError}</p>
              )}

              <Button onClick={submitVerify} size="lg" block className="mt-6" disabled={verifying}>
                {verifying ? "Verifying…" : "Verify & Sign In"}
              </Button>

              <div className="text-center mt-5 text-[13.5px] text-text-secondary">
                <button
                  onClick={resendOtp}
                  disabled={resending}
                  className="text-primary font-bold disabled:opacity-50"
                >
                  {resending ? "Sending…" : "Resend Code"}
                </button>
                {" · "}
                <button onClick={resetForm} className="text-primary font-bold">
                  Change Number
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </section>
  );
}
