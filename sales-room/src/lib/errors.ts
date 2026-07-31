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
