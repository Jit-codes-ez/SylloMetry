import React, { useEffect, useRef } from 'react';

/**
 * usePrefersReducedMotion Hook
 */
export function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReducedMotion;
}

/**
 * Reveal Component — App-wide automated Scroll Reveal Orchestrator v2
 *
 * New in this version:
 * - Per-element variants ("up" / "left" / "right" / "scale") auto-assigned
 *   by position — cards near the left of a row slide in from the left,
 *   right-edge cards from the right, center cards scale in, full-width
 *   sections rise up. Override any element with data-reveal-variant="...".
 * - Subtle blur + scale layered on top of the translate for a softer,
 *   more polished settle (transform/filter driven entirely by CSS custom
 *   properties, so nothing here fights Tailwind's own transform utilities).
 * - Wave-style stagger: delay is computed from each card's actual row/column
 *   position (not just DOM order), so grids cascade diagonally instead of
 *   in flat left-to-right order.
 * - Pointer-reactive 3D tilt on .card-interactive cards (desktop/mouse only),
 *   composed additively with the reveal transform via the same CSS variables.
 * - One-shot "sheen" light-sweep across each card every time it becomes
 *   visible (works with the bidirectional reveal, so it replays on re-entry).
 * - Still bidirectional, still MutationObserver-driven for route changes,
 *   still respects prefers-reduced-motion.
 */
