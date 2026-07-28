import {
  useEffect,
  useRef,
  useState,
  type ElementType,
  type KeyboardEvent,
} from "react";

interface EditableTextProps {
  value: string;
  onChange: (next: string) => void;
  className?: string;
  as?: ElementType;
  /** Input takes the full width of its container instead of sizing to content. */
  fullWidth?: boolean;
  /** Renders a textarea; Enter inserts a newline, Cmd/Ctrl+Enter commits. */
  multiline?: boolean;
  /** Renders inert plain text — used for the buyer view, which can't edit. */
  readOnly?: boolean;
  ariaLabel?: string;
}

/**
 * Click-to-edit text. Renders as plain `as` markup (inheriting surrounding
 * styles) until clicked, then swaps to an input/textarea with the same
 * className so the edit state stays visually consistent with the display state.
 */
export function EditableText({
  value,
  onChange,
  className = "",
  as = "span",
  fullWidth = false,
  multiline = false,
  readOnly = false,
  ariaLabel,
}: EditableTextProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const fieldRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  useEffect(() => {
    if (editing) {
      fieldRef.current?.focus();
      fieldRef.current?.select();
    }
  }, [editing]);

  const Tag = as;

  if (readOnly) {
    return <Tag className={className}>{value}</Tag>;
  }

  function commit() {
    const next = draft.trim() === "" ? value : draft;
    if (next !== value) onChange(next);
    setEditing(false);
  }

  function cancel() {
    setDraft(value);
    setEditing(false);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      cancel();
      return;
    }
    if (e.key !== "Enter") return;
    // In multiline, plain Enter should insert a newline; only the modifier commits.
    if (multiline && !(e.metaKey || e.ctrlKey)) return;
    e.preventDefault();
    commit();
  }

  const editingClass = `${className} block rounded-sm border-none bg-blue-bg px-1 -mx-1 outline-none ring-2 ring-blue ring-inset`;

  if (editing) {
    if (multiline) {
      return (
        <textarea
          ref={fieldRef}
          value={draft}
          rows={Math.max(3, Math.ceil(draft.length / 72))}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          aria-label={ariaLabel}
          className={`${editingClass} w-full resize-y`}
        />
      );
    }
    return (
      <input
        ref={fieldRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        aria-label={ariaLabel}
        className={editingClass}
        style={fullWidth ? { width: "100%" } : { width: `${Math.max(draft.length, 1) + 1.5}ch` }}
      />
    );
  }

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
