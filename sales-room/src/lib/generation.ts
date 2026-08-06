import { fetchPlaybook } from "./api";
import { mergeCase } from "./caseMerge";
import { supabase } from "./supabase";
import type { CaseContent, GeneratedSource, Room } from "../types";

export interface GenerateRequest {
  account: string;
  kind: Room["kind"];
  mode: Room["mode"];
  owner: string;
  current: CaseContent;
  sources: GeneratedSource[];
}

export interface GenerationProvider {
  readonly id: string;
  /** False while the model call is stubbed out; the UI surfaces this to the rep. */
  readonly live: boolean;
  generate(request: GenerateRequest): Promise<CaseContent>;
}

/** Thrown for problems the rep can fix (e.g. no sources selected). */
export class GenerationError extends Error {}

// Netlify reserves /.netlify/functions/*, so the SPA catch-all redirect in
// netlify.toml cannot shadow it. A prettier /api/* path can be.
const ROUTE = "/.netlify/functions/generate-case";

/**
 * Longer than a generation should ever take, short enough that a rep isn't
 * watching a spinner forever. A stalled request is indistinguishable from a
 * slow one from here, and the difference to a rep mid-deal is nil: they need
 * to be told to try again rather than left guessing.
 */
const TIMEOUT_MS = 90_000;

/**
 * Calls Claude through a backend route.
 *
 * The route, not this file, holds the API key — a key bundled into the browser
 * is readable by anyone who opens devtools, and a key on a public site is a key
 * someone else is spending. This side only assembles the request and carries
 * the rep's session token so the route can tell a colleague from a stranger.
 *
 * Everything the model sees comes from sources the rep has switched on. Toggle
 * one off and the next regeneration cannot draw on it.
 */
async function generateViaBackend(request: GenerateRequest): Promise<CaseContent> {
  const used = request.sources.filter((s) => s.used && s.text?.trim());
  if (!used.length) {
    throw new GenerationError(
      "Nothing to write from. Paste the call notes under Paste notes, then try again.",
    );
  }

  const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
  const token = data.session?.access_token;
  if (!token) throw new GenerationError("Sign in again — your session has expired.");

  // The team's own description of a good page. Read here rather than on the
  // server so the route stays a thin proxy with no database of its own — and
  // an empty or unreachable playbook must never block a generation.
  const playbook = await fetchPlaybook().catch(() => null);

  let res: Response;
  try {
    res = await fetch(ROUTE, {
      method: "POST",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({
        account: request.account,
        kind: request.kind,
        mode: request.mode,
        owner: request.owner,
        current: request.current,
        playbook,
        sources: used.map((s) => ({ label: s.label, text: s.text })),
      }),
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "TimeoutError") {
      throw new GenerationError(
        "The generation timed out. Try again — if it keeps happening, trim the notes you've switched on.",
      );
    }
    // Running `npm run dev` serves the app but not the function. `netlify dev`
    // serves both, which is the difference the message needs to name.
    throw new GenerationError(
      "Couldn't reach the generation service. On a local build, run `netlify dev` instead of `npm run dev`.",
    );
  }

  if (res.status === 404) {
    throw new GenerationError(
      "The generation route isn't deployed. On a local build, run `netlify dev` instead of `npm run dev`.",
    );
  }

  const payload = (await res.json().catch(() => null)) as
    | { content?: CaseContent; error?: string }
    | null;
  if (!res.ok) {
    // Netlify kills a function that outruns its time limit and answers with its
    // own error page, not our JSON. Left unnamed this reads as "Generation
    // failed (502)", which tells a rep nothing about what to do next.
    if (!payload && (res.status === 502 || res.status === 504)) {
      throw new GenerationError(
        "The generation ran too long and was cut off. Try again with fewer notes switched on.",
      );
    }
    throw new GenerationError(payload?.error ?? `Generation failed (${res.status}).`);
  }
  if (!payload?.content) throw new GenerationError("The service returned nothing usable.");

  return mergeCase(request.current, payload.content);
}

export const generationProvider: GenerationProvider = {
  id: "claude",
  live: true,
  generate: generateViaBackend,
};
