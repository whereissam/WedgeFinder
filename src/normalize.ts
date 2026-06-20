import type { EvidenceItem, Source } from "./types.ts";

const REVIEW_SOURCES: Source[] = ["ios_review", "android_review"];

export function normalizeReview(raw: any, source: "ios_review" | "android_review"): EvidenceItem {
  const rating =
    typeof raw.rating === "number" ? raw.rating
    : typeof raw.score === "number" ? raw.score
    : Number(raw.score) || undefined;
  return {
    source,
    text: String(raw.text ?? raw.review ?? raw.body ?? "").trim(),
    rating,
    url: raw.url,
    date: raw.date ?? raw.updated,
    author: raw.userName ?? raw.author,
  };
}

export function normalizeRedditItem(raw: any): EvidenceItem {
  return {
    source: "reddit",
    text: String(raw.body ?? raw.text ?? raw.title ?? "").trim(),
    url: raw.url ?? raw.link,
    date: raw.createdAt ?? raw.date,
    author: raw.username ?? raw.author,
  };
}

export function normalizeThreads(raw: any): EvidenceItem {
  return {
    source: "threads",
    text: String(raw.text ?? raw.caption ?? raw.body ?? "").trim(),
    url: raw.url ?? raw.link,
    date: raw.publishedAt ?? raw.date,
    author: raw.username ?? raw.author,
  };
}

// Reviews must carry a rating in the allowed set; non-review sources are always kept.
export function filterByRatings(items: EvidenceItem[], ratings: number[]): EvidenceItem[] {
  return items.filter(
    (i) => !REVIEW_SOURCES.includes(i.source) || (i.rating !== undefined && ratings.includes(i.rating)),
  );
}
