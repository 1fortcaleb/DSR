import { useState } from "react";
import { useRooms } from "../context/RoomsContext";
import { EditableText } from "./EditableText";
import { PlusIcon, XIcon } from "./icons";
import type { CaseStakeholder } from "../types";

/**
 * Who's for this and who's against, beside the page rather than buried in the
 * CMS.
 *
 * This is the first thing a rep thinks after a call and the last place a CMS
 * would put it. It sits in the rep-only rail so it's in view while they read
 * the page — and so the objection gets written down while it's still fresh,
 * which is the only time anyone actually does it.
 *
 * Nothing here reaches the counterparty: the buyer view never mounts this rail,
 * and the share payload has these fields stripped server-side.
 */
export function StakeholderPanel() {
  const { activeRoom, setField } = useRooms();
  const { champions, opponents } = activeRoom.content;
  const [adding, setAdding] = useState<"champions" | "opponents" | null>(null);

  const add = (field: "champions" | "opponents", name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setField(field, [
      ...activeRoom.content[field],
      { id: `p-${Date.now().toString(36)}`, name: trimmed, role: "", why: "" },
    ]);
    setAdding(null);
  };

  const remove = (field: "champions" | "opponents", id: string) =>
    setField(field, activeRoom.content[field].filter((p) => p.id !== id));

  const group = (
    field: "champions" | "opponents",
    label: string,
    empty: string,
    people: CaseStakeholder[],
    accent: string,
  ) => (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-[9.5px] tracking-[0.1em] text-faint uppercase">{label}</span>
        <button
          onClick={() => setAdding(adding === field ? null : field)}
          aria-label={`Add to ${label}`}
          className="inline-flex cursor-pointer items-center gap-1 rounded border-none bg-transparent p-0 font-sans text-[10.5px] text-blue hover:underline"
        >
          <PlusIcon size={9} />
          Add
        </button>
      </div>

      {!people.length && adding !== field && (
        <p className="m-0 text-[11px] leading-[1.45] text-faintest">{empty}</p>
      )}

      {people.map((p) => (
        <div key={p.id} className="group flex flex-col gap-0.5 border-l-2 pl-2.5" style={{ borderColor: accent }}>
          <div className="flex items-baseline justify-between gap-2">
            <EditableText
              value={p.name}
              onChange={(v) => setField(field, people.map((x) => (x.id === p.id ? { ...x, name: v } : x)))}
              inline
              ariaLabel={`${label} name`}
              className="text-[12px] font-bold text-gray-900"
            />
            <button
              onClick={() => remove(field, p.id)}
              aria-label={`Remove ${p.name}`}
              className="flex-none cursor-pointer border-none bg-transparent p-0 text-faintest opacity-0 transition-opacity group-hover:opacity-100 hover:text-red"
            >
              <XIcon size={9} />
            </button>
          </div>
          <EditableText
            value={p.role || "Role?"}
            onChange={(v) => setField(field, people.map((x) => (x.id === p.id ? { ...x, role: v } : x)))}
            inline
            ariaLabel={`${label} role`}
            className="text-[10.5px] text-faint"
          />
          <EditableText
            value={p.why || "Why do they care?"}
            onChange={(v) => setField(field, people.map((x) => (x.id === p.id ? { ...x, why: v } : x)))}
            multiline
            ariaLabel={`${label} reason`}
            className="text-[11px] leading-[1.45] text-muted"
          />
        </div>
      ))}

      {adding === field && (
        <input
          autoFocus
          placeholder="Name, then Enter"
          onKeyDown={(e) => {
            if (e.key === "Enter") add(field, e.currentTarget.value);
            if (e.key === "Escape") setAdding(null);
          }}
          onBlur={(e) => add(field, e.currentTarget.value)}
          className="w-full rounded border border-border bg-white px-2 py-1.5 font-sans text-[11.5px] text-body outline-none placeholder:text-faintest focus:border-blue"
        />
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-4 rounded-[10px] border border-border bg-white p-5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[12.5px] font-bold text-gray-900">Who decides</span>
        <span className="font-mono text-[9px] tracking-[0.08em] text-faintest uppercase">
          Never sent
        </span>
      </div>

      {group("champions", "Wants this", "Who'll push for it?", champions, "#1F9D6B")}
      {group("opponents", "Will resist", "Who'll push back, and why?", opponents, "#E5484D")}

      <p className="m-0 text-[10.5px] leading-[1.45] text-faint">
        Yours alone. Stripped from every share link by the server, so you can be blunt.
      </p>
    </div>
  );
}
