import { test } from "node:test";
import assert from "node:assert/strict";
import { detectProductType, chooseSources } from "../src/route.ts";

test("detects a mobile/note-taking app", () => {
  assert.equal(detectProductType("Offline-first Notion alternative for students"), "mobile_app");
});

test("detects a browser extension", () => {
  assert.equal(detectProductType("A Chrome extension for tab management"), "browser_extension");
});

test("unknown idea falls back to dual source", () => {
  assert.deepEqual(chooseSources("unknown"), ["app_review", "reddit"]);
});

test("mobile app uses both sources", () => {
  assert.deepEqual(chooseSources("mobile_app"), ["app_review", "reddit"]);
});
