import type { Audience, RoomView } from "../types";
import { useRooms } from "../context/RoomsContext";
import { firstName, relativeTime } from "../lib/vocabulary";
import { ChatIcon, DocIcon, FolderIcon, SlidersIcon, UsersIcon, VideoIcon } from "./icons";
import logo from "../assets/logo-1fort.png";

interface SidebarProps {
  audience: Audience;
  setAudience: (a: Audience) => void;
  view: RoomView;
  setView: (v: RoomView) => void;
  curatedCount: number;
}

/** Two-letter avatar initials; falls back to a dash for an unset contact. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "—";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

const navLabel = "flex items-center justify-between gap-3 w-full bg-transparent border-none py-2 font-sans text-[13.5px] cursor-pointer text-left transition-colors";

export function Sidebar({ audience, setAudience, view, setView, curatedCount }: SidebarProps) {
  const isRep = audience === "rep";
  const { activeRoom, vocabulary } = useRooms();
  const { account } = activeRoom;
  const contactFirstName = firstName(account.counterparty.name) || "they";

  return (
    <aside className="sticky top-0 flex h-screen flex-col gap-[34px] border-r border-border px-[22px] pt-7 pb-8 box-border">
      <div className="flex items-center gap-2.5">
        <img src={logo} alt="1Fort" className="h-5 w-auto" />
        <span className="border-l border-border pl-2.5 font-mono text-[10px] tracking-[0.1em] text-faint uppercase">
          {vocabulary.roomNoun}
        </span>
      </div>

      <div className="flex flex-col gap-3.5">
        <div className="flex flex-col gap-[3px]">
          <div className="text-[19px] font-bold tracking-[-0.01em] text-navy">{account.company}</div>
          <div className="text-xs text-muted">
            {account.counterparty.name
              ? `Prepared with ${account.counterparty.name}${account.counterparty.title ? `, ${account.counterparty.title}` : ""}`
              : "No contact set"}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded px-[9px] py-1 text-[11px] font-bold ${
              activeRoom.status === "live" ? "bg-green-bg text-green" : "bg-gray-100 text-muted"
            }`}
          >
            <span
              className={`h-[5px] w-[5px] rounded-full ${
                activeRoom.status === "live" ? "bg-live" : "bg-faintest"
              }`}
            />
            {activeRoom.status === "live" ? "Live" : activeRoom.status === "draft" ? "Draft" : "Archived"}
          </span>
          <span className="text-[11px] text-faint">{relativeTime(activeRoom.lastViewedAt)}</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="font-mono text-[10px] tracking-[0.12em] text-faint uppercase">Viewing as</div>
        <div className="grid grid-cols-2 gap-[3px] rounded-[7px] bg-gray-100 p-[3px]">
          <button
            onClick={() => setAudience("rep")}
            className={`rounded-[5px] px-2 py-[7px] font-sans text-[11.5px] font-bold cursor-pointer transition-all ${
              isRep ? "bg-white text-navy shadow-sm" : "bg-transparent text-faint"
            }`}
          >
            Rep
          </button>
          <button
            onClick={() => setAudience("buyer")}
            className={`rounded-[5px] px-2 py-[7px] font-sans text-[11.5px] font-bold cursor-pointer transition-all ${
              !isRep ? "bg-white text-navy shadow-sm" : "bg-transparent text-faint"
            }`}
          >
            {vocabulary.counterparty}
          </button>
        </div>
        <div className="text-[10.5px] leading-[1.45] text-faint">
          {isRep
            ? vocabulary.audienceHintRep
            : vocabulary.audienceHintOther(contactFirstName)}
        </div>
      </div>

      <nav className="flex flex-col gap-0">
        <div className="pb-2.5 font-mono text-[10px] tracking-[0.12em] text-faint uppercase">In this room</div>
        <button
          onClick={() => setView("case")}
          className={`${navLabel} hover:text-navy ${view === "case" ? "font-bold text-navy" : "font-normal text-muted"}`}
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <DocIcon className="flex-none" />
            Business case
          </span>
          <span className={`font-mono text-[10px] ${view === "case" ? "text-navy" : "text-faint"}`}>1p</span>
        </button>
        <button
          onClick={() => setView("files")}
          className={`${navLabel} hover:text-navy ${view === "files" ? "font-bold text-navy" : "font-normal text-muted"}`}
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <FolderIcon className="flex-none" />
            Documents
          </span>
          <span className={`font-mono text-[10px] ${view === "files" ? "text-navy" : "text-faint"}`}>
            {activeRoom.documents.length}
          </span>
        </button>
        <button
          onClick={() => setView("videos")}
          className={`${navLabel} hover:text-navy ${view === "videos" ? "font-bold text-navy" : "font-normal text-muted"}`}
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <VideoIcon className="flex-none" />
            Video answers
          </span>
          <span className={`font-mono text-[10px] ${view === "videos" ? "text-navy" : "text-faint"}`}>
            {curatedCount}
          </span>
        </button>
        {isRep && (
          <button
            onClick={() => setView("manage")}
            className={`${navLabel} hover:text-navy ${view === "manage" ? "font-bold text-navy" : "font-normal text-muted"}`}
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <SlidersIcon className="flex-none" />
              Manage content
            </span>
          </button>
        )}
      </nav>

      <div className="mt-auto flex flex-col gap-3.5">
        <div className="font-mono text-[10px] tracking-[0.12em] text-faint uppercase">Your team</div>
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-full bg-navy text-[10px] font-bold text-white">
              {initialsOf(account.owner.name)}
            </span>
            <span className="text-xs text-body">
              {account.owner.name} · {account.owner.org}
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-full bg-blue-bg-soft text-[10px] font-bold text-blue">
              {initialsOf(account.counterparty.name)}
            </span>
            <span className="text-xs text-body">
              {account.counterparty.name || "No contact"} · {account.counterparty.org}
            </span>
          </div>
        </div>
        {isRep ? (
          <button className="flex w-full items-center justify-center gap-2 rounded-md border border-border bg-white px-3 py-[9px] font-sans text-xs font-bold text-gray-800 cursor-pointer transition-all hover:border-faintest hover:bg-row-hover">
            <UsersIcon />
            Room activity
          </button>
        ) : (
          <button className="flex w-full items-center justify-center gap-2 rounded-md border border-border bg-white px-3 py-[9px] font-sans text-xs font-bold text-gray-800 cursor-pointer transition-all hover:border-faintest hover:bg-row-hover">
            <ChatIcon />
            Ask {firstName(account.owner.name)} a question
          </button>
        )}
      </div>
    </aside>
  );
}