export default function Reveal({
  children,
  threshold = [0, 0.1],
  rootMargin = '0px',
  className = '',
  as: Component = 'div',
  ...props
}) {
  const containerRef = useRef(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (prefersReducedMotion) {
      const allTargets = container.querySelectorAll('section, .card-interactive, [data-reveal], [data-reveal-card]');
      allTargets.forEach((el) => {
        el.classList.remove('reveal-init');
        el.classList.add('reveal-visible');
      });
      return;
    }

    const observedSet = new WeakSet();

    const resolveVariant = (el, idx) => {
      if (el.dataset.revealVariant) return;
      if (el.classList.contains('card-interactive') || el.hasAttribute('data-reveal-card')) {
        const rect = el.getBoundingClientRect();
        const parentRect = el.parentElement?.getBoundingClientRect();
        if (parentRect && parentRect.width > 0) {
          const relX = (rect.left + rect.width / 2 - parentRect.left) / parentRect.width;
          el.dataset.revealVariant = relX < 0.34 ? 'left' : relX > 0.66 ? 'right' : 'scale';
        } else {
          el.dataset.revealVariant = idx % 2 === 0 ? 'scale' : 'up';
        }
      } else {
        el.dataset.revealVariant = 'up';
      }
    };

    const computeStagger = () => {
      const groups = new Map();
      const cards = container.querySelectorAll('.card-interactive, [data-reveal-card]');
      cards.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const rowKey = Math.round((rect.top + window.scrollY) / 24);
        if (!groups.has(rowKey)) groups.set(rowKey, []);
        groups.get(rowKey).push({ el, left: rect.left });
      });
      const rowKeys = Array.from(groups.keys()).sort((a, b) => a - b);
      rowKeys.forEach((key, rowIdx) => {
        const items = groups.get(key).sort((a, b) => a.left - b.left);
        items.forEach(({ el }, colIdx) => {
          el.style.setProperty('--reveal-delay', `${rowIdx * 70 + colIdx * 90}ms`);
        });
      });
    };

    const initAndObserveElement = (el, observer, idx) => {
      if (!el || observedSet.has(el)) return;
      observedSet.add(el);

      resolveVariant(el, idx);

      const rect = el.getBoundingClientRect();
      const inViewport = rect.top < window.innerHeight && rect.bottom > 0;

      el.classList.add('reveal-init');

      if (inViewport) {
        const baseDelay = el.dataset.revealDelay ? parseInt(el.dataset.revealDelay, 10) : idx * 70;
        setTimeout(() => {
          el.classList.add('reveal-visible');
          el.classList.remove('reveal-init');
        }, 40 + baseDelay);
      }

      observer.observe(el);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const el = entry.target;
          if (entry.isIntersecting) {
            el.classList.add('reveal-visible');
            el.classList.remove('reveal-init');
          } else {
            const rect = el.getBoundingClientRect();
            if (rect.top > window.innerHeight + 80 || rect.bottom < -80) {
              el.classList.remove('reveal-visible');
              el.classList.add('reveal-init');
            }
          }
        });
      },
      { threshold, rootMargin: '0px 0px -40px 0px' }
    );

    const queryAndObserveAll = () => {
      const sections = container.querySelectorAll('section');
      sections.forEach((sec) => {
        const cards = sec.querySelectorAll(
          '.card-interactive, [data-reveal], [data-reveal-card]'
        );
        if (cards.length > 0) {
          const header = sec.querySelector('.max-w-3xl, [data-section-header]');
          if (header && !header.classList.contains('card-interactive')) {
            initAndObserveElement(header, observer, 0);
          }
          cards.forEach((card, i) => initAndObserveElement(card, observer, i));
        } else {
          initAndObserveElement(sec, observer, 0);
        }
      });

      const standalone = container.querySelectorAll(
        '.card-interactive, [data-reveal], [data-reveal-card]'
      );
      standalone.forEach((el, i) => initAndObserveElement(el, observer, i));

      requestAnimationFrame(computeStagger);
    };

    queryAndObserveAll();

    let debounceTimer = null;
    const mutationObserver = new MutationObserver(() => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        queryAndObserveAll();
      }, 150);
    });
    mutationObserver.observe(container, { childList: true, subtree: true });

    // Pointer-reactive 3D tilt — delegated from the container, desktop/mouse only.
    const supportsFinePointer =
      typeof window !== 'undefined' && window.matchMedia?.('(pointer: fine)').matches;

    let handleMove, handleLeave;
    let tiltRaf = null;

    if (supportsFinePointer) {
      handleMove = (e) => {
        if (tiltRaf) return;
        const target = e.target;
        const clientX = e.clientX;
        const clientY = e.clientY;

        tiltRaf = requestAnimationFrame(() => {
          tiltRaf = null;
          const card = target.closest?.('.card-interactive');
          if (!card || !container.contains(card)) return;
          if (
            card.hasAttribute('data-tilt-wrapper') ||
            card.hasAttribute('data-tilt-card') ||
            card.querySelector?.('[data-tilt-card]')
          ) {
            return;
          }
          const rect = card.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            const px = (clientX - rect.left) / rect.width;
            const py = (clientY - rect.top) / rect.height;
            card.style.setProperty('--tilt-x', `${(py - 0.5) * -8}deg`);
            card.style.setProperty('--tilt-y', `${(px - 0.5) * 8}deg`);
            card.classList.add('is-tilting');
          }
        });
      };
      handleLeave = (e) => {
        if (tiltRaf) {
          cancelAnimationFrame(tiltRaf);
          tiltRaf = null;
        }
        const card = e.target.closest?.('.card-interactive');
        if (!card) return;
        card.classList.remove('is-tilting');
        card.style.removeProperty('--tilt-x');
        card.style.removeProperty('--tilt-y');
      };
      container.addEventListener('pointermove', handleMove, { passive: true });
      container.addEventListener('pointerleave', handleLeave, true);
    }

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      if (tiltRaf) cancelAnimationFrame(tiltRaf);
      observer.disconnect();
      mutationObserver.disconnect();
      if (supportsFinePointer) {
        container.removeEventListener('pointermove', handleMove);
        container.removeEventListener('pointerleave', handleLeave, true);
      }
    };
  }, [threshold, rootMargin, prefersReducedMotion]);

  return (
    <Component ref={containerRef} className={className} {...props}>
      {children}
    </Component>
  );
}

export { Reveal };
export { Reveal as ScrollReveal };
export { Reveal as ScrollAnimation };