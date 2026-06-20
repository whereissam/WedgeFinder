import { test } from "node:test";
import assert from "node:assert/strict";
import { estimateReviewCost, estimateRedditCost } from "../src/cost.ts";
import { combineSources } from "../src/combine.ts";
import type { SourceResult } from "../src/types.ts";

test("review cost is $1 per 1000", () => {
  assert.equal(estimateReviewCost(200), 0.2);
  assert.equal(estimateReviewCost(0), 0);
});

test("reddit cost is non-negative", () => {
  assert.ok(estimateRedditCost(100) >= 0);
});

test("combine merges ok sources and flags failed ones", () => {
  const results: SourceResult[] = [
    { source: "ios_review", ok: true, items: [{ source: "ios_review", text: "a", rating: 1 }], costEstimate: 0.2 },
    { source: "reddit", ok: false, items: [], costEstimate: 0, error: "rate limited" },
  ];
  const c = combineSources(results);
  assert.deepEqual(c.usedSources, ["ios_review"]);
  assert.deepEqual(c.unavailableSources, ["reddit"]);
  assert.equal(c.counts.ios_review, 1);
  assert.equal(c.counts.reddit ?? 0, 0);
  assert.equal(c.evidence.length, 1);
});

test("combine handles multiple ok sources and sums cost", () => {
  const results: SourceResult[] = [
    { source: "ios_review", ok: true, items: [{ source: "ios_review", text: "a", rating: 1 }], costEstimate: 0.2 },
    { source: "reddit", ok: true, items: [{ source: "reddit", text: "b" }], costEstimate: 0.05 },
    { source: "threads", ok: true, items: [{ source: "threads", text: "c" }], costEstimate: 0.0 },
  ];
  const c = combineSources(results);
  assert.deepEqual([...c.usedSources].sort(), ["ios_review", "reddit", "threads"]);
  assert.equal(c.unavailableSources.length, 0);
  assert.equal(c.counts.ios_review, 1);
  assert.equal(c.counts.reddit, 1);
  assert.equal(c.counts.threads, 1);
  assert.equal(c.totalCost, 0.25);
});
