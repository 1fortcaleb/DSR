import Anthropic from "@anthropic-ai/sdk";

/**
 * Writes the one-pager from the room's sources.
 *
 * Not an endpoint — it sits in lib/ so the host doesn't route to it. The
 * endpoint is generate-case-background, which owns the auth gate and the
 * reporting; this file owns the model.
 *
 * It runs on the server for one reason: the Anthropic key must never reach the
 * browser. Anyone can read a bundled key out of the JS, and a key on a public
 * site is a key someone else is spending.
 */

const MODEL = "claude-opus-5";

/**
 * Effort "medium" rather than the default.
 *
 * This is a rewrite of a page that already exists, against notes already in
 * front of the model. It does not reward long deliberation, and at the default
 * most of the wall clock went on thinking nobody reads. Since generation moved
 * to a background task nothing is racing a clock any more, so this is a
 * judgement about the work rather than a concession to a timeout — but the
 * judgement holds either way.
 *
 * Fast mode is not available: this organisation's quota is a hard zero, so
 * every request spent a guaranteed-refused round-trip. Do not put it back
 * without checking `anthropic-fast-input-tokens-limit` on a live response.
 */
const EFFORT = "medium" as const;

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

One sentence, and about 90 characters — 120 at the absolute outside. It is set very large, so a headline that runs past that stops being a headline and becomes the opening paragraph of a page nobody has agreed to read yet. If you find yourself writing a second sentence, the first one is the headline and the second belongs in the approach.

**framing** — five clauses, in order: despite / you still can't / which means / have to / and the cost is. Each 'value' is the bracketed part, and it should read as their situation described back to them, specific enough that a competitor's prospect would not recognise themselves in it. Keep the 'lead' text exactly as given; you are writing only the values.

Keep each value short: about 40 characters, and never more than 55. The lead is part of the same line and eats into that — "WE STILL CAN'T" is fifteen characters before you have written anything. The five clauses are set large and in monospace, and they are meant to be read as a ladder of five lines. A value that needs a comma and a second half is two ideas, and the second one belongs in the approach or the outcomes rather than here.

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

export interface Body {
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

/* ------------------------------------------------------------------- model */

/** Something the rep can be told, as opposed to a stack trace. */
export class CaseError extends Error {}

/**
 * The model call, and the mapping from every way it can go wrong to a sentence
 * a rep can act on.
 *
 * Anything thrown from here is safe to show. Anything else that escapes is a
 * bug and belongs in the log, not on screen.
 */
export async function writeCase(apiKey: string, body: Body): Promise<Record<string, unknown>> {
  const client = new Anthropic({ apiKey });
  const started = Date.now();

  let message;
  try {
    message = await client.messages
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
      })
      .finalMessage();
  } catch (err) {
    console.error("writeCase: the model call failed:", err);
    const status = (err as { status?: number }).status;
    if (status === 401 || status === 403) {
      throw new CaseError("Anthropic rejected the API key. Check it in Netlify.");
    }
    if (status === 429) {
      throw new CaseError("Anthropic rate limited the request. Try again shortly.");
    }
    if (status && status >= 500) {
      throw new CaseError("Anthropic is having trouble. Try again in a minute.");
    }
    throw new CaseError("The model call failed. The details are in the function log.");
  }

  console.log(
    `writeCase: ${Date.now() - started}ms, ${message.usage.output_tokens} output tokens ` +
      `(${message.usage.output_tokens_details?.thinking_tokens ?? 0} thinking)`,
  );

  // A safety classifier can decline, and that arrives as a well-formed response
  // with nothing in it — so reading content[0] first would throw on undefined.
  if (message.stop_reason === "refusal") {
    throw new CaseError(
      "The model declined to write this one. Check the notes for anything sensitive.",
    );
  }
  if (message.stop_reason === "max_tokens") {
    throw new CaseError("The reply was cut short. Try again with fewer notes switched on.");
  }

  const block = message.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") {
    throw new CaseError("The model returned nothing usable.");
  }
  try {
    return JSON.parse(block.text) as Record<string, unknown>;
  } catch {
    throw new CaseError("The model's answer wasn't readable. Try again.");
  }
}
