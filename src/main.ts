import { readFile, writeFile } from "node:fs/promises";
import { detectProductType, chooseSources } from "./route.ts";
import { normalizeReview, normalizeRedditItem, normalizeThreads, filterByRatings } from "./normalize.ts";
import { estimateReviewCost, estimateRedditCost } from "./cost.ts";
import { combineSources } from "./combine.ts";
import { assembleOpportunity } from "./score.ts";
import { renderReport, sourceLabel } from "./report.ts";
import { makeClient, extractPains, judgeOpportunity } from "./analyze.ts";
import { makeApifyClient, runStoreReviews, runRedditScraper, runThreadsScraper } from "./apify.ts";
import type { SourceResult, EvidenceItem } from "./types.ts";

type Config = {
  idea: string; primaryCompetitor: string; targetUser: string; goal: string;
  ratings: number[]; maxReviews: number; maxRedditItems: number; maxThreadsItems: number;
  actors: { reviews: string; reddit: string; threads: string };
  country: string;
  appStore: { ios: string; android: string };
};

async function loadConfig(): Promise<Config> {
  return JSON.parse(await readFile(new URL("../config.json", import.meta.url), "utf8"));
}

async function readMock(name: string): Promise<any[]> {
  return JSON.parse(await readFile(new URL(`../mocks/${name}`, import.meta.url), "utf8"));
}

async function mockSources(cfg: Config): Promise<SourceResult[]> {
  const [ios, android, reddit, threads] = await Promise.all([
    readMock("mock-ios.json"), readMock("mock-android.json"),
    readMock("mock-reddit.json"), readMock("mock-threads.json"),
  ]);
  const iosItems = filterByRatings(ios.map((r) => normalizeReview(r, "ios_review")), cfg.ratings);
  const androidItems = filterByRatings(android.map((r) => normalizeReview(r, "android_review")), cfg.ratings);
  const redditItems: EvidenceItem[] = reddit.map(normalizeRedditItem);
  const threadsItems: EvidenceItem[] = threads.map(normalizeThreads);
  return [
    { source: "ios_review", ok: true, items: iosItems, costEstimate: estimateReviewCost(iosItems.length) },
    { source: "android_review", ok: true, items: androidItems, costEstimate: estimateReviewCost(androidItems.length) },
    { source: "reddit", ok: true, items: redditItems, costEstimate: estimateRedditCost(redditItems.length) },
    { source: "threads", ok: true, items: threadsItems, costEstimate: estimateRedditCost(threadsItems.length) },
  ];
}

async function fetchLive(cfg: Config, wanted: string[]): Promise<SourceResult[]> {
  const apify = makeApifyClient();
  const results: SourceResult[] = [];
  if (wanted.includes("ios_review")) {
    results.push(await runStoreReviews({
      actorId: cfg.actors.reviews, appId: cfg.appStore.ios, store: "apple", source: "ios_review",
      country: cfg.country, ratings: cfg.ratings, maxReviews: cfg.maxReviews,
    }, apify));
  }
  if (wanted.includes("android_review")) {
    results.push(await runStoreReviews({
      actorId: cfg.actors.reviews, appId: cfg.appStore.android, store: "google", source: "android_review",
      country: cfg.country, ratings: cfg.ratings, maxReviews: cfg.maxReviews,
    }, apify));
  }
  if (wanted.includes("reddit")) {
    results.push(await runRedditScraper({
      actorId: cfg.actors.reddit, competitor: cfg.primaryCompetitor, maxItems: cfg.maxRedditItems,
    }, apify));
  }
  if (wanted.includes("threads")) {
    results.push(await runThreadsScraper({
      actorId: cfg.actors.threads, competitor: cfg.primaryCompetitor, maxItems: cfg.maxThreadsItems,
    }, apify));
  }
  return results;
}

async function main() {
  const mock = process.argv.includes("--mock");
  const cfg = await loadConfig();
  const productType = detectProductType(cfg.idea);
  const wanted = chooseSources(productType);
  console.log(`Source router (rule-based) → ${productType} → [${wanted.join(", ")}]`);

  const results: SourceResult[] = mock ? await mockSources(cfg) : await fetchLive(cfg, wanted);

  const combined = combineSources(results);
  for (const r of results) {
    console.log(r.ok ? `  ✓ ${sourceLabel(r.source)}: ${r.items?.length ?? 0} items` : `  ✗ ${sourceLabel(r.source)}: ${r.error}`);
  }

  const client = makeClient();
  const pains = await extractPains(combined.evidence, client);
  const judge = await judgeOpportunity(pains, cfg.idea, cfg.primaryCompetitor, client);
  const opportunity = assembleOpportunity(pains, judge);

  const md = renderReport({
    idea: cfg.idea, competitor: cfg.primaryCompetitor, targetUser: cfg.targetUser,
    opportunity, pains,
    counts: combined.counts, usedSources: combined.usedSources,
    unavailableSources: combined.unavailableSources, estimatedCost: combined.totalCost,
  });
  await writeFile("report.md", md, "utf8");

  const total = Object.values(combined.counts).reduce((a, b) => a + b, 0);
  console.log(`\nDecision: ${opportunity.decision}  Confidence: ${opportunity.confidence}/100`);
  console.log(`Analyzed ${total} signals across ${combined.usedSources.map(sourceLabel).join(", ") || "none"}.`);
  console.log(`Estimated data cost: ~$${combined.totalCost.toFixed(2)} (pay-per-use)`);
  console.log(`Wrote report.md`);
}

main().catch((e) => { console.error(e); process.exit(1); });
