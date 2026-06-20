import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeReview, normalizeRedditItem, normalizeThreads, filterByRatings } from "../src/normalize.ts";

test("normalizes a raw app review with the given source", () => {
  const e = normalizeReview({ text: "Sync is broken", score: 1, userName: "ana", url: "u" }, "ios_review");
  assert.equal(e.source, "ios_review");
  assert.equal(e.text, "Sync is broken");
  assert.equal(e.rating, 1);
  assert.equal(e.author, "ana");
});

test("normalizes a raw reddit item", () => {
  const e = normalizeRedditItem({ body: "Notion offline sucks", username: "bob", url: "r" });
  assert.equal(e.source, "reddit");
  assert.equal(e.text, "Notion offline sucks");
  assert.equal(e.author, "bob");
});

test("normalizes a raw threads post", () => {
  const e = normalizeThreads({ text: "Notion is too slow", username: "kim", url: "t" });
  assert.equal(e.source, "threads");
  assert.equal(e.text, "Notion is too slow");
  assert.equal(e.author, "kim");
});

test("filterByRatings keeps non-review sources and low-star reviews, drops 5-star reviews", () => {
  const items = [
    { source: "android_review", text: "bad", rating: 1 },
    { source: "android_review", text: "great", rating: 5 },
    { source: "reddit", text: "complaint" },
    { source: "threads", text: "post" },
  ] as const;
  const kept = filterByRatings([...items], [1, 2, 3]);
  assert.equal(kept.length, 3);
  assert.ok(kept.every((i) => i.text !== "great"));
});
