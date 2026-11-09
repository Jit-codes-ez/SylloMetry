import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { PageFallback } from "@/components/PageLoader";

/**
 * ProtectedRoute Component
 *
 * Enforces authentication before granting access to private routes like /dashboard.
 * 1. Displays branded loader while rehydrating Supabase session (prevents flashes).
 * 2. Redirects unauthenticated users to /login preserving the requested path in location state.
 * 3. Renders nested route elements (<Outlet />) when authenticated.
 */
export function ProtectedRoute() {
  const { session, user, loading } = useAuth();
  const location = useLocation();

  // Render minimal branded loader matching background while session is loading/rehydrating
  if (loading) {
    return <PageFallback message="Verifying authentication..." />;
  }

  // If unauthenticated, redirect immediately to /login preserving original destination
  if (!session && !user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // User is authenticated — render child routes
  return <Outlet />;
}

export default ProtectedRoute;

