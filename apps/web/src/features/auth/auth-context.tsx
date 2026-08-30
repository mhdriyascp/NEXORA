"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiFetch } from "@/lib/api-client";

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  tenantId: string;
  roles: string[];
  permissions: string[];
}

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  ready: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
}

export interface LoginInput {
  tenantSlug: string;
  email: string;
  password: string;
}

export interface RegisterInput {
  tenantName: string;
  fullName: string;
  email: string;
  password: string;
}

const STORAGE_KEY = "nexora.auth";

const AuthContext = createContext<AuthContextValue | null>(null);

interface PersistedAuth {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

function readPersisted(): PersistedAuth | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PersistedAuth;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }): ReactNode {
  const [state, setState] = useState<PersistedAuth | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setState(readPersisted());
    setReady(true);
  }, []);

  const persist = useCallback((next: PersistedAuth | null) => {
    setState(next);
    if (typeof window === "undefined") return;
    if (next) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const login = useCallback(
    async (input: LoginInput) => {
      const res = await apiFetch<AuthResponse>("/auth/login", {
        method: "POST",
        body: input,
      });
      persist(res);
    },
    [persist],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const res = await apiFetch<AuthResponse>("/auth/register", {
        method: "POST",
        body: input,
      });
      persist(res);
    },
    [persist],
  );

  const logout = useCallback(async () => {
    const refreshToken = state?.refreshToken;
    if (refreshToken) {
      try {
        await apiFetch<void>("/auth/logout", {
          method: "POST",
          body: { refreshToken },
        });
      } catch {
        // Best-effort server revocation; always clear local state below.
      }
    }
    persist(null);
  }, [persist, state?.refreshToken]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: state?.user ?? null,
      token: state?.accessToken ?? null,
      ready,
      login,
      register,
      logout,
    }),
    [state, ready, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
