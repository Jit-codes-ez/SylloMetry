import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import TextAnimation from "@/components/TextAnimation";
import { CardGlare } from "@/components/CardGlare";
import { AnimatedInput } from "@/components/AnimatedInput";
import { ValidateOtp } from "@/components/ValidateOtp";
import { Button1 } from "@/components/Button1";
import { Button2 } from "@/components/Button2";
import {
  sendPasswordResetOtp,
  verifyPasswordResetOtp,
  confirmPasswordReset,
} from "@/lib/auth";

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpToken, setOtpToken] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errors, setErrors] = useState({});

  const isEmailFormatValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  // Step 1: Send verification code to email
  const handleSendOtp = async () => {
    if (!isEmailFormatValid || isSendingOtp) return;

    setIsSendingOtp(true);
    setErrors((prev) => ({ ...prev, email: "", general: "" }));

    try {
      await sendPasswordResetOtp(email);
      setShowOtpInput(true);
      setIsOtpSent(true);
    } catch (err) {
      setShowOtpInput(false);
      setIsOtpSent(false);
      setErrors((prev) => ({
        ...prev,
        email: err.message || "Failed to send recovery code.",
      }));
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Step 2: Handle input changes
  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    setIsEmailVerified(false);
    setShowOtpInput(false);
    setIsOtpSent(false);
    setOtpToken("");
    setErrors((prev) => ({ ...prev, email: "", general: "" }));
  };

  // Step 3: Form validation for setting new password
  const validateResetForm = () => {
    const newErrors = {};

    if (!email.trim()) {
      newErrors.email = "Please enter your email.";
    } else if (!isEmailFormatValid) {
      newErrors.email = "Please enter a valid email address.";
    } else if (!isEmailVerified) {
      newErrors.email = isOtpSent
        ? "Please enter the verification code sent to your email."
        : "Please verify your email address to continue.";
      if (isOtpSent) setShowOtpInput(true);
    }

    if (!newPassword) {
      newErrors.newPassword = "Please enter a new password.";
    } else if (newPassword.length < 8) {
      newErrors.newPassword = "Password must be at least 8 characters long.";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your new password.";
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match.";
    }

    return newErrors;
  };

  // Step 4: Final submission to update password
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors((prev) => ({ ...prev, general: "" }));

    const validationErrors = validateResetForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      await confirmPasswordReset({
        email,
        token: otpToken,
        newPassword,
        confirmPassword,
      });

      setIsSuccess(true);
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        general: err.message || "Failed to reset password. Please try again.",
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

            {/* RECOVERY CARD (LEFT) */}
            <div className="mx-auto w-full max-w-[520px]" data-reveal>
              <CardGlare className="rounded-2xl border border-[#850E35]/10 bg-white p-6 shadow-[0_20px_60px_rgba(133,14,53,0.08)] sm:p-8">

                {/* SUCCESS VIEW */}
                {isSuccess ? (
                  <div className="space-y-6 py-4 text-center animate-in fade-in zoom-in-95 duration-300">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-sm">
                      <CheckCircle2 size={34} />
                    </div>

                    <div className="space-y-2">
                      <h2 className="text-2xl font-bold tracking-tight text-[#850E35]">
                        Password Reset Successfully
                      </h2>
                      <p className="text-xs leading-5 text-[#850E35]/60 max-w-sm mx-auto">
                        Your account password has been updated. You can now use your new password to sign in.
                      </p>
                    </div>

                    <Button1
                      type="button"
                      onClick={() => navigate("/signin")}
                      className="w-full rounded-xl py-3.5 text-sm font-semibold text-[#FFFBF1] shadow-md shadow-[#850E35]/20 hover:shadow-lg hover:shadow-[#850E35]/30 cursor-pointer"
                    >
                      <span className="inline-flex items-center gap-2">
                        <span>Sign In Now</span>
                        <ArrowRight size={15} />
                      </span>
                    </Button1>
                  </div>
                ) : (
                  /* RECOVERY FORM */
                  <div>
                    {/* CARD HEADER */}
                    <div className="mb-7 text-center">
                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF5E4] text-[#850E35] border border-[#850E35]/10 shadow-xs">
                        <KeyRound size={22} />
                      </div>

                      <h2 className="text-2xl font-bold tracking-tight text-[#850E35]">
                        Forgot password?
                      </h2>

                      <p className="mt-2 text-xs leading-5 text-[#850E35]/50">
                        Enter your registered email address and we'll help you securely reset your password.
                      </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                      {/* EMAIL INPUT */}
                      <AnimatedInput
                        label="Registered Email"
                        name="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={handleEmailChange}
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
                              onClick={handleSendOtp}
                              disabled={isSendingOtp}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#850E35] text-white text-xs font-bold hover:bg-[#6e092c] transition shadow-xs disabled:opacity-60 cursor-pointer"
                            >
                              <span>Send Code</span>
                            </Button2>
                          ) : null
                        }
                      />

                      {/* OTP VERIFICATION COMPONENT */}
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
                              email={email}
                              length={6}
                              successActionText="Enter your new password below"
                              onVerify={async (otpCode) => {
                                try {
                                  const res = await verifyPasswordResetOtp(email, otpCode);
                                  setOtpToken(res.reset_token || otpCode);
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
                                  await sendPasswordResetOtp(email);
                                } catch (err) {
                                  throw new Error(err.message || "Failed to resend code.");
                                }
                              }}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* NEW PASSWORD FIELDS (VISIBLE AFTER EMAIL OTP VERIFIED) */}
                      {isEmailVerified && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                          className="space-y-4 pt-1"
                        >
                          {/* NEW PASSWORD */}
                          <AnimatedInput
                            label="New Password"
                            name="newPassword"
                            type={showPassword ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => {
                              setNewPassword(e.target.value);
                              setErrors((prev) => ({ ...prev, newPassword: "", general: "" }));
                            }}
                            icon={<Lock size={16} />}
                            error={errors.newPassword}
                            placeholder="At least 8 characters"
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

                          {/* CONFIRM PASSWORD */}
                          <AnimatedInput
                            label="Confirm New Password"
                            name="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => {
                              setConfirmPassword(e.target.value);
                              setErrors((prev) => ({ ...prev, confirmPassword: "", general: "" }));
                            }}
                            icon={<Lock size={16} />}
                            error={errors.confirmPassword}
                            placeholder="Re-enter your new password"
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
                        </motion.div>
                      )}

                      {/* GENERAL ERROR MESSAGE */}
                      {errors.general && (
                        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-center text-xs font-medium text-red-600 animate-in fade-in duration-200">
                          {errors.general}
                        </div>
                      )}

                      {/* SUBMIT BUTTON */}
                      <Button1
                        type="submit"
                        disabled={isSubmitting || !isEmailVerified}
                        className="w-full rounded-xl py-3.5 text-sm font-semibold text-[#FFFBF1] shadow-md shadow-[#850E35]/20 hover:shadow-lg hover:shadow-[#850E35]/30 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isSubmitting ? (
                          <span className="inline-flex items-center gap-2">
                            <Loader2 size={16} className="animate-spin text-[#FFFBF1]" />
                            <span>Updating password...</span>
                          </span>
                        ) : (
                          "Reset Password"
                        )}
                      </Button1>
                    </form>

                    {/* BACK TO SIGN IN */}
                    <div className="mt-6 border-t border-[#850E35]/10 pt-5 text-center">
                      <Link
                        to="/signin"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#850E35] transition hover:text-[#E36A6A]"
                      >
                        <ArrowLeft size={13} />
                        <span>Back to sign in</span>
                      </Link>
                    </div>
                  </div>
                )}
              </CardGlare>
            </div>

            {/* RIGHT CONTENT (TEXT) */}
            <div className="hidden lg:block lg:pl-4" data-reveal>
              <div className="max-w-xl text-5xl font-bold leading-[1.05] tracking-tight xl:text-6xl text-[#850E35]">
                <TextAnimation
                  as="h1"
                  animation="slideUp"
                  by="word"
                  delay={0.15}
                  duration={0.4}
                >
                  Secure account
                </TextAnimation>

                <TextAnimation
                  as="span"
                  animation="slideUp"
                  by="word"
                  delay={0.3}
                  duration={0.4}
                  className="block text-[#E36A6A]"
                >
                  recovery made simple.
                </TextAnimation>
              </div>

              <TextAnimation
                as="p"
                animation="fadeIn"
                by="word"
                delay={0.45}
                duration={0.5}
                className="mt-6 max-w-lg text-sm leading-7 text-[#850E35]/55"
              >
                Protecting your learning progress and personal roadmaps is our priority.
                Verify your identity with single-use verification codes and reset your credentials safely.
              </TextAnimation>

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
                    icon: <ShieldCheck size={16} />,
                    title: "Encrypted Credential Storage",
                    description:
                      "Passwords are protected using cryptographic salted bcrypt hashing and never stored in plain text.",
                  },
                  {
                    icon: <KeyRound size={16} />,
                    title: "Single-Use Security OTP",
                    description:
                      "Time-limited verification codes expire rapidly and can only be used once to prevent unauthorized changes.",
                  },
                  {
                    icon: <Sparkles size={16} />,
                    title: "Instant Session Resumption",
                    description:
                      "Once reset, sign in right away to resume your skill roadmaps, syllabus notes, and active courses.",
                  },
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    variants={{
                      hidden: { opacity: 0, y: 16 },
                      show: {
                        opacity: 1,
                        y: 0,
                        transition: { duration: 0.4, ease: "easeOut" },
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

function Feature({ icon, title, description }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#FFF5E4] text-[#850E35]">
        {icon}
      </div>

      <div>
        <h3 className="text-sm font-bold">{title}</h3>
        <p className="mt-1 text-xs leading-5 text-[#850E35]/50">{description}</p>
      </div>
    </div>
  );
}

