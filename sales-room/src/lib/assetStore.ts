import type { Asset } from "../types";

/**
 * Assets live in IndexedDB rather than localStorage: localStorage caps around
 * 5MB and only holds strings, so base64-ing a file would inflate it by a third
 * and blow the quota after a couple of uploads.
 */
const DB_NAME = "1fort.assets";
const DB_VERSION = 1;
const STORE = "assets";

interface StoredAsset extends Asset {
  blob: Blob;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE, mode);
        const req = run(transaction.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

/** Metadata for every stored asset, newest first. Blobs are not loaded. */
export async function listAssets(): Promise<Asset[]> {
  const all = await tx<StoredAsset[]>("readonly", (s) => s.getAll() as IDBRequest<StoredAsset[]>);
  return all
    .map(({ blob: _blob, ...meta }) => meta)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function putAsset(asset: Asset, blob: Blob): Promise<void> {
  await tx("readwrite", (s) => s.put({ ...asset, blob }));
}

export async function deleteAsset(id: string): Promise<void> {
  await tx("readwrite", (s) => s.delete(id));
}

/** Object URL for the full file. Caller is responsible for revoking it. */
export async function assetObjectUrl(id: string): Promise<string | null> {
  const record = await tx<StoredAsset | undefined>(
    "readonly",
    (s) => s.get(id) as IDBRequest<StoredAsset | undefined>,
  );
  return record ? URL.createObjectURL(record.blob) : null;
}

export async function clearAssets(): Promise<void> {
  await tx("readwrite", (s) => s.clear());
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
