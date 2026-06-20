import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeReview, normalizeRedditItem, filterByRatings } from "../src/normalize.ts";

test("normalizes a raw app review", () => {
  const e = normalizeReview({ text: "Sync is broken", score: 1, userName: "ana", url: "u" });
  assert.equal(e.source, "app_review");
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

test("filterByRatings keeps reddit and low-star reviews, drops 5-star reviews", () => {
  const items = [
    { source: "app_review", text: "bad", rating: 1 },
    { source: "app_review", text: "great", rating: 5 },
    { source: "reddit", text: "complaint" },
  ] as const;
  const kept = filterByRatings([...items], [1, 2, 3]);
  assert.equal(kept.length, 2);
  assert.ok(kept.every((i) => i.text !== "great"));
});
