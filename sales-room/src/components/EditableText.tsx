import {
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type KeyboardEvent,
  type Ref,
} from "react";
import { RoomsContext } from "../context/RoomsContext";
import { RedlineText } from "./RedlineText";

interface EditableTextProps {
  value: string;
  onChange: (next: string) => void;
  className?: string;
  as?: ElementType;
  /**
   * Size the field to its content instead of its container. Use only for values
   * that sit inside a sentence or a horizontal row, where a full-width field
   * would break the layout. Content that wraps must NOT use this — an input
   * cannot wrap, so the surrounding box would change height on edit.
   */
  inline?: boolean;
  /** Allow newlines: Enter inserts one, Cmd/Ctrl+Enter commits. */
  multiline?: boolean;
  /** Renders inert plain text — used for the buyer view, which can't edit. */
  readOnly?: boolean;
  /**
   * Shown instead of an unfilled value, to the rep only.
   *
   * A slot the template left as "—" is a slot nobody has filled in, and a lone
   * em-dash does not read as something you can click. The counterparty still
   * sees the dash: a hint like "Today?" is an instruction to the rep, not a
   * statement about the deal.
   */
  placeholder?: string;
  /**
   * Inline styles the caller computes from the content itself — type that
   * steps down as the text lengthens, for instance. Applied to the editing
   * field as well as the display element, so a field never opens at a
   * different size from the text it replaced.
   */
  style?: CSSProperties;
  ariaLabel?: string;
}

/**
 * Click-to-edit text.
 *
 * The editing field is deliberately isomorphic with the display element: it
 * inherits the same className (font, size, leading, colour), the same width,
 * and is pinned to the measured height of the text it replaces — so opening a
 * field never reflows the surrounding layout. Form controls don't derive their
 * height from `line-height` the way text does, so measuring is more reliable
 * than trying to match metrics per field.
 */
export function EditableText({
  value,
  onChange,
  className = "",
  as = "span",
  inline = false,
  multiline = false,
  readOnly = false,
  placeholder,
  style,
  ariaLabel,
}: EditableTextProps) {
  /** An em-dash is the templates' way of saying "not filled in yet". */
  const unfilled = !value.trim() || value.trim() === "—";
  // Read straight from context rather than passed down: every line on the page
  // can carry a mark, and threading the list through each of them would put the
  // whole redline model into the signature of every caller.
  const redlines = useContext(RoomsContext)?.activeRoom.flags ?? [];
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  /**
   * Geometry of the display element, captured at the moment editing starts.
   * Form controls don't inherit `line-height` (the UA sheet forces `normal`),
   * so it is copied across explicitly rather than via a class — a class would
   * also have to win a specificity race against the caller's own leading.
   */
  const [box, setBox] = useState<{ height: number; lineHeight: string } | null>(
    null,
  );
  const boxHeight = box?.height ?? null;
  const displayRef = useRef<HTMLElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!editing) setDraft(unfilled ? "" : value);
  }, [value, editing, unfilled]);

  useEffect(() => {
    if (!editing) return;
    const field = inline ? inputRef.current : areaRef.current;
    field?.focus();
    field?.select();
  }, [editing, inline]);

  // Hold the textarea at the exact (possibly fractional) height of the text it
  // replaced, and grow only once the content genuinely overflows that box.
  // Using scrollHeight unconditionally would round a fractional height up and
  // nudge the layout by a pixel or two on open.
  useLayoutEffect(() => {
    const el = areaRef.current;
    if (!editing || inline || !el) return;
    el.style.height = boxHeight != null ? `${boxHeight}px` : "auto";
    if (el.scrollHeight > el.clientHeight + 1) {
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [editing, inline, draft, boxHeight]);

  const Tag = as;

  if (readOnly) {
    return (
      <Tag className={className}>
        <RedlineText value={value} redlines={redlines} />
      </Tag>
    );
  }

  function startEditing() {
    const el = displayRef.current;
    setBox(
      el
        ? {
            height: el.getBoundingClientRect().height,
            lineHeight: getComputedStyle(el).lineHeight,
          }
        : null,
    );
    setEditing(true);
  }

  function commit() {
    // Empty means "leave it as it was" — except on a slot that was never
    // filled, where there is nothing to preserve and the dash should stay.
    const next = draft.trim() === "" ? value : draft;
    if (next !== value) onChange(next);
    setEditing(false);
  }

  function cancel() {
    setDraft(unfilled ? "" : value);
    setEditing(false);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      cancel();
      return;
    }
    if (e.key !== "Enter") return;
    if (multiline && !(e.metaKey || e.ctrlKey)) return; // let the newline through
    e.preventDefault();
    commit();
  }

  const fieldClass = `${className} box-border rounded-sm border-none bg-blue-bg px-1 -mx-1 py-0 outline-none ring-2 ring-blue ring-inset`;

  if (editing) {
    if (inline) {
      return (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          aria-label={ariaLabel}
          className={`${fieldClass} max-w-full align-baseline`}
          style={{
            ...style,
            width: `${Math.max(draft.length, 1) + 1.5}ch`,
            height: boxHeight ?? undefined,
            lineHeight: box?.lineHeight,
          }}
        />
      );
    }
    // Width compensates for the -mx-1 bleed so the textarea's text column is
    // exactly as wide as the display element's, and wraps at the same points.
    return (
      <textarea
        ref={areaRef}
        value={draft}
        rows={1}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        aria-label={ariaLabel}
        style={{ ...style, lineHeight: box?.lineHeight }}
        className={`${fieldClass} block w-[calc(100%+0.5rem)] resize-none overflow-hidden`}
      />
    );
  }

  return (
    <Tag
      ref={displayRef as Ref<HTMLElement>}
      tabIndex={0}
      onClick={startEditing}
      onKeyDown={(e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          startEditing();
        }
      }}
      aria-label={ariaLabel ?? "Click to edit"}
      title="Click to edit"
      style={style}
      className={`${className} cursor-text rounded-sm px-1 -mx-1 transition-colors hover:bg-blue-bg focus-visible:bg-blue-bg`}
    >
      {unfilled && placeholder ? (
        <span className="font-normal text-faintest italic no-underline decoration-dotted underline-offset-4 [text-decoration-line:underline]">
          {placeholder}
        </span>
      ) : (
        <RedlineText value={value} redlines={redlines} />
      )}
    </Tag>
  );
}
