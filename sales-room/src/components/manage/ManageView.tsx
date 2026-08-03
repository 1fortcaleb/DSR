import { useState } from "react";
import { useRooms } from "../../context/RoomsContext";
import { relativeTime } from "../../lib/vocabulary";
import type { RoomKind } from "../../types";
import { CaseView } from "../CaseView";
import { ImageIcon, SlidersIcon } from "../icons";
import { Button, SelectField, TextField } from "./Field";
import { AccountEditor, CaseEditor, DocumentsEditor, SourcesEditor, VideosEditor } from "./editors";
import { AssetsEditor } from "./AssetsEditor";
import { ShareEditor } from "./ShareEditor";
import { NotesImport } from "./NotesImport";
import { useAuth } from "../../context/AuthContext";

type SectionId = "notes" | "account" | "case" | "sources" | "documents" | "videos" | "share";

/** Per-room sections. The asset library is deliberately not one of these — it
 *  spans rooms, so filing it under a single room's name would be a lie. */
const SECTIONS: { id: SectionId; label: string; hint: string }[] = [
  { id: "notes", label: "Paste notes", hint: "Start the room from a Granola note" },
  { id: "account", label: "Room & account", hint: "Who this room is for" },
  { id: "case", label: "Business case", hint: "The 1-pager copy" },
  { id: "sources", label: "Sources", hint: "What it generates from" },
  { id: "documents", label: "Documents", hint: "Files in the room" },
  { id: "videos", label: "Video answers", hint: "What's visible" },
  { id: "share", label: "Send", hint: "Links you've sent to the counterparty" },
];

/** Keeps the docked preview legible; also sets the width it renders at. */
const PREVIEW_SCALE = 0.66;

