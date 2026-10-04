import React, { useEffect, useState } from 'react';
import { BookOpen, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { TextAnimate } from '@/components/TextAnimation';
import { Button1 } from '@/components/Button1';
import { Button2 } from '@/components/Button2';

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

export default function CTA() {
  const breakpoint = useBreakpoint();

  return (
    <section id="cta" className="py-16 sm:py-24 bg-gradient-to-b from-[#520720] via-[#850E35] to-[#400418] text-[#FFFBF1] relative overflow-hidden">
      {/* Subtle Technical Grid Overlay */}
      <div className="absolute inset-0 bg-technical-grid opacity-10 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-[600px] h-[260px] sm:h-[300px] bg-[#E36A6A]/20 blur-3xl pointer-events-none rounded-full" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        {/* Continuous Curriculum Intelligence Badge */}
        <div className="inline-flex items-center gap-2 px-3 sm:px-3.5 py-1 rounded-full text-[11px] sm:text-xs font-semibold bg-[#FFF5E4]/15 text-[#FFF5E4] border border-[#FFF5E4]/25 mb-4 sm:mb-6 shadow-2xs backdrop-blur-xs max-w-full">
          <ShieldCheck className="w-3.5 h-3.5 text-[#E36A6A] shrink-0" />
          <span className="truncate">Continuous Curriculum Intelligence</span>
        </div>

        {/* Heading: Responsive 2-line cadence with word-level animation */}
        <h2
          key={breakpoint}
          className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-snug sm:leading-tight text-[#FFFBF1] mb-5 sm:mb-6 max-w-4xl mx-auto [overflow-wrap:break-word]"
        >
          <span className="block mb-1 sm:mb-2">
            <TextAnimate
              animation="slideUp"
              by="word"
              as="span"
              delay={0.2}
              duration={0.4}
              once={true}
              className="inline"
            >
              Know what your curriculum teaches,
            </TextAnimate>
          </span>
          <span className="block text-[#FCE7CE]">
            <TextAnimate
              animation="slideUp"
              by="word"
              as="span"
              delay={0.5}
              duration={0.4}
              once={true}
              className="inline"
              segmentClassName="text-[#FCE7CE]"
            >
              Understand what the industry needs.
            </TextAnimate>
          </span>
        </h2>

        {/* Subtitle Paragraph: Smooth cohesive reveal with natural text wrapping */}
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-sm sm:text-base md:text-lg text-[#FFF5E4]/90 max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed px-2"
        >
          SylloMetry bridges academic curricula and evolving industry skill demand through AI/ML-driven analysis, empirical vector comparison, and evidence-grounded recommendations.
        </motion.p>

        {/* Action Buttons: Responsive full-width on mobile, side-by-side on tablet/desktop */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4 w-full sm:w-auto max-w-xs sm:max-w-none mx-auto">
          <Link to = "/signup">
          <Button1
            className="w-full sm:w-auto inline-flex items-center justify-center px-7 py-3.5 sm:py-4 rounded-xl bg-[#FFF5E4] hover:bg-[#FFFBF1] active:scale-95 text-[#850E35] font-bold text-sm shadow-lg shadow-black/25 hover:shadow-xl transition-all group"
          >
            Analyze a Curriculum
          </Button1>
          </Link>
          <Button2
            href="#workflow"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 sm:py-4 rounded-xl bg-[#850E35]/60 hover:bg-[#850E35] active:scale-95 text-[#FFFBF1] font-semibold text-sm border border-[#FFF5E4]/30 hover:border-[#FFF5E4]/50 transition-all group"
          >
            <BookOpen className="w-4 h-4 text-[#FFF5E4]/70 group-hover:text-[#FFF5E4] transition-colors shrink-0" />
            <span>Explore the Methodology</span>
          </Button2>
        </div>
      </div>
    </section>
  );
}
