// Published rates (see spec §3 pitch hygiene). Treat as estimates only.
const REVIEW_RATE_PER_1000 = 1.0; // andok/app-store-reviews: from ~$1.00 / 1000
const REDDIT_RATE_PER_1000 = 0.5; // conservative placeholder estimate

export function estimateReviewCost(n: number): number {
  return Math.round((n / 1000) * REVIEW_RATE_PER_1000 * 100) / 100;
}

export function estimateRedditCost(n: number): number {
  return Math.round((n / 1000) * REDDIT_RATE_PER_1000 * 100) / 100;
}
