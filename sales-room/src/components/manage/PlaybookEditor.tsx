import { useEffect, useState } from "react";
import { EMPTY_PLAYBOOK, fetchPlaybook, savePlaybook, type Playbook } from "../../lib/api";
import { errText } from "../../lib/errors";
import { isCloud } from "../../lib/supabase";
import { CheckIcon } from "../icons";
import { Button, Section } from "./Field";

/**
 * What good looks like, in the team's words, feeding every generation.
 *
 * Three fields rather than one box because they do different jobs and the
 * model weighs them differently. An example of a page that worked is the
 * strongest input here by a distance — a model matches the shape, length and
 * register of a real one far more closely than it follows a list of adjectives
 * about tone. The principles steer judgement the example can't cover, and the
 * avoid list is kept separate so a pile of prohibitions can't drown out the
 * description of success.
 *
 * Shared by the whole team: one playbook, edited by whoever learns something.
 */
export function PlaybookEditor() {
  const [draft, setDraft] = useState<Playbook>(EMPTY_PLAYBOOK);
  const [saved, setSaved] = useState<Playbook>(EMPTY_PLAYBOOK);
  const [state, setState] = useState<"loading" | "ready" | "saving" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isCloud) {
      setState("ready");
      return;
    }
    let cancelled = false;
    fetchPlaybook()
      .then((p) => {
        if (cancelled) return;
        setDraft(p);
        setSaved(p);
        setState("ready");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(errText(err));
        setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  async function save() {
    setState("saving");
    setError(null);
    try {
      await savePlaybook(draft);
      setSaved(draft);
      setState("ready");
    } catch (err) {
      setError(errText(err));
      setState("error");
    }
  }

  const field = (
    key: keyof Playbook,
    label: string,
    hint: string,
    placeholder: string,
    rows: number,
  ) => (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] tracking-[0.1em] text-faint uppercase">{label}</span>
      <span className="text-[11.5px] leading-[1.5] text-muted">{hint}</span>
      <textarea
        value={draft[key]}
        onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
        rows={rows}
        placeholder={placeholder}
        className="w-full resize-y rounded-md border border-border bg-white px-3 py-2.5 font-sans text-[13px] leading-[1.6] text-body outline-none transition-colors placeholder:text-faintest focus:border-blue focus:ring-2 focus:ring-blue-bg"
      />
    </label>
  );

  if (!isCloud) {
    return (
      <Section title="What good looks like">
        <p className="m-0 text-[12.5px] leading-[1.55] text-muted">
          The playbook is stored on the server so the whole team shares one. This build is running
          against browser storage, so there's nothing to edit.
        </p>
      </Section>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Section
        title="What good looks like"
        hint="Goes into every generation, for every room. This is how you teach the writing — not by editing each page afterwards, but by changing what it aims at."
      >
        {state === "loading" ? (
          <p className="m-0 text-[12.5px] text-muted">Loading…</p>
        ) : (
          <>
            {field(
              "principles",
              "What makes ours good",
              "The judgement calls. Write it as you'd brief a new rep on their first week — what the page is for, what a good one does that a bad one doesn't.",
              "A one-pager exists to get a yes or a no, not to impress.\n\nLead with what changes for them, never with what we do.\n\nThe headline should name a number they recognise…",
              8,
            )}

            {field(
              "exemplar",
              "A page that worked",
              "Paste a real one, whole. This is the strongest input on the screen — the model copies the shape and register of a real example far more closely than it follows any description of one.",
              "Paste the full text of a business case that got a good reaction. Two or three separated by a blank line is better than one.",
              12,
            )}

            {field(
              "avoid",
              "Never do this",
              "Things that have actually cost you a meeting, with the reason. A short list carries more weight than a long one.",
              "Never use a figure they haven't said out loud — they read these with their own numbers in front of them.\n\nNo three-item lists of adjectives…",
              6,
            )}

            {error && (
              <p className="m-0 rounded-md bg-red/10 px-3 py-2 text-[12px] leading-[1.5] text-red">
                {error}
              </p>
            )}

            <div className="flex items-center gap-3">
              <Button variant="primary" onClick={() => void save()} disabled={!dirty || state === "saving"}>
                {state === "saving" ? "Saving…" : "Save playbook"}
              </Button>
              {!dirty && state === "ready" && (saved.principles || saved.exemplar || saved.avoid) && (
                <span className="flex items-center gap-1.5 text-[12px] font-bold text-green">
                  <CheckIcon size={12} />
                  Saved — every room generates against this.
                </span>
              )}
            </div>

            <p className="m-0 text-[11px] leading-[1.5] text-faint">
              One playbook for the team. Anyone can change it, and the next regeneration in any room
              picks it up — there's nothing to deploy.
            </p>
          </>
        )}
      </Section>
    </div>
  );
}
