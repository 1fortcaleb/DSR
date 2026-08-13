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
import {
  deleteCloudAsset,
  listCloudAssets,
  putCloudAsset,
  renameCloudAsset,
  signCloudAsset,
} from "../lib/assetCloud";
import { errText } from "../lib/errors";
import { isCloud } from "../lib/supabase";
import { kindOf, makeThumbnail } from "../lib/thumbnails";
import type { Asset, AssetKind } from "../types";

export interface AssetsContextValue {
  assets: Asset[];
  byId: Map<string, Asset>;
  loading: boolean;
  /** Number of files currently being read and thumbnailed. */
  uploading: number;
  error: string | null;
  generationLive: boolean;

  upload: (files: FileList | File[]) => Promise<void>;
  /** Adds one file and hands back the stored asset, for callers that need its id. */
  addFile: (file: File) => Promise<Asset>;
  remove: (id: string) => Promise<void>;
  rename: (id: string, name: string) => Promise<void>;
  generate: (prompt: string, kind: AssetKind, account: string) => Promise<void>;
  openUrl: (id: string) => Promise<string | null>;
  clearAll: () => Promise<void>;
  dismissError: () => void;
}

/**
 * Exported so the shared view can supply the same shape from a share payload.
 * The counterparty has no library and no write access — only the handful of
 * assets their room actually references, already resolved to hosted URLs.
 */
// eslint-disable-next-line react-refresh/only-export-components
export const AssetsContext = createContext<AssetsContextValue | null>(null);

function newId(): string {
  // Must be a UUID: this becomes the assets primary key in Postgres, and it is
  // also the Storage folder, so it doubles as the unguessable part of the URL.
  return crypto.randomUUID();
}

export function AssetsProvider({ children }: { children: ReactNode }) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (isCloud ? listCloudAssets() : listAssets())
      .then((list) => {
        if (!cancelled) setAssets(list);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(errText(err));
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
    // Cloud: bytes to Storage, row to Postgres, so the counterparty can reach
    // it. Local: IndexedDB, which only this browser can see.
    const saved = isCloud ? await putCloudAsset(asset, file) : (await putAsset(asset, file), asset);
    setAssets((prev) => [saved, ...prev]);
    return saved;
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
    if (isCloud) await deleteCloudAsset(id);
    else await deleteAsset(id);
    setAssets((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const rename = useCallback(
    async (id: string, name: string) => {
      const asset = assets.find((a) => a.id === id);
      if (!asset) return;
      if (isCloud) {
        await renameCloudAsset(id, name);
        setAssets((prev) => prev.map((a) => (a.id === id ? { ...a, name } : a)));
        return;
      }
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

  const addFile = useCallback(
    async (file: File) => {
      setUploading((n) => n + 1);
      try {
        return await ingest(file, "uploaded");
      } finally {
        setUploading((n) => Math.max(0, n - 1));
      }
    },
    [ingest],
  );

  const value: AssetsContextValue = {
    assets,
    byId,
    loading,
    uploading,
    error,
    generationLive: assetGenerationProvider.live,
    upload,
    addFile,
    remove,
    rename,
    generate,
    openUrl: async (id: string) => {
      const asset = assets.find((a) => a.id === id);
      // Signed at the moment of opening rather than held on the row. The
      // bucket is private, so there is no URL that keeps working, and one
      // signed when the library loaded would already be expiring.
      if (isCloud) {
        return asset?.storagePath ? await signCloudAsset(asset.storagePath) : null;
      }
      // Local-only mode has no Storage at all; the bytes are in IndexedDB.
      return assetObjectUrl(id);
    },
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
