import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { http } from "../api/http"; // ✅ FIX: import correcto

export type Role = "admin" | "operator";

export type User = {
  _id: string;
  email: string;
  name?: string;
  role: Role;
};

type AuthMeResponse = {
  user: User;
  allowed_modules: string[];
};

type LoginResponse = {
  access_token: string;
  token_type: "bearer";
  user: User;
  allowed_modules?: string[];
};

type AuthState = {
  user: User | null;
  token: string | null;
  allowedModules: string[];
  isAuthenticated: boolean;
  loading: boolean;

  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));

  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem("user");
    try {
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  });

  const [allowedModules, setAllowedModules] = useState<string[]>(() => {
    const raw = localStorage.getItem("allowed_modules");
    try {
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  const [loading, setLoading] = useState(true);

  const persistAuth = (t: string, u: User, mods: string[]) => {
    localStorage.setItem("token", t);
    localStorage.setItem("user", JSON.stringify(u));
    localStorage.setItem("allowed_modules", JSON.stringify(mods));

    setToken(t);
    setUser(u);
    setAllowedModules(mods);
  };

  const clearAuth = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("allowed_modules");
    setToken(null);
    setUser(null);
    setAllowedModules([]);
  };

  const refreshMe = async () => {
    const t = localStorage.getItem("token");
    if (!t) {
      clearAuth();
      return;
    }

    // ✅ http agrega Authorization con interceptor
    const { data } = await http.get<AuthMeResponse>("/auth/me");

    const mods = data.allowed_modules ?? [];
    localStorage.setItem("user", JSON.stringify(data.user));
    localStorage.setItem("allowed_modules", JSON.stringify(mods));

    setUser(data.user);
    setAllowedModules(mods);

    // ✅ sincroniza token state con localStorage
    setToken(t);
  };

  const login = async (email: string, password: string) => {
    const form = new URLSearchParams();
    form.append("username", email.trim());
    form.append("password", password);

    const { data } = await http.post<LoginResponse>("/auth/login", form, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    const mods = data.allowed_modules ?? [];
    persistAuth(data.access_token, data.user, mods);
  };

  const logout = () => {
    clearAuth();
  };

  useEffect(() => {
    (async () => {
      try {
        if (localStorage.getItem("token")) {
          await refreshMe();
        }
      } catch {
        clearAuth();
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      allowedModules,
      loading,
      isAuthenticated: Boolean(token && user),
      login,
      logout,
      refreshMe,
    }),
    [user, token, allowedModules, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}