import { useState } from "react";
import { useRooms } from "../../context/RoomsContext";
import { relativeTime } from "../../lib/vocabulary";
import type { RoomKind } from "../../types";
import { CaseView } from "../CaseView";
import { Button, SelectField, TextField } from "./Field";
import { AccountEditor, CaseEditor, DocumentsEditor, SourcesEditor, VideosEditor } from "./editors";

type SectionId = "account" | "case" | "sources" | "documents" | "videos";

const SECTIONS: { id: SectionId; label: string; hint: string }[] = [
  { id: "account", label: "Room & account", hint: "Who this room is for" },
  { id: "case", label: "Business case", hint: "The 1-pager copy" },
  { id: "sources", label: "Sources", hint: "What it generates from" },
  { id: "documents", label: "Documents", hint: "Files in the room" },
  { id: "videos", label: "Video answers", hint: "What's visible" },
];

export function ManageView() {
  const { rooms, activeRoom, activeRoomId, setActiveRoomId, createRoom, duplicateRoom, deleteRoom, resetAll } =
    useRooms();
  const [section, setSection] = useState<SectionId>("account");
  const [creating, setCreating] = useState(false);
  const [newKind, setNewKind] = useState<RoomKind>("deal");
  const [newCompany, setNewCompany] = useState("");

  function submitNewRoom() {
    if (!newCompany.trim()) return;
    createRoom(newKind, newCompany);
    setNewCompany("");
    setCreating(false);
    setSection("account");
  }

  return (
    <div className="grid h-screen grid-cols-[236px_minmax(420px,1fr)_minmax(360px,0.9fr)] items-start">
      {/* Rooms index */}
      <aside className="flex h-screen flex-col gap-4 overflow-y-auto border-r border-border bg-white px-4 pt-8 pb-6">
        <div className="flex items-center justify-between gap-2">
          <h2 className="m-0 text-[15px] font-bold tracking-[-0.01em] text-navy">Rooms</h2>
          <span className="font-mono text-[10px] text-faintest">{rooms.length}</span>
        </div>

        <div className="flex flex-col gap-1">
          {rooms.map((room) => {
            const isActive = room.id === activeRoomId;
            return (
              <button
                key={room.id}
                onClick={() => setActiveRoomId(room.id)}
                className={`flex cursor-pointer flex-col gap-0.5 rounded-md border px-2.5 py-2 text-left transition-colors ${
                  isActive
                    ? "border-blue bg-blue-bg"
                    : "border-transparent bg-transparent hover:bg-row-hover"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span
                    className={`h-1.5 w-1.5 flex-none rounded-full ${
                      room.status === "live" ? "bg-live" : "bg-faintest"
                    }`}
                  />
                  <span
                    className={`truncate text-[12.5px] ${isActive ? "font-bold text-navy" : "text-body"}`}
                  >
                    {room.name}
                  </span>
                </span>
                <span className="pl-3 font-mono text-[9.5px] tracking-[0.08em] text-faint uppercase">
                  {room.kind} · {relativeTime(room.lastViewedAt).replace("Last viewed ", "")}
                </span>
              </button>
            );
          })}
        </div>

        {creating ? (
          <div className="flex flex-col gap-2 rounded-md border border-border bg-row-hover p-2.5">
            <TextField label="Company" value={newCompany} onChange={setNewCompany} placeholder="Acme Brokers" />
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
          <Button onClick={() => setCreating(true)}>+ New room</Button>
        )}

        <div className="mt-auto flex flex-col gap-1.5 border-t border-border-soft pt-3">
          <Button onClick={() => duplicateRoom(activeRoomId)}>Duplicate this room</Button>
          <Button
            variant="danger"
            onClick={() => deleteRoom(activeRoomId)}
            disabled={rooms.length <= 1}
            title={rooms.length <= 1 ? "Can't delete the only room" : undefined}
          >
            Delete this room
          </Button>
          <Button variant="danger" onClick={resetAll} title="Discard all local edits">
            Reset all to defaults
          </Button>
        </div>
      </aside>

      {/* Editors */}
      <div className="flex h-screen flex-col overflow-y-auto bg-panel">
        <div className="sticky top-0 z-10 flex flex-col gap-3 border-b border-border-soft bg-panel/95 px-7 pt-7 pb-3">
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-[10px] tracking-[0.12em] text-faint uppercase">
              Manage content
            </span>
            <h1 className="m-0 text-[22px] font-bold tracking-[-0.015em] text-navy">
              {activeRoom.name}
            </h1>
          </div>
          <nav className="flex flex-wrap gap-1">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => setSection(s.id)}
                title={s.hint}
                className={`cursor-pointer rounded-md border px-2.5 py-1.5 font-sans text-[12px] font-bold transition-colors ${
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

        <div className="px-7 pt-5 pb-16">
          {section === "account" && <AccountEditor />}
          {section === "case" && <CaseEditor />}
          {section === "sources" && <SourcesEditor />}
          {section === "documents" && <DocumentsEditor />}
          {section === "videos" && <VideosEditor />}
        </div>
      </div>

      {/* Live preview of the real room, rendered read-only at reduced scale */}
      <aside className="flex h-screen flex-col overflow-hidden border-l border-border bg-white">
        <div className="flex items-center justify-between gap-2 border-b border-border-soft px-5 py-3">
          <span className="font-mono text-[10px] tracking-[0.12em] text-faint uppercase">
            Live preview
          </span>
          <span className="font-mono text-[10px] text-faintest">as counterparty</span>
        </div>
        <div className="flex-1 overflow-y-auto bg-panel">
          <div
            className="origin-top-left"
            style={{ transform: "scale(0.5)", width: "200%", height: "200%" }}
          >
            <CaseView audience="buyer" />
          </div>
        </div>
      </aside>
    </div>
  );
}
