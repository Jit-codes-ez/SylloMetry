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

  // Check if valid credentials exist in localStorage to support seamless rehydration
  const hasLocalAuth = Boolean(
    typeof window !== "undefined" &&
    localStorage.getItem("supabase_token") &&
    localStorage.getItem("syllo_user")
  );

  // Render minimal branded loader matching background while session is loading/rehydrating
  if (loading || (hasLocalAuth && (!session || !user))) {
    return <PageFallback message="Verifying authentication..." />;
  }

  // If unauthenticated or missing verified profile in database, redirect immediately to /signin
  if ((!session || !user || (!user.id && !user.email)) && !hasLocalAuth) {
    return <Navigate to="/signin" replace state={{ from: location }} />;
  }

  // User is authenticated — render child routes
  return <Outlet />;
}

export default ProtectedRoute;

