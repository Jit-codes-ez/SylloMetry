import * as React from 'react';
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useTransform,
} from 'motion/react';
import { cn } from '../lib/utils';

export function Tilt({
  children,
  className,
  style,
  rotationFactor = 15,
  isReverse = false,
  springOptions,
  ...props
}) {
  const ref = React.useRef(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const xSpring = useSpring(x, springOptions || { stiffness: 220, damping: 25 });
  const ySpring = useSpring(y, springOptions || { stiffness: 220, damping: 25 });

  const rotateX = useTransform(
    ySpring,
    [-0.5, 0.5],
    isReverse
      ? [rotationFactor, -rotationFactor]
      : [-rotationFactor, rotationFactor]
  );
  const rotateY = useTransform(
    xSpring,
    [-0.5, 0.5],
    isReverse
      ? [-rotationFactor, rotationFactor]
      : [rotationFactor, -rotationFactor]
  );

  const transform = useMotionTemplate`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;

  const rafRef = React.useRef(null);

  const handleMouseMove = (e) => {
    if (!ref.current) return;
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        x.set((e.clientX - rect.left) / rect.width - 0.5);
        y.set((e.clientY - rect.top) / rect.height - 0.5);
      }
    });
  };

  const handleMouseLeave = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    x.set(0);
    y.set(0);
  };

  React.useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <motion.div
      ref={ref}
      data-tilt-card="true"
      {...props}
      className={className}
      style={{
        transformStyle: 'preserve-3d',
        ...style,
        transform,
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </motion.div>
  );
}

export function ClippedCircle({
  className,
  circleClassName = 'bg-[radial-gradient(circle_at_center,_rgba(227,106,106,0.18)_0%,_rgba(255,245,228,0.25)_40%,_transparent_70%)]',
  circleSize = 600,
}) {
  const containerRef = React.useRef(null);
  const circleRef = React.useRef(null);

  React.useEffect(() => {
    const container = containerRef.current;
    const circle = circleRef.current;
    if (!container || !container.parentElement || !circle) return;

    const parent = container.parentElement;
    let rafId = null;

    const handleMouseEnter = (e) => {
      const rect = parent.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      circle.style.left = `${x}%`;
      circle.style.top = `${y}%`;
      circle.style.transform = 'translate(-50%, -50%) scale(1)';
      circle.style.opacity = '1';
    };

    const handleMouseMove = (e) => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        const rect = parent.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        circle.style.left = `${x}%`;
        circle.style.top = `${y}%`;
      });
    };

    const handleMouseLeave = () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      circle.style.transform = 'translate(-50%, -50%) scale(0)';
      circle.style.opacity = '0';
    };

    parent.addEventListener('mouseenter', handleMouseEnter, { passive: true });
    parent.addEventListener('mousemove', handleMouseMove, { passive: true });
    parent.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      parent.removeEventListener('mouseenter', handleMouseEnter);
      parent.removeEventListener('mousemove', handleMouseMove);
      parent.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        'absolute inset-0 overflow-hidden pointer-events-none z-0',
        className
      )}
    >
      <div
        ref={circleRef}
        className={cn(
          'pointer-events-none absolute rounded-full transition-transform duration-300 ease-out',
          circleClassName
        )}
        style={{
          left: '50%',
          top: '50%',
          width: circleSize,
          height: circleSize,
          transform: 'translate(-50%, -50%) scale(0)',
          opacity: 0,
        }}
      />
    </div>
  );
}

const BADGE_LABEL_CLASSES = {
  success: 'bg-[#850E35] text-[#FFFBF1] border border-[#850E35]',
  warning: 'bg-[#E36A6A] text-[#FFFBF1] border border-[#E36A6A]',
};

export function TiltCard({
  title,
  description,
  price,
  badgeLabel,
  badgeVariant = 'success',
  imageSrc,
  imageAlt = '',
  href,
  children,
  tiltProps,
  className,
  circleClassName,
  circleSize = 600,
  rotationFactor = 11,
  onClick,
  ...props
}) {
  const cleanClassName = className ? className.replace(/\bcard-interactive\b/g, '').trim() : '';

  const cardContent = (
    <Tilt
      rotationFactor={rotationFactor}
      {...tiltProps}
      className={cn(
        'relative group overflow-hidden',
        'bg-white border border-[#850E35]/15 rounded-2xl',
        'flex flex-col justify-between text-[#850E35]',
        'min-h-52 w-full h-full p-6',
        'hover:bg-[#FFF2D0] hover:shadow-xl hover:shadow-[#E36A6A]/25 hover:border-[#E36A6A]/70',
        'transition-[background-color,border-color,box-shadow] duration-300 ease-out',
        cleanClassName
      )}
      {...(!href ? props : {})}
    >
      {title ? (
        <>
          <div className="flex flex-row transition-all duration-200 justify-between items-start z-10">
            <div className="flex flex-col gap-1.5 flex-1 mr-3">
              <h3 className="text-xl font-bold tracking-tight text-[#850E35] group-hover:text-[#6F0A2B] transition-colors">
                {title}
              </h3>
              {description && (
                <p className="text-[#850E35]/75 text-xs sm:text-sm leading-relaxed">
                  {description}
                </p>
              )}
              {children && <div className="mt-3">{children}</div>}
            </div>

            {price && badgeLabel ? (
              <div className="inline-flex h-fit items-center text-xs whitespace-nowrap shrink-0 shadow-2xs">
                <span className="rounded-l-full bg-[#FFF5E4] text-[#850E35] border border-r-0 border-[#850E35]/20 py-1 px-3 font-semibold">
                  {price}
                </span>
                <span
                  className={cn(
                    'rounded-r-full text-xs py-1 px-3 font-bold',
                    BADGE_LABEL_CLASSES[badgeVariant] || BADGE_LABEL_CLASSES.success
                  )}
                >
                  {badgeLabel}
                </span>
              </div>
            ) : price ? (
              <span className="h-fit rounded-full bg-[#FFF5E4] text-[#850E35] border border-[#850E35]/20 px-3 py-1 text-xs font-semibold whitespace-nowrap shrink-0 shadow-2xs">
                {price}
              </span>
            ) : null}
          </div>

          {imageSrc && (
            <img
              src={imageSrc}
              alt={imageAlt}
              width={288}
              height={224}
              loading="lazy"
              decoding="async"
              className={cn(
                'absolute z-10 -bottom-6 -right-6 w-56 sm:w-64',
                'rotate-[-5deg] border-[#850E35]/20 border rounded-xl shadow-md',
                'transition-transform duration-300 ease-out',
                'group-hover:-rotate-2 group-hover:-translate-y-1.5 group-hover:-translate-x-1'
              )}
            />
          )}
        </>
      ) : (
        <div className="relative z-10 flex flex-col justify-between h-full w-full">
          {children}
        </div>
      )}

      {/* Radial Shine on Cursor Hover */}
      <ClippedCircle circleClassName={circleClassName} circleSize={circleSize} />
    </Tilt>
  );

  return (
    <div
      className="card-interactive h-full w-full"
      data-tilt-wrapper="true"
      data-reveal-card="true"
      onClick={!href ? onClick : undefined}
    >
      {href ? (
        <a href={href} className="block cursor-pointer h-full" onClick={onClick} {...props}>
          {cardContent}
        </a>
      ) : (
        cardContent
      )}
    </div>
  );
}

/**
 * Default Card2 export
 */
export default function Card2(props) {
  return <TiltCard {...props} />;
}

Card2.Tilt = Tilt;
Card2.ClippedCircle = ClippedCircle;
