import type { SourceResult, EvidenceItem, Source } from "./types.ts";

export type Combined = {
  evidence: EvidenceItem[];
  usedSources: Source[];
  unavailableSources: Source[];
  reviewCount: number;
  redditCount: number;
  totalCost: number;
};

export function combineSources(results: SourceResult[]): Combined {
  const ok = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);
  const evidence = ok.flatMap((r) => r.items);
  return {
    evidence,
    usedSources: ok.map((r) => r.source),
    unavailableSources: failed.map((r) => r.source),
    reviewCount: evidence.filter((e) => e.source === "app_review").length,
    redditCount: evidence.filter((e) => e.source === "reddit").length,
    totalCost: Math.round(ok.reduce((sum, r) => sum + r.costEstimate, 0) * 100) / 100,
  };
}
