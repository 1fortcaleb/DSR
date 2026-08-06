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

/**
 * Mirrors the enforce_signup_domain trigger in supabase/schema.sql.
 *
 * The trigger is the enforcement — this list is only here so a colleague who
 * types their personal address gets a sentence explaining why, instead of the
 * database's own failure. Anyone editing one must edit the other.
 */
const TEAM_DOMAINS = ["1fort.ai", "1fort.com"];

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
      const domain = email.trim().toLowerCase().split("@")[1] ?? "";
      if (!TEAM_DOMAINS.includes(domain)) {
        throw new Error(`Use your work address — ${TEAM_DOMAINS.join(" or ")} only.`);
      }
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        // A trigger that rejects an insert on auth.users can't get its own
        // message out: the auth service reports its own wording instead, which
        // reads as a broken app rather than a rule being applied.
        if (/database error saving new user/i.test(error.message)) {
          throw new Error(
            "The database refused the account. Your address looks right, so this is likely setup: run supabase/schema.sql and try again.",
          );
        }
        throw error;
      }
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
