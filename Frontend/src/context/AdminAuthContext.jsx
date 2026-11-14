import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  ADMIN_TOKEN_KEY,
  ADMIN_REFRESH_TOKEN_KEY,
  ADMIN_USER_KEY,
  getCurrentAdmin,
  logoutAdminApi,
} from "@/lib/adminAuth";

const AdminAuthContext = createContext({
  admin: null,
  token: null,
  loading: true,
  isAuthenticated: false,
  loginAdmin: () => {},
  logoutAdmin: async () => {},
});

/**
 * Dedicated Admin Auth Provider managing administrator state.
 * Strictly separated from the public user authentication context.
 */
export function AdminAuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(ADMIN_TOKEN_KEY) || null;
  });

  const [admin, setAdmin] = useState(() => {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(ADMIN_USER_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.email) return parsed;
      } catch {}
    }
    return null;
  });

  const [loading, setLoading] = useState(true);

  // Rehydrate and verify admin profile against backend
  useEffect(() => {
    let isMounted = true;

    async function initializeAdmin() {
      const storedToken = localStorage.getItem(ADMIN_TOKEN_KEY);
      if (!storedToken) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        const verifiedAdmin = await getCurrentAdmin(storedToken);
        if (isMounted) {
          if (verifiedAdmin && verifiedAdmin.email) {
            setAdmin(verifiedAdmin);
            setToken(storedToken);
            localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(verifiedAdmin));
          } else {
            // Token is invalid or expired
            setAdmin(null);
            setToken(null);
            localStorage.removeItem(ADMIN_TOKEN_KEY);
            localStorage.removeItem(ADMIN_REFRESH_TOKEN_KEY);
            localStorage.removeItem(ADMIN_USER_KEY);
          }
        }
      } catch {
        if (isMounted) {
          setAdmin(null);
          setToken(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    initializeAdmin();

    return () => {
      isMounted = false;
    };
  }, []);

  const loginAdmin = useCallback((accessToken, adminData, refreshToken) => {
    localStorage.setItem(ADMIN_TOKEN_KEY, accessToken);
    if (refreshToken) {
      localStorage.setItem(ADMIN_REFRESH_TOKEN_KEY, refreshToken);
    }
    if (adminData) {
      localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(adminData));
    }

    setToken(accessToken);
    setAdmin(adminData || null);
    setLoading(false);
  }, []);

  const logoutAdmin = useCallback(async () => {
    setLoading(true);
    try {
      await logoutAdminApi();
    } finally {
      setToken(null);
      setAdmin(null);
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      localStorage.removeItem(ADMIN_REFRESH_TOKEN_KEY);
      localStorage.removeItem(ADMIN_USER_KEY);
      setLoading(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      admin,
      token,
      loading,
      isAuthenticated: Boolean(token && admin && admin.email),
      loginAdmin,
      logoutAdmin,
    }),
    [admin, token, loading, loginAdmin, logoutAdmin]
  );

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  }
  return context;
}

export default AdminAuthContext;

