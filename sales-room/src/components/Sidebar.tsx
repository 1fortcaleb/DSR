import type { Audience, RoomView } from "../types";
import { useRooms } from "../context/RoomsContext";
import { firstName, relativeTime } from "../lib/vocabulary";
import { ChatIcon, DocIcon, FolderIcon, SlidersIcon, UsersIcon, VideoIcon } from "./icons";
// Dark-ground lockup, derived from logo-1fort.png: the neutral wordmark is
// whitened, the blue/indigo mark is untouched. Regenerate from that source
// rather than editing this file if the logo ever changes.
import logo from "../assets/logo-1fort-dark.png";

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

/** Secondary control on the dark ground: raised surface rather than white. */
const navButton = "flex w-full items-center justify-center gap-2 rounded-md border border-nav-line bg-nav-raised px-3 py-[9px] font-sans text-xs font-bold text-nav-body cursor-pointer transition-all hover:border-nav-faint hover:bg-nav-active hover:text-nav-hi";

export function Sidebar({ audience, setAudience, view, setView, curatedCount }: SidebarProps) {
  const isRep = audience === "rep";
  const { activeRoom, vocabulary } = useRooms();
  const { account } = activeRoom;
  const contactFirstName = firstName(account.counterparty.name) || "they";

  return (
    <aside className="sticky top-0 flex h-screen flex-col gap-[34px] border-r border-nav-line bg-nav px-[22px] pt-7 pb-8 box-border">
      <div className="flex items-center gap-2.5">
        <img src={logo} alt="1Fort" className="h-5 w-auto" />
        <span className="border-l border-nav-line pl-2.5 font-mono text-[10px] tracking-[0.1em] text-nav-faint uppercase">
          {vocabulary.roomNoun}
        </span>
      </div>

      <div className="flex flex-col gap-3.5">
        <div className="flex flex-col gap-[3px]">
          <div className="text-[19px] font-bold tracking-[-0.01em] text-nav-hi">{account.company}</div>
          <div className="text-xs text-nav-muted">
            {account.counterparty.name
              ? `Prepared with ${account.counterparty.name}${account.counterparty.title ? `, ${account.counterparty.title}` : ""}`
              : "No contact set"}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded px-[9px] py-1 text-[11px] font-bold ${
              activeRoom.status === "live"
                ? "bg-live/15 text-live"
                : "bg-nav-raised text-nav-muted"
            }`}
          >
            <span
              className={`h-[5px] w-[5px] rounded-full ${
                activeRoom.status === "live" ? "bg-live" : "bg-nav-faint"
              }`}
            />
            {activeRoom.status === "live" ? "Live" : activeRoom.status === "draft" ? "Draft" : "Archived"}
          </span>
          <span className="text-[11px] text-nav-faint">{relativeTime(activeRoom.lastViewedAt)}</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="font-mono text-[10px] tracking-[0.12em] text-nav-faint uppercase">Viewing as</div>
        <div className="grid grid-cols-2 gap-[3px] rounded-[7px] bg-nav-raised p-[3px]">
          <button
            onClick={() => setAudience("rep")}
            className={`rounded-[5px] px-2 py-[7px] font-sans text-[11.5px] font-bold cursor-pointer transition-all ${
              isRep ? "bg-nav-active text-nav-hi shadow-sm" : "bg-transparent text-nav-faint hover:text-nav-body"
            }`}
          >
            Rep
          </button>
          <button
            onClick={() => setAudience("buyer")}
            className={`rounded-[5px] px-2 py-[7px] font-sans text-[11.5px] font-bold cursor-pointer transition-all ${
              !isRep ? "bg-nav-active text-nav-hi shadow-sm" : "bg-transparent text-nav-faint hover:text-nav-body"
            }`}
          >
            {vocabulary.counterparty}
          </button>
        </div>
        <div className="text-[10.5px] leading-[1.45] text-nav-faint">
          {isRep
            ? vocabulary.audienceHintRep
            : vocabulary.audienceHintOther(contactFirstName)}
        </div>
      </div>

      <nav className="flex flex-col gap-0">
        <div className="pb-2.5 font-mono text-[10px] tracking-[0.12em] text-nav-faint uppercase">In this room</div>
        <button
          onClick={() => setView("case")}
          className={`${navLabel} hover:text-nav-hi ${view === "case" ? "font-bold text-nav-hi" : "font-normal text-nav-body"}`}
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <DocIcon className="flex-none" />
            Business case
          </span>
          <span className={`font-mono text-[10px] ${view === "case" ? "text-periwinkle" : "text-nav-faint"}`}>1p</span>
        </button>
        <button
          onClick={() => setView("files")}
          className={`${navLabel} hover:text-nav-hi ${view === "files" ? "font-bold text-nav-hi" : "font-normal text-nav-body"}`}
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <FolderIcon className="flex-none" />
            Documents
          </span>
          <span className={`font-mono text-[10px] ${view === "files" ? "text-periwinkle" : "text-nav-faint"}`}>
            {activeRoom.documents.length}
          </span>
        </button>
        <button
          onClick={() => setView("videos")}
          className={`${navLabel} hover:text-nav-hi ${view === "videos" ? "font-bold text-nav-hi" : "font-normal text-nav-body"}`}
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <VideoIcon className="flex-none" />
            Video answers
          </span>
          <span className={`font-mono text-[10px] ${view === "videos" ? "text-periwinkle" : "text-nav-faint"}`}>
            {curatedCount}
          </span>
        </button>
        {isRep && (
          <button
            onClick={() => setView("manage")}
            className={`${navLabel} hover:text-nav-hi ${view === "manage" ? "font-bold text-nav-hi" : "font-normal text-nav-body"}`}
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <SlidersIcon className="flex-none" />
              Manage content
            </span>
          </button>
        )}
      </nav>

      <div className="mt-auto flex flex-col gap-3.5">
        <div className="font-mono text-[10px] tracking-[0.12em] text-nav-faint uppercase">Your team</div>
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-full bg-periwinkle text-[10px] font-bold text-nav">
              {initialsOf(account.owner.name)}
            </span>
            <span className="text-xs text-nav-body">
              {account.owner.name} · {account.owner.org}
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-full bg-periwinkle/15 text-[10px] font-bold text-periwinkle">
              {initialsOf(account.counterparty.name)}
            </span>
            <span className="text-xs text-nav-body">
              {account.counterparty.name || "No contact"} · {account.counterparty.org}
            </span>
          </div>
        </div>
        {isRep ? (
          <button className={navButton}>
            <UsersIcon />
            Room activity
          </button>
        ) : (
          <button className={navButton}>
            <ChatIcon />
            Ask {firstName(account.owner.name)} a question
          </button>
        )}
      </div>
    </aside>
  );
}
