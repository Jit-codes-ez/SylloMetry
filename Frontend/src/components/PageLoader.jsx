import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2 } from 'lucide-react';

/**
 * Standard Universal Spinner using the original Loader2 icon
 */
export function Spinner({ size = 'sm', color = 'white', className = '' }) {
  const sizeMap = {
    xs: 'h-3.5 w-3.5',
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
    xl: 'h-8 w-8',
  };

  const colorMap = {
    white: 'text-white',
    maroon: 'text-[#850E35]',
    coral: 'text-[#E36A6A]',
    current: 'text-current',
  };

  return (
    <Loader2
      className={`animate-spin shrink-0 ${sizeMap[size] || sizeMap.sm} ${colorMap[color] || colorMap.white} ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}

/**
 * Slim top progress bar — ONLY shown when explicitly triggered by a real async loading process
 */
export function TopProgressBar({ isLoading = true }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isLoading) {
      setProgress(100);
      return;
    }

    setProgress(20);
    const t1 = setTimeout(() => setProgress(55), 200);
    const t2 = setTimeout(() => setProgress(82), 600);
    const t3 = setTimeout(() => setProgress(94), 1200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isLoading]);

  return (
    <AnimatePresence>
      {progress > 0 && progress <= 100 && (
        <motion.div
          className="fixed top-0 left-0 right-0 h-[3px] z-[99999] pointer-events-none bg-gradient-to-r from-[#850E35] via-[#E36A6A] to-[#850E35] shadow-[0_0_10px_rgba(227,106,106,0.7)]"
          initial={{ width: '0%', opacity: 1 }}
          animate={{ width: `${progress}%`, opacity: progress === 100 ? 0 : 1 }}
          transition={{
            width: { ease: 'easeOut', duration: 0.35 },
            opacity: { duration: 0.3, delay: progress === 100 ? 0.2 : 0 },
          }}
        />
      )}
    </AnimatePresence>
  );
}

/**
 * Full page loading fallback for route transitions and server fetch delays
 * Displays the original Loader2 icon with the SkillDelta branded container.
 */
export function PageFallback({ message = 'Loading SkillDelta...' }) {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center select-none animate-in fade-in duration-300">
      <TopProgressBar isLoading={true} />

      {/* Branded Emblem with Original Loader2 Icon */}
      <div className="relative mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#850E35] text-white shadow-md">
        <Loader2 size={32} className="animate-spin text-white" />
      </div>

      <div className="space-y-2 max-w-sm">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#850E35]">
          {message}
        </h3>
        <p className="text-xs text-[#850E35]/50 leading-relaxed">
          Retrieving server resources and optimizing your experience.
        </p>
      </div>

      {/* Subtle bottom skeleton shimmer bar */}
      <div className="mt-8 h-1.5 w-48 overflow-hidden rounded-full bg-[#850E35]/10">
        <motion.div
          className="h-full bg-[#850E35] rounded-full"
          initial={{ x: '-100%' }}
          animate={{ x: '100%' }}
          transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
        />
      </div>
    </div>
  );
}

export default PageFallback;
