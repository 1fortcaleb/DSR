/**
 * Turns whatever a rep pastes into something playable.
 *
 * Reps record in Loom or Vidyard, so a link is the path of least resistance:
 * it plays for the counterparty straight away, with no file to host and no
 * bandwidth to pay for. A direct file URL works too, and so does an uploaded
 * asset once its bytes are somewhere the counterparty can reach.
 */

export interface Playable {
  kind: "embed" | "file";
  /** Ready to use as an iframe src or a video src. */
  src: string;
}

const LOOM = /loom\.com\/(?:share|embed)\/([A-Za-z0-9]+)/;
const YOUTUBE = /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/;
const VIMEO = /vimeo\.com\/(?:video\/)?(\d+)/;
const VIDYARD = /vidyard\.com\/(?:watch|share)\/([A-Za-z0-9_-]+)/;
const FILE = /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i;

/** Null when the string isn't a URL we can play. */
export function playable(raw: string | undefined | null): Playable | null {
  const url = raw?.trim();
  if (!url) return null;

  let loom, yt, vimeo, vidyard;
  if ((loom = url.match(LOOM))) return { kind: "embed", src: `https://www.loom.com/embed/${loom[1]}` };
  if ((yt = url.match(YOUTUBE)))
    return { kind: "embed", src: `https://www.youtube-nocookie.com/embed/${yt[1]}` };
  if ((vimeo = url.match(VIMEO)))
    return { kind: "embed", src: `https://player.vimeo.com/video/${vimeo[1]}` };
  if ((vidyard = url.match(VIDYARD)))
    return { kind: "embed", src: `https://play.vidyard.com/${vidyard[1]}` };

  if (FILE.test(url) || url.startsWith("blob:")) return { kind: "file", src: url };

  // An unrecognised http(s) link is still worth trying in a frame; many hosts
  // serve a player at the share URL.
  if (/^https?:\/\//i.test(url)) return { kind: "embed", src: url };
  return null;
}

/** Human label for the editor, so a rep can see we understood the link. */
export function providerName(raw: string | undefined | null): string | null {
  const url = raw?.trim();
  if (!url) return null;
  if (LOOM.test(url)) return "Loom";
  if (YOUTUBE.test(url)) return "YouTube";
  if (VIMEO.test(url)) return "Vimeo";
  if (VIDYARD.test(url)) return "Vidyard";
  if (FILE.test(url)) return "Video file";
  if (/^https?:\/\//i.test(url)) return "Link";
  return null;
}
