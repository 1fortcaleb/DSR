import { useMemo, useState } from "react";
import { useRooms } from "../../context/RoomsContext";
import { isEmptyParse, parseNotes, RULE, type ParsedNotes, type ParsedNumber } from "../../lib/granola";
import { CheckIcon } from "../icons";
import { Button, Section } from "./Field";

/** Placeholder text from a fresh room — safe to fill over. */
const PLACEHOLDER =
  /^(—|-|\[.*\]|Headline goes here\.|Describe what changes for them\.|Metric (one|two|three|four)|(First|Second|Third) (proof point|milestone)|What happens|Source pending|Add the assumptions.*|Prepared by 1Fort|REF-0000|Untitled room)$/i;

/**
 * Blank, placeholder, or debris. RULE is in there so a room an earlier import
 * filled with a row of equals signs can be repaired by pasting again, instead
 * of the junk counting as content the rep wrote and being protected.
 */
const isBlank = (v: string) => !v.trim() || PLACEHOLDER.test(v.trim()) || RULE.test(v);

/**
 * The line the figure came from, with the figure itself taken out — the number
 * is already displayed above the label, so repeating it reads as a stutter.
 */
function statLabel(n: ParsedNumber): string {
  const escaped = n.value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // No \b around the figure: it can start with "$" or end with "%", neither of
  // which is a word character, so a word boundary never matches there.
  const pattern = new RegExp(`${escaped}\\s*${n.unit ?? ""}`, "i");
  const stripped = n.context
    .replace(pattern, " ")
    .replace(/^\s*(?:is|are|was|were|of|at|about|roughly|around|they estimate|we estimate|~)\s+/i, "")
    .replace(/\s+(?:is|are|was|were|of|at|to)\s*$/i, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s,;:-]+|[\s,;:-]+$/g, "")
    .trim();
  const text = stripped.length > 4 ? stripped : n.context;
  return (text.charAt(0).toUpperCase() + text.slice(1)).slice(0, 70);
}

/** One field the notes have something to say about. */
interface Change {
  key: string;
  label: string;
  /** What's on the page now. Empty string when the slot is a placeholder. */
  current: string;
  /** What the notes would put there. */
  next: string;
  /** True when the slot already holds real content the rep would lose. */
  occupied: boolean;
  apply: () => void;
}

/**
 * Paste meeting notes, get the room started.
 *
 * Everything here is a suggestion, and the suggestion is shown in full before
 * it is taken: which field, what's in it now, what would replace it. The
 * default is to fill only empty slots, because overwriting someone's writing
 * without asking is the worse failure — but "leave it alone" silently was its
 * own kind of broken, so the skipped fields are listed too and can be taken in
 * one click.
 *
 * The raw notes are kept as a source either way, so a later regeneration has
 * the original.
 */
