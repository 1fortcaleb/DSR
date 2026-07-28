import { useCallback, useRef, useState } from "react";
import { INITIAL_CASE_CONTENT, INITIAL_SOURCES } from "../data/caseContent";
import { GenerationError, generationProvider } from "../lib/generation";
import type { CaseContent, GeneratedSource } from "../types";

export type GenerationStatus = "idle" | "working" | "error";

export interface DealRoom {
  content: CaseContent;
  /** Replace one top-level field of the case content. */
  setField: <K extends keyof CaseContent>(key: K, value: CaseContent[K]) => void;
  /** Replace one item inside one of the content's arrays, matched by id. */
  setListItem: <K extends keyof CaseContent>(
    key: K,
    id: string,
    patch: Partial<CaseContent[K] extends readonly (infer T)[] ? T : never>,
  ) => void;
  sources: GeneratedSource[];
  toggleSource: (id: string) => void;
  renameSource: (id: string, label: string) => void;
  status: GenerationStatus;
  error: string | null;
  isLive: boolean;
  regenerate: () => void;
  dismissError: () => void;
}

export function useDealRoom(account: string): DealRoom {
  const [content, setContent] = useState<CaseContent>(INITIAL_CASE_CONTENT);
  const [sources, setSources] = useState<GeneratedSource[]>(INITIAL_SOURCES);
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  // Guards against a slow run overwriting a newer one.
  const runIdRef = useRef(0);
  // Mirrors of the latest state, so `regenerate` can read them without
  // re-creating itself on every keystroke.
  const contentRef = useRef(content);
  const sourcesRef = useRef(sources);
  contentRef.current = content;
  sourcesRef.current = sources;

  const setField = useCallback<DealRoom["setField"]>((key, value) => {
    setContent((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setListItem = useCallback<DealRoom["setListItem"]>((key, id, patch) => {
    setContent((prev) => {
      const list = prev[key];
      if (!Array.isArray(list)) return prev;
      return {
        ...prev,
        [key]: list.map((item) =>
          (item as { id: string }).id === id ? { ...item, ...patch } : item,
        ),
      };
    });
  }, []);

  const toggleSource = useCallback((id: string) => {
    setSources((prev) => prev.map((s) => (s.id === id ? { ...s, used: !s.used } : s)));
  }, []);

  const renameSource = useCallback((id: string, label: string) => {
    setSources((prev) => prev.map((s) => (s.id === id ? { ...s, label } : s)));
  }, []);

  const dismissError = useCallback(() => {
    setError(null);
    setStatus("idle");
  }, []);

  const regenerate = useCallback(() => {
    const runId = ++runIdRef.current;
    setStatus("working");
    setError(null);

    generationProvider
      .generate({ account, current: contentRef.current, sources: sourcesRef.current })
      .then((next) => {
        if (runId !== runIdRef.current) return;
        setContent(next);
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
  }, [account]);

  return {
    content,
    setField,
    setListItem,
    sources,
    toggleSource,
    renameSource,
    status,
    error,
    isLive: generationProvider.live,
    regenerate,
    dismissError,
  };
}
