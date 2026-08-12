import Anthropic from "@anthropic-ai/sdk";
import type { Context } from "@netlify/functions";

/**
 * Writes the one-pager from the room's sources.
 *
 * This lives on the server for one reason: the Anthropic key must never reach
 * the browser. Anyone can read a bundled key out of the JS, and a key on a
 * public site is a key someone else is spending. The rep's browser sends the
 * sources here; the key never leaves Netlify.
 *
 * It is also gated. An unauthenticated endpoint that calls a paid model on a
 * public domain gets found and drained, so every request has to carry a live
 * Supabase session belonging to the team.
 */

const MODEL = "claude-opus-5";

/**
 * Netlify kills a synchronous function when it runs past its execution ceiling,
 * and the rep sees "the generation ran too long and was cut off" — true, and
 * useless to them. Three things keep the call comfortably inside it:
 *
 *  - effort "medium". This is a rewrite of a page that already exists, against
 *    notes that are already in front of the model. It is not a problem that
 *    rewards long deliberation, and at the default effort most of the wall
 *    clock was going on thinking nobody reads.
 *  - fast mode. The same model, generating output tokens substantially faster,
 *    at premium pricing. A page costs cents. A page that never arrives costs
 *    the rep the meeting.
 *  - streaming. Bytes keep moving while the model works, so nothing between
 *    here and Anthropic decides the request has stalled.
 */
const EFFORT = "medium" as const;
const FAST_MODE_BETA = "fast-mode-2026-02-01";

/* ------------------------------------------------------------------ schema */

const text = { type: "string" } as const;

/** Shapes a list whose items keep the ids they were sent, so the rep's edit
 *  handles and the diff in the UI still line up after a regeneration. */
function list(properties: Record<string, unknown>) {
  return {
    type: "array",
    items: {
      type: "object",
      properties: { id: text, ...properties },
      required: ["id", ...Object.keys(properties)],
      additionalProperties: false,
    },
  };
}

const CASE_SCHEMA = {
  type: "object",
  properties: {
    headline: text,
    framingLabel: text,
    framing: list({ lead: text, value: text }),
    statsLabel: text,
    statsSource: text,
    stats: list({
      value: text,
      unit: text,
      label: text,
      accent: { type: "string", enum: ["navy", "red"] },
    }),
    approachLabel: text,
    approachBody: text,
    approachBullets: list({ text }),
    outcomesLabel: text,
    outcomes: list({ label: text, from: text, to: text }),
    outcomesFootnote: text,
    investmentLabel: text,
    investmentValue: text,
    investmentCaption: text,
    investmentRows: list({
      label: text,
      value: text,
      accent: { type: "string", enum: ["ink", "green"] },
    }),
    investmentFootnote: text,
    nextLabel: text,
    weeks: list({ num: text, title: text, sub: text }),
    footerNote: text,
    footerRef: text,
    champions: list({ name: text, role: text, why: text }),
    opponents: list({ name: text, role: text, why: text }),
  },
  required: [
    "headline", "framingLabel", "framing", "statsLabel", "statsSource", "stats",
    "approachLabel", "approachBody", "approachBullets",
    "outcomesLabel", "outcomes", "outcomesFootnote",
    "champions", "opponents",
    "investmentLabel", "investmentValue",
    "investmentCaption", "investmentRows", "investmentFootnote", "nextLabel", "weeks",
    "footerNote", "footerRef",
  ],
  additionalProperties: false,
} as const;

/* ------------------------------------------------------------------ prompt */

const SYSTEM = `You write one-page business cases for 1Fort, an insurance technology company. Your page goes to a named person at the counterparty organisation, and its only job is to make them able to answer one question: does this hold up, or not?

The page is not a brochure and not a summary of a call. It is an argument the reader can agree or disagree with. If they read it and think "yes, that's us, and that number is roughly right", it worked. If they think "that's not our situation" or "where did that figure come from", it failed — and the second failure is worse, because it costs the rep the meeting.

## The rule that outranks everything else

Every figure on the page must be traceable to the sources you were given.

You may quote a number the sources state. You may do arithmetic the sources fully support and say plainly that you did. You may not estimate, extrapolate from a benchmark, or reason from what is typical of the industry. A figure the reader does not recognise is the fastest way to lose them, and they will be reading with their own numbers in front of them.

When the sources do not support a slot, return the current value unchanged — including the placeholder dashes. An empty stat is a prompt for the rep to go and find the number. An invented one is a page they cannot send. Never fill a slot just because it is empty.

The same applies to claims, not only figures. "Producers rekey every submission" is a claim about their operation; write it only if the sources say so.

## What each part is for

**headline** — one sentence naming the change that is on offer, in their terms. It is the only line most readers finish. Not a description of 1Fort, not a question, not a slogan.

**framing** — five clauses, in order: despite / you still can't / which means / have to / and the cost is. Each 'value' is the bracketed part, and it should read as their situation described back to them, specific enough that a competitor's prospect would not recognise themselves in it. Keep the 'lead' text exactly as given; you are writing only the values.

**stats** — up to four figures from the sources, chosen because they carry the argument, not because they are the four you found. 'value' is the number as written ("11.5", "$1.4M", "1 in 3"), 'unit' is the trailing word if there is one ("days", "portals") and empty otherwise. 'label' says what the figure measures, in the fewest words that stay unambiguous. Use accent "red" for a figure that represents loss or delay, "navy" otherwise. Leave any stat you cannot source exactly as it came to you.

**approachBody and approachBullets** — the recommended approach: what you are proposing to *do* about the problem. A commitment, not a description of a product. "Put your two highest-volume producers on it for one line of business" is an approach; "1Fort streamlines submissions" is a brochure. Three bullets at most.

**outcomes** — what changes if it works, as a movement rather than a claim. Each has a 'label' naming what moves, a 'from' (where they are today) and a 'to' (where this should get them). "11.5 days" → "under 2" is something the reader can agree or disagree with; "faster quoting" is not. Use their own baseline in 'from' when the sources state it and "—" when they do not. Never invent a 'from' — an unknown baseline is a real finding, and it belongs in outcomesFootnote where it tells the rep what to go and measure.

**investment** — cost, people and time. Ambiguity here is what kills deals: a reader who cannot tell what this costs cannot take it to anyone else, and a page that ducks the question gets filed. Where the sources give real numbers, use them. Where they do not, say what is actually known ("priced per active producer, billed annually") rather than something evasive, and leave the figure as it stands. Never soften a real number into a vague range to make it look smaller.

**weeks** — the first few concrete steps. Real commitments from the sources where they exist, not a generic implementation plan.

**champions and opponents** — who wants this to happen, and who will resist it. These are the rep's own notes: they are stripped from the counterparty's copy server-side and never appear on the page the reader sees, so be blunt rather than diplomatic. Draw them from what people actually said and how they said it. Someone who volunteered a problem unprompted is usually a champion; someone who pushed back on scope, cost, or "we already have a tool for that" usually is not. 'why' should name what is at stake for them personally — the number they own, the work that lands on their team, the tool they chose that this displaces. Name only people the sources actually name. Return an empty list rather than guessing, and keep any existing entries the sources still support.

**footerNote / footerRef / statsSource** — statsSource must name where the figures came from, specifically enough to be checked ("From the 2025 production report", "From discovery, 14 Jul"). If the figures are unchanged from what you were given, leave it as it is.

## Form

Return every id exactly as you received it, and return the same number of items in each list. To leave something alone, return its current text unchanged.

Write in plain British-inflected business English. No exclamation marks, no "leverage", no "seamless", no em-dash-joined triplets. Short sentences. The reader is a senior operator who is short of time and has read a hundred of these.`;

interface Body {
  account?: string;
  kind?: string;
  mode?: string;
  owner?: string;
  current?: Record<string, unknown>;
  /** The team's own account of what a good page looks like. */
  playbook?: { principles?: string; exemplar?: string; avoid?: string } | null;
  sources?: { label?: string; text?: string }[];
}

/**
 * The playbook, rendered for the prompt.
 *
 * It goes before the sources and before the current page, because it is
 * standing instruction rather than material — the reader of the prompt should
 * know what they are aiming at before they see what they have to work with.
 * The exemplar is labelled as illustrative so its specifics don't get copied
 * into a different company's page.
 */
function renderPlaybook(pb: Body["playbook"]): string {
  if (!pb) return "";
  const parts: string[] = [];
  if (pb.principles?.trim()) {
    parts.push(`### What makes a 1Fort page good\n${pb.principles.trim()}`);
  }
  if (pb.exemplar?.trim()) {
    parts.push(
      "### A page that worked\nMatch its register, its length and the shape of its argument. Do not reuse its facts, figures or company — those belong to a different reader.\n\n" +
        pb.exemplar.trim(),
    );
  }
  if (pb.avoid?.trim()) {
    parts.push(`### Never do this\n${pb.avoid.trim()}`);
  }
  if (!parts.length) return "";
  return `## The team's playbook\n\nThis is written by the people who send these pages and watch how they land. Where it conflicts with your own instincts about business writing, follow it.\n\n${parts.join("\n\n")}`;
}

