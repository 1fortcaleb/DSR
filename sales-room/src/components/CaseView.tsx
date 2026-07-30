import type { Audience } from "../types";
import { tally } from "../lib/claims";
import { Claim } from "./Claim";
import { ResponsesPanel } from "./ResponsesPanel";
import { useRooms } from "../context/RoomsContext";
import { firstName } from "../lib/vocabulary";
import { CheckIcon, RefreshIcon, SparkleIcon } from "./icons";
import { EditableText } from "./EditableText";

interface CaseViewProps {
  audience: Audience;
}

export function CaseView({ audience }: CaseViewProps) {
  const isRep = audience === "rep";
  const {
    activeRoom,
    vocabulary,
    setField,
    setListItem,
    toggleSource,
    renameSource,
    status,
    error,
    isLive,
    regenerate,
    dismissError,
  } = useRooms();
  const { content, sources, engagement, account, responses } = activeRoom;
  const review = tally(content, responses);
  const ownerFirst = firstName(account.owner.name) || "us";

  // Buyers see the same page, rendered inert.
  const ro = !isRep;

  return (
    <div className="flex flex-wrap items-start">
      <div className="box-border flex flex-1 min-w-0 basis-[560px] justify-center px-10 pt-11 pb-[88px]">
        <article className="box-border flex w-full max-w-[880px] flex-col gap-[46px] rounded-[10px] border border-border-soft bg-white px-[68px] pt-16 pb-14 shadow-[0_1px_2px_rgba(0,1,46,0.04),0_30px_60px_-40px_rgba(0,1,46,0.18)]">
          {!isRep && (
            <div className="flex items-center justify-between gap-4 rounded-lg border border-blue-border bg-blue-bg px-4 py-3">
              <div className="flex flex-col gap-0.5">
                <span className="font-mono text-[9.5px] tracking-[0.12em] text-blue uppercase">
                  Your read
                </span>
                <p className="m-0 text-[12.5px] leading-[1.5] text-body">
                  Click any line to agree with it, or tell {ownerFirst} what it should say.
                </p>
              </div>
              {review.answered > 0 && (
                <div className="flex flex-none items-center gap-3 font-mono text-[10.5px]">
                  {review.agreed > 0 && <span className="text-green">{review.agreed} agreed</span>}
                  {review.challenged > 0 && (
                    <span className="text-amber">{review.challenged} flagged</span>
                  )}
                </div>
              )}
            </div>
          )}

          <header className="flex flex-col gap-[26px]">
            <div className="flex items-start justify-between gap-6">
              <EditableText
                readOnly={ro}
                value={content.kicker}
                onChange={(v) => setField("kicker", v)}
                inline
                ariaLabel="Document kicker"
                className="font-mono text-[10px] tracking-[0.14em] text-blue uppercase"
              />
              <EditableText
                readOnly={ro}
                value={content.pageCount}
                onChange={(v) => setField("pageCount", v)}
                inline
                ariaLabel="Page count"
                className="font-mono text-[10px] tracking-[0.1em] text-faint uppercase"
              />
            </div>
            <Claim claimId="headline" label="The headline" text={content.headline} audience={audience}>
              <EditableText
                as="h1"
                readOnly={ro}
                value={content.headline}
                onChange={(v) => setField("headline", v)}
                ariaLabel="Headline"
                className="m-0 max-w-[15em] text-[40px] leading-[1.1] tracking-[-0.025em] font-bold text-navy"
              />
            </Claim>
            <div className="h-1 w-[30px] rounded-full bg-blue" />
          </header>

          <section className="flex flex-col gap-[22px]">
            <EditableText
              readOnly={ro}
              value={content.framingLabel}
              onChange={(v) => setField("framingLabel", v)}
              inline
              ariaLabel="Problem framing label"
              className="font-mono text-[10px] tracking-[0.14em] text-blue uppercase"
            />
            <div className="flex flex-col gap-0.5 whitespace-nowrap font-mono text-[21px] leading-[1.62] tracking-[-0.01em] text-gray-900 uppercase">
              {content.framing.map((line) => (
                <Claim
                  key={line.id}
                  claimId={`framing:${line.id}`}
                  label={line.lead}
                  text={line.value}
                  audience={audience}
                >
                  <EditableText
                    readOnly={ro}
                    value={line.lead}
                    onChange={(v) => setListItem("framing", line.id, { lead: v })}
                    inline
                    ariaLabel={`Framing lead: ${line.lead}`}
                  />{" "}
                  <EditableText
                    readOnly={ro}
                    value={line.value}
                    onChange={(v) => setListItem("framing", line.id, { value: v })}
                    inline
                    ariaLabel={`Framing value: ${line.lead}`}
                    className="text-blue"
                  />
                  {line.id === "cost" ? "." : ""}
                </Claim>
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-[18px]">
            <div className="flex items-baseline justify-between border-b-2 border-border-soft pb-2.5">
              <EditableText
                readOnly={ro}
                value={content.statsLabel}
                onChange={(v) => setField("statsLabel", v)}
                inline
                ariaLabel="Stats section label"
                className="font-mono text-[10px] tracking-[0.14em] text-[#666782] uppercase"
              />
              <EditableText
                readOnly={ro}
                value={content.statsSource}
                onChange={(v) => setField("statsSource", v)}
                inline
                ariaLabel="Stats source note"
                className="text-[11px] italic text-faint"
              />
            </div>
            <div className="grid grid-cols-4 gap-[26px]">
              {content.stats.map((stat) => (
                <Claim
                  key={stat.id}
                  claimId={`stat:${stat.id}`}
                  label={stat.label}
                  text={stat.unit ? `${stat.value} ${stat.unit}` : stat.value}
                  audience={audience}
                  className="flex flex-col gap-1.5"
                >
                  <div
                    className={`text-[30px] font-bold tracking-[-0.02em] ${
                      stat.accent === "red" ? "text-red" : "text-navy"
                    }`}
                  >
                    <EditableText
                      readOnly={ro}
                      value={stat.value}
                      onChange={(v) => setListItem("stats", stat.id, { value: v })}
                      inline
                      ariaLabel={`${stat.label} value`}
                    />
                    {stat.unit && (
                      <span className="text-[15px] font-normal text-muted">
                        {" "}
                        <EditableText
                          readOnly={ro}
                          value={stat.unit}
                          onChange={(v) => setListItem("stats", stat.id, { unit: v })}
                          inline
                          ariaLabel={`${stat.label} unit`}
                        />
                      </span>
                    )}
                  </div>
                  <EditableText
                    readOnly={ro}
                    value={stat.label}
                    onChange={(v) => setListItem("stats", stat.id, { label: v })}
                    ariaLabel={`Stat label: ${stat.label}`}
                    className="text-[11.5px] leading-[1.45] text-muted"
                  />
                </Claim>
              ))}
            </div>
          </section>

          <section className="grid grid-cols-[1.15fr_1fr] items-start gap-[34px]">
            <div className="flex flex-col gap-4">
              <div className="border-b-2 border-border-soft pb-2.5">
                <EditableText
                  readOnly={ro}
                  value={content.changesLabel}
                  onChange={(v) => setField("changesLabel", v)}
                  inline
                  ariaLabel="What changes label"
                  className="font-mono text-[10px] tracking-[0.14em] text-[#666782] uppercase"
                />
              </div>
              <EditableText
                as="p"
                readOnly={ro}
                multiline
                value={content.changesBody}
                onChange={(v) => setField("changesBody", v)}
                ariaLabel="What changes body"
                className="m-0 text-sm leading-[1.65] text-body"
              />
              <ul className="m-0 flex list-none flex-col gap-[11px] p-0">
                {content.changesBullets.map((bullet) => (
                  <li key={bullet.id} className="grid grid-cols-[auto_minmax(0,1fr)] gap-2.5 text-[13px] leading-[1.5] text-body">
                    <CheckIcon className="mt-0.5 flex-none text-live" />
                    <EditableText
                      readOnly={ro}
                      value={bullet.text}
                      onChange={(v) => setListItem("changesBullets", bullet.id, { text: v })}
                      ariaLabel={`Bullet: ${bullet.text}`}
                    />
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-[18px] rounded-lg bg-row-hover px-6 pt-6 pb-[22px]">
              <EditableText
                readOnly={ro}
                value={content.yearOneLabel}
                onChange={(v) => setField("yearOneLabel", v)}
                inline
                ariaLabel="Year one label"
                className="font-mono text-[10px] tracking-[0.14em] text-[#666782] uppercase"
              />
              <Claim
                claimId="yearOne"
                label={content.yearOneCaption}
                text={content.yearOneValue}
                audience={audience}
                className="flex flex-col gap-[3px]"
              >
                <div className="text-[38px] leading-none font-bold tracking-[-0.03em] text-navy">
                  <EditableText
                    readOnly={ro}
                    value={content.yearOneValue}
                    onChange={(v) => setField("yearOneValue", v)}
                    inline
                    ariaLabel="Year one headline figure"
                  />
                </div>
                <EditableText
                  readOnly={ro}
                  value={content.yearOneCaption}
                  onChange={(v) => setField("yearOneCaption", v)}
                  ariaLabel="Year one caption"
                  className="text-xs text-muted"
                />
              </Claim>
              <div className="h-px bg-border" />
              <div className="flex flex-col gap-3">
                {content.yearOneRows.map((row) => (
                  <Claim
                    key={row.id}
                    claimId={`year:${row.id}`}
                    label={row.label}
                    text={row.value}
                    audience={audience}
                    className="flex items-baseline justify-between gap-3"
                  >
                    <EditableText
                      readOnly={ro}
                      value={row.label}
                      onChange={(v) => setListItem("yearOneRows", row.id, { label: v })}
                      inline
                      ariaLabel={`Row label: ${row.label}`}
                      className="text-xs text-muted"
                    />
                    <EditableText
                      readOnly={ro}
                      value={row.value}
                      onChange={(v) => setListItem("yearOneRows", row.id, { value: v })}
                      inline
                      ariaLabel={`Row value: ${row.label}`}
                      className={`text-[13px] font-bold ${
                        row.accent === "green" ? "text-green" : "text-gray-900"
                      }`}
                    />
                  </Claim>
                ))}
              </div>
              <EditableText
                as="p"
                readOnly={ro}
                multiline
                value={content.yearOneFootnote}
                onChange={(v) => setField("yearOneFootnote", v)}
                ariaLabel="Year one footnote"
                className="m-0 text-[10px] leading-[1.5] italic text-faint"
              />
            </div>
          </section>

          <section className="flex flex-col gap-4">
            <div className="border-b-2 border-border-soft pb-2.5">
              <EditableText
                readOnly={ro}
                value={content.nextLabel}
                onChange={(v) => setField("nextLabel", v)}
                inline
                ariaLabel="Next 30 days label"
                className="font-mono text-[10px] tracking-[0.14em] text-[#666782] uppercase"
              />
            </div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-3">
              {content.weeks.map((week) => (
                <Claim
                  key={week.id}
                  claimId={`week:${week.id}`}
                  label={week.num}
                  text={week.title}
                  audience={audience}
                  className="flex flex-col gap-1.5 rounded-md border border-border px-5 py-[18px]"
                >
                  <EditableText
                    readOnly={ro}
                    value={week.num}
                    onChange={(v) => setListItem("weeks", week.id, { num: v })}
                    inline
                    ariaLabel={`${week.num} label`}
                    className="font-mono text-[10px] text-blue"
                  />
                  <EditableText
                    readOnly={ro}
                    value={week.title}
                    onChange={(v) => setListItem("weeks", week.id, { title: v })}
                    ariaLabel={`${week.num} title`}
                    className="text-[13px] font-bold text-gray-900"
                  />
                  <EditableText
                    readOnly={ro}
                    value={week.sub}
                    onChange={(v) => setListItem("weeks", week.id, { sub: v })}
                    ariaLabel={`${week.num} detail`}
                    className="text-[11.5px] leading-[1.45] text-muted"
                  />
                </Claim>
              ))}
            </div>
          </section>

          <footer className="flex items-center justify-between gap-5 border-t border-border-soft pt-5">
            <EditableText
              readOnly={ro}
              value={content.footerNote}
              onChange={(v) => setField("footerNote", v)}
              inline
              ariaLabel="Footer note"
              className="text-[10px] text-faint"
            />
            <EditableText
              readOnly={ro}
              value={content.footerRef}
              onChange={(v) => setField("footerRef", v)}
              inline
              ariaLabel="Document reference"
              className="font-mono text-[10px] text-faint"
            />
          </footer>
        </article>
      </div>

      {!isRep && (
        <div className="box-border flex flex-none basis-[336px] flex-col gap-[26px] px-10 pt-11 pb-[60px]">
          <div className="flex flex-col gap-3.5 rounded-[10px] border border-border bg-white p-5">
            <span className="font-mono text-[10px] tracking-[0.12em] text-faint uppercase">Your contact</span>
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-navy text-[11px] font-bold text-white">
                {initials(account.owner.name)}
              </span>
              <span className="flex flex-col">
                <span className="text-[12.5px] font-bold text-gray-900">{account.owner.name}</span>
                <span className="text-[11px] text-faint">{account.owner.org} · replies same day</span>
              </span>
            </div>
            <p className="m-0 text-[11.5px] leading-[1.55] text-muted">
              Every number on this page traces back to a file in Documents. Ask about any of them.
            </p>
          </div>
          <div className="flex flex-col gap-2.5">
            <button className="cursor-pointer rounded-[5px] border-none bg-blue px-3.5 py-3 font-sans text-[13px] font-bold text-white transition-all hover:bg-blue-hover active:translate-y-px">
              Download PDF
            </button>
            <button className="cursor-pointer rounded-[5px] border border-border bg-white px-3.5 py-3 font-sans text-[13px] font-bold text-gray-800 transition-all hover:border-faintest hover:bg-row-hover">
              Share internally
            </button>
          </div>
        </div>
      )}

      {isRep && (
        <div className="box-border flex flex-none basis-[336px] flex-col gap-[26px] px-10 pt-11 pb-[60px]">
          <div className="flex flex-col gap-4 rounded-[10px] border border-border bg-white p-5">
            <div className="flex items-center gap-2">
              <SparkleIcon className="text-blue" />
              <span className="text-[12.5px] font-bold text-gray-900">Generated from</span>
            </div>

            <div className="flex flex-col gap-2.5">
              {sources.map((source) => (
                <div key={source.id} className="flex items-center justify-between gap-2.5">
                  <EditableText
                    value={source.label}
                    onChange={(v) => renameSource(source.id, v)}
                    inline
                    ariaLabel={`Source name: ${source.label}`}
                    className={`text-xs ${source.used ? "text-body" : "text-faint"}`}
                  />
                  <button
                    onClick={() => toggleSource(source.id)}
                    aria-pressed={source.used}
                    title={source.used ? "Exclude from the next draft" : "Include in the next draft"}
                    className={`flex-none cursor-pointer rounded border-none bg-transparent px-1 font-mono text-[10px] transition-colors hover:underline ${
                      source.used ? "text-live" : "text-faintest"
                    }`}
                  >
                    {source.used ? "USED" : "SKIPPED"}
                  </button>
                </div>
              ))}
            </div>

            {error && (
              <div className="flex items-start justify-between gap-2 rounded-md bg-red/10 px-2.5 py-2">
                <span className="text-[11px] leading-[1.45] text-red">{error}</span>
                <button
                  onClick={dismissError}
                  aria-label="Dismiss error"
                  className="flex-none cursor-pointer border-none bg-transparent font-mono text-[11px] text-red"
                >
                  ✕
                </button>
              </div>
            )}

            <button
              onClick={regenerate}
              disabled={status === "working"}
              className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-border bg-white px-3 py-[9px] font-sans text-xs font-bold text-blue transition-all hover:border-blue-border hover:bg-blue-bg disabled:cursor-not-allowed disabled:text-faint"
            >
              <RefreshIcon className={status === "working" ? "animate-spin" : undefined} />
              {status === "working" ? "Regenerating…" : "Regenerate 1-pager"}
            </button>

            {!isLive && (
              <p className="m-0 text-[10px] leading-[1.45] text-faint">
                AI generation is disconnected — regenerate rebuilds the draft from the selected
                sources locally.
              </p>
            )}
          </div>

          <ResponsesPanel />

          <div className="flex flex-col gap-3.5 rounded-[10px] border border-border bg-white p-5">
            <span className="font-mono text-[10px] tracking-[0.12em] text-faint uppercase">
              {vocabulary.engagementLabel}
            </span>
            <div className="flex flex-col gap-3">
              {engagement.map((e) => (
                <div key={e.id} className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-body">{e.label}</span>
                    <span className="font-mono text-[11px] text-gray-900">{e.time}</span>
                  </div>
                  <div className="h-1 rounded-full bg-gray-100">
                    <div
                      className={`h-full rounded-full ${e.pct > 10 ? "bg-blue" : "bg-faintest"}`}
                      style={{ width: `${e.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="m-0 text-[11px] leading-[1.5] text-muted">
              {engagement.length
                ? `${firstName(account.counterparty.name) || "They"} last opened this ${vocabulary.counterpartyLower === "partner" ? "partner" : "deal"} room recently.`
                : "No engagement recorded yet."}
            </p>
          </div>

          <div className="flex flex-col gap-2.5">
            <button className="cursor-pointer rounded-[5px] border-none bg-blue px-3.5 py-3 font-sans text-[13px] font-bold text-white transition-all hover:bg-blue-hover active:translate-y-px">
              Share this page
            </button>
            <button className="cursor-pointer rounded-[5px] border border-border bg-white px-3.5 py-3 font-sans text-[13px] font-bold text-gray-800 transition-all hover:border-faintest hover:bg-row-hover">
              Download PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Two-letter avatar initials. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "—";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}
