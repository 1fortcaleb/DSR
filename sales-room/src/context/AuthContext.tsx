import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { isCloud, supabase } from "../lib/supabase";

interface AuthValue {
  /** Null in local mode, or when signed out. */
  session: Session | null;
  email: string | null;
  loading: boolean;
  /** False when the app is running against localStorage with no backend. */
  cloud: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isCloud);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => sub.subscription.unsubscribe();
  }, []);

  const value: AuthValue = {
    session,
    email: session?.user.email ?? null,
    loading,
    cloud: isCloud,
    async signIn(email, password) {
      if (!supabase) throw new Error("Supabase isn't configured.");
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    async signUp(email, password) {
      if (!supabase) throw new Error("Supabase isn't configured.");
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      // With email confirmation on, there's no session until they click the
      // link — say so rather than leaving them on a form that looks stuck.
      return data.session ? null : "Check your email to confirm the account, then sign in.";
    },
    async signOut() {
      await supabase?.auth.signOut();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside an AuthProvider");
  return ctx;
}
