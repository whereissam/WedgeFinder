import type { Opportunity, PainPoint, Source } from "./types.ts";

export const DISCLAIMER =
  "This is a heuristic confidence score based on observed demand signals, not a prediction of startup success.";

export type ReportInput = {
  idea: string;
  competitor: string;
  targetUser: string;
  opportunity: Opportunity;
  pains: PainPoint[];
  reviewCount: number;
  redditCount: number;
  usedSources: Source[];
  unavailableSources: Source[];
  estimatedCost: number;
};

export function renderReport(input: ReportInput): string {
  const { opportunity: o, pains } = input;
  const s = o.scores;
  const breakdown =
    `Frequency ${s.frequency} · Severity ${s.severity} · Switching ${s.switchingIntent} · ` +
    `WTP ${s.willingnessToPay} · Inertia ${s.competitorInertia} · ` +
    `Exploitability ${s.startupExploitability} · Diversity ${s.evidenceDiversity}`;

  const evidence = pains.slice(0, 8)
    .map((p) => `- [${p.source}] "${p.quote}" — _${p.pain}_`)
    .join("\n") || "_No specific quotes extracted._";

  const risks: string[] = [];
  if (input.unavailableSources.length) {
    risks.push(`Source(s) unavailable this run: ${input.unavailableSources.join(", ")} — evidence is thinner than ideal.`);
  }
  if (o.evidenceCount < 8) risks.push("Low evidence volume — treat confidence as provisional.");
  if (!risks.length) risks.push("Evidence is reasonable but still a sample of vocal users, not the whole market.");

  return `# Startup Idea Validation Report — "${input.idea}"

## Decision

${o.decision}

## Confidence Score

${o.confidence}/100

Breakdown: ${breakdown}

> ${DISCLAIMER}

## Best Wedge

${o.wedge}

## Evidence

Analyzed ${input.reviewCount} app reviews + ${input.redditCount} Reddit items across ${input.usedSources.join(", ") || "no sources"}.

${evidence}

## Target User

${input.targetUser}

## Competitor Weakness

Where ${input.competitor} is most exposed: ${o.wedge}.

## MVP Recommendation

Build the narrowest product that fixes "${o.wedge}" for ${input.targetUser}.

## Landing Page Positioning

"Notes that work even when ${input.competitor} doesn't."

## Risks / Weak Evidence

${risks.map((r) => `- ${r}`).join("\n")}

## Next Validation Step

Talk to 5 ${input.targetUser} who left ${input.competitor} and confirm "${o.wedge}" is why.

---
Data: analyzed ${input.reviewCount} reviews + ${input.redditCount} Reddit items across ${input.usedSources.join(", ") || "none"}. Estimated data cost: ~$${input.estimatedCost.toFixed(2)} (pay-per-use, cents-to-low-dollars).
`;
}
