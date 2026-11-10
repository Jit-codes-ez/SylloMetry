import React, { useState } from "react";
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Loader2,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  BriefcaseBusiness,
  LayoutDashboard,
  TrendingUp,
} from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import TextAnimation from '@/components/TextAnimation';
import { CardGlare } from "@/components/CardGlare";
import { AnimatedInput } from "@/components/AnimatedInput";
import { GoogleButton } from "@/components/GoogleButton";
import { ValidateOtp } from "@/components/ValidateOtp";
import { Button1 } from "@/components/Button1";
import { Button2 } from "@/components/Button2";
import { useAuth } from "@/context/AuthContext";
import {
  getGoogleSignupUrl,
  loginWithPassword,
  sendLoginOtp,
  verifyLoginOtp,
} from "@/lib/auth";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, login } = useAuth();

  // If user is already authenticated with a valid profile, redirect immediately to dashboard
  React.useEffect(() => {
    if (isAuthenticated && user && (user.id || user.email)) {
      const from = location.state?.from?.pathname || "/dashboard";
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, user, navigate, location.state]);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    remember: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  // Email OTP verification states
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  const isEmailFormatValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim());

  const handleSendVerificationOtp = async () => {
    if (!isEmailFormatValid || isSendingOtp) return;
    setIsSendingOtp(true);
    setErrors((prev) => ({ ...prev, email: "", general: "" }));
    try {
      await sendLoginOtp(formData.email);
      setShowOtpInput(true);
      setIsOtpSent(true);
    } catch (err) {
      setShowOtpInput(false);
      setIsOtpSent(false);
      setErrors((prev) => ({
        ...prev,
        email: err.message || "Failed to send verification code.",
        general: "",
      }));
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleGoogleAuth = async () => {
    setIsGoogleSubmitting(true);
    setErrors((prev) => ({ ...prev, general: "" }));
    try {
      sessionStorage.setItem("oauth_mode", "signin");
      localStorage.setItem("oauth_mode", "signin");
      const authUrl = await getGoogleSignupUrl();
      window.location.href = authUrl;
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        general: err.message || "Failed to initiate Google sign in.",
      }));
      setIsGoogleSubmitting(false);
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
      newErrors.email = "Please enter your email.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = "Please enter a valid email.";
    } else if (!isEmailVerified) {
      newErrors.email = isOtpSent
        ? "Please enter the verification code sent to your email."
        : "Please verify your email address to continue.";
      if (isOtpSent) {
        setShowOtpInput(true);
      }
    }

    if (!formData.password) {
      newErrors.password = "Please enter your password.";
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
      const res = await loginWithPassword({
        email: formData.email,
        password: formData.password,
        remember: formData.remember,
      });

      if (res?.session?.access_token) {
        await login(res.session.access_token, res.user, res.session.refresh_token);
        if (res.session.refresh_token) {
          localStorage.setItem("supabase_refresh_token", res.session.refresh_token);
        }
      }

      const from = location.state?.from?.pathname || "/dashboard";
      navigate(from, { replace: true });
    } catch (err) {
      const msg = err.message || "Failed to sign in. Please verify your credentials.";
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
    <div className="min-h-screen bg-[#FFFBF1] text-[#850E35] pt-20 md:pt-24">
      <div className="relative min-h-[calc(100vh-80px)] overflow-hidden bg-[#FFFBF1]">
        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <div className="grid min-h-[calc(100vh-160px)] items-center gap-10 lg:grid-cols-[0.9fr_1fr]">

            {/* LOGIN CARD (LEFT) */}
            <div className="mx-auto w-full max-w-[520px]" data-reveal>

                <CardGlare className="rounded-2xl border border-[#850E35]/10 bg-white p-6 shadow-[0_20px_60px_rgba(133,14,53,0.08)] sm:p-8">

                  {/* CARD HEADER */}
                  <div className="mb-7">
                    <h2 className="text-2xl font-bold tracking-tight text-center">
                      Welcome back
                    </h2>

                    <p className="mt-2 text-xs leading-5 text-[#850E35]/50 text-center">
                      Sign in to continue your SylloMetry journey.
                    </p>
                  </div>

                  {/* LOGIN FORM */}
                  <form
                    onSubmit={handleSubmit}
                    className="space-y-5"
                    noValidate
                  >
                  {/* EMAIL */}
                  <AnimatedInput label="Email Address"
                                        name="email"
                                        type="email"
                                        placeholder="you@example.com"
                                        value={formData.email}
                                        onChange={handleChange}
                                        icon={<Mail size={16} />}
                                        error={errors.email}
                                        autoComplete="email"
                                        inputClassName="pr-24"
                                        endElement={
                                          isEmailVerified ? (
                                            <div
                                              role="status"
                                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold select-none"
                                            >
                                              <CheckCircle2 size={13} />
                                              <span>Verified</span>
                                            </div>
                                          ) : isSendingOtp ? (
                                            <Button2
                                              type="button"
                                              disabled
                                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#850E35] text-white text-xs font-bold transition shadow-xs opacity-80 cursor-wait"
                                            >
                                              <Loader2 size={12} className="animate-spin text-white" />
                                              <span>Sending...</span>
                                            </Button2>
                                          ) : isOtpSent ? (
                                            <div
                                              role="status"
                                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FFF5E4] text-[#850E35] border border-[#850E35]/20 text-xs font-bold select-none"
                                            >
                                              <CheckCircle2 size={13} />
                                              <span>Sent</span>
                                            </div>
                                          ) : isEmailFormatValid ? (
                                            <Button2
                                              type="button"
                                              onClick={handleSendVerificationOtp}
                                              disabled={isSendingOtp}
                                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#850E35] text-white text-xs font-bold hover:bg-[#6e092c] transition shadow-xs disabled:opacity-60 cursor-pointer"
                                            >
                                              <span>Verify</span>
                                            </Button2>
                                          ) : null
                                        }
                                      />

                    {/* OTP VERIFICATION COMPONENT (Appears after email with smooth animation) */}
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
                            email={formData.email}
                            length={6}
                            successActionText="Enter your password to sign in"
                            onVerify={async (otpCode) => {
                              try {
                                await verifyLoginOtp(formData.email, otpCode);
                                setIsEmailVerified(true);
                                setErrors((prev) => ({ ...prev, email: "", general: "" }));
                                setTimeout(() => {
                                  setShowOtpInput(false);
                                }, 1000);
                              } catch (err) {
                                throw new Error(err.message || "Invalid verification code.");
                              }
                            }}
                            onResend={async () => {
                              try {
                                await sendLoginOtp(formData.email);
                              } catch (err) {
                                throw new Error(err.message || "Failed to resend code.");
                              }
                            }}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* PASSWORD */}
                    <div>
                      <AnimatedInput
                        label="Password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={handleChange}
                        icon={<Lock size={16} />}
                        error={errors.password}
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        endElement={
                          <button
                            type="button"
                            onClick={() => setShowPassword((prev) => !prev)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-[#850E35]/40 hover:bg-[#FFF5E4] hover:text-[#850E35] transition-colors focus:outline-none cursor-pointer"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                          >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        }
                      />

                      <div className="mt-1.5 flex justify-end">
                        <Link
                          to="/forgot-password"
                          className="text-[10px] font-semibold text-[#850E35]/55 transition hover:text-[#E36A6A]"
                        >
                          Forgot password?
                        </Link>
                      </div>
                    </div>

                    {/* GENERAL ERROR MESSAGE */}
                    {errors.general && (
                      <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-center text-xs font-medium text-red-600 animate-in fade-in duration-200">
                        {errors.general}
                      </div>
                    )}

                    {/* LOGIN BUTTON */}
                    <Button1
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full rounded-xl py-3.5 text-sm font-semibold text-[#FFFBF1] shadow-md shadow-[#850E35]/20 hover:shadow-lg hover:shadow-[#850E35]/30 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSubmitting ? (
                        <span className="inline-flex items-center gap-2">
                          <Loader2 size={16} className="animate-spin text-[#FFFBF1]" />
                          <span>Signing in...</span>
                        </span>
                      ) : (
                        "Sign in"
                      )}
                    </Button1>
                  </form>

                  {/* DIVIDER */}
                  <div className="relative my-6 flex items-center justify-center">
                    <div className="w-full border-t border-[#850E35]/10" />
                    <span className="absolute bg-white px-3 text-[10px] font-bold uppercase tracking-wider text-[#850E35]/40">
                      Or continue with Google
                    </span>
                  </div>

                  {/* GOOGLE SIGN IN BUTTON */}
                  <GoogleButton
                    text="Sign in with Google"
                    isLoading={isGoogleSubmitting}
                    disabled={isSubmitting}
                    onClick={handleGoogleAuth}
                  />

                  {/* GENERAL GOOGLE / OAUTH ERROR MESSAGE */}
                  {errors.google && (
                    <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-center text-xs font-medium text-red-600 animate-in fade-in duration-200">
                      {errors.google}
                    </div>
                  )}

                  {/* REGISTER */}
                  <div className="mt-6 border-t border-[#850E35]/10 pt-5 text-center">
                    <p className="text-xs text-[#850E35]/50">
                      Don't have an account?{" "}
                      <Link
                        to="/signup"
                        className="font-bold text-[#850E35] transition hover:text-[#E36A6A]"
                      >
                        Create account
                      </Link>
                    </p>
                  </div>
                </CardGlare>
            </div>

            {/* RIGHT CONTENT (TEXT) */}
            <div className="hidden lg:block lg:pl-4" data-reveal>
              {/* Main heading - split into two synchronized lines */}
              <div className="max-w-xl text-5xl font-bold leading-[1.05] tracking-tight xl:text-6xl text-[#850E35]">
                <TextAnimation
                  as="h1"
                  animation="slideUp"
                  by="word"
                  delay={0.15}
                  duration={0.4}
                >
                  Your personalized
                </TextAnimation>

                <TextAnimation
                  as="span"
                  animation="slideUp"
                  by="word"
                  delay={0.3}
                  duration={0.4}
                  className="block text-[#E36A6A]"
                >
                  career dashboard.
                </TextAnimation>
              </div>

              {/* Subtitle / Description */}
              <TextAnimation
                as="p"
                animation="fadeIn"
                by="word"
                delay={0.45}
                duration={0.5}
                className="mt-6 max-w-lg text-sm leading-7 text-[#850E35]/55"
              >
                Signing in reconnects you directly to your tailored learning command center —
                track live readiness metrics, resume active courses, and advance your career roadmap.
              </TextAnimation>

              {/* Feature items staggered in */}
              <motion.div
                initial="hidden"
                animate="show"
                variants={{
                  hidden: { opacity: 0 },
                  show: {
                    opacity: 1,
                    transition: { delayChildren: 0.6, staggerChildren: 0.12 },
                  },
                }}
                className="mt-9 space-y-5"
              >
                {[
                  {
                    icon: <LayoutDashboard size={16} />,
                    title: 'Personalized learning dashboard',
                    description:
                      'Access live skill heatmaps, pending roadmap milestones, and tailored daily practice modules.',
                  },
                  {
                    icon: <TrendingUp size={16} />,
                    title: 'Seamless progress resumption',
                    description:
                      'Pick up right where you left off with synchronized notes, completed modules, and streak analytics.',
                  },
                  {
                    icon: <Sparkles size={16} />,
                    title: 'Real-time role readiness insights',
                    description:
                      'Track how closing your skill delta boosts your competitiveness against current market hiring standards.',
                  },
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    variants={{
                      hidden: { opacity: 0, y: 16 },
                      show: {
                        opacity: 1,
                        y: 0,
                        transition: { duration: 0.4, ease: 'easeOut' },
                      },
                    }}
                  >
                    <Feature
                      icon={item.icon}
                      title={item.title}
                      description={item.description}
                    />
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


/* FEATURE COMPONENT */
function Feature({ icon, title, description }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#FFF5E4] text-[#850E35]">
        {icon}
      </div>

      <div>
        <h3 className="text-sm font-bold">
          {title}
        </h3>

        <p className="mt-1 text-xs leading-5 text-[#850E35]/50">
          {description}
        </p>
      </div>
    </div>
  );
}

/* ERROR MESSAGE */
function ErrorMessage({ text }) {
  return (
    <p className="mt-1.5 text-[10px] font-medium text-red-500">
      {text}
    </p>
  );
}