import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";
import { useRooms } from "../context/RoomsContext";
import type { Audience } from "../types";
import { CheckIcon, FlagIcon, XIcon } from "./icons";

interface ClaimProps {
  /** Stable id from lib/claims. */
  claimId: string;
  /** Human name for the claim, used in the reply UI. */
  label: string;
  /** Current text, prefilled when the counterparty proposes a correction. */
  text: string;
  audience: Audience;
  /** Element to render, so the wrapper can take the slot the original div had. */
  as?: ElementType;
  className?: string;
  children: ReactNode;
}

/**
 * Wraps one assertion so the counterparty can agree with it, push back, or
 * propose different wording.
 *
 * The hover and state cues are painted with background + spread shadow rather
 * than padding or borders, so nothing on the page moves when a claim is
 * highlighted, hovered, or answered.
 */
export function Claim({
  claimId,
  label,
  text,
  audience,
  as: As = "div",
  className = "",
  children,
}: ClaimProps) {
  const { activeRoom, respondToClaim, clearResponse, acceptSuggestion } = useRooms();
  const response = activeRoom.responses?.[claimId];
  const isBuyer = audience === "buyer";

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"choose" | "correct">("choose");
  const [draft, setDraft] = useState(text);
  const [note, setNote] = useState("");
  const rootRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function begin() {
    setDraft(response?.suggestion ?? text);
    setNote(response?.note ?? "");
    setMode("choose");
    setOpen(true);
  }

  function send(verdict: "agreed" | "challenged") {
    respondToClaim(
      claimId,
      verdict === "agreed"
        ? { verdict }
        : { verdict, suggestion: draft !== text ? draft : undefined, note },
    );
    setOpen(false);
  }

  const agreed = response?.verdict === "agreed";
  const challenged = response?.verdict === "challenged";
  const hasSuggestion = challenged && !!response?.suggestion;

  // Answered claims keep a permanent wash; unanswered ones only light up under
  // the counterparty's cursor.
  const wash = agreed
    ? "bg-green-bg shadow-[0_0_0_5px_var(--color-green-bg)]"
    : challenged
      ? "bg-amber-bg shadow-[0_0_0_5px_var(--color-amber-bg)]"
      : isBuyer
        ? "hover:bg-blue-bg hover:shadow-[0_0_0_5px_var(--color-blue-bg)]"
        : "";

  return (
    <As
      ref={rootRef as never}
      className={`relative rounded-[2px] transition-colors ${wash} ${className}`}
    >
      {children}

      {/* Full-cover hit area. Buyer-only: in rep mode this would sit on top of
          the inline editors and swallow their clicks. */}
      {isBuyer && (
        <button
          onClick={begin}
          aria-label={
            response
              ? `Change your response to ${label}`
              : `Agree or push back on ${label}`
          }
          className="absolute inset-0 cursor-pointer rounded-[2px] border-none bg-transparent"
        />
      )}

      {(agreed || challenged) && (
        <button
          onClick={() => (isBuyer ? begin() : setOpen((o) => !o))}
          title={
            agreed
              ? `${response?.by} agreed`
              : `${response?.by} pushed back${hasSuggestion ? " and suggested a change" : ""}`
          }
          className={`absolute -top-2.5 -right-2.5 z-20 inline-flex h-[18px] w-[18px] cursor-pointer items-center justify-center rounded-full border-none text-white ${
            agreed ? "bg-green" : "bg-amber"
          }`}
        >
          {agreed ? <CheckIcon size={11} /> : <FlagIcon size={10} />}
        </button>
      )}

      {open && (
        <div
          className="absolute top-full right-0 z-30 mt-3 flex w-[320px] cursor-default flex-col gap-2.5 rounded-lg border border-border bg-white p-3.5 text-left shadow-[0_12px_32px_-12px_rgba(0,1,46,0.3)]"
          // The card sits inside the claim, which the overlay button covers.
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-2">
            <span className="font-mono text-[9.5px] tracking-[0.1em] text-faint uppercase">
              {label}
            </span>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="-mt-0.5 flex-none cursor-pointer border-none bg-transparent p-0 text-faint hover:text-body"
            >
              <XIcon size={11} />
            </button>
          </div>

          {isBuyer ? (
            mode === "choose" ? (
              <>
                <p className="m-0 text-[12.5px] leading-[1.5] text-body">
                  Does this match what you see?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => send("agreed")}
                    className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-green/30 bg-green-bg px-3 py-2 font-sans text-[12px] font-bold text-green transition-colors hover:border-green"
                  >
                    <CheckIcon size={12} />
                    That's right
                  </button>
                  <button
                    onClick={() => setMode("correct")}
                    className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-amber/30 bg-amber-bg px-3 py-2 font-sans text-[12px] font-bold text-amber transition-colors hover:border-amber"
                  >
                    <FlagIcon size={11} />
                    Not quite
                  </button>
                </div>
                {response && (
                  <button
                    onClick={() => {
                      clearResponse(claimId);
                      setOpen(false);
                    }}
                    className="cursor-pointer border-none bg-transparent p-0 text-left font-sans text-[11px] text-faint hover:text-red"
                  >
                    Withdraw my response
                  </button>
                )}
              </>
            ) : (
              <>
                <label className="flex flex-col gap-1">
                  <span className="font-mono text-[9.5px] tracking-[0.1em] text-faint uppercase">
                    What should it say?
                  </span>
                  <textarea
                    autoFocus
                    value={draft}
                    rows={2}
                    onChange={(e) => setDraft(e.target.value)}
                    className="w-full resize-y rounded-md border border-border bg-white px-2.5 py-2 text-[12.5px] leading-[1.5] text-body outline-none focus:border-blue focus:ring-2 focus:ring-blue-bg"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="font-mono text-[9.5px] tracking-[0.1em] text-faint uppercase">
                    Why (optional)
                  </span>
                  <textarea
                    value={note}
                    rows={2}
                    placeholder="Where the real number comes from…"
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full resize-y rounded-md border border-border bg-white px-2.5 py-2 text-[12.5px] leading-[1.5] text-body outline-none placeholder:text-faintest focus:border-blue focus:ring-2 focus:ring-blue-bg"
                  />
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => send("challenged")}
                    className="flex-1 cursor-pointer rounded-md border-none bg-blue px-3 py-2 font-sans text-[12px] font-bold text-white transition-colors hover:bg-blue-hover"
                  >
                    Send to {activeRoom.account.owner.name.split(" ")[0] || "the team"}
                  </button>
                  <button
                    onClick={() => setMode("choose")}
                    className="cursor-pointer rounded-md border border-border bg-white px-3 py-2 font-sans text-[12px] font-bold text-gray-800 transition-colors hover:bg-row-hover"
                  >
                    Back
                  </button>
                </div>
              </>
            )
          ) : (
            /* Rep side: read the pushback and decide whether to take it. */
            <>
              <p className="m-0 text-[12.5px] leading-[1.5] text-body">
                <strong className="font-bold text-gray-900">{response?.by}</strong>{" "}
                {agreed ? "agreed with this." : "pushed back on this."}
              </p>
              {response?.note && (
                <p className="m-0 rounded-md bg-row-hover p-2.5 text-[12px] leading-[1.55] text-muted">
                  “{response.note}”
                </p>
              )}
              {hasSuggestion && (
                <div className="flex flex-col gap-1.5">
                  <span className="font-mono text-[9.5px] tracking-[0.1em] text-faint uppercase">
                    They suggest
                  </span>
                  <p className="m-0 rounded-md border border-amber/25 bg-amber-bg p-2.5 text-[12.5px] leading-[1.5] text-gray-900">
                    {response?.suggestion}
                  </p>
                  <div className="mt-0.5 flex gap-2">
                    <button
                      onClick={() => {
                        acceptSuggestion(claimId);
                        setOpen(false);
                      }}
                      className="flex-1 cursor-pointer rounded-md border-none bg-blue px-3 py-2 font-sans text-[12px] font-bold text-white transition-colors hover:bg-blue-hover"
                    >
                      Use their wording
                    </button>
                    <button
                      onClick={() => {
                        clearResponse(claimId);
                        setOpen(false);
                      }}
                      className="cursor-pointer rounded-md border border-border bg-white px-3 py-2 font-sans text-[12px] font-bold text-gray-800 transition-colors hover:bg-row-hover"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
              {!hasSuggestion && (
                <button
                  onClick={() => {
                    clearResponse(claimId);
                    setOpen(false);
                  }}
                  className="cursor-pointer rounded-md border border-border bg-white px-3 py-2 font-sans text-[12px] font-bold text-gray-800 transition-colors hover:bg-row-hover"
                >
                  Clear this response
                </button>
              )}
            </>
          )}
        </div>
      )}
    </As>
  );
}
