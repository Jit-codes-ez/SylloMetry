import React from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

// ─── Theme Tokens ─────────────────────────────────────────────────────────────

export const tokens = {
  skilldelta: {
    page: "bg-[#FFFBF1]",
    section: "bg-white border-[#850E35]/10",
    bone: "bg-[#850E35]/8",
    boneLight: "bg-[#850E35]/5",
    card: "bg-white border-[#850E35]/12",
    shimmer: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.7) 50%, transparent 100%)",
    label: "text-[#850E35]/50",
    heading: "text-[#850E35]",
    body: "text-[#850E35]/60",
    overlay: "bg-white border-[#850E35]/12",
    spinner: "border-[#850E35]/20 border-t-[#850E35]",
  },
  dark: {
    page: "bg-neutral-950",
    section: "bg-neutral-900/20 border-neutral-800/50",
    bone: "bg-neutral-800/50",
    boneLight: "bg-neutral-800/30",
    card: "bg-neutral-900/50 border-neutral-800",
    shimmer: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.055) 50%, transparent 100%)",
    label: "text-neutral-500",
    heading: "text-white",
    body: "text-neutral-500",
    overlay: "bg-neutral-900 border-neutral-800",
    spinner: "border-neutral-600 border-t-white",
  },
  light: {
    page: "bg-neutral-50",
    section: "bg-white border-neutral-200",
    bone: "bg-neutral-200",
    boneLight: "bg-neutral-100",
    card: "bg-white border-neutral-200",
    shimmer: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.7) 50%, transparent 100%)",
    label: "text-neutral-400",
    heading: "text-neutral-900",
    body: "text-neutral-400",
    overlay: "bg-white border-neutral-200",
    spinner: "border-neutral-300 border-t-neutral-700",
  },
};

// ─── ShimmerEffect ────────────────────────────────────────────────────────────

export const ShimmerEffect = ({ shimmerGradient }) => (
  <motion.div
    className="absolute inset-0 -translate-x-full pointer-events-none"
    initial={{ translateX: "-100%" }}
    animate={{ translateX: "100%" }}
    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
    style={{ background: shimmerGradient }}
  />
);

// ─── 1. Skeleton Block ────────────────────────────────────────────────────────

export const SkeletonBlock = ({
  width = "100%",
  height = "100px",
  rounded = "rounded-xl",
  className = "",
  shimmer = true,
  theme = "skilldelta",
  style = {},
}) => {
  const t = tokens[theme] || tokens.skilldelta;
  return (
    <div
      className={`relative overflow-hidden ${t.bone} ${rounded} ${className}`}
      style={{ width, height, ...style }}
    >
      {shimmer && <ShimmerEffect shimmerGradient={t.shimmer} />}
    </div>
  );
};

// ─── 2. Skeleton Text ─────────────────────────────────────────────────────────

export const SkeletonText = ({
  lines = 3,
  gap = 12,
  className = "",
  shimmer = true,
  theme = "skilldelta",
}) => (
  <div className={`flex flex-col ${className}`} style={{ gap }}>
    {Array.from({ length: lines }).map((_, i) => (
      <SkeletonBlock
        key={i}
        height={14}
        width={i === lines - 1 && lines > 1 ? "70%" : "100%"}
        rounded="rounded-md"
        shimmer={shimmer}
        theme={theme}
      />
    ))}
  </div>
);

// ─── 3. Skeleton Avatar ───────────────────────────────────────────────────────

export const SkeletonAvatar = ({
  size = 48,
  className = "",
  shimmer = true,
  theme = "skilldelta",
}) => (
  <div className={`relative shrink-0 ${className}`}>
    <SkeletonBlock
      width={size}
      height={size}
      rounded="rounded-full"
      shimmer={shimmer}
      theme={theme}
    />
  </div>
);

// ─── 4. Skeleton Card ─────────────────────────────────────────────────────────

