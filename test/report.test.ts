import { test } from "node:test";
import assert from "node:assert/strict";
import { renderReport, DISCLAIMER } from "../src/report.ts";
import type { Opportunity, PainPoint } from "../src/types.ts";

const opp: Opportunity = {
  wedge: "Offline-first notes for students",
  evidenceCount: 12,
  sources: ["ios_review", "reddit"],
  scores: { frequency: 60, severity: 88, switchingIntent: 70, willingnessToPay: 50,
    competitorInertia: 80, startupExploitability: 85, evidenceDiversity: 100 },
  confidence: 76,
  decision: "Build",
};
const pains: PainPoint[] = [{
  pain: "offline sync fails", source: "ios_review", quote: "I lost my notes offline",
  severity: 90, switchingIntent: true, willingnessToPaySignal: false,
}];

test("report leads with decision and confidence", () => {
  const md = renderReport({
    idea: "Offline-first Notion alternative", competitor: "Notion", targetUser: "students",
    opportunity: opp, pains, counts: { ios_review: 120, android_review: 80, reddit: 87, threads: 20 },
    usedSources: ["ios_review", "android_review", "reddit", "threads"], unavailableSources: [], estimatedCost: 0.2,
  });
  assert.match(md, /## Decision\s*\n+Build/);
  assert.match(md, /76\/100/);
  assert.ok(md.includes(DISCLAIMER));
  assert.ok(md.includes("I lost my notes offline"));   // cited evidence
  assert.match(md, /Severity 88/);                      // dimension breakdown
  assert.match(md, /## Risks/);
  assert.match(md, /App Store/);                         // source label in breakdown
});

test("report notes unavailable sources in risks", () => {
  const md = renderReport({
    idea: "X", competitor: "Notion", targetUser: "students", opportunity: opp, pains,
    counts: { ios_review: 120 }, usedSources: ["ios_review"],
    unavailableSources: ["reddit"], estimatedCost: 0.2,
  });
  assert.match(md, /reddit/i);
});
