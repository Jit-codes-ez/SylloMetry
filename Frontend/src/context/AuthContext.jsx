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
  const [session, setSession] = useState(() => {
    if (typeof window === "undefined") return null;
    const token = localStorage.getItem("supabase_token");
    const rawUser = localStorage.getItem("syllo_user");
    if (token && rawUser) {
      try {
        const parsed = JSON.parse(rawUser);
        if (parsed && (parsed.id || parsed.email)) {
          return { access_token: token, user: parsed };
        }
      } catch {}
    }
    return null;
  });

  const [user, setUser] = useState(() => {
    if (typeof window === "undefined") return null;
    const rawUser = localStorage.getItem("syllo_user");
    if (rawUser) {
      try {
        const parsed = JSON.parse(rawUser);
        if (parsed && (parsed.id || parsed.email)) {
          return parsed;
        }
      } catch {}
    }
    return null;
  });

  const [loading, setLoading] = useState(false);

  // Helper to enrich raw Supabase user object with backend database profile fields
  const syncUserProfile = useCallback(async (token, fallbackUser) => {
    if (!token) return null;

    try {
      const backendUser = await getCurrentUser(token);
      if (backendUser && (backendUser.id || backendUser.email)) {
        localStorage.setItem("syllo_user", JSON.stringify(backendUser));
        return {
          ...fallbackUser,
          ...backendUser,
        };
      }
    } catch {
      // Retain fallback cached user on temporary network errors
    }

    // Check cached syllo_user ONLY if it matches the current session user
    const cached = localStorage.getItem("syllo_user");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (
          parsed &&
          (parsed.id || parsed.email) &&
          (parsed.id === fallbackUser?.id || parsed.email === fallbackUser?.email)
        ) {
          return { ...fallbackUser, ...parsed };
        }
      } catch {
        // Ignore json parse error
      }
    }

    // If user has no verified record in SylloMetry database, return null
    return null;
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function initializeAuth() {
      try {
        const isCallbackRoute =
          typeof window !== "undefined" &&
          window.location.pathname.startsWith("/auth/callback");

        if (isCallbackRoute) {
          // On OAuth callback route, leave session verification to AuthCallback component
          return;
        }

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
          const enriched = await syncUserProfile(
            initialSession.access_token,
            initialSession.user
          );
          if (isMounted) {
            if (enriched) {
              setSession(initialSession);
              setUser(enriched);
              localStorage.setItem("supabase_token", initialSession.access_token);
              if (initialSession.refresh_token) {
                localStorage.setItem("supabase_refresh_token", initialSession.refresh_token);
              }
            } else {
              // Token exists in Supabase Auth but user is NOT registered in SylloMetry database
              setSession(null);
              setUser(null);
              localStorage.removeItem("supabase_token");
              localStorage.removeItem("supabase_refresh_token");
              localStorage.removeItem("syllo_user");
              await supabase.auth.signOut().catch(() => {});
            }
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
                const enriched = await syncUserProfile(
                  data.session.access_token,
                  data.session.user
                );
                if (isMounted) {
                  if (enriched) {
                    setSession(data.session);
                    setUser(enriched);
                  } else {
                    setSession(null);
                    setUser(null);
                    localStorage.removeItem("supabase_token");
                    localStorage.removeItem("supabase_refresh_token");
                    localStorage.removeItem("syllo_user");
                    await supabase.auth.signOut().catch(() => {});
                  }
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

      const isCallbackRoute =
        typeof window !== "undefined" &&
        window.location.pathname.startsWith("/auth/callback");

      if (isCallbackRoute) {
        // Do not prematurely mark authenticated or populate user while on callback route
        return;
      }

      if (currentSession) {
        const enriched = await syncUserProfile(
          currentSession.access_token,
          currentSession.user
        );
        if (isMounted) {
          if (enriched) {
            setSession(currentSession);
            setUser(enriched);
            localStorage.setItem("supabase_token", currentSession.access_token);
            if (currentSession.refresh_token) {
              localStorage.setItem("supabase_refresh_token", currentSession.refresh_token);
            }
          } else {
            // Unregistered user - tear down session
            setSession(null);
            setUser(null);
            localStorage.removeItem("supabase_token");
            localStorage.removeItem("supabase_refresh_token");
            localStorage.removeItem("syllo_user");
            await supabase.auth.signOut().catch(() => {});
          }
          setLoading(false);
        }
      } else {
        localStorage.removeItem("supabase_token");
        localStorage.removeItem("supabase_refresh_token");
        localStorage.removeItem("syllo_user");
        setSession(null);
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

      // Immediately synchronize React state to eliminate any redirect delays
      setUser(userData || null);
      setSession({ access_token: accessToken, user: userData });

      try {
        const { data } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || localStorage.getItem("supabase_refresh_token") || "",
        });

        if (data?.session) {
          setSession(data.session);
          setUser({ ...data.session.user, ...userData });
        }
      } catch (err) {
        console.warn("setSession notice during login:", err);
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
      isAuthenticated: Boolean(
        session &&
          user &&
          (user.id || user.email)
      ),
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
