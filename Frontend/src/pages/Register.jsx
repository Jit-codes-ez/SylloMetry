import React, { useState } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
  BriefcaseBusiness,
  CheckCircle2,
  Loader2,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from 'motion/react';
import { TextAnimation } from "@/components/TextAnimation";
import { CardGlare } from "@/components/CardGlare";
import { AnimatedInput } from "@/components/AnimatedInput";
import { GoogleButton } from "@/components/GoogleButton";
import { ValidateOtp } from "@/components/ValidateOtp";

export default function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    careerGoal: "",
    terms: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

    if (!formData.fullName.trim()) {
      newErrors.fullName = "Please enter your full name.";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Please enter your email.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email.";
    } else if (!isEmailVerified) {
      newErrors.email = "Please verify your email address to continue.";
      setShowOtpInput(true);
    }

    if (!formData.password) {
      newErrors.password = "Please enter a password.";
    } else if (formData.password.length < 8) {
      newErrors.password =
        "Password must contain at least 8 characters.";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword =
        "Please confirm your password.";
    } else if (
      formData.password !== formData.confirmPassword
    ) {
      newErrors.confirmPassword = "Passwords do not match.";
    }

    if (!formData.careerGoal) {
      newErrors.careerGoal =
        "Please select your career goal.";
    }

    if (!formData.terms) {
      newErrors.terms =
        "Please accept the terms and conditions.";
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

    // Temporary dashboard navigation.
    // Replace this later with your actual registration API.
    setTimeout(() => {
      setIsSubmitting(false);
      navigate("/dashboard");
    }, 1000);
  };

  return (
  <div className="min-h-screen bg-[#FFFBF1] text-[#850E35] pt-20 md:pt-24">
    <div className="relative min-h-[calc(100vh-80px)] overflow-hidden bg-[#FFFBF1]">

      <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">

        <div className="grid min-h-[calc(100vh-160px)] items-center gap-10 lg:grid-cols-[1fr_0.9fr]">
          {/* =====================================================
              LEFT CONTENT (SIGN UP)
          ====================================================== */}
          <div className="hidden lg:block" data-reveal>

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
                Why Join SkillDelta • Member Advantages
              </TextAnimation>
            </div>

            {/* Main heading */}
            <div className="max-w-xl text-5xl font-bold leading-[1.05] tracking-tight xl:text-6xl text-[#850E35]">
              <TextAnimation
                as="h1"
                animation="slideUp"
                by="word"
                delay={0.15}
                duration={0.4}
              >
                Unlock the benefits
              </TextAnimation>

              <TextAnimation
                as="span"
                animation="slideUp"
                by="word"
                delay={0.3}
                duration={0.4}
                className="block text-[#E36A6A]"
              >
                of signing up.
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
              Signing up gives you instant access to intelligent skill benchmarking,
              adaptive career roadmaps, and verifiable milestone credentials tailored
              specifically to your dream role.
            </TextAnimation>

            {/* FEATURES */}
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
                  icon: <Sparkles size={16} />,
                  title: 'Instant skill gap diagnostic',
                  description:
                    'Identify the exact technical competencies and frameworks you need to land your target role.',
                },
                {
                  icon: <BriefcaseBusiness size={16} />,
                  title: 'Custom role-aligned roadmap',
                  description:
                    'Follow a structured, step-by-step learning progression calibrated to industry requirements.',
                },
                {
                  icon: <ShieldCheck size={16} />,
                  title: 'Verified competence milestones',
                  description:
                    'Validate your skills against actual job market benchmarks and showcase job-ready credentials.',
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

            {/* =====================================================
                REGISTRATION CARD
            ====================================================== */}
            <div className="mx-auto w-full max-w-[520px]" data-reveal>
              <CardGlare>
              <div className="rounded-3xl border border-[#850E35]/10 bg-white p-6 shadow-[0_20px_60px_rgba(133,14,53,0.08)] sm:p-8">

                {/* CARD HEADER */}
                <div className="mb-7">

                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#850E35] text-white">
                    <Sparkles size={18} />
                  </div>

                  <h2 className="text-2xl font-bold tracking-tight">
                    Create your account
                  </h2>

                  <p className="mt-2 text-xs leading-5 text-[#850E35]/50">
                    Start your personalized SkillDelta journey.
                  </p>

                </div>

                {/* FORM */}
                <form
                  onSubmit={handleSubmit}
                  className="space-y-4"
                  noValidate
                >

                  {/* FULL NAME */}
                  <AnimatedInput
                    label="Full Name"
                    name="fullName"
                    type="text"
                    placeholder="Enter your full name"
                    value={formData.fullName}
                    onChange={handleChange}
                    icon={<User size={16} />}
                    error={errors.fullName}
                    autoComplete="name"
                  />

                  {/* EMAIL */}
                  <AnimatedInput
                    label="Email Address"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    icon={<Mail size={16} />}
                    error={errors.email}
                    autoComplete="email"
                    endElement={
                      isEmailVerified ? (
                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold select-none">
                          <CheckCircle2 size={13} />
                          <span>Verified</span>
                        </div>
                      ) : isEmailFormatValid ? (
                        <button
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
                        </button>
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

                  {/* CAREER GOAL */}
                  <div>
                    <label
                      htmlFor="careerGoal"
                      className="mb-1.5 block text-xs font-semibold"
                    >
                      Career Goal
                    </label>

                    <div className="relative">
                      <BriefcaseBusiness
                        size={16}
                        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#850E35]/35"
                      />

                      <select
                        id="careerGoal"
                        name="careerGoal"
                        value={formData.careerGoal}
                        onChange={handleChange}
                        className={`w-full appearance-none rounded-xl border bg-[#FFFBF1] py-3 pl-10 pr-4 text-sm outline-none transition focus:bg-white focus:ring-2 focus:ring-[#E36A6A]/20 ${
                          errors.careerGoal
                            ? "border-red-400"
                            : "border-[#850E35]/10 focus:border-[#850E35]/30"
                        }`}
                      >
                        <option value="">
                          Select your target role
                        </option>
                        <option value="full-stack-developer">
                          Full Stack Developer
                        </option>
                        <option value="frontend-developer">
                          Frontend Developer
                        </option>
                        <option value="backend-developer">
                          Backend Developer
                        </option>
                        <option value="software-engineer">
                          Software Engineer
                        </option>
                        <option value="data-scientist">
                          Data Scientist
                        </option>
                        <option value="ai-ml-engineer">
                          AI / ML Engineer
                        </option>
                        <option value="devops-engineer">
                          DevOps Engineer
                        </option>
                      </select>
                    </div>

                    {errors.careerGoal && (
                      <ErrorMessage text={errors.careerGoal} />
                    )}
                  </div>

                  {/* PASSWORD */}
                  <AnimatedInput
                    label="Password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleChange}
                    icon={<Lock size={16} />}
                    error={errors.password}
                    placeholder="Create a password"
                    autoComplete="new-password"
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

                  <p className="-mt-2 text-[10px] text-[#850E35]/40">
                    Use at least 8 characters.
                  </p>

                  {/* CONFIRM PASSWORD */}
                  <AnimatedInput
                    label="Confirm Password"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    icon={<Lock size={16} />}
                    error={errors.confirmPassword}
                    placeholder="Confirm your password"
                    autoComplete="new-password"
                    endElement={
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-[#850E35]/40 hover:bg-[#FFF5E4] hover:text-[#850E35] transition-colors focus:outline-none cursor-pointer"
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    }
                  />

                  {/* TERMS */}
                  <div className="pt-1">

                    <label className="flex cursor-pointer items-start gap-3">

                      <input
                        type="checkbox"
                        name="terms"
                        checked={formData.terms}
                        onChange={handleChange}
                        className="mt-1 h-4 w-4 accent-[#850E35]"
                      />

                      <span className="text-[10px] leading-5 text-[#850E35]/55">
                        I agree to the SkillDelta{" "}
                        <Link to = "/terms" className="font-semibold text-[#850E35]">
                          Terms of Service
                        </Link>{" "}
                        and{" "}
                        <Link to = "/privacy" className="font-semibold text-[#850E35]">
                          Privacy Policy
                        </Link>
                        .
                      </span>

                    </label>

                    {errors.terms && (
                      <ErrorMessage text={errors.terms} />
                    )}

                  </div>

                  {/* SUBMIT BUTTON */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="group flex w-full items-center justify-center gap-2 rounded-xl bg-[#850E35] py-3.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#6F0A2B] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                  >

                    {isSubmitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin text-white" />
                        <span>Creating account...</span>
                      </>
                    ) : (
                      <>
                        Create account

                        <ArrowRight
                          size={15}
                          className="transition-transform group-hover:translate-x-0.5"
                        />
                      </>
                    )}

                  </button>

                </form>

              {/* DIVIDER */}
                <div className="relative my-6 flex items-center justify-center">
                  <div className="w-full border-t border-[#850E35]/10" />
                  <span className="absolute bg-white px-3 text-[10px] font-bold uppercase tracking-wider text-[#850E35]/40">
                    Or continue with Google
                  </span>
                </div>

              {/* GOOGLE SIGN UP BUTTON */}
                <GoogleButton
                  text="Sign up with Google"
                  isLoading={isGoogleSubmitting}
                  disabled={isSubmitting}
                  onClick={handleGoogleAuth}
                />

                {/* LOGIN */}
                <div className="mt-6 border-t border-[#850E35]/10 pt-5 text-center">

                  <p className="text-xs text-[#850E35]/50">

                    Already have an account?{" "}

                    <Link
                      to="/signin"
                      className="font-bold text-[#850E35] hover:text-[#E36A6A]"
                    >
                      Sign in
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
          </div>
        </div>
      </div>
    </div>
  );
}


/* ================================================================
   FEATURE COMPONENT
================================================================ */

function Feature({
  icon,
  title,
  description,
}) {
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



/* ================================================================
   ERROR MESSAGE
================================================================ */
function ErrorMessage({ text }) {
  return (
    <p className="mt-1.5 text-[10px] font-medium text-red-500">
      {text}
    </p>
  );
}