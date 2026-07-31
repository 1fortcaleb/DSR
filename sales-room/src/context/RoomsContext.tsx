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
import { vocabularyFor, type Vocabulary } from "../lib/vocabulary";
import type {
  CaseContent,
  FlaggedPassage,
  Room,
  RoomKind,
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
  createRoom: (kind: RoomKind, company: string) => string;
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

const RoomsContext = createContext<RoomsContextValue | null>(null);

const OWNER_FALLBACK = "Rachel Moss";

export function RoomsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(loadState);
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const runIdRef = useRef(0);

  // Persist on every change. Cheap at this data size; swap for a debounce or a
  // real backend when rooms grow beyond a handful.
  useEffect(() => {
    saveState(state);
  }, [state]);

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
    (id: string) =>
      patchActive((r) => ({
        ...r,
        flags: r.flags.map((f) => (f.id === id ? { ...f, resolved: true } : f)),
      })),
    [patchActive],
  );

  const removeFlag = useCallback(
    (id: string) => patchActive((r) => ({ ...r, flags: r.flags.filter((f) => f.id !== id) })),
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

  const createRoom = useCallback((kind: RoomKind, company: string) => {
    const room = makeRoom(kind, company.trim() || "Untitled room", OWNER_FALLBACK);
    setState((prev) => ({ activeRoomId: room.id, rooms: [...prev.rooms, room] }));
    return room.id;
  }, []);

  const duplicateRoom = useCallback((id: string) => {
    const source = stateRef.current.rooms.find((r) => r.id === id);
    if (!source) return id;
    const copy = copyRoom(source);
    setState((prev) => ({ activeRoomId: copy.id, rooms: [...prev.rooms, copy] }));
    return copy.id;
  }, []);

  const deleteRoom = useCallback((id: string) => {
    setState((prev) => {
      // Never leave the app with zero rooms — there'd be nothing to render.
      if (prev.rooms.length <= 1) return prev;
      const rooms = prev.rooms.filter((r) => r.id !== id);
      const activeRoomId = prev.activeRoomId === id ? rooms[0].id : prev.activeRoomId;
      return { activeRoomId, rooms };
    });
  }, []);

  const value: RoomsContextValue = {
    rooms: state.rooms,
    activeRoom,
    activeRoomId: state.activeRoomId,
    vocabulary: vocabularyFor(activeRoom.kind),
    setActiveRoomId: (id) => setState((prev) => ({ ...prev, activeRoomId: id })),
    updateRoom: patchRoom,
    setRoomStatus: (id, status) => patchRoom(id, { status }),
    createRoom,
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
