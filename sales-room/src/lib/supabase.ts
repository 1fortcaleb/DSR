import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * Cloud mode is on only when both variables are set. Without them the app
 * still runs entirely in the browser against localStorage, so a checkout with
 * no credentials is a working demo rather than a crash — and so nobody has to
 * stand up a database to change a font.
 */
export const isCloud = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isCloud
  ? createClient(url as string, anonKey as string, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null;

/** Narrows the nullable client at call sites that already require cloud mode. */
export function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      "Supabase isn't configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
    );
  }
  return supabase;
}
