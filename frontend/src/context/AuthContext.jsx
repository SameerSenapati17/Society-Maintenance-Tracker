import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { authService } from "../services/authService.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }
    authService
      .getMe()
      .then((userData) => setUser(userData))
      .catch(() => localStorage.removeItem("token"))
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login: async (email, password) => {
        const data = await authService.login(email, password);
        localStorage.setItem("token", data.token);
        setUser(data.user);
        return data.user;
      },
      register: async (payload) => {
        const data = await authService.register(payload);
        localStorage.setItem("token", data.token);
        setUser(data.user);
        return data.user;
      },
      logout: () => {
        localStorage.removeItem("token");
        setUser(null);
      }
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
