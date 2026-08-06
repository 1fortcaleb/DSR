import { useEffect, useState } from "react";
import {
  addTeammate,
  listTeam,
  resetTeammatePassword,
  type Teammate,
} from "../../lib/team";
import { errText } from "../../lib/errors";
import { useAuth } from "../../context/AuthContext";
import { Button, Section, TextField } from "./Field";

/**
 * Adding colleagues, without anyone opening Supabase.
 *
 * The account is created already confirmed and the password is generated for
 * them, shown here exactly once. Handing over a credential in Slack isn't
 * elegant, but it beats an emailed invite that never arrives: Supabase's
 * built-in sender stops after a couple an hour, which is fewer than a team.
 */

function lastSeen(iso: string | null): string {
  if (!iso) return "Hasn't signed in yet";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (Number.isNaN(mins)) return "Hasn't signed in yet";
  if (mins < 60) return "Signed in just now";
  const hours = Math.round(mins / 60);
  if (hours < 24) return `Signed in ${hours}h ago`;
  return `Signed in ${Math.round(hours / 24)}d ago`;
}

/** The credential, plus the sentence a rep would have written around it. */
function Handover({ email, password }: { email: string; password: string }) {
  const [copied, setCopied] = useState(false);
  const message = [
    `You're set up on the 1Fort deal room: ${window.location.origin}`,
    `Email: ${email}`,
    `Password: ${password}`,
  ].join("\n");

  return (
    <div className="flex flex-col gap-3 rounded-[10px] border border-blue bg-blue-bg p-4">
      <div className="flex flex-col gap-1">
        <span className="text-[13px] font-bold text-navy">
          {email} can sign in now
        </span>
        <span className="text-[11.5px] leading-[1.5] text-muted">
          Send them this. The password isn't stored anywhere you can read it
          again — if this message is lost, reset it below and send a new one.
        </span>
      </div>
      <pre className="m-0 overflow-x-auto rounded-md border border-border bg-white px-3 py-2.5 font-mono text-[11.5px] leading-[1.6] whitespace-pre-wrap text-body">
        {message}
      </pre>
      <div>
        <Button
          variant="primary"
          onClick={() => {
            void navigator.clipboard.writeText(message).then(
              () => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              },
              // Clipboard access can be refused; the text is on screen regardless.
              () => setCopied(false),
            );
          }}
        >
          {copied ? "Copied" : "Copy message"}
        </Button>
      </div>
    </div>
  );
}

export function TeamEditor() {
  const { email: mine } = useAuth();
  const [team, setTeam] = useState<Teammate[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [handover, setHandover] = useState<{
    email: string;
    password: string;
  } | null>(null);

  const load = () =>
    listTeam()
      .then(setTeam)
      .catch((err) => setError(errText(err)))
      .finally(() => setLoading(false));

  useEffect(() => {
    void load();
    // Runs once: the list is small and reloaded after every change below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function add() {
    setBusy(true);
    setError(null);
    setHandover(null);
    try {
      const { user, password } = await addTeammate(email);
      setHandover({ email: user.email, password });
      setEmail("");
      await load();
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusy(false);
    }
  }

  async function reset(user: Teammate) {
    setBusy(true);
    setError(null);
    setHandover(null);
    try {
      setHandover({
        email: user.email,
        password: await resetTeammatePassword(user.id),
      });
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Section
        title="Add a teammate"
        hint="They can sign in straight away — no confirmation email involved."
      >
        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <TextField
              label="Work email"
              value={email}
              onChange={setEmail}
              placeholder="colleague@1fort.ai"
            />
          </div>
          <Button
            variant="primary"
            onClick={() => void add()}
            disabled={busy || !email.includes("@")}
          >
            {busy ? "Working…" : "Add teammate"}
          </Button>
        </div>

        {error && (
          <p className="m-0 rounded-md bg-red/10 px-3 py-2 text-[12px] leading-[1.5] text-red">
            {error}
          </p>
        )}

        {handover && (
          <Handover email={handover.email} password={handover.password} />
        )}
      </Section>

      <Section
        title="Who has access"
        hint="Everyone here can see and edit every room, including the notes on who'll resist a deal."
      >
        {loading ? (
          <p className="m-0 text-[12px] text-faint">Loading…</p>
        ) : !team.length ? (
          <p className="m-0 text-[12px] text-faint">Nobody yet.</p>
        ) : (
          <div className="flex flex-col">
            {team.map((u) => (
              <div
                key={u.id}
                className="flex items-center gap-3 border-b border-border-soft py-2.5 last:border-b-0"
              >
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[12.5px] font-bold text-gray-900">
                    {u.email}
                    {u.email === mine && (
                      <span className="ml-2 font-mono text-[9.5px] tracking-[0.08em] text-faint uppercase">
                        You
                      </span>
                    )}
                  </span>
                  <span className="text-[11px] text-faint">
                    {lastSeen(u.last_sign_in_at)}
                  </span>
                </div>
                <Button onClick={() => void reset(u)} disabled={busy}>
                  Reset password
                </Button>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
