import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { Button2 } from '@/components/Button2';
import { syncOAuthUser } from '@/lib/auth';

export default function AuthCallback() {
  const navigate = useNavigate();
  // Status: 'processing' | 'success' | 'account_exists' | 'error'
  const [status, setStatus] = useState('processing');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function processOAuthCallback() {
      try {
        // 1. Check for errors in URL search or hash
        const hash = window.location.hash.startsWith('#')
          ? window.location.hash.substring(1)
          : window.location.hash;
        const hashParams = new URLSearchParams(hash);
        const searchParams = new URLSearchParams(window.location.search);

        const error = hashParams.get('error') || searchParams.get('error');
        const errorDesc =
          hashParams.get('error_description') ||
          searchParams.get('error_description') ||
          hashParams.get('error_code');

        if (error) {
          throw new Error(errorDesc || error || 'Google sign in failed or was cancelled.');
        }

        // 2. Extract access_token from hash (implicit OAuth flow)
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (accessToken) {
          const mode = sessionStorage.getItem('oauth_mode') || 'signup';

          // Check database and synchronize user
          const syncResult = await syncOAuthUser(accessToken, mode);

          // Save valid session tokens and profile
          localStorage.setItem('supabase_token', accessToken);
          if (refreshToken) {
            localStorage.setItem('supabase_refresh_token', refreshToken);
          }
          if (syncResult?.user) {
            localStorage.setItem('syllo_user', JSON.stringify(syncResult.user));
          }

          // If mode is 'signin', redirect to dashboard
          if (mode === 'signin') {
            navigate('/dashboard');
            return;
          }

          // For 'signup', show account creation success modal (do NOT redirect to dashboard)
          setStatus('success');
          return;
        }

        // 3. Fallback: check if standard query code exists
        const code = searchParams.get('code');
        if (code) {
          const mode = sessionStorage.getItem('oauth_mode') || 'signup';
          if (mode === 'signin') {
            navigate('/dashboard');
          } else {
            setStatus('success');
          }
          return;
        }

        // If neither token nor code was provided in callback URL
        throw new Error('No authentication credentials were found in the callback URL.');
      } catch (err) {
        // Clear any stored tokens since the operation failed or was rejected
        localStorage.removeItem('supabase_token');
        localStorage.removeItem('supabase_refresh_token');

        const isAlreadyExists =
          err.status === 409 ||
          (err.message && (
            err.message.toLowerCase().includes('already exists') ||
            err.message.toLowerCase().includes('registered using')
          ));

        if (isAlreadyExists) {
          setStatus('account_exists');
          setErrorMessage(
            err.message || 'An account with this email already exists in SylloMetry. Please sign in instead.'
          );
        } else {
          setStatus('error');
          setErrorMessage(err.message || 'An unexpected error occurred during Google sign in.');
        }
      }
    }

    processOAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#FFFBF1] text-[#850E35] flex items-center justify-center p-4 pt-20">
      <div className="w-full max-w-md rounded-3xl border border-[#850E35]/15 bg-white p-6 sm:p-8 shadow-2xl text-center space-y-6">
        
        {/* 1. PROCESSING STATE */}
        {status === 'processing' && (
          <div className="space-y-4 py-4 animate-in fade-in duration-200">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFF5E4] text-[#850E35] shadow-xs">
              <Loader2 size={28} className="animate-spin text-[#850E35]" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-[#850E35]">
              Connecting with Google
            </h2>
            <p className="text-xs sm:text-sm text-[#850E35]/65 leading-relaxed">
              Verifying your Google account and database credentials...
            </p>
          </div>
        )}

        {/* 2. SUCCESS STATE (CARD VIEW) */}
        {status === 'success' && (
          <div className="text-center animate-in fade-in zoom-in-95 duration-200">
            {/* Success Icon */}
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 shadow-xs">
              <CheckCircle2 size={30} />
            </div>

            {/* Title */}
            <h2 id="success-card-title" className="text-2xl font-bold tracking-tight text-[#850E35]">
              Account Creation Successful!
            </h2>

            {/* Description */}
            <p id="success-card-desc" className="mt-2 text-xs sm:text-sm text-[#850E35]/70 leading-relaxed">
              Your SylloMetry account has been created successfully. Click below to proceed to the login page and sign in to your account.
            </p>

            {/* Button to Login Page using Button2 */}
            <div className="mt-6 flex flex-col gap-2.5">
              <Button2
                href="/signin"
                className="w-full py-3.5 rounded-xl font-bold text-sm bg-[#850E35] text-[#FFFBF1] hover:bg-[#6e092c] shadow-md shadow-[#850E35]/20 hover:shadow-lg transition-all"
                autoFocus
              >
                <span>Go to Login</span>
                <ArrowRight size={16} />
              </Button2>
            </div>
          </div>
        )}

        {/* 3. ACCOUNT ALREADY EXISTS STATE */}
        {status === 'account_exists' && (
          <div className="space-y-5 py-2 animate-in fade-in duration-200">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 shadow-xs">
              <AlertCircle size={28} />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold tracking-tight text-[#850E35]">
                Account Already Exists
              </h2>
              <p className="text-xs sm:text-sm text-[#850E35]/75 leading-relaxed bg-[#FFF5E4] border border-[#850E35]/10 p-3.5 rounded-xl font-medium">
                {errorMessage}
              </p>
            </div>
            <div className="pt-2 flex flex-col gap-2.5">
              <Button2
                href="/signin"
                className="w-full py-3.5 rounded-xl font-bold text-sm bg-[#850E35] text-[#FFFBF1] hover:bg-[#6e092c] shadow-md shadow-[#850E35]/20 hover:shadow-lg transition-all"
                autoFocus
              >
                <span>Go to Login</span>
                <ArrowRight size={16} />
              </Button2>
              <Button2
                href="/signup"
                variant="secondary"
                className="w-full py-3 rounded-xl font-bold text-xs shadow-xs"
              >
                <span>Back to Sign Up</span>
              </Button2>
            </div>
          </div>
        )}

        {/* 4. GENERAL ERROR STATE */}
        {status === 'error' && (
          <div className="space-y-5 py-2 animate-in fade-in duration-200">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 border border-red-200 text-red-600 shadow-xs">
              <AlertCircle size={28} />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold tracking-tight text-[#850E35]">
                Authentication Failed
              </h2>
              <p className="text-xs sm:text-sm text-red-600/90 leading-relaxed bg-red-50 border border-red-100 p-3 rounded-xl">
                {errorMessage}
              </p>
            </div>
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <Button2
                href="/signin"
                className="w-full py-3 rounded-xl font-bold text-xs bg-[#850E35] text-white hover:bg-[#6e092c] shadow-xs"
              >
                <span>Back to Sign In</span>
                <ArrowRight size={14} />
              </Button2>
              <Button2
                href="/signup"
                variant="secondary"
                className="w-full py-3 rounded-xl font-bold text-xs shadow-xs"
              >
                <span>Go to Sign Up</span>
              </Button2>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
