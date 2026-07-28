import { useState } from "react";
import type { Audience } from "../types";
import { useRooms } from "../context/RoomsContext";
import { ImagePlaceholder } from "./ImagePlaceholder";
import { PlusIcon, RecordIcon, XIcon } from "./icons";

interface VideosViewProps {
  audience: Audience;
}

export function VideosView({ audience }: VideosViewProps) {
  const isRep = audience === "rep";
  const { activeRoom, updateRoom } = useRooms();
  const allVideos = [...activeRoom.videos, ...activeRoom.library];
  const curatedIds = activeRoom.curatedVideoIds;
  const setCuratedIds = (next: string[]) => updateRoom(activeRoom.id, { curatedVideoIds: next });
  const [videoId, setVideoId] = useState<string | null>(null);

  const curated = curatedIds.map((id) => allVideos.find((v) => v.id === id)).filter((v) => v !== undefined);
  const library = activeRoom.library.filter((v) => !curatedIds.includes(v.id));
  const video = allVideos.find((v) => v.id === videoId) ?? curated[0];

  const hasAny = curated.length > 0 || library.length > 0;

  function removeFromRoom(id: string) {
    const next = curatedIds.filter((x) => x !== id);
    setCuratedIds(next);
    if (videoId === id) setVideoId(next[0] ?? null);
  }

  function addToRoom(id: string) {
    setCuratedIds([...curatedIds, id]);
    setVideoId(id);
  }

  return (
    <div className="flex max-w-[1180px] flex-col gap-10 px-11 pt-11 pb-[90px]">
      <header className="flex items-end justify-between gap-7">
        <div className="flex flex-col gap-2.5">
          <span className="font-mono text-[10px] tracking-[0.14em] text-blue uppercase">Video answers</span>
          <h2 className="m-0 text-[30px] font-bold tracking-[-0.02em] text-navy">Asked &amp; answered</h2>
          <p className="m-0 text-[13px] text-muted">
            {isRep
              ? `Curated by ${activeRoom.account.owner.name}. Only these ${curated.length} are visible to ${activeRoom.account.company} — everything else stays in the library.`
              : "Short answers from the 1Fort team to the questions you raised. Watch in any order."}
          </p>
        </div>
        {isRep && (
          <button className="inline-flex flex-none cursor-pointer items-center gap-2 rounded-[5px] border-none bg-blue px-[15px] py-[11px] font-sans text-[12.5px] font-bold text-white transition-all hover:bg-blue-hover active:translate-y-px">
            <RecordIcon />
            Record a new answer
          </button>
        )}
      </header>

      {!hasAny && (
        <p className="m-0 text-[13px] text-muted">
          {isRep
            ? "No videos in this room yet. Add them from Manage content."
            : "No video answers have been shared here yet."}
        </p>
      )}

      {video && (
      <section className="grid grid-cols-[minmax(0,1.55fr)_minmax(280px,1fr)] items-start gap-7">
        <div className="relative w-full overflow-hidden rounded-xl border border-border bg-gray-100 aspect-video">
          <ImagePlaceholder
            label="Drop the opening frame of this recording"
            withPlayButton
            duration={video?.dur}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-[18px]">
          <div className="flex flex-col gap-2">
            <span className="font-mono text-[10px] tracking-[0.12em] text-blue uppercase">{video?.kicker}</span>
            <span className="text-xl leading-[1.28] font-bold tracking-[-0.015em] text-navy">{video?.title}</span>
            <span className="text-xs text-muted">{video?.by}</span>
          </div>

          <div className="flex flex-col gap-2.5">
            <span className="font-mono text-[10px] tracking-[0.12em] text-faint uppercase">Chapters</span>
            <div className="flex flex-col">
              {video?.chapters.map((ch) => (
                <button
                  key={ch.time}
                  className="grid w-full cursor-pointer grid-cols-[42px_minmax(0,1fr)] items-baseline gap-3 border-b border-border px-0.5 py-[10px] text-left transition-colors hover:bg-row-hover"
                >
                  <span className="font-mono text-[10.5px] text-blue">{ch.time}</span>
                  <span className="text-[12.5px] text-body">{ch.label}</span>
                </button>
              ))}
            </div>
          </div>

          {isRep && video && (
            <div className="mt-auto flex flex-col gap-2.5 rounded-lg bg-row-hover p-4">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-mono text-[10px] tracking-[0.12em] text-[#666782] uppercase">
                  Watch-through
                </span>
                <span className="text-[11.5px] text-body">{video.watched}</span>
              </div>
              <div className="h-1 rounded-full bg-gray-100">
                <div
                  className={`h-full rounded-full ${video.pct > 0 ? "bg-blue" : "bg-transparent"}`}
                  style={{ width: `${video.pct}%` }}
                />
              </div>
              <p className="m-0 text-[11px] leading-[1.5] italic text-muted">{video.note}</p>
            </div>
          )}
        </div>
      </section>
      )}

      {curated.length > 0 && (
      <section className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between border-b-2 border-border-soft pb-2.5">
          <span className="font-mono text-[10px] tracking-[0.14em] text-[#666782] uppercase">
            {isRep ? "Visible in the room" : "In this room"}
          </span>
          <span className="text-[11px] italic text-faint">
            {isRep ? "Drag to reorder · click a tile to preview" : "Click a tile to play"}
          </span>
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(232px,1fr))] gap-5">
          {curated.map((tile) => (
            <div
              key={tile.id}
              onClick={() => setVideoId(tile.id)}
              className={`flex cursor-pointer flex-col overflow-hidden rounded-[10px] border bg-white transition-all ${
                videoId === tile.id
                  ? "border-blue shadow-[0_0_0_3px_#E8EFF9]"
                  : "border-border shadow-[0_1px_2px_rgba(0,1,46,0.03)] hover:border-faintest"
              }`}
            >
              <div className="relative aspect-video bg-gray-100">
                <ImagePlaceholder label={tile.placeholder} withPlayButton duration={tile.dur} />
                {isRep && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFromRoom(tile.id);
                    }}
                    className="absolute top-2 right-2 inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-md border-none bg-white/90 text-muted transition-all hover:bg-white hover:text-red"
                  >
                    <XIcon />
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-2 px-[15px] pt-[14px] pb-[15px]">
                <span className="font-mono text-[9.5px] tracking-[0.1em] text-blue uppercase">{tile.kicker}</span>
                <span className="text-[13px] leading-[1.35] font-bold text-gray-900">{tile.title}</span>
                {isRep ? (
                  <>
                    <div className="h-[3px] rounded-full bg-gray-100">
                      <div
                        className={`h-full rounded-full ${tile.pct > 0 ? "bg-blue" : "bg-transparent"}`}
                        style={{ width: `${tile.pct}%` }}
                      />
                    </div>
                    <span className={`text-[10.5px] ${tile.pct > 0 ? "text-green" : "text-faint"}`}>
                      {tile.watched}
                    </span>
                  </>
                ) : (
                  <span className="text-[10.5px] text-faint">
                    {tile.by} · {tile.dur}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
      )}

      {isRep && library.length > 0 && (
        <section className="flex flex-col gap-4">
          <div className="flex items-baseline justify-between border-b-2 border-border-soft pb-2.5">
            <span className="font-mono text-[10px] tracking-[0.14em] text-[#666782] uppercase">
              Suggested for this deal
            </span>
            <span className="text-[11px] italic text-faint">{library.length} in the library, hidden from {activeRoom.account.company}</span>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3">
            {library.map((sug) => (
              <div
                key={sug.id}
                className="grid grid-cols-[76px_minmax(0,1fr)_auto] items-center gap-3.5 rounded-lg border border-border bg-white p-3 transition-all hover:border-faintest hover:bg-row-hover"
              >
                <div className="flex aspect-video w-[76px] items-center justify-center rounded-md border border-border bg-gray-100">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="#9AA1AD">
                    <path d="M8 5.5v13l11-6.5-11-6.5Z" />
                  </svg>
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="text-[12.5px] leading-[1.35] font-bold text-gray-900">{sug.title}</span>
                  <span className="text-[10.5px] text-faint">
                    {sug.kicker} · {sug.dur}
                  </span>
                </div>
                <button
                  onClick={() => addToRoom(sug.id)}
                  className="inline-flex flex-none cursor-pointer items-center gap-1.5 rounded-md border border-border bg-white px-[11px] py-2 font-sans text-[11.5px] font-bold text-blue transition-all hover:border-blue-border hover:bg-blue-bg"
                >
                  <PlusIcon />
                  Add
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
