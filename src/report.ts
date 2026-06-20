import type { Opportunity, PainPoint, Source } from "./types.ts";

export const DISCLAIMER =
  "This is a heuristic confidence score based on observed demand signals, not a prediction of startup success.";

export const SOURCE_LABELS: Record<string, string> = {
  ios_review: "App Store",
  android_review: "Google Play",
  reddit: "Reddit",
  threads: "Threads",
};

export function sourceLabel(s: string): string {
  return SOURCE_LABELS[s] ?? s;
}

// Round-robin across sources so the evidence list represents every source that produced
// pains, not just the longest/richest ones (App Store reviews otherwise crowd out the rest).
export function diverseEvidence(pains: PainPoint[], limit: number): PainPoint[] {
  const queues = new Map<string, PainPoint[]>();
  for (const p of pains) {
    if (!queues.has(p.source)) queues.set(p.source, []);
    queues.get(p.source)!.push(p);
  }
  const lanes = [...queues.values()];
  const out: PainPoint[] = [];
  for (let i = 0; out.length < limit && lanes.some((q) => q.length); i++) {
    const lane = lanes[i % lanes.length];
    if (lane.length) out.push(lane.shift()!);
  }
  return out;
}

export type ReportInput = {
  idea: string;
  competitor: string;
  targetUser: string;
  opportunity: Opportunity;
  pains: PainPoint[];
  counts: Record<string, number>;
  usedSources: Source[];
  unavailableSources: Source[];
  estimatedCost: number;
};

export function renderReport(input: ReportInput): string {
  const { opportunity: o, pains } = input;
  const s = o.scores;
  const mvpFeatures = o.mvpFeatures ?? [];
  const avoid = o.avoid ?? [];
  const alternatives = o.alternatives ?? [];
  const wedge = o.wedge.replace(/[.\s]+$/, ""); // strip trailing punctuation to avoid ".." when interpolated
  const breakdown =
    `Frequency ${s.frequency} · Severity ${s.severity} · Switching ${s.switchingIntent} · ` +
    `WTP ${s.willingnessToPay} · Inertia ${s.competitorInertia} · ` +
    `Exploitability ${s.startupExploitability} · Diversity ${s.evidenceDiversity}`;

  const total = Object.values(input.counts).reduce((a, b) => a + b, 0);
  const sourcesBreakdown = input.usedSources.length
    ? input.usedSources.map((s) => `${sourceLabel(s)} ${input.counts[s] ?? 0}`).join(" · ")
    : "no sources";

  const evidence = diverseEvidence(pains, 12)
    .map((p) => `- [${sourceLabel(p.source)}] "${p.quote}" — _${p.pain}_`)
    .join("\n") || "_No specific quotes extracted._";

  // A Build that barely clears the bar, or rests on weak pay/switch signals, is a NARROW build.
  const decisionLabel =
    o.decision === "Build" && (o.confidence < 78 || s.willingnessToPay < 30 || s.switchingIntent < 45)
      ? "Build — narrow MVP"
      : o.decision;

  const mvpBlock = mvpFeatures.length
    ? mvpFeatures.map((f, i) => `${i + 1}. ${f}`).join("\n") +
      (avoid.length ? `\n\n**Do not build in v1:** ${avoid.join(", ")}.` : "")
    : `Build the narrowest product that fixes "${wedge}" for ${input.targetUser}.`;

  const risks: string[] = [];
  if (input.unavailableSources.length) {
    risks.push(`Source(s) unavailable this run: ${input.unavailableSources.map(sourceLabel).join(", ")} — evidence is thinner than ideal.`);
  }
  if (s.willingnessToPay < 35) {
    risks.push(`Willingness-to-pay is weak (${s.willingnessToPay}/100): users complain about the problem, but few explicitly say they would pay for a dedicated alternative.`);
  }
  if (s.switchingIntent < 50) {
    risks.push(`Switching intent is moderate (${s.switchingIntent}/100): complaints describe frustration more than active migration.`);
  }
  if (total < 40) {
    risks.push(`Small sample: ${total} signals — enough for a demo, not a high-confidence market decision.`);
  }
  if (alternatives.length) {
    risks.push(`Crowded space: ${alternatives.join(", ")} already compete here, and ${input.competitor} could narrow the gap over time.`);
  } else {
    risks.push(`${input.competitor} could improve on this weakness over time, so the wedge needs a sharper audience than "everyone who dislikes ${input.competitor}".`);
  }
  if (o.evidenceCount < 8) risks.push("Low evidence volume — treat confidence as provisional.");

  return `# Startup Idea Validation Report — "${input.idea}"

## Decision

${decisionLabel}

## Confidence Score

${o.confidence}/100

Breakdown: ${breakdown}

> ${DISCLAIMER}

## Best Wedge

${o.wedge}

## Evidence

Analyzed ${total} signals across ${sourcesBreakdown}.

${evidence}

## Target User

${input.targetUser}

## Competitor Weakness

Where ${input.competitor} is most exposed: ${wedge}.${alternatives.length ? `\n\nExisting alternatives already in this space: ${alternatives.join(", ")}.` : ""}

## MVP Recommendation

${mvpBlock}

## Landing Page Positioning

"Notes that work even when ${input.competitor} doesn't."

## Risks / Weak Evidence

${risks.map((r) => `- ${r}`).join("\n")}

## Next Validation Step

Talk to 5 ${input.targetUser} who left ${input.competitor} and confirm "${wedge}" is why.

---
Data: analyzed ${total} signals across ${sourcesBreakdown}. Estimated data-acquisition cost: ~$${input.estimatedCost.toFixed(2)} (paid scraper data only; excludes LLM, Apify compute, and platform costs).
`;
}
