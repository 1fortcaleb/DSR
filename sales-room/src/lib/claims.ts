import type { CaseContent, ClaimResponse } from "../types";

/**
 * A single assertion on the 1-pager that the counterparty can agree with,
 * push back on, or correct.
 *
 * Only assertions about *their* world are reviewable — the framing, the
 * measured numbers, the ROI model and the proposed plan. Section labels,
 * connectives and our own product description are not: asking someone to
 * ratify the words "Where it shows up today" is noise, and noise is what
 * stops people replying at all.
 */
export interface ClaimDef {
  id: string;
  /** Grouping shown in the rep's summary. */
  section: string;
  /** Short human name for the claim in summaries and prompts. */
  label: string;
  /** The current text being reacted to. */
  text: string;
  /** Writes an accepted suggestion back to the field this claim came from. */
  apply: (content: CaseContent, next: string) => CaseContent;
}

/** Patch one item of a content array by id, preserving the rest. */
function patchList<K extends keyof CaseContent>(
  content: CaseContent,
  key: K,
  id: string,
  patch: Record<string, string>,
): CaseContent {
  const list = content[key];
  if (!Array.isArray(list)) return content;
  return {
    ...content,
    [key]: list.map((item) => ((item as { id: string }).id === id ? { ...item, ...patch } : item)),
  };
}

export function claimsFor(content: CaseContent): ClaimDef[] {
  const claims: ClaimDef[] = [
    {
      id: "headline",
      section: "Headline",
      label: "The headline",
      text: content.headline,
      apply: (c, next) => ({ ...c, headline: next }),
    },
  ];

  for (const line of content.framing) {
    claims.push({
      id: `framing:${line.id}`,
      section: content.framingLabel,
      // The lead is fixed connective text, so it reads as the claim's name and
      // the bracketed value is the part under review.
      label: line.lead,
      text: line.value,
      apply: (c, next) => patchList(c, "framing", line.id, { value: next }),
    });
  }

  for (const stat of content.stats) {
    claims.push({
      id: `stat:${stat.id}`,
      section: content.statsLabel,
      label: stat.label,
      text: stat.unit ? `${stat.value} ${stat.unit}` : stat.value,
      apply: (c, next) => patchList(c, "stats", stat.id, { value: next, unit: "" }),
    });
  }

  claims.push({
    id: "yearOne",
    section: content.yearOneLabel,
    label: content.yearOneCaption,
    text: content.yearOneValue,
    apply: (c, next) => ({ ...c, yearOneValue: next }),
  });

  for (const row of content.yearOneRows) {
    claims.push({
      id: `year:${row.id}`,
      section: content.yearOneLabel,
      label: row.label,
      text: row.value,
      apply: (c, next) => patchList(c, "yearOneRows", row.id, { value: next }),
    });
  }

  for (const week of content.weeks) {
    claims.push({
      id: `week:${week.id}`,
      section: content.nextLabel,
      label: week.num,
      text: week.title,
      apply: (c, next) => patchList(c, "weeks", week.id, { title: next }),
    });
  }

  return claims;
}

export function findClaim(content: CaseContent, claimId: string): ClaimDef | undefined {
  return claimsFor(content).find((c) => c.id === claimId);
}

export interface ResponseTally {
  agreed: number;
  challenged: number;
  /** Challenges that carry a proposed rewrite the rep hasn't applied yet. */
  pendingSuggestions: number;
  total: number;
  answered: number;
}

export function tally(
  content: CaseContent,
  responses: Record<string, ClaimResponse>,
): ResponseTally {
  const claims = claimsFor(content);
  // Count against live claims only: a response can outlive the claim it
  // answered if the rep deletes a stat or a week.
  const live = claims.filter((c) => responses[c.id]);
  const agreed = live.filter((c) => responses[c.id].verdict === "agreed").length;
  const challenged = live.length - agreed;
  const pendingSuggestions = live.filter((c) => {
    const r = responses[c.id];
    return r.verdict === "challenged" && !!r.suggestion && r.suggestion !== c.text;
  }).length;
  return { agreed, challenged, pendingSuggestions, total: claims.length, answered: live.length };
}
