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

/**
 * A target outcome: what changes if this works, stated as a movement.
 *
 * From/to rather than a single number, because "faster quoting" is an
 * aspiration and "11.5 days to under 2" is something the reader can agree or
 * disagree with. That is the whole job of the page.
 */
export interface CaseOutcome {
  id: string;
  label: string;
  /** Where they are now. Empty when the baseline isn't known yet. */
  from: string;
  /** Where this should get them. */
  to: string;
}

/**
 * Someone whose position on this decides whether it happens.
 *
 * Rep-only. Never rendered in the counterparty's view and stripped from the
 * share payload server-side — naming a colleague as opposed, in writing, on a
 * page that gets forwarded, is a hard thing to take back.
 */
export interface CaseStakeholder {
  id: string;
  name: string;
  /** Their role or team, as the reader would recognise it. */
  role: string;
  /** Why they want this, or why they'll resist it. */
  why: string;
}

/**
 * Every rep-editable string on the business case page.
 *
 * The order of the fields is the order of the argument: an executive priority,
 * the problem, the evidence, what we propose, what changes if it works, what
 * it costs, and what happens next. The two stakeholder lists sit outside that
 * argument — they are the rep's own read of the politics, and they never leave
 * the building.
 */
export interface CaseContent {
  kicker: string;
  pageCount: string;
  /** Tied to an executive priority, never to the product. */
  headline: string;
  /** Despite X → can't achieve Z → which means (persons) → deal with R → costs S. */
  framingLabel: string;
  framing: CaseFramingLine[];
  /** Evidence for the problem, not for the solution. */
  statsLabel: string;
  statsSource: string;
  stats: CaseStat[];
  /** What we are proposing to do about it. A commitment, not a description. */
  approachLabel: string;
  approachBody: string;
  approachBullets: CaseBullet[];
  /** What changes if it works. Measurable wherever the sources allow. */
  outcomesLabel: string;
  outcomes: CaseOutcome[];
  outcomesFootnote: string;
  /** Cost, people, time. Ambiguity here is what kills deals. */
  investmentLabel: string;
  investmentValue: string;
  investmentCaption: string;
  investmentRows: CaseRow[];
  investmentFootnote: string;
  nextLabel: string;
  weeks: CaseWeek[];
  footerNote: string;
  footerRef: string;
  /** Rep-only: who wants this to happen. Never sent to the counterparty. */
  champions: CaseStakeholder[];
  /** Rep-only: who will resist it, and why. Never sent to the counterparty. */
  opponents: CaseStakeholder[];
}

/** Fields that must never reach the counterparty. Enforced server-side too. */
export const REP_ONLY_CASE_FIELDS = ["champions", "opponents"] as const;

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

/** One turn in the conversation hanging off a redline. */
export interface RedlineReply {
  id: string;
  /** Which side of the table it came from, so the thread reads as a dialogue. */
  side: "us" | "them";
  by: string;
  text: string;
  at: string;
}

/**
 * A mark on one passage of the page.
 *
 * Modelled on redlining a contract rather than filling in a feedback form: you
 * strike the words you disagree with and write what they should say instead.
 * A proposal is the point — "this is wrong" starts an argument, "make it four
 * days" starts a negotiation, and only the second one can be accepted.
 *
 * `proposed` is null when someone only wants to ask a question, which is a real
 * thing people do to a document and shouldn't require inventing a replacement.
 *
 * Raised by selecting text, so the page carries no per-line controls and the
 * gesture costs nothing until there is something to say.
 */
export interface FlaggedPassage {
  id: string;
  /** The text they selected, stored verbatim so the rep sees what they meant. */
  quote: string;
  /**
   * The line the quote was taken from, whole, as it read when they marked it.
   *
   * Without this a short quote is ambiguous: "11.5" appears in a stat, in an
   * outcome and in the footnote, and a mark on one of them would strike all
   * three and rewrite whichever came first. The full line identifies which one
   * they meant. Empty on marks raised before anchoring existed.
   */
  context: string;
  /** What it should say instead. Null for a comment with no counter-proposal. */
  proposed: string | null;
  /** Why — the argument for the change, or the question being asked. */
  note: string;
  at: string;
  by: string;
  /** Who raised it. Both sides can mark up: that is what makes it a negotiation. */
  side: "us" | "them";
  /** Accepted rewrites the page; rejected keeps the thread but drops the mark. */
  status: "open" | "accepted" | "rejected";
  replies: RedlineReply[];
  /** Legacy: superseded by `status`, kept so old rows still load. */
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
  /** Hosted URL once the bytes are in Storage. Absent in local-only mode. */
  url?: string;
  origin: AssetOrigin;
  /** Prompt that produced a generated asset. */
  prompt?: string;
  createdAt: string;
}
