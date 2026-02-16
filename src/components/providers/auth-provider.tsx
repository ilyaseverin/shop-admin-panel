"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { AuthUser, AuthTokens, getTokens, getUser, setTokens, setUser, clearAuth } from "@/lib/auth";
import { loginApi } from "@/lib/api";
import { useRouter } from "next/navigation";

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (loginStr: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const tokens = getTokens();
    const u = getUser();
    if (tokens?.accessToken && u) {
      setUserState(u);
    }
    setLoading(false);
  }, []);

  const login = async (loginStr: string, password: string) => {
    const data = await loginApi(loginStr, password);
    const tokens: AuthTokens = data.tokens;
    const u: AuthUser = data.user;
    setTokens(tokens);
    setUser(u);
    setUserState(u);
    router.push("/");
  };

  const logout = () => {
    clearAuth();
    setUserState(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
