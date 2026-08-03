import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  clearState,
  createRoom as makeRoom,
  duplicateRoom as copyRoom,
  initialState,
  loadState,
  saveState,
} from "../lib/roomStore";
import { GenerationError, generationProvider } from "../lib/generation";
import { errText } from "../lib/errors";
import { isCloud } from "../lib/supabase";
import {
  deleteFlag as apiDeleteFlag,
  deleteRoom as apiDeleteRoom,
  fetchRooms,
  saveRoom,
  setFlagResolved,
} from "../lib/api";
import { vocabularyFor, type Vocabulary } from "../lib/vocabulary";
import type {
  CaseContent,
  FlaggedPassage,
  Room,
  RoomKind,
  RoomMode,
  RoomStatus,
  Verdict,
} from "../types";

export type GenerationStatus = "idle" | "working" | "error";

interface RoomsContextValue {
  rooms: Room[];
  activeRoom: Room;
  activeRoomId: string;
  vocabulary: Vocabulary;

  setActiveRoomId: (id: string) => void;
  updateRoom: (id: string, patch: Partial<Room>) => void;
  setRoomStatus: (id: string, status: RoomStatus) => void;
  createRoom: (kind: RoomKind, company: string, mode?: RoomMode) => string;
  /** Turn an archetype into a real room for one account, after the call. */
  spinOffRoom: (id: string, company: string) => string;
  duplicateRoom: (id: string) => string;
  deleteRoom: (id: string) => void;

  /** Replace one top-level field of the active room's case content. */
  setField: <K extends keyof CaseContent>(key: K, value: CaseContent[K]) => void;
  /** Patch one item inside one of the content's arrays, matched by id. */
  setListItem: <K extends keyof CaseContent>(
    key: K,
    id: string,
    patch: Partial<CaseContent[K] extends readonly (infer T)[] ? T : never>,
  ) => void;

  toggleSource: (id: string) => void;
  renameSource: (id: string, label: string) => void;

  /** The counterparty's verdict on the page. */
  submitFeedback: (verdict: Verdict, message?: string) => void;
  withdrawFeedback: () => void;
  /** Attach a comment to a passage they highlighted. */
  flagPassage: (quote: string, note: string) => void;
  resolveFlag: (id: string) => void;
  removeFlag: (id: string) => void;

  status: GenerationStatus;
  error: string | null;
  isLive: boolean;
  regenerate: () => void;
  dismissError: () => void;

  resetAll: () => void;
}

// Exported so the counterparty's shared view can supply the same shape from a
// share token instead of local state, and reuse the whole renderer.
// eslint-disable-next-line react-refresh/only-export-components
export const RoomsContext = createContext<RoomsContextValue | null>(null);
export type { RoomsContextValue };

const OWNER_FALLBACK = "Rachel Moss";

