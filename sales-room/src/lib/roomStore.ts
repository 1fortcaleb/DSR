import { seedRooms } from "../data/seedRooms";
import type { CaseContent, Room, RoomKind, RoomMode } from "../types";

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
      mode: r.mode ?? "specific",
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

function newId(_prefix: string): string {
  // Must be a UUID: these ids become primary keys in Postgres, where the
  // column is `uuid`. A readable prefixed id is rejected on insert.
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  // Non-secure contexts have no randomUUID; shape-compatible fallback.
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
    (
      Number(c) ^
      (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (Number(c) / 4)))
    ).toString(16),
  );
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


/**
 * The pre-call one-pager. No account, no discovery, no numbers of theirs —
 * it describes the operation we're built for and asks whether that's them.
 *
 * Deliberately says nothing about which line of business or which carriers.
 * A template that names one is wrong for every rep selling another, and a
 * carrier list goes stale. Reps narrow it by editing the page.
 *
 * Every figure here is a benchmark and is labelled as one. The moment a rep
 * passes one off as the prospect's own the page stops being credible, so the
 * copy says "typically" and the footnote says where it came from.
 */
const ARCHETYPE_CONTENT: CaseContent = {
  kicker: "Business case",
  pageCount: "Before we talk",
  headline: "If submissions still move by email, the premium is leaking somewhere you can't see.",
  framingLabel: "The shape of the problem",
  framing: [
    { id: "despite", lead: "Despite", value: "[a full book and good carrier relationships]" },
    { id: "cant", lead: "you still can't", value: "[turn a submission round inside a week]" },
    { id: "means", lead: "which means", value: "[your producers]" },
    { id: "have-to", lead: "have to", value: "[rekey one application into every carrier portal]" },
    { id: "cost", lead: "and the cost is", value: "[the submissions nobody ever quotes]" },
  ],
  statsLabel: "What we usually find",
  statsSource: "Typical of the agencies we onboard — not yours yet",
  stats: [
    { id: "days", value: "11", unit: "days", label: "Median submission to first quote", accent: "navy" },
    { id: "portals", value: "6", unit: "portals", label: "Rekeyed per account", accent: "navy" },
    { id: "unquoted", value: "1 in 3", label: "Submissions never quoted out", accent: "red" },
    { id: "leak", value: "5-figure", label: "Premium left unwritten, per producer, per year", accent: "red" },
  ],
  changesLabel: "What changes",
  changesBody:
    "Producers submit once in 1Fort. We push to your markets in parallel, return bindable quotes in minutes, and generate the comparison and proposal for you.",
  changesBullets: [
    { id: "b1", text: "One application, every market you use, no rekeying" },
    { id: "b2", text: "AI coverage comparison the insured can actually read" },
    { id: "b3", text: "Bind, invoice and collect in the same thread" },
  ],
  yearOneLabel: "What it's usually worth",
  yearOneValue: "3–5×",
  yearOneCaption: "Return in year one, on the agencies we've measured",
  yearOneRows: [
    { id: "r1", label: "Producer hours returned", value: "~120 / producer", accent: "ink" },
    { id: "r2", label: "Platform investment", value: "Scales with seats", accent: "ink" },
    { id: "r3", label: "Typical payback", value: "Under 6 months", accent: "green" },
  ],
  yearOneFootnote:
    "Ranges from agencies running this line through 1Fort. We build the version with your numbers in it after one call.",
  nextLabel: "If this sounds like you",
  weeks: [
    { id: "w1", num: "STEP 1", title: "A 20-minute call", sub: "Your book, your carriers, where it jams" },
    { id: "w2", num: "STEP 2", title: "This page, with your numbers", sub: "Built from that call, not from these averages" },
    { id: "w3", num: "STEP 3", title: "Pilot with two producers", sub: "One line of business, live accounts" },
  ],
  footerNote: "Prepared by 1Fort · figures are typical, not yours",
  footerRef: "1F-PRE",
};

export function createRoom(
  kind: RoomKind,
  company: string,
  ownerName: string,
  mode: RoomMode = "specific",
): Room {
  const now = new Date().toISOString();
  const archetype = mode === "archetype";
  return {
    id: newId("room"),
    kind,
    mode,
    status: "draft",
    name: company,
    account: {
      company,
      counterparty: { name: "", title: "", org: archetype ? "" : company },
      owner: { name: ownerName, title: kind === "deal" ? "Account Executive" : "Partnerships", org: "1Fort" },
    },
    content: archetype
      ? structuredClone(ARCHETYPE_CONTENT)
      : {
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
