import React, { useState, useRef, useEffect } from "react";
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
import { Button1 } from "@/components/Button1";
import { Button2 } from "@/components/Button2";
import {
  sendSignupOtp,
  verifySignupOtp,
  completeSignup,
  getGoogleSignupUrl,
  checkEmailExists,
  checkEmailDetails,
} from "@/lib/auth";

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
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [sessionToken, setSessionToken] = useState(null);

  // Account creation success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const successModalRef = useRef(null);

  useEffect(() => {
    const dialog = successModalRef.current;
    if (!dialog) return;

    if (showSuccessModal) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }

    return () => {
      if (dialog?.open) {
        dialog.close();
      }
    };
  }, [showSuccessModal]);

  const isEmailFormatValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim());

  const handleSendVerificationOtp = async () => {
    if (!isEmailFormatValid || isSendingOtp) return;
    setIsSendingOtp(true);
    setErrors((prev) => ({ ...prev, email: "", general: "" }));
    try {
      await sendSignupOtp(formData.email, formData.fullName.trim());
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
    setErrors((prev) => ({ ...prev, general: "", email: "" }));
    try {
      sessionStorage.setItem("oauth_mode", "signup");
      localStorage.setItem("oauth_mode", "signup");

      // Before authenticating Google account, check if email exists in public.users
      const emailInput = formData.email?.trim();
      if (emailInput) {
        const details = await checkEmailDetails(emailInput);
        if (details.exists) {
          const msg = details.registration_by === "Email"
            ? "This account was registered using Email. Please use 'Sign in' to continue."
            : "This account was registered using Google. Please use 'Sign in with Google' to continue.";
          setErrors((prev) => ({
            ...prev,
            email: msg,
            general: "",
          }));
          setIsGoogleSubmitting(false);
          return;
        }
      }

      const authUrl = await getGoogleSignupUrl(emailInput || undefined);
      window.location.href = authUrl;
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        email: err.message || "Failed to initiate Google sign up.",
        general: "",
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
      newErrors.email = isOtpSent
        ? "Please enter the verification code sent to your email."
        : "Please verify your email address to continue.";
      if (isOtpSent) {
        setShowOtpInput(true);
      }
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

    if (!formData.terms) {
      newErrors.terms =
        "Please accept the terms and conditions.";
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validateForm();

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors((prev) => ({ ...prev, general: "" }));

    try {
      const res = await completeSignup({
        fullName: formData.fullName.trim(),
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        termsAccepted: formData.terms,
        accessToken: sessionToken,
      });

      if (res?.session?.access_token) {
        localStorage.setItem("supabase_token", res.session.access_token);
      }
      setShowSuccessModal(true);
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        general: err.message || "Registration failed. Please try again.",
      }));
    } finally {
      setIsSubmitting(false);
    }
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
  
              <CardGlare className="rounded-2xl border border-[#850E35]/10 bg-white p-6 shadow-[0_20px_60px_rgba(133,14,53,0.08)] sm:p-8">

                {/* CARD HEADER */}
                <div className="mb-7">

                  <h2 className="text-2xl font-bold tracking-tight text-center">
                    Create your account
                  </h2>

                  <p className="mt-2 text-xs leading-5 text-[#850E35]/50 text-center">
                    Start your personalized SylloMetry journey.
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
                          onVerify={async (otpCode) => {
                            const res = await verifySignupOtp(formData.email, otpCode);
                            if (res?.session?.access_token) {
                              setSessionToken(res.session.access_token);
                            }
                            setIsEmailVerified(true);
                            setErrors((prev) => ({ ...prev, email: "", general: "" }));
                            setTimeout(() => {
                              setShowOtpInput(false);
                            }, 1200);
                          }}
                          onResend={async () => {
                            await sendSignupOtp(formData.email, formData.fullName.trim());
                            setIsOtpSent(true);
                          }}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
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

                      <span className="text-xs text-[#850E35]/50 leading-5 text-[#850E35]/55">
                        I agree to the SylloMetry{" "}
                        <Link to = "/terms" className="font-semibold text-[#850E35] hover:text-[#E36A6A]">
                          Terms of Service
                        </Link>{" "}
                        and{" "}
                        <Link to = "/privacy" className="font-semibold text-[#850E35] hover:text-[#E36A6A]">
                          Privacy Policy
                        </Link>
                        .
                      </span>

                    </label>

                    {errors.terms && (
                      <ErrorMessage text={errors.terms} />
                    )}

                  </div>

                  {/* GENERAL ERROR MESSAGE */}
                  {errors.general && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-center text-xs font-medium text-red-600">
                      {errors.general}
                    </div>
                  )}

                  {/* SUBMIT BUTTON */}
                  <Button1
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full rounded-xl py-3.5 text-sm font-semibold text-[#FFFBF1] shadow-md shadow-[#850E35]/20 hover:shadow-lg hover:shadow-[#850E35]/30 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 size={16} className="animate-spin text-[#FFFBF1]" />
                        <span>Creating account...</span>
                      </span>
                    ) : (
                      "Create account"
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

              {/* GOOGLE SIGN UP BUTTON */}
                <GoogleButton
                  text="Sign up with Google"
                  isLoading={isGoogleSubmitting}
                  disabled={isSubmitting}
                  onClick={handleGoogleAuth}
                />

                {errors.general && (
                  <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-center text-xs font-medium text-red-600">
                    {errors.general}
                  </div>
                )}

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

            </CardGlare>
            </div>
          </div>
        </div>
      </div>

    {/* =====================================================
        ACCOUNT CREATION SUCCESS MODAL
    ====================================================== */}
    <dialog
      ref={successModalRef}
      aria-labelledby="success-modal-title"
      aria-describedby="success-modal-desc"
      onClose={() => setShowSuccessModal(false)}
      className="fixed inset-0 m-auto max-w-md w-[92vw] rounded-3xl bg-transparent p-0 text-[#850E35] outline-none backdrop:bg-black/50 backdrop:backdrop-blur-xs overscroll-contain animate-in fade-in zoom-in-95 duration-200 z-50 border-0 shadow-none"
    >
      <div className="rounded-3xl border border-[#850E35]/15 bg-white p-6 sm:p-8 shadow-2xl text-center">
        {/* Success Icon */}
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 shadow-xs">
          <CheckCircle2 size={30} />
        </div>

        {/* Title */}
        <h2 id="success-modal-title" className="text-2xl font-bold tracking-tight text-[#850E35]">
          Account Creation Successful!
        </h2>

        {/* Description */}
        <p id="success-modal-desc" className="mt-2 text-xs sm:text-sm text-[#850E35]/70 leading-relaxed">
          Your SylloMetry account has been created successfully. Click below to proceed to the login page and sign in to your account.
        </p>

        {/* Button to Login Page using Button2 */}
        <div className="mt-6 flex flex-col gap-2.5">
          <Button2
            href="/signin"
            onClick={() => setShowSuccessModal(false)}
            className="w-full py-3.5 rounded-xl font-bold text-sm bg-[#850E35] text-[#FFFBF1] hover:bg-[#6e092c] shadow-md shadow-[#850E35]/20 hover:shadow-lg transition-all"
            autoFocus
          >
            <span>Go to Login</span>
            <ArrowRight size={16} />
          </Button2>
        </div>
      </div>
    </dialog>
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
