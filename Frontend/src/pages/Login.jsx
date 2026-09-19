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
import { Link, useNavigate } from "react-router-dom";
import TextAnimation from '@/components/TextAnimation';
import { CardGlare } from "@/components/CardGlare";
import { AnimatedInput } from "@/components/AnimatedInput";
import { GoogleButton } from "@/components/GoogleButton";
import { ValidateOtp } from "@/components/ValidateOtp";
import { Button1 } from "@/components/Button1";
import { Button2 } from "@/components/Button2";

export default function Login() {
  const navigate = useNavigate();

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
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  const isEmailFormatValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim());

  const handleSendVerificationOtp = () => {
    if (!isEmailFormatValid || isSendingOtp) return;
    setIsSendingOtp(true);
    setTimeout(() => {
      setIsSendingOtp(false);
      setShowOtpInput(true);
    }, 500);
  };

  const handleGoogleAuth = () => {
    setIsGoogleSubmitting(true);
    setTimeout(() => {
      setIsGoogleSubmitting(false);
      navigate("/dashboard");
    }, 1000);
  };

  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;

    if (name === "email") {
      setIsEmailVerified(false);
      setShowOtpInput(false);
    }

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = "Please enter your email.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email.";
    } else if (!isEmailVerified) {
      newErrors.email = "Please verify your email address to continue.";
      setShowOtpInput(true);
    }

    if (!formData.password) {
      newErrors.password = "Please enter your password.";
    }

    return newErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const validationErrors = validateForm();

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);

    // Temporary login action.
    // Replace this later with your actual authentication API.
    setTimeout(() => {
      setIsSubmitting(false);
      navigate("/dashboard");
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#FFFBF1] text-[#850E35] pt-20 md:pt-24">
      <div className="relative min-h-[calc(100vh-80px)] overflow-hidden bg-[#FFFBF1]">
        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <div className="grid min-h-[calc(100vh-160px)] items-center gap-10 lg:grid-cols-[0.9fr_1fr]">

            {/* LOGIN CARD (LEFT) */}
            <div className="mx-auto w-full max-w-[520px]" data-reveal>
              <CardGlare>
                <div className="rounded-3xl border border-[#850E35]/10 bg-white p-6 shadow-[0_20px_60px_rgba(133,14,53,0.08)] sm:p-8">

                  {/* CARD HEADER */}
                  <div className="mb-7">
                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#850E35] text-white">
                      <Sparkles size={18} />
                    </div>

                    <h2 className="text-2xl font-bold tracking-tight">
                      Welcome back
                    </h2>

                    <p className="mt-2 text-xs leading-5 text-[#850E35]/50">
                      Sign in to continue your SkillDelta journey.
                    </p>
                  </div>

                  {/* LOGIN FORM */}
                  <form
                    onSubmit={handleSubmit}
                    className="space-y-5"
                    noValidate
                  >
                    {/* EMAIL */}
                    <AnimatedInput
                      label="Email Address"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      icon={<Mail size={16} />}
                      error={errors.email}
                      autoComplete="email"
                      placeholder="you@example.com"
                      endElement={
                        isEmailVerified ? (
                          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold select-none">
                            <CheckCircle2 size={13} />
                            <span>Verified</span>
                          </div>
                        ) : isEmailFormatValid ? (
                          <Button2
                            type="button"
                            onClick={handleSendVerificationOtp}
                            disabled={isSendingOtp}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#850E35] text-white text-xs font-bold hover:bg-[#6e092c] transition shadow-xs disabled:opacity-60 cursor-pointer"
                          >
                            {isSendingOtp ? (
                              <>
                                <Loader2 size={12} className="animate-spin text-white" />
                                <span>Sending...</span>
                              </>
                            ) : (
                              <span>Verify</span>
                            )}
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
                            onVerify={async (otpCode) => {
                              // Verify OTP (simulated backend call)
                              await new Promise((resolve) => setTimeout(resolve, 800));
                              if (otpCode === "000000") {
                                throw new Error("Invalid verification code. Please check your inbox.");
                              }
                              setIsEmailVerified(true);
                              setErrors((prev) => ({ ...prev, email: "" }));
                              setTimeout(() => {
                                setShowOtpInput(false);
                              }, 1200);
                            }}
                            onResend={async () => {
                              await new Promise((resolve) => setTimeout(resolve, 700));
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
                        <button
                          type="button"
                          className="text-[10px] font-semibold text-[#850E35]/55 transition hover:text-[#E36A6A]"
                          onClick={() =>
                            alert(
                              "Password reset will be available once the authentication API is connected."
                            )
                          }
                        >
                          Forgot password?
                        </button>
                      </div>
                    </div>

                    {/* REMEMBER ME */}
                    <div className="pt-1">
                      <label className="flex cursor-pointer items-center gap-3">
                        <input
                          type="checkbox"
                          name="remember"
                          checked={formData.remember}
                          onChange={handleChange}
                          className="h-4 w-4 accent-[#850E35]"
                        />

                        <span className="text-[10px] font-medium text-[#850E35]/55">
                          Remember me
                        </span>
                      </label>
                    </div>

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
                </div>

                {/* SECURITY MESSAGE */}
                <div className="mt-4 flex items-center justify-center gap-2 text-[9px] font-medium uppercase tracking-wider text-[#850E35]/35">
                  <ShieldCheck size={12} />
                  Your account information is protected
                </div>
              </CardGlare>
            </div>

            {/* RIGHT CONTENT (TEXT) */}
            <div className="hidden lg:block lg:pl-4" data-reveal>
              {/* Eyebrow badge */}
              <div className="mb-5 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#E36A6A]" />
                <TextAnimation
                  as="span"
                  animation="fadeIn"
                  by="character"
                  duration={0.4}
                  className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#850E35]/45"
                >
                  Member Portal • Benefits of Signing In
                </TextAnimation>
              </div>

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