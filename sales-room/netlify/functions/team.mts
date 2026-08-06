import type { Context } from "@netlify/functions";

/**
 * Adds colleagues to the app, and resets their passwords.
 *
 * Creating a user is an admin operation: it needs the Supabase service-role
 * key, which bypasses row-level security entirely. That key can therefore
 * never go near the browser — anyone with it can read every room in the
 * database regardless of what any policy says. It lives in Netlify's
 * environment and is used only here.
 *
 * Which makes this route the most dangerous one in the app, so it is gated
 * twice: the caller must hold a live Supabase session, and the address on that
 * session must be a team address. The first check alone would be enough only
 * for as long as the sign-up trigger holds; if that were ever dropped, an
 * outsider with an account could otherwise mint more.
 *
 * Accounts are created already confirmed, with a password generated here and
 * shown to the rep once. That deliberately sidesteps email: Supabase's built-in
 * sender allows a couple of messages an hour, so an invite-by-email flow would
 * quietly fail halfway through onboarding a team and look like a bug.
 */

/** Must match enforce_signup_domain in supabase/schema.sql. */
const TEAM_DOMAINS = ["1fort.ai", "1fort.com"];

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const env = (...names: string[]) => {
  for (const n of names) if (process.env[n]) return process.env[n];
  return undefined;
};

const isTeamAddress = (email: string) =>
  TEAM_DOMAINS.includes(email.trim().toLowerCase().split("@")[1] ?? "");

/* -------------------------------------------------------------------- auth */

/** The signed-in caller's email address, or null if the session isn't valid. */
async function callerEmail(token: string | null): Promise<string | null> {
  const url = env("SUPABASE_URL", "VITE_SUPABASE_URL");
  const anon = env("SUPABASE_ANON_KEY", "VITE_SUPABASE_ANON_KEY");
  if (!token || !url || !anon) return null;
  try {
    const res = await fetch(`${url}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: anon },
    });
    if (!res.ok) return null;
    const user = (await res.json()) as { email?: string };
    return user.email ?? null;
  } catch {
    return null;
  }
}

/* ---------------------------------------------------------------- password */

/**
 * A password the rep will paste into Slack once and nobody will ever type.
 *
 * Ambiguous glyphs are left out so it survives being read aloud or copied by
 * hand, and the groups make it look like a temporary credential rather than
 * something to keep.
 */
function tempPassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghijkmnpqrstuvwxyz";
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  const chars = [...bytes].map((b) => alphabet[b % alphabet.length]);
  return [chars.slice(0, 6), chars.slice(6, 12), chars.slice(12, 18)]
    .map((g) => g.join(""))
    .join("-");
}

/* ------------------------------------------------------------- admin calls */

interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
}

/** The Supabase admin API, which answers only to the service-role key. */
async function admin(
  path: string,
  init: RequestInit & { method: string },
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const url = env("SUPABASE_URL", "VITE_SUPABASE_URL")!;
  const key = env("SUPABASE_SERVICE_ROLE_KEY")!;
  const res = await fetch(`${url}/auth/v1/admin${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
  });
  const body = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, body };
}

/** Only the fields the team list shows. The rest of a user record is nobody's
 *  business, and the less of it that crosses the wire the better. */
const slim = (u: Record<string, unknown>): AdminUser => ({
  id: String(u.id),
  email: String(u.email ?? ""),
  created_at: String(u.created_at ?? ""),
  last_sign_in_at: (u.last_sign_in_at as string | null) ?? null,
});

/* ------------------------------------------------------------------ handler */

interface Body {
  action?: "list" | "create" | "reset";
  email?: string;
  userId?: string;
}

export default async function handler(req: Request, _context: Context) {
  if (req.method !== "POST") return json(405, { error: "POST only." });

  if (!env("SUPABASE_SERVICE_ROLE_KEY")) {
    return json(503, {
      error:
        "Adding teammates isn't connected yet. Add SUPABASE_SERVICE_ROLE_KEY in Netlify under Site configuration → Environment variables, then redeploy.",
    });
  }
  if (!env("SUPABASE_URL", "VITE_SUPABASE_URL")) {
    return json(503, {
      error: "SUPABASE_URL is missing from the Netlify environment.",
    });
  }

  const token =
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
  const caller = await callerEmail(token);
  if (!caller)
    return json(401, { error: "Sign in again — your session has expired." });
  if (!isTeamAddress(caller)) return json(403, { error: "Not allowed." });

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return json(400, { error: "Couldn't read that request." });
  }

  try {
    if (body.action === "list") {
      const r = await admin("/users?page=1&per_page=200", { method: "GET" });
      if (!r.ok) throw new Error(`admin list failed (${r.status})`);
      const users = (
        (r.body as { users?: Record<string, unknown>[] }).users ?? []
      ).map(slim);
      users.sort((a, b) => a.email.localeCompare(b.email));
      return json(200, { users });
    }

    if (body.action === "create") {
      const email = (body.email ?? "").trim().toLowerCase();
      if (!email.includes("@"))
        return json(400, { error: "That doesn't look like an email address." });
      if (!isTeamAddress(email)) {
        return json(400, {
          error: `Work addresses only — ${TEAM_DOMAINS.join(" or ")}.`,
        });
      }
      const password = tempPassword();
      const r = await admin("/users", {
        method: "POST",
        // Confirmed on creation: the rep is vouching for a colleague in person,
        // and the alternative is an email that may never arrive.
        body: JSON.stringify({ email, password, email_confirm: true }),
      });
      if (!r.ok) {
        const msg = String(
          (r.body as { msg?: string; message?: string })?.msg ?? "",
        );
        if (/already been registered|already exists/i.test(msg)) {
          return json(409, {
            error:
              "That address already has an account. Reset its password instead.",
          });
        }
        throw new Error(`admin create failed (${r.status}): ${msg}`);
      }
      return json(200, {
        user: slim(r.body as Record<string, unknown>),
        password,
      });
    }

    if (body.action === "reset") {
      if (!body.userId)
        return json(400, { error: "Missing the account to reset." });
      const password = tempPassword();
      const r = await admin(`/users/${encodeURIComponent(body.userId)}`, {
        method: "PUT",
        body: JSON.stringify({ password }),
      });
      if (!r.ok) throw new Error(`admin reset failed (${r.status})`);
      return json(200, { password });
    }

    return json(400, { error: "Unknown action." });
  } catch (err) {
    // Never the upstream text: an admin-API error can echo the request, and a
    // request here can contain a password.
    console.error("team route failed:", err);
    return json(502, {
      error: "That didn't work. The details are in the Netlify function log.",
    });
  }
}
