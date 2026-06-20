import type { Opportunity, PainPoint, Source } from "./types.ts";
import { WEIGHTS } from "./score.ts";

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

// Plain-language "why is the number what it is": names the dimensions contributing and
// dragging the most (by lost weighted points), and the gap to the Build line (70).
export function explainScore(o: Opportunity): string {
  const s = o.scores;
  const dims = [
    { label: "complaint frequency", score: s.frequency, weight: WEIGHTS.frequency },
    { label: "pain severity", score: s.severity, weight: WEIGHTS.severity },
    { label: "switching intent", score: s.switchingIntent, weight: WEIGHTS.switchingIntent },
    { label: "willingness to pay", score: s.willingnessToPay, weight: WEIGHTS.willingnessToPay },
    { label: "competitor inertia", score: s.competitorInertia, weight: WEIGHTS.competitorInertia },
    { label: "startup exploitability", score: s.startupExploitability, weight: WEIGHTS.startupExploitability },
    { label: "evidence diversity", score: s.evidenceDiversity, weight: WEIGHTS.evidenceDiversity },
  ];
  const strengths = [...dims].sort((a, b) => b.score * b.weight - a.score * a.weight).slice(0, 2);
  const drags = [...dims].sort((a, b) => (100 - b.score) * b.weight - (100 - a.score) * a.weight).slice(0, 2);
  const fmt = (d: { label: string; score: number }) => `${d.label} (${d.score}/100)`;

  const toBuild = 70 - o.confidence;
  const gap =
    o.decision === "Build" ? `That clears the Build line (70), so the call is **Build**.`
    : toBuild > 0 ? `That leaves it **${toBuild} point${toBuild === 1 ? "" : "s"} below the Build line (70)**, so the call is **${o.decision}**.`
    : `So the call is **${o.decision}**.`;

  // "Loud but sticky": strong pain that users won't act on is the signal to call out.
  const stickyWarning =
    (s.switchingIntent < 45 || s.willingnessToPay < 35) && (s.frequency >= 70 || s.severity >= 70)
      ? ` Users complain loudly but show little intent to switch or pay — strong pain, weak escape velocity, which is what holds the score down.`
      : "";

  return `Carried by ${strengths.map(fmt).join(" and ")}; held back by ${drags.map(fmt).join(" and ")}. ${gap}${stickyWarning}`;
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

  // Ranked by volume — the founder's "which problems are biggest" view.
  const clusters = [...pains]
    .sort((a, b) => b.mentions - a.mentions || b.severity - a.severity)
    .slice(0, 6)
    .map((p, i) => `${i + 1}. **${p.pain}** — ${p.mentions} mention${p.mentions === 1 ? "" : "s"} · severity ${p.severity}/100 · [${sourceLabel(p.source)}] _"${p.quote}"_`)
    .join("\n") || "_No pain clusters extracted._";

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

## Why This Score

${explainScore(o)}

## Best Wedge

${o.wedge}

## Top Pain Clusters (by volume)

Ranked by how many of the ${total} analyzed signals express each pain:

${clusters}

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
