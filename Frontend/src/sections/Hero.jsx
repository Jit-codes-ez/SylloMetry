import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SkillNetwork from './SkillNetwork';
import { CardGlare } from '@/components/CardGlare';
import { TextAnimate } from '@/components/TextAnimation';
import { Button1 } from '@/components/Button1';

/**
 * useBreakpoint
 * Tracks which Tailwind breakpoint bucket the viewport is currently in.
 * Used to force TextAnimate to remount (via `key`) when the layout
 * actually changes shape — not on every resize pixel — so its
 * per-character transforms get recalculated against the new layout
 * instead of "scrambling" against stale positions.
 */
function useBreakpoint() {
  const getBucket = () => {
    if (typeof window === 'undefined') return 'lg';
    const w = window.innerWidth;
    if (w < 640) return 'base';
    if (w < 1024) return 'sm';
    return 'lg';
  };

  const [bucket, setBucket] = useState(getBucket);

  useEffect(() => {
    let frame;
    const onResize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setBucket(getBucket()));
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(frame);
    };
  }, []);

  return bucket;
}

export default function Hero() {
  const breakpoint = useBreakpoint();

  return (
    <section id="home" className="relative min-h-screen flex flex-col justify-center pt-20 sm:pt-24 pb-12 sm:pb-16 overflow-hidden scroll-mt-20">
      {/* Subtle Technical Background */}
      <div className="absolute inset-0 bg-technical-dots opacity-40 pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-[720px] h-[220px] sm:h-[280px] lg:h-[360px] bg-gradient-to-tr from-[#E36A6A]/15 via-[#FFF5E4]/40 to-transparent blur-3xl pointer-events-none -z-10" />

      <div className="w-full max-w-7xl xl:max-w-[1360px] 2xl:max-w-[1420px] mx-auto px-3 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 xl:gap-10 items-center">
          {/* Left Column: Hero Narrative */}
          <div className="lg:col-span-5 flex flex-col items-start text-left min-w-0">

            {/* Main Headline */}
            <h1
              key={breakpoint}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-6xl font-extrabold text-[#850E35] tracking-tight leading-[1.15] sm:leading-[1.12] mb-6 max-w-full [overflow-wrap:normal]"
            >
              <span className="block">
                <TextAnimate animation="slideLeft" by="character" as="span">
                  From
                </TextAnimate> {' '} <br></br>
                <TextAnimate animation="slideLeft" by="character" as="span">
                  What Is 'Taught'
                </TextAnimate>
              </span>
              <span className="flex flex-wrap items-baseline gap-x-2 mt-1">
                <TextAnimate animation="slideLeft" by="character" as="span" delay={0.2}>
                To What 
                </TextAnimate> {' '}
                <TextAnimate
                  animation="slideLeft"
                  by="character"
                  as="span"
                  delay={0.35}
                  className="text-transparent bg-clip-text bg-gradient-to-r from-[#850E35] via-[#E36A6A] to-[#850E35] animate-text-shimmer"
                >
                'Industry Needs'
                </TextAnimate>
              </span>
            </h1>

            {/* Supporting Text */}
            <p className="text-base sm:text-lg text-[#850E35]/85 leading-relaxed mb-8 max-w-xl">
              SylloMetry uses AI/ML to analyze academic curricula, understand industry skill demand, detect curriculum gaps, and generate evidence-based recommendations for future-ready education.
            </p>

            {/* Action Buttons */}
            <Link to = "signup">
            <Button1>
              Analyze a Curriculum
            </Button1>
            </Link>
          </div>

          {/* Right Column: Signature Hero Visual Network with CardGlare */}
          <div className="lg:col-span-7 w-full min-w-0">
            <CardGlare
              className="shadow-xl shadow-[#850E35]/10"
              innerClassName="p-2 sm:p-3.5 bg-[#FFFBF1]"
              borderWidth={2.5}
              duration={6}
              shineColor={['#850E35', '#E36A6A', '#FFFBF1']}
            >
              <SkillNetwork />
            </CardGlare>
          </div>
        </div>
      </div>
    </section>
  );
}