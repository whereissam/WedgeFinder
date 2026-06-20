import { ApifyClient } from "apify-client";
import { normalizeReview, normalizeRedditItem, filterByRatings } from "./normalize.ts";
import { estimateReviewCost, estimateRedditCost } from "./cost.ts";
import type { SourceResult } from "./types.ts";

export function makeApifyClient(): ApifyClient {
  return new ApifyClient({ token: process.env.APIFY_TOKEN });
}

export type ReviewCfg = {
  actorId: string; ios: string; android: string; country: string;
  ratings: number[]; maxReviews: number;
};

// andok/app-store-reviews takes one app per call: { appId, store, country, maxReviews }.
// It has no rating filter, so we filter 1–3★ client-side. Covering both stores = two calls.
async function fetchStore(
  client: ApifyClient, actorId: string, appId: string, store: "apple" | "google",
  country: string, maxReviews: number,
): Promise<any[]> {
  const run = await client.actor(actorId).call({ appId, store, country, maxReviews });
  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  return items;
}

export async function runReviewScraper(cfg: ReviewCfg, client: ApifyClient): Promise<SourceResult> {
  try {
    const stores: Array<[string, "apple" | "google"]> = [];
    if (cfg.ios) stores.push([cfg.ios, "apple"]);
    if (cfg.android) stores.push([cfg.android, "google"]);
    if (stores.length === 0) {
      throw new Error("no appId configured (set appStore.ios or appStore.android)");
    }
    const raw: any[] = [];
    for (const [appId, store] of stores) {
      raw.push(...(await fetchStore(client, cfg.actorId, appId, store, cfg.country, cfg.maxReviews)));
    }
    const normalized = filterByRatings(raw.map(normalizeReview), cfg.ratings)
      .filter((e) => e.text.length > 0)
      .slice(0, cfg.maxReviews);
    return {
      source: "app_review", ok: true, items: normalized,
      costEstimate: estimateReviewCost(normalized.length),
    };
  } catch (e) {
    return { source: "app_review", ok: false, items: [], costEstimate: 0, error: String(e) };
  }
}

export type RedditCfg = { actorId: string; competitor: string; maxItems: number };

export async function runRedditScraper(cfg: RedditCfg, client: ApifyClient): Promise<SourceResult> {
  try {
    const searches = ["slow", "offline", "alternative", "bug"].map((w) => `${cfg.competitor} ${w}`);
    const run = await client.actor(cfg.actorId).call({
      searches, searchPosts: true, searchComments: true, sort: "relevance", maxItems: cfg.maxItems,
    });
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    const normalized = items.map(normalizeRedditItem)
      .filter((e) => e.text.length > 0)
      .slice(0, cfg.maxItems);
    return {
      source: "reddit", ok: true, items: normalized,
      costEstimate: estimateRedditCost(normalized.length),
    };
  } catch (e) {
    return { source: "reddit", ok: false, items: [], costEstimate: 0, error: String(e) };
  }
}
