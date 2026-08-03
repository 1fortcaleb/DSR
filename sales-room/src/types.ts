export type Audience = "rep" | "buyer";
export type RoomView = "case" | "files" | "videos" | "manage";

/**
 * Rooms serve two relationship types. The shape is identical; only the
 * vocabulary differs (a "buyer" on a deal is a "partner" on a partnership),
 * so the distinction is a field rather than a separate model.
 */
export type RoomKind = "deal" | "partnership";
export type RoomStatus = "draft" | "live" | "archived";

/**
 * Who the page is about.
 *
 * "specific" is the room built after discovery, with their numbers in it.
 * "archetype" is the version you can send before you have any: it describes
 * the kind of operation we're built for, and asks whether that's them. Same
 * page, same components — the copy is general and the question is different.
 */
export type RoomMode = "specific" | "archetype";

export interface RoomParty {
  name: string;
  title: string;
  org: string;
}

export interface RoomAccount {
  /** The counterparty organisation the room is prepared for. */
  company: string;
  /** Person on the other side — buyer on a deal, partner contact on a partnership. */
  counterparty: RoomParty;
  /** Owner of the room on our side. */
  owner: RoomParty;
}
export type DocExt = "PDF" | "XLSX" | "DOCX";
export type DocGroup = "Built for you" | "From Meridian" | "From 1Fort";

export interface DocRow {
  label: string;
  value: string;
}

export interface RoomDocument {
  id: string;
  /** Backing file in the asset library, if one has been attached. */
  assetId?: string;
  group: DocGroup;
  ext: DocExt;
  name: string;
  meta: string;
  kicker: string;
  docTitle: string;
  pages: number;
  unread: boolean;
  rows: DocRow[];
  body: string;
  summary: string[];
}

/**
 * A document, call, or file the 1-pager was generated from. Reps toggle these
 * on and off to control what the next regeneration draws on.
 */
export interface GeneratedSource {
  id: string;
  label: string;
  used: boolean;
  /** Full text when the source was pasted in, e.g. meeting notes. */
  text?: string;
}

export interface CaseFramingLine {
  id: string;
  /** Fixed connective text ("Despite", "we still can't"). */
  lead: string;
  /** The bracketed claim, rendered in blue. */
  value: string;
}

export interface CaseStat {
  id: string;
  value: string;
  unit?: string;
  label: string;
  accent: "navy" | "red";
}

export interface CaseBullet {
  id: string;
  text: string;
}

export interface CaseRow {
  id: string;
  label: string;
  value: string;
  accent: "ink" | "green";
}

export interface CaseWeek {
  id: string;
  num: string;
  title: string;
  sub: string;
}

/** Every rep-editable string on the business case page. */
export interface CaseContent {
  kicker: string;
  pageCount: string;
  headline: string;
  framingLabel: string;
  framing: CaseFramingLine[];
  statsLabel: string;
  statsSource: string;
  stats: CaseStat[];
  changesLabel: string;
  changesBody: string;
  changesBullets: CaseBullet[];
  yearOneLabel: string;
  yearOneValue: string;
  yearOneCaption: string;
  yearOneRows: CaseRow[];
  yearOneFootnote: string;
  nextLabel: string;
  weeks: CaseWeek[];
  footerNote: string;
  footerRef: string;
}

/* -------------------------------------------------------------- feedback */

/**
 * The counterparty's answer to the whole page.
 *
 * One verdict, not a per-line sign-off: nobody ratifies a one-pager clause by
 * clause. Agreement is a single gesture, and disagreement is an exception they
 * describe in their own words.
 */
export type Verdict = "holds" | "concerns";

export interface RoomFeedback {
  verdict: Verdict;
  /** What's off, in their words. Only meaningful alongside "concerns". */
  message?: string;
  at: string;
  /** Captured at reply time so it survives a contact rename. */
  by: string;
}

/**
 * A specific passage the counterparty highlighted and commented on. Raised by
 * selecting text, so the page carries no per-line controls and the gesture
 * costs nothing until they actually want to say something.
 */
export interface FlaggedPassage {
  id: string;
  /** The text they selected, stored verbatim so the rep sees what they meant. */
  quote: string;
  note: string;
  at: string;
  by: string;
  /** Set once the rep has dealt with it. */
  resolved?: boolean;
}

/** Measured buyer telemetry — read-only, not rep-editable copy. */
export interface EngagementRow {
  id: string;
  label: string;
  time: string;
  pct: number;
}

export interface VideoChapter {
  time: string;
  label: string;
}

export interface RoomVideo {
  id: string;
  /**
   * Where the video actually plays from: a Loom/Vidyard/YouTube share link, or
   * a direct file URL. A link is preferred — it reaches the counterparty with
   * nothing to host.
   */
  url?: string;
  /** Uploaded video in the asset library, as an alternative to a link. */
  videoAssetId?: string;
  /** Poster frame from the asset library. */
  posterAssetId?: string;
  kicker: string;
  title: string;
  dur: string;
  by: string;
  placeholder: string;
  chapters: VideoChapter[];
  watched: string;
  pct: number;
  note: string;
}

/** One deal room or partner room, with all of its content. */
export interface Room {
  id: string;
  kind: RoomKind;
  mode: RoomMode;
  status: RoomStatus;
  /** Internal label for the rooms index; not shown to the counterparty. */
  name: string;
  account: RoomAccount;
  content: CaseContent;
  sources: GeneratedSource[];
  documents: RoomDocument[];
  videos: RoomVideo[];
  /** Recorded videos not yet surfaced in the room. */
  library: RoomVideo[];
  curatedVideoIds: string[];
  /** Their verdict on the page as a whole; null until they answer. */
  feedback: RoomFeedback | null;
  /** Passages they highlighted and commented on. */
  flags: FlaggedPassage[];
  engagement: EngagementRow[];
  /** ISO timestamp; rendered as a relative label. Real telemetry once a backend exists. */
  lastViewedAt: string | null;
  updatedAt: string;
}

/* ----------------------------------------------------------------- assets */

export type AssetKind = "image" | "video" | "document";
/** Uploaded by a rep, or produced by the model once generation is connected. */
export type AssetOrigin = "uploaded" | "generated";

/** Metadata for one stored file. The bytes live in IndexedDB under the same id. */
export interface Asset {
  id: string;
  name: string;
  kind: AssetKind;
  mimeType: string;
  sizeBytes: number;
  /** Small data URL used in grids and room tiles; null if none could be made. */
  thumbnail: string | null;
  origin: AssetOrigin;
  /** Prompt that produced a generated asset. */
  prompt?: string;
  createdAt: string;
}
