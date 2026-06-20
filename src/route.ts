import type { Source } from "./types.ts";

export type ProductType =
  | "mobile_app" | "browser_extension" | "b2b_saas" | "dev_tool" | "consumer" | "unknown";

export function detectProductType(idea: string): ProductType {
  const t = idea.toLowerCase();
  if (/\b(extension|chrome|browser)\b/.test(t)) return "browser_extension";
  if (/\b(saas|b2b|team|enterprise|crm|dashboard)\b/.test(t)) return "b2b_saas";
  if (/\b(cli|sdk|api|developer|dev tool|library)\b/.test(t)) return "dev_tool";
  if (/\b(app|ios|android|mobile|notes?|note-taking|notion)\b/.test(t)) return "mobile_app";
  return "unknown";
}

// App-like products get the full multi-source sweep (both app stores + social);
// non-app products skip the app stores.
export function chooseSources(productType: ProductType): Source[] {
  switch (productType) {
    case "browser_extension":
    case "b2b_saas":
    case "dev_tool":
      return ["reddit", "threads"];
    case "mobile_app":
    case "consumer":
    case "unknown":
    default:
      return ["ios_review", "android_review", "reddit", "threads"];
  }
}
