import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { useRooms } from "../context/RoomsContext";
import { firstName } from "../lib/vocabulary";
import { FlagIcon, XIcon } from "./icons";

interface Anchor {
  quote: string;
  /** Viewport coordinates of the selection, for a fixed-position chip. */
  x: number;
  y: number;
}

/**
 * Lets the counterparty point at one specific line without the page carrying a
 * control for every line. They highlight text the way they would in any
 * document; a chip appears only then.
 */
export function SelectionFlagger({ containerRef }: { containerRef: RefObject<HTMLElement | null> }) {
  const { activeRoom, flagPassage } = useRooms();
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [note, setNote] = useState("");
  const [writing, setWriting] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const owner = firstName(activeRoom.account.owner.name) || "your contact";

  const readSelection = useCallback(() => {
    // While the note is open the selection is gone (focus moved to the
    // textarea), so the captured anchor has to survive.
    if (writing) return;
    const sel = window.getSelection();
    const text = sel?.toString().trim() ?? "";
    if (!sel || sel.isCollapsed || text.length < 3) {
      setAnchor(null);
      return;
    }
    const node = sel.anchorNode;
    if (!node || !containerRef.current?.contains(node)) {
      setAnchor(null);
      return;
    }
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    setAnchor({ quote: text, x: rect.left + rect.width / 2, y: rect.top });
  }, [containerRef, writing]);

  useEffect(() => {
    document.addEventListener("selectionchange", readSelection);
    return () => document.removeEventListener("selectionchange", readSelection);
  }, [readSelection]);

  useEffect(() => {
    if (!writing) return;
    function onDown(e: MouseEvent) {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) close();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  });

  function close() {
    setWriting(false);
    setAnchor(null);
    setNote("");
  }

  function send() {
    if (!anchor || !note.trim()) return;
    flagPassage(anchor.quote, note);
    window.getSelection()?.removeAllRanges();
    close();
  }

  if (!anchor) return null;

  // Kept inside the viewport horizontally; the chip sits just above the selection.
  const left = Math.min(Math.max(anchor.x, 190), window.innerWidth - 190);

  return (
    <div
      ref={cardRef}
      style={{ left, top: anchor.y - 12 }}
      className="fixed z-50 -translate-x-1/2 -translate-y-full"
      // Keeps the browser selection alive when the chip is clicked.
      onMouseDown={(e) => !writing && e.preventDefault()}
    >
      {writing ? (
        <div className="flex w-[340px] flex-col gap-2.5 rounded-lg bg-nav p-3.5 shadow-[0_16px_40px_-12px_rgba(0,1,46,0.5)]">
          <div className="flex items-start justify-between gap-2">
            <span className="font-mono text-[9.5px] tracking-[0.12em] text-periwinkle uppercase">
              What's wrong with this?
            </span>
            <button
              onClick={close}
              aria-label="Cancel"
              className="-mt-0.5 flex-none cursor-pointer border-none bg-transparent p-0 text-nav-faint hover:text-white"
            >
              <XIcon size={11} />
            </button>
          </div>
          <p className="m-0 line-clamp-2 border-l-2 border-nav-line pl-2.5 text-[12px] leading-[1.5] text-nav-muted italic">
            “{anchor.quote}”
          </p>
          <textarea
            autoFocus
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send();
            }}
            placeholder="Closer to $2.6M…"
            className="w-full resize-y rounded-md border border-nav-line bg-nav-raised px-2.5 py-2 font-sans text-[12.5px] leading-[1.5] text-white outline-none placeholder:text-nav-faint focus:border-periwinkle"
          />
          <button
            onClick={send}
            disabled={!note.trim()}
            className="cursor-pointer rounded-md border-none bg-periwinkle px-3 py-2 font-sans text-[12px] font-bold text-nav transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Send to {owner}
          </button>
        </div>
      ) : (
        <button
          onClick={() => setWriting(true)}
          className="flex cursor-pointer items-center gap-1.5 rounded-full border-none bg-nav px-3.5 py-2 font-sans text-[12px] font-bold text-white shadow-[0_8px_24px_-8px_rgba(0,1,46,0.5)] transition-colors hover:bg-nav-raised"
        >
          <FlagIcon size={11} className="text-amber" />
          This isn't right
        </button>
      )}
    </div>
  );
}
