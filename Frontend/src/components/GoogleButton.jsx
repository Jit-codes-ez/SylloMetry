import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Official Google 'G' vector logo with brand colors.
 */
export function GoogleIcon({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

/**
 * Reusable Google Authentication Button.
 */
export function GoogleButton({
  text = 'Continue with Google',
  loadingText = 'Connecting to Google...',
  isLoading = false,
  disabled = false,
  onClick,
  className = '',
  ...props
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isLoading}
      className={cn(
        'group flex w-full items-center justify-center gap-3 rounded-xl border border-[#850E35]/15 bg-white py-3 px-4 text-sm font-semibold text-[#850E35] shadow-[0_2px_8px_rgba(133,14,53,0.04)] transition-all duration-200 hover:border-[#850E35]/30 hover:bg-[#FFFBF1] hover:shadow-md active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60',
        className
      )}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 size={16} className="animate-spin text-[#850E35]" />
          <span>{loadingText}</span>
        </>
      ) : (
        <>
          <GoogleIcon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-105" />
          <span>{text}</span>
        </>
      )}
    </button>
  );
}

export default GoogleButton;
