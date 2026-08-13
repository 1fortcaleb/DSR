import type { Context } from "@netlify/functions";
import { CaseError, writeCase, type Body } from "./lib/case.mts";

/**
 * Starts a generation and reports the result to the database.
 *
 * A background function, which is the whole point. Writing a page from a real
 * call transcript takes as long as it takes, and a synchronous request has to
 * finish inside the host's execution ceiling or be killed — which is what kept
 * happening, to requests that were working perfectly well and simply needed
 * another twenty seconds. Tuning buys margin; it does not remove a ceiling.
 *
 * So the browser gets 202 the moment this is invoked, and the answer arrives
 * out of band: this writes it to the generations row the browser created, and
 * the browser watches that row. Nothing is racing a clock any more.
 *
 * The consequence to keep in mind when editing: nobody is listening to what
 * this returns. A `return` that isn't preceded by a write to the row is a
 * spinner that never stops. Every path out of here goes through finish().
 */

interface StartBody extends Body {
  /** The row this run reports into, created by the browser before calling. */
  generationId?: string;
}

const env = (...names: string[]) => {
  for (const n of names) if (process.env[n]) return process.env[n];
  return undefined;
};

/** The signed-in caller's id, or null if the session isn't valid. */
async function callerId(token: string | null): Promise<string | null> {
  const url = env("SUPABASE_URL", "VITE_SUPABASE_URL");
  const anon = env("SUPABASE_ANON_KEY", "VITE_SUPABASE_ANON_KEY");
  if (!token || !url || !anon) return null;
  try {
    const res = await fetch(`${url}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: anon },
    });
    if (!res.ok) return null;
    const user = (await res.json()) as { id?: string };
    return user.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Records the outcome on the row the browser is watching.
 *
 * Written as the caller, not with the service key: row-level security then
 * applies exactly as it would to the rep doing this from the app, and this
 * endpoint gains no authority of its own. The team policy is what lets it
 * through, and if that policy is ever tightened this tightens with it.
 */
async function finish(
  token: string,
  id: string,
  patch: { status: "done" | "error"; content?: unknown; error?: string },
): Promise<void> {
  const url = env("SUPABASE_URL", "VITE_SUPABASE_URL");
  const anon = env("SUPABASE_ANON_KEY", "VITE_SUPABASE_ANON_KEY");
  if (!url || !anon) {
    console.error("generate-case-background: no Supabase credentials; the row will hang.");
    return;
  }
  try {
    const res = await fetch(
      `${url}/rest/v1/generations?id=eq.${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          apikey: anon,
          Authorization: `Bearer ${token}`,
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ ...patch, finished_at: new Date().toISOString() }),
      },
    );
    if (!res.ok) {
      // Nothing left to report it to, so the sweep in the schema is what
      // eventually releases the rep from the spinner.
      console.error(
        `generate-case-background: couldn't write the result (${res.status}):`,
        await res.text().catch(() => ""),
      );
    }
  } catch (err) {
    console.error("generate-case-background: couldn't write the result:", err);
  }
}

export default async function handler(req: Request, _context: Context) {
  if (req.method !== "POST") return new Response(null, { status: 405 });

  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;

  let body: StartBody;
  try {
    body = (await req.json()) as StartBody;
  } catch {
    console.error("generate-case-background: unreadable request body.");
    return new Response(null, { status: 202 });
  }

  const id = body.generationId;
  if (!id) {
    console.error("generate-case-background: no generationId; nothing to report into.");
    return new Response(null, { status: 202 });
  }

  // Everything below reports into the row, so the checks that would normally
  // be an HTTP status have to be written there instead — a 401 from a
  // background function is read by nobody.
  if (!token || !(await callerId(token))) {
    // Without a valid token there is no way to write to the row either, since
    // the write goes out as the caller. The sweep will release it.
    console.error("generate-case-background: no valid session; the row will be swept.");
    return new Response(null, { status: 202 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    await finish(token, id, {
      status: "error",
      error:
        "Generation isn't connected yet. Add ANTHROPIC_API_KEY in Netlify under Site configuration → Environment variables, then redeploy.",
    });
    return new Response(null, { status: 202 });
  }
  if (!body.sources?.some((s) => s.text?.trim())) {
    await finish(token, id, {
      status: "error",
      error: "No sources with any text in them. Paste the call notes first, then regenerate.",
    });
    return new Response(null, { status: 202 });
  }

  try {
    const content = await writeCase(apiKey, body);
    await finish(token, id, { status: "done", content });
  } catch (err) {
    if (err instanceof CaseError) {
      await finish(token, id, { status: "error", error: err.message });
    } else {
      console.error("generate-case-background: unexpected failure:", err);
      await finish(token, id, {
        status: "error",
        error: "Generation failed. The details are in the function log.",
      });
    }
  }

  return new Response(null, { status: 202 });
}
