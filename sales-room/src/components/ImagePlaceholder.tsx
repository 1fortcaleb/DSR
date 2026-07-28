import { PlayIcon } from "./icons";

interface ImagePlaceholderProps {
  label: string;
  withPlayButton?: boolean;
  duration?: string;
  className?: string;
}

/**
 * Static stand-in for the original `<image-slot>` editor element, which
 * relied on the Claude Design sandbox to let a user drop in a real image.
 * Outside that sandbox there is no host to fill the slot, so this renders
 * a plain placeholder — swap in a real <img> once assets exist.
 */
export function ImagePlaceholder({
  label,
  withPlayButton,
  duration,
  className,
}: ImagePlaceholderProps) {
  return (
    <div className={`relative flex h-full w-full items-center justify-center bg-gray-100 ${className ?? ""}`}>
      <span className="max-w-[80%] text-center text-xs text-faint">{label}</span>
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
