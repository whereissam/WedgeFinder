// Resolve a competitor name to an iOS App Store numeric id using Apple's
// free iTunes Search API (no key required). Returns "" if nothing is found.
export async function resolveIosAppId(name: string, country = "us"): Promise<string> {
  try {
    const url =
      `https://itunes.apple.com/search?term=${encodeURIComponent(name)}` +
      `&entity=software&country=${encodeURIComponent(country)}&limit=1`;
    const res = await fetch(url);
    if (!res.ok) return "";
    const data: any = await res.json();
    const trackId = data?.results?.[0]?.trackId;
    return trackId ? String(trackId) : "";
  } catch {
    return "";
  }
}
