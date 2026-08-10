import { segments } from "../lib/redline";
import type { FlaggedPassage } from "../types";

/**
 * A line of the page with any marks on it drawn in place.
 *
 * Struck-through original followed by the proposed wording, the way a marked-up
 * contract reads. Both sides see the same thing: the argument is visible in the
 * document rather than filed away in a panel next to it, so nobody has to hold
 * the page and the feedback in their head at once.
 *
 * Accepted marks don't render — accepting rewrites the text, so the quote is
 * simply gone. Rejected ones don't either; the thread survives, the strike does
 * not.
 */
export function RedlineText({
  value,
  redlines,
}: {
  value: string;
  redlines: FlaggedPassage[];
}) {
  const parts = segments(value, redlines);
  if (parts.length === 1 && !parts[0].redline) return <>{value}</>;

  return (
    <>
      {parts.map((part, i) => {
        if (!part.redline) return <span key={i}>{part.text}</span>;
        const { id, proposed } = part.redline;
        // Jumping to the thread rather than opening one inline: the page is the
        // document, and a document that grows a panel between its lines every
        // time someone objects stops being readable at the moment it matters.
        const jump = () => {
          const el = document.getElementById(`redline-${id}`);
          el?.scrollIntoView({ behavior: "smooth", block: "center" });
          el?.animate(
            [
              { backgroundColor: "rgba(90,106,255,0.18)" },
              { backgroundColor: "transparent" },
            ],
            { duration: 1400, easing: "ease-out" },
          );
        };

        return (
          <span
            key={i}
            onClick={jump}
            className="cursor-pointer"
            title="See the thread"
          >
            <span className="text-faint line-through decoration-red/60 decoration-2">
              {part.text}
            </span>
            {proposed && (
              <>
                {" "}
                <span className="rounded-sm bg-green-bg px-0.5 font-bold text-green underline decoration-green/40 underline-offset-2">
                  {proposed}
                </span>
              </>
            )}
          </span>
        );
      })}
    </>
  );
}
