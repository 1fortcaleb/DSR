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
