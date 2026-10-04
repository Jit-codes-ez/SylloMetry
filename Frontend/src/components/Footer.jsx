import React from 'react';
import { ShieldCheck, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

function GithubIcon({ className = 'w-4 h-4' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

export default function Footer() {
  return (
    <footer className="bg-[#FFF5E4]/80 border-t border-[#850E35]/15 text-[#850E35]/70 text-xs py-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand & Tagline */}
          <div className="md:col-span-2 space-y-3">
            <a href="/" className="inline-block select-none group">
              <img
                src="/banner.png"
                alt="SylloMetry Logo"
                className="h-10 sm:h-14 md:h-16 w-auto max-w-[220px] sm:max-w-none object-contain transition-transform duration-200 group-hover:scale-105"
              />
            </a>

            <p className="text-[#850E35]/70 max-w-2xl leading-relaxed text-lg font-semibold">
              Curriculum evolved by AI, Validated by industry.
            </p>

            <div className="pt-2 text-[11px] text-[#850E35]/60 font-mono flex items-center gap-1.5 font-bold">
              <ShieldCheck className="w-3.5 h-3.5 text-[#850E35]" />
              <span className="font-bold">MCA Academic Research Initiative</span>
            </div>
          </div>

          {/* Resources Column */}
          <div>
            <div className="font-bold uppercase tracking-wider text-[#850E35] text-[11px] mb-3">
              RESOURCES
            </div>
            <ul className="space-y-2 text-[#850E35]/70">
              <li>
                <Link to="/documentation" className="hover:text-[#850E35] transition-colors font-medium">
                  Documentation
                </Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-[#850E35] transition-colors font-medium">
                  FAQ & Support
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Trust Column */}
          <div className="flex flex-col justify-between">
            <div>
              <div className="font-bold uppercase tracking-wider text-[#850E35] text-[11px] mb-3">
                LEGAL & TRUST
              </div>
              <ul className="space-y-2 text-[#850E35]/70">
                <li>
                  <Link to="/privacy" className="hover:text-[#850E35] transition-colors font-medium">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link to="/terms" className="hover:text-[#850E35] transition-colors font-medium">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>

            {/* Social & Connect Icon Buttons - Positioned lower above the notice */}
            <div className="flex items-center gap-2.5 pt-8 mt-auto">
              <a
                href="https://github.com/Jit-codes-ez/SylloMetry"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="SylloMetry GitHub Repository"
                className="flex items-center justify-center w-9 h-9 rounded-xl border border-[#850E35]/20 bg-white/70 text-[#850E35] shadow-xs transition-all duration-200 hover:bg-[#850E35] hover:text-[#FFFBF1] hover:border-[#850E35] hover:shadow-md hover:scale-105 active:scale-95"
              >
                <GithubIcon className="w-4 h-4" />
              </a>

              <a
                href="mailto:jithazraedu@gmail.com"
                aria-label="Contact SylloMetry via Email"
                className="flex items-center justify-center w-9 h-9 rounded-xl border border-[#850E35]/20 bg-white/70 text-[#850E35] shadow-xs transition-all duration-200 hover:bg-[#850E35] hover:text-[#FFFBF1] hover:border-[#850E35] hover:shadow-md hover:scale-105 active:scale-95"
              >
                <Mail className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Notice */}
        <div className="pt-6 border-t border-[#850E35]/10 flex flex-col sm:flex-row items-center justify-center gap-4 text-[#850E35]/60 text-[11px]">
          <div>
            © {new Date().getFullYear()} SylloMetry . Designed for curriculum intelligence and academic evaluation . All Rights Reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
