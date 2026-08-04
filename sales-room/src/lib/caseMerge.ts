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
