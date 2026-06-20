import { ApifyClient } from "apify-client";
import { normalizeReview, normalizeRedditItem, normalizeThreads, filterByRatings } from "./normalize.ts";
import { estimateReviewCost, estimateRedditCost } from "./cost.ts";
import type { SourceResult, EvidenceItem, Source } from "./types.ts";

// Hard caps so a blocked/rate-limited source (e.g. Reddit 403/429) can never
// stall the whole run — it times out fast and we degrade to the other sources.
const TIMEOUT_REVIEWS = 180;
const TIMEOUT_SOCIAL = 75;
const RESIDENTIAL = { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] };

export function makeApifyClient(): ApifyClient {
  return new ApifyClient({ token: process.env.APIFY_TOKEN });
}

// An ok source must have actually returned data; empty = treat as unavailable
// so the report's Risks section flags it instead of silently counting zero.
function result(source: Source, items: EvidenceItem[], cost: number): SourceResult {
  return items.length
    ? { source, ok: true, items, costEstimate: cost }
    : { source, ok: false, items: [], costEstimate: 0, error: "no usable data (blocked, rate-limited, or timed out)" };
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
    const run = await client.actor(cfg.actorId).call(
      { appId: cfg.appId, store: cfg.store, country: cfg.country, maxReviews: cfg.maxReviews },
      { timeout: TIMEOUT_REVIEWS },
    );
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    const normalized = filterByRatings(items.map((r) => normalizeReview(r, cfg.source)), cfg.ratings)
      .filter((e) => e.text.length > 0)
      .slice(0, cfg.maxReviews);
    return result(cfg.source, normalized, estimateReviewCost(normalized.length));
  } catch (e) {
    return { source: cfg.source, ok: false, items: [], costEstimate: 0, error: String(e) };
  }
}

export type SocialCfg = { actorId: string; competitor: string; maxItems: number };

export async function runRedditScraper(cfg: SocialCfg, client: ApifyClient): Promise<SourceResult> {
  try {
    const searches = ["slow", "offline", "alternative", "bug"].map((w) => `${cfg.competitor} ${w}`);
    const run = await client.actor(cfg.actorId).call(
      {
        searches, searchPosts: true, searchComments: true, sort: "relevance", maxItems: cfg.maxItems,
        maxRequestRetries: 2, // don't grind through endless retries when Reddit blocks
        proxy: RESIDENTIAL, // full trudax/reddit-scraper reads `proxy`; residential dodges most 403s
      },
      { timeout: TIMEOUT_SOCIAL },
    );
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    const normalized = items.map(normalizeRedditItem).filter((e) => e.text.length > 0).slice(0, cfg.maxItems);
    return result("reddit", normalized, estimateRedditCost(normalized.length));
  } catch (e) {
    return { source: "reddit", ok: false, items: [], costEstimate: 0, error: String(e) };
  }
}

export async function runThreadsScraper(cfg: SocialCfg, client: ApifyClient): Promise<SourceResult> {
  try {
    const run = await client.actor(cfg.actorId).call(
      {
        queries: [`${cfg.competitor} slow`, `${cfg.competitor} offline`, `${cfg.competitor} alternative`],
        maxItems: cfg.maxItems, maxRequestRetries: 2,
        proxy: RESIDENTIAL, proxyConfiguration: RESIDENTIAL,
      },
      { timeout: TIMEOUT_SOCIAL },
    );
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    const normalized = items.map(normalizeThreads).filter((e) => e.text.length > 0).slice(0, cfg.maxItems);
    return result("threads", normalized, estimateRedditCost(normalized.length));
  } catch (e) {
    return { source: "threads", ok: false, items: [], costEstimate: 0, error: String(e) };
  }
}
