import { useState } from "react";
import { useRooms } from "../context/RoomsContext";
import { shortAgo } from "../lib/vocabulary";
import type { FlaggedPassage } from "../types";

/**
 * One mark and the conversation under it.
 *
 * Shown to both sides, and both can reply — a redline that only one party can
 * answer is a suggestion box. What differs is authority: the page belongs to
 * the rep, so only the rep can accept a change into it.
 */
export function RedlineThread({
  mark,
  canDecide,
}: {
  mark: FlaggedPassage;
  /** True on the rep's side. Accepting rewrites the page, so it is their call. */
  canDecide: boolean;
}) {
  const { replyToRedline, acceptRedline, rejectRedline } = useRooms();
  const [reply, setReply] = useState("");
  const settled = mark.status !== "open";

  const send = () => {
    if (!reply.trim()) return;
    replyToRedline(mark.id, reply, canDecide ? "us" : "them");
    setReply("");
  };

  return (
    <div
      id={`redline-${mark.id}`}
      className={`flex flex-col gap-2.5 rounded-[10px] border p-3.5 transition-colors ${
        settled ? "border-border-soft bg-panel" : "border-border bg-white"
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-[9.5px] tracking-[0.1em] text-faint uppercase">
          {mark.side === "us" ? "You proposed" : `${mark.by} proposed`}
        </span>
        <span className="flex-none font-mono text-[9.5px] text-faintest">
          {mark.status === "accepted"
            ? "Accepted"
            : mark.status === "rejected"
              ? "Declined"
              : shortAgo(mark.at)}
        </span>
      </div>

      {/* The change itself, read as a swap rather than as two paragraphs. */}
      <p className="m-0 text-[12.5px] leading-[1.5]">
        <span className="text-faint line-through decoration-red/60">
          {mark.quote}
        </span>
        {mark.proposed && (
          <>
            {" "}
            <span className="font-bold text-green">{mark.proposed}</span>
          </>
        )}
      </p>

      {mark.note && (
        <p className="m-0 border-l-2 border-border pl-2.5 text-[11.5px] leading-[1.5] text-muted">
          {mark.note}
        </p>
      )}

      {mark.replies.map((r) => (
        <div
          key={r.id}
          className="flex flex-col gap-0.5 border-l-2 border-blue/30 pl-2.5"
        >
          <span className="font-mono text-[9px] tracking-[0.08em] text-faint uppercase">
            {r.side === "us" ? "You" : r.by}
          </span>
          <p className="m-0 text-[11.5px] leading-[1.5] text-body">{r.text}</p>
        </div>
      ))}

      {!settled && (
        <div className="flex items-center gap-1.5">
          <input
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
            }}
            placeholder="Reply"
            className="min-w-0 flex-1 rounded-md border border-border bg-white px-2.5 py-1.5 font-sans text-[11.5px] text-body outline-none placeholder:text-faintest focus:border-blue"
          />
          {canDecide && (
            <>
              <button
                onClick={() => acceptRedline(mark.id)}
                title={
                  mark.proposed
                    ? "Rewrite the page with their wording"
                    : "Close this — nothing to rewrite"
                }
                className="flex-none cursor-pointer rounded-md border-none bg-green px-2.5 py-1.5 font-sans text-[11.5px] font-bold text-white transition-opacity hover:opacity-90"
              >
                Accept
              </button>
              <button
                onClick={() => rejectRedline(mark.id)}
                className="flex-none cursor-pointer rounded-md border border-border bg-white px-2.5 py-1.5 font-sans text-[11.5px] font-bold text-muted transition-colors hover:border-red hover:text-red"
              >
                Decline
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
