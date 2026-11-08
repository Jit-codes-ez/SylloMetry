import React, { createContext, useContext, useState, useEffect } from "react";
import { getCurrentUser, logoutUser } from "@/lib/auth";

const AuthContext = createContext({
  user: null,
  token: null,
  isAuthenticated: false,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("supabase_token"));
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("syllo_user");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    return null;
  });

  useEffect(() => {
    let isMounted = true;

    async function syncUser() {
      if (!token) {
        if (isMounted) setUser(null);
        return;
      }

      // Check current user with backend API
      try {
        const currentUser = await getCurrentUser(token);
        if (currentUser && isMounted) {
          setUser(currentUser);
          localStorage.setItem("syllo_user", JSON.stringify(currentUser));
        } else if (!currentUser && isMounted) {
          // Token invalid or expired
          logout();
        }
      } catch {
        // Retain cached user on offline/network errors
      }
    }

    syncUser();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const login = (sessionToken, userData) => {
    localStorage.setItem("supabase_token", sessionToken);
    if (userData) {
      localStorage.setItem("syllo_user", JSON.stringify(userData));
    }
    setToken(sessionToken);
    setUser(userData || null);
  };

  const logout = async () => {
    await logoutUser();
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(token),
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      user: null,
      token: null,
      isAuthenticated: false,
      login: () => {},
      logout: () => {},
    };
  }
  return context;
}
