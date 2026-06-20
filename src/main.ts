import { readFile, writeFile } from "node:fs/promises";
import { detectProductType, chooseSources } from "./route.ts";
import { normalizeReview, normalizeRedditItem, filterByRatings } from "./normalize.ts";
import { estimateReviewCost, estimateRedditCost } from "./cost.ts";
import { combineSources } from "./combine.ts";
import { assembleOpportunity } from "./score.ts";
import { renderReport } from "./report.ts";
import { makeClient, extractPains, judgeOpportunity } from "./analyze.ts";
import { makeApifyClient, runReviewScraper, runRedditScraper } from "./apify.ts";
import type { SourceResult } from "./types.ts";

type Config = {
  idea: string; primaryCompetitor: string; targetUser: string; goal: string;
  ratings: number[]; maxReviews: number; maxRedditItems: number;
  actors: { reviews: string; reddit: string };
  country: string;
  appStore: { ios: string; android: string };
};

async function loadConfig(): Promise<Config> {
  return JSON.parse(await readFile(new URL("../config.json", import.meta.url), "utf8"));
}

async function mockSources(cfg: Config): Promise<SourceResult[]> {
  const rawReviews = JSON.parse(await readFile(new URL("../mocks/mock-reviews.json", import.meta.url), "utf8"));
  const rawReddit = JSON.parse(await readFile(new URL("../mocks/mock-reddit.json", import.meta.url), "utf8"));
  const reviews = filterByRatings(rawReviews.map(normalizeReview), cfg.ratings);
  const reddit = rawReddit.map(normalizeRedditItem);
  return [
    { source: "app_review", ok: true, items: reviews, costEstimate: estimateReviewCost(reviews.length) },
    { source: "reddit", ok: true, items: reddit, costEstimate: estimateRedditCost(reddit.length) },
  ];
}

async function main() {
  const mock = process.argv.includes("--mock");
  const cfg = await loadConfig();
  const productType = detectProductType(cfg.idea);
  const wanted = chooseSources(productType);
  console.log(`Source router (rule-based) → ${productType} → [${wanted.join(", ")}]`);

  // Fetch (Tasks 9–10 implement the non-mock branch).
  const results: SourceResult[] = mock ? await mockSources(cfg) : await fetchLive(cfg, wanted);

  const combined = combineSources(results);
  for (const r of results) {
    console.log(r.ok ? `  ✓ ${r.source}: ${r.items?.length ?? 0} items` : `  ✗ ${r.source}: ${r.error}`);
  }

  const client = makeClient();
  const pains = await extractPains(combined.evidence, client);
  const judge = await judgeOpportunity(pains, cfg.idea, cfg.primaryCompetitor, client);
  const opportunity = assembleOpportunity(pains, judge);

  const md = renderReport({
    idea: cfg.idea, competitor: cfg.primaryCompetitor, targetUser: cfg.targetUser,
    opportunity, pains,
    reviewCount: combined.reviewCount, redditCount: combined.redditCount,
    usedSources: combined.usedSources, unavailableSources: combined.unavailableSources,
    estimatedCost: combined.totalCost,
  });
  await writeFile("report.md", md, "utf8");

  console.log(`\nDecision: ${opportunity.decision}  Confidence: ${opportunity.confidence}/100`);
  console.log(`Analyzed ${combined.reviewCount} reviews + ${combined.redditCount} reddit items.`);
  console.log(`Estimated data cost: ~$${combined.totalCost.toFixed(2)} (pay-per-use)`);
  console.log(`Wrote report.md`);
}

async function fetchLive(cfg: Config, wanted: string[]): Promise<SourceResult[]> {
  const apify = makeApifyClient();
  const results: SourceResult[] = [];
  if (wanted.includes("app_review")) {
    results.push(await runReviewScraper({
      actorId: cfg.actors.reviews, ios: cfg.appStore.ios, android: cfg.appStore.android,
      country: cfg.country, ratings: cfg.ratings, maxReviews: cfg.maxReviews,
    }, apify));
  }
  if (wanted.includes("reddit")) {
    results.push(await runRedditScraper({
      actorId: cfg.actors.reddit, competitor: cfg.primaryCompetitor, maxItems: cfg.maxRedditItems,
    }, apify));
  }
  return results;
}

main().catch((e) => { console.error(e); process.exit(1); });
