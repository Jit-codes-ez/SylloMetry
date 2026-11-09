import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { supabase } from "@/lib/supabaseClient";
import { getCurrentUser, logoutUser } from "@/lib/auth";

const AuthContext = createContext({
  user: null,
  session: null,
  loading: true,
  isAuthenticated: false,
  signOut: async () => {},
  logout: async () => {},
  login: () => {},
});

/**
 * Session Provider managing Supabase JWT state and active user context.
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Helper to enrich raw Supabase user object with backend database profile fields
  const syncUserProfile = useCallback(async (token, fallbackUser) => {
    if (!token) return fallbackUser || null;

    try {
      const backendUser = await getCurrentUser(token);
      if (backendUser) {
        localStorage.setItem("syllo_user", JSON.stringify(backendUser));
        return {
          ...fallbackUser,
          ...backendUser,
        };
      }
    } catch {
      // Retain fallback cached user on temporary network errors
    }

    // Check cached syllo_user
    const cached = localStorage.getItem("syllo_user");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        return { ...fallbackUser, ...parsed };
      } catch {
        // Ignore json parse error
      }
    }

    return fallbackUser || null;
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function initializeAuth() {
      try {
        // 1. Initial mount: retrieve active Supabase session
        const {
          data: { session: initialSession },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("Supabase getSession error:", error.message);
        }

        if (!isMounted) return;

        if (initialSession) {
          setSession(initialSession);
          localStorage.setItem("supabase_token", initialSession.access_token);
          if (initialSession.refresh_token) {
            localStorage.setItem("supabase_refresh_token", initialSession.refresh_token);
          }

          const enriched = await syncUserProfile(
            initialSession.access_token,
            initialSession.user
          );
          if (isMounted) {
            setUser(enriched);
          }
        } else {
          // Check if a legacy token exists in localStorage to recover session
          const legacyToken = localStorage.getItem("supabase_token");
          const legacyRefresh = localStorage.getItem("supabase_refresh_token");

          if (legacyToken) {
            try {
              const { data, error: setErr } = await supabase.auth.setSession({
                access_token: legacyToken,
                refresh_token: legacyRefresh || "",
              });

              if (!setErr && data?.session && isMounted) {
                setSession(data.session);
                const enriched = await syncUserProfile(
                  data.session.access_token,
                  data.session.user
                );
                if (isMounted) {
                  setUser(enriched);
                }
              }
            } catch {
              // Token invalid
              localStorage.removeItem("supabase_token");
              localStorage.removeItem("supabase_refresh_token");
              localStorage.removeItem("syllo_user");
            }
          }
        }
      } catch (err) {
        console.error("Error during Supabase auth initialization:", err);
      } finally {
        if (isMounted) {
          // Rehydration complete - ready to render protected content without flashing
          setLoading(false);
        }
      }
    }

    initializeAuth();

    // 2. Subscribe to Supabase auth state updates (sign in, sign out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      if (!isMounted) return;

      setSession(currentSession);

      if (currentSession) {
        localStorage.setItem("supabase_token", currentSession.access_token);
        if (currentSession.refresh_token) {
          localStorage.setItem("supabase_refresh_token", currentSession.refresh_token);
        }
        const enriched = await syncUserProfile(
          currentSession.access_token,
          currentSession.user
        );
        if (isMounted) {
          setUser(enriched);
          setLoading(false);
        }
      } else {
        localStorage.removeItem("supabase_token");
        localStorage.removeItem("supabase_refresh_token");
        localStorage.removeItem("syllo_user");
        setUser(null);
        setLoading(false);
      }
    });

    // 3. Clean up the auth subscription on unmount
    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [syncUserProfile]);

  /**
   * Graceful sign out clearing Supabase session and local client tokens.
   */
  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      await logoutUser();
    } catch (err) {
      console.warn("Supabase sign out error:", err);
    } finally {
      setSession(null);
      setUser(null);
      localStorage.removeItem("supabase_token");
      localStorage.removeItem("supabase_refresh_token");
      localStorage.removeItem("syllo_user");
      setLoading(false);
    }
  }, []);

  /**
   * Helper function invoked upon successful authentication.
   */
  const login = useCallback(
    async (accessToken, userData, refreshToken) => {
      localStorage.setItem("supabase_token", accessToken);
      if (refreshToken) {
        localStorage.setItem("supabase_refresh_token", refreshToken);
      }
      if (userData) {
        localStorage.setItem("syllo_user", JSON.stringify(userData));
      }

      try {
        const { data } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || localStorage.getItem("supabase_refresh_token") || "",
        });

        if (data?.session) {
          setSession(data.session);
          setUser({ ...data.session.user, ...userData });
        } else {
          setSession({ access_token: accessToken, user: userData });
          setUser(userData || null);
        }
      } catch {
        setSession({ access_token: accessToken, user: userData });
        setUser(userData || null);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const value = useMemo(
    () => ({
      user,
      session,
      loading,
      isAuthenticated: Boolean(session || user),
      signOut,
      logout: signOut,
      login,
      supabase,
    }),
    [user, session, loading, signOut, login]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Custom React Hook to access Supabase auth context.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export default AuthContext;
