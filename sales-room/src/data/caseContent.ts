import type { CaseContent, EngagementRow, GeneratedSource } from "../types";

export const INITIAL_CASE_CONTENT: CaseContent = {
  kicker: "Business case · July 27, 2026",
  pageCount: "1 of 1",
  headline: "Take 11 days out of every submission at Meridian.",
  framingLabel: "Problem framing",
  framing: [
    { id: "despite", lead: "Despite", value: "[email + spreadsheet submissions]" },
    { id: "cant", lead: "we still can't", value: "[quote inside 48 hours]" },
    { id: "means", lead: "which means", value: "[your 40 producers]" },
    { id: "have-to", lead: "have to", value: "[rekey one app into six portals]" },
    { id: "cost", lead: "the cost is", value: "[$1.4M of unwritten premium]" },
  ],
  statsLabel: "Where it shows up today",
  statsSource: "From Meridian's 2025 production report",
  stats: [
    {
      id: "days",
      value: "11.5",
      unit: "days",
      label: "Median submission to first quote",
      accent: "navy",
    },
    { id: "portals", value: "6", unit: "portals", label: "Rekeyed per cyber account", accent: "navy" },
    { id: "never-quoted", value: "38", unit: "%", label: "Submissions never quoted out", accent: "red" },
    { id: "unwritten", value: "$1.4M", label: "Annual premium left unwritten", accent: "red" },
  ],
  changesLabel: "What changes",
  changesBody:
    "Producers submit once in 1Fort. We push to Coalition, At-Bay, Chubb, Corvus, Beazley and Travelers in parallel, return bindable quotes in minutes, and generate the comparison and proposal for you.",
  changesBullets: [
    { id: "b1", text: "One application, six markets, no rekeying" },
    { id: "b2", text: "AI coverage comparison the insured can actually read" },
    { id: "b3", text: "Bind, invoice and collect in the same thread" },
  ],
  yearOneLabel: "Year one",
  yearOneValue: "$2.1M",
  yearOneCaption: "Incremental written premium",
  yearOneRows: [
    { id: "hours", label: "Producer hours returned", value: "4,800", accent: "ink" },
    { id: "investment", label: "Platform investment", value: "$96,000", accent: "ink" },
    { id: "payback", label: "Payback", value: "3.2 months", accent: "green" },
  ],
  yearOneFootnote:
    "Modeled on your 2025 cyber and E&O volume at a 12% hit-rate lift. Full model in Documents.",
  nextLabel: "Next 30 days",
  weeks: [
    {
      id: "w1",
      num: "WEEK 1",
      title: "Pilot with two producers",
      sub: "Cyber and Tech E&O only, live accounts",
    },
    {
      id: "w3",
      num: "WEEK 3",
      title: "Measure quote turnaround",
      sub: "Against your 11.5-day baseline",
    },
    { id: "w4", num: "WEEK 4", title: "Roll to the full desk", sub: "Agency-wide, AMS sync included" },
  ],
  footerNote: "Prepared for Meridian Risk Partners by Rachel Moss · 1Fort · SOC 2 Type II",
  footerRef: "MRP-BC-0427",
};

/**
 * Source IDs are load-bearing: the generation provider keys off them to decide
 * which figures it can support. Renaming an ID means updating `src/lib/generation.ts`.
 */
export const INITIAL_SOURCES: GeneratedSource[] = [
  { id: "discovery-call", label: "Discovery call · Jul 14", used: true },
  { id: "production-report", label: "2025 production report", used: true },
  { id: "roi-model", label: "Meridian ROI model", used: true },
  { id: "appetite-notes", label: "Carrier appetite notes", used: false },
];

/** Measured from buyer sessions — not rep-editable. */
export const ENGAGEMENT: EngagementRow[] = [
  { id: "framing", label: "Problem framing", time: "3m 40s", pct: 82 },
  { id: "year-one", label: "Year one", time: "2m 05s", pct: 47 },
  { id: "next-30", label: "Next 30 days", time: "18s", pct: 9 },
];
