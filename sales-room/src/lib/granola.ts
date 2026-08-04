/**
 * Pulls the usable parts out of pasted meeting notes.
 *
 * Two shapes show up in practice. Granola's own copy-out is a title line,
 * attendees, then bullets under headings. Recorder exports are bulkier: a
 * banner of equals signs, metadata lines, a written summary, action items, and
 * then hundreds of lines of timestamped dialogue. Both are handled here.
 *
 * This is deliberately a *suggester*: it proposes, the rep accepts. It errs
 * towards finding nothing rather than towards filling a customer-facing page
 * with scheduling trivia — a stat that reads "15 minutes · how often it syncs"
 * is worse on a one-pager than an empty slot.
 *
 * When Claude is wired up this becomes the fallback rather than the main path,
 * but the raw notes are stored as a source either way so a later regeneration
 * has them.
 */

export interface ParsedPerson {
  name: string;
  /** Job title, when the notes give one. */
  title?: string;
  /** Organisation, when the notes name one. Distinct from a job title. */
  org?: string;
}

export interface ParsedNumber {
  /** As written, e.g. "$1.4M", "11.5", "38%". */
  value: string;
  /** Trailing unit word where there was one, e.g. "days", "portals". */
  unit?: string;
  /** The line it came from, so the rep can see what it meant. */
  context: string;
}

export interface ParsedNotes {
  title: string | null;
  company: string | null;
  people: ParsedPerson[];
  /** Every bullet, in order. */
  bullets: string[];
  /** Bullets under a "next steps" style heading. */
  nextSteps: string[];
  numbers: ParsedNumber[];
  raw: string;
}

const OURS = /\b1fort\b/i;

/**
 * A row of the same character used as a visual divider. Recorder exports open
 * and close their header with one, and it was being read as the meeting title —
 * which then became the company, the room name, and the source label.
 */
