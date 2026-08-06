import { ENGAGEMENT, INITIAL_CASE_CONTENT, INITIAL_SOURCES } from "./caseContent";
import { DOCUMENTS, LIBRARY, VIDEOS } from "./salesRoom";
import type { CaseContent, Room } from "../types";

const HOURS = 3600_000;

/** Deep-ish clone so seeded rooms never share nested references. */
function clone<T>(value: T): T {
  return structuredClone(value);
}

const PARTNERSHIP_CONTENT: CaseContent = {
  ...clone(INITIAL_CASE_CONTENT),
  kicker: "Partnership case · July 27, 2026",
  headline: "Put 1Fort quoting inside the Vantage broker network.",
  framingLabel: "Where we fit",
  framing: [
    { id: "despite", lead: "Despite", value: "[a 200-broker network]" },
    { id: "cant", lead: "you still can't", value: "[offer cyber in under a week]" },
    { id: "means", lead: "which means", value: "[your member brokers]" },
    { id: "have-to", lead: "have to", value: "[refer the business away]" },
    { id: "cost", lead: "the cost is", value: "[commission leaving the network]" },
  ],
  statsLabel: "Network today",
  statsSource: "From the Vantage 2025 member survey",
  stats: [
    { id: "days", value: "200", unit: "brokers", label: "Member firms in the network", accent: "navy" },
    { id: "portals", value: "9", unit: "days", label: "Median cyber placement time", accent: "navy" },
    { id: "never-quoted", value: "44", unit: "%", label: "Cyber enquiries referred out", accent: "red" },
    { id: "unwritten", value: "$3.8M", label: "Commission leaving the network", accent: "red" },
  ],
  approachLabel: "How the partnership works",
  approachBody:
    "Member brokers get 1Fort quoting under the Vantage brand. We handle carrier connections and servicing; Vantage keeps the relationship and a revenue share on every bound policy.",
  approachBullets: [
    { id: "b1", text: "White-labelled quoting for every member firm" },
    { id: "b2", text: "Revenue share on bound premium, paid monthly" },
    { id: "b3", text: "Co-branded onboarding for new members" },
  ],
  outcomesLabel: "What changes if it works",
  outcomes: [
    { id: "o1", label: "Member agencies live on the platform", from: "0", to: "12 in year one" },
    { id: "o2", label: "Time from referral to first quote", from: "Unmeasured", to: "Same week" },
  ],
  outcomesFootnote: "Targets to agree jointly before launch, not commitments yet.",
  investmentLabel: "Year one",
  investmentValue: "$1.6M",
  investmentCaption: "Network premium retained",
  investmentRows: [
    { id: "hours", label: "Member firms onboarded", value: "60", accent: "ink" },
    { id: "investment", label: "Integration cost to Vantage", value: "$0", accent: "ink" },
    { id: "payback", label: "Revenue share", value: "12% of premium", accent: "green" },
  ],
  investmentFootnote: "Modeled on 30% member adoption in year one. Full model in Documents.",
  nextLabel: "Next 60 days",
  weeks: [
    { id: "w1", num: "WEEK 2", title: "Sign the partnership terms", sub: "Revenue share and branding agreed" },
    { id: "w3", num: "WEEK 5", title: "Pilot with ten member firms", sub: "Cyber only, co-branded" },
    { id: "w4", num: "WEEK 8", title: "Open to the full network", sub: "Listed in the member portal" },
  ],
  footerNote: "Prepared for Vantage Broker Network by Rachel Moss · 1Fort · SOC 2 Type II",
  footerRef: "VBN-PC-0114",
  champions: [],
  opponents: [],
};

export function seedRooms(): Room[] {
  const now = Date.now();
  return [
    {
      id: "room-meridian",
      kind: "deal",
      status: "live",
      name: "Meridian Risk Partners",
      account: {
        company: "Meridian Risk Partners",
        counterparty: { name: "Dana Whitfield", title: "COO", org: "Meridian Risk Partners" },
        owner: { name: "Rachel Moss", title: "Account Executive", org: "1Fort" },
      },
      content: clone(INITIAL_CASE_CONTENT),
      sources: clone(INITIAL_SOURCES),
      documents: clone(DOCUMENTS),
      videos: clone(VIDEOS),
      library: clone(LIBRARY),
      curatedVideoIds: VIDEOS.map((v) => v.id),
      mode: "specific" as const,
      feedback: null,
      flags: [],
      engagement: clone(ENGAGEMENT),
      lastViewedAt: new Date(now - 2 * HOURS).toISOString(),
      updatedAt: new Date(now).toISOString(),
    },
    {
      id: "room-vantage",
      kind: "partnership",
      status: "live",
      name: "Vantage Broker Network",
      account: {
        company: "Vantage Broker Network",
        counterparty: { name: "Tom Ellery", title: "Network Director", org: "Vantage Broker Network" },
        owner: { name: "Rachel Moss", title: "Partnerships", org: "1Fort" },
      },
      content: PARTNERSHIP_CONTENT,
      sources: [
        { id: "discovery-call", label: "Partnership call · Jul 09", used: true },
        { id: "production-report", label: "Vantage 2025 member survey", used: true },
        { id: "roi-model", label: "Revenue share model", used: true },
        { id: "appetite-notes", label: "Member appetite notes", used: false },
      ],
      documents: clone(DOCUMENTS).map((d) => ({ ...d, unread: false })),
      videos: clone(VIDEOS).slice(0, 2),
      library: clone(LIBRARY),
      curatedVideoIds: VIDEOS.slice(0, 2).map((v) => v.id),
      mode: "specific" as const,
      feedback: null,
      flags: [],
      engagement: [
        { id: "framing", label: "Where we fit", time: "2m 10s", pct: 64 },
        { id: "year-one", label: "Year one", time: "1m 32s", pct: 38 },
        { id: "next-30", label: "Next 60 days", time: "44s", pct: 21 },
      ],
      lastViewedAt: new Date(now - 30 * HOURS).toISOString(),
      updatedAt: new Date(now).toISOString(),
    },
  ];
}