export const SkeletonCard = ({
  shimmer = true,
  theme = "skilldelta",
  className = "",
}) => {
  const t = tokens[theme] || tokens.skilldelta;
  return (
    <div className={`w-full rounded-2xl border ${t.card} p-5 shadow-xs ${className}`}>
      <SkeletonBlock
        height={160}
        rounded="rounded-xl"
        className="mb-4"
        shimmer={shimmer}
        theme={theme}
      />
      <SkeletonBlock
        height={22}
        width="60%"
        rounded="rounded-lg"
        className="mb-3"
        shimmer={shimmer}
        theme={theme}
      />
      <SkeletonText lines={2} shimmer={shimmer} theme={theme} />
    </div>
  );
};

// ─── 5. Skeleton List Item ────────────────────────────────────────────────────

export const SkeletonListItem = ({
  shimmer = true,
  theme = "skilldelta",
  className = "",
}) => {
  const t = tokens[theme] || tokens.skilldelta;
  return (
    <div
      className={`flex w-full items-center gap-4 rounded-xl border ${t.card} p-4 shadow-xs ${className}`}
    >
      <SkeletonAvatar size={44} shimmer={shimmer} theme={theme} />
      <div className="flex-1 space-y-2">
        <SkeletonBlock
          height={16}
          width="40%"
          rounded="rounded-md"
          shimmer={shimmer}
          theme={theme}
        />
        <SkeletonBlock
          height={12}
          width="80%"
          rounded="rounded-md"
          shimmer={shimmer}
          theme={theme}
        />
      </div>
    </div>
  );
};

// ─── 6. Skeleton Button ───────────────────────────────────────────────────────

export const SkeletonButton = ({
  width = 120,
  height = 42,
  className = "",
  shimmer = true,
  theme = "skilldelta",
}) => (
  <SkeletonBlock
    width={width}
    height={height}
    rounded="rounded-xl"
    className={`opacity-90 ${className}`}
    shimmer={shimmer}
    theme={theme}
  />
);

// ─── 7. Skeleton Input ────────────────────────────────────────────────────────

export const SkeletonInput = ({
  shimmer = true,
  theme = "skilldelta",
  className = "",
}) => (
  <div className={`w-full space-y-2 ${className}`}>
    <SkeletonBlock
      width={80}
      height={12}
      rounded="rounded-md"
      shimmer={false}
      theme={theme}
    />
    <SkeletonBlock
      width="100%"
      height={48}
      rounded="rounded-xl"
      shimmer={shimmer}
      theme={theme}
    />
  </div>
);

// ─── 8. Skeleton Overlay ──────────────────────────────────────────────────────

