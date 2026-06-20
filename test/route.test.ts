import { test } from "node:test";
import assert from "node:assert/strict";
import { detectProductType, chooseSources } from "../src/route.ts";

test("detects a mobile/note-taking app", () => {
  assert.equal(detectProductType("Offline-first Notion alternative for students"), "mobile_app");
});

test("detects a browser extension", () => {
  assert.equal(detectProductType("A Chrome extension for tab management"), "browser_extension");
});

test("unknown idea falls back to the full multi-source sweep", () => {
  assert.deepEqual(chooseSources("unknown"), ["ios_review", "android_review", "reddit", "threads"]);
});

test("mobile app uses all four sources", () => {
  assert.deepEqual(chooseSources("mobile_app"), ["ios_review", "android_review", "reddit", "threads"]);
});

test("non-app products skip the app stores", () => {
  assert.deepEqual(chooseSources("b2b_saas"), ["reddit", "threads"]);
});
