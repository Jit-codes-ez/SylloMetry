import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  UserPlus,
  Mail,
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
import { createAdminAccount } from '@/lib/adminAuth';
import { motion, AnimatePresence } from 'motion/react';

export default function AddAdminModal({ isOpen, onClose, onAdminCreated }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [showPassword, setShowPassword] = useState(false);
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
    const emailTrimmed = formData.email.trim();

    if (!emailTrimmed) {
      errs.email = 'Please enter an admin email address.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      errs.email = 'Please enter a valid email address.';
    }

    if (!formData.password) {
      errs.password = 'Please enter a password for the new admin.';
    } else if (formData.password.length < 6) {
      errs.password = 'Password must be at least 6 characters.';
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
      const res = await createAdminAccount({
        email: formData.email,
        password: formData.password,
      });

      setSuccessMessage(res?.message || `Administrator '${formData.email}' created successfully.`);
      setFormData({ email: '', password: '' });

      if (onAdminCreated) {
        onAdminCreated(res?.admin);
      }
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        general: err.message || 'Failed to create administrator account.',
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({ email: '', password: '' });
    setErrors({});
    setSuccessMessage(null);
    onClose();
  };

  const modalElement = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-admin-modal-title"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="relative w-full max-w-[460px] rounded-3xl border border-[#850E35]/50 bg-[#240614] p-6 sm:p-8 shadow-[0_25px_70px_rgba(0,0,0,0.85)] text-white overflow-hidden my-auto animate-in zoom-in-95 duration-150">
        {/* Subtle Ambient Glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#850E35]/30 rounded-full blur-[70px] pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-[#C73659]/20 rounded-full blur-[70px] pointer-events-none" />

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
          <div className="flex items-center gap-3 pt-1">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#850E35] to-[#B8194E] text-white shadow-md shadow-[#850E35]/30">
              <UserPlus size={20} />
            </div>
            <div>
              <h2 id="add-admin-modal-title" className="text-xl font-extrabold text-white tracking-tight">
                Add New Admin
              </h2>
              <p className="text-xs text-[#FFBAC7] leading-relaxed">
                Register a new administrator with email and password.
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
                  The admin can now sign in using their credentials and OTP verification.
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
          {/* Email Input */}
          <div>
            <AnimatedInput
              theme="dark"
              label="Admin Email"
              name="email"
              type="email"
              placeholder="newadmin@syllometry.com"
              value={formData.email}
              onChange={handleChange}
              icon={<Mail size={16} className="text-[#E36A6A]" />}
              error={errors.email}
              autoComplete="off"
              inputClassName="bg-[#18030C] border-[#850E35]/50 text-white placeholder:text-[#A8576C] focus:border-[#C73659] focus:ring-[#C73659]/25"
              labelClassName="text-[#FFA8B8]"
              labelBg="bg-[#240614]"
            />
          </div>

          {/* Password Input */}
          <div>
            <AnimatedInput
              theme="dark"
              label="Admin Password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleChange}
              icon={<Lock size={16} className="text-[#E36A6A]" />}
              error={errors.password}
              placeholder="Minimum 6 characters"
              autoComplete="new-password"
              inputClassName="bg-[#18030C] border-[#850E35]/50 text-white placeholder:text-[#A8576C] focus:border-[#C73659] focus:ring-[#C73659]/25 pr-10"
              labelClassName="text-[#FFA8B8]"
              labelBg="bg-[#240614]"
              endElement={
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-[#FFA8B8]/60 hover:bg-[#36081B] hover:text-white transition-colors focus:outline-none cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
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

            <Button2
              type="submit"
              disabled={isSubmitting}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#850E35] via-[#A81546] to-[#850E35] hover:brightness-110 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-[#850E35]/35 transition-all active:scale-95 disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={15} className="animate-spin text-white" />
                  <span>Creating Admin...</span>
                </>
              ) : (
                <>
                  <UserPlus size={15} />
                  <span>Create Administrator</span>
                </>
              )}
            </Button2>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalElement, document.body)
    : modalElement;
}
