import React from 'react';
import { cn } from '@/lib/utils';

// Curated default glare colors matching SylloMetry's theme: Primary (#850E35), Accent (#E36A6A), Highlight (#FFFBF1)
const DEFAULT_SHINE_COLORS = ['#850E35', '#E36A6A', '#FFFBF1'];

/**
 * ShineBorder Component
 * Creates an animated rotating glare beam around the border of an element.
 */
export function ShineBorder({
  borderWidth = 2,
  duration = 7,
  shineColor = DEFAULT_SHINE_COLORS,
  className,
  style,
  ...props
}) {
  const colors = Array.isArray(shineColor) ? shineColor : [shineColor, '#E36A6A', '#FFFBF1'];
  const c1 = colors[0] || '#850E35';
  const c2 = colors[1] || '#E36A6A';
  const c3 = colors[2] || '#FFFBF1';

  return (
    <>
      {/* Outer blurred ambient glare aura */}
      <div
        style={{
          '--duration': `${duration}s`,
          background: `conic-gradient(from 0deg at 50% 50%, transparent 0deg, transparent 45deg, ${c1} 100deg, ${c2} 140deg, ${c3} 165deg, ${c2} 190deg, ${c1} 220deg, transparent 270deg, transparent 360deg)`,
          ...style,
        }}
        className={cn(
          'animate-spin-glare pointer-events-none absolute -inset-[150%] blur-md opacity-80 will-change-transform',
          className
        )}
        aria-hidden="true"
        {...props}
      />

      {/* Crisp rotating glare border */}
      <div
        style={{
          '--duration': `${duration}s`,
          background: `conic-gradient(from 0deg at 50% 50%, transparent 0deg, transparent 45deg, ${c1} 100deg, ${c2} 140deg, ${c3} 165deg, ${c2} 190deg, ${c1} 220deg, transparent 270deg, transparent 360deg)`,
          ...style,
        }}
        className={cn(
          'animate-spin-glare pointer-events-none absolute -inset-[150%] will-change-transform',
          className
        )}
        aria-hidden="true"
      />
    </>
  );
}

/**
 * CardGlare Component
 * Adds an animated rotating glare/shine border around a simple card.
 *
 * @param {React.ReactNode} children - Content to render inside the card
 * @param {string} [title] - Optional title for quick card creation
 * @param {string} [description] - Optional description text
 * @param {string} [badge] - Optional badge tag
 * @param {React.ComponentType} [icon] - Optional Lucide or custom icon component
 * @param {number} [borderWidth=2] - Width of the shining border in pixels
 * @param {number} [duration=7] - Time in seconds for one full glare rotation cycle
 * @param {string|string[]} [shineColor] - Color or array of colors for the glare gradient
 * @param {string} [className] - Additional class names for the card container
 * @param {string} [innerClassName] - Additional class names for the inner content container
 */
export function CardGlare({
  children,
  title,
  description,
  badge,
  icon: Icon,
  borderWidth = 2.5,
  duration = 7,
  shineColor = DEFAULT_SHINE_COLORS,
  className = '',
  innerClassName = '',
  interactive = false,
  style,
  ...props
}) {
  return (
    <div
      className={cn(
        'relative rounded-2xl overflow-hidden transition-all duration-300 shadow-md text-[#850E35]',
        interactive && 'hover:shadow-xl card-interactive',
        className
      )}
      data-reveal=""
      style={{
        padding: `${borderWidth}px`,
        ...style,
      }}
      {...props}
    >
      {/* Animated Rotating Glare Beam */}
      <ShineBorder
        borderWidth={borderWidth}
        duration={duration}
        shineColor={shineColor}
      />

      {/* Subtle diagonal surface glare reflex */}
      <div
        className="pointer-events-none absolute inset-0 z-20 opacity-20 bg-gradient-to-tr from-transparent via-white/25 to-transparent"
        aria-hidden="true"
      />

      {/* Inner Card Content & Surface */}
      <div
        className={cn(
          'relative z-10 w-full h-full rounded-[14px] bg-[#FFFBF1] overflow-hidden p-6 sm:p-7',
          innerClassName
        )}
      >
        {(badge || Icon) && (
          <div className="flex items-center justify-between mb-4">
            {Icon && (
              <div className="w-11 h-11 rounded-xl bg-[#FFF5E4] border border-[#850E35]/15 flex items-center justify-center text-[#850E35] shadow-2xs group-hover:scale-105 group-hover:bg-[#850E35] group-hover:text-[#FFFBF1] transition-all duration-300">
                {typeof Icon === 'function' ? <Icon className="w-5 h-5 card-icon" /> : Icon}
              </div>
            )}
            {badge && (
              <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#FFF5E4] border border-[#850E35]/20 text-[#850E35]">
                {badge}
              </span>
            )}
          </div>
        )}

        {title && (
          <h3 className="text-lg font-bold text-[#850E35] mb-2 tracking-tight group-hover:text-[#E36A6A] transition-colors">
            {title}
          </h3>
        )}

        {description && (
          <p className="text-xs sm:text-sm text-[#850E35]/80 leading-relaxed mb-3">
            {description}
          </p>
        )}

        {children}
      </div>
    </div>
  );
}

export default CardGlare;
