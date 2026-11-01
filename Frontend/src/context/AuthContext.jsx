import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext({
  user: null,
  token: null,
  logout: () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("supabase_token"));

  useEffect(() => {
    if (token) {
      const storedUser = localStorage.getItem("syllo_user");
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          setUser({ email: "student@example.com", full_name: "Student" });
        }
      } else {
        setUser({ email: "student@example.com", full_name: "Student" });
      }
    } else {
      setUser(null);
    }
  }, [token]);

  const logout = () => {
    localStorage.removeItem("supabase_token");
    localStorage.removeItem("syllo_user");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    return { user: null, token: null, logout: () => {} };
  }
  return context;
}

