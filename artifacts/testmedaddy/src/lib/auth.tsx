import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    try { const session = await restoreSession(); setUser(session?.user ?? null); return session?.user ?? null; }
    catch { setUser(null); return null; }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  const value = useMemo<AuthState>(() => ({
    user, loading, refresh, setUser,
    async login(email, password, rememberMe) { const r = await post("/api/tmd/auth/login", { email, password, rememberMe }); setCsrfToken(r.csrfToken); setUser(r.user); return r.user; },
    async signup(input) { const r = await post("/api/tmd/auth/signup", input); setCsrfToken(r.csrfToken); setUser(r.user); return r.user; },
    async logout() { try { await post("/api/tmd/auth/logout"); } finally { setCsrfToken(null); setUser(null); } },
  }), [user, loading, refresh]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside AuthProvider");
  return ctx;
}