export function ManageView({ onExit }: { onExit: () => void }) {
  const {
    rooms,
    activeRoom,
    activeRoomId,
    setActiveRoomId,
    createRoom,
    duplicateRoom,
    deleteRoom,
    resetAll,
    vocabulary,
  } = useRooms();
  // The rail picks a scope: one room's content, or the library that spans rooms.
  const [scope, setScope] = useState<"room" | "library">("room");
  // A new room opens on the paste step: it is the fastest way out of a blank
  // template, and the alternative is staring at "Headline goes here".
  const [section, setSection] = useState<SectionId>("notes");
  const [showPreview, setShowPreview] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKind, setNewKind] = useState<RoomKind>("deal");
  const [newCompany, setNewCompany] = useState("");

  // The preview mirrors one room, so the library pane hands its width back.
  const previewOpen = showPreview && scope === "room";

  function submitNewRoom() {
    if (!newCompany.trim()) return;
    createRoom(newKind, newCompany);
    setNewCompany("");
    setCreating(false);
    setScope("room");
    setSection("notes");
  }

  return (
    // The rail is the first column of the page grid, so it runs the full height
    // and the bar sits beside it rather than capping it.
    <div className="grid h-screen min-w-[1180px] grid-cols-[224px_minmax(0,1fr)] bg-panel">
      {/* Rail: which room, or the shared library */}
      <aside className="flex min-h-0 flex-col gap-4 overflow-y-auto border-r border-nav-line bg-nav px-3 pt-4 pb-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2 px-1">
            <span className="font-mono text-[10px] tracking-[0.12em] text-nav-faint uppercase">
              Rooms
            </span>
            <span className="font-mono text-[10px] text-nav-faint">{rooms.length}</span>
          </div>
          {rooms.map((room) => {
            const isActive = scope === "room" && room.id === activeRoomId;
            return (
              <button
                key={room.id}
                onClick={() => {
                  setActiveRoomId(room.id);
                  setScope("room");
                }}
                className={`flex cursor-pointer flex-col gap-0.5 rounded-md border px-2.5 py-2 text-left transition-colors ${
                  isActive
                    ? "border-periwinkle/40 bg-periwinkle/10"
                    : "border-transparent bg-transparent hover:bg-nav-raised"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span
                    className={`h-1.5 w-1.5 flex-none rounded-full ${
                      room.status === "live" ? "bg-live" : "bg-nav-faint"
                    }`}
                  />
                  <span
                    className={`truncate text-[12.5px] ${isActive ? "font-bold text-nav-hi" : "text-nav-body"}`}
                  >
                    {room.name}
                  </span>
                </span>
                <span className="pl-3 font-mono text-[9.5px] tracking-[0.08em] text-nav-faint uppercase">
                  {room.kind} · {relativeTime(room.lastViewedAt).replace("Last viewed ", "")}
                </span>
              </button>
            );
          })}

          {creating ? (
            <div className="mt-1 flex flex-col gap-2 rounded-md border border-nav-line bg-nav-raised p-2.5">
              <TextField
                label="Company"
                value={newCompany}
                onChange={setNewCompany}
                placeholder="Acme Brokers"
              />
              <SelectField<RoomKind>
                label="Type"
                value={newKind}
                options={[
                  { value: "deal", label: "Deal" },
                  { value: "partnership", label: "Partnership" },
                ]}
                onChange={setNewKind}
              />
              <div className="flex gap-1.5">
                <Button variant="primary" onClick={submitNewRoom} disabled={!newCompany.trim()}>
                  Create
                </Button>
                <Button onClick={() => setCreating(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setCreating(true)}
              className="mt-0.5 cursor-pointer rounded-md border border-dashed border-nav-line bg-transparent px-2.5 py-2 text-left font-sans text-[12px] font-bold text-nav-muted transition-colors hover:border-periwinkle hover:text-nav-hi"
            >
              + New room
            </button>
          )}
        </div>

        {/* Shared across every room, so it sits outside the room list */}
        <div className="flex flex-col gap-1.5 border-t border-nav-line pt-3">
          <span className="px-1 font-mono text-[10px] tracking-[0.12em] text-nav-faint uppercase">
            Shared
          </span>
          <button
            onClick={() => setScope("library")}
            className={`flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-2 text-left transition-colors ${
              scope === "library"
                ? "border-periwinkle/40 bg-periwinkle/10"
                : "border-transparent bg-transparent hover:bg-nav-raised"
            }`}
          >
            <ImageIcon className="flex-none text-nav-faint" />
            <span
              className={`truncate text-[12.5px] ${
                scope === "library" ? "font-bold text-nav-hi" : "text-nav-body"
              }`}
            >
              Asset library
            </span>
          </button>
        </div>

        <AccountFooter />

        <button
          onClick={resetAll}
          title="Discard all local edits in every room"
          className="w-full cursor-pointer rounded-md border-none bg-transparent px-2.5 py-1.5 text-left font-sans text-[11px] text-nav-faint transition-colors hover:text-red"
        >
          Reset all to defaults
        </button>
      </aside>
      <div className="flex min-h-0 min-w-0 flex-col">
        {/* One bar owns identity and the way out, so no second sidebar is needed */}
        <header className="flex flex-none items-center gap-4 border-b border-border bg-white px-5 py-2.5">
          <button
            onClick={onExit}
            className="flex flex-none cursor-pointer items-center gap-1.5 rounded-md border border-border bg-white px-2.5 py-1.5 font-sans text-[12px] font-bold text-gray-800 transition-colors hover:bg-row-hover"
          >
            ← Back to room
          </button>
          <span className="h-5 w-px flex-none bg-border" />
          <div className="flex min-w-0 items-center gap-2.5">
            <SlidersIcon className="flex-none text-faint" />
            <span className="font-mono text-[10px] tracking-[0.12em] text-faint uppercase">
              Manage content
            </span>
            <span className="truncate text-[14px] font-bold tracking-[-0.01em] text-navy">
              {scope === "library" ? "Asset library" : activeRoom.name}
            </span>
            {scope === "room" && (
              <span className="flex flex-none items-center gap-1.5 font-mono text-[9.5px] tracking-[0.08em] text-faint uppercase">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    activeRoom.status === "live" ? "bg-live" : "bg-faintest"
                  }`}
                />
                {activeRoom.kind} · {activeRoom.status}
              </span>
            )}
          </div>
          {scope === "room" && (
            <button
              onClick={() => setShowPreview((p) => !p)}
              className={`ml-auto flex-none cursor-pointer rounded-md border px-2.5 py-1.5 font-sans text-[12px] font-bold transition-colors ${
                showPreview
                  ? "border-blue bg-blue-bg text-navy"
                  : "border-border bg-white text-muted hover:bg-row-hover"
              }`}
            >
              {showPreview ? "Hide preview" : "Show preview"}
            </button>
          )}
        </header>

        <div
          className={`grid min-h-0 flex-1 ${
            previewOpen ? "grid-cols-[minmax(520px,1fr)_520px]" : "grid-cols-[minmax(0,1fr)]"
          }`}
        >
          {/* Editor */}
          <div className="flex min-h-0 min-w-0 flex-col overflow-y-auto">
            {scope === "room" && (
              <div className="sticky top-0 z-10 flex-none border-b border-border-soft bg-panel/95">
                <nav className="mx-auto flex w-full max-w-[1040px] gap-1 px-7 py-3">
                  {SECTIONS.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSection(s.id)}
                      title={s.hint}
                      className={`cursor-pointer rounded-md border px-2.5 py-1.5 font-sans text-[12px] font-bold whitespace-nowrap transition-colors ${
                        section === s.id
                          ? "border-blue bg-blue-bg text-navy"
                          : "border-border bg-white text-muted hover:bg-row-hover"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </nav>
              </div>
            )}

            {/* Capped so panels don't sprawl when the preview is hidden */}
            <div className="mx-auto w-full min-w-0 max-w-[1040px] px-7 pt-5 pb-16">
              {scope === "library" ? (
                <AssetsEditor />
              ) : (
                <>
                  {section === "account" && (
                    <div className="flex flex-col gap-5">
                      <AccountEditor />
                      {/* Room-scoped destructive actions belong with the room, not in the nav rail */}
                      <div className="flex items-center gap-2 rounded-[10px] border border-border bg-white p-4">
                        <Button onClick={() => duplicateRoom(activeRoomId)}>Duplicate this room</Button>
                        <Button
                          variant="danger"
                          onClick={() => deleteRoom(activeRoomId)}
                          disabled={rooms.length <= 1}
                          title={rooms.length <= 1 ? "Can't delete the only room" : undefined}
                        >
                          Delete this room
                        </Button>
                        <span className="ml-auto text-[11px] text-faint">
                          {vocabulary.roomNoun} for {activeRoom.account.company}
                        </span>
                      </div>
                    </div>
                  )}
                  {section === "case" && <CaseEditor />}
                  {section === "sources" && <SourcesEditor />}
                  {section === "documents" && <DocumentsEditor />}
                  {section === "videos" && <VideosEditor />}
                {section === "notes" && <NotesImport />}
                {section === "share" && <ShareEditor />}
                </>
              )}
            </div>
          </div>

          {/* Live preview of the real room, read-only */}
          {previewOpen && (
            <aside className="flex min-h-0 flex-col overflow-hidden border-l border-border bg-white">
              <div className="flex flex-none items-center justify-between gap-2 border-b border-border-soft px-5 py-2.5">
                <span className="font-mono text-[10px] tracking-[0.12em] text-faint uppercase">
                  Live preview
                </span>
                <span className="font-mono text-[10px] text-faintest">
                  as {vocabulary.counterpartyLower}
                </span>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto bg-panel">
                <div
                  className="origin-top-left"
                  style={{
                    transform: `scale(${PREVIEW_SCALE})`,
                    width: `${100 / PREVIEW_SCALE}%`,
                    height: `${100 / PREVIEW_SCALE}%`,
                  }}
                >
                  <CaseView audience="buyer" />
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}

/** Who you're signed in as, and the way out. Hidden in local mode. */
function AccountFooter() {
  const { cloud, email, signOut } = useAuth();
  if (!cloud) return null;
  return (
    <div className="mt-auto flex flex-col gap-1 border-t border-nav-line pt-3">
      <span className="truncate px-2.5 font-mono text-[9.5px] text-nav-faint">{email}</span>
      <button
        onClick={() => void signOut()}
        className="w-full cursor-pointer rounded-md border-none bg-transparent px-2.5 py-1.5 text-left font-sans text-[11px] text-nav-body transition-colors hover:text-white"
      >
        Sign out
      </button>
    </div>
  );
}
