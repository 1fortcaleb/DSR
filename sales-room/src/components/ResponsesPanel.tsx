import { useRooms } from "../context/RoomsContext";
import { agoPhrase, firstName } from "../lib/vocabulary";
import { RedlineThread } from "./RedlineThread";
import { CheckIcon, FlagIcon } from "./icons";

/**
 * Rep-side view of what came back. Leads with the verdict because that is the
 * signal worth acting on; the highlighted passages are the detail underneath.
 */
export function ResponsesPanel() {
  const { activeRoom, vocabulary } = useRooms();
  const { feedback, flags, account } = activeRoom;
  const who = firstName(account.counterparty.name) || vocabulary.counterparty;

  const open = flags.filter((f) => f.status === "open");
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
              feedback.verdict === "holds"
                ? "bg-green-bg text-green"
                : "bg-amber-bg text-amber"
            }`}
          >
            {feedback.verdict === "holds" ? (
              <CheckIcon size={12} />
            ) : (
              <FlagIcon size={11} />
            )}
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
          No answer yet. {who} is asked once, at the foot of the page, whether
          it holds up.
        </p>
      )}

      {open.length > 0 && (
        <div className="flex flex-col gap-3 border-t border-border-soft pt-3">
          <span className="font-mono text-[9.5px] tracking-[0.1em] text-faint uppercase">
            {open.length} open on the page
          </span>
          {open.map((mark) => (
            <RedlineThread key={mark.id} mark={mark} canDecide />
          ))}
        </div>
      )}

      {done > 0 && (
        <span className="font-mono text-[9.5px] text-faintest">
          {done} settled
        </span>
      )}
    </div>
  );
}
