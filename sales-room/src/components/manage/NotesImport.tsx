import { useMemo, useState } from "react";
import { useRooms } from "../../context/RoomsContext";
import { isEmptyParse, parseNotes, type ParsedNotes } from "../../lib/granola";
import { CheckIcon } from "../icons";
import { Button, Section } from "./Field";

/** Placeholder text from a fresh room — safe to fill over. */
const PLACEHOLDER = /^(—|-|\[.*\]|Headline goes here\.|Describe what changes for them\.|Metric (one|two|three|four)|(First|Second|Third) (proof point|milestone)|What happens|Source pending|Add the assumptions.*|Prepared by 1Fort|REF-0000|Untitled room)$/i;

const isBlank = (v: string) => !v.trim() || PLACEHOLDER.test(v.trim());

/**
 * The line the figure came from, with the figure itself taken out — the number
 * is already displayed above the label, so repeating it reads as a stutter.
 */
function statLabel(n: { value: string; unit?: string; context: string }): string {
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

/**
 * Paste meeting notes, get the room started.
 *
 * Everything here is a suggestion. Blank placeholder fields are filled
 * automatically because there is nothing to lose; anything the rep has already
 * written is left alone and offered as a click instead. The raw notes are kept
 * as a source either way, so a later regeneration has the original.
 */
export function NotesImport() {
  const { activeRoom, updateRoom, setField, setListItem } = useRooms();
  const { content, account } = activeRoom;
  const [text, setText] = useState("");
  const [applied, setApplied] = useState<string[]>([]);

  const parsed: ParsedNotes | null = useMemo(
    () => (text.trim().length > 20 ? parseNotes(text) : null),
    [text],
  );

  // Whoever isn't us is the counterparty.
  const them = parsed?.people.filter((p) => !/1fort/i.test(p.title ?? "")) ?? [];

  function applyAll() {
    if (!parsed) return;
    const done: string[] = [];

    if (parsed.company && (isBlank(account.company) || account.company === "Untitled room")) {
      updateRoom(activeRoom.id, {
        name: parsed.company,
        account: {
          ...account,
          company: parsed.company,
          counterparty: { ...account.counterparty, org: parsed.company },
        },
      });
      done.push("Company");
    }

    if (them[0] && isBlank(account.counterparty.name)) {
      updateRoom(activeRoom.id, {
        account: {
          ...account,
          company: parsed.company ?? account.company,
          counterparty: {
            name: them[0].name,
            title: them[0].title ?? "",
            org: parsed.company ?? account.counterparty.org,
          },
        },
      });
      done.push("Contact");
    }

    // Numbers land in whichever stat slots are still placeholders.
    let slot = 0;
    for (const n of parsed.numbers) {
      while (slot < content.stats.length && !isBlank(content.stats[slot].value)) slot++;
      if (slot >= content.stats.length) break;
      setListItem("stats", content.stats[slot].id, {
        value: n.value,
        unit: n.unit ?? "",
        label: statLabel(n),
      });
      slot++;
      done.push("Numbers");
    }

    // Next steps become the plan.
    parsed.nextSteps.slice(0, content.weeks.length).forEach((step, i) => {
      if (!isBlank(content.weeks[i].title)) return;
      setListItem("weeks", content.weeks[i].id, { title: step.slice(0, 60), sub: "" });
      done.push("Plan");
    });

    // Bullets become proof points.
    parsed.bullets.slice(0, content.changesBullets.length).forEach((b, i) => {
      if (!isBlank(content.changesBullets[i].text)) return;
      setListItem("changesBullets", content.changesBullets[i].id, { text: b.slice(0, 120) });
      done.push("Proof points");
    });

    if (isBlank(content.statsSource) && parsed.title) {
      setField("statsSource", `From ${parsed.title.slice(0, 60)}`);
    }

    keepAsSource();
    setApplied([...new Set(done)]);
  }

  /** Keeps the notes on the room so a later regeneration can draw on them. */
  function keepAsSource() {
    const label = parsed?.title?.slice(0, 60) || "Pasted notes";
    if (activeRoom.sources.some((s) => s.text === parsed?.raw)) return;
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
        hint="Copy the whole note and paste it here. Blank fields get filled in; anything you've already written is left alone."
      >
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setApplied([]);
          }}
          rows={10}
          placeholder={`Meridian Risk Partners <> 1Fort — Discovery Call\nJul 24, 2026\n\nAttendees: Dana Whitfield (COO), Rachel Moss (1Fort)\n\nSummary\n- 40 producers submitting cyber via email and spreadsheets\n- Median time to first quote is 11.5 days\n- $1.4M of unwritten premium annually\n\nNext steps\n- Pilot with two producers`}
          className="w-full resize-y rounded-md border border-border bg-white px-3 py-2.5 font-mono text-[12px] leading-[1.6] text-body outline-none transition-colors placeholder:text-faintest focus:border-blue focus:ring-2 focus:ring-blue-bg"
        />

        {parsed && !nothingFound && (
          <>
            <div className="flex flex-col gap-2.5 rounded-md border border-border-soft bg-row-hover p-3">
              <span className="font-mono text-[9.5px] tracking-[0.1em] text-faint uppercase">
                Found in these notes
              </span>
              <div className="flex flex-col gap-1.5 text-[12.5px] leading-[1.5] text-body">
                {parsed.company && (
                  <Row label="Company">{parsed.company}</Row>
                )}
                {them.length > 0 && (
                  <Row label="Contact">
                    {them[0].name}
                    {them[0].title && <span className="text-muted"> · {them[0].title}</span>}
                  </Row>
                )}
                {parsed.numbers.length > 0 && (
                  <Row label="Numbers">
                    <span className="flex flex-wrap gap-1.5">
                      {parsed.numbers.map((n, i) => (
                        <span
                          key={i}
                          title={n.context}
                          className="rounded bg-white px-1.5 py-0.5 font-mono text-[11px] text-navy"
                        >
                          {n.value}
                          {n.unit ? ` ${n.unit}` : ""}
                        </span>
                      ))}
                    </span>
                  </Row>
                )}
                {parsed.nextSteps.length > 0 && (
                  <Row label="Next steps">{parsed.nextSteps.length} found</Row>
                )}
                {parsed.bullets.length > 0 && (
                  <Row label="Points">{parsed.bullets.length} found</Row>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="primary" onClick={applyAll}>
                Fill the room from these notes
              </Button>
              <Button onClick={keepAsSource}>Just save as a source</Button>
            </div>

            {applied.length > 0 && (
              <p className="m-0 flex items-center gap-1.5 text-[12px] font-bold text-green">
                <CheckIcon size={12} />
                Filled: {applied.join(", ")}. Anything you'd already written was left as it was.
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

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[92px_minmax(0,1fr)] items-start gap-2">
      <span className="font-mono text-[9.5px] tracking-[0.08em] text-faint uppercase">{label}</span>
      <span className="min-w-0">{children}</span>
    </div>
  );
}