function buildPrompt(body: Body): string {
  const kindWord = body.kind === "partnership" ? "partnership" : "deal";
  const modeNote =
    body.mode === "archetype"
      ? `This is the PRE-CALL version. Nobody has had a discovery call yet, so there are no numbers of theirs to use. Describe the kind of operation 1Fort is built for and let the reader recognise themselves — or not. Figures here describe the archetype, not this reader, and statsSource must make that explicit. Do not write anything that implies you know their specific situation.`
      : `This is the SPECIFIC version, written after discovery. It should carry their numbers and their words. Anything general enough to send to a different company is a line that has not done its job.`;

  const playbook = renderPlaybook(body.playbook);

  return [
    ...(playbook ? [playbook, ""] : []),
    `Counterparty: ${body.account || "unnamed"}`,
    `Relationship: ${kindWord}`,
    `Prepared by: ${body.owner || "the 1Fort team"}`,
    "",
    modeNote,
    "",
    "## Sources",
    body.sources?.length
      ? body.sources
          .map((s, i) => `### Source ${i + 1}: ${s.label ?? "untitled"}\n${s.text ?? ""}`)
          .join("\n\n")
      : "(none supplied)",
    "",
    "## The page as it stands",
    "Return this shape back, rewritten where the sources support it and unchanged where they do not.",
    "```json",
    JSON.stringify(body.current ?? {}, null, 2),
    "```",
  ].join("\n");
}

/* -------------------------------------------------------------------- auth */

/** A live Supabase session for someone on the team, or nothing. */
async function callerIsSignedIn(token: string | null): Promise<boolean> {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
  if (!token || !url || !anon) return false;
  try {
    const res = await fetch(`${url}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: anon },
    });
    return res.ok;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------- model */

/** One attempt at the page. `fast` is the only thing that varies. */
function write(client: Anthropic, body: Body, fast: boolean) {
  return client.beta.messages
    .stream({
      model: MODEL,
      max_tokens: 16000,
      system: SYSTEM,
      thinking: { type: "adaptive" },
      output_config: {
        effort: EFFORT,
        format: { type: "json_schema", schema: CASE_SCHEMA },
      },
      messages: [{ role: "user", content: buildPrompt(body) }],
      ...(fast ? { speed: "fast" as const, betas: [FAST_MODE_BETA] } : {}),
    })
    .finalMessage();
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

/* ------------------------------------------------------------------ handler */

export default async function handler(req: Request, _context: Context) {
  if (req.method !== "POST") return json(405, { error: "POST only." });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return json(503, {
      error:
        "Generation isn't connected yet. Add ANTHROPIC_API_KEY in Netlify under Site configuration → Environment variables, then redeploy.",
    });
  }

  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
  if (!(await callerIsSignedIn(token))) {
    return json(401, { error: "Sign in again — your session has expired." });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return json(400, { error: "Couldn't read that request." });
  }
  if (!body.sources?.some((s) => s.text?.trim())) {
    return json(400, {
      error: "No sources with any text in them. Paste the call notes first, then regenerate.",
    });
  }

  try {
    const client = new Anthropic({ apiKey });
    const started = Date.now();

    let message;
    try {
      message = await write(client, body, true);
    } catch (err) {
      // Fast mode is a beta and a per-model capability, so an invalid
      // combination is rejected when the request is created. That must never
      // be the difference between a page and an error message: drop back to
      // standard speed and take the extra seconds.
      if ((err as { status?: number }).status === 400) {
        console.warn("fast mode was rejected, retrying at standard speed:", err);
        message = await write(client, body, false);
      } else {
        throw err;
      }
    }

    // The one number worth having in the log: how close this ran to Netlify's
    // ceiling. If it creeps back up, generation moves to a background function.
    console.log(
      `generate-case: ${Date.now() - started}ms, ` +
        `${message.usage.output_tokens} output tokens ` +
        `(${message.usage.output_tokens_details?.thinking_tokens ?? 0} thinking)`,
    );

    // Safety classifiers can decline a request; that arrives as a 200 with an
    // empty body, so reading content[0] first would throw on undefined.
    if (message.stop_reason === "refusal") {
      return json(502, {
        error: "The model declined to write this one. Check the notes for anything sensitive.",
      });
    }
    if (message.stop_reason === "max_tokens") {
      return json(502, { error: "The reply was cut short. Try again with fewer sources." });
    }

    const block = message.content.find((b) => b.type === "text");
    if (!block || block.type !== "text") {
      return json(502, { error: "The model returned nothing usable." });
    }
    return json(200, { content: JSON.parse(block.text) });
  } catch (err) {
    // The rep gets something they can act on; the detail goes to the Netlify
    // function log, where an upstream message like "405 Method Not Allowed" is
    // useful to whoever is debugging and useless on screen.
    console.error("generate-case failed:", err);
    const status = (err as { status?: number }).status;
    if (status === 401 || status === 403) {
      return json(502, { error: "Anthropic rejected the API key. Check it in Netlify." });
    }
    if (status === 429) return json(429, { error: "Rate limited by Anthropic. Try again shortly." });
    if (status && status >= 500) {
      return json(502, { error: "Anthropic is having trouble. Try again in a minute." });
    }
    return json(502, {
      error: "Generation failed. The details are in the Netlify function log.",
    });
  }
}

