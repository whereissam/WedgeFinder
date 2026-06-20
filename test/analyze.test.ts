import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePainsResponse, parseJudgeResponse } from "../src/analyze.ts";

test("parsePainsResponse coerces a valid tool payload", () => {
  const pains = parsePainsResponse({
    pains: [
      { pain: "sync fails", source: "ios_review", quote: "lost notes", severity: 90,
        switchingIntent: true, willingnessToPaySignal: false },
    ],
  });
  assert.equal(pains.length, 1);
  assert.equal(pains[0].severity, 90);
  assert.equal(pains[0].source, "ios_review");
});

test("parsePainsResponse clamps severity and defaults bad source to reddit", () => {
  const pains = parsePainsResponse({
    pains: [{ pain: "x", source: "weird", quote: "q", severity: 500, switchingIntent: "yes" }],
  });
  assert.equal(pains[0].severity, 100);
  assert.equal(pains[0].source, "reddit");
  assert.equal(pains[0].switchingIntent, true);
});

test("parsePainsResponse throws on non-array payload", () => {
  assert.throws(() => parsePainsResponse({ pains: "nope" }));
});

test("parseJudgeResponse coerces and clamps", () => {
  const j = parseJudgeResponse({ wedge: "offline notes", competitorInertia: 150, startupExploitability: 80 });
  assert.equal(j.wedge, "offline notes");
  assert.equal(j.competitorInertia, 100);
  assert.equal(j.startupExploitability, 80);
});
