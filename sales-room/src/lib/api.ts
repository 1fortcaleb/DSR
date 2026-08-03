import { requireSupabase } from "./supabase";
import type { FlaggedPassage, Room, RoomFeedback, Verdict } from "../types";

/* ------------------------------------------------------------ rep-side API */

/** Postgres row shape; snake_case at the boundary, camelCase everywhere else. */
interface RoomRow {
  id: string;
  kind: Room["kind"];
  room_mode: Room["mode"];
  status: Room["status"];
  name: string;
  account: Room["account"];
  content: Room["content"];
  sources: Room["sources"];
  documents: Room["documents"];
  videos: Room["videos"];
  library: Room["library"];
  curated_video_ids: string[];
  updated_at: string;
}

export interface ShareLink {
  token: string;
  roomId: string;
  recipientName: string | null;
  recipientEmail: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  firstOpenedAt: string | null;
  lastOpenedAt: string | null;
  openCount: number;
}

const ROOM_COLUMNS =
  "id, kind, room_mode, status, name, account, content, sources, documents, videos, library, curated_video_ids, updated_at";

function toRoom(row: RoomRow, feedback: RoomFeedback | null, flags: FlaggedPassage[]): Room {
  return {
    id: row.id,
    kind: row.kind,
    mode: row.room_mode ?? "specific",
    status: row.status,
    name: row.name,
    account: row.account,
    content: row.content,
    sources: row.sources ?? [],
    documents: row.documents ?? [],
    videos: row.videos ?? [],
    library: row.library ?? [],
    curatedVideoIds: row.curated_video_ids ?? [],
    feedback,
    flags,
    engagement: [],
    // Real telemetry: when the counterparty actually opened their link.
    lastViewedAt: null,
    updatedAt: row.updated_at,
  };
}

export async function fetchRooms(): Promise<Room[]> {
  const db = requireSupabase();
  const [rooms, feedback, flags, opens] = await Promise.all([
    db.from("rooms").select(ROOM_COLUMNS).order("updated_at", { ascending: false }),
    db.from("feedback").select("room_id, verdict, message, by_name, at"),
    db.from("flags").select("id, room_id, quote, note, by_name, at, resolved").order("at"),
    db.from("share_links").select("room_id, last_opened_at").not("last_opened_at", "is", null),
  ]);
  for (const r of [rooms, feedback, flags, opens]) if (r.error) throw r.error;

  const fbByRoom = new Map<string, RoomFeedback>();
  for (const f of feedback.data ?? []) {
    fbByRoom.set(f.room_id, {
      verdict: f.verdict as Verdict,
      message: f.message ?? undefined,
      at: f.at,
      by: f.by_name,
    });
  }
  const flagsByRoom = new Map<string, FlaggedPassage[]>();
  for (const f of flags.data ?? []) {
    const list = flagsByRoom.get(f.room_id) ?? [];
    list.push({ id: f.id, quote: f.quote, note: f.note, by: f.by_name, at: f.at, resolved: f.resolved });
    flagsByRoom.set(f.room_id, list);
  }
  // Most recent open across a room's links stands in for "last viewed".
  const openByRoom = new Map<string, string>();
  for (const o of opens.data ?? []) {
    const prev = openByRoom.get(o.room_id);
    if (!prev || o.last_opened_at > prev) openByRoom.set(o.room_id, o.last_opened_at);
  }

  return (rooms.data ?? []).map((row) => {
    const room = toRoom(
      row as unknown as RoomRow,
      fbByRoom.get(row.id) ?? null,
      flagsByRoom.get(row.id) ?? [],
    );
    room.lastViewedAt = openByRoom.get(row.id) ?? null;
    return room;
  });
}

/** Persists the rep-editable half of a room. Feedback and flags are theirs. */
export async function saveRoom(room: Room): Promise<void> {
  const db = requireSupabase();
  // owner_id is sent explicitly rather than left to the column default. The
  // older owner-scoped policy checks `owner_id = auth.uid()` on insert, so
  // omitting it fails there with a row-level security error; sending it works
  // under both that policy and the current team-wide one. A trigger keeps the
  // original creator when a colleague edits, so this can't rewrite provenance.
  const { data: auth } = await db.auth.getUser();
  const ownerId = auth.user?.id;
  if (!ownerId) throw new Error("Not signed in.");

  const { error } = await db.from("rooms").upsert({
    id: room.id,
    owner_id: ownerId,
    kind: room.kind,
    room_mode: room.mode,
    status: room.status,
    name: room.name,
    account: room.account,
    content: room.content,
    sources: room.sources,
    documents: room.documents,
    videos: room.videos,
    library: room.library,
    curated_video_ids: room.curatedVideoIds,
  });
  if (error) throw error;
}

