import { seedRooms } from "../data/seedRooms";
import type { CaseContent, Room, RoomKind } from "../types";

const STORAGE_KEY = "1fort.rooms";
/** Bump when the Room shape changes incompatibly; stored data is then re-seeded. */
const SCHEMA_VERSION = 1;

interface StoredState {
  version: number;
  activeRoomId: string;
  rooms: Room[];
}

export interface RoomsState {
  activeRoomId: string;
  rooms: Room[];
}

export function initialState(): RoomsState {
  const rooms = seedRooms();
  return { activeRoomId: rooms[0].id, rooms };
}

export function loadState(): RoomsState {
  if (typeof localStorage === "undefined") return initialState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState();
    const parsed = JSON.parse(raw) as StoredState;
    // An older schema is discarded rather than half-migrated — the stored data
    // is rep drafts, not a system of record, so re-seeding is the safe default.
    if (parsed.version !== SCHEMA_VERSION || !Array.isArray(parsed.rooms) || !parsed.rooms.length) {
      return initialState();
    }
    const activeRoomId = parsed.rooms.some((r) => r.id === parsed.activeRoomId)
      ? parsed.activeRoomId
      : parsed.rooms[0].id;
    // Rooms stored before counterparty feedback existed lack these fields.
    // Filling them in beats bumping the schema version, which would re-seed and
    // throw away the rep's drafts over purely additive fields.
    const rooms = parsed.rooms.map((r) => ({
      ...r,
      feedback: r.feedback ?? null,
      flags: r.flags ?? [],
    }));
    return { activeRoomId, rooms };
  } catch {
    // Corrupt or unreadable storage (quota, private mode) falls back to seeds.
    return initialState();
  }
}

export function saveState(state: RoomsState): void {
  if (typeof localStorage === "undefined") return;
  try {
    const payload: StoredState = { version: SCHEMA_VERSION, ...state };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Storage full or blocked — the app keeps working from memory.
  }
}

export function clearState(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

const BLANK_CONTENT: CaseContent = {
  kicker: "Business case",
  pageCount: "1 of 1",
  headline: "Headline goes here.",
  framingLabel: "Problem framing",
  framing: [
    { id: "despite", lead: "Despite", value: "[current approach]" },
    { id: "cant", lead: "we still can't", value: "[desired outcome]" },
    { id: "means", lead: "which means", value: "[who is affected]" },
    { id: "have-to", lead: "have to", value: "[the manual work]" },
    { id: "cost", lead: "the cost is", value: "[the cost]" },
  ],
  statsLabel: "Where it shows up today",
  statsSource: "Source pending",
  stats: [
    { id: "s1", value: "—", unit: "", label: "Metric one", accent: "navy" },
    { id: "s2", value: "—", unit: "", label: "Metric two", accent: "navy" },
    { id: "s3", value: "—", unit: "", label: "Metric three", accent: "red" },
    { id: "s4", value: "—", label: "Metric four", accent: "red" },
  ],
  changesLabel: "What changes",
  changesBody: "Describe what changes for them.",
  changesBullets: [
    { id: "b1", text: "First proof point" },
    { id: "b2", text: "Second proof point" },
    { id: "b3", text: "Third proof point" },
  ],
  yearOneLabel: "Year one",
  yearOneValue: "—",
  yearOneCaption: "Headline outcome",
  yearOneRows: [
    { id: "r1", label: "Metric", value: "—", accent: "ink" },
    { id: "r2", label: "Investment", value: "—", accent: "ink" },
    { id: "r3", label: "Payback", value: "—", accent: "green" },
  ],
  yearOneFootnote: "Add the assumptions behind these figures.",
  nextLabel: "Next 30 days",
  weeks: [
    { id: "w1", num: "WEEK 1", title: "First milestone", sub: "What happens" },
    { id: "w2", num: "WEEK 3", title: "Second milestone", sub: "What happens" },
    { id: "w3", num: "WEEK 4", title: "Third milestone", sub: "What happens" },
  ],
  footerNote: "Prepared by 1Fort",
  footerRef: "REF-0000",
};

export function createRoom(kind: RoomKind, company: string, ownerName: string): Room {
  const now = new Date().toISOString();
  return {
    id: newId("room"),
    kind,
    status: "draft",
    name: company,
    account: {
      company,
      counterparty: { name: "", title: "", org: company },
      owner: { name: ownerName, title: kind === "deal" ? "Account Executive" : "Partnerships", org: "1Fort" },
    },
    content: {
      ...structuredClone(BLANK_CONTENT),
      footerNote: `Prepared for ${company} by ${ownerName} · 1Fort`,
    },
    sources: [],
    documents: [],
    videos: [],
    library: [],
    curatedVideoIds: [],
    feedback: null,
    flags: [],
    engagement: [],
    lastViewedAt: null,
    updatedAt: now,
  };
}

export function duplicateRoom(room: Room): Room {
  const copy = structuredClone(room);
  copy.id = newId("room");
  copy.name = `${room.name} (copy)`;
  copy.status = "draft";
  copy.feedback = null;
  copy.flags = [];
  copy.lastViewedAt = null;
  copy.updatedAt = new Date().toISOString();
  return copy;
}
