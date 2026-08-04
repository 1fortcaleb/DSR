/**
 * Supabase rejections are plain objects, not Error instances, so the usual
 * `err instanceof Error ? err.message : String(err)` renders them as
 * "[object Object]" — which tells whoever hit it nothing at all.
 */
export function errText(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object") {
    const e = err as Record<string, unknown>;
    const parts = [e.message, e.details, e.hint].filter(Boolean).map(String);
    const code = e.code ? ` [${String(e.code)}]` : "";
    if (parts.length) return parts.join(" — ") + code;
    try {
      return JSON.stringify(err);
    } catch {
      return "Unknown error";
    }
  }
  return err ? String(err) : "Unknown error";
}

/**
 * Turns the failures worth recognising into something actionable.
 *
 * PGRST303 in particular is a clock-skew rejection, not a schema problem, and
 * telling someone to re-run their SQL over it sends them the wrong way.
 */
export function errHint(err: unknown): string {
  const text = errText(err);
  if (/PGRST303|JWT issued at future|jwt expired/i.test(text)) {
    return "Your sign-in token is out of step with the server's clock. Wait a minute and reload, or sign out and back in. If it keeps happening, check that your computer's date and time are set automatically.";
  }
  if (/JWT|not authenticated|invalid claim/i.test(text)) {
    return "Your session has expired. Sign out and sign back in.";
  }
  if (/row-level security|permission denied|42501/i.test(text)) {
    return "The database refused the write. This usually means supabase/schema.sql hasn't been run, or was run before the latest changes. Re-running it is safe.";
  }
  if (/does not exist|42703|42P01|PGRST20[0-9]/i.test(text)) {
    return "The database is missing something the app expects. Run supabase/schema.sql — it's safe to re-run.";
  }
  return "Most often this means supabase/schema.sql hasn't been run, or was run before the latest changes. Re-running it is safe.";
}
