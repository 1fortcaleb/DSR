import { useRooms } from "../context/RoomsContext";
import { agoPhrase, firstName, shortAgo } from "../lib/vocabulary";
import { CheckIcon, FlagIcon } from "./icons";

/**
 * Rep-side view of what came back. Leads with the verdict because that is the
 * signal worth acting on; the highlighted passages are the detail underneath.
 */
export function ResponsesPanel() {
  const { activeRoom, vocabulary, resolveFlag, removeFlag } = useRooms();
  const { feedback, flags, account } = activeRoom;
  const who = firstName(account.counterparty.name) || vocabulary.counterparty;

  const open = flags.filter((f) => !f.resolved);
  const done = flags.length - open.length;

  return (
    <div className="flex flex-col gap-3.5 rounded-[10px] border border-border bg-white p-5">
      <span className="font-mono text-[10px] tracking-[0.12em] text-faint uppercase">
        What {who} said
      </span>

      {feedback ? (
        <div className="flex items-start gap-2.5">
          <span
            className={`mt-px inline-flex h-5 w-5 flex-none items-center justify-center rounded-full ${
              feedback.verdict === "holds" ? "bg-green-bg text-green" : "bg-amber-bg text-amber"
            }`}
          >
            {feedback.verdict === "holds" ? <CheckIcon size={12} /> : <FlagIcon size={11} />}
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-[13px] leading-[1.4] font-bold text-gray-900">
              {feedback.verdict === "holds" ? "This holds up" : "Has concerns"}
            </span>
            {feedback.message && (
              <p className="m-0 text-[12px] leading-[1.55] text-body italic">
                “{feedback.message}”
              </p>
            )}
            <span className="font-mono text-[9.5px] text-faintest">
              {agoPhrase(feedback.at)}
            </span>
          </div>
        </div>
      ) : (
        <p className="m-0 text-[11.5px] leading-[1.55] text-muted">
          No answer yet. {who} is asked once, at the foot of the page, whether it holds up.
        </p>
      )}

      {open.length > 0 && (
        <div className="flex flex-col gap-3 border-t border-border-soft pt-3">
          <span className="font-mono text-[9.5px] tracking-[0.1em] text-faint uppercase">
            {open.length} highlighted
          </span>
          {open.map((flag) => (
            <div key={flag.id} className="flex flex-col gap-1.5">
              <p className="m-0 border-l-2 border-amber/40 pl-2.5 text-[11.5px] leading-[1.45] text-muted italic">
                “{flag.quote}”
              </p>
              <p className="m-0 text-[12.5px] leading-[1.5] text-gray-900">{flag.note}</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => resolveFlag(flag.id)}
                  title="Mark as dealt with"
                  className="cursor-pointer rounded border border-border bg-white px-2 py-1 font-sans text-[11px] font-bold text-gray-800 transition-colors hover:bg-row-hover"
                >
                  Fixed
                </button>
                <button
                  onClick={() => removeFlag(flag.id)}
                  className="cursor-pointer border-none bg-transparent p-0 font-sans text-[11px] text-faint transition-colors hover:text-red"
                >
                  Discard
                </button>
                <span className="ml-auto font-mono text-[9.5px] text-faintest">
                  {shortAgo(flag.at)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {done > 0 && (
        <span className="font-mono text-[9.5px] text-faintest">
          {done} already fixed
        </span>
      )}
    </div>
  );
}
