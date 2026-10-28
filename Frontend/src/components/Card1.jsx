import React, {
  cloneElement,
  useEffect,
  useRef,
} from 'react';
import { useReducedMotion } from 'motion/react';
import { cn } from '../lib/utils';

// SylloMetry Theme Tokens: Primary (#850E35), Accent (#E36A6A), Background (#FFF5E4 / #FFFBF1)
const DEFAULT_GLOW_THEME = {
  hue: 340,
  saturation: 81,
  lightness: 29,
};

/**
 * Lightweight GlowHover container
 */
export function GlowHover({
  items = [],
  className = '',
  maskSize = 400,
  glowIntensity = 0.18,
}) {
  return (
    <div className={cn('relative', className)}>
      <div className="contents">
        {items.map((item) =>
          cloneElement(item.element, {
            key: item.id,
            'data-glow-item': item.id,
          })
        )}
      </div>
    </div>
  );
}

/**
 * Backward compatibility alias from smoothui
 */
export function GlowHoverCards(props) {
  return <GlowHover {...props} />;
}

/**
 * Standalone Glow Hover Card Component
 * Styled with SylloMetry's theme (#850E35, #E36A6A, #FFF5E4, #FFFBF1)
 * High-performance: Zero React re-renders on mouse movement, GPU composite-only radial glow.
 */
export function GlowHoverCard({
  title,
  description,
  badge,
  icon: Icon,
  children,
  className = '',
  maskSize = 380,
  glowIntensity = 0.18,
  theme = DEFAULT_GLOW_THEME,
  ...props
}) {
  const containerRef = useRef(null);
  const glowOverlayRef = useRef(null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const container = containerRef.current;
    const overlay = glowOverlayRef.current;
    if (!container || !overlay || shouldReduceMotion) return;

    let rafId = null;

    const handlePointerMove = (e) => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        overlay.style.setProperty('--glow-x', `${x}px`);
        overlay.style.setProperty('--glow-y', `${y}px`);
        overlay.style.opacity = '1';
      });
    };

    const handlePointerLeave = () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      overlay.style.opacity = '0';
    };

    container.addEventListener('pointermove', handlePointerMove, { passive: true });
    container.addEventListener('pointerleave', handlePointerLeave);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, [shouldReduceMotion]);

  const activeTheme = theme || DEFAULT_GLOW_THEME;
  const hsl = `${activeTheme.hue}, ${activeTheme.saturation}%, ${activeTheme.lightness}%`;

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative rounded-2xl border border-[#850E35]/15 bg-white p-6 transition-all duration-300',
        'shadow-xs hover:shadow-md hover:border-[#850E35]/40 overflow-hidden text-[#850E35] card-interactive',
        className
      )}
      data-reveal=""
      {...props}
    >
      {/* Card Content */}
      <div className="relative z-10 w-full">
        {(badge || Icon) && (
          <div className="flex items-center justify-between mb-4">
            {Icon && (
              <div className="w-11 h-11 rounded-xl bg-[#FFF5E4] border border-[#850E35]/15 flex items-center justify-center text-[#850E35] shadow-2xs">
                {typeof Icon === 'function' ? <Icon className="w-5 h-5 text-[#850E35] card-icon" /> : Icon}
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
          <h3 className="text-lg font-bold text-[#850E35] mb-2 tracking-tight">
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

      {/* Lightweight GPU-Accelerated Cursor-Tracking Radial Glow Overlay */}
      {!shouldReduceMotion && (
        <div
          ref={glowOverlayRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 select-none z-0 transition-opacity duration-200"
          style={{
            opacity: 0,
            background: `radial-gradient(${maskSize}px circle at var(--glow-x, -999px) var(--glow-y, -999px), hsla(${hsl}, ${glowIntensity * 1.5}) 0%, transparent 65%)`,
          }}
        />
      )}
    </div>
  );
}

/**
 * Default Card1 export
 * Dynamically serves either as the standalone GlowHoverCard or multi-item GlowHover container
 */
export default function Card1(props) {
  if (props.items && Array.isArray(props.items)) {
    return <GlowHover {...props} />;
  }
  return <GlowHoverCard {...props} />;
}

export const Card = Card1;
export { Card1 };
