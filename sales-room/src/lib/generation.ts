import { fetchPlaybook } from "./api";
import { mergeCase } from "./caseMerge";
import { requireSupabase, supabase } from "./supabase";
import type { CaseContent, GeneratedSource, Room } from "../types";

export interface GenerateRequest {
  roomId: string;
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
const ROUTE = "/.netlify/functions/generate-case-background";

/** How often to look at the row. Fast enough to feel prompt, slow enough that
 *  a two-minute generation is sixty queries rather than six hundred. */
const POLL_MS = 2_000;

/**
 * When to give up watching.
 *
 * Not a limit on the work — the worker has its own, and the database sweeps a
 * row whose worker died. This is only the point past which a rep staring at a
 * spinner is better served by being told to try again. Generously past any
 * real generation, because the failure this replaces was cutting off runs that
 * were about to succeed.
 */
const GIVE_UP_MS = 5 * 60_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface GenerationRow {
  status: "pending" | "done" | "error";
  content: Partial<CaseContent> | null;
  error: string | null;
}

/**
 * Writes the page with Claude, out of band.
 *
 * The model call runs on the server, because a key bundled into the browser is
 * readable by anyone who opens devtools and a key on a public site is a key
 * someone else is spending. It runs as a *background* task because a page
 * written from a real call transcript takes as long as it takes, and a
 * synchronous request has to finish inside the host's execution ceiling or be
 * killed mid-answer. Reps lost several perfectly good generations that way.
 *
 * So this creates a row, asks the worker to fill it in, and watches it. The
 * only clock left is the rep's patience.
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

  const db = requireSupabase();
  const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
  const token = data.session?.access_token;
  if (!token) throw new GenerationError("Sign in again — your session has expired.");

  // The team's own description of a good page. Read here rather than on the
  // server so the worker stays a thin proxy with no database reads of its own —
  // and an empty or unreachable playbook must never block a generation.
  const playbook = await fetchPlaybook().catch(() => null);

  // The row exists before the work starts, so there is somewhere to report a
  // failure to even if the worker dies on its first line.
  const { data: row, error: insertError } = await db
    .from("generations")
    .insert({ room_id: request.roomId })
    .select("id")
    .single();
  if (insertError || !row) {
    throw new GenerationError(
      insertError?.message?.includes("generations")
        ? "The database is missing the generations table. Re-run the schema workflow."
        : "Couldn't start the generation. Check your connection and try again.",
    );
  }
  const id = row.id as string;

  let started: Response;
  try {
    started = await fetch(ROUTE, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({
        generationId: id,
        account: request.account,
        kind: request.kind,
        mode: request.mode,
        owner: request.owner,
        current: request.current,
        playbook,
        sources: used.map((s) => ({ label: s.label, text: s.text })),
      }),
    });
  } catch {
    // Running `npm run dev` serves the app but not the function. `netlify dev`
    // serves both, which is the difference the message needs to name.
    throw new GenerationError(
      "Couldn't reach the generation service. On a local build, run `netlify dev` instead of `npm run dev`.",
    );
  }

  if (started.status === 404) {
    throw new GenerationError(
      "The generation route isn't deployed. On a local build, run `netlify dev` instead of `npm run dev`.",
    );
  }
  // A background function answers 202 and says nothing else. Anything but a
  // 2xx means it never got as far as the work.
  if (!started.ok) {
    throw new GenerationError(`Couldn't start the generation (${started.status}).`);
  }

  const deadline = Date.now() + GIVE_UP_MS;
  for (;;) {
    await sleep(POLL_MS);

    const { data: state, error } = await db
      .from("generations")
      .select("status, content, error")
      .eq("id", id)
      .single<GenerationRow>();

    // A single failed read is a dropped packet, not a failed generation: the
    // work is still running on the server regardless of what this tab can see.
    if (!error && state) {
      if (state.status === "done" && state.content) {
        return mergeCase(request.current, state.content);
      }
      if (state.status === "error") {
        throw new GenerationError(state.error ?? "Generation failed.");
      }
    }

    if (Date.now() > deadline) {
      throw new GenerationError(
        "The generation is taking much longer than it should. It may still finish — try again in a minute, and trim the notes you've switched on if it keeps happening.",
      );
    }
  }
}

export const generationProvider: GenerationProvider = {
  id: "claude",
  live: true,
  generate: generateViaBackend,
};
