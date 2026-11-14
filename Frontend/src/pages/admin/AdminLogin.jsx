import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Loader2,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileText,
} from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { CardGlare } from "@/components/CardGlare";
import { AnimatedInput } from "@/components/AnimatedInput";
import { ValidateOtp } from "@/components/ValidateOtp";
import { Button2 } from "@/components/Button2";
import { useAdminAuth } from "@/context/AdminAuthContext";
import {
  sendAdminLoginOtp,
  verifyAdminLoginOtp,
  loginAdminWithPassword,
} from "@/lib/adminAuth";

export default function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { admin, isAuthenticated, loginAdmin } = useAdminAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    remember: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Email OTP verification states
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  // If already authenticated, redirect immediately to admin dashboard
  useEffect(() => {
    if (isAuthenticated && admin && admin.email) {
      const from = location.state?.from?.pathname || "/admin/dashboard";
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, admin, navigate, location.state]);

  const isEmailFormatValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim());

  const handleSendVerificationOtp = async () => {
    if (!isEmailFormatValid || isSendingOtp) return;
    setIsSendingOtp(true);
    setErrors((prev) => ({ ...prev, email: "", general: "" }));
    try {
      await sendAdminLoginOtp(formData.email);
      setShowOtpInput(true);
      setIsOtpSent(true);
    } catch (err) {
      setShowOtpInput(false);
      setIsOtpSent(false);
      setErrors((prev) => ({
        ...prev,
        email: err.message || "Failed to send verification code to admin email.",
        general: "",
      }));
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;

    if (name === "email") {
      setIsEmailVerified(false);
      setShowOtpInput(false);
      setIsOtpSent(false);
    }

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: "",
      general: "",
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = "Please enter your admin email.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = "Please enter a valid email address.";
    } else if (!isEmailVerified) {
      newErrors.email = isOtpSent
        ? "Please enter the 6-digit verification code sent to your email."
        : "Please verify your admin email address to continue.";
      if (isOtpSent) {
        setShowOtpInput(true);
      }
    }

    if (!formData.password) {
      newErrors.password = "Please enter your admin password.";
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors((prev) => ({ ...prev, general: "" }));

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await loginAdminWithPassword({
        email: formData.email,
        password: formData.password,
        remember: formData.remember,
      });

      if (res?.token && res?.admin) {
        loginAdmin(res.token, res.admin, res.refresh_token);
        const from = location.state?.from?.pathname || "/admin/dashboard";
        navigate(from, { replace: true });
      } else {
        throw new Error("Admin login succeeded but failed to receive a valid session token.");
      }
    } catch (err) {
      const msg = err.message || "Failed to sign in as administrator. Please verify your credentials.";
      setErrors((prev) => ({
        ...prev,
        general: msg,
        password: msg.toLowerCase().includes("password") ? msg : prev.password,
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1C040E] via-[#140209] to-[#0E0106] text-[#FFF5E4] flex flex-col justify-between selection:bg-[#C73659]/30 selection:text-white relative overflow-hidden">
      {/* Deep Velvet Ambient Glows */}
      <div className="absolute -top-32 -left-32 w-[420px] h-[420px] bg-[#850E35]/25 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-[420px] h-[420px] bg-[#C73659]/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[#850E35]/12 rounded-full blur-[180px] pointer-events-none" />

      {/* Top Bar with Minimal Navigation */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between z-10">
        <Link to="/admin/login" className="flex items-center gap-3 group select-none">
          <img
            src="/banner.png"
            alt="SylloMetry Logo"
            className="h-8 sm:h-9 w-auto brightness-110 drop-shadow-[0_2px_10px_rgba(133,14,53,0.4)] group-hover:scale-105 transition-transform"
          />
          <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full bg-[#36081B] border border-[#850E35]/60 text-[#FFA8B8] text-[10px] font-extrabold tracking-wider uppercase shadow-xs">
            Admin Console
          </span>
        </Link>
      </header>

      {/* Main Login Card Section */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:px-6 z-10">
        <div className="w-full max-w-[480px]">
          <CardGlare
            theme="dark"
            innerClassName="bg-[#240614]/95 p-7 sm:p-9 rounded-3xl border border-[#850E35]/40 shadow-5xl"
            className="rounded-3xl border border-[#850E35]/40 shadow-[0_25px_70px_rgba(0,0,0,0.65)]"
          >
            {/* CARD HEADER */}
            <div className="text-center mb-7 space-y-3">

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white drop-shadow-sm">
                Admin Sign In
              </h1>

              <p className="text-xs sm:text-sm text-[#FFBAC7] max-w-sm mx-auto leading-relaxed">
                Secure access gateway for SylloMetry system administrators.
              </p>
            </div>

            {/* FORM */}
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {/* EMAIL FIELD */}
              <div>
                <AnimatedInput
                  theme="dark"
                  label="Admin Email"
                  name="email"
                  type="email"
                  placeholder="admin@syllometry.com"
                  value={formData.email}
                  onChange={handleChange}
                  icon={<Mail size={16} className="text-[#E36A6A]" />}
                  error={errors.email}
                  autoComplete="email"
                  inputClassName="bg-[#18030C] border-[#850E35]/50 text-white placeholder:text-[#A8576C] focus:border-[#C73659] focus:ring-[#C73659]/25 pr-24"
                  labelClassName="text-[#FFA8B8]"
                  labelBg="bg-[#240614]"
                  endElement={
                    isEmailVerified ? (
                      <div
                        role="status"
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 text-xs font-bold select-none"
                      >
                        <CheckCircle2 size={13} className="text-emerald-400" />
                        <span>Verified</span>
                      </div>
                    ) : isSendingOtp ? (
                      <Button2
                        type="button"
                        disabled
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#850E35] text-white text-xs font-bold transition opacity-80 cursor-wait shadow-xs"
                      >
                        <Loader2 size={12} className="animate-spin text-white" />
                        <span>Sending...</span>
                      </Button2>
                    ) : isOtpSent ? (
                      <div
                        role="status"
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#3A081D] text-[#FFA8B8] border border-[#C73659]/50 text-xs font-bold select-none"
                      >
                        <CheckCircle2 size={13} className="text-[#E36A6A]" />
                        <span>Sent</span>
                      </div>
                    ) : isEmailFormatValid ? (
                      <Button2
                        type="button"
                        onClick={handleSendVerificationOtp}
                        disabled={isSendingOtp}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#850E35] text-white text-xs font-bold hover:bg-[#A31644] transition shadow-xs disabled:opacity-60 cursor-pointer"
                      >
                        <span>Verify</span>
                      </Button2>
                    ) : null
                  }
                />
              </div>

              {/* INLINE OTP VERIFICATION (Dark Theme Variant) */}
              <AnimatePresence>
                {showOtpInput && !isEmailVerified && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, y: -8 }}
                    animate={{ opacity: 1, height: "auto", y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -8 }}
                    transition={{ duration: 0.28, ease: "easeOut" }}
                    className="overflow-hidden"
                  >
                    <ValidateOtp
                      variant="inline"
                      theme="dark"
                      email={formData.email}
                      length={6}
                      successActionText="Enter password to access admin dashboard"
                      onVerify={async (otpCode) => {
                        try {
                          await verifyAdminLoginOtp(formData.email, otpCode);
                          setIsEmailVerified(true);
                          setErrors((prev) => ({ ...prev, email: "", general: "" }));
                          setTimeout(() => {
                            setShowOtpInput(false);
                          }, 900);
                        } catch (err) {
                          throw new Error(err.message || "Invalid admin verification code.");
                        }
                      }}
                      onResend={async () => {
                        try {
                          await sendAdminLoginOtp(formData.email);
                        } catch (err) {
                          throw new Error(err.message || "Failed to resend admin code.");
                        }
                      }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* PASSWORD FIELD */}
              <div>
                <AnimatedInput
                  theme="dark"
                  label="Admin Password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleChange}
                  icon={<Lock size={16} className="text-[#E36A6A]" />}
                  error={errors.password}
                  placeholder="Enter admin password"
                  autoComplete="current-password"
                  inputClassName="bg-[#18030C] border-[#850E35]/50 text-white placeholder:text-[#A8576C] focus:border-[#C73659] focus:ring-[#C73659]/25 pr-10"
                  labelClassName="text-[#FFA8B8]"
                  labelBg="bg-[#240614]"
                  endElement={
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-[#FFA8B8]/60 hover:bg-[#36081B] hover:text-white transition-colors focus:outline-none cursor-pointer"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  }
                />
              </div>

              {/* GENERAL ERROR BANNER */}
              {errors.general && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-xl border border-rose-500/40 bg-rose-950/70 p-3 text-xs text-rose-200 animate-in fade-in duration-200"
                >
                  <AlertCircle size={16} className="shrink-0 text-rose-400 mt-0.5" />
                  <span className="leading-relaxed">{errors.general}</span>
                </div>
              )}

              {/* SUBMIT BUTTON */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#850E35] via-[#A81546] to-[#850E35] hover:brightness-110 px-6 py-3.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-[#850E35]/35 hover:shadow-xl transition-all active:scale-[0.99] disabled:opacity-60 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-white" />
                    <span>Authenticating Administrator...</span>
                  </>
                ) : (
                  <>
                    <span>Enter Admin Dashboard</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          </CardGlare>
        </div>
      </main>

      {/* Footer Note */}
      <footer className="w-full max-w-7xl mx-auto px-4 py-5 text-center text-xs text-[#FFBAC7]/50 z-10">
        SylloMetry Dedicated Administration Portal • Confidential & Restricted Access
      </footer>
    </div>
  );
}
