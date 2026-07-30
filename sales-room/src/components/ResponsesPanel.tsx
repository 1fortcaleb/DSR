import { useRooms } from "../context/RoomsContext";
import { claimsFor, tally } from "../lib/claims";
import { firstName, shortAgo } from "../lib/vocabulary";
import { CheckIcon, FlagIcon } from "./icons";

/**
 * Rep-side digest of what the counterparty said. The inline markers already
 * show where they replied; this exists so the rep can see the pushback without
 * hunting the page for it, and act on a correction in one click.
 */
export function ResponsesPanel() {
  const { activeRoom, vocabulary, acceptSuggestion, clearResponse } = useRooms();
  const { content, responses, account } = activeRoom;
  const t = tally(content, responses);
  const who = firstName(account.counterparty.name) || vocabulary.counterparty;

  const challenges = claimsFor(content)
    .filter((c) => responses[c.id]?.verdict === "challenged")
    .map((c) => ({ claim: c, response: responses[c.id] }));

  return (
    <div className="flex flex-col gap-3.5 rounded-[10px] border border-border bg-white p-5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-[10px] tracking-[0.12em] text-faint uppercase">
          What {who} said
        </span>
        <span className="font-mono text-[10px] text-faintest">
          {t.answered}/{t.total}
        </span>
      </div>

      {t.answered === 0 ? (
        <p className="m-0 text-[11.5px] leading-[1.55] text-muted">
          Nothing yet. {who} can agree with any line or tell you what it should say — their
          replies land here.
        </p>
      ) : (
        <>
          <div className="flex gap-4">
            <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-green">
              <CheckIcon size={12} />
              {t.agreed} agreed
            </span>
            {t.challenged > 0 && (
              <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-amber">
                <FlagIcon size={11} />
                {t.challenged} flagged
              </span>
            )}
          </div>

          {challenges.length > 0 && (
            <div className="flex flex-col gap-2.5 border-t border-border-soft pt-3">
              {challenges.map(({ claim, response }) => (
                <div key={claim.id} className="flex flex-col gap-1.5">
                  <span className="font-mono text-[9.5px] tracking-[0.08em] text-faint uppercase">
                    {claim.label}
                  </span>
                  <span className="text-[12px] leading-[1.45] text-muted line-through">
                    {claim.text}
                  </span>
                  {response.suggestion && (
                    <span className="text-[12.5px] leading-[1.45] font-bold text-gray-900">
                      {response.suggestion}
                    </span>
                  )}
                  {response.note && (
                    <p className="m-0 text-[11.5px] leading-[1.5] text-muted italic">
                      “{response.note}”
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    {response.suggestion && (
                      <button
                        onClick={() => acceptSuggestion(claim.id)}
                        className="cursor-pointer rounded border border-blue-border bg-blue-bg px-2 py-1 font-sans text-[11px] font-bold text-blue transition-colors hover:bg-blue-bg-soft"
                      >
                        Use it
                      </button>
                    )}
                    <button
                      onClick={() => clearResponse(claim.id)}
                      className="cursor-pointer rounded border border-border bg-white px-2 py-1 font-sans text-[11px] font-bold text-muted transition-colors hover:bg-row-hover"
                    >
                      Dismiss
                    </button>
                    <span className="ml-auto font-mono text-[9.5px] text-faintest">
                      {shortAgo(response.at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
