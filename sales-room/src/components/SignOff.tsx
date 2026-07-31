import { useState } from "react";
import { useRooms } from "../context/RoomsContext";
import { agoPhrase, firstName } from "../lib/vocabulary";
import type { Audience } from "../types";
import { CheckIcon, FlagIcon } from "./icons";

/**
 * The one thing the page asks of the counterparty.
 *
 * Deliberately a single verdict at the end of the read rather than a per-line
 * sign-off: nobody ratifies a business case clause by clause, and asking them
 * to is how you get no answer at all. Anything more specific is raised by
 * highlighting a passage, which costs nothing until they want to say something.
 */
export function SignOff({ audience }: { audience: Audience }) {
  const { activeRoom, vocabulary, submitFeedback, withdrawFeedback } = useRooms();
  const { feedback, account, flags } = activeRoom;
  const isBuyer = audience === "buyer";
  const owner = firstName(account.owner.name) || "your contact";
  const them = firstName(account.counterparty.name) || vocabulary.counterparty;

  const [writing, setWriting] = useState(false);
  const [message, setMessage] = useState("");

  const openFlags = flags.filter((f) => !f.resolved);

  /* ------------------------------------------------- answered: show the record */
  if (feedback) {
    const holds = feedback.verdict === "holds";
    return (
      <section className="-mx-[68px] -mb-14 mt-4 rounded-b-[10px] bg-nav px-[68px] pt-9 pb-10">
        <div className="flex items-start justify-between gap-6">
          <div className="flex min-w-0 flex-col gap-3">
            <span className="font-mono text-[10px] tracking-[0.14em] text-periwinkle uppercase">
              {isBuyer ? "Your call" : `${them}'s call`}
            </span>
            <h2 className="m-0 flex items-center gap-3 text-[26px] leading-[1.15] font-bold tracking-[-0.02em] text-white">
              <span
                className={`inline-flex h-7 w-7 flex-none items-center justify-center rounded-full ${
                  holds ? "bg-live text-nav" : "bg-amber text-white"
                }`}
              >
                {holds ? <CheckIcon size={15} /> : <FlagIcon size={14} />}
              </span>
              {holds
                ? isBuyer
                  ? "You said this holds up."
                  : `${them} says this holds up.`
                : isBuyer
                  ? "You flagged concerns."
                  : `${them} has concerns.`}
            </h2>
            {feedback.message && (
              <p className="m-0 max-w-[46em] border-l-2 border-periwinkle pl-4 text-[14px] leading-[1.6] text-nav-body italic">
                “{feedback.message}”
              </p>
            )}
            <p className="m-0 text-[12px] text-nav-faint">
              {isBuyer
                ? `${owner} was notified · ${agoPhrase(feedback.at)}`
                : agoPhrase(feedback.at)}
              {openFlags.length > 0 &&
                ` · ${openFlags.length} passage${openFlags.length > 1 ? "s" : ""} highlighted`}
            </p>
          </div>
          {isBuyer && (
            <button
              onClick={() => {
                withdrawFeedback();
                setWriting(false);
                setMessage("");
              }}
              className="flex-none cursor-pointer rounded-md border border-nav-line bg-transparent px-3 py-2 font-sans text-[12px] font-bold text-nav-body transition-colors hover:border-nav-faint hover:text-white"
            >
              Change my answer
            </button>
          )}
        </div>
      </section>
    );
  }

  /* -------------------------------------------------- rep, still waiting on them */
  if (!isBuyer) {
    return (
      <section className="-mx-[68px] -mb-14 mt-4 rounded-b-[10px] bg-nav px-[68px] pt-9 pb-10">
        <div className="flex flex-col gap-2.5">
          <span className="font-mono text-[10px] tracking-[0.14em] text-periwinkle uppercase">
            {them}'s call
          </span>
          <h2 className="m-0 text-[26px] leading-[1.15] font-bold tracking-[-0.02em] text-white">
            No answer yet.
          </h2>
          <p className="m-0 max-w-[42em] text-[13px] leading-[1.6] text-nav-muted">
            {them} is asked one question at the end of this page — whether it holds up — and can
            highlight any passage to tell you what's wrong with it.
          </p>
        </div>
      </section>
    );
  }

  /* --------------------------------------------------- buyer, writing a concern */
  if (writing) {
    return (
      <section className="-mx-[68px] -mb-14 mt-4 rounded-b-[10px] bg-nav px-[68px] pt-9 pb-10">
        <div className="flex flex-col gap-4">
          <span className="font-mono text-[10px] tracking-[0.14em] text-periwinkle uppercase">
            Your call
          </span>
          <h2 className="m-0 text-[26px] leading-[1.15] font-bold tracking-[-0.02em] text-white">
            What's off?
          </h2>
          <textarea
            autoFocus
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="The premium number is closer to $2.6M — we lost an E&O book last year that isn't in there."
            className="w-full resize-y rounded-md border border-nav-line bg-nav-raised px-4 py-3 font-sans text-[14px] leading-[1.6] text-white outline-none transition-colors placeholder:text-nav-faint focus:border-periwinkle"
          />
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                submitFeedback("concerns", message);
                setWriting(false);
              }}
              disabled={!message.trim()}
              className="cursor-pointer rounded-md border-none bg-periwinkle px-5 py-2.5 font-sans text-[13px] font-bold text-nav transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Send to {owner}
            </button>
            <button
              onClick={() => setWriting(false)}
              className="cursor-pointer border-none bg-transparent p-0 font-sans text-[12.5px] text-nav-faint transition-colors hover:text-nav-body"
            >
              Back
            </button>
          </div>
        </div>
      </section>
    );
  }

  /* ------------------------------------------------------- buyer, the question */
  return (
    <section className="-mx-[68px] -mb-14 mt-4 rounded-b-[10px] bg-nav px-[68px] pt-9 pb-10">
      <div className="flex flex-col gap-1.5">
        <span className="font-mono text-[10px] tracking-[0.14em] text-periwinkle uppercase">
          Your call
        </span>
        <h2 className="m-0 text-[30px] leading-[1.15] font-bold tracking-[-0.025em] text-white">
          Does this hold up?
        </h2>
        <p className="m-0 max-w-[40em] text-[13px] leading-[1.6] text-nav-muted">
          One answer is enough — {owner} sees it straight away. To point at something specific,
          highlight it anywhere on the page.
        </p>
      </div>

      {/* A real decision, so both options carry equal weight and explain themselves. */}
      <div className="mt-7 grid grid-cols-2 gap-3">
        <button
          onClick={() => submitFeedback("holds")}
          className="group flex cursor-pointer flex-col items-start gap-1 rounded-lg border border-nav-line bg-nav-raised px-5 py-4 text-left transition-colors hover:border-live"
        >
          <span className="flex items-center gap-2 text-[15px] font-bold text-white">
            <CheckIcon size={14} className="text-live" />
            Yes, this holds up
          </span>
          <span className="text-[12px] leading-[1.5] text-nav-faint">
            The framing and the numbers match what you see.
          </span>
        </button>
        <button
          onClick={() => setWriting(true)}
          className="group flex cursor-pointer flex-col items-start gap-1 rounded-lg border border-nav-line bg-nav-raised px-5 py-4 text-left transition-colors hover:border-amber"
        >
          <span className="flex items-center gap-2 text-[15px] font-bold text-white">
            <FlagIcon size={13} className="text-amber" />
            Something's off
          </span>
          <span className="text-[12px] leading-[1.5] text-nav-faint">
            Say what's wrong and {owner} will fix it.
          </span>
        </button>
      </div>

      {openFlags.length > 0 && (
        <p className="mt-4 mb-0 text-[12px] text-nav-faint">
          You've highlighted {openFlags.length} passage{openFlags.length > 1 ? "s" : ""} so far.
        </p>
      )}
    </section>
  );
}
