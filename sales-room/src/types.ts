export type Audience = "rep" | "buyer";
export type RoomView = "case" | "files" | "videos";
export type DocExt = "PDF" | "XLSX" | "DOCX";
export type DocGroup = "Built for you" | "From Meridian" | "From 1Fort";

export interface DocRow {
  label: string;
  value: string;
}

export interface RoomDocument {
  id: string;
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
