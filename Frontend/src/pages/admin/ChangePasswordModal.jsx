import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { AnimatedInput } from '@/components/AnimatedInput';
import { Button2 } from '@/components/Button2';
import { changeAdminPassword } from '@/lib/adminAuth';
import { motion, AnimatePresence } from 'motion/react';

export default function ChangePasswordModal({ isOpen, onClose }) {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  // Close on Escape key & lock body scroll when modal is open
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '', general: '' }));
    setSuccessMessage(null);
  };

  const validate = () => {
    const errs = {};

    if (!formData.currentPassword) {
      errs.currentPassword = 'Please enter your current password.';
    }

    if (!formData.newPassword) {
      errs.newPassword = 'Please enter a new password.';
    } else if (formData.newPassword.length < 6) {
      errs.newPassword = 'New password must be at least 6 characters.';
    } else if (formData.newPassword === formData.currentPassword) {
      errs.newPassword = 'New password cannot be the same as your current password.';
    }

    if (!formData.confirmPassword) {
      errs.confirmPassword = 'Please confirm your new password.';
    } else if (formData.newPassword !== formData.confirmPassword) {
      errs.confirmPassword = 'Passwords do not match.';
    }

    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrors({});

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await changeAdminPassword({
        current_password: formData.currentPassword,
        new_password: formData.newPassword,
      });

      setSuccessMessage(res?.message || 'Your password has been changed successfully.');
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        general: err.message || 'Failed to update administrator password.',
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setErrors({});
    setSuccessMessage(null);
    onClose();
  };

  const modalElement = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-password-modal-title"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="relative w-full max-w-[460px] rounded-3xl border border-[#850E35]/50 bg-[#240614] p-6 sm:p-8 shadow-[0_25px_70px_rgba(0,0,0,0.85)] text-white overflow-hidden my-auto animate-in zoom-in-95 duration-150">
        {/* Subtle Ambient Glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#850E35]/30 rounded-full blur-[70px] pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-[#C73659]/20 rounded-full blur-[70px] pointer-events-none" />

        {/* Top Accent Strip */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#C73659] to-transparent" />

        {/* Close Button */}
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close dialog"
          className="absolute right-4 top-4 rounded-xl p-1.5 text-[#FFBAC7]/60 hover:bg-[#340718] hover:text-white transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="mb-6 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#36081B] border border-[#C73659]/50 text-[#FFA8B8] text-[11px] font-bold tracking-wide uppercase shadow-inner">
            <ShieldCheck size={14} className="text-[#E36A6A]" />
            <span>Account Security</span>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#850E35] to-[#B8194E] text-white shadow-md shadow-[#850E35]/30">
              <KeyRound size={20} />
            </div>
            <div>
              <h2 id="change-password-modal-title" className="text-xl font-extrabold text-white tracking-tight">
                Change Password
              </h2>
              <p className="text-xs text-[#FFBAC7] leading-relaxed">
                Update your administrator access credentials.
              </p>
            </div>
          </div>
        </div>

        {/* Success Banner */}
        <AnimatePresence>
          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="mb-5 flex items-start gap-2.5 rounded-xl border border-emerald-500/40 bg-emerald-950/70 p-3 text-xs text-emerald-200 animate-in fade-in duration-200"
            >
              <CheckCircle2 size={16} className="shrink-0 text-emerald-400 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">{successMessage}</p>
                <p className="text-[11px] text-emerald-300/80 mt-0.5">
                  Use your new password the next time you sign into the admin portal.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* General Error Banner */}
        {errors.general && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-2.5 rounded-xl border border-rose-500/40 bg-rose-950/70 p-3 text-xs text-rose-200 animate-in fade-in duration-200"
          >
            <AlertCircle size={16} className="shrink-0 text-rose-400 mt-0.5" />
            <span className="leading-relaxed">{errors.general}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Current Password Input */}
          <div>
            <AnimatedInput
              theme="dark"
              label="Current Password"
              name="currentPassword"
              type={showCurrent ? 'text' : 'password'}
              value={formData.currentPassword}
              onChange={handleChange}
              icon={<Lock size={16} className="text-[#E36A6A]" />}
              error={errors.currentPassword}
              placeholder="Enter existing password"
              autoComplete="current-password"
              inputClassName="bg-[#18030C] border-[#850E35]/50 text-white placeholder:text-[#A8576C] focus:border-[#C73659] focus:ring-[#C73659]/25 pr-10"
              labelClassName="text-[#FFA8B8]"
              labelBg="bg-[#240614]"
              endElement={
                <button
                  type="button"
                  onClick={() => setShowCurrent((prev) => !prev)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-[#FFA8B8]/60 hover:bg-[#36081B] hover:text-white transition-colors focus:outline-none cursor-pointer"
                  aria-label={showCurrent ? 'Hide password' : 'Show password'}
                >
                  {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            />
          </div>

          {/* New Password Input */}
          <div>
            <AnimatedInput
              theme="dark"
              label="New Password"
              name="newPassword"
              type={showNew ? 'text' : 'password'}
              value={formData.newPassword}
              onChange={handleChange}
              icon={<Lock size={16} className="text-[#E36A6A]" />}
              error={errors.newPassword}
              placeholder="Minimum 6 characters"
              autoComplete="new-password"
              inputClassName="bg-[#18030C] border-[#850E35]/50 text-white placeholder:text-[#A8576C] focus:border-[#C73659] focus:ring-[#C73659]/25 pr-10"
              labelClassName="text-[#FFA8B8]"
              labelBg="bg-[#240614]"
              endElement={
                <button
                  type="button"
                  onClick={() => setShowNew((prev) => !prev)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-[#FFA8B8]/60 hover:bg-[#36081B] hover:text-white transition-colors focus:outline-none cursor-pointer"
                  aria-label={showNew ? 'Hide password' : 'Show password'}
                >
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            />
          </div>

          {/* Confirm Password Input */}
          <div>
            <AnimatedInput
              theme="dark"
              label="Confirm New Password"
              name="confirmPassword"
              type={showConfirm ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={handleChange}
              icon={<Lock size={16} className="text-[#E36A6A]" />}
              error={errors.confirmPassword}
              placeholder="Re-enter new password"
              autoComplete="new-password"
              inputClassName="bg-[#18030C] border-[#850E35]/50 text-white placeholder:text-[#A8576C] focus:border-[#C73659] focus:ring-[#C73659]/25 pr-10"
              labelClassName="text-[#FFA8B8]"
              labelBg="bg-[#240614]"
              endElement={
                <button
                  type="button"
                  onClick={() => setShowConfirm((prev) => !prev)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-[#FFA8B8]/60 hover:bg-[#36081B] hover:text-white transition-colors focus:outline-none cursor-pointer"
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#850E35]/30">
            <Button2
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 text-xs font-semibold text-[#FFBAC7] hover:text-white bg-[#18030C] hover:bg-[#2C0615] border border-[#850E35]/40 rounded-xl cursor-pointer"
            >
              <span>Cancel</span>
            </Button2>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#850E35] via-[#A81546] to-[#850E35] hover:brightness-110 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-[#850E35]/35 transition-all active:scale-95 disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={15} className="animate-spin text-white" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <KeyRound size={15} />
                  <span>Update Password</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalElement, document.body)
    : modalElement;
}
