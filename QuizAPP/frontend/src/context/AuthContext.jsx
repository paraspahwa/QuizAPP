import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]   = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((u) => { setUser(u); setLoading(false); })
        .catch(() => { logout(); setLoading(false); });
    } else {
      setLoading(false);
    }
  }, [token]);

  function login(tokenStr, userData) {
    localStorage.setItem("token", tokenStr);
    setToken(tokenStr);
    setUser(userData);
  }

  function logout() {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  }

  function authHeader() {
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, authHeader }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
