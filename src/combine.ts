import type { SourceResult, EvidenceItem, Source } from "./types.ts";

export type Combined = {
  evidence: EvidenceItem[];
  usedSources: Source[];
  unavailableSources: Source[];
  counts: Record<string, number>;
  totalCost: number;
};

export function combineSources(results: SourceResult[]): Combined {
  const ok = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);
  const evidence = ok.flatMap((r) => r.items);
  const counts: Record<string, number> = {};
  for (const e of evidence) counts[e.source] = (counts[e.source] ?? 0) + 1;
  return {
    evidence,
    usedSources: ok.map((r) => r.source),
    unavailableSources: failed.map((r) => r.source),
    counts,
    totalCost: Math.round(ok.reduce((sum, r) => sum + r.costEstimate, 0) * 100) / 100,
  };
}