export const SkeletonOverlay = ({
  children,
  className = "",
  theme = "skilldelta",
}) => {
  const t = tokens[theme] || tokens.skilldelta;
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border ${t.overlay} ${className}`}
    >
      <div className="relative z-10 p-6 opacity-30 blur-xs">{children}</div>
      <div className="absolute inset-0 z-20 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#850E35]" />
      </div>
      <ShimmerEffect shimmerGradient={t.shimmer} />
    </div>
  );
};

// ─── 9. Full Dashboard Skeleton Screen ────────────────────────────────────────

export const DashboardSkeleton = ({ theme = "skilldelta", shimmer = true }) => {
  const t = tokens[theme] || tokens.skilldelta;

  return (
    <div className={`min-h-screen ${t.page} pt-24 pb-16`}>
      <div className="mx-auto max-w-[1450px] px-4 py-7 sm:px-6 lg:px-8 lg:py-9 space-y-8 animate-in fade-in duration-300">
        
        {/* Welcome Header Skeleton */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <SkeletonBlock width={8} height={8} rounded="rounded-full" shimmer={false} theme={theme} />
            <SkeletonBlock width={180} height={12} rounded="rounded-md" shimmer={shimmer} theme={theme} />
          </div>
          <SkeletonBlock width={340} height={38} rounded="rounded-xl" shimmer={shimmer} theme={theme} />
          <SkeletonBlock width={480} height={18} rounded="rounded-md" shimmer={shimmer} theme={theme} />
        </div>

        {/* Curriculum Upload Card Skeleton */}
        <div className={`rounded-2xl border ${t.card} p-6 sm:p-7 shadow-xs space-y-6`}>
          <div className="flex items-center gap-3">
            <SkeletonBlock width={32} height={32} rounded="rounded-lg" shimmer={shimmer} theme={theme} />
            <SkeletonBlock width={300} height={24} rounded="rounded-lg" shimmer={shimmer} theme={theme} />
          </div>
          <SkeletonBlock width="70%" height={14} rounded="rounded-md" shimmer={shimmer} theme={theme} />
          
          {/* Dropzone Skeleton */}
          <div className="rounded-2xl border-2 border-dashed border-[#850E35]/15 bg-[#FFF5E4]/30 p-10 flex flex-col items-center justify-center gap-3">
            <SkeletonBlock width={44} height={44} rounded="rounded-xl" shimmer={shimmer} theme={theme} />
            <SkeletonBlock width={220} height={16} rounded="rounded-md" shimmer={shimmer} theme={theme} />
            <SkeletonBlock width={280} height={12} rounded="rounded-md" shimmer={shimmer} theme={theme} />
          </div>
        </div>

        {/* Stats Grid Skeleton */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`rounded-2xl border ${t.card} p-5 shadow-xs space-y-4`}>
              <div className="flex items-center justify-between">
                <SkeletonBlock width={44} height={44} rounded="rounded-xl" shimmer={shimmer} theme={theme} />
                <SkeletonBlock width={64} height={22} rounded="rounded-full" shimmer={shimmer} theme={theme} />
              </div>
              <SkeletonBlock width={90} height={12} rounded="rounded-md" shimmer={shimmer} theme={theme} />
              <SkeletonBlock width={60} height={32} rounded="rounded-lg" shimmer={shimmer} theme={theme} />
              <SkeletonBlock width={150} height={12} rounded="rounded-md" shimmer={shimmer} theme={theme} />
            </div>
          ))}
        </div>

        {/* Bottom Grid Skeleton */}
        <div className="grid gap-5 xl:grid-cols-[1.5fr_0.8fr]">
          <div className={`rounded-2xl border ${t.card} p-6 shadow-xs space-y-5`}>
            <div className="flex items-center gap-2">
              <SkeletonBlock width={32} height={32} rounded="rounded-lg" shimmer={shimmer} theme={theme} />
              <SkeletonBlock width={180} height={20} rounded="rounded-md" shimmer={shimmer} theme={theme} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 pt-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-[#850E35]/8 bg-[#FFFBF1] p-4 space-y-3">
                  <div className="flex justify-between">
                    <SkeletonBlock width={90} height={14} rounded="rounded-md" shimmer={shimmer} theme={theme} />
                    <SkeletonBlock width={36} height={14} rounded="rounded-md" shimmer={shimmer} theme={theme} />
                  </div>
                  <SkeletonBlock width="100%" height={8} rounded="rounded-full" shimmer={shimmer} theme={theme} />
                </div>
              ))}
            </div>
          </div>

          <div className={`rounded-2xl border ${t.card} p-6 shadow-xs space-y-5`}>
            <SkeletonBlock width={140} height={14} rounded="rounded-md" shimmer={shimmer} theme={theme} />
            <SkeletonBlock width={220} height={26} rounded="rounded-lg" shimmer={shimmer} theme={theme} />
            <SkeletonBlock width="100%" height={160} rounded="rounded-xl" shimmer={shimmer} theme={theme} />
            <SkeletonBlock width="100%" height={40} rounded="rounded-xl" shimmer={shimmer} theme={theme} />
          </div>
        </div>

      </div>
    </div>
  );
};

// ─── Default Export ───────────────────────────────────────────────────────────

export default function ClassicSkeleton({ theme = "skilldelta", shimmer = true }) {
  return <DashboardSkeleton theme={theme} shimmer={shimmer} />;
}
