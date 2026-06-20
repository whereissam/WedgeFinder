import { ApifyClient } from "apify-client";
import { normalizeReview, normalizeRedditItem, normalizeThreads, filterByRatings } from "./normalize.ts";
import { estimateReviewCost, estimateRedditCost } from "./cost.ts";
import type { SourceResult, Source } from "./types.ts";

export function makeApifyClient(): ApifyClient {
  return new ApifyClient({ token: process.env.APIFY_TOKEN });
}

export type StoreCfg = {
  actorId: string; appId: string; store: "apple" | "google";
  source: "ios_review" | "android_review"; country: string;
  ratings: number[]; maxReviews: number;
};

// andok/app-store-reviews takes one app per call: { appId, store, country, maxReviews }.
// It has no rating filter, so we filter 1–3★ client-side.
export async function runStoreReviews(cfg: StoreCfg, client: ApifyClient): Promise<SourceResult> {
  try {
    if (!cfg.appId) throw new Error(`no appId configured for ${cfg.source}`);
    const run = await client.actor(cfg.actorId).call({
      appId: cfg.appId, store: cfg.store, country: cfg.country, maxReviews: cfg.maxReviews,
    });
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    const normalized = filterByRatings(items.map((r) => normalizeReview(r, cfg.source)), cfg.ratings)
      .filter((e) => e.text.length > 0)
      .slice(0, cfg.maxReviews);
    return { source: cfg.source, ok: true, items: normalized, costEstimate: estimateReviewCost(normalized.length) };
  } catch (e) {
    return { source: cfg.source, ok: false, items: [], costEstimate: 0, error: String(e) };
  }
}

export type SocialCfg = { actorId: string; competitor: string; maxItems: number };

export async function runRedditScraper(cfg: SocialCfg, client: ApifyClient): Promise<SourceResult> {
  try {
    const searches = ["slow", "offline", "alternative", "bug"].map((w) => `${cfg.competitor} ${w}`);
    const run = await client.actor(cfg.actorId).call({
      searches, searchPosts: true, searchComments: true, sort: "relevance", maxItems: cfg.maxItems,
      // Reddit blocks datacenter IPs (403); residential proxies avoid it.
      proxy: { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] },
      proxyConfiguration: { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] },
    });
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    const normalized = items.map(normalizeRedditItem).filter((e) => e.text.length > 0).slice(0, cfg.maxItems);
    return { source: "reddit", ok: true, items: normalized, costEstimate: estimateRedditCost(normalized.length) };
  } catch (e) {
    return { source: "reddit", ok: false, items: [], costEstimate: 0, error: String(e) };
  }
}

export async function runThreadsScraper(cfg: SocialCfg, client: ApifyClient): Promise<SourceResult> {
  try {
    const run = await client.actor(cfg.actorId).call({
      queries: [`${cfg.competitor} slow`, `${cfg.competitor} offline`, `${cfg.competitor} alternative`],
      maxItems: cfg.maxItems,
      proxy: { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] },
      proxyConfiguration: { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] },
    });
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    const normalized = items.map(normalizeThreads).filter((e) => e.text.length > 0).slice(0, cfg.maxItems);
    return { source: "threads", ok: true, items: normalized, costEstimate: estimateRedditCost(normalized.length) };
  } catch (e) {
    return { source: "threads", ok: false, items: [], costEstimate: 0, error: String(e) };
  }
}
