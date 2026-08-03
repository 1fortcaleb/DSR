import { useState } from "react";
import { useRooms } from "../context/RoomsContext";
import { agoPhrase, firstName } from "../lib/vocabulary";
import { CheckIcon, FlagIcon, XIcon } from "./icons";

/**
 * The one thing the page asks of the counterparty: does this hold up?
 *
 * Answering is a single click and it registers immediately — no modal, no
 * required message, nothing to scroll to. Saying more is optional and happens
 * after the fact, because a verdict you have to justify first is a verdict
 * most people never give.
 *
 * It lives in the rail and stays put for the whole read. There is deliberately
 * only one of these: an identical prompt repeated at the foot of the page just
 * makes the reader wonder whether it is a second, different question.
 */
export function SignOff() {
  const { activeRoom, submitFeedback, withdrawFeedback } = useRooms();
  const { feedback, account, flags } = activeRoom;
  // Before discovery the page makes no claim about them, so asking whether it
  // "holds up" is meaningless. The useful question is whether it describes
  // them at all — and the answer is a qualification signal.
  const pre = activeRoom.mode === "archetype";
  const copy = pre
    ? {
        ask: "Is this you?",
        yes: "That's us",
        no: "Not really",
        yesDone: "You said this is you",
        noDone: "You said it's not quite you",
        note: "Anything we've got wrong about you?",
        foot: "highlight anything that doesn't match how you work.",
      }
    : {
        ask: "Does this hold up?",
        yes: "Agree",
        no: "Not quite",
        yesDone: "You agreed",
        noDone: "You pushed back",
        note: "What's off?",
        foot: "highlight anything on the page to say what's wrong with it.",
      };
  const owner = firstName(account.owner.name) || "your contact";

  const [noting, setNoting] = useState(false);
  const [note, setNote] = useState("");

  const openFlags = flags.filter((f) => !f.resolved);
  const kicker = "font-mono text-[10px] tracking-[0.14em] text-periwinkle uppercase";

  if (feedback) {
    const holds = feedback.verdict === "holds";
    return (
      <section className="flex flex-col gap-3 rounded-[10px] bg-nav p-5">
        <div className="flex items-baseline justify-between gap-3">
          <span className={kicker}>Your call</span>
          <span className="font-mono text-[10px] text-nav-faint">{agoPhrase(feedback.at)}</span>
        </div>

        <h2 className="m-0 flex items-center gap-2.5 text-[16px] leading-[1.3] font-bold tracking-[-0.02em] text-white">
          <span
            className={`inline-flex h-5 w-5 flex-none items-center justify-center rounded-full ${
              holds ? "bg-live text-nav" : "bg-amber text-white"
            }`}
          >
            {holds ? <CheckIcon size={11} /> : <FlagIcon size={10} />}
          </span>
          {holds ? copy.yesDone : copy.noDone}
        </h2>

        {feedback.message && (
          <p className="m-0 border-l-2 border-periwinkle pl-3 text-[12px] leading-[1.55] text-nav-body italic">
            “{feedback.message}”
          </p>
        )}

        {noting ? (
          <div className="flex flex-col gap-2">
            <textarea
              autoFocus
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={holds ? "Anything you'd add?" : `${copy.note} ${owner} will see it.`}
              className="w-full resize-y rounded-md border border-nav-line bg-nav-raised px-3 py-2 font-sans text-[12.5px] leading-[1.5] text-white outline-none placeholder:text-nav-faint focus:border-periwinkle"
            />
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  submitFeedback(feedback.verdict, note);
                  setNoting(false);
                }}
                disabled={!note.trim()}
                className="cursor-pointer rounded-md border-none bg-periwinkle px-3 py-1.5 font-sans text-[12px] font-bold text-nav transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Send
              </button>
              <button
                onClick={() => setNoting(false)}
                className="cursor-pointer border-none bg-transparent p-0 font-sans text-[12px] text-nav-faint hover:text-nav-body"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                setNote(feedback.message ?? "");
                setNoting(true);
              }}
              className="cursor-pointer border-none bg-transparent p-0 font-sans text-[12px] font-bold text-periwinkle transition-opacity hover:opacity-80"
            >
              {feedback.message ? "Edit note" : "Add a note"}
            </button>
            <span className="text-nav-line">·</span>
            <button
              onClick={withdrawFeedback}
              className="cursor-pointer border-none bg-transparent p-0 font-sans text-[12px] text-nav-faint transition-colors hover:text-white"
            >
              Undo
            </button>
          </div>
        )}

        <p className="m-0 text-[11px] leading-[1.5] text-nav-faint">
          {owner} was notified
          {openFlags.length > 0 &&
            ` · ${openFlags.length} passage${openFlags.length > 1 ? "s" : ""} highlighted`}
        </p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3.5 rounded-[10px] bg-nav p-5">
      <div className="flex flex-col gap-1">
        <span className={kicker}>Your call</span>
        <h2 className="m-0 text-[17px] leading-[1.25] font-bold tracking-[-0.025em] text-white">
          {copy.ask}
        </h2>
      </div>

      {/* One click commits. Anything they want to say is optional, and after. */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => submitFeedback("holds")}
          className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-nav-line bg-nav-raised px-3 py-3 font-sans text-[13px] font-bold text-white transition-colors hover:border-live hover:bg-live/10"
        >
          <CheckIcon size={14} className="text-live" />
          {copy.yes}
        </button>
        <button
          onClick={() => submitFeedback("concerns")}
          className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-nav-line bg-nav-raised px-3 py-3 font-sans text-[13px] font-bold text-white transition-colors hover:border-amber hover:bg-amber/10"
        >
          <XIcon size={12} className="text-amber" />
          {copy.no}
        </button>
      </div>

      <p className="m-0 text-[11px] leading-[1.5] text-nav-faint">
        {owner} sees your answer straight away. Or {copy.foot}
      </p>
    </section>
  );
}
