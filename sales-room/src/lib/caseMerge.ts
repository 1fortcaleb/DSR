import type { CaseContent } from "../types";

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

  const str = (v: unknown, fallback: string) => (typeof v === "string" && v.trim() ? v : fallback);

  return {
    ...current,
    headline: str(next.headline, current.headline),
    framingLabel: str(next.framingLabel, current.framingLabel),
    framing: byId(current.framing, next.framing),
    statsLabel: str(next.statsLabel, current.statsLabel),
    statsSource: str(next.statsSource, current.statsSource),
    stats: byId(current.stats, next.stats),
    changesLabel: str(next.changesLabel, current.changesLabel),
    changesBody: str(next.changesBody, current.changesBody),
    changesBullets: byId(current.changesBullets, next.changesBullets),
    yearOneLabel: str(next.yearOneLabel, current.yearOneLabel),
    yearOneValue: str(next.yearOneValue, current.yearOneValue),
    yearOneCaption: str(next.yearOneCaption, current.yearOneCaption),
    yearOneRows: byId(current.yearOneRows, next.yearOneRows),
    yearOneFootnote: str(next.yearOneFootnote, current.yearOneFootnote),
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
  ["changesBody", "what changes"],
  ["changesLabel", "the what-changes heading"],
  ["yearOneValue", "the year-one figure"],
  ["yearOneCaption", "the year-one caption"],
  ["yearOneLabel", "the year-one heading"],
  ["yearOneFootnote", "the year-one footnote"],
  ["nextLabel", "the next-steps heading"],
  ["footerNote", "the footer"],
  ["footerRef", "the reference"],
];

const LIST_LABELS: [keyof CaseContent, string, string][] = [
  ["framing", "framing line", "framing lines"],
  ["stats", "figure", "figures"],
  ["changesBullets", "proof point", "proof points"],
  ["yearOneRows", "year-one row", "year-one rows"],
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
    const byId = new Map(theirs.map((t) => [t.id, t]));
    const count = mine.filter(
      (item) => JSON.stringify(byId.get(item.id)) !== JSON.stringify(item),
    ).length;
    if (count) changed.push(`${count} ${count === 1 ? one : many}`);
  }

  return changed;
}

/** "the headline, 3 framing lines and 2 figures" */
export function joinChanges(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}
