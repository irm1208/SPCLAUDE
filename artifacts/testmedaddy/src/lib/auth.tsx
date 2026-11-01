import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { post, restoreSession, setCsrfToken } from "./api";

export type User = {
  id: string; handle: string; displayName: string; bio: string | null; avatarKey: string | null; email: string; role: string;
  emailVerified: boolean; telegramLinked: boolean; telegramUsername: string | null; notificationPrefs: Record<string, boolean>; payoutMethods: PaymentMethods; createdAt: string;
};
export type PaymentMethods = {
  crypto?: { currency: string; network: string; address: string }[];
  anonpay?: { wallet: string; ticker: string; network: string };
  revolut?: { handle: string };
  paypal?: { email: string };
};

type AuthState = {
  user: User | null; loading: boolean;
  refresh: () => Promise<User | null>;
  login: (email: string, password: string, rememberMe: boolean) => Promise<User>;
  signup: (input: { email: string; password: string; handle: string; displayName: string }) => Promise<User>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
};
const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const userRef = useRef<User | null>(null);
  const [loading, setLoading] = useState(true);
  const replaceUser = useCallback((next: User | null) => {
    if (userRef.current?.id !== next?.id) queryClient.clear();
    userRef.current = next;
    setUser(next);
  }, [queryClient]);
  const refresh = useCallback(async () => {
    try { const session = await restoreSession(); const next = session?.user ?? null; replaceUser(next); return next; }
    catch { replaceUser(null); return null; }
    finally { setLoading(false); }
  }, [replaceUser]);
  useEffect(() => { refresh(); }, [refresh]);
  const value = useMemo<AuthState>(() => ({
    user, loading, refresh, setUser: replaceUser,
    async login(email, password, rememberMe) { const r = await post("/api/tmd/auth/login", { email, password, rememberMe }); setCsrfToken(r.csrfToken); replaceUser(r.user); return r.user; },
    async signup(input) { const r = await post("/api/tmd/auth/signup", input); setCsrfToken(r.csrfToken); replaceUser(r.user); return r.user; },
    async logout() { await post("/api/tmd/auth/logout"); setCsrfToken(null); replaceUser(null); },
  }), [user, loading, refresh, replaceUser]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside AuthProvider");
  return ctx;
}