export const RULE = /^\s*([=\-_~*#·—–+])\1{2,}\s*$/;
/** "--- SUMMARY ---": a heading wearing a divider. The inner text is the name. */
const BANNER = /^\s*[=\-_~*#]{2,}\s*(.+?)\s*[=\-_~*#]{2,}\s*$/;
/** Export metadata. Never content, and full of numbers that aren't figures. */
const META =
  /^\s*(date|time|duration|length|segments?|recorded(?: on)?|location|link|url|calendar|meeting ?id|host|organi[sz]er)\s*:/i;
/** "[00:03:10] Marcus Webb: ..." — a line of dialogue. */
const TIMESTAMPED = /^\s*[[(]?\s*\d{1,2}:\d{2}(?::\d{2})?\s*[\])]?\s*([^:]{1,48}?)\s*:\s*(.*)$/;

const HEADING_NEXT =
  /^\s*#*\s*(next steps?|action items?|actions|to-?dos?|follow[- ]?ups?)\s*:?\s*$/i;
const HEADING_SUMMARY = /^\s*#*\s*(summary|overview|recap|notes|key points?|highlights)\s*:?\s*$/i;
const HEADING_TRANSCRIPT = /^\s*#*\s*(full )?transcript\s*:?\s*$/i;
const HEADING_ANY = /^\s*(#{1,6}\s+\S|[A-Z][A-Za-z ]{2,30}:?\s*$)/;
const BULLET = /^\s*(?:[-*•·–—]|\d+[.)])\s+(.*)$/;
const ATTENDEE_LINE = /^\s*(?:attendees?|participants?|present|with|people)\s*:\s*(.+)$/i;

/** Leading emoji and decoration, which recorder exports like to prefix. */
function stripDecoration(s: string): string {
  return s.replace(/^[^\p{L}\p{N}$£€"'(]+/u, "").trim();
}

/* ---------------------------------------------------------------- people */

interface RawPerson {
  name: string;
  /** Whatever was in brackets or after the dash — org or job title, unknown yet. */
  qualifier?: string;
}

/** "Dana Whitfield (COO)" or "Priya Nair (Acme)" -> name + an unresolved qualifier. */
function person(raw: string): RawPerson | null {
  const s = raw.trim().replace(/^[-*•]\s*/, "");
  if (!s || s.length > 80) return null;
  const paren = s.match(/^(.+?)\s*[([]([^)\]]+)[)\]]\s*$/);
  if (paren) return { name: paren[1].trim(), qualifier: paren[2].trim() };
  const dash = s.match(/^(.+?)\s+[-–—]\s+(.+)$/);
  if (dash) return { name: dash[1].trim(), qualifier: dash[2].trim() };
  const comma = s.match(/^([^,]+),\s*(.+)$/);
  if (comma && /[a-z]/.test(comma[2])) return { name: comma[1].trim(), qualifier: comma[2].trim() };
  // A bare name: two or three capitalised words.
  if (/^[\p{Lu}][\p{L}'’-]+(?:\s+[\p{Lu}][\p{L}'’-]+){1,2}$/u.test(s)) return { name: s };
  return null;
}

/**
 * Decides which qualifiers are organisations rather than job titles.
 *
 * "Priya Nair (Acme)" and "Dana Whitfield (COO)" are the same shape, and
 * getting it wrong puts a company name in the contact's job title. A qualifier
 * is an org when more than one person shares it, when it's us, or when the
 * meeting title names it — a job title is rarely any of those.
 */
function resolvePeople(raws: RawPerson[], title: string | null): ParsedPerson[] {
  const counts = new Map<string, number>();
  for (const r of raws) {
    if (!r.qualifier) continue;
    const k = r.qualifier.toLowerCase();
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const lowerTitle = (title ?? "").toLowerCase();
  const isOrg = (q: string) => {
    const k = q.toLowerCase();
    return (counts.get(k) ?? 0) > 1 || OURS.test(q) || (k.length > 2 && lowerTitle.includes(k));
  };
  return raws.map((r) =>
    r.qualifier
      ? isOrg(r.qualifier)
        ? { name: r.name, org: r.qualifier }
        : { name: r.name, title: r.qualifier }
      : { name: r.name },
  );
}

/* --------------------------------------------------------------- company */

/** Strips our own name and meeting cruft out of a title to leave the company. */
function companyFromTitle(title: string): string | null {
  let s = title
    .replace(
      /\b(call|sync|meeting|intro|discovery|demo|catch[- ]?up|weekly|check[- ]?in|kickoff|product)\b/gi,
      "",
    )
    .replace(/\b\d{1,2}[/-]\d{1,2}([/-]\d{2,4})?\b/g, "")
    .trim();
  // "Acme <> 1Fort", "Acme x 1Fort", "1Fort / Acme"
  const parts = s.split(/\s*(?:<>|<->|\bx\b|[|/]|—|–)\s*/i).map((p) => p.trim()).filter(Boolean);
  const notUs = parts.filter((p) => !OURS.test(p));
  if (notUs.length) s = notUs[0];
  s = s.replace(/^[\s\-–—:]+|[\s\-–—:]+$/g, "").trim();
  return s && !OURS.test(s) && s.length > 1 ? s : null;
}

/**
 * Who the room is for.
 *
 * Attendee organisations are the strongest signal available: drop ours and see
 * what's left. A title like "Northwind — Product Demo (Acme Corp)" names the
 * counterparty in its trailing bracket, which settles it when both sides are
 * present. Only when neither is there does this fall back to slicing the title.
 */
function resolveCompany(title: string | null, people: ParsedPerson[]): string | null {
  const orgs = [...new Set(people.map((p) => p.org).filter((o): o is string => !!o))];
  const theirs = orgs.filter((o) => !OURS.test(o));

  const bracketed = title?.match(/[([]([^)\]]{2,60})[)\]]\s*$/)?.[1]?.trim();
  if (bracketed && !OURS.test(bracketed)) {
    // Trust the bracket only when an attendee is actually from that org,
    // otherwise "(recording)" and "(EU)" would become the company.
    const matches = theirs.some(
      (o) =>
        bracketed.toLowerCase().includes(o.toLowerCase()) ||
        o.toLowerCase().includes(bracketed.toLowerCase()),
    );
    if (matches || !orgs.length) return bracketed;
  }
  const fromTitle = title ? companyFromTitle(title) : null;
  if (theirs.length === 1) {
    // "Acme" in the attendee list, "Acme Corp" in the title: the same company,
    // and the fuller name is the one that belongs on the page.
    return fromTitle && fromTitle.toLowerCase().includes(theirs[0].toLowerCase())
      ? fromTitle
      : theirs[0];
  }
  return fromTitle;
}

/* --------------------------------------------------------------- numbers */

const NUMBER =
  /(?<!\w)(\$\s?\d[\d,]*(?:\.\d+)?\s?[kmb]?|\d[\d,]*(?:\.\d+)?\s?%|\d[\d,]*(?:\.\d+)?)(?!\w)/gi;
const UNIT_AFTER = /^\s*([a-z][a-z-]{1,18})\b/i;
const SKIP_UNITS = new Set([
  "and","the","of","to","in","on","at","a","an","or","for","with","from","by","is","are","was",
  "were","that","this","it","we","they","he","she","per","out","up","down","am","pm",
]);
/**
 * An acronym or an ordinal word immediately before a number makes it a label,
 * not a measurement: "SOC 2", "ISO 27001", "Type II", "Tier 3", "Q4".
 */
const LABEL_BEFORE = /(?:\b[A-Z]{2,6}|\b(?:type|tier|phase|version|v|step|part|no|number|q)\.?)\s*$/;

interface NumberSource {
  text: string;
  /** Dialogue is held to a higher bar: people say numbers about nothing. */
  dialogue: boolean;
}

function numbers(sources: NumberSource[]): ParsedNumber[] {
  const found: ParsedNumber[] = [];
  const seen = new Set<string>();
  for (const { text: line, dialogue } of sources) {
    for (const m of line.matchAll(NUMBER)) {
      const value = m[1].replace(/\s+/g, "");
      const plain = Number(value.replace(/[$,]/g, ""));
      const before = line.slice(0, m.index);
      const rest = line.slice(m.index + m[0].length);
      const unitMatch = rest.match(UNIT_AFTER);
      // A capitalised word after a number is a proper noun, not a unit —
      // "SOC 2 Type II" is not a measurement of two Types.
      const unit =
        unitMatch &&
        !SKIP_UNITS.has(unitMatch[1].toLowerCase()) &&
        unitMatch[1][0] === unitMatch[1][0].toLowerCase()
          ? unitMatch[1]
          : undefined;

      if (LABEL_BEFORE.test(before)) continue;

      const strong = /[$%]/.test(value) || /\.\d/.test(value) || plain >= 100;
      if (!/[$%]/.test(value)) {
        // Years read as claims otherwise, and every set of notes has a date.
        if (/^\d{4}$/.test(value) && plain >= 1900 && plain <= 2100) continue;
        // A small bare integer with no unit is list numbering, not a figure.
        if (plain < 100 && !/\.\d/.test(value) && !unit) continue;
      }
      // Nobody's one-pager wants "15 minutes · how often the connector syncs".
      // In dialogue only money, percentages and precise or large figures count.
      if (dialogue && !strong) continue;

      // Keyed on the figure alone: "11.5 days" and "11.5 day" are one number.
      const key = value.replace(/,/g, "").toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      // Stripped of its bullet marker: the context is shown to the rep and
      // used as a stat label, where a leading "- " is just noise.
      found.push({ value, unit, context: line.trim().replace(/^(?:[-*•·–—]|\d+[.)])\s+/, "") });
    }
  }
  return found;
}