export function RoomsProvider({ children }: { children: ReactNode }) {
  // In cloud mode the server is the source of truth, so we start empty rather
  // than flashing another account's locally cached rooms.
  const [state, setState] = useState(() => (isCloud ? { activeRoomId: "", rooms: [] } : loadState()));
  const [hydrated, setHydrated] = useState(!isCloud);
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const runIdRef = useRef(0);
  const hydratingRef = useRef(false);

  useEffect(() => {
    if (!isCloud || hydratingRef.current) return;
    hydratingRef.current = true;
    let cancelled = false;
    void fetchRooms()
      .then(async (rooms) => {
        if (cancelled) return;
        if (!rooms.length) {
          // A brand new account with no rooms would otherwise land on an empty
          // screen with nothing to click.
          const first = makeRoom("deal", "First deal room", OWNER_FALLBACK);
          try {
            await saveRoom(first);
          } catch (err) {
            // Report it rather than continuing with a room the server rejected:
            // it would look saved until the next reload lost it.
            throw new Error(
              `Couldn't create your first room. ${errText(err)}`,
            );
          }
          rooms = [first];
        }
        setState({ activeRoomId: rooms[0].id, rooms });
        setHydrated(true);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(errText(err));
        setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Local mode writes straight through. Cloud mode debounces so a burst of
  // keystrokes in an inline editor is one round trip, not thirty.
  useEffect(() => {
    if (!hydrated) return;
    if (!isCloud) {
      saveState(state);
      return;
    }
    const room = state.rooms.find((r) => r.id === state.activeRoomId);
    if (!room) return;
    const t = setTimeout(() => {
      void saveRoom(room).catch((err: unknown) =>
        setError(errText(err)),
      );
    }, 700);
    return () => clearTimeout(t);
  }, [state, hydrated]);

  const activeRoom = useMemo(
    () => state.rooms.find((r) => r.id === state.activeRoomId) ?? state.rooms[0],
    [state],
  );

  const stateRef = useRef(state);
  stateRef.current = state;

  const patchRoom = useCallback((id: string, patch: Partial<Room>) => {
    setState((prev) => ({
      ...prev,
      rooms: prev.rooms.map((r) =>
        r.id === id ? { ...r, ...patch, updatedAt: new Date().toISOString() } : r,
      ),
    }));
  }, []);

  const patchActiveContent = useCallback(
    (updater: (content: CaseContent) => CaseContent) => {
      setState((prev) => ({
        ...prev,
        rooms: prev.rooms.map((r) =>
          r.id === prev.activeRoomId
            ? { ...r, content: updater(r.content), updatedAt: new Date().toISOString() }
            : r,
        ),
      }));
    },
    [],
  );

  const setField = useCallback<RoomsContextValue["setField"]>(
    (key, value) => patchActiveContent((c) => ({ ...c, [key]: value })),
    [patchActiveContent],
  );

  const setListItem = useCallback<RoomsContextValue["setListItem"]>(
    (key, id, patch) =>
      patchActiveContent((c) => {
        const list = c[key];
        if (!Array.isArray(list)) return c;
        return {
          ...c,
          [key]: list.map((item) =>
            (item as { id: string }).id === id ? { ...item, ...patch } : item,
          ),
        };
      }),
    [patchActiveContent],
  );

  const toggleSource = useCallback(
    (id: string) => {
      const room = stateRef.current.rooms.find((r) => r.id === stateRef.current.activeRoomId);
      if (!room) return;
      patchRoom(room.id, {
        sources: room.sources.map((s) => (s.id === id ? { ...s, used: !s.used } : s)),
      });
    },
    [patchRoom],
  );

  const renameSource = useCallback(
    (id: string, label: string) => {
      const room = stateRef.current.rooms.find((r) => r.id === stateRef.current.activeRoomId);
      if (!room) return;
      patchRoom(room.id, {
        sources: room.sources.map((s) => (s.id === id ? { ...s, label } : s)),
      });
    },
    [patchRoom],
  );

  /** Mutate only the active room, stamping nothing else. */
  const patchActive = useCallback((updater: (room: Room) => Room) => {
    setState((prev) => ({
      ...prev,
      rooms: prev.rooms.map((r) => (r.id === prev.activeRoomId ? updater(r) : r)),
    }));
  }, []);

  const submitFeedback = useCallback<RoomsContextValue["submitFeedback"]>(
    (verdict, message) =>
      patchActive((r) => ({
        ...r,
        feedback: {
          verdict,
          message: message?.trim() || undefined,
          at: new Date().toISOString(),
          by: r.account.counterparty.name || "The counterparty",
        },
      })),
    [patchActive],
  );

  const withdrawFeedback = useCallback(
    () => patchActive((r) => ({ ...r, feedback: null })),
    [patchActive],
  );

  const flagPassage = useCallback(
    (quote: string, note: string) =>
      patchActive((r) => {
        const flag: FlaggedPassage = {
          id: `flag-${Math.random().toString(36).slice(2, 9)}`,
          // Long selections are trimmed: the rep needs to recognise the passage,
          // not re-read it.
          quote: quote.trim().slice(0, 240),
          note: note.trim(),
          at: new Date().toISOString(),
          by: r.account.counterparty.name || "The counterparty",
        };
        return { ...r, flags: [...r.flags, flag] };
      }),
    [patchActive],
  );

  const resolveFlag = useCallback(
    (id: string) => {
      if (isCloud) void setFlagResolved(id, true).catch(() => undefined);
      return patchActive((r) => ({
        ...r,
        flags: r.flags.map((f) => (f.id === id ? { ...f, resolved: true } : f)),
      }));
    },
    [patchActive],
  );

  const removeFlag = useCallback(
    (id: string) => {
      if (isCloud) void apiDeleteFlag(id).catch(() => undefined);
      return patchActive((r) => ({ ...r, flags: r.flags.filter((f) => f.id !== id) }));
    },
    [patchActive],
  );

  const regenerate = useCallback(() => {
    const runId = ++runIdRef.current;
    const snapshot = stateRef.current;
    const room = snapshot.rooms.find((r) => r.id === snapshot.activeRoomId);
    if (!room) return;

    setStatus("working");
    setError(null);

    generationProvider
      .generate({ account: room.account.company, current: room.content, sources: room.sources })
      .then((next) => {
        if (runId !== runIdRef.current) return;
        patchRoom(room.id, { content: next });
        setStatus("idle");
      })
      .catch((err: unknown) => {
        if (runId !== runIdRef.current) return;
        setError(
          err instanceof GenerationError
            ? err.message
            : "Couldn't regenerate the 1-pager. Try again.",
        );
        setStatus("error");
      });
  }, [patchRoom]);

  const createRoom = useCallback((kind: RoomKind, company: string, mode: RoomMode = "specific") => {
    const room = makeRoom(kind, company.trim() || "Untitled room", OWNER_FALLBACK, mode);
    setState((prev) => ({ activeRoomId: room.id, rooms: [...prev.rooms, room] }));
    if (isCloud) void saveRoom(room).catch(() => setError("Couldn't create that room."));
    return room.id;
  }, []);

  const duplicateRoom = useCallback((id: string) => {
    const source = stateRef.current.rooms.find((r) => r.id === id);
    if (!source) return id;
    const copy = copyRoom(source);
    setState((prev) => ({ activeRoomId: copy.id, rooms: [...prev.rooms, copy] }));
    if (isCloud) void saveRoom(copy).catch(() => setError("Couldn't duplicate that room."));
    return copy.id;
  }, []);

  const spinOffRoom = useCallback((id: string, company: string) => {
    const source = stateRef.current.rooms.find((r) => r.id === id);
    if (!source) return id;
    // Keeps the archetype's framing as a starting point but drops everything
    // that belonged to the general version: it is now about one account, and
    // the benchmark figures have to be replaced with theirs.
    const room = copyRoom(source);
    room.mode = "specific";
    room.name = company.trim() || source.name;
    room.account = {
      ...source.account,
      company: company.trim() || source.account.company,
      counterparty: { name: "", title: "", org: company.trim() },
    };
    room.content = {
      ...room.content,
      statsSource: "Replace with their numbers",
      footerNote: `Prepared for ${company.trim()} by ${source.account.owner.name} · 1Fort`,
    };
    setState((prev) => ({ activeRoomId: room.id, rooms: [...prev.rooms, room] }));
    if (isCloud) void saveRoom(room).catch(() => setError("Couldn't create that room."));
    return room.id;
  }, []);

  const deleteRoom = useCallback((id: string) => {
    if (isCloud) void apiDeleteRoom(id).catch(() => setError("Couldn't delete that room."));
    setState((prev) => {
      // Never leave the app with zero rooms — there'd be nothing to render.
      if (prev.rooms.length <= 1) return prev;
      const rooms = prev.rooms.filter((r) => r.id !== id);
      const activeRoomId = prev.activeRoomId === id ? rooms[0].id : prev.activeRoomId;
      return { activeRoomId, rooms };
    });
  }, []);

  // Must precede `value`: it dereferences activeRoom, which is undefined
  // until the first fetch lands. Every hook above has already run, so an
  // early return here is safe.
  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-nav">
        <span className="font-mono text-[11px] tracking-[0.1em] text-nav-faint uppercase">
          Loading rooms
        </span>
      </div>
    );
  }

  // Hydrated but empty means the fetch or the first insert failed. activeRoom
  // is undefined here, so anything below would throw and blank the page.
  if (!activeRoom) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-nav px-6">
        <div className="flex w-full max-w-[520px] flex-col gap-4">
          <span className="font-mono text-[10px] tracking-[0.14em] text-periwinkle uppercase">
            Couldn't load
          </span>
          <h1 className="m-0 text-[22px] leading-[1.25] font-bold tracking-[-0.02em] text-white">
            No rooms came back.
          </h1>
          <pre className="m-0 overflow-x-auto rounded-md border border-nav-line bg-nav-raised p-3 font-mono text-[11.5px] leading-[1.5] whitespace-pre-wrap text-nav-body">
            {error ?? "The database returned nothing and no error, which usually means the tables exist but are empty and the first insert was rejected."}
          </pre>
          <p className="m-0 text-[11.5px] leading-[1.6] text-nav-faint">
            Most often this means supabase/schema.sql hasn't been run, or was run
            before the latest changes. Re-running it is safe.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-fit cursor-pointer rounded-md border-none bg-periwinkle px-4 py-2 font-sans text-[12.5px] font-bold text-nav"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const value: RoomsContextValue = {
    rooms: state.rooms,
    activeRoom,
    activeRoomId: state.activeRoomId,
    vocabulary: vocabularyFor(activeRoom.kind),
    setActiveRoomId: (id) => setState((prev) => ({ ...prev, activeRoomId: id })),
    updateRoom: patchRoom,
    setRoomStatus: (id, status) => patchRoom(id, { status }),
    createRoom,
    spinOffRoom,
    duplicateRoom,
    deleteRoom,
    setField,
    setListItem,
    toggleSource,
    renameSource,
    submitFeedback,
    withdrawFeedback,
    flagPassage,
    resolveFlag,
    removeFlag,
    status,
    error,
    isLive: generationProvider.live,
    regenerate,
    dismissError: () => {
      setError(null);
      setStatus("idle");
    },
    resetAll: () => {
      clearState();
      setState(initialState());
      setStatus("idle");
      setError(null);
    },
  };

  return <RoomsContext.Provider value={value}>{children}</RoomsContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useRooms(): RoomsContextValue {
  const ctx = useContext(RoomsContext);
  if (!ctx) throw new Error("useRooms must be used inside a RoomsProvider");
  return ctx;
}
