import { Actor } from "apify";
import { readFile } from "node:fs/promises";
import { runPipeline, type WfConfig } from "./pipeline.ts";

await Actor.init();

const input = ((await Actor.getInput()) ?? {}) as Record<string, any>;

// Allow the Gemini key to come from the input form (falls back to the env var).
if (input.geminiApiKey) process.env.GEMINI_API_KEY = String(input.geminiApiKey);
if (!process.env.GEMINI_API_KEY) {
  throw new Error("No Gemini API key. Set the 'Gemini API key' input or a GEMINI_API_KEY environment variable on the Actor.");
}

const defaults: WfConfig = JSON.parse(await readFile(new URL("../config.json", import.meta.url), "utf8"));

const cfg: WfConfig = {
  ...defaults,
  idea: input.idea ?? defaults.idea,
  primaryCompetitor: input.primaryCompetitor ?? defaults.primaryCompetitor,
  targetUser: input.targetUser ?? defaults.targetUser,
  maxReviews: input.maxReviews ?? defaults.maxReviews,
  maxRedditItems: input.maxRedditItems ?? defaults.maxRedditItems,
  maxThreadsItems: input.maxThreadsItems ?? defaults.maxThreadsItems,
  appStore: {
    ios: input.iosAppId ?? defaults.appStore.ios,
    android: input.androidAppId ?? defaults.appStore.android,
  },
};
const mock = Boolean(input.mock);

console.log(`WedgeFinder: validating "${cfg.idea}" vs ${cfg.primaryCompetitor} (mock=${mock})`);
const { opportunity, combined, md, productType, wanted } = await runPipeline(cfg, { mock });

await Actor.pushData({
  idea: cfg.idea,
  competitor: cfg.primaryCompetitor,
  productType,
  sourcesRequested: wanted,
  sourcesUsed: combined.usedSources,
  sourcesUnavailable: combined.unavailableSources,
  counts: combined.counts,
  decision: opportunity.decision,
  confidence: opportunity.confidence,
  wedge: opportunity.wedge,
  scores: opportunity.scores,
  estimatedCost: combined.totalCost,
  report: md,
});

await Actor.setValue("REPORT", md, { contentType: "text/markdown; charset=utf-8" });

console.log(`Decision: ${opportunity.decision}  Confidence: ${opportunity.confidence}/100`);
console.log("Report saved to dataset + key-value store (key: REPORT).");

await Actor.exit();
