import { test } from "node:test";
import assert from "node:assert/strict";
import { deriveSignalScores, computeConfidence, decide, assembleOpportunity } from "../src/score.ts";
import type { PainPoint } from "../src/types.ts";

const strongPains: PainPoint[] = Array.from({ length: 20 }, (_, i) => ({
  pain: "offline sync fails",
  source: i % 2 === 0 ? "ios_review" : "reddit",
  quote: "lost my notes offline",
  severity: 90,
  switchingIntent: true,
  willingnessToPaySignal: true,
}));

test("decide thresholds", () => {
  assert.equal(decide(80), "Build");
  assert.equal(decide(55), "Wait");
  assert.equal(decide(20), "Avoid");
});

test("deriveSignalScores rewards multi-source, severe, frequent pain", () => {
  const s = deriveSignalScores(strongPains);
  assert.equal(s.frequency, 100);          // 20 pains saturates
  assert.equal(s.severity, 90);
  assert.equal(s.switchingIntent, 100);
  assert.equal(s.evidenceDiversity, 100);  // both sources present
});

test("empty pains score zero", () => {
  const s = deriveSignalScores([]);
  assert.equal(s.frequency, 0);
  assert.equal(s.severity, 0);
});

test("assembleOpportunity produces a Build for strong evidence", () => {
  const opp = assembleOpportunity(strongPains, {
    wedge: "Offline-first notes",
    competitorInertia: 80,
    startupExploitability: 85,
  });
  assert.equal(opp.decision, "Build");
  assert.ok(opp.confidence >= 70);
  assert.deepEqual([...opp.sources].sort(), ["ios_review", "reddit"]);
  assert.equal(opp.evidenceCount, 20);
});

test("computeConfidence clamps to 0–100", () => {
  const c = computeConfidence({
    frequency: 100, severity: 100, switchingIntent: 100, willingnessToPay: 100,
    evidenceDiversity: 100, competitorInertia: 100, startupExploitability: 100,
  });
  assert.equal(c, 100);
});
