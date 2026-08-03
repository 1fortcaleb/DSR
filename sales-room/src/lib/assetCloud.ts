import { requireSupabase } from "./supabase";
import type { Asset } from "../types";

const BUCKET = "assets";

/**
 * Asset bytes in Supabase Storage, metadata in Postgres.
 *
 * The bucket is public-read and every object sits under its asset's UUID, so
 * the URL is unguessable but permanent — the same bargain as an unlisted Loom
 * or a share token. It means a file stays reachable to anyone who has its
 * exact URL even after the room's link is revoked. That is the right trade for
 * sales collateral and the wrong one for anything confidential; the fix when
 * it matters is a private bucket plus an edge function that checks the share
 * token and mints a short-lived signed URL.
 *
 * The small thumbnail lives on the row as a data URI, so grids and poster
 * frames render without touching Storage at all.
 */

interface AssetRow {
  id: string;
  name: string;
  kind: Asset["kind"];
  mime_type: string;
  size_bytes: number;
  storage_path: string;
  url: string | null;
  thumbnail: string | null;
  origin: Asset["origin"];
  prompt: string | null;
  created_at: string;
}

function toAsset(r: AssetRow): Asset {
  return {
    id: r.id,
    name: r.name,
    kind: r.kind,
    mimeType: r.mime_type,
    sizeBytes: Number(r.size_bytes),
    thumbnail: r.thumbnail,
    origin: r.origin,
    ...(r.prompt ? { prompt: r.prompt } : {}),
    url: r.url ?? undefined,
    createdAt: r.created_at,
  };
}

/** Keeps the object key readable without letting a filename break the path. */
function safeName(name: string): string {
  return name.replace(/[^A-Za-z0-9._-]+/g, "-").slice(0, 80) || "file";
}

export async function listCloudAssets(): Promise<Asset[]> {
  const { data, error } = await requireSupabase()
    .from("assets")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => toAsset(r as AssetRow));
}

export async function putCloudAsset(asset: Asset, blob: Blob): Promise<Asset> {
  const db = requireSupabase();
  const { data: auth } = await db.auth.getUser();
  const ownerId = auth.user?.id;
  if (!ownerId) throw new Error("Not signed in.");

  const path = `${asset.id}/${safeName(asset.name)}`;
  const up = await db.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: asset.mimeType, upsert: true });
  if (up.error) throw up.error;

  const { data: pub } = db.storage.from(BUCKET).getPublicUrl(path);

  const { data, error } = await db
    .from("assets")
    .upsert({
      id: asset.id,
      owner_id: ownerId,
      name: asset.name,
      kind: asset.kind,
      mime_type: asset.mimeType,
      size_bytes: asset.sizeBytes,
      storage_path: path,
      url: pub.publicUrl,
      thumbnail: asset.thumbnail,
      origin: asset.origin,
      prompt: asset.prompt ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return toAsset(data as AssetRow);
}

export async function renameCloudAsset(id: string, name: string): Promise<void> {
  // The object key keeps its original name; only the label the rep sees moves.
  const { error } = await requireSupabase().from("assets").update({ name }).eq("id", id);
  if (error) throw error;
}

export async function deleteCloudAsset(id: string): Promise<void> {
  const db = requireSupabase();
  const { data } = await db.from("assets").select("storage_path").eq("id", id).single();
  const path = (data as { storage_path?: string } | null)?.storage_path;
  if (path) await db.storage.from(BUCKET).remove([path]);
  const { error } = await db.from("assets").delete().eq("id", id);
  if (error) throw error;
}
