import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  assetObjectUrl,
  clearAssets,
  deleteAsset,
  listAssets,
  putAsset,
} from "../lib/assetStore";
import { AssetGenerationError, assetGenerationProvider } from "../lib/assetGeneration";
import { kindOf, makeThumbnail } from "../lib/thumbnails";
import type { Asset, AssetKind } from "../types";

interface AssetsContextValue {
  assets: Asset[];
  byId: Map<string, Asset>;
  loading: boolean;
  /** Number of files currently being read and thumbnailed. */
  uploading: number;
  error: string | null;
  generationLive: boolean;

  upload: (files: FileList | File[]) => Promise<void>;
  remove: (id: string) => Promise<void>;
  rename: (id: string, name: string) => Promise<void>;
  generate: (prompt: string, kind: AssetKind, account: string) => Promise<void>;
  openUrl: (id: string) => Promise<string | null>;
  clearAll: () => Promise<void>;
  dismissError: () => void;
}

const AssetsContext = createContext<AssetsContextValue | null>(null);

function newId(): string {
  return `ast-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function AssetsProvider({ children }: { children: ReactNode }) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listAssets()
      .then((list) => {
        if (!cancelled) setAssets(list);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't open the asset library.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const ingest = useCallback(async (file: File, origin: Asset["origin"], prompt?: string) => {
    const kind = kindOf(file.type, file.name);
    const thumbnail = await makeThumbnail(file, kind, file.name);
    const asset: Asset = {
      id: newId(),
      name: file.name,
      kind,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      thumbnail,
      origin,
      ...(prompt ? { prompt } : {}),
      createdAt: new Date().toISOString(),
    };
    await putAsset(asset, file);
    setAssets((prev) => [asset, ...prev]);
  }, []);

  const upload = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      if (!list.length) return;
      setUploading((n) => n + list.length);
      setError(null);
      for (const file of list) {
        try {
          await ingest(file, "uploaded");
        } catch {
          setError(`Couldn't add ${file.name}.`);
        } finally {
          setUploading((n) => Math.max(0, n - 1));
        }
      }
    },
    [ingest],
  );

  const remove = useCallback(async (id: string) => {
    await deleteAsset(id);
    setAssets((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const rename = useCallback(
    async (id: string, name: string) => {
      const asset = assets.find((a) => a.id === id);
      if (!asset) return;
      const url = await assetObjectUrl(id);
      if (!url) return;
      try {
        const blob = await (await fetch(url)).blob();
        const next = { ...asset, name };
        await putAsset(next, blob);
        setAssets((prev) => prev.map((a) => (a.id === id ? next : a)));
      } finally {
        URL.revokeObjectURL(url);
      }
    },
    [assets],
  );

  const generate = useCallback(
    async (prompt: string, kind: AssetKind, account: string) => {
      setError(null);
      try {
        const result = await assetGenerationProvider.generate({ prompt, kind, account });
        const file = new File([result.blob], result.name, { type: result.mimeType });
        await ingest(file, "generated", prompt);
      } catch (err) {
        setError(
          err instanceof AssetGenerationError ? err.message : "Couldn't generate that asset.",
        );
      }
    },
    [ingest],
  );

  const clearAll = useCallback(async () => {
    await clearAssets();
    setAssets([]);
  }, []);

  const byId = useMemo(() => new Map(assets.map((a) => [a.id, a])), [assets]);

  const value: AssetsContextValue = {
    assets,
    byId,
    loading,
    uploading,
    error,
    generationLive: assetGenerationProvider.live,
    upload,
    remove,
    rename,
    generate,
    openUrl: assetObjectUrl,
    clearAll,
    dismissError: () => setError(null),
  };

  return <AssetsContext.Provider value={value}>{children}</AssetsContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAssets(): AssetsContextValue {
  const ctx = useContext(AssetsContext);
  if (!ctx) throw new Error("useAssets must be used inside an AssetsProvider");
  return ctx;
}
