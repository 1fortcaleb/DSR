import { useEffect, useState } from "react";
import { useAssets } from "../context/AssetsContext";
import { playable } from "../lib/video";
import type { RoomVideo } from "../types";
import { ImagePlaceholder } from "./ImagePlaceholder";

/**
 * Plays the hero video, or explains why it can't.
 *
 * Click-to-play rather than an autoloaded frame: a room can carry several
 * videos and nobody wants three third-party players booting up on open.
 */
export function VideoPlayer({
  video,
  posterSrc,
}: {
  video: RoomVideo | undefined;
  posterSrc: string | null;
}) {
  const { byId, openUrl } = useAssets();
  const [playing, setPlaying] = useState(false);
  const [assetUrl, setAssetUrl] = useState<string | null>(null);

  // An uploaded video lives in local storage as bytes; resolve it to a URL the
  // <video> element can use.
  useEffect(() => {
    let cancelled = false;
    const id = video?.videoAssetId;
    if (!id) {
      setAssetUrl(null);
      return;
    }
    // Hosted assets carry their own URL. Only a local-only one needs a blob
    // handle minting out of IndexedDB.
    const hosted = byId.get(id)?.url;
    if (hosted) {
      setAssetUrl(hosted);
      return;
    }
    void openUrl(id).then((u) => {
      if (!cancelled) setAssetUrl(u);
    });
    return () => {
      cancelled = true;
    };
  }, [video?.videoAssetId, byId, openUrl]);

  useEffect(() => setPlaying(false), [video?.id]);

  const source = playable(video?.url) ?? (assetUrl ? { kind: "file" as const, src: assetUrl } : null);

  if (!source) {
    return (
      <ImagePlaceholder
        label="No link on this one yet — add a Loom or Vidyard link in Manage content → Video answers"
        posterSrc={posterSrc}
        duration={video?.dur}
      />
    );
  }

  if (!playing) {
    return (
      <button
        onClick={() => setPlaying(true)}
        aria-label={`Play: ${video?.title ?? "video"}`}
        className="group relative h-full w-full cursor-pointer border-none bg-gray-100 p-0"
      >
        <ImagePlaceholder
          label="Press play"
          posterSrc={posterSrc}
          withPlayButton
          duration={video?.dur}
        />
        <span className="absolute inset-0 bg-navy/0 transition-colors group-hover:bg-navy/10" />
      </button>
    );
  }

  return source.kind === "embed" ? (
    <iframe
      src={`${source.src}${source.src.includes("?") ? "&" : "?"}autoplay=1`}
      title={video?.title ?? "Video"}
      allow="autoplay; fullscreen; picture-in-picture"
      allowFullScreen
      className="h-full w-full border-none"
    />
  ) : (
    <video src={source.src} controls autoPlay poster={posterSrc ?? undefined} className="h-full w-full bg-black object-contain" />
  );
}
