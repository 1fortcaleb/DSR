import { useCallback, useEffect, useState } from "react";
import {
  createShareLink,
  fetchShareLinks,
  revokeShareLink,
  shareUrl,
  type ShareLink,
} from "../../lib/api";
import { isCloud } from "../../lib/supabase";
import { errText } from "../../lib/errors";
import { useRooms } from "../../context/RoomsContext";
import { agoPhrase } from "../../lib/vocabulary";
import { Button, Section, SelectField, TextField } from "./Field";

type Expiry = "14" | "30" | "90" | "never";

function statusOf(link: ShareLink): { label: string; tone: string } {
  if (link.revokedAt) return { label: "Revoked", tone: "text-red" };
  if (link.expiresAt && new Date(link.expiresAt) < new Date())
    return { label: "Expired", tone: "text-faint" };
  if (link.openCount > 0)
    return { label: `Opened ${link.openCount}×`, tone: "text-green" };
  return { label: "Not opened yet", tone: "text-muted" };
}

/** Creating, watching and killing the links a room is sent out on. */
export function ShareEditor() {
  const { activeRoom, setRoomStatus, vocabulary } = useRooms();
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const [name, setName] = useState(activeRoom.account.counterparty.name);
  const [email, setEmail] = useState("");
  const [expiry, setExpiry] = useState<Expiry>("30");

  const load = useCallback(() => {
    if (!isCloud) {
      setLoading(false);
      return;
    }
    fetchShareLinks(activeRoom.id)
      .then(setLinks)
      .catch((e: unknown) => setError(errText(e)))
      .finally(() => setLoading(false));
  }, [activeRoom.id]);

  useEffect(() => {
    setLoading(true);
    setLinks([]);
    load();
  }, [load]);

  if (!isCloud) {
    return (
      <Section title="Send to the counterparty" hint="Share links need the backend.">
        <div className="flex items-start gap-2 rounded-md border border-border-soft bg-row-hover px-3 py-2.5">
          <span className="mt-px flex-none font-mono text-[9px] tracking-[0.08em] text-faint uppercase">
            Off
          </span>
          <p className="m-0 text-[11.5px] leading-[1.55] text-muted">
            This build is running against browser storage, so there's nothing for a recipient to
            open. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, run supabase/schema.sql, and
            this becomes a real link.
          </p>
        </div>
      </Section>
    );
  }

  async function create() {
    setError(null);
    try {
      const link = await createShareLink(
        activeRoom.id,
        name,
        email,
        expiry === "never" ? null : Number(expiry),
      );
      setLinks((prev) => [link, ...prev]);
      setEmail("");
      await navigator.clipboard?.writeText(shareUrl(link.token)).catch(() => undefined);
      setCopied(link.token);
    } catch (e) {
      setError(errText(e));
    }
  }

  async function copy(token: string) {
    await navigator.clipboard?.writeText(shareUrl(token)).catch(() => undefined);
    setCopied(token);
  }

  const live = activeRoom.status === "live";

  return (
    <div className="flex flex-col gap-5">
      {!live && (
        <div className="flex items-center gap-3 rounded-[10px] border border-amber/30 bg-amber-bg px-4 py-3">
          <p className="m-0 flex-1 text-[12.5px] leading-[1.5] text-body">
            This room is <strong className="font-bold">{activeRoom.status}</strong>. Links won't
            open until it's live — recipients see “this link isn't active”.
          </p>
          <Button variant="primary" onClick={() => setRoomStatus(activeRoom.id, "live")}>
            Publish it
          </Button>
        </div>
      )}

      <Section
        title="Send to the counterparty"
        hint={`One link per person, so you know who answered and can cut off one recipient without breaking anyone else's.`}
      >
        <div className="grid grid-cols-[1fr_1fr_140px] items-end gap-2.5">
          <TextField label="Recipient name" value={name} onChange={setName} placeholder="Dana Whitfield" />
          <TextField
            label="Email (for your records)"
            value={email}
            onChange={setEmail}
            placeholder="dana@meridian.com"
          />
          <SelectField<Expiry>
            label="Expires"
            value={expiry}
            options={[
              { value: "14", label: "In 14 days" },
              { value: "30", label: "In 30 days" },
              { value: "90", label: "In 90 days" },
              { value: "never", label: "Never" },
            ]}
            onChange={setExpiry}
          />
        </div>
        <div>
          <Button variant="primary" onClick={() => void create()}>
            Create link &amp; copy
          </Button>
        </div>
        {error && (
          <p className="m-0 rounded-md bg-red/10 px-2.5 py-2 text-[11.5px] text-red">{error}</p>
        )}
      </Section>

      <Section title="Links" hint={`Everyone this ${vocabulary.roomNoun.toLowerCase()} has been sent to.`}>
        {loading ? (
          <p className="m-0 text-[12.5px] text-muted">Loading…</p>
        ) : links.length === 0 ? (
          <p className="m-0 text-[12.5px] text-muted">No links yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {links.map((link) => {
              const s = statusOf(link);
              const dead = !!link.revokedAt;
              return (
                <div
                  key={link.token}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-md border border-border-soft bg-row-hover px-3 py-2.5"
                >
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex items-baseline gap-2">
                      <span className="truncate text-[12.5px] font-bold text-gray-900">
                        {link.recipientName || "Unnamed recipient"}
                      </span>
                      {link.recipientEmail && (
                        <span className="truncate text-[11px] text-faint">
                          {link.recipientEmail}
                        </span>
                      )}
                    </div>
                    <code
                      className={`truncate font-mono text-[10.5px] ${dead ? "text-faintest line-through" : "text-muted"}`}
                    >
                      {shareUrl(link.token)}
                    </code>
                    <span className={`font-mono text-[9.5px] tracking-[0.06em] uppercase ${s.tone}`}>
                      {s.label}
                      {link.lastOpenedAt && ` · last ${agoPhrase(link.lastOpenedAt)}`}
                    </span>
                  </div>
                  <div className="flex flex-none gap-1.5">
                    {!dead && (
                      <>
                        <Button onClick={() => void copy(link.token)}>
                          {copied === link.token ? "Copied" : "Copy"}
                        </Button>
                        <Button
                          variant="danger"
                          onClick={() => {
                            void revokeShareLink(link.token).then(load);
                          }}
                          title="The link stops working immediately"
                        >
                          Revoke
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}
