import type { CaseContent, GeneratedSource } from "../types";

export interface GenerateRequest {
  account: string;
  current: CaseContent;
  sources: GeneratedSource[];
}

export interface GenerationProvider {
  readonly id: string;
  /** False while the model call is stubbed out; the UI surfaces this to the rep. */
  readonly live: boolean;
  generate(request: GenerateRequest): Promise<CaseContent>;
}

/** Thrown for problems the rep can fix (e.g. no sources selected). */
export class GenerationError extends Error {}

const MOCK_LATENCY_MS = 1400;

const UNKNOWN = "—";

/**
 * Stand-in for the model call. It is deliberately source-driven rather than
 * random: toggling a source off removes the figures that source underwrites,
 * so the wiring is demonstrable without inventing numbers we can't support.
 */
async function mockGenerate({ current, sources }: GenerateRequest): Promise<CaseContent> {
  await new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));

  const used = new Set(sources.filter((s) => s.used).map((s) => s.id));
  if (used.size === 0) {
    throw new GenerationError("Select at least one source before regenerating.");
  }

  const hasProduction = used.has("production-report");
  const hasRoiModel = used.has("roi-model");
  const hasDiscovery = used.has("discovery-call");
  const hasAppetite = used.has("appetite-notes");

  const stats = current.stats.map((stat) => {
    switch (stat.id) {
      case "days":
        return { ...stat, value: hasProduction ? "11.5" : UNKNOWN };
      case "never-quoted":
        return { ...stat, value: hasProduction ? "38" : UNKNOWN };
      case "unwritten":
        return { ...stat, value: hasProduction ? "$1.4M" : UNKNOWN };
      default:
        return stat;
    }
  });

  const yearOneRows = current.yearOneRows.map((row) => {
    switch (row.id) {
      case "hours":
        return { ...row, value: hasRoiModel ? "4,800" : UNKNOWN };
      case "payback":
        return { ...row, value: hasRoiModel ? "3.2 months" : "Not modeled" };
      default:
        return row;
    }
  });

  const framing = current.framing.map((line) => {
    if (line.id === "cost") {
      return {
        ...line,
        value: hasProduction ? "[$1.4M of unwritten premium]" : "[unquantified premium leakage]",
      };
    }
    if (line.id === "means") {
      return { ...line, value: hasDiscovery ? "[your 40 producers]" : "[your producers]" };
    }
    return line;
  });

  const appetiteBullet = {
    id: "b-appetite",
    text: "Placement routed to in-appetite markets before the submission goes out",
  };
  const changesBullets = current.changesBullets.filter((b) => b.id !== appetiteBullet.id);

  return {
    ...current,
    headline: hasProduction
      ? "Take 11 days out of every submission at Meridian."
      : "Cut quote turnaround at Meridian.",
    framing,
    stats,
    statsSource: hasProduction
      ? "From Meridian's 2025 production report"
      : "Baseline pending — production report not included",
    changesBullets: hasAppetite ? [...changesBullets, appetiteBullet] : changesBullets,
    yearOneValue: hasRoiModel ? "$2.1M" : UNKNOWN,
    yearOneRows,
    yearOneFootnote: hasRoiModel
      ? current.yearOneFootnote
      : "Add the ROI model as a source to populate year-one figures.",
  };
}

const MOCK_PROVIDER: GenerationProvider = {
  id: "mock",
  live: false,
  generate: mockGenerate,
};

/**
 * Placeholder for the real generation call.
 *
 * The API key must never reach the browser, so this cannot call Anthropic
 * directly from client code — it needs to POST to a backend route that holds
 * the key server-side and calls Claude (`claude-opus-5`) there, returning a
 * `CaseContent` payload. Nothing here is wired up yet by design.
 */
const LIVE_PROVIDER: GenerationProvider = {
  id: "live",
  live: true,
  async generate() {
    throw new GenerationError("Live generation is not connected yet.");
  },
};

void LIVE_PROVIDER;

/** Swap to LIVE_PROVIDER once the backend generation route exists. */
export const generationProvider: GenerationProvider = MOCK_PROVIDER;
