import { createClient } from "@supabase/supabase-js";
import type { Context } from "@netlify/functions";

/**
 * Signs a recipient's files for them, for the next hour.
 *
 * The assets bucket is private, so nothing anonymous can read an object
 * directly. This is the only way a counterparty's browser gets at a document
 * or a video, and it hands out URLs rather than bytes so a 200MB video is
 * still streamed by the CDN rather than through here.
 *
 * Two separate keys, doing two different jobs:
 *
 *  - The anonymous key asks the database which paths this token is allowed to
 *    reach. That question is answered by share_asset_paths, which applies the
 *    same filter as the room payload — a document held back stays held back
 *    even for someone holding a valid link to that room.
 *  - The service key then signs exactly those paths, and nothing else. It is
 *    never used to decide anything, only to sign what the first step already
 *    authorised.
 *
 * Keeping those apart is the point. The service key bypasses every access rule
 * in the database, so it must never be the thing that determines access.
 */

const TTL_SECONDS = 60 * 60;

const env = (...names: string[]) => {
  for (const n of names) if (process.env[n]) return process.env[n];
  return undefined;
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

export default async function handler(req: Request, _context: Context) {
  if (req.method !== "POST") return json(405, { error: "POST only." });

  const url = env("SUPABASE_URL", "VITE_SUPABASE_URL");
  const anon = env("SUPABASE_ANON_KEY", "VITE_SUPABASE_ANON_KEY");
  const service = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !service) {
    console.error("shared-files: Supabase credentials are not configured.");
    return json(503, { error: "File access isn't configured." });
  }

  let token: string | undefined;
  try {
    ({ token } = (await req.json()) as { token?: string });
  } catch {
    return json(400, { error: "Couldn't read that request." });
  }
  if (!token) return json(400, { error: "No link token." });

  // Step one: what is this token allowed to reach? Asked anonymously, so the
  // answer comes from the database's own rules rather than from this file.
  const asAnon = createClient(url, anon, { auth: { persistSession: false } });
  const { data, error } = await asAnon.rpc("share_asset_paths", { p_token: token });
  if (error) {
    console.error("shared-files: couldn't resolve the token:", error.message);
    return json(502, { error: "Couldn't check that link." });
  }

  const allowed = (data ?? []) as { id: string; path: string }[];
  // A revoked or expired link resolves to nothing, which is not an error —
  // there is simply nothing to sign. The room payload has already told the
  // recipient the link is gone.
  if (!allowed.length) return json(200, { files: {} });

  // Step two: sign precisely those, and only those.
  const asService = createClient(url, service, { auth: { persistSession: false } });
  const signed = await asService.storage
    .from("assets")
    .createSignedUrls(allowed.map((a) => a.path), TTL_SECONDS);
  if (signed.error) {
    console.error("shared-files: couldn't sign:", signed.error.message);
    return json(502, { error: "Couldn't open those files." });
  }

  const byPath = new Map(
    (signed.data ?? [])
      .filter((s) => s.signedUrl && !s.error)
      .map((s) => [s.path ?? "", s.signedUrl]),
  );

  const files: Record<string, string> = {};
  for (const a of allowed) {
    const href = byPath.get(a.path);
    if (href) files[a.id] = new URL(href, url).toString();
  }

  return json(200, { files });
}
