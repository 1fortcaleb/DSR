import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { errText } from "../lib/errors";
import {
  addSharedFlag,
  replyToSharedFlag,
  fetchSharedRoom,
  submitSharedFeedback,
  withdrawSharedFeedback,
  type SharedRoomPayload,
} from "../lib/api";
import { RoomsContext, type RoomsContextValue } from "../context/RoomsContext";
import {
  AssetsContext,
  type AssetsContextValue,
} from "../context/AssetsContext";
import { isCloud } from "../lib/supabase";
import { vocabularyFor } from "../lib/vocabulary";
import type { Asset, AssetKind, FlaggedPassage, Room, Verdict } from "../types";
import { CaseView } from "./CaseView";
import { FilesView } from "./FilesView";
import { VideosView } from "./VideosView";
import wordmark from "../assets/wordmark-1fort-dark.png";

type SharedTab = "case" | "files" | "videos";

/**
 * What the counterparty gets when they open a share link. No account, no rep
 * chrome, no other rooms — just the page and the reply.
 *
 * It supplies the rooms context from the share payload instead of local state,
 * so the business case renders through exactly the same components the rep
 * previews. Writes go to the token-scoped RPCs rather than to storage.
 */
export function SharedRoom({ token }: { token: string }) {
  const [payload, setPayload] = useState<SharedRoomPayload | null>(null);
  const [state, setState] = useState<
    "loading" | "ready" | "gone" | "error" | "unconfigured"
  >("loading");
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<SharedTab>("case");
  const loaded = useRef(false);

  useEffect(() => {
    if (!isCloud) {
      setState("unconfigured");
      return;
    }
    // StrictMode double-invokes effects; opening the link twice would double
    // the recorded open count.
    if (loaded.current) return;
    loaded.current = true;
    fetchSharedRoom(token)
      .then((data) => {
        if (!data) {
          setState("gone");
          return;
        }
        setPayload(data);
        setState("ready");
      })
      .catch((err: unknown) => {
        setError(errText(err));
        setState("error");
      });
  }, [token]);

  /* Local echo of the payload, so the page responds instantly and the network
     call settles behind it. */
  const submitFeedback = useCallback(
    (verdict: Verdict, message?: string) => {
      setPayload((p) =>
        p
          ? {
              ...p,
              feedback: {
                verdict,
                message: message?.trim() || undefined,
                at: new Date().toISOString(),
                by: p.recipientName || "You",
              },
            }
          : p,
      );
      void submitSharedFeedback(token, verdict, message).catch((err: unknown) =>
        setError(errText(err)),
      );
    },
    [token],
  );

  const withdrawFeedback = useCallback(() => {
    setPayload((p) => (p ? { ...p, feedback: null } : p));
    void withdrawSharedFeedback(token).catch(() => undefined);
  }, [token]);

  const flagPassage = useCallback(
    (quote: string, note: string, proposed?: string | null, context = "") => {
      void addSharedFlag(token, quote, note, proposed ?? null, context)
        .then((flag: FlaggedPassage) =>
          setPayload((p) => (p ? { ...p, flags: [...p.flags, flag] } : p)),
        )
        .catch((err: unknown) => setError(errText(err)));
    },
    [token],
  );

  /** Their side of a thread. Optimistic, so the reply appears as they send it. */
  const replyToRedline = useCallback(
    (id: string, text: string) => {
      void replyToSharedFlag(token, id, text)
        .then((reply) =>
          setPayload((p) =>
            p
              ? {
                  ...p,
                  flags: p.flags.map((f) =>
                    f.id === id ? { ...f, replies: [...f.replies, reply] } : f,
                  ),
                }
              : p,
          ),
        )
        .catch((err: unknown) => setError(errText(err)));
    },
    [token],
  );

  const value: RoomsContextValue | null = useMemo(() => {
    if (!payload) return null;
    const room: Room = {
      id: payload.roomId,
      kind: payload.kind,
      mode: payload.mode ?? "specific",
      status: "live",
      // The internal name never leaves the server; the company stands in.
      name: payload.account.company,
      account: payload.account,
      content: payload.content,
      sources: [],
      documents: payload.documents,
      videos: payload.videos,
      library: [],
      curatedVideoIds: payload.curatedVideoIds,
      feedback: payload.feedback,
      flags: payload.flags,
      engagement: [],
      lastViewedAt: null,
      updatedAt: new Date().toISOString(),
    };
    const noop = () => undefined;
    return {
      rooms: [room],
      activeRoom: room,
      activeRoomId: room.id,
      vocabulary: vocabularyFor(room.kind),
      // Everything below belongs to the rep's side of the app and is
      // unreachable here: this view renders read-only and never mounts the
      // editors that would call them.
      setActiveRoomId: noop,
      updateRoom: noop,
      setRoomStatus: noop,
      createRoom: () => room.id,
      spinOffRoom: () => room.id,
      duplicateRoom: () => room.id,
      deleteRoom: noop,
      setField: noop,
      setListItem: noop,
      toggleSource: noop,
      renameSource: noop,
      submitFeedback,
      withdrawFeedback,
      flagPassage,
      // The counterparty proposes and replies; accepting is the rep's call,
      // and marking as "us" from this side would forge the other party.
      markPassage: noop,
      replyToRedline,
      acceptRedline: noop,
      rejectRedline: noop,
      resolveFlag: noop,
      removeFlag: noop,
      status: "idle",
      error: null,
      isLive: false,
      regenerate: noop,
      lastGeneration: null,
      dismissError: noop,
      resetAll: noop,
    };
  }, [payload, submitFeedback, withdrawFeedback, flagPassage, replyToRedline]);

  /* The counterparty's asset context: read-only, and only the assets their own
     room references. Every one already carries a hosted URL, so nothing here
     ever touches IndexedDB or the rep-side library. */
  const assetsValue: AssetsContextValue = useMemo(() => {
    const assets: Asset[] = (payload?.assets ?? []).map((a) => ({
      id: a.id,
      name: a.name,
      kind: a.kind as AssetKind,
      mimeType: "",
      sizeBytes: 0,
      thumbnail: a.thumbnail,
      url: a.url,
      origin: "uploaded",
      createdAt: "",
    }));
    const byId = new Map(assets.map((a) => [a.id, a]));
    const denied = async () => {
      throw new Error("Read-only.");
    };
    return {
      assets,
      byId,
      loading: false,
      uploading: 0,
      error: null,
      generationLive: false,
      upload: denied,
      addFile: denied,
      remove: denied,
      rename: denied,
      generate: denied,
      openUrl: async (id: string) => byId.get(id)?.url ?? null,
      clearAll: denied,
      dismissError: () => undefined,
    };
  }, [payload?.assets]);

  if (state === "loading") {
    return (
      <Shell>
        <p className="m-0 text-[13px] text-muted">Opening…</p>
      </Shell>
    );
  }

  if (state === "unconfigured") {
    return (
      <Shell>
        <h1 className="m-0 text-[22px] font-bold tracking-[-0.02em] text-navy">
          No backend configured.
        </h1>
        <p className="m-0 max-w-[34em] text-[13.5px] leading-[1.6] text-muted">
          This build runs against browser storage, so share links resolve to
          nothing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY and run
          supabase/schema.sql.
        </p>
      </Shell>
    );
  }

  if (state === "gone") {
    return (
      <Shell>
        <h1 className="m-0 text-[22px] font-bold tracking-[-0.02em] text-navy">
          This link isn't active.
        </h1>
        <p className="m-0 max-w-[34em] text-[13.5px] leading-[1.6] text-muted">
          It may have expired, been replaced, or the room isn't published yet.
          Ask your contact at 1Fort for a fresh link.
        </p>
      </Shell>
    );
  }

  if (state === "error" || !value) {
    return (
      <Shell>
        <h1 className="m-0 text-[22px] font-bold tracking-[-0.02em] text-navy">
          Something went wrong.
        </h1>
        <p className="m-0 max-w-[34em] text-[13.5px] leading-[1.6] text-muted">
          {error}
        </p>
      </Shell>
    );
  }

  // Tabs only appear for content that exists. A room sent as a bare one-pager
  // shouldn't grow empty sections to click on.
  const docCount = value.activeRoom.documents.length;
  const videoCount = value.activeRoom.curatedVideoIds.length;
  const tabs: { id: SharedTab; label: string; count?: number }[] = [
    { id: "case", label: "Business case" },
    ...(docCount
      ? [{ id: "files" as const, label: "Documents", count: docCount }]
      : []),
    ...(videoCount
      ? [{ id: "videos" as const, label: "Video answers", count: videoCount }]
      : []),
  ];
  const active: SharedTab = tabs.some((t) => t.id === tab) ? tab : "case";

  return (
    <RoomsContext.Provider value={value}>
      <AssetsContext.Provider value={assetsValue}>
        <div className="min-h-screen bg-panel">
          <header className="flex items-center gap-3 bg-nav px-8 py-3.5">
            <img src={wordmark} alt="1Fort AI" className="h-[13px] w-auto" />
            <span className="border-l border-nav-line pl-3 font-mono text-[10px] tracking-[0.1em] text-nav-faint uppercase">
              {value.vocabulary.roomNoun}
            </span>
            <span className="ml-auto text-[12.5px] text-nav-body">
              {payload?.account.company}
            </span>
          </header>

          {tabs.length > 1 && (
            <nav className="flex items-center gap-1 border-b border-border bg-white px-8">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`cursor-pointer border-none border-b-2 bg-transparent px-3 py-3.5 font-sans text-[12.5px] font-bold transition-colors ${
                    active === t.id
                      ? "border-b-blue text-navy"
                      : "border-b-transparent text-muted hover:text-navy"
                  }`}
                >
                  {t.label}
                  {t.count !== undefined && (
                    <span className="ml-1.5 font-mono text-[10.5px] font-normal text-faint">
                      {t.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          )}

          {error && (
            <p className="m-0 bg-red/10 px-8 py-2 text-[12px] text-red">
              {error} Your answer may not have been saved.
            </p>
          )}

          <main className="min-w-[1100px]">
            {active === "case" && <CaseView audience="buyer" />}
            {active === "files" && <FilesView audience="buyer" />}
            {active === "videos" && <VideosView audience="buyer" />}
          </main>
        </div>
      </AssetsContext.Provider>
    </RoomsContext.Provider>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-panel px-6 text-center">
      <img
        src={wordmark}
        alt="1Fort AI"
        className="mb-2 h-[14px] w-auto invert"
      />
      {children}
    </div>
  );
}
