import type { AssetKind } from "../types";

const THUMB_MAX = 400;

export function kindOf(mimeType: string, name: string): AssetKind {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (/\.(png|jpe?g|gif|webp|svg)$/i.test(name)) return "image";
  if (/\.(mp4|mov|webm|m4v)$/i.test(name)) return "video";
  return "document";
}

export function extensionOf(name: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(name.trim());
  return (m?.[1] ?? "FILE").toUpperCase().slice(0, 4);
}

function drawScaled(source: CanvasImageSource, w: number, h: number): string | null {
  if (!w || !h) return null;
  const scale = Math.min(THUMB_MAX / w, THUMB_MAX / h, 1);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  try {
    return canvas.toDataURL("image/jpeg", 0.82);
  } catch {
    // Tainted canvas (shouldn't happen for local blobs) — fall back to no thumb.
    return null;
  }
}

async function imageThumbnail(file: Blob): Promise<string | null> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement | null>((resolve) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => resolve(null);
      el.src = url;
    });
    if (!img) return null;
    return drawScaled(img, img.naturalWidth, img.naturalHeight);
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function videoThumbnail(file: Blob): Promise<string | null> {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.src = url;

    const ready = await new Promise<boolean>((resolve) => {
      // Some codecs never fire seeked in headless/unsupported environments.
      const timer = setTimeout(() => resolve(false), 4000);
      const done = (ok: boolean) => {
        clearTimeout(timer);
        resolve(ok);
      };
      video.onerror = () => done(false);
      video.onloadeddata = () => {
        // Seek a little in; frame 0 is often black.
        const target = Math.min(0.2, (video.duration || 1) / 10);
        video.onseeked = () => done(true);
        try {
          video.currentTime = target;
        } catch {
          done(true);
        }
      };
    });
    if (!ready) return null;
    return drawScaled(video, video.videoWidth, video.videoHeight);
  } finally {
    URL.revokeObjectURL(url);
  }
}

const TILE_COLORS: Record<string, string> = {
  PDF: "#FF5757",
  XLSX: "#0E9B79",
  XLS: "#0E9B79",
  CSV: "#0E9B79",
  DOCX: "#2280EE",
  DOC: "#2280EE",
  PPTX: "#F0912D",
};

/** Placeholder tile for formats the browser can't render (PDF, Office files). */
export function documentTile(name: string): string {
  const ext = extensionOf(name);
  const color = TILE_COLORS[ext] ?? "#6B7280";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
    <rect width="400" height="300" fill="#F3F4F6"/>
    <rect x="140" y="78" width="120" height="150" rx="10" fill="#FFFFFF" stroke="#E4E8EB" stroke-width="2"/>
    <path d="M230 78 L260 108 L230 108 Z" fill="#E4E8EB"/>
    <text x="200" y="172" font-family="monospace" font-size="30" font-weight="600"
          fill="${color}" text-anchor="middle">${ext}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export async function makeThumbnail(file: Blob, kind: AssetKind, name: string): Promise<string | null> {
  try {
    if (kind === "image") return (await imageThumbnail(file)) ?? documentTile(name);
    if (kind === "video") return (await videoThumbnail(file)) ?? documentTile(name);
    return documentTile(name);
  } catch {
    return documentTile(name);
  }
}
