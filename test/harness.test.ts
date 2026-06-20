import { test } from "node:test";
import assert from "node:assert/strict";
import type { EvidenceItem } from "../src/types.ts";

test("types import and EvidenceItem is usable", () => {
  const item: EvidenceItem = { source: "reddit", text: "hello" };
  assert.equal(item.source, "reddit");
});
