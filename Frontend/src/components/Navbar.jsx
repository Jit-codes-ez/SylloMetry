import React, { useState, useEffect, useRef } from 'react';
import { Menu, X, ArrowRight, ArrowLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button2 } from '@/components/Button2';
import { cn } from '@/lib/utils';
import ScrollProgressBar from '@/components/ScrollProgressBar';

const NAV_LINKS = [
  { id: 'home', href: '/#home', label: 'Home' },
  { id: 'capabilities', href: '/#capabilities', label: 'Capabilities' },
  { id: 'workflow', href: '/#workflow', label: 'How It Works' },
  { id: 'about', href: '/#about', label: 'About' },
  { id: 'research', href: '/#research', label: 'Architecture' },
];

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();

  const isMinimalNavPage = location.pathname !== '/';

  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');

  const isClickScrolling = useRef(false);
  const clickTimerRef = useRef(null);

  const handleNavClick = (id, e) => {
    e?.preventDefault();
    if (location.pathname !== '/') {
      navigate(`/#${id}`);
      return;
    }

    setActiveSection(id);
    isClickScrolling.current = true;
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    clickTimerRef.current = setTimeout(() => {
      isClickScrolling.current = false;
    }, 900);

    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
    if (window.history && window.history.pushState) {
      window.history.pushState(null, '', `#${id}`);
    }
  };

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (isClickScrolling.current) {
            ticking = false;
            return;
          }

          const scrollY = window.scrollY;
          setIsScrolled(scrollY > 20);

          if (isMinimalNavPage) {
            ticking = false;
            return;
          }

          // Check if at the bottom of the page
          const isAtBottom =
            window.innerHeight + Math.round(scrollY) >=
            document.documentElement.scrollHeight - 60;
          if (isAtBottom) {
            setActiveSection(NAV_LINKS[NAV_LINKS.length - 1].id);
            ticking = false;
            return;
          }

          // Check if at top
          if (scrollY < 80) {
            setActiveSection('home');
            ticking = false;
            return;
          }

          // Determine active section using getBoundingClientRect
          const offsetThreshold = 160;
          let currentSection = 'home';

          for (const link of NAV_LINKS) {
            const el = document.getElementById(link.id);
            if (el) {
              const rect = el.getBoundingClientRect();
              if (rect.top <= offsetThreshold && rect.bottom > offsetThreshold) {
                currentSection = link.id;
                break;
              }
            }
          }

          setActiveSection(currentSection);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    };
  }, [isMinimalNavPage]);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-[#FFFBF1]/95 backdrop-blur-md border-b border-[#850E35]/15 shadow-xs py-3'
          : 'bg-transparent py-4 sm:py-5 border-b border-transparent'
      }`}
    >
      <ScrollProgressBar className="fixed top-0 inset-x-0 z-[60] h-[3px]" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Left: SylloMetry Logo */}
        <a href="/" className="flex items-center gap-2 group select-none">
          <img
            src="/banner.png"
            alt="SylloMetry Logo"
            className="h-8 sm:h-10 w-auto max-w-[160px] sm:max-w-none object-contain transition-transform duration-200 group-hover:scale-105"
          />
        </a>

        {/* Center: Navigation Links as Elegant Floating Pill with Button2 Ripple (Only on Home/Marketing pages) */}
        {!isMinimalNavPage && (
          <nav className="hidden md:flex items-center gap-1 p-1 rounded-full bg-white/85 backdrop-blur-md border border-[#850E35]/15 shadow-xs shadow-[#850E35]/5">
            {NAV_LINKS.map((link) => {
              const isActive = activeSection === link.id;
              return (
                <Button2
                  key={link.id}
                  href={link.href}
                  variant="nav"
                  rippleColor={isActive ? '#FFF5E4' : 'rgba(133, 14, 53, 0.2)'}
                  onClick={(e) => handleNavClick(link.id, e)}
                  className={cn(
                    'px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer select-none',
                    isActive
                      ? 'bg-[#850E35] hover:bg-[#6F0A2B] text-[#FFFBF1] shadow-xs font-bold'
                      : 'text-[#850E35]/75 hover:text-[#850E35] hover:bg-[#850E35]/10'
                  )}
                >
                  {link.label}
                </Button2>
              );
            })}
          </nav>
        )}

        {/* Right Section: Contextual Actions */}
        {isMinimalNavPage ? (
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Back to Home Button */}
            <Button2
              href="/"
              variant="nav"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold text-[#850E35]/85 hover:text-[#850E35] hover:bg-[#FFF5E4] border border-[#850E35]/20 shadow-2xs hover:shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#850E35]" />
              <span>Home</span>
            </Button2>
          </div>
        ) : (
          <div className="hidden sm:flex items-center gap-3">
            <Button2
              href="/signin"
              variant="default"
              className="group inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-[#FFFBF1] bg-[#850E35] hover:bg-[#6F0A2B] shadow-xs shadow-[#850E35]/25 hover:shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <span>Sign In</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Button2>
          </div>
        )}

        {/* Mobile Menu Button (Only for Home/Marketing pages) */}
        {!isMinimalNavPage && (
          <div className="flex md:hidden items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-[#850E35] hover:bg-[#FFF5E4] border border-[#850E35]/20 cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        )}
      </div>

      {/* Mobile Drawer with Button2 Ripple (Only for Home/Marketing pages) */}
      {!isMinimalNavPage && mobileMenuOpen && (
        <div className="md:hidden bg-[#FFFBF1] border-b border-[#850E35]/15 px-4 pt-3 pb-6 space-y-1.5 shadow-lg">
          {NAV_LINKS.map((link) => {
            const isActive = activeSection === link.id;
            return (
              <Button2
                key={link.id}
                href={link.href}
                variant="nav"
                rippleColor={isActive ? '#FFF5E4' : 'rgba(133, 14, 53, 0.2)'}
                onClick={(e) => {
                  handleNavClick(link.id, e);
                  setMobileMenuOpen(false);
                }}
                className={cn(
                  'w-full justify-start px-3.5 py-2.5 rounded-xl text-sm transition-all cursor-pointer',
                  isActive
                    ? 'bg-[#850E35] text-[#FFFBF1] font-bold shadow-xs'
                    : 'text-[#850E35]/80 hover:text-[#850E35] hover:bg-[#FFF5E4] font-medium'
                )}
              >
                {link.label}
              </Button2>
            );
          })}
          <div className="pt-2 border-t border-[#850E35]/10">
            <Button2
              href="/signin"
              onClick={() => {
                setTimeout(() => {
                  setMobileMenuOpen(false);
                }, 220);
              }}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold text-[#FFFBF1] bg-[#850E35] hover:bg-[#6F0A2B] shadow-xs cursor-pointer"
            >
              <span>Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </Button2>
          </div>
        </div>
      )}
    </header>
  );
}
