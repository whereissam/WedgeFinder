import type { EvidenceItem } from "./types.ts";

export function normalizeReview(raw: any): EvidenceItem {
  const rating =
    typeof raw.rating === "number" ? raw.rating
    : typeof raw.score === "number" ? raw.score
    : Number(raw.score) || undefined;
  return {
    source: "app_review",
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

export function filterByRatings(items: EvidenceItem[], ratings: number[]): EvidenceItem[] {
  return items.filter(
    (i) => i.source !== "app_review" || (i.rating !== undefined && ratings.includes(i.rating)),
  );
}
