import { useEffect, useRef, useState, type ElementType, type KeyboardEvent } from "react";

interface EditableTextProps {
  value: string;
  onChange: (next: string) => void;
  className?: string;
  as?: ElementType;
  /** Input takes the full width of its container instead of sizing to content. */
  fullWidth?: boolean;
  ariaLabel?: string;
}

/**
 * Click-to-edit text. Renders as plain `as` markup (inheriting surrounding
 * styles) until clicked, then swaps to an <input> with the same className
 * so the edit state stays visually consistent with the display state.
 */
export function EditableText({
  value,
  onChange,
  className = "",
  as = "span",
  fullWidth = false,
  ariaLabel,
}: EditableTextProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function commit() {
    const next = draft.trim() === "" ? value : draft;
    if (next !== value) onChange(next);
    setEditing(false);
  }

  function cancel() {
    setDraft(value);
    setEditing(false);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancel();
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        aria-label={ariaLabel}
        className={`${className} rounded-sm border-none bg-blue-bg px-1 -mx-1 outline-none ring-2 ring-blue ring-inset`}
        style={fullWidth ? { width: "100%" } : { width: `${Math.max(draft.length, 1) + 1.5}ch` }}
      />
    );
  }

  const Tag = as;
  return (
    <Tag
      tabIndex={0}
      onClick={() => setEditing(true)}
      onKeyDown={(e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setEditing(true);
        }
      }}
      aria-label={ariaLabel ?? "Click to edit"}
      title="Click to edit"
      className={`${className} cursor-text rounded-sm px-1 -mx-1 transition-colors hover:bg-blue-bg focus-visible:bg-blue-bg`}
    >
      {value}
    </Tag>
  );
}
