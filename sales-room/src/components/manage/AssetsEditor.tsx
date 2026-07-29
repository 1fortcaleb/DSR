import { useRef, useState } from "react";
import { useAssets } from "../../context/AssetsContext";
import { useRooms } from "../../context/RoomsContext";
import { formatBytes } from "../../lib/assetStore";
import type { Asset, AssetKind } from "../../types";
import { Button, Section, SelectField, TextField } from "./Field";

const KIND_FILTERS: { value: AssetKind | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "image", label: "Images" },
  { value: "video", label: "Video" },
  { value: "document", label: "Documents" },
];

/** Thumbnail tile used in the library grid and by the asset pickers. */
export function AssetThumb({ asset, className = "" }: { asset: Asset; className?: string }) {
  if (asset.thumbnail) {
    return (
      <img
        src={asset.thumbnail}
        alt=""
        className={`h-full w-full object-cover ${className}`}
        loading="lazy"
      />
    );
  }
  return (
    <div className={`flex h-full w-full items-center justify-center bg-gray-100 ${className}`}>
      <span className="font-mono text-[10px] text-faint">NO PREVIEW</span>
    </div>
  );
}

export function AssetsEditor() {
  const { assets, upload, remove, rename, uploading, loading, error, dismissError, generate, generationLive, openUrl } =
    useAssets();
  const { rooms, activeRoom } = useRooms();
  const [filter, setFilter] = useState<AssetKind | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [genKind, setGenKind] = useState<AssetKind>("image");
  const inputRef = useRef<HTMLInputElement>(null);

  const shown = filter === "all" ? assets : assets.filter((a) => a.kind === filter);
  const selected = assets.find((a) => a.id === selectedId) ?? null;

  /**
   * Names of every room referencing an asset. Scans all rooms, not just the
   * active one — the library is shared, so an asset attached elsewhere must
   * still read as in use before someone deletes it.
   */
  const usedBy = (id: string) =>
    rooms
      .filter(
        (room) =>
          room.documents.some((d) => d.assetId === id) ||
          [...room.videos, ...room.library].some((v) => v.posterAssetId === id),
      )
      .map((room) => room.name);

  async function openInTab(id: string) {
    const url = await openUrl(id);
    if (url) window.open(url, "_blank", "noopener");
  }

  return (
    <div className="flex flex-col gap-5">
      <Section
        title="Asset library"
        hint="Files available to every room. Drop images, video or documents here, or use the picker."
      >
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files.length) void upload(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-3 text-center transition-colors ${
            dragOver ? "border-blue bg-blue-bg" : "border-border-dashed bg-row-hover hover:border-blue"
          }`}
        >
          <span className="text-[12.5px] font-bold text-navy">
            {uploading > 0
              ? `Adding ${uploading} file${uploading > 1 ? "s" : ""}…`
              : "Drop files here, or click to browse"}
          </span>
          <input
            ref={inputRef}
            type="file"
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files?.length) void upload(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        {error && (
          <div className="flex items-start justify-between gap-2 rounded-md bg-red/10 px-2.5 py-2">
            <span className="text-[11.5px] leading-[1.45] text-red">{error}</span>
            <button
              onClick={dismissError}
              aria-label="Dismiss error"
              className="flex-none cursor-pointer border-none bg-transparent font-mono text-[11px] text-red"
            >
              ✕
            </button>
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1">
            {KIND_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`cursor-pointer rounded-md border px-2.5 py-1.5 font-sans text-[11.5px] font-bold transition-colors ${
                  filter === f.value
                    ? "border-blue bg-blue-bg text-navy"
                    : "border-border bg-white text-muted hover:bg-row-hover"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <span className="font-mono text-[10px] text-faintest">
            {shown.length} of {assets.length}
          </span>
        </div>

        {loading ? (
          <p className="m-0 text-[12.5px] text-muted">Opening library…</p>
        ) : shown.length === 0 ? (
          <div className="flex flex-col items-center gap-1 rounded-lg bg-row-hover px-4 py-9 text-center">
            <span className="text-[12.5px] font-bold text-muted">
              {assets.length === 0 ? "Nothing in the library yet" : "Nothing of that type"}
            </span>
            <span className="max-w-[380px] text-[11.5px] leading-[1.5] text-faint">
              {assets.length === 0
                ? "Add a file above. Images and video get a thumbnail generated from the file itself; documents get a tile coloured by type."
                : "Try another filter, or add a file above."}
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(148px,1fr))] gap-3">
            {shown.map((asset) => {
              const uses = usedBy(asset.id);
              return (
                <button
                  key={asset.id}
                  onClick={() => setSelectedId(asset.id === selectedId ? null : asset.id)}
                  className={`flex cursor-pointer flex-col overflow-hidden rounded-lg border bg-white text-left transition-all ${
                    asset.id === selectedId
                      ? "border-blue shadow-[0_0_0_3px_#E8EFF9]"
                      : "border-border hover:border-faintest"
                  }`}
                >
                  <div className="relative aspect-[4/3] bg-gray-100">
                    <AssetThumb asset={asset} />
                    {asset.origin === "generated" && (
                      <span className="absolute top-1.5 left-1.5 rounded bg-navy/80 px-1.5 py-0.5 font-mono text-[9px] text-white">
                        AI
                      </span>
                    )}
                    {uses.length > 0 && (
                      <span
                        title={`Used in ${uses.join(", ")}`}
                        className="absolute top-1.5 right-1.5 rounded bg-green-bg px-1.5 py-0.5 font-mono text-[9px] text-green"
                      >
                        {uses.length > 1 ? `IN ${uses.length} ROOMS` : "IN USE"}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-0.5 px-2.5 py-2">
                    <span className="truncate text-[12px] font-bold text-gray-900">{asset.name}</span>
                    <span className="font-mono text-[9.5px] tracking-[0.06em] text-faint uppercase">
                      {asset.kind} · {formatBytes(asset.sizeBytes)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Section>

      {selected && (
        <Section title="Selected asset">
          <div className="grid grid-cols-[180px_minmax(0,1fr)] gap-4">
            <div className="aspect-[4/3] overflow-hidden rounded-lg border border-border bg-gray-100">
              <AssetThumb asset={selected} />
            </div>
            <div className="flex min-w-0 flex-col gap-2.5">
              <TextField label="Name" value={selected.name} onChange={(v) => void rename(selected.id, v)} />
              <div className="grid grid-cols-3 gap-2 font-mono text-[10px] text-faint uppercase">
                <span>{selected.kind}</span>
                <span>{formatBytes(selected.sizeBytes)}</span>
                <span>{selected.origin}</span>
              </div>
              {selected.prompt && (
                <p className="m-0 rounded-md bg-row-hover p-2 text-[11.5px] leading-[1.5] text-muted">
                  Prompt: {selected.prompt}
                </p>
              )}
              {(() => {
                const uses = usedBy(selected.id);
                return (
                  <>
                    <p className="m-0 text-[11.5px] leading-[1.5] text-muted">
                      {uses.length === 0
                        ? "Not attached to any room."
                        : `Attached in ${uses.join(", ")}.`}
                    </p>
                    <div className="flex gap-2">
                      <Button onClick={() => void openInTab(selected.id)}>Open</Button>
                      <Button
                        variant="danger"
                        onClick={() => {
                          void remove(selected.id);
                          setSelectedId(null);
                        }}
                        title={
                          uses.length > 0
                            ? `Still attached in ${uses.join(", ")} — those will fall back to a placeholder`
                            : undefined
                        }
                      >
                        Delete{uses.length > 0 ? " (in use)" : ""}
                      </Button>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </Section>
      )}

      <Section title="Generate an asset" hint="Describe what you need and the model builds it into the library.">
        {!generationLive && (
          <div className="flex items-start gap-2 rounded-md border border-border-soft bg-row-hover px-3 py-2">
            <span className="mt-px flex-none font-mono text-[9px] tracking-[0.08em] text-faint uppercase">
              Off
            </span>
            <p className="m-0 text-[11.5px] leading-[1.5] text-muted">
              Generation stays off until there's a backend route holding the API key — calling Claude
              straight from the browser would ship the key to everyone who opens a room.
            </p>
          </div>
        )}
        <fieldset
          disabled={!generationLive}
          className="m-0 flex min-w-0 flex-col gap-3 border-none p-0 disabled:opacity-55"
        >
          <TextField
            label="Prompt"
            value={prompt}
            onChange={setPrompt}
            multiline
            rows={3}
            placeholder={`A cover image for the ${activeRoom.account.company} business case, navy and white, no text`}
          />
          <div className="flex items-end gap-2">
            <div className="w-[200px] flex-none">
              <SelectField<AssetKind>
                label="Type"
                value={genKind}
                options={[
                  { value: "image", label: "Image" },
                  { value: "document", label: "Document" },
                  { value: "video", label: "Video" },
                ]}
                onChange={setGenKind}
              />
            </div>
            <Button
              variant="primary"
              disabled={!generationLive || !prompt.trim()}
              onClick={() => void generate(prompt, genKind, activeRoom.account.company)}
            >
              Generate
            </Button>
          </div>
        </fieldset>
      </Section>
    </div>
  );
}
