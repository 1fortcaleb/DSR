import type { CaseContent, CaseStakeholder } from "../types";

/**
 * Takes the model's version of the page but keeps the page's structure.
 *
 * Ids are the rep's edit handles and the anchors the counterparty's flags hang
 * off, so a regeneration must never reshuffle them. A model can also drop a
 * list item, invent an id, return a field blank, or omit one entirely — all
 * ordinary, none of which should be able to damage a page someone is about to
 * send. Anything unrecognised is discarded in favour of what was already there.
 */
export function mergeCase(current: CaseContent, next: Partial<CaseContent>): CaseContent {
  const byId = <T extends { id: string }>(mine: T[], theirs: unknown): T[] => {
    if (!Array.isArray(theirs)) return mine;
    const found = new Map(
      theirs
        .filter((t): t is Record<string, unknown> => !!t && typeof t === "object")
        .map((t) => [String(t.id), t]),
    );
    // Driven by the current list, so the page keeps its own length and order
    // however many items came back.
    return mine.map((item) => {
      const replacement = found.get(item.id);
      if (!replacement) return item;
      const kept: Record<string, unknown> = { ...item };
      // A blank string is the model declining to fill a slot, not an edit.
      for (const [key, value] of Object.entries(replacement)) {
        if (key === "id") continue;
        if (typeof value === "string" && !value.trim()) continue;
        if (value === null || value === undefined) continue;
        kept[key] = value;
      }
      return kept as T;
    });
  };

  const people = (mine: CaseStakeholder[], theirs: unknown): CaseStakeholder[] => {
    if (!Array.isArray(theirs) || !theirs.length) return mine;
    return theirs
      .filter((t): t is Record<string, unknown> => !!t && typeof t === "object")
      .filter((t) => typeof t.name === "string" && t.name.trim())
      .slice(0, 8)
      .map((t, i) => ({
        id: `p-${i}-${String(t.name).slice(0, 12).replace(/\W+/g, "")}`,
        name: String(t.name),
        role: typeof t.role === "string" ? t.role : "",
        why: typeof t.why === "string" ? t.why : "",
      }));
  };

  const str = (v: unknown, fallback: string) => (typeof v === "string" && v.trim() ? v : fallback);

  return {
    ...current,
    headline: str(next.headline, current.headline),
    framingLabel: str(next.framingLabel, current.framingLabel),
    framing: byId(current.framing, next.framing),
    statsLabel: str(next.statsLabel, current.statsLabel),
    statsSource: str(next.statsSource, current.statsSource),
    stats: byId(current.stats, next.stats),
    approachLabel: str(next.approachLabel, current.approachLabel),
    approachBody: str(next.approachBody, current.approachBody),
    approachBullets: byId(current.approachBullets, next.approachBullets),
    outcomesLabel: str(next.outcomesLabel, current.outcomesLabel),
    outcomes: byId(current.outcomes, next.outcomes),
    outcomesFootnote: str(next.outcomesFootnote, current.outcomesFootnote),
    // Stakeholders are proposed, not edited: the model reads them out of the
    // call rather than revising a slot, so there are no ids to match on. A
    // returned list replaces; an absent or empty one leaves the rep's own
    // notes alone, because "found nobody" must never wipe what they wrote.
    champions: people(current.champions, next.champions),
    opponents: people(current.opponents, next.opponents),
    investmentLabel: str(next.investmentLabel, current.investmentLabel),
    investmentValue: str(next.investmentValue, current.investmentValue),
    investmentCaption: str(next.investmentCaption, current.investmentCaption),
    investmentRows: byId(current.investmentRows, next.investmentRows),
    investmentFootnote: str(next.investmentFootnote, current.investmentFootnote),
    nextLabel: str(next.nextLabel, current.nextLabel),
    weeks: byId(current.weeks, next.weeks),
    footerNote: str(next.footerNote, current.footerNote),
    footerRef: str(next.footerRef, current.footerRef),
  };
}

/** Human-readable names for the parts of the page a regeneration can touch. */
const FIELD_LABELS: [keyof CaseContent, string][] = [
  ["headline", "the headline"],
  ["framingLabel", "the framing heading"],
  ["statsLabel", "the figures heading"],
  ["statsSource", "where the figures came from"],
  ["approachBody", "the recommended approach"],
  ["approachLabel", "the approach heading"],
  ["investmentValue", "the investment figure"],
  ["investmentCaption", "the investment caption"],
  ["investmentLabel", "the investment heading"],
  ["investmentFootnote", "the investment footnote"],
  ["outcomesLabel", "the outcomes heading"],
  ["outcomesFootnote", "the outcomes footnote"],
  ["nextLabel", "the next-steps heading"],
  ["footerNote", "the footer"],
  ["footerRef", "the reference"],
];

const LIST_LABELS: [keyof CaseContent, string, string][] = [
  ["framing", "framing line", "framing lines"],
  ["stats", "figure", "figures"],
  ["approachBullets", "proof point", "proof points"],
  ["investmentRows", "investment line", "investment lines"],
  ["outcomes", "target outcome", "target outcomes"],
  ["champions", "champion", "champions"],
  ["opponents", "blocker", "blockers"],
  ["weeks", "next step", "next steps"],
];

/**
 * What actually changed, in words a rep can read.
 *
 * A regeneration takes the better part of half a minute and can legitimately
 * decide to change nothing — the sources may not support a rewrite. Without
 * this, that outcome and an outright failure look exactly the same: the
 * spinner stops and the page sits there.
 */
export function describeCaseChanges(before: CaseContent, after: CaseContent): string[] {
  const changed: string[] = [];

  for (const [key, label] of FIELD_LABELS) {
    if (before[key] !== after[key]) changed.push(label);
  }

  for (const [key, one, many] of LIST_LABELS) {
    const mine = before[key] as { id: string }[];
    const theirs = after[key] as { id: string }[];
    const wasById = new Map(mine.map((t) => [t.id, JSON.stringify(t)]));
    // Counted over the *new* list, not the old one: the stakeholder lists grow
    // when the model finds someone, and counting only what was already there
    // would report two champions appearing out of nowhere as "no change".
    let count = theirs.filter((item) => wasById.get(item.id) !== JSON.stringify(item)).length;
    // Items that vanished are a change too.
    count += Math.max(0, mine.length - theirs.length);
    if (count) changed.push(`${count} ${count === 1 ? one : many}`);
  }

  return changed;
}

/** "the headline, 3 framing lines and 2 figures" */
export function joinChanges(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}
