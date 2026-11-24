import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  ArrowLeft,
  ArrowRight,
  SlidersHorizontal,
  Lock,
  Settings,
  Bell,
  BellRing,
  BellOff,
  Check,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Info,
  MousePointer,
} from 'lucide-react';
import {
  getNotificationPermission,
  setNotificationPreference,
} from '@/lib/skillExtractionNotification';

/**
 * Interactive Step-by-Step Onboarding Tutorial for Manually Enabling Notifications in Chrome
 *
 * Steps:
 * 1. Find Site Controls (Address bar lock / tune icon)
 * 2. Open Site Settings (Chrome menu item)
 * 3. Allow Notifications (Permissions list in Chrome settings)
 * 4. Return to SylloMetry (Real-time permission detection without refresh)
 */
export default function NotificationTutorialModal({
  isOpen,
  onClose,
  onPermissionGranted,
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [livePermission, setLivePermission] = useState(() => getNotificationPermission());
  const [simulatedSelection, setSimulatedSelection] = useState('block');
  const [isCheckingManually, setIsCheckingManually] = useState(false);

  const handleClose = useCallback(() => {
    setCurrentStep(1);
    onClose();
  }, [onClose]);

  // Real-time permission checking:
  // Listens to tab focus, visibilitychange, and intervals while tutorial is open
  const checkCurrentPermission = useCallback(() => {
    const current = getNotificationPermission();
    setLivePermission(current);
    if (current === 'granted') {
      setNotificationPreference(true);
      if (typeof onPermissionGranted === 'function') {
        onPermissionGranted();
      }
    }
    return current;
  }, [onPermissionGranted]);

  useEffect(() => {
    if (!isOpen) return;

    const handleWindowFocus = () => {
      checkCurrentPermission();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkCurrentPermission();
      }
    };

    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Regular interval to catch permission change without requiring a tab switch
    const intervalId = setInterval(checkCurrentPermission, 1200);

    return () => {
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(intervalId);
    };
  }, [isOpen, checkCurrentPermission]);

  // Keyboard navigation (Esc to close, Arrow keys for step navigation)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      } else if (e.key === 'ArrowRight' && currentStep < 4) {
        setCurrentStep((s) => Math.min(4, s + 1));
      } else if (e.key === 'ArrowLeft' && currentStep > 1) {
        setCurrentStep((s) => Math.max(1, s - 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStep, handleClose]);

  // Step 3 animation loop: alternates simulated selection between 'block' and 'allow'
  useEffect(() => {
    if (!isOpen || currentStep !== 3) return;

    const timer = setInterval(() => {
      setSimulatedSelection((prev) => (prev === 'block' ? 'allow' : 'block'));
    }, 2400);

    return () => clearInterval(timer);
  }, [isOpen, currentStep]);

  if (!isOpen || typeof window === 'undefined' || !window.document?.body) {
    return null;
  }

  const handleManualCheck = () => {
    setIsCheckingManually(true);
    const updated = checkCurrentPermission();
    setTimeout(() => {
      setIsCheckingManually(false);
      if (updated === 'granted' && typeof onPermissionGranted === 'function') {
        onPermissionGranted();
      }
    }, 600);
  };

  const stepsMetadata = [
    { number: 1, title: 'Find Site Controls' },
    { number: 2, title: 'Open Site Settings' },
    { number: 3, title: 'Allow Notifications' },
    { number: 4, title: 'Return & Verify' },
  ];

  const isGranted = livePermission === 'granted';

  return createPortal(
    <div
      className="fixed inset-0 z-[10050] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-modal-title"
    >
      <div
        className="relative w-full max-w-xl flex flex-col rounded-3xl border border-[#850E35]/70 bg-[#18030C] shadow-2xl text-left overflow-hidden max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* =========================================================
            HEADER: Title, Step Progress, Close Button
        ========================================================== */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[#850E35]/40 bg-[#200410] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#850E35] to-[#C73659] text-white shadow-md">
              <Sparkles size={18} className="text-[#F5C563]" />
            </div>
            <div className="min-w-0">
              <h3
                id="tutorial-modal-title"
                className="text-sm sm:text-base font-bold text-white tracking-wide truncate"
              >
                Enable Desktop Notifications in Chrome
              </h3>
              <p className="text-[11px] text-[#FFBAC7]/70 font-mono mt-0.5">
                Step {currentStep} of 4 — {stepsMetadata[currentStep - 1].title}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="rounded-xl p-1.5 sm:p-2 text-[#FFBAC7]/60 hover:text-white hover:bg-[#36081B] transition-colors cursor-pointer shrink-0"
            title="Close Tutorial (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* =========================================================
            PROGRESS BAR & STEP PILLS
        ========================================================== */}
        <div className="px-5 sm:px-6 pt-3 pb-2 border-b border-[#850E35]/20 bg-[#14020A] shrink-0">
          <div className="grid grid-cols-4 gap-2">
            {stepsMetadata.map((step) => {
              const isPast = currentStep > step.number;
              const isCurrent = currentStep === step.number;
              return (
                <button
                  key={step.number}
                  type="button"
                  onClick={() => setCurrentStep(step.number)}
                  className={`group flex flex-col items-center gap-1.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                    isCurrent
                      ? 'text-[#F5C563]'
                      : isPast
                      ? 'text-emerald-400 hover:text-emerald-300'
                      : 'text-[#FFBAC7]/40 hover:text-[#FFBAC7]/70'
                  }`}
                  title={`Go to Step ${step.number}: ${step.title}`}
                >
                  <div className="w-full h-1.5 rounded-full overflow-hidden bg-[#2D0616]">
                    <div
                      className={`h-full transition-all duration-300 ${
                        isCurrent
                          ? 'w-full bg-[#F5C563]'
                          : isPast
                          ? 'w-full bg-emerald-400'
                          : 'w-0 bg-transparent'
                      }`}
                    />
                  </div>
                  <div className="flex items-center gap-1 text-[11px] font-semibold tracking-wide">
                    <span className="font-mono text-[10px]">
                      {isPast ? '✓' : step.number}.
                    </span>
                    <span className="hidden sm:inline truncate">{step.title}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* =========================================================
            STEP CONTENT CONTAINER (Scrollable)
        ========================================================== */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-left">
          {/* =======================================================
              STEP 1: Find Site Controls in Address Bar
          ======================================================== */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#3D0A1E] text-[#F5C563] text-[11px] font-bold">
                  Step 1
                </div>
                <h4 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  Locate Site Controls in Chrome Address Bar
                </h4>
                <p className="text-xs text-[#FFBAC7]/80 leading-relaxed">
                  Look at the left side of your browser address bar next to the website URL. Chrome displays a site controls icon you can click to manage permissions.
                </p>
              </div>

              {/* Simulated Chrome Address Bar */}
              <div className="rounded-2xl border border-[#850E35]/60 bg-[#0F0208] p-4 shadow-inner space-y-3">
                <div className="flex items-center justify-between text-[11px] text-[#FFBAC7]/50 font-mono">
                  <span>Chrome Address Bar Simulation</span>
                  <span className="text-[10px] text-[#F5C563]/80">Look at the top of your screen</span>
                </div>

                {/* Omnibox mockup */}
                <div className="relative flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#200410] border border-[#850E35]/50 shadow-sm">
                  {/* Highlighted Site Controls Button */}
                  <div className="relative flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#3A071E] border-2 border-[#F5C563] text-[#F5C563] shadow-[0_0_15px_rgba(245,197,99,0.4)] animate-pulse">
                    <SlidersHorizontal size={14} className="text-[#F5C563]" />
                    <span className="text-[10px] font-mono text-[#F5C563] font-bold">
                      Site controls
                    </span>
                    <span className="text-[9px] text-[#FFBAC7]/60">or</span>
                    <Lock size={12} className="text-[#F5C563]/80" />
                  </div>

                  {/* URL Text */}
                  <div className="flex items-center gap-1 min-w-0 text-xs font-mono truncate text-[#FFBAC7]/90">
                    <span className="text-emerald-400 font-semibold">https://</span>
                    <span className="text-white font-medium">syllometry.app</span>
                    <span className="text-[#FFBAC7]/40 truncate">/admin/skills</span>
                  </div>
                </div>

                {/* Explanation about icon variations */}
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#200410]/70 border border-[#850E35]/30 text-xs text-[#FFBAC7]/85">
                  <Info size={15} className="text-[#F5C563] shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold text-white">
                      Chrome Icon Variations:
                    </p>
                    <p className="text-[11px] text-[#FFBAC7]/80 leading-relaxed">
                      • <strong>Newer Chrome versions:</strong> Feature the tune/sliders icon (<SlidersHorizontal size={12} className="inline text-[#F5C563]" />) beside the URL.<br />
                      • <strong>Classic Chrome versions:</strong> Feature the padlock icon (<Lock size={12} className="inline text-[#F5C563]" />).
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =======================================================
              STEP 2: Open Site Settings Menu
          ======================================================== */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#3D0A1E] text-[#F5C563] text-[11px] font-bold">
                  Step 2
                </div>
                <h4 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  Open Chrome Site Settings
                </h4>
                <p className="text-xs text-[#FFBAC7]/80 leading-relaxed">
                  Click on the site controls icon in your actual browser to display the permission menu. From there, select <strong>Site settings</strong>.
                </p>
              </div>

              {/* Simulated Dropdown Menu */}
              <div className="rounded-2xl border border-[#850E35]/60 bg-[#0F0208] p-4 shadow-inner space-y-3">
                <div className="flex items-center justify-between text-[11px] text-[#FFBAC7]/50 font-mono">
                  <span>Chrome Site Controls Dropdown</span>
                  <span className="text-[10px] text-[#F5C563]/80">Dropdown preview</span>
                </div>

                <div className="max-w-md mx-auto rounded-2xl bg-[#1C030E] border border-[#850E35] p-3 shadow-2xl space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-[#850E35]/40 text-xs font-semibold text-white">
                    <span className="truncate">syllometry.app</span>
                    <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                      <Lock size={10} /> Secure
                    </span>
                  </div>

                  {/* Menu Option 1: Notifications current state */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-[#2A0515]/60 text-xs text-[#FFBAC7]/80">
                    <div className="flex items-center gap-2">
                      <BellOff size={14} className="text-rose-400" />
                      <span>Notifications</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-rose-950/70 border border-rose-500/40 text-[10px] font-bold text-rose-300">
                      Blocked
                    </span>
                  </div>

                  {/* Menu Option 2: Highlighted Site Settings */}
                  <div className="relative flex items-center justify-between p-2.5 rounded-xl bg-[#3D0A1E] border-2 border-[#F5C563] text-white shadow-[0_0_16px_rgba(245,197,99,0.4)] animate-pulse">
                    <div className="flex items-center gap-2">
                      <Settings size={15} className="text-[#F5C563]" />
                      <span className="text-xs font-bold text-white tracking-wide">
                        Site settings
                      </span>
                    </div>
                    <ExternalLink size={13} className="text-[#F5C563]" />
                  </div>
                </div>

                {/* Helpful Note */}
                <p className="text-[11px] text-[#FFBAC7]/70 italic text-center">
                  Depending on your Chrome version, you may see a quick toggle for Notifications directly in this menu, or the "Site settings" option. Both work!
                </p>
              </div>
            </div>
          )}

          {/* =======================================================
              STEP 3: Allow Notifications in Settings
          ======================================================== */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#3D0A1E] text-[#F5C563] text-[11px] font-bold">
                  Step 3
                </div>
                <h4 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  Change Notifications from 'Block' to 'Allow'
                </h4>
                <p className="text-xs text-[#FFBAC7]/80 leading-relaxed">
                  In Chrome's Site Settings page, scroll down to the <strong>Permissions</strong> section, find <strong>Notifications</strong>, and change it from <strong>Block</strong> to <strong>Allow</strong>.
                </p>
              </div>

              {/* Simulated Chrome Settings Card */}
              <div className="rounded-2xl border border-[#850E35]/60 bg-[#0F0208] p-4 shadow-inner space-y-3">
                <div className="flex items-center justify-between text-[11px] text-[#FFBAC7]/50 font-mono">
                  <span>chrome://settings/content/siteDetails</span>
                  <span className="text-[10px] text-[#F5C563]">Interactive Demonstration</span>
                </div>

                <div className="max-w-md mx-auto rounded-2xl bg-[#1C030E] border border-[#850E35] p-3 shadow-2xl space-y-2">
                  <div className="text-[11px] font-mono text-[#FFBAC7]/60 pb-1 border-b border-[#850E35]/40 flex items-center justify-between">
                    <span>Permissions</span>
                    <span className="text-[10px] text-[#F5C563]/80 italic">Click toggle below to test</span>
                  </div>

                  {/* Static Permission Item */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-[#220412]/50 text-xs text-[#FFBAC7]/60">
                    <span>Location</span>
                    <span className="text-[11px] text-[#FFBAC7]/50">Ask (default)</span>
                  </div>

                  {/* Highlighted Notifications Row with Animated Demonstration */}
                  <div
                    onClick={() => setSimulatedSelection((prev) => (prev === 'block' ? 'allow' : 'block'))}
                    className="flex items-center justify-between p-2.5 rounded-xl border-2 border-[#F5C563] bg-[#2E0719] shadow-[0_0_18px_rgba(245,197,99,0.35)] transition-all cursor-pointer group"
                    title="Click to simulate changing the permission in Chrome"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {simulatedSelection === 'allow' ? (
                        <BellRing size={16} className="text-emerald-400 shrink-0" />
                      ) : (
                        <BellOff size={16} className="text-rose-400 shrink-0" />
                      )}
                      <span className="text-xs font-bold text-white">Notifications</span>
                    </div>

                    {/* Animated Simulated Dropdown / Selector */}
                    <div className="flex items-center gap-1.5">
                      <div
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all duration-300 shadow-md ${
                          simulatedSelection === 'allow'
                            ? 'bg-emerald-600 text-white border border-emerald-400 scale-105'
                            : 'bg-rose-950/80 text-rose-300 border border-rose-500/50'
                        }`}
                      >
                        {simulatedSelection === 'allow' ? (
                          <>
                            <Check size={12} className="text-white" />
                            <span>Allow</span>
                          </>
                        ) : (
                          <>
                            <X size={12} className="text-rose-400" />
                            <span>Block</span>
                          </>
                        )}
                      </div>
                      <MousePointer size={12} className="text-[#F5C563] animate-bounce shrink-0" />
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-950/40 border border-[#F5C563]/40 text-xs text-[#FFBAC7]/90 flex items-start gap-2">
                  <AlertCircle size={15} className="text-[#F5C563] shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>Important:</strong> This tutorial is a simulation. You must perform this change in your actual Chrome browser window or Chrome settings tab.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* =======================================================
              STEP 4: Return to SylloMetry & Real-Time Detection
          ======================================================== */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#3D0A1E] text-[#F5C563] text-[11px] font-bold">
                  Step 4
                </div>
                <h4 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  Return to SylloMetry
                </h4>
                <p className="text-xs text-[#FFBAC7]/80 leading-relaxed">
                  After setting Notifications to <strong>Allow</strong> in your browser, simply switch back to this tab. SylloMetry will automatically detect the permission update in real time without requiring a page refresh!
                </p>
              </div>

              {/* Dynamic Live Detection Status Box */}
              <div
                className={`rounded-2xl border p-5 transition-all duration-300 text-center space-y-3 ${
                  isGranted
                    ? 'border-emerald-500/60 bg-emerald-950/50 shadow-[0_0_25px_rgba(16,185,129,0.25)]'
                    : 'border-[#850E35]/60 bg-[#0F0208]'
                }`}
              >
                {isGranted ? (
                  <div className="space-y-2 py-2">
                    <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-900/60 border border-emerald-400 text-emerald-400 shadow-lg animate-bounce">
                      <CheckCircle2 size={32} />
                    </div>
                    <h5 className="text-base font-extrabold text-emerald-300">
                      Permission Detected!
                    </h5>
                    <p className="text-xs text-emerald-200/90 max-w-sm mx-auto leading-relaxed">
                      Chrome notifications are now active. SylloMetry will send you native Windows alerts when skill extraction finishes.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 py-2">
                    <div className="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-full bg-[#2B0616] border border-[#850E35] text-xs text-[#FFA8B8]">
                      <RefreshCw
                        size={12}
                        className={`text-[#F5C563] ${isCheckingManually ? 'animate-spin' : ''}`}
                      />
                      <span>Live Detector Active: Waiting for Chrome permission change...</span>
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs text-[#FFBAC7]/80 leading-relaxed max-w-md mx-auto">
                        Notifications are still currently set to <strong>Blocked</strong>. Change them in your browser site controls and return here.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleManualCheck}
                      disabled={isCheckingManually}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2D0717] hover:bg-[#3D0A1E] border border-[#F5C563]/40 hover:border-[#F5C563] text-[#F5C563] text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
                    >
                      <RefreshCw
                        size={13}
                        className={isCheckingManually ? 'animate-spin' : ''}
                      />
                      <span>Check Permission Now</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* =========================================================
            FOOTER: Back, Next, Close / Complete Controls
        ========================================================== */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-t border-[#850E35]/40 bg-[#200410] shrink-0">
          {/* Back Button */}
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#850E35]/60 bg-[#16020A] hover:bg-[#2A0515] text-[#FFA8B8] hover:text-white text-xs font-bold transition-all cursor-pointer active:scale-95"
            >
              <ArrowLeft size={14} />
              <span>Back</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleClose}
              className="px-3.5 py-2 rounded-xl text-[#FFBAC7]/60 hover:text-white text-xs font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
          )}

          {/* Step indicator dots */}
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4].map((stepNum) => (
              <button
                key={stepNum}
                type="button"
                onClick={() => setCurrentStep(stepNum)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  currentStep === stepNum
                    ? 'w-6 bg-[#F5C563]'
                    : currentStep > stepNum
                    ? 'w-2 bg-emerald-400'
                    : 'w-2 bg-[#850E35]/60 hover:bg-[#850E35]'
                }`}
                title={`Go to step ${stepNum}`}
              />
            ))}
          </div>

          {/* Next / Complete Button */}
          {currentStep < 4 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((s) => Math.min(4, s + 1))}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#F5C563] via-[#E8B145] to-[#D99B26] hover:brightness-105 border border-[#FCE19C]/60 text-[#2B0712] text-xs font-extrabold tracking-wide shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <span>Next</span>
              <ArrowRight size={14} />
            </button>
          ) : isGranted ? (
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 border border-emerald-300 text-white text-xs font-extrabold tracking-wide shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <CheckCircle2 size={14} />
              <span>Got it, Close</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#850E35]/60 bg-[#2D0717] hover:bg-[#3D0A1E] text-[#F5C563] text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <span>Done</span>
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