export function NotesImport() {
  const { activeRoom, updateRoom, setField, setListItem, renameSource } = useRooms();
  const { content, account } = activeRoom;
  const [text, setText] = useState("");
  const [overwrite, setOverwrite] = useState(false);
  /** null until the rep runs it; an empty array means "nothing was eligible". */
  const [applied, setApplied] = useState<string[] | null>(null);

  const parsed: ParsedNotes | null = useMemo(
    () => (text.trim().length > 20 ? parseNotes(text) : null),
    [text],
  );

  /**
   * Whoever isn't us is the counterparty — and when the notes name both sides,
   * whoever is at the company the room is for. Without that second test the
   * first person listed wins, which on a two-vendor call is our own AE.
   */
  const them = useMemo(() => {
    const everyone = parsed?.people ?? [];
    const notUs = everyone.filter((p) => !/1fort/i.test(`${p.org ?? ""} ${p.title ?? ""}`));
    const company = parsed?.company?.toLowerCase() ?? "";
    const atCompany = company
      ? notUs.filter((p) => {
          const org = p.org?.toLowerCase();
          return org && (company.includes(org) || org.includes(company));
        })
      : [];
    return atCompany.length ? atCompany : notUs;
  }, [parsed]);

  /**
   * Everything the notes could change, whether or not it's allowed to.
   *
   * Stat slots are allocated differently depending on the mode: when only
   * empty slots are in play the figures pack into the gaps, and when the notes
   * are allowed to win they line up from the top. Computing the plan against
   * the live mode means the preview is what actually happens, rather than an
   * optimistic version of it.
   */
  const plan: Change[] = useMemo(() => {
    if (!parsed) return [];
    const out: Change[] = [];

    /** A row saying "Acme Corp → Acme Corp" is noise, not a change. */
    const add = (c: Change) => {
      if (c.current !== c.next) out.push(c);
    };

    if (parsed.company) {
      const current = account.company === "Untitled room" ? "" : account.company;
      add({
        key: "company",
        label: "Company",
        current: isBlank(current) ? "" : current,
        next: parsed.company,
        occupied: !isBlank(current),
        apply: () =>
          updateRoom(activeRoom.id, {
            name: parsed.company!,
            account: {
              ...account,
              company: parsed.company!,
              counterparty: { ...account.counterparty, org: parsed.company! },
            },
          }),
      });
    }

    if (them[0]) {
      const person = them[0];
      const current = account.counterparty.name;
      add({
        key: "contact",
        label: "Contact",
        current: isBlank(current) ? "" : current,
        next: person.title ? `${person.name} · ${person.title}` : person.name,
        occupied: !isBlank(current),
        apply: () =>
          updateRoom(activeRoom.id, {
            account: {
              ...account,
              company: parsed.company ?? account.company,
              counterparty: {
                name: person.name,
                title: person.title ?? "",
                org: parsed.company ?? account.counterparty.org,
              },
            },
          }),
      });
    }

    const freeStats = content.stats.filter((s) => isBlank(s.value));
    const statTargets = overwrite ? content.stats : freeStats;
    parsed.numbers.slice(0, statTargets.length).forEach((n, i) => {
      const stat = statTargets[i];
      const at = content.stats.indexOf(stat);
      const current = isBlank(stat.value) ? "" : `${stat.value}${stat.unit ? ` ${stat.unit}` : ""}`;
      add({
        key: `stat-${stat.id}`,
        label: `Stat ${at + 1}`,
        current,
        next: `${n.value}${n.unit ? ` ${n.unit}` : ""} · ${statLabel(n)}`,
        occupied: !!current,
        apply: () =>
          setListItem("stats", stat.id, { value: n.value, unit: n.unit ?? "", label: statLabel(n) }),
      });
    });

    parsed.nextSteps.slice(0, content.weeks.length).forEach((step, i) => {
      const week = content.weeks[i];
      const current = isBlank(week.title) ? "" : week.title;
      add({
        key: `week-${week.id}`,
        label: `Step ${i + 1}`,
        current,
        next: step.slice(0, 60),
        occupied: !!current,
        // The sub-line described the title being replaced, so it goes with it.
        // "Pilot with two producers / Your book, where it jams" is worse than
        // no sub-line at all.
        apply: () =>
          setListItem("weeks", week.id, {
            title: step.slice(0, 60),
            ...(isBlank(week.sub) || current ? { sub: "" } : {}),
          }),
      });
    });

    parsed.bullets.slice(0, content.approachBullets.length).forEach((b, i) => {
      const bullet = content.approachBullets[i];
      const current = isBlank(bullet.text) ? "" : bullet.text;
      add({
        key: `bullet-${bullet.id}`,
        label: `Point ${i + 1}`,
        current,
        next: b.slice(0, 120),
        occupied: !!current,
        apply: () => setListItem("approachBullets", bullet.id, { text: b.slice(0, 120) }),
      });
    });

    if (parsed.title) {
      const current = isBlank(content.statsSource) ? "" : content.statsSource;
      const next = `From ${parsed.title.slice(0, 60)}`;
      add({
          key: "statsSource",
          label: "Figures from",
          current,
          next,
          occupied: !!current,
          apply: () => setField("statsSource", next),
      });
    }

    return out;
  }, [parsed, them, account, content, activeRoom.id, overwrite, updateRoom, setListItem, setField]);

  // `occupied` is mode-independent, so the override control doesn't unmount the
  // moment it's used — which would leave no way to switch it back off.
  const occupied = plan.filter((c) => c.occupied);
  const willChange = overwrite ? plan : plan.filter((c) => !c.occupied);
  const skipped = overwrite ? [] : occupied;

  /**
   * Stats that keep their existing figure while their neighbours get replaced.
   *
   * This is the one way this screen can put a falsehood on a customer-facing
   * page: three of four stats become the prospect's numbers, the source line
   * starts crediting their call, and the fourth is still the archetype's
   * typical figure now passing as theirs.
   */
  const stranded = willChange.some((c) => c.key.startsWith("stat-"))
    ? content.stats.filter(
        (s) => !isBlank(s.value) && !willChange.some((c) => c.key === `stat-${s.id}`),
      )
    : [];

  function applyAll() {
    if (!parsed) return;
    for (const change of willChange) change.apply();
    keepAsSource();
    setApplied(willChange.map((c) => c.label));
  }

  /** Keeps the notes on the room so a later regeneration can draw on them. */
  function keepAsSource() {
    const label = parsed?.title?.slice(0, 60) || "Pasted notes";
    const existing = activeRoom.sources.find((s) => s.text === parsed?.raw);
    if (existing) {
      // Same notes, better label — an earlier import may have named this source
      // after a divider line.
      if (existing.label !== label) renameSource(existing.id, label);
      return;
    }
    updateRoom(activeRoom.id, {
      sources: [
        ...activeRoom.sources,
        { id: `src-${Date.now().toString(36)}`, label, used: true, text: parsed?.raw },
      ],
    });
  }

  const nothingFound = parsed && isEmptyParse(parsed);

  return (
    <div className="flex flex-col gap-5">
      <Section
        title="Paste notes from Granola"
        hint="Paste the whole note — a Granola copy-out or a full recorder transcript. You'll see exactly which fields it wants to change before anything happens."
      >
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setApplied(null);
          }}
          rows={10}
          placeholder={`Meridian Risk Partners <> 1Fort — Discovery Call\nJul 24, 2026\n\nAttendees: Dana Whitfield (COO), Rachel Moss (1Fort)\n\nSummary\n- 40 producers submitting cyber via email and spreadsheets\n- Median time to first quote is 11.5 days\n- $1.4M of unwritten premium annually\n\nNext steps\n- Pilot with two producers`}
          className="w-full resize-y rounded-md border border-border bg-white px-3 py-2.5 font-mono text-[12px] leading-[1.6] text-body outline-none transition-colors placeholder:text-faintest focus:border-blue focus:ring-2 focus:ring-blue-bg"
        />

        {parsed && !nothingFound && (
          <>
            {willChange.length > 0 && (
              <div className="flex flex-col gap-2 rounded-md border border-border-soft bg-row-hover p-3">
                <span className="font-mono text-[9.5px] tracking-[0.1em] text-faint uppercase">
                  {overwrite ? "Will be replaced" : "Will be filled in"}
                </span>
                {willChange.map((c) => (
                  <ChangeRow key={c.key} change={c} />
                ))}
              </div>
            )}

            {skipped.length > 0 && (
              <div className="flex flex-col gap-2 rounded-md border border-border-soft p-3">
                <span className="font-mono text-[9.5px] tracking-[0.1em] text-faint uppercase">
                  Left alone — already written
                </span>
                {skipped.map((c) => (
                  <ChangeRow key={c.key} change={c} muted />
                ))}
              </div>
            )}

            {willChange.length === 0 && skipped.length === 0 && (
              <p className="m-0 text-[12.5px] leading-[1.55] text-muted">
                Nothing in these notes maps onto a field on the page. They've still got a company
                or a contact in them — save them as a source and they'll be there when generation
                is wired up.
              </p>
            )}

            {occupied.length > 0 && (
              <label className="flex cursor-pointer items-start gap-2 text-[12.5px] leading-[1.5] text-body">
                <input
                  type="checkbox"
                  checked={overwrite}
                  onChange={(e) => {
                    setOverwrite(e.target.checked);
                    setApplied(null);
                  }}
                  className="mt-0.5 cursor-pointer accent-blue"
                />
                <span>
                  Let the notes win — replace the {occupied.length} field
                  {occupied.length === 1 ? "" : "s"} already written.
                  <span className="block text-[11.5px] text-muted">
                    A pre-call room is pre-written on purpose, so on one of those this replaces the
                    archetype's figures with theirs.
                  </span>
                </span>
              </label>
            )}

            <div className="flex items-center gap-3">
              <Button variant="primary" onClick={applyAll} disabled={willChange.length === 0}>
                {overwrite && occupied.length
                  ? `Apply all ${willChange.length} changes`
                  : `Fill ${willChange.length} field${willChange.length === 1 ? "" : "s"}`}
              </Button>
              <Button onClick={keepAsSource}>Just save as a source</Button>
            </div>

            {stranded.length > 0 && (
              <p className="m-0 rounded-md bg-red/10 px-3 py-2 text-[12px] leading-[1.5] text-red">
                {stranded.map((s) => `"${s.value}${s.unit ? ` ${s.unit}` : ""} · ${s.label}"`).join(", ")}{" "}
                {stranded.length === 1 ? "isn't" : "aren't"} from these notes and will stay put —
                but the figures line will start crediting them. Replace or clear{" "}
                {stranded.length === 1 ? "it" : "them"} in Business case before you send.
              </p>
            )}

            <p className="m-0 text-[11.5px] leading-[1.5] text-faint">
              The headline and the framing lines are never written from notes — those are a
              judgement call, and they're what the Claude wiring is for.
            </p>

            {applied && applied.length > 0 && (
              <p className="m-0 flex items-center gap-1.5 text-[12px] font-bold text-green">
                <CheckIcon size={12} />
                Done: {[...new Set(applied)].join(", ")}.
              </p>
            )}
          </>
        )}

        {nothingFound && (
          <p className="m-0 text-[12.5px] leading-[1.55] text-muted">
            Nothing recognisable in there. It reads best with the note's title on the first line,
            an "Attendees:" line, and bullets — which is what Granola copies out by default.
          </p>
        )}
      </Section>
    </div>
  );
}

/** One "Stat 2: 6 portals → 40 producers" line. */
function ChangeRow({ change, muted }: { change: Change; muted?: boolean }) {
  return (
    <div className="grid grid-cols-[92px_minmax(0,1fr)] items-start gap-2">
      <span className="font-mono text-[9.5px] tracking-[0.08em] text-faint uppercase">
        {change.label}
      </span>
      <span className={`min-w-0 text-[12.5px] leading-[1.5] ${muted ? "text-muted" : "text-body"}`}>
        {change.current && (
          <>
            <span className="text-faint line-through">{change.current}</span>
            <span className="text-faint"> → </span>
          </>
        )}
        <span className={muted ? "" : "font-bold text-navy"}>{change.next}</span>
      </span>
    </div>
  );
}
