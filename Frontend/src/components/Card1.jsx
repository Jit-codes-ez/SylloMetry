import React, {
  cloneElement,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useReducedMotion } from 'motion/react';
import { cn } from '../lib/utils';

// SylloMetry Theme Tokens: Primary (#850E35), Accent (#E36A6A), Background (#FFF5E4 / #FFFBF1)
const DEFAULT_GLOW_THEME = {
  hue: 340,
  saturation: 81,
  lightness: 29,
};

export function GlowHover({
  items = [],
  className = '',
  maskSize = 400,
  glowIntensity = 0.18,
}) {
  const containerRef = useRef(null);
  const overlayRef = useRef(null);
  const [mousePosition, setMousePosition] = useState({
    opacity: 0,
    x: 0,
    y: 0,
  });
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const container = containerRef.current;
    if (!container || shouldReduceMotion) {
      return;
    }

    const handlePointerMove = (e) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      setMousePosition({
        opacity: 1,
        x,
        y,
      });
    };

    const handlePointerLeave = () => {
      setMousePosition((prev) => ({ ...prev, opacity: 0 }));
    };

    container.addEventListener('pointermove', handlePointerMove);
    container.addEventListener('pointerleave', handlePointerLeave);

    return () => {
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, [shouldReduceMotion]);

  // Sync overlay card sizes and positions with original cards
  useEffect(() => {
    if (shouldReduceMotion || !overlayRef.current || !containerRef.current) {
      return;
    }

    const syncCards = () => {
      const container = containerRef.current;
      const overlay = overlayRef.current;
      if (!(container && overlay)) {
        return;
      }

      const originalEls = container.querySelectorAll('[data-glow-item]');
      const overlayEls = overlay.querySelectorAll('[data-glow-overlay-item]');

      originalEls.forEach((itemEl, index) => {
        const overlayItemEl = overlayEls[index];
        if (!(itemEl && overlayItemEl)) {
          return;
        }

        const itemRect = itemEl.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        const left = itemRect.left - containerRect.left;
        const top = itemRect.top - containerRect.top;

        overlayItemEl.style.position = 'absolute';
        overlayItemEl.style.left = `${left}px`;
        overlayItemEl.style.top = `${top}px`;
        overlayItemEl.style.width = `${itemRect.width}px`;
        overlayItemEl.style.height = `${itemRect.height}px`;
      });
    };

    const observers = [];
    const mutationObserver = new MutationObserver(syncCards);
    const container = containerRef.current;
    const originalEls = container?.querySelectorAll('[data-glow-item]') || [];

    originalEls.forEach((itemEl) => {
      const observer = new ResizeObserver(() => {
        syncCards();
      });
      observer.observe(itemEl);
      observers.push(observer);
    });

    if (container) {
      mutationObserver.observe(container, {
        attributes: true,
        childList: true,
        subtree: true,
      });
    }

    syncCards();

    window.addEventListener('scroll', syncCards, { passive: true });
    window.addEventListener('resize', syncCards);

    return () => {
      for (const observer of observers) {
        observer.disconnect();
      }
      mutationObserver.disconnect();
      window.removeEventListener('scroll', syncCards);
      window.removeEventListener('resize', syncCards);
    };
  }, [shouldReduceMotion, items]);

  const applyGlowStyles = (element, theme, isOverlay = false) => {
    if (!isOverlay) {
      return element;
    }

    const existingStyle = element.props.style || {};
    const existingClassName = element.props.className || '';

    // Color theme matching SylloMetry's palette
    const activeTheme = theme || DEFAULT_GLOW_THEME;
    const hsl = `${activeTheme.hue}, ${activeTheme.saturation}%, ${activeTheme.lightness}%`;

    const glowStyles = {
      backgroundColor: `hsla(${hsl}, ${glowIntensity})`,
      borderColor: `hsla(${hsl}, 0.85)`,
      boxShadow: `0 0 0 1px inset hsla(${hsl}, 0.4), 0 0 24px hsla(${hsl}, ${glowIntensity * 1.5})`,
    };

    return cloneElement(element, {
      ...element.props,
      'data-glow-overlay-item': 'true',
      className: cn(existingClassName, 'glow-overlay-item'),
      style: {
        ...existingStyle,
        ...glowStyles,
      },
    });
  };

  return (
    <div
      className={cn('relative', className)}
      ref={containerRef}
      style={shouldReduceMotion ? undefined : { willChange: 'contents' }}
    >
      {/* Original Items */}
      <div className="contents">
        {items.map((item) =>
          cloneElement(item.element, {
            key: item.id,
            'data-glow-item': item.id,
          })
        )}
      </div>

      {/* Overlay with GPU-Accelerated Glow Effect */}
      {!shouldReduceMotion && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 select-none"
          ref={overlayRef}
          style={{
            maskImage: `radial-gradient(${maskSize}px ${maskSize}px at ${mousePosition.x}px ${mousePosition.y}px, #000 1%, transparent 50%)`,
            WebkitMaskImage: `radial-gradient(${maskSize}px ${maskSize}px at ${mousePosition.x}px ${mousePosition.y}px, #000 1%, transparent 50%)`,
            opacity: mousePosition.opacity,
            transition: 'opacity 200ms ease, mask-image 200ms ease, -webkit-mask-image 200ms ease',
            willChange: 'mask-image, opacity',
          }}
        >
          {items.map((item) => {
            const glowElement = applyGlowStyles(item.element, item.theme, true);
            return cloneElement(glowElement, {
              key: item.id,
            });
          })}
        </div>
      )}
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
 * All properties preserved: title, description, badge, icon, children, maskSize, glowIntensity, theme, etc.
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
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0, opacity: 0 });
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const container = containerRef.current;
    if (!container || shouldReduceMotion) return;

    const handlePointerMove = (e) => {
      const rect = container.getBoundingClientRect();
      setMousePosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        opacity: 1,
      });
    };

    const handlePointerLeave = () => {
      setMousePosition((prev) => ({ ...prev, opacity: 0 }));
    };

    container.addEventListener('pointermove', handlePointerMove);
    container.addEventListener('pointerleave', handlePointerLeave);

    return () => {
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

      {/* Cursor-Tracking Glow Mask Overlay */}
      {!shouldReduceMotion && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 select-none z-0"
          style={{
            WebkitMaskImage: `radial-gradient(${maskSize}px ${maskSize}px at ${mousePosition.x}px ${mousePosition.y}px, #000 1%, transparent 50%)`,
            maskImage: `radial-gradient(${maskSize}px ${maskSize}px at ${mousePosition.x}px ${mousePosition.y}px, #000 1%, transparent 50%)`,
            opacity: mousePosition.opacity,
            transition: 'opacity 200ms ease',
            backgroundColor: `hsla(${hsl}, ${glowIntensity})`,
            borderColor: `hsla(${hsl}, 0.85)`,
            boxShadow: `0 0 0 1px inset hsla(${hsl}, 0.4), 0 0 24px hsla(${hsl}, ${glowIntensity * 1.5})`,
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

