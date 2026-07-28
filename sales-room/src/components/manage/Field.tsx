import type { ReactNode } from "react";

export function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-[10px] border border-border bg-white p-6">
      <div className="flex flex-col gap-1">
        <h3 className="m-0 text-[15px] font-bold tracking-[-0.01em] text-navy">{title}</h3>
        {hint && <p className="m-0 text-[11.5px] leading-[1.5] text-muted">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

export function Grid({ cols = 2, children }: { cols?: 1 | 2 | 3; children: ReactNode }) {
  const map = { 1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-3" } as const;
  return <div className={`grid ${map[cols]} gap-3`}>{children}</div>;
}

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  multiline?: boolean;
  rows?: number;
  mono?: boolean;
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  multiline = false,
  rows = 3,
  mono = false,
}: TextFieldProps) {
  const base =
    "w-full box-border rounded-md border border-border bg-white px-2.5 py-2 text-[13px] text-body outline-none transition-colors focus:border-blue focus:ring-2 focus:ring-blue-bg";
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="font-mono text-[10px] tracking-[0.1em] text-faint uppercase">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          rows={rows}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={`${base} resize-y leading-[1.5] ${mono ? "font-mono" : ""}`}
        />
      ) : (
        <input
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={`${base} ${mono ? "font-mono" : ""}`}
        />
      )}
      {hint && <span className="text-[10.5px] leading-[1.4] text-faint">{hint}</span>}
    </label>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="font-mono text-[10px] tracking-[0.1em] text-faint uppercase">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="w-full box-border cursor-pointer rounded-md border border-border bg-white px-2.5 py-2 text-[13px] text-body outline-none focus:border-blue"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Button({
  children,
  onClick,
  variant = "secondary",
  disabled,
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  title?: string;
}) {
  const styles = {
    primary:
      "border-none bg-blue text-white hover:bg-blue-hover active:translate-y-px disabled:bg-faintest",
    secondary:
      "border border-border bg-white text-gray-800 hover:border-faintest hover:bg-row-hover disabled:text-faint",
    danger: "border border-border bg-white text-red hover:border-red hover:bg-red/5",
  } as const;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-md px-3 py-2 font-sans text-xs font-bold transition-all disabled:cursor-not-allowed ${styles[variant]}`}
    >
      {children}
    </button>
  );
}

/** A removable row in a repeatable list. */
export function ListRow({ children, onRemove }: { children: ReactNode; onRemove?: () => void }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 rounded-md border border-border-soft bg-row-hover p-2.5">
      <div className="flex min-w-0 flex-col gap-2">{children}</div>
      {onRemove && (
        <button
          onClick={onRemove}
          aria-label="Remove"
          className="mt-0.5 flex-none cursor-pointer rounded border-none bg-transparent px-1.5 py-0.5 font-mono text-[11px] text-faint transition-colors hover:text-red"
        >
          ✕
        </button>
      )}
    </div>
  );
}
