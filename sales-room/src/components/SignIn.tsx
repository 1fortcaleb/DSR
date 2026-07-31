import { useState } from "react";
import { errText } from "../lib/errors";
import { useAuth } from "../context/AuthContext";
import wordmark from "../assets/wordmark-1fort-dark.png";

/** Gate on the rep side. Rooms hold prospect data, so it isn't left open. */
export function SignIn() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "in") await signIn(email, password);
      else setNotice(await signUp(email, password));
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusy(false);
    }
  }

  const field =
    "w-full box-border rounded-md border border-nav-line bg-nav-raised px-3 py-2.5 font-sans text-[13.5px] text-white outline-none transition-colors placeholder:text-nav-faint focus:border-periwinkle";

  return (
    <div className="flex min-h-screen items-center justify-center bg-nav px-6">
      <form onSubmit={submit} className="flex w-full max-w-[360px] flex-col gap-5">
        <img src={wordmark} alt="1Fort AI" className="h-[15px] w-auto self-start" />

        <div className="flex flex-col gap-1">
          <h1 className="m-0 text-[24px] leading-[1.2] font-bold tracking-[-0.02em] text-white">
            {mode === "in" ? "Sign in" : "Create an account"}
          </h1>
          <p className="m-0 text-[12.5px] leading-[1.5] text-nav-muted">
            {mode === "in"
              ? "Deal rooms and everything the counterparty sends back."
              : "1Fort email addresses only."}
          </p>
        </div>

        <div className="flex flex-col gap-2.5">
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@1fort.com"
            className={field}
          />
          <input
            type="password"
            required
            minLength={8}
            autoComplete={mode === "in" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className={field}
          />
        </div>

        {error && (
          <p className="m-0 rounded-md bg-red/15 px-3 py-2 text-[12px] leading-[1.5] text-red">
            {error}
          </p>
        )}
        {notice && (
          <p className="m-0 rounded-md bg-periwinkle/15 px-3 py-2 text-[12px] leading-[1.5] text-periwinkle">
            {notice}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="cursor-pointer rounded-md border-none bg-periwinkle px-4 py-2.5 font-sans text-[13px] font-bold text-nav transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Working…" : mode === "in" ? "Sign in" : "Create account"}
        </button>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "in" ? "up" : "in");
            setError(null);
            setNotice(null);
          }}
          className="cursor-pointer border-none bg-transparent p-0 text-left font-sans text-[12px] text-nav-faint transition-colors hover:text-white"
        >
          {mode === "in" ? "Create an account" : "I already have an account"}
        </button>
      </form>
    </div>
  );
}
