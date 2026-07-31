import { useEffect, useRef, useState } from "react";
import { createShareLink, fetchShareLinks, shareUrl, type ShareLink } from "../lib/api";
import { isCloud } from "../lib/supabase";
import { useRooms } from "../context/RoomsContext";
import { firstName } from "../lib/vocabulary";
import { CheckIcon, XIcon } from "./icons";

/**
 * Sending, from inside the room. A rep should never have to go to a settings
 * screen to do the main thing the product is for.
 */
export function ShareButton() {
  const { activeRoom, setRoomStatus, vocabulary } = useRooms();
  const { account } = activeRoom;

  const [open, setOpen] = useState(false);
  const [name, setName] = useState(account.counterparty.name);
  const [email, setEmail] = useState("");
  const [link, setLink] = useState<ShareLink | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);

  // Reuse a live link for this room rather than minting a second one for the
  // same person every time the rep opens the panel.
  useEffect(() => {
    if (!open || !isCloud || link) return;
    void fetchShareLinks(activeRoom.id)
      .then((all) => {
        const live = all.find((l) => !l.revokedAt && (!l.expiresAt || new Date(l.expiresAt) > new Date()));
        if (live) setLink(live);
      })
      .catch(() => undefined);
  }, [open, activeRoom.id, link]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      if (activeRoom.status !== "live") setRoomStatus(activeRoom.id, "live");
      const made = await createShareLink(activeRoom.id, name, email, 30);
      setLink(made);
      await navigator.clipboard?.writeText(shareUrl(made.token)).catch(() => undefined);
      setCopied(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't create the link.");
    } finally {
      setBusy(false);
    }
  }

  const url = link ? shareUrl(link.token) : "";
  const who = firstName(name) || "there";
  const mailto =
    `mailto:${encodeURIComponent(email)}` +
    `?subject=${encodeURIComponent(`${account.company} — the one-pager`)}` +
    `&body=${encodeURIComponent(
      `Hi ${who},\n\nHere's the one-pager: ${url}\n\n` +
        `There's an Agree / Not quite button on it — one click and it comes straight back to me.\n\n` +
        `${account.owner.name}`,
    )}`;

  const field =
    "w-full box-border rounded-md border border-border bg-white px-2.5 py-2 text-[12.5px] text-body outline-none focus:border-blue focus:ring-2 focus:ring-blue-bg";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full cursor-pointer rounded-[5px] border-none bg-blue px-3.5 py-3 font-sans text-[13px] font-bold text-white transition-all hover:bg-blue-hover active:translate-y-px"
      >
        Send to {firstName(account.counterparty.name) || vocabulary.counterpartyLower}
      </button>

      {open && (
        <div className="absolute right-0 bottom-full z-40 mb-2 flex w-[320px] flex-col gap-2.5 rounded-lg border border-border bg-white p-3.5 shadow-[0_16px_40px_-12px_rgba(0,1,46,0.28)]">
          <div className="flex items-start justify-between gap-2">
            <span className="font-mono text-[9.5px] tracking-[0.1em] text-faint uppercase">
              Send this room
            </span>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="-mt-0.5 cursor-pointer border-none bg-transparent p-0 text-faint hover:text-body"
            >
              <XIcon size={11} />
            </button>
          </div>

          {!isCloud ? (
            <p className="m-0 rounded-md bg-row-hover p-2.5 text-[11.5px] leading-[1.55] text-muted">
              This build runs on browser storage, so there's no link to give anyone. Connect the
              backend once and this button starts working for everyone.
            </p>
          ) : link ? (
            <>
              <p className="m-0 flex items-center gap-1.5 text-[12.5px] font-bold text-green">
                <CheckIcon size={12} />
                {copied ? "Link copied" : "Link ready"}
              </p>
              <code className="truncate rounded-md bg-row-hover px-2.5 py-2 font-mono text-[10.5px] text-body">
                {url}
              </code>
              <div className="flex gap-2">
                <a
                  href={mailto}
                  className="flex-1 cursor-pointer rounded-md border-none bg-blue px-3 py-2 text-center font-sans text-[12px] font-bold text-white no-underline transition-colors hover:bg-blue-hover"
                >
                  Open in email
                </a>
                <button
                  onClick={() => {
                    void navigator.clipboard?.writeText(url);
                    setCopied(true);
                  }}
                  className="cursor-pointer rounded-md border border-border bg-white px-3 py-2 font-sans text-[12px] font-bold text-gray-800 transition-colors hover:bg-row-hover"
                >
                  Copy
                </button>
              </div>
              <p className="m-0 text-[10.5px] leading-[1.45] text-faint">
                Expires in 30 days. Manage or revoke it under Manage content → Send.
              </p>
            </>
          ) : (
            <>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Recipient name"
                className={field}
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="their@email.com"
                className={field}
              />
              <button
                onClick={() => void create()}
                disabled={busy}
                className="cursor-pointer rounded-md border-none bg-blue px-3 py-2 font-sans text-[12px] font-bold text-white transition-colors hover:bg-blue-hover disabled:opacity-50"
              >
                {busy ? "Creating…" : "Create link"}
              </button>
              <p className="m-0 text-[10.5px] leading-[1.45] text-faint">
                Publishes the room if it isn't already, so the link opens.
              </p>
            </>
          )}

          {error && <p className="m-0 text-[11.5px] text-red">{error}</p>}
        </div>
      )}
    </div>
  );
}
