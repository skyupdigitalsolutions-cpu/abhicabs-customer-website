import { useEffect, useRef, useState } from "react";
import Button from "./ui/Button";
import { FIELD_LABEL, FIELD_INPUT } from "./ui/classNames";
import { IconCheckCircle, IconClose } from "./Icons";
import { authApi } from "../api";
import { isNotRegistered } from "../api/services/auth";
import { isAuthenticated } from "../api/tokens";
import { requestNotificationPermission } from "../lib/firebase";

const STORAGE_KEY = "abhicabs_login_popup_dismissed";
const OTP_LENGTH = 6;

export default function LoginPopup() {
  const [visible, setVisible] = useState(false);
  const [authMode, setAuthMode] = useState("login"); // "login" | "register"
  const [step, setStep] = useState("form");           // "form" | "otp"
  const [done, setDone] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(""));
  const [otpError, setOtpError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const otpRefs = useRef([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isAuthenticated()) return;
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) {
      const timer = setTimeout(() => setVisible(true), 4000);
      return () => clearTimeout(timer);
    }
  }, []);

  function dismiss() {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, "1");
  }

  function resetForm() {
    setStep("form");
    setOtp(Array(OTP_LENGTH).fill(""));
    setOtpError("");
    setFormError("");
  }

  // ── Register — POST /auth/register { name, email, phone } ────────────────
  async function submitRegister() {
    if (!name.trim())                        { setFormError("Enter your name."); return; }
    if (!/\S+@\S+\.\S+/.test(email.trim())) { setFormError("Enter a valid email."); return; }
    if (!/^\d{10}$/.test(phone.trim()))      { setFormError("Enter a valid 10-digit mobile number."); return; }
    setFormError("");
    setSubmitting(true);
    try {
      await authApi.register({ name: name.trim(), email: email.trim(), phone: phone.trim() });
      requestNotificationPermission();
      setDone(true);
      setTimeout(() => { window.location.reload(); }, 1800);
    } catch (err) {
      setFormError(err.message || "Couldn't create your account. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Login — POST /auth/otp/request { email } ─────────────────────────────
  async function submitLogin() {
    if (!/\S+@\S+\.\S+/.test(email.trim())) { setFormError("Enter a valid email."); return; }
    setFormError("");
    setSubmitting(true);
    try {
      await authApi.requestOtp(email.trim());
      setOtp(Array(OTP_LENGTH).fill(""));
      setOtpError("");
      setStep("otp");
      setTimeout(() => otpRefs.current[0]?.focus(), 50);
    } catch (err) {
      if (isNotRegistered(err)) {
        setFormError("No account found for this email.");
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
      await authApi.requestOtp(email.trim());
      setOtp(Array(OTP_LENGTH).fill(""));
      otpRefs.current[0]?.focus();
    } catch (err) {
      setOtpError(err.message || "Couldn't resend. Try again.");
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
    if (e.key === "Backspace" && !otp[i] && otpRefs.current[i - 1])
      otpRefs.current[i - 1].focus();
  }

  async function submitVerify() {
    const code = otp.join("");
    if (code.length < OTP_LENGTH) { setOtpError(`Enter all ${OTP_LENGTH} digits.`); return; }
    setVerifying(true);
    setOtpError("");
    try {
      await authApi.verifyOtp(email.trim(), code);
      requestNotificationPermission();
      setDone(true);
      setTimeout(() => { window.location.reload(); }, 1800);
    } catch (err) {
      setOtpError(err.message || "That code didn't work. Try again.");
      setOtp(Array(OTP_LENGTH).fill(""));
      otpRefs.current[0]?.focus();
    } finally {
      setVerifying(false);
    }
  }

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={dismiss}
    >
      <div
        className="bg-white rounded-2xl max-w-[400px] w-full p-7 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={dismiss} className="absolute top-4 right-4 text-text-secondary hover:text-text">
          <IconClose className="w-5 h-5" />
        </button>

        {/* Success */}
        {done ? (
          <div className="text-center py-6">
            <IconCheckCircle className="w-12 h-12 text-success mx-auto mb-3" />
            <h2 className="text-[19px] font-bold">
              {authMode === "register" ? "Welcome to ABHI CABS!" : "Welcome back!"}
            </h2>
            <p className="text-text-secondary text-[13.5px] mt-1.5">You're logged in successfully.</p>
          </div>

        ) : step === "form" ? (
          <>
            <h2 className="text-[21px] font-bold text-center">
              {authMode === "register" ? "Create Account" : "Sign In"}
            </h2>
            <p className="text-center mt-1.5 text-text-secondary text-[13.5px]">
              {authMode === "register"
                ? "Register to start booking your rides."
                : "We'll send a one-time code to your email."}
            </p>

            {authMode === "register" && (
              <div className="mt-5">
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

            <div className={authMode === "register" ? "mt-3.5" : "mt-5"}>
              <label className={FIELD_LABEL}>Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setFormError(""); }}
                onKeyDown={(e) => e.key === "Enter" && authMode === "login" && submitLogin()}
                className={`${FIELD_INPUT} mt-1.5`}
              />
            </div>

            {authMode === "register" && (
              <div className="mt-3.5">
                <label className={FIELD_LABEL}>Mobile Number <span className="text-error">*</span></label>
                <div className="mt-1.5 flex items-center gap-2.5 border border-border rounded-[10px] px-3.5 py-3 bg-[#fbfbfe] focus-within:border-primary focus-within:bg-white">
                  <span className="text-text-secondary font-semibold">+91</span>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="10-digit number"
                    value={phone}
                    onChange={(e) => { setPhone(e.target.value.replace(/\D/g, "")); setFormError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && submitRegister()}
                    className="border-none bg-transparent outline-none text-[14.5px] w-full"
                  />
                </div>
              </div>
            )}

            {formError && (
              <div className="mt-2">
                <span className="text-[12px] text-error block">{formError}</span>
                {authMode === "login" && formError.includes("No account") && (
                  <button
                    onClick={() => { setAuthMode("register"); setFormError(""); }}
                    className="text-[12px] text-primary font-bold mt-1"
                  >
                    Register instead →
                  </button>
                )}
              </div>
            )}

            <Button
              onClick={authMode === "register" ? submitRegister : submitLogin}
              size="lg" block className="mt-4"
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
                    onClick={() => { setAuthMode("login"); setName(""); setPhone(""); setFormError(""); }}
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
          </>

        ) : (
          /* OTP verify step */
          <>
            <h2 className="text-[21px] font-bold text-center">Enter Code</h2>
            <p className="text-center mt-1.5 text-text-secondary text-[13.5px]">
              Code sent to <span className="font-semibold text-text">{email}</span>
            </p>

            <div className="flex gap-2 justify-between mt-6">
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
                  className="w-10 h-13 text-center text-xl font-bold border border-border rounded-[10px] outline-none focus:border-primary transition-colors disabled:opacity-50"
                />
              ))}
            </div>

            {otpError && (
              <p className="text-[12.5px] text-error mt-3 text-center">{otpError}</p>
            )}

            <Button onClick={submitVerify} size="lg" block className="mt-6" disabled={verifying}>
              {verifying ? "Verifying…" : "Verify & Sign In"}
            </Button>

            <div className="text-center mt-4 text-[13.5px] text-text-secondary">
              <button
                onClick={resendOtp}
                disabled={resending}
                className="text-primary font-bold disabled:opacity-50"
              >
                {resending ? "Sending…" : "Resend Code"}
              </button>
              {" · "}
              <button onClick={resetForm} className="text-primary font-bold">Change Email</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
