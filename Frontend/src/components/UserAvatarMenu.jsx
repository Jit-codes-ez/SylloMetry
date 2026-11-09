import React, { useState, useRef, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { LayoutDashboard, LogOut, Sparkles, BarChart3 } from "lucide-react";
import { Button2 } from "@/components/Button2";

/**
 * Pixel-art / vector illustrated character avatar matching user design
 */
function DefaultAvatarIllustration({ className = "w-3/5 h-3/5" }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="8" r="5" />
      <path d="M20 21a8 8 0 0 0-16 0" />
    </svg>
  );
}

/**
 * User Avatar Pill Button with dropdown menu
 */
export default function UserAvatarMenu({ user, onSignOut }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Resolve active user (with instant fallback to cached syllo_user in localStorage)
  const activeUser = useMemo(() => {
    if (user) return user;
    try {
      const cached = localStorage.getItem("syllo_user");
      if (cached) return JSON.parse(cached);
    } catch {}
    return null;
  }, [user]);

  // Check if curriculum has been analyzed before opening analytics
  const isCurriculumAnalyzed = useMemo(() => {
    try {
      const raw = localStorage.getItem("syllometry_curriculum_state");
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      return Boolean(parsed?.analysisComplete && parsed?.files?.length > 0);
    } catch {
      return false;
    }
  }, [isOpen]);

  // Formats display name: "Alex Doe" -> "Alex D."
  const displayName = useMemo(() => {
    const fullName =
      activeUser?.full_name ||
      activeUser?.user_metadata?.full_name ||
      activeUser?.user_metadata?.name ||
      activeUser?.name;

    if (fullName && fullName.trim()) {
      const parts = fullName.trim().split(/\s+/);
      if (parts.length > 1) {
        return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
      }
      return parts[0];
    }

    if (activeUser?.email) {
      const namePart = activeUser.email.split("@")[0];
      return namePart.charAt(0).toUpperCase() + namePart.slice(1);
    }

    return "User";
  }, [activeUser]);

  const avatarUrl =
    activeUser?.user_metadata?.avatar_url ||
    activeUser?.user_metadata?.picture ||
    activeUser?.avatar_url ||
    null;

  const handleSignOutClick = async () => {
    setIsOpen(false);
    if (onSignOut) {
      await onSignOut();
    }
    navigate("/signin");
  };

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      {/* Pill Avatar Button using Button2 matching back button styling */}
      <Button2
        variant="nav"
        onClick={() => setIsOpen((prev) => !prev)}
        className="inline-flex items-center gap-2 pl-1.5 pr-3.5 py-1 sm:py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-[#850E35]/85 hover:text-[#850E35] hover:bg-[#FFF5E4] border border-[#850E35]/20 shadow-2xs hover:shadow-xs transition-all active:scale-95 cursor-pointer text-left"
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="User account menu"
      >
        {/* Left: Avatar Circle */}
        <div className="h-6 w-6 sm:h-7 sm:w-7 aspect-square rounded-full overflow-hidden shrink-0 border border-[#850E35]/25 shadow-2xs bg-[#FFF5E4] text-[#850E35] flex items-center justify-center">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={activeUser?.full_name || displayName}
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <DefaultAvatarIllustration className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#850E35]" />
          )}
        </div>

        {/* Right: User Name */}
        <span className="text-xs sm:text-sm font-semibold text-[#850E35] leading-tight truncate max-w-[95px] sm:max-w-[130px]">
          {activeUser?.full_name || displayName}
        </span>
      </Button2>

      {/* Floating Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 top-full mt-2 w-60 rounded-2xl bg-white border border-[#850E35]/15 shadow-xl p-2 z-50 overflow-hidden"
          >
            {/* User Info Header matching user screenshot */}
            <div className="flex flex-col items-center justify-center py-5 px-3 bg-white rounded-xl mb-1.5 text-center shadow-xs border border-[#850E35]/10">
              <div className="w-20 h-20 sm:w-22 sm:h-22 aspect-square rounded-full overflow-hidden shrink-0 border-2 border-[#850E35]/20 shadow-md bg-[#850E35] flex items-center justify-center mb-2.5">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={activeUser?.full_name || displayName}
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <DefaultAvatarIllustration className="w-10 h-10 sm:w-11 sm:h-11 text-white" />
                )}
              </div>
              <p className="text-sm font-bold text-[#850E35] tracking-wide truncate max-w-full">
                {activeUser?.full_name || displayName}
              </p>
              <p className="text-xs text-[#850E35]/75 truncate max-w-full mt-0.5 font-medium">
                {activeUser?.email || "student@university.edu"}
              </p>
            </div>

            {/* Actions */}
            <div className="space-y-0.5 text-xs">
              <Link
                to="/dashboard"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl font-semibold text-[#850E35] hover:bg-[#FFF5E4] transition-colors"
              >
                <LayoutDashboard size={15} />
                <span>Go to Dashboard</span>
              </Link>

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  if (isCurriculumAnalyzed) {
                    navigate("/dashboard/analytics");
                  } else {
                    navigate("/dashboard?warn=no_curriculum");
                  }
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-semibold text-[#850E35] hover:bg-[#FFF5E4] transition-colors text-left cursor-pointer"
              >
                <BarChart3 size={15} />
                <span>Analytics</span>
              </button>

              <button
                type="button"
                onClick={handleSignOutClick}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-semibold text-red-600 hover:bg-red-50 transition-colors text-left cursor-pointer"
              >
                <LogOut size={15} />
                <span>Sign Out</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
