import type { RoomKind } from "../types";

/**
 * Wording that differs between relationship types. Everything user-facing that
 * says "buyer" goes through here, so a partner room never reads like a sales
 * pitch aimed at a prospect.
 */
export interface Vocabulary {
  roomNoun: string;
  /** The non-rep audience, title case. */
  counterparty: string;
  counterpartyLower: string;
  engagementLabel: string;
  audienceHintRep: string;
  /** Takes the counterparty's first name. */
  audienceHintOther: (name: string) => string;
}

const VOCABULARY: Record<RoomKind, Vocabulary> = {
  deal: {
    roomNoun: "Deal room",
    counterparty: "Buyer",
    counterpartyLower: "buyer",
    engagementLabel: "Buyer engagement",
    audienceHintRep: "You see engagement data, the video library and edit controls.",
    audienceHintOther: (name) => `Exactly what ${name} sees when they open the link.`,
  },
  partnership: {
    roomNoun: "Partner room",
    counterparty: "Partner",
    counterpartyLower: "partner",
    engagementLabel: "Partner engagement",
    audienceHintRep: "You see engagement data, the video library and edit controls.",
    audienceHintOther: (name) => `Exactly what ${name} sees when they open the link.`,
  },
};

export function vocabularyFor(kind: RoomKind): Vocabulary {
  return VOCABULARY[kind];
}

/** First name, for the conversational copy above. */
export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

/** Coarse relative time. Real telemetry replaces the source, not this formatter. */
/**
 * Bare elapsed time ("just now", "4h", "2d") for timestamps that already sit
 * under their own label. relativeTime is phrased for room telemetry and reads
 * wrong anywhere else.
 */
export function shortAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

/**
 * Same elapsed time as a phrase that reads inside a sentence. Separate from
 * shortAgo because "just now" takes no "ago" and the compact form takes no
 * suffix at all.
 */
export function agoPhrase(iso: string): string {
  const short = shortAgo(iso);
  return short === "just now" || short === "" ? short : `${short} ago`;
}

export function relativeTime(iso: string | null): string {
  if (!iso) return "Not opened yet";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "Not opened yet";
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return "Viewed just now";
  if (mins < 60) return `Last viewed ${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `Last viewed ${hours}h ago`;
  const days = Math.round(hours / 24);
  return `Last viewed ${days}d ago`;
}
