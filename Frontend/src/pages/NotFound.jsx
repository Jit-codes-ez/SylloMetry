import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button1 } from '@/components/Button1';

/**
 * 404 Not Found Page
 * Implements high-contrast Didot/Bodoni typography matching the reference design:
 * - Desktop: Giant serif "404" with message and "Go Back" button nested inside the oval of the "0"
 * - Mobile: Centered message and button at top, giant serif "404" anchored at the bottom
 */
export default function NotFound() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = '404 - Page Not Available | SylloMetry';
  }, []);

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-80px)] w-full bg-[#FFFBF1] text-[#1E040D] flex flex-col justify-center overflow-hidden pt-20 md:pt-0">
      {/* =========================================================
          DESKTOP LAYOUT (md and above): Text centered inside '0'
      ========================================================= */}
      <div className="hidden md:flex relative w-full min-h-[calc(100vh-80px)] items-center justify-center select-none px-4 lg:px-8 overflow-hidden py-4">
        <div className="relative flex items-center justify-center w-full max-w-[1500px]">
          {/* Layer 1: Giant Serif 404 Background */}
          <div className="flex items-center justify-center font-bodoni text-[clamp(420px,50vw,820px)] leading-[0.78] tracking-[-0.05em] text-[#1E040D] whitespace-nowrap select-none">
            <span className="relative z-0">4</span>
            <span className="relative z-10 inline-block scale-x-[1.6] origin-center -mx-[0.8vw]">0</span>
            <span className="relative z-0">4</span>
          </div>

          {/* Layer 2: Floating Content dead-centered inside the widest belly of the '0' */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[38%] flex flex-col items-center justify-center text-center z-20 pointer-events-auto w-[260px] lg:w-[300px]">
            <h1 className="font-bodoni text-lg lg:text-xl xl:text-[23px] font-normal text-[#1E040D] tracking-normal whitespace-nowrap mb-2 select-text">
              Page Not Available
            </h1>
            <p className="text-xs lg:text-[12.5px] text-[#1E040D]/75 font-sans max-w-[200px] leading-relaxed mb-6 select-text tracking-normal">
              Sorry, this page isn't available anymore or an error occured.
            </p>
            <Button1
              type="button"
              onClick={handleGoBack}
              className="rounded-full border border-[#1E040D]/40 bg-transparent px-8 py-2 text-xs lg:text-[12.5px] font-sans font-medium text-[#1E040D] shadow-xs transition-all duration-200 hover:border-[#850E35] hover:bg-[#850E35] hover:text-[#FFFBF1] hover:shadow-sm active:scale-95 cursor-pointer tracking-normal"
            >
              Go Back
            </Button1>
          </div>
        </div>
      </div>

      {/* =========================================================
          MOBILE LAYOUT (below md): Stacked text top, 404 bottom
      ========================================================= */}
      <div className="flex md:hidden flex-col items-center justify-between min-h-[calc(100vh-140px)] py-12 px-6">
        {/* Top / Center Message Block */}
        <div className="flex flex-col items-center text-center pt-8 sm:pt-14 space-y-3">
          <h1 className="font-serif text-2xl sm:text-3xl font-normal text-[#1E040D] tracking-tight">
            Page Not Available
          </h1>
          <p className="text-xs sm:text-[13px] text-[#1E040D]/75 font-sans max-w-[250px] leading-relaxed">
            Sorry, this page isn't available anymore or an error occured.
          </p>
          <div className="pt-3">
            <button
              type="button"
              onClick={handleGoBack}
              className="rounded-full border border-[#1E040D]/40 bg-transparent px-8 py-2 text-xs font-sans font-medium text-[#1E040D] shadow-xs transition-all duration-200 hover:border-[#850E35] hover:bg-[#850E35] hover:text-[#FFFBF1] active:scale-95 cursor-pointer"
            >
              Go Back
            </button>
          </div>
        </div>

        {/* Bottom Giant 404 */}
        <div className="w-full flex items-center justify-center overflow-hidden select-none pt-10">
          <div className="flex items-center justify-center font-serif text-[42vw] leading-none tracking-[-0.07em] text-[#1E040D]">
            <span className="relative z-0">4</span>
            <span className="relative z-10 px-[1vw]">0</span>
            <span className="relative z-0">4</span>
          </div>
        </div>
      </div>
    </div>
  );
}
