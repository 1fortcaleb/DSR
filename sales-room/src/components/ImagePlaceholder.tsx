import { PlayIcon } from "./icons";

interface ImagePlaceholderProps {
  label: string;
  /** Thumbnail of an attached poster asset; falls back to the label when absent. */
  posterSrc?: string | null;
  withPlayButton?: boolean;
  duration?: string;
  className?: string;
}

/**
 * Renders an attached poster asset when one exists, otherwise a prompt telling
 * the rep where to attach one. Replaces the original sandbox `<image-slot>`.
 */
export function ImagePlaceholder({
  label,
  posterSrc,
  withPlayButton,
  duration,
  className,
}: ImagePlaceholderProps) {
  return (
    <div className={`relative flex h-full w-full items-center justify-center bg-gray-100 ${className ?? ""}`}>
      {posterSrc ? (
        <img src={posterSrc} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="max-w-[80%] text-center text-xs text-faint">{label}</span>
      )}
      {withPlayButton && (
        <div className="pointer-events-none absolute bottom-3 left-3 flex items-center justify-center">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-navy/70">
            <PlayIcon size={14} className="text-white" />
          </span>
        </div>
      )}
      {duration && (
        <div className="pointer-events-none absolute bottom-3 right-3 rounded bg-navy/80 px-1.5 py-1 font-mono text-[10px] tracking-wide text-white">
          {duration}
        </div>
      )}
    </div>
  );
}
