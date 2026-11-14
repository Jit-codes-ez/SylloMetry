import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { ShieldCheck, Loader2 } from 'lucide-react';

/**
 * AdminProtectedRoute Component
 * Strictly enforces administrator authentication before granting access to /admin/dashboard.
 */
export function AdminProtectedRoute() {
  const { admin, token, loading, isAuthenticated } = useAdminAuth();
  const location = useLocation();

  const hasLocalAuth = Boolean(
    typeof window !== 'undefined' &&
    localStorage.getItem('syllo_admin_token') &&
    localStorage.getItem('syllo_admin')
  );

  // Dark branded fallback loader matching the dark velvet SylloMetry admin aesthetic
  if (loading || (hasLocalAuth && (!admin || !token))) {
    return (
      <div className="min-h-screen bg-[#160207] text-[#FFF5E4] flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 text-center animate-in fade-in duration-300">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2A0614] border border-[#850E35]/40 text-[#E36A6A] shadow-lg shadow-[#850E35]/20">
            <ShieldCheck size={28} className="animate-pulse" />
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold text-[#FFF5E4]/80">
            <Loader2 size={16} className="animate-spin text-[#E36A6A]" />
            <span>Verifying administrator credentials...</span>
          </div>
        </div>
      </div>
    );
  }

  // Redirect to admin login if not authenticated
  if (!isAuthenticated && !hasLocalAuth) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

export default AdminProtectedRoute;
