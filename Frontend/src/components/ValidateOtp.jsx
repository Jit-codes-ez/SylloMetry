import React, { useState, useEffect } from 'react';
import { OTPInput, OTPInputContext } from 'input-otp';
import { ShieldCheck, Loader2, ArrowRight, RotateCw, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

/**
 * Individual Digit Slot for OTP Input
 */
function OtpSlot({ slot: propSlot, isFocused: propFocused, index, isError = false, size = 'md' }) {
  const context = React.useContext(OTPInputContext) || {};
  const slot = propSlot !== undefined ? propSlot : (context.slots && index !== undefined ? context.slots[index] : null);
  const isFocused = propFocused !== undefined ? propFocused : Boolean(context.isFocused);
  const isActive = Boolean(isFocused && slot?.isActive);
  const hasChar = Boolean(slot?.char);

  const sizeClasses =
    {
      sm: 'h-10 w-8 sm:h-11 sm:w-9 text-base rounded-xl',
      md: 'h-12 w-9 sm:h-13 sm:w-10 text-lg sm:text-xl rounded-xl',
      lg: 'h-14 w-11 sm:h-16 sm:w-13 text-xl sm:text-2xl rounded-2xl',
    }[size] || 'h-12 w-9 sm:h-13 sm:w-10 text-lg sm:text-xl rounded-xl';

  return (
    <div
      className={cn(
        'relative flex shrink-0 items-center justify-center border-2 bg-white text-center font-bold transition-all duration-200 select-none shadow-2xs',
        sizeClasses,
        isError
          ? 'border-red-400 text-red-600 ring-4 ring-red-400/20'
          : isActive
          ? 'border-[#850E35] text-[#850E35] ring-4 ring-[#850E35]/15 shadow-md -translate-y-0.5'
          : hasChar
          ? 'border-[#850E35]/45 text-[#850E35] bg-[#FFFBF1]/60 shadow-xs'
          : 'border-[#850E35]/20 text-[#850E35]/40 hover:border-[#850E35]/40'
      )}
    >
      {slot?.char ? (
        <span className="transition-transform duration-150 transform scale-100">{slot.char}</span>
      ) : isActive ? (
        <span className="h-5 w-0.5 rounded-full bg-[#850E35] animate-pulse" />
      ) : null}
    </div>
  );
}

/**
 * ValidateOtp Component
 *
 * Supports two presentation variants:
 * - 'card': Standalone modal / card with large emblem & header
 * - 'inline': Compact embedded form row with OTP slots and a Submit button beside it
 */
export function ValidateOtp({
  variant = 'card',
  email = 'student@university.edu',
  length = 6,
  onVerify,
  onResend,
  onCancel,
  title = 'Verify Your Account',
  subtitle = 'We have sent a 6-digit verification code to your email address.',
  initialCountdown = 45,
  isSubmitting: externalSubmitting = false,
  errorMessage: externalError = '',
  className = '',
}) {
  const [otp, setOtp] = useState('');
  const [internalSubmitting, setInternalSubmitting] = useState(false);
  const [internalError, setInternalError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [countdown, setCountdown] = useState(initialCountdown);
  const [canResend, setCanResend] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const isSubmitting = externalSubmitting || internalSubmitting;
  const error = externalError || internalError;

  // Countdown timer for code resend
  useEffect(() => {
    if (countdown <= 0) {
      setCanResend(true);
      return;
    }

    setCanResend(false);
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown]);

  // Handle Form Submission
  const handleVerify = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (otp.length < length || isSubmitting) return;

    setInternalError('');
    setInternalSubmitting(true);

    try {
      if (onVerify) {
        await onVerify(otp);
      } else {
        // Fallback simulation for demonstration
        await new Promise((resolve) => setTimeout(resolve, 800));
        if (otp === '000000') {
          throw new Error('Invalid code entered. Please try again.');
        }
      }
      setIsSuccess(true);
    } catch (err) {
      setInternalError(err?.message || 'Verification failed. Please check the code.');
    } finally {
      setInternalSubmitting(false);
    }
  };

  // Handle Resend
  const handleResend = async () => {
    if (!canResend || isResending) return;

    setIsResending(true);
    setInternalError('');
    try {
      if (onResend) {
        await onResend();
      } else {
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
      setOtp('');
      setCountdown(initialCountdown);
    } catch (err) {
      setInternalError(err?.message || 'Failed to resend code. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  // Format countdown string
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // INLINE VARIANT (Embedded into form after email with Submit button beside it)
  // ─────────────────────────────────────────────────────────────────────────────
  if (variant === 'inline') {
    return (
      <div
        className={cn(
          'w-full rounded-2xl border border-[#850E35]/15 bg-[#FFFBF1]/80 p-4 sm:p-5 space-y-3.5 shadow-2xs transition-all duration-200',
          className
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-[#850E35] shrink-0" />
            <span className="text-xs font-bold text-[#850E35]">Enter Verification Code</span>
          </div>
          <span className="text-[11px] font-medium text-[#850E35]/60 truncate max-w-[200px]">
            Sent to <strong className="text-[#850E35]">{email}</strong>
          </span>
        </div>

        {isSuccess ? (
          <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="shrink-0" />
              <span className="text-xs font-bold">Email verified successfully!</span>
            </div>
            <span className="text-[10px] text-emerald-600 font-semibold">Proceed with registration</span>
          </div>
        ) : (
          <form onSubmit={handleVerify} className="space-y-3.5">
            {/* Perfectly Centered OTP Input Slots */}
            <div className="flex justify-center items-center w-full py-1.5">
              <OTPInput
                maxLength={length}
                value={otp}
                onChange={(val) => {
                  setOtp(val);
                  if (internalError) setInternalError('');
                }}
                disabled={isSubmitting}
                autoFocus
                render={({ slots, isFocused }) => {
                  const half = Math.ceil(length / 2);
                  const firstHalf = (slots || []).slice(0, half);
                  const secondHalf = (slots || []).slice(half);

                  return (
                    <div className="flex items-center justify-center gap-1.5 sm:gap-2.5">
                      {firstHalf.map((slot, idx) => (
                        <OtpSlot
                          key={idx}
                          slot={slot}
                          isFocused={isFocused}
                          index={idx}
                          size="md"
                          isError={Boolean(error)}
                        />
                      ))}

                      {length > 4 && (
                        <div className="flex items-center justify-center px-1 text-[#850E35]/35 font-bold text-base select-none shrink-0">
                          -
                        </div>
                      )}

                      {secondHalf.map((slot, idx) => (
                        <OtpSlot
                          key={idx + half}
                          slot={slot}
                          isFocused={isFocused}
                          index={idx + half}
                          size="md"
                          isError={Boolean(error)}
                        />
                      ))}
                    </div>
                  );
                }}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-red-600 bg-red-50 py-2 px-3 rounded-xl border border-red-200 animate-in fade-in duration-150">
                <AlertCircle size={14} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button: Smoothly slides down beneath the slots when all digits are entered */}
            <AnimatePresence>
              {otp.length === length && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: -6 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -6 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-11 sm:h-12 rounded-xl bg-[#850E35] text-white text-xs sm:text-sm font-bold hover:bg-[#6e092c] transition shadow-md shadow-[#850E35]/15 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={15} className="animate-spin text-white" />
                        <span>Verifying Code...</span>
                      </>
                    ) : (
                      <>
                        <span>Verify & Submit Code</span>
                        <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Resend footer */}
            <div className="flex items-center justify-between text-[11px] text-[#850E35]/60 pt-2 border-t border-[#850E35]/10">
              <span>Didn't receive code?</span>
              {canResend ? (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isResending}
                  className="font-bold text-[#850E35] hover:text-[#E36A6A] transition-colors inline-flex items-center gap-1 cursor-pointer"
                >
                  {isResending ? (
                    <>
                      <Loader2 size={11} className="animate-spin" />
                      <span>Resending...</span>
                    </>
                  ) : (
                    <>
                      <RotateCw size={11} />
                      <span>Resend Code</span>
                    </>
                  )}
                </button>
              ) : (
                <span className="font-semibold text-[#850E35]/45">
                  Resend in {formatTime(countdown)}
                </span>
              )}
            </div>
          </form>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CARD VARIANT (Default Standalone Modal / Card)
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className={cn('w-full max-w-md mx-auto p-6 sm:p-8 rounded-3xl border border-[#850E35]/12 bg-white shadow-xl shadow-[#850E35]/5', className)}>
      {/* Back button */}
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[#850E35]/60 hover:text-[#850E35] transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>Back</span>
        </button>
      )}

      {/* Header Emblem */}
      <div className="flex flex-col items-center text-center mb-6">
        <div className="relative mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFF5E4] border border-[#850E35]/15 text-[#850E35] shadow-xs">
          {isSuccess ? (
            <CheckCircle2 size={26} className="text-emerald-600 animate-in zoom-in-75 duration-200" />
          ) : (
            <ShieldCheck size={26} className="text-[#850E35]" />
          )}
        </div>

        <h2 className="text-xl sm:text-2xl font-bold text-[#850E35] tracking-tight">
          {title}
        </h2>
        <p className="mt-1.5 text-xs sm:text-sm text-[#850E35]/60 max-w-xs leading-relaxed">
          {subtitle}
        </p>

        {email && (
          <span className="mt-2 inline-block rounded-full bg-[#FFF5E4] px-3 py-1 text-[11px] font-bold text-[#850E35] border border-[#850E35]/15">
            {email}
          </span>
        )}
      </div>

      {isSuccess ? (
        <div className="p-5 rounded-2xl bg-[#FFF5E4] border border-[#850E35]/20 text-center space-y-2 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex h-10 w-10 mx-auto items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <CheckCircle2 size={20} />
          </div>
          <h3 className="text-sm font-bold text-[#850E35]">Verification Successful</h3>
          <p className="text-xs text-[#850E35]/70">
            Your identity has been verified. Redirecting to your dashboard...
          </p>
        </div>
      ) : (
        <form onSubmit={handleVerify} className="space-y-6">
          {/* OTP Input Slots */}
          <div className="flex justify-center">
            <OTPInput
              maxLength={length}
              value={otp}
              onChange={(val) => {
                setOtp(val);
                if (internalError) setInternalError('');
                if (val.length === length) {
                  setTimeout(() => {
                    handleVerify();
                  }, 50);
                }
              }}
              disabled={isSubmitting}
              autoFocus
              render={({ slots, isFocused }) => {
                const half = Math.ceil(length / 2);
                const firstHalf = (slots || []).slice(0, half);
                const secondHalf = (slots || []).slice(half);

                return (
                  <div className="flex items-center gap-2 sm:gap-2.5">
                    {firstHalf.map((slot, idx) => (
                      <OtpSlot
                        key={idx}
                        slot={slot}
                        isFocused={isFocused}
                        index={idx}
                        size="lg"
                        isError={Boolean(error)}
                      />
                    ))}

                    {length > 4 && (
                      <div className="flex items-center justify-center px-0.5 text-[#850E35]/40 font-bold text-lg select-none">
                        -
                      </div>
                    )}

                    {secondHalf.map((slot, idx) => (
                      <OtpSlot
                        key={idx + half}
                        slot={slot}
                        isFocused={isFocused}
                        index={idx + half}
                        size="lg"
                        isError={Boolean(error)}
                      />
                    ))}
                  </div>
                );
              }}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center justify-center gap-2 text-xs font-medium text-red-600 bg-red-50 py-2 px-3 rounded-xl border border-red-200 animate-in fade-in duration-200">
              <AlertCircle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={otp.length < length || isSubmitting}
            className="group flex w-full items-center justify-center gap-2 rounded-xl bg-[#850E35] py-3.5 px-4 text-xs sm:text-sm font-bold text-white shadow-sm transition hover:bg-[#6e092c] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin text-white" />
                <span>Verifying Code...</span>
              </>
            ) : (
              <>
                <span>Verify & Proceed</span>
                <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </button>

          {/* Resend Code Footer */}
          <div className="pt-2 text-center text-xs text-[#850E35]/60 border-t border-[#850E35]/10">
            <span>Didn't receive the code? </span>
            {canResend ? (
              <button
                type="button"
                onClick={handleResend}
                disabled={isResending}
                className="font-bold text-[#850E35] hover:text-[#E36A6A] transition-colors inline-flex items-center gap-1 cursor-pointer"
              >
                {isResending ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    <span>Resending...</span>
                  </>
                ) : (
                  <>
                    <RotateCw size={12} />
                    <span>Resend Code</span>
                  </>
                )}
              </button>
            ) : (
              <span className="font-semibold text-[#850E35]/40">
                Resend in {formatTime(countdown)}
              </span>
            )}
          </div>
        </form>
      )}
    </div>
  );
}

export default ValidateOtp;