export async function deleteRoom(id: string): Promise<void> {
  const { error } = await requireSupabase().from("rooms").delete().eq("id", id);
  if (error) throw error;
}

export async function setFlagResolved(id: string, resolved: boolean): Promise<void> {
  const { error } = await requireSupabase().from("flags").update({ resolved }).eq("id", id);
  if (error) throw error;
}

export async function deleteFlag(id: string): Promise<void> {
  const { error } = await requireSupabase().from("flags").delete().eq("id", id);
  if (error) throw error;
}

/* --------------------------------------------------------------- sharing */

function toLink(r: Record<string, unknown>): ShareLink {
  return {
    token: r.token as string,
    roomId: r.room_id as string,
    recipientName: (r.recipient_name as string) ?? null,
    recipientEmail: (r.recipient_email as string) ?? null,
    expiresAt: (r.expires_at as string) ?? null,
    revokedAt: (r.revoked_at as string) ?? null,
    createdAt: r.created_at as string,
    firstOpenedAt: (r.first_opened_at as string) ?? null,
    lastOpenedAt: (r.last_opened_at as string) ?? null,
    openCount: (r.open_count as number) ?? 0,
  };
}

export async function fetchShareLinks(roomId: string): Promise<ShareLink[]> {
  const { data, error } = await requireSupabase()
    .from("share_links")
    .select("*")
    .eq("room_id", roomId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toLink);
}

export async function createShareLink(
  roomId: string,
  recipientName: string,
  recipientEmail: string,
  expiresInDays: number | null,
): Promise<ShareLink> {
  const expires_at =
    expiresInDays === null
      ? null
      : new Date(Date.now() + expiresInDays * 86_400_000).toISOString();
  const { data, error } = await requireSupabase()
    .from("share_links")
    .insert({
      room_id: roomId,
      recipient_name: recipientName.trim() || null,
      recipient_email: recipientEmail.trim() || null,
      expires_at,
    })
    .select("*")
    .single();
  if (error) throw error;
  return toLink(data);
}

/** Revoking keeps the row so the open history survives; the link stops working. */
export async function revokeShareLink(token: string): Promise<void> {
  const { error } = await requireSupabase()
    .from("share_links")
    .update({ revoked_at: new Date().toISOString() })
    .eq("token", token);
  if (error) throw error;
}

export function shareUrl(token: string): string {
  return `${window.location.origin}/r/${token}`;
}

/* ------------------------------------------------- counterparty-side API */

/** Exactly what get_shared_room returns — the rep-only fields are absent. */
export interface SharedRoomPayload {
  roomId: string;
  kind: Room["kind"];
  mode: Room["mode"];
  account: Room["account"];
  content: Room["content"];
  documents: Room["documents"];
  videos: Room["videos"];
  curatedVideoIds: string[];
  recipientName: string | null;
  feedback: RoomFeedback | null;
  flags: FlaggedPassage[];
  assets: { id: string; name: string; kind: string; thumbnail: string | null; url?: string }[];
}

/** Null means the link is unknown, revoked, expired, or the room isn't live. */
export async function fetchSharedRoom(token: string): Promise<SharedRoomPayload | null> {
  const { data, error } = await requireSupabase().rpc("get_shared_room", { p_token: token });
  if (error) throw error;
  return (data as SharedRoomPayload | null) ?? null;
}

export async function submitSharedFeedback(
  token: string,
  verdict: Verdict,
  message?: string,
): Promise<void> {
  const { error } = await requireSupabase().rpc("submit_shared_feedback", {
    p_token: token,
    p_verdict: verdict,
    p_message: message ?? null,
  });
  if (error) throw error;
}

export async function withdrawSharedFeedback(token: string): Promise<void> {
  const { error } = await requireSupabase().rpc("withdraw_shared_feedback", { p_token: token });
  if (error) throw error;
}

export async function addSharedFlag(
  token: string,
  quote: string,
  note: string,
): Promise<FlaggedPassage> {
  const { data, error } = await requireSupabase().rpc("add_shared_flag", {
    p_token: token,
    p_quote: quote,
    p_note: note,
  });
  if (error) throw error;
  return data as FlaggedPassage;
}
