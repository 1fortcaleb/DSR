import { useCallback, useEffect, useRef, useState } from "react";
import { useAssets } from "../context/AssetsContext";
import { useRooms } from "../context/RoomsContext";
import { errText } from "../lib/errors";
import type { RoomVideo } from "../types";
import { XIcon } from "./icons";

/** First supported container wins; Safari has no webm, Chrome prefers it. */
const CANDIDATES = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
  "video/mp4",
];

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return CANDIDATES.find((t) => MediaRecorder.isTypeSupported(t));
}

function clock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function sizeLabel(blob: Blob | null): string {
  if (!blob) return "";
  const mb = blob.size / 1_000_000;
  return mb < 1 ? `${Math.round(blob.size / 1000)} KB` : `${mb.toFixed(1)} MB`;
}

type Stage = "choose" | "live" | "review" | "saving";

/**
 * Records an answer in the browser and puts it straight in the room.
 *
 * Camera or screen, because the two questions reps get asked are "who are you"
 * and "show me the thing". Nothing is uploaded until they've watched it back
 * and kept it — a recording you can't review before sending is worse than no
 * recording at all.
 */
export function RecordAnswer({ onClose }: { onClose: () => void }) {
  const { addFile } = useAssets();
  const { activeRoom, updateRoom } = useRooms();

  const [stage, setStage] = useState<Stage>("choose");
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [title, setTitle] = useState("");
  const [blob, setBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const liveRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const tickRef = useRef<number | null>(null);
  const aliveRef = useRef(true);

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (tickRef.current) window.clearInterval(tickRef.current);
    tickRef.current = null;
  }, []);

  // Releasing the camera light matters: leaving it on after the panel closes
  // is alarming and looks like a bug.
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      stopTracks();
    };
  }, [stopTracks]);
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // The <video> only exists once the live stage renders, so the stream has to
  // be attached here rather than in start() — at that point the ref is null and
  // the rep watches a black rectangle while recording.
  useEffect(() => {
    if (stage !== "live") return;
    const el = liveRef.current;
    const stream = streamRef.current;
    if (!el || !stream) return;
    el.srcObject = stream;
    void el.play().catch(() => undefined);
  }, [stage]);

  async function start(source: "camera" | "screen") {
    setError(null);
    const mimeType = pickMimeType();
    if (!mimeType) {
      setError("This browser can't record video. Chrome, Edge and Safari 15+ can.");
      return;
    }
    try {
      const stream =
        source === "camera"
          ? await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
          : await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      streamRef.current = stream;

      // A shared tab or window can be stopped from the browser's own bar.
      stream.getVideoTracks()[0]?.addEventListener("ended", () => stop());

      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        // Closing mid-recording ends the tracks, which fires this. Without the
        // guard we'd mint an object URL nothing is left to revoke.
        if (!aliveRef.current) return;
        const out = new Blob(chunksRef.current, { type: mimeType });
        setBlob(out);
        setPreviewUrl(URL.createObjectURL(out));
        setStage("review");
        stopTracks();
      };
      recorder.start();
      recorderRef.current = recorder;

      setSeconds(0);
      tickRef.current = window.setInterval(() => setSeconds((n) => n + 1), 1000);
      setStage("live");
    } catch (err) {
      setError(
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Permission denied. Allow camera and microphone access for this site, then try again."
          : errText(err),
      );
    }
  }

  function stop() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }

  async function keep() {
    if (!blob) return;
    setStage("saving");
    setError(null);
    try {
      const ext = blob.type.includes("mp4") ? "mp4" : "webm";
      const name = `${(title.trim() || "Video answer").replace(/[^A-Za-z0-9 ._-]/g, "")}.${ext}`;
      const asset = await addFile(new File([blob], name, { type: blob.type }));

      const video: RoomVideo = {
        id: crypto.randomUUID(),
        videoAssetId: asset.id,
        // The thumbnail generator already grabs an early frame, so the poster
        // comes from the recording itself with nothing more to attach.
        posterAssetId: asset.thumbnail ? asset.id : undefined,
        kicker: "Answer",
        title: title.trim() || "Video answer",
        dur: clock(seconds),
        by: activeRoom.account.owner.name,
        // Shown on the tile only while the poster frame is still being made.
        placeholder: title.trim() || "Video answer",
        chapters: [],
        watched: "",
        pct: 0,
        note: "",
      };
      updateRoom(activeRoom.id, {
        videos: [...activeRoom.videos, video],
        curatedVideoIds: [...activeRoom.curatedVideoIds, video.id],
      });
      onClose();
    } catch (err) {
      setError(errText(err));
      setStage("review");
    }
  }

  const choice =
    "flex flex-1 cursor-pointer flex-col items-start gap-1 rounded-lg border border-nav-line bg-nav-raised px-4 py-3.5 text-left transition-colors hover:border-periwinkle";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 px-6">
      <div className="flex w-full max-w-[560px] flex-col gap-4 rounded-xl bg-nav p-6 shadow-[0_24px_60px_-20px_rgba(0,1,46,0.6)]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-[10px] tracking-[0.14em] text-periwinkle uppercase">
              Record an answer
            </span>
            <h2 className="m-0 text-[18px] leading-[1.25] font-bold tracking-[-0.02em] text-white">
              {stage === "review" ? "Keep this one?" : "It goes straight into the room"}
            </h2>
          </div>
          <button
            onClick={() => {
              stopTracks();
              onClose();
            }}
            aria-label="Close"
            className="cursor-pointer border-none bg-transparent p-0 text-nav-faint hover:text-white"
          >
            <XIcon size={13} />
          </button>
        </div>

        {stage === "choose" && (
          <div className="flex gap-2.5">
            <button onClick={() => void start("camera")} className={choice}>
              <span className="text-[14px] font-bold text-white">Camera</span>
              <span className="text-[11.5px] leading-[1.5] text-nav-faint">
                You, talking. For "why this is worth a look".
              </span>
            </button>
            <button onClick={() => void start("screen")} className={choice}>
              <span className="text-[14px] font-bold text-white">Screen</span>
              <span className="text-[11.5px] leading-[1.5] text-nav-faint">
                Walk through the product or a document.
              </span>
            </button>
          </div>
        )}

        {(stage === "live" || stage === "review" || stage === "saving") && (
          <div className="relative overflow-hidden rounded-lg bg-black">
            {stage === "live" ? (
              <video ref={liveRef} muted playsInline className="aspect-video w-full object-contain" />
            ) : (
              <video src={previewUrl ?? undefined} controls className="aspect-video w-full object-contain" />
            )}
            {stage === "live" && (
              <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-red px-2.5 py-1 font-mono text-[11px] font-bold text-white">
                <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                {clock(seconds)}
              </span>
            )}
          </div>
        )}

        {stage === "live" && (
          <button
            onClick={stop}
            className="flex cursor-pointer items-center justify-center gap-2 rounded-md border-none bg-periwinkle px-4 py-2.5 font-sans text-[13px] font-bold text-nav"
          >
            <span className="h-2.5 w-2.5 rounded-[2px] bg-nav" />
            Stop recording
          </button>
        )}

        {(stage === "review" || stage === "saving") && (
          <>
            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[9.5px] tracking-[0.1em] text-nav-faint uppercase">
                What does it answer?
              </span>
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Why this is worth a pilot"
                className="w-full rounded-md border border-nav-line bg-nav-raised px-3 py-2 font-sans text-[13px] text-white outline-none placeholder:text-nav-faint focus:border-periwinkle"
              />
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => void keep()}
                disabled={stage === "saving"}
                className="cursor-pointer rounded-md border-none bg-periwinkle px-4 py-2.5 font-sans text-[13px] font-bold text-nav disabled:opacity-50"
              >
                {stage === "saving" ? "Saving…" : `Add to the room · ${clock(seconds)}`}
              </button>
              {/* Size matters here: this is about to be uploaded and sent. */}
              <span className="font-mono text-[10.5px] text-nav-faint">{sizeLabel(blob)}</span>
              <button
                onClick={() => {
                  setBlob(null);
                  setPreviewUrl(null);
                  setStage("choose");
                }}
                className="cursor-pointer border-none bg-transparent p-0 font-sans text-[12.5px] text-nav-faint hover:text-white"
              >
                Record again
              </button>
            </div>
          </>
        )}

        {error && (
          <p className="m-0 rounded-md bg-red/15 px-3 py-2 text-[12px] leading-[1.5] text-red">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
