/**
 * Pulls the usable parts out of pasted meeting notes.
 *
 * Granola exports a predictable shape — a title line, attendees, then bullets
 * under headings — so a fair amount can be lifted without a model. This is
 * deliberately a *suggester*: it proposes, the rep accepts. Everything it finds
 * is offered next to what's already on the page rather than written over it.
 *
 * When Claude is wired up this becomes the fallback rather than the main path,
 * but the raw notes are stored as a source either way so a later regeneration
 * has them.
 */

export interface ParsedPerson {
  name: string;
  title?: string;
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
const HEADING_NEXT = /^\s*#*\s*(next steps?|action items?|actions|to-?dos?|follow[- ]?ups?)\s*:?\s*$/i;
const HEADING_ANY = /^\s*(#{1,6}\s+\S|[A-Z][A-Za-z ]{2,30}:?\s*$)/;
const BULLET = /^\s*(?:[-*•·–—]|\d+[.)])\s+(.*)$/;
const ATTENDEE_LINE = /^\s*(?:attendees?|participants?|present|with|people)\s*:\s*(.+)$/i;

/** "Dana Whitfield (COO)" or "Dana Whitfield - COO" -> name + title. */
function person(raw: string): ParsedPerson | null {
  const s = raw.trim().replace(/^[-*•]\s*/, "");
  if (!s || s.length > 80) return null;
  const paren = s.match(/^(.+?)\s*[([]([^)\]]+)[)\]]\s*$/);
  if (paren) return { name: paren[1].trim(), title: paren[2].trim() };
  const dash = s.match(/^(.+?)\s+[-–—]\s+(.+)$/);
  if (dash) return { name: dash[1].trim(), title: dash[2].trim() };
  const comma = s.match(/^([^,]+),\s*(.+)$/);
  if (comma && /[a-z]/.test(comma[2])) return { name: comma[1].trim(), title: comma[2].trim() };
  // A bare name: two or three capitalised words.
  if (/^[\p{Lu}][\p{L}'’-]+(?:\s+[\p{Lu}][\p{L}'’-]+){1,2}$/u.test(s)) return { name: s };
  return null;
}

/** Strips our own name and meeting cruft out of a title to leave the company. */
function companyFromTitle(title: string): string | null {
  let s = title
    .replace(/\b(call|sync|meeting|intro|discovery|demo|catch[- ]?up|weekly|check[- ]?in|kickoff)\b/gi, "")
    .replace(/\b\d{1,2}[/-]\d{1,2}([/-]\d{2,4})?\b/g, "")
    .trim();
  // "Acme <> 1Fort", "Acme x 1Fort", "1Fort / Acme"
  const parts = s.split(/\s*(?:<>|<->|\bx\b|[|/]|—|–)\s*/i).map((p) => p.trim()).filter(Boolean);
  const notUs = parts.filter((p) => !OURS.test(p));
  if (notUs.length) s = notUs[0];
  s = s.replace(/^[\s\-–—:]+|[\s\-–—:]+$/g, "").trim();
  return s && !OURS.test(s) && s.length > 1 ? s : null;
}

const NUMBER = /(?<!\w)(\$\s?\d[\d,]*(?:\.\d+)?\s?[kmb]?|\d[\d,]*(?:\.\d+)?\s?%|\d[\d,]*(?:\.\d+)?)(?!\w)/gi;
const UNIT_AFTER = /^\s*([a-z][a-z-]{1,18})\b/i;
const SKIP_UNITS = new Set([
  "and","the","of","to","in","on","at","a","an","or","for","with","from","by","is","are","was",
  "were","that","this","it","we","they","he","she","per","out","up","down","am","pm",
]);

function numbers(lines: string[]): ParsedNumber[] {
  const found: ParsedNumber[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    for (const m of line.matchAll(NUMBER)) {
      const value = m[1].replace(/\s+/g, "");
      const plain = Number(value.replace(/[$,]/g, ""));
      const rest = line.slice(m.index! + m[0].length);
      const unitMatch = rest.match(UNIT_AFTER);
      // A capitalised word after a number is a proper noun, not a unit —
      // "SOC 2 Type II" is not a measurement of two Types.
      const unit =
        unitMatch &&
        !SKIP_UNITS.has(unitMatch[1].toLowerCase()) &&
        unitMatch[1][0] === unitMatch[1][0].toLowerCase()
          ? unitMatch[1]
          : undefined;

      if (!/[$%]/.test(value)) {
        // Years read as claims otherwise, and every set of notes has a date.
        if (/^\d{4}$/.test(value) && plain >= 1900 && plain <= 2100) continue;
        // A small bare integer with no unit is list numbering, not a figure.
        if (plain < 100 && !/\.\d/.test(value) && !unit) continue;
      }

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

export function parseNotes(raw: string): ParsedNotes {
  const lines = raw.replace(/\r\n?/g, "\n").split("\n");
  const nonEmpty = lines.filter((l) => l.trim());

  const title = nonEmpty[0]?.trim() ?? null;
  const company = title ? companyFromTitle(title) : null;

  const people: ParsedPerson[] = [];
  const bullets: string[] = [];
  const nextSteps: string[] = [];
  let inNext = false;
  let inAttendees = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    const attendees = trimmed.match(ATTENDEE_LINE);
    if (attendees) {
      // Either inline and comma-separated, or a list on the lines below.
      const inline = attendees[1].trim();
      if (inline) {
        for (const chunk of inline.split(/,(?![^(]*\))|;|\band\b/i)) {
          const p = person(chunk);
          if (p) people.push(p);
        }
      }
      inAttendees = !inline;
      continue;
    }

    if (HEADING_NEXT.test(trimmed)) {
      inNext = true;
      inAttendees = false;
      continue;
    }

    const bullet = trimmed.match(BULLET);
    if (bullet) {
      const text = bullet[1].trim();
      if (inAttendees) {
        const p = person(text);
        if (p) {
          people.push(p);
          continue;
        }
        inAttendees = false;
      }
      if (text) (inNext ? nextSteps : bullets).push(text);
      continue;
    }

    if (trimmed && HEADING_ANY.test(trimmed) && i > 0) {
      inNext = HEADING_NEXT.test(trimmed);
      inAttendees = false;
    }
  }

  // Numbers are worth finding anywhere, not only in bullets.
  return {
    title,
    company,
    people,
    bullets,
    nextSteps,
    numbers: numbers(nonEmpty.slice(1)),
    raw,
  };
}

/** Nothing worth showing the rep. */
export function isEmptyParse(p: ParsedNotes): boolean {
  return !p.company && !p.people.length && !p.bullets.length && !p.nextSteps.length && !p.numbers.length;
}
