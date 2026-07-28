import { useState } from "react";
import { useAssets } from "../../context/AssetsContext";
import type { AssetKind } from "../../types";
import { AssetThumb } from "./AssetsEditor";

interface AssetPickerProps {
  label: string;
  assetId: string | undefined;
  onChange: (assetId: string | undefined) => void;
  /** Restrict the picker to one kind, e.g. images for a poster frame. */
  kind?: AssetKind;
}

/** Compact attach/detach control backed by the asset library. */
export function AssetPicker({ label, assetId, onChange, kind }: AssetPickerProps) {
  const { assets } = useAssets();
  const [open, setOpen] = useState(false);
  const current = assetId ? assets.find((a) => a.id === assetId) : undefined;
  const choices = kind ? assets.filter((a) => a.kind === kind) : assets;

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="font-mono text-[10px] tracking-[0.1em] text-faint uppercase">{label}</span>
      <div className="flex items-center gap-2">
        <div className="h-11 w-14 flex-none overflow-hidden rounded border border-border bg-gray-100">
          {current ? (
            <AssetThumb asset={current} />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="font-mono text-[9px] text-faintest">NONE</span>
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate text-[11.5px] text-body">{current?.name ?? "No asset attached"}</span>
          <div className="flex gap-1.5">
            <button
              onClick={() => setOpen((o) => !o)}
              className="cursor-pointer rounded border border-border bg-white px-2 py-1 font-sans text-[11px] font-bold text-gray-800 transition-colors hover:bg-row-hover"
            >
              {open ? "Close" : current ? "Replace" : "Attach"}
            </button>
            {current && (
              <button
                onClick={() => onChange(undefined)}
                className="cursor-pointer rounded border border-border bg-white px-2 py-1 font-sans text-[11px] font-bold text-red transition-colors hover:bg-red/5"
              >
                Detach
              </button>
            )}
          </div>
        </div>
      </div>

      {open && (
        <div className="mt-1 max-h-52 overflow-y-auto rounded-md border border-border bg-white p-2">
          {choices.length === 0 ? (
            <p className="m-0 p-2 text-[11.5px] text-muted">
              No {kind ?? "assets"} in the library yet — add some under Assets.
            </p>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(92px,1fr))] gap-2">
              {choices.map((a) => (
                <button
                  key={a.id}
                  onClick={() => {
                    onChange(a.id);
                    setOpen(false);
                  }}
                  className={`flex cursor-pointer flex-col overflow-hidden rounded border text-left transition-colors ${
                    a.id === assetId ? "border-blue" : "border-border hover:border-faintest"
                  }`}
                >
                  <div className="aspect-[4/3] bg-gray-100">
                    <AssetThumb asset={a} />
                  </div>
                  <span className="truncate px-1.5 py-1 text-[10px] text-body">{a.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
