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
  approachLabel: "What we're proposing",
  approachBody:
    "Producers submit once in 1Fort. We push to Coalition, At-Bay, Chubb, Corvus, Beazley and Travelers in parallel, return bindable quotes in minutes, and generate the comparison and proposal for you.",
  approachBullets: [
    { id: "b1", text: "One application, six markets, no rekeying" },
    { id: "b2", text: "AI coverage comparison the insured can actually read" },
    { id: "b3", text: "Bind, invoice and collect in the same thread" },
  ],
  outcomesLabel: "What changes if it works",
  outcomes: [
    { id: "o1", label: "Submission to first quote", from: "11.5 days", to: "Under 2 days" },
    { id: "o2", label: "Submissions quoted out", from: "2 in 3", to: "Effectively all" },
    { id: "o3", label: "Producer hours on rekeying", from: "~120 / year", to: "Near zero" },
  ],
  outcomesFootnote: "Measured against the 2025 production report. We agree the baseline before the pilot starts.",
  investmentLabel: "What it takes",
  investmentValue: "$96,000",
  investmentCaption: "Platform, year one, 40 producers",
  investmentRows: [
    { id: "platform", label: "Platform", value: "$96,000 / year", accent: "ink" },
    { id: "people", label: "Your people", value: "One ops lead, ~4 hrs/week for 6 weeks", accent: "ink" },
    { id: "payback", label: "Pays for itself at", value: "3.2 months", accent: "green" },
  ],
  investmentFootnote:
    "Priced on your 40 producers. No per-submission fee, so the cost does not move when volume does.",
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
  champions: [
    {
      id: "c1",
      name: "Dana Whitfield",
      role: "COO",
      why: "Owns the turnaround number this moves. Raised the rekeying problem unprompted on the first call.",
    },
  ],
  opponents: [
    {
      id: "x1",
      name: "Marcus Reed",
      role: "Head of IT",
      why: "Chose the current AMS integration and will read this as replacing it. Wants a security review before anything touches carrier data.",
    },
  ],
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
