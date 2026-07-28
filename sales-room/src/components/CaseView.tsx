import { useState } from "react";
import type { Audience } from "../types";
import { CheckIcon, RefreshIcon, SparkleIcon } from "./icons";

interface CaseViewProps {
  audience: Audience;
}

const engagement = [
  { label: "Problem framing", time: "3m 40s", pct: 82 },
  { label: "Year one", time: "2m 05s", pct: 47 },
  { label: "Next 30 days", time: "18s", pct: 9 },
];

const sources = [
  { label: "Discovery call · Jul 14", used: true },
  { label: "2025 production report", used: true },
  { label: "Meridian ROI model", used: true },
  { label: "Carrier appetite notes", used: false },
];

export function CaseView({ audience }: CaseViewProps) {
  const isRep = audience === "rep";
  const [regenerating, setRegenerating] = useState(false);

  function regenerate() {
    setRegenerating(true);
    setTimeout(() => setRegenerating(false), 1600);
  }

  return (
    <div className="flex flex-wrap items-start">
      <div className="box-border flex flex-1 min-w-0 basis-[560px] justify-center px-10 pt-11 pb-[88px]">
        <article className="box-border flex w-full max-w-[880px] flex-col gap-[46px] rounded-[10px] border border-border-soft bg-white px-[68px] pt-16 pb-14 shadow-[0_1px_2px_rgba(0,1,46,0.04),0_30px_60px_-40px_rgba(0,1,46,0.18)]">
          <header className="flex flex-col gap-[26px]">
            <div className="flex items-start justify-between gap-6">
              <span className="font-mono text-[10px] tracking-[0.14em] text-blue uppercase">
                Business case · July 27, 2026
              </span>
              <span className="font-mono text-[10px] tracking-[0.1em] text-faint uppercase">1 of 1</span>
            </div>
            <h1 className="m-0 max-w-[15em] text-[40px] leading-[1.1] tracking-[-0.025em] font-bold text-navy">
              Take 11 days out of every submission at Meridian.
            </h1>
            <div className="h-1 w-[30px] rounded-full bg-blue" />
          </header>

          <section className="flex flex-col gap-[22px]">
            <span className="font-mono text-[10px] tracking-[0.14em] text-blue uppercase">Problem framing</span>
            <div className="flex flex-col gap-0.5 whitespace-nowrap font-mono text-[21px] leading-[1.62] tracking-[-0.01em] text-gray-900 uppercase">
              <div>
                Despite <span className="text-blue">[email + spreadsheet submissions]</span>
              </div>
              <div>
                we still can't <span className="text-blue">[quote inside 48 hours]</span>
              </div>
              <div>
                which means <span className="text-blue">[your 40 producers]</span>
              </div>
              <div>
                have to <span className="text-blue">[rekey one app into six portals]</span>
              </div>
              <div>
                the cost is <span className="text-blue">[$1.4M of unwritten premium]</span>.
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-[18px]">
            <div className="flex items-baseline justify-between border-b-2 border-border-soft pb-2.5">
              <span className="font-mono text-[10px] tracking-[0.14em] text-[#666782] uppercase">
                Where it shows up today
              </span>
              <span className="text-[11px] italic text-faint">From Meridian's 2025 production report</span>
            </div>
            <div className="grid grid-cols-4 gap-[26px]">
              <Stat value="11.5" unit="days" label="Median submission to first quote" />
              <Stat value="6" unit="portals" label="Rekeyed per cyber account" />
              <Stat value="38" unit="%" label="Submissions never quoted out" accent="text-red" />
              <Stat value="$1.4M" label="Annual premium left unwritten" accent="text-red" />
            </div>
          </section>

          <section className="grid grid-cols-[1.15fr_1fr] items-start gap-[34px]">
            <div className="flex flex-col gap-4">
              <div className="border-b-2 border-border-soft pb-2.5">
                <span className="font-mono text-[10px] tracking-[0.14em] text-[#666782] uppercase">
                  What changes
                </span>
              </div>
              <p className="m-0 text-sm leading-[1.65] text-body">
                Producers submit once in 1Fort. We push to Coalition, At-Bay, Chubb, Corvus, Beazley and Travelers in
                parallel, return bindable quotes in minutes, and generate the comparison and proposal for you.
              </p>
              <ul className="m-0 flex list-none flex-col gap-[11px] p-0">
                {[
                  "One application, six markets, no rekeying",
                  "AI coverage comparison the insured can actually read",
                  "Bind, invoice and collect in the same thread",
                ].map((point) => (
                  <li key={point} className="flex gap-2.5 text-[13px] leading-[1.5] text-body">
                    <CheckIcon className="mt-0.5 flex-none text-live" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-[18px] rounded-lg bg-row-hover px-6 pt-6 pb-[22px]">
              <span className="font-mono text-[10px] tracking-[0.14em] text-[#666782] uppercase">Year one</span>
              <div className="flex flex-col gap-[3px]">
                <div className="text-[38px] leading-none font-bold tracking-[-0.03em] text-navy">$2.1M</div>
                <div className="text-xs text-muted">Incremental written premium</div>
              </div>
              <div className="h-px bg-border" />
              <div className="flex flex-col gap-3">
                <Row label="Producer hours returned" value="4,800" />
                <Row label="Platform investment" value="$96,000" />
                <Row label="Payback" value="3.2 months" valueClass="text-green" />
              </div>
              <p className="m-0 text-[10px] leading-[1.5] italic text-faint">
                Modeled on your 2025 cyber and E&amp;O volume at a 12% hit-rate lift. Full model in Documents.
              </p>
            </div>
          </section>

          <section className="flex flex-col gap-4">
            <div className="border-b-2 border-border-soft pb-2.5">
              <span className="font-mono text-[10px] tracking-[0.14em] text-[#666782] uppercase">Next 30 days</span>
            </div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-3">
              <Week num="WEEK 1" title="Pilot with two producers" sub="Cyber and Tech E&O only, live accounts" />
              <Week num="WEEK 3" title="Measure quote turnaround" sub="Against your 11.5-day baseline" />
              <Week num="WEEK 4" title="Roll to the full desk" sub="Agency-wide, AMS sync included" />
            </div>
          </section>

          <footer className="flex items-center justify-between gap-5 border-t border-border-soft pt-5">
            <span className="text-[10px] text-faint">
              Prepared for Meridian Risk Partners by Rachel Moss · 1Fort · SOC 2 Type II
            </span>
            <span className="font-mono text-[10px] text-faint">MRP-BC-0427</span>
          </footer>
        </article>
      </div>

      {!isRep && (
        <div className="box-border flex flex-none basis-[336px] flex-col gap-[26px] px-10 pt-11 pb-[60px]">
          <div className="flex flex-col gap-3.5 rounded-[10px] border border-border bg-white p-5">
            <span className="font-mono text-[10px] tracking-[0.12em] text-faint uppercase">Your contact</span>
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-navy text-[11px] font-bold text-white">
                RM
              </span>
              <span className="flex flex-col">
                <span className="text-[12.5px] font-bold text-gray-900">Rachel Moss</span>
                <span className="text-[11px] text-faint">1Fort · replies same day</span>
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
              {sources.map((s) => (
                <div key={s.label} className="flex items-center justify-between gap-2.5">
                  <span className={`text-xs ${s.used ? "text-body" : "text-faint"}`}>{s.label}</span>
                  <span className={`font-mono text-[10px] ${s.used ? "text-live" : "text-faintest"}`}>
                    {s.used ? "USED" : "SKIPPED"}
                  </span>
                </div>
              ))}
            </div>
            <button
              onClick={regenerate}
              className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-border bg-white px-3 py-[9px] font-sans text-xs font-bold text-blue transition-all hover:border-blue-border hover:bg-blue-bg"
            >
              <RefreshIcon />
              {regenerating ? "Regenerating…" : "Regenerate 1-pager"}
            </button>
          </div>

          <div className="flex flex-col gap-3.5 rounded-[10px] border border-border bg-white p-5">
            <span className="font-mono text-[10px] tracking-[0.12em] text-faint uppercase">Buyer engagement</span>
            <div className="flex flex-col gap-3">
              {engagement.map((e) => (
                <div key={e.label} className="flex flex-col gap-1.5">
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
              Dana forwarded this to a CFO on Jul 24. Two unseen viewers since.
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

function Stat({
  value,
  unit,
  label,
  accent = "text-navy",
}: {
  value: string;
  unit?: string;
  label: string;
  accent?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className={`text-[30px] font-bold tracking-[-0.02em] ${accent}`}>
        {value}
        {unit && <span className="text-[15px] font-normal text-muted"> {unit}</span>}
      </div>
      <div className="text-[11.5px] leading-[1.45] text-muted">{label}</div>
    </div>
  );
}

function Row({ label, value, valueClass = "text-gray-900" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-xs text-muted">{label}</span>
      <span className={`text-[13px] font-bold ${valueClass}`}>{value}</span>
    </div>
  );
}

function Week({ num, title, sub }: { num: string; title: string; sub: string }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-md border border-border bg-white px-5 py-[18px]">
      <span className="font-mono text-[10px] text-blue">{num}</span>
      <span className="text-[13px] font-bold text-gray-900">{title}</span>
      <span className="text-[11.5px] leading-[1.45] text-muted">{sub}</span>
    </div>
  );
}