/* ----------------------------------------------------------------- steps */

/**
 * "- [Northwind] Send SOC 2 report — Marcus" -> "Send SOC 2 report".
 * The owner tag and the assignee are internal bookkeeping; the counterparty is
 * reading this as a plan, not as our task list.
 */
function cleanStep(s: string): string {
  return s
    .replace(/^\[[^\]]{1,24}\]\s*/, "")
    .replace(/\s+[—–-]\s*\p{Lu}[\p{L}'’-]*(?:\s+\p{Lu}[\p{L}'’-]*)?\s*$/u, "")
    .trim();
}

/** Splits a wrapped prose paragraph into sentences worth offering as points. */
function sentences(prose: string): string[] {
  return prose
    .split(/(?<=[.!?])\s+(?=[\p{Lu}\d$£€"'“])/u)
    .map((s) => s.trim())
    .filter((s) => s.length > 25);
}

/* ---------------------------------------------------------------- parsing */

type Section = "head" | "summary" | "next" | "transcript" | "other";

function sectionFor(name: string): Section | null {
  if (HEADING_NEXT.test(name)) return "next";
  if (HEADING_SUMMARY.test(name)) return "summary";
  if (HEADING_TRANSCRIPT.test(name)) return "transcript";
  return null;
}

export function parseNotes(raw: string): ParsedNotes {
  const lines = raw.replace(/\r\n?/g, "\n").split("\n");

  const rawPeople: RawPerson[] = [];
  const bullets: string[] = [];
  const nextSteps: string[] = [];
  const numberSources: NumberSource[] = [];
  /** Wrapped prose accumulating under a summary heading. */
  let summaryProse: string[] = [];
  const summaryBlocks: string[] = [];

  let title: string | null = null;
  let section: Section = "head";
  let inAttendees = false;

  const flushProse = () => {
    if (summaryProse.length) summaryBlocks.push(summaryProse.join(" "));
    summaryProse = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      flushProse();
      continue;
    }
    // Dividers and export metadata carry nothing and poison everything they
    // are mistaken for.
    if (RULE.test(trimmed) || META.test(trimmed)) {
      flushProse();
      continue;
    }

    const banner = trimmed.match(BANNER);
    if (banner) {
      flushProse();
      section = sectionFor(banner[1]) ?? "other";
      inAttendees = false;
      continue;
    }

    const attendees = trimmed.match(ATTENDEE_LINE);
    if (attendees) {
      flushProse();
      // Either inline and comma-separated, or a list on the lines below.
      const inline = attendees[1].trim();
      if (inline) {
        for (const chunk of inline.split(/,(?![^(]*\))|;|\band\b/i)) {
          const p = person(chunk);
          if (p) rawPeople.push(p);
        }
      }
      inAttendees = !inline;
      continue;
    }

    // Dialogue: strip "[00:03:10] Marcus Webb:" so the remaining sentence can
    // be read on its own, and remember who was speaking.
    const spoken = trimmed.match(TIMESTAMPED);
    if (spoken) {
      flushProse();
      inAttendees = false;
      if (section !== "transcript") section = "transcript";
      const p = person(spoken[1]);
      if (p && !rawPeople.some((r) => r.name === p.name)) rawPeople.push(p);
      if (spoken[2].trim()) numberSources.push({ text: spoken[2].trim(), dialogue: true });
      continue;
    }

    const bullet = trimmed.match(BULLET);
    if (bullet) {
      flushProse();
      const text = bullet[1].trim();
      if (inAttendees) {
        const p = person(text);
        if (p) {
          rawPeople.push(p);
          continue;
        }
        inAttendees = false;
      }
      if (!text) continue;
      const step = cleanStep(text);
      if (section === "next") nextSteps.push(step);
      else bullets.push(step);
      numberSources.push({ text, dialogue: false });
      continue;
    }

    const named = sectionFor(trimmed);
    if (named) {
      flushProse();
      section = named;
      inAttendees = false;
      continue;
    }
    if (HEADING_ANY.test(trimmed) && title !== null) {
      flushProse();
      section = "other";
      inAttendees = false;
      continue;
    }

    // The first line of substance is the title.
    if (title === null) {
      title = stripDecoration(trimmed) || null;
      continue;
    }

    inAttendees = false;
    if (section === "summary" || section === "head") summaryProse.push(trimmed);
    if (section !== "transcript") numberSources.push({ text: trimmed, dialogue: false });
  }
  flushProse();

  // A written summary is the most useful prose in a recorder export: it is the
  // one part someone already condensed.
  for (const block of summaryBlocks) {
    for (const s of sentences(block)) {
      if (/^next steps?\b|^next step\b/i.test(s)) nextSteps.push(s.replace(/^next steps?:?\s*/i, ""));
      else bullets.push(s);
    }
  }

  const people = resolvePeople(rawPeople, title);
  return {
    title,
    company: resolveCompany(title, people),
    people,
    bullets,
    nextSteps,
    numbers: numbers(numberSources),
    raw,
  };
}

/** Nothing worth showing the rep. */
export function isEmptyParse(p: ParsedNotes): boolean {
  return !p.company && !p.people.length && !p.bullets.length && !p.nextSteps.length && !p.numbers.length;
}
