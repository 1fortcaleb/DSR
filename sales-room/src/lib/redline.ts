import type { CaseContent, FlaggedPassage } from "../types";

/**
 * Applying a redline to the page, and rendering one in place.
 *
 * A mark is anchored by the words it covers rather than by a field id, because
 * the gesture that creates it is a browser text selection: the counterparty
 * highlights a phrase, and the DOM node it came from is an implementation
 * detail nobody should have to thread through the UI. Accepting therefore
 * means finding those words again in the content and swapping them.
 */

/** A run of text, marked or not, ready to render. */
export interface Segment {
  text: string;
  redline?: FlaggedPassage;
}

/**
 * Splits a field's text around any redlines that cover part of it.
 *
 * Only open and accepted marks are rendered — a rejected one keeps its thread
 * for the record but stops striking through the page, which is the whole point
 * of rejecting it. Overlapping marks are resolved by taking the earliest, then
 * the longest: two people striking the same clause is a genuine case, and
 * nesting the highlights would produce something illegible.
 */
export function segments(text: string, redlines: FlaggedPassage[]): Segment[] {
  const hits: { start: number; end: number; redline: FlaggedPassage }[] = [];
  for (const r of redlines) {
    if (r.status === "rejected" || !r.quote) continue;
    // Anchored marks belong to exactly one line. An unanchored one is a legacy
    // row, and falls back to matching anywhere rather than vanishing.
    if (r.context && r.context !== text) continue;
    const start = text.indexOf(r.quote);
    if (start === -1) continue;
    hits.push({ start, end: start + r.quote.length, redline: r });
  }
  if (!hits.length) return [{ text }];

  hits.sort((a, b) => a.start - b.start || b.end - a.end);

  const out: Segment[] = [];
  let cursor = 0;
  for (const hit of hits) {
    if (hit.start < cursor) continue; // overlaps one already taken
    if (hit.start > cursor) out.push({ text: text.slice(cursor, hit.start) });
    out.push({ text: text.slice(hit.start, hit.end), redline: hit.redline });
    cursor = hit.end;
  }
  if (cursor < text.length) out.push({ text: text.slice(cursor) });
  return out;
}

/**
 * Rewrites the content so the proposed wording becomes the real wording.
 *
 * Walks every string in the case content and replaces the first occurrence of
 * the quote. First occurrence, not all of them: a short quote like "12 weeks"
 * can legitimately appear in two places that mean different things, and
 * silently changing both would edit a line nobody marked.
 *
 * Returns the content unchanged when the quote can no longer be found, which
 * happens if the rep edited that line while the counterparty was reading it.
 */
export function applyRedline(
  content: CaseContent,
  quote: string,
  proposed: string,
  context = "",
): { content: CaseContent; applied: boolean } {
  let applied = false;

  const walk = (value: unknown): unknown => {
    if (applied) return value;
    if (typeof value === "string") {
      // With an anchor, only the line they marked is eligible — otherwise an
      // accept can rewrite a different line that happens to share the words.
      if (context && value !== context) return value;
      const at = value.indexOf(quote);
      if (at === -1) return value;
      applied = true;
      return value.slice(0, at) + proposed + value.slice(at + quote.length);
    }
    if (Array.isArray(value)) return value.map(walk);
    if (value && typeof value === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value)) out[k] = walk(v);
      return out;
    }
    return value;
  };

  let next = walk(content) as CaseContent;
  // The rep edited that line while they were reading it. Fall back to matching
  // on the quote alone rather than silently doing nothing.
  if (!applied && context) return applyRedline(content, quote, proposed);
  return { content: applied ? next : content, applied };
}

/**
 * Fills in the fields a redline gained after the first rooms were saved.
 *
 * Rows written before the page could be marked up are comments with no
 * proposal, and a resolved one is a mark the rep already dealt with — which is
 * what "accepted" now means.
 */
export function normaliseFlag(raw: Record<string, unknown>): FlaggedPassage {
  const legacyResolved = raw.resolved === true;
  const status = raw.status;
  return {
    id: String(raw.id ?? ""),
    quote: String(raw.quote ?? ""),
    context: String(raw.context ?? ""),
    proposed:
      typeof raw.proposed === "string" && raw.proposed ? raw.proposed : null,
    note: String(raw.note ?? ""),
    at: String(raw.at ?? new Date(0).toISOString()),
    by: String(raw.by ?? ""),
    side: raw.side === "us" ? "us" : "them",
    status:
      status === "accepted" || status === "rejected" || status === "open"
        ? status
        : legacyResolved
          ? "accepted"
          : "open",
    replies: Array.isArray(raw.replies)
      ? (raw.replies as Record<string, unknown>[]).map((r) => ({
          id: String(r.id ?? ""),
          side: r.side === "us" ? "us" : "them",
          by: String(r.by ?? ""),
          text: String(r.text ?? ""),
          at: String(r.at ?? new Date(0).toISOString()),
        }))
      : [],
    resolved: legacyResolved || undefined,
  };
}
