# WedgeFinder

WedgeFinder helps a founder decide whether an idea is worth building.

Give it an idea and one competitor. It buys live App Store + Google Play reviews, Reddit complaints, and Threads chatter (pay-per-use, via Apify Actors), extracts the real pain points, scores the opportunity across 7 dimensions, and writes a **decision-first report** — Build / Wait / Avoid — with a confidence score and the real user quotes behind it.

> It does **not** promise the "correct" decision. It reduces guessing by turning real user complaints into an evidence-backed build/no-build call.

## What makes it useful

- **A decision, not a dashboard.** The report leads with Build / Wait / Avoid and a 0–100 confidence score — not charts you have to interpret.
- **Pay-per-use.** It buys only the data it needs for one question (cents-to-low-dollars), instead of a monthly subscription.
- **The agent picks the sources.** It chooses which data to buy based on the product type.
- **Evidence you can check.** Every conclusion cites real user quotes and says where the evidence is thin.
- **Resilient.** Any single data source can fail and the report still ships from the rest.

## How it works

```
Founder idea + competitor
   → rule-based source router picks data sources
   → pay-per-use fetch: App Store + Google Play reviews, Reddit + Threads complaints (Apify Actors)
   → Claude extracts pain points (structured)
   → score 7 dimensions → Build Confidence Score (0–100) → Build / Wait / Avoid
   → report.md  (decision-first, with cited quotes + risks)
```

**The 7 scoring dimensions:** Pain Frequency · Pain Severity · Switching Intent · Willingness to Pay · Competitor Inertia · Startup Exploitability · Evidence Diversity.

The confidence score is a transparent heuristic — every report shows the per-dimension breakdown and states plainly that it is *a guide to reduce guessing, not a prediction of startup success*.

## Setup

Requires **Node.js ≥ 22.6** (uses native TypeScript type-stripping — no build step).

```bash
cp .env.example .env       # add APIFY_TOKEN + GEMINI_API_KEY
npm install
```

## Run

```bash
npm run start:mock         # offline: runs the full report flow on bundled mock data
npm start                  # live: pays per-use for real review + Reddit data
```

Edit `config.json` to change the idea, competitor, and App Store URLs.

## Test

```bash
npm test                   # node:test, no extra tooling
```

## Project layout

| File | Responsibility |
|---|---|
| `src/route.ts` | rule-based source router (product type → which sources to buy) |
| `src/normalize.ts` | raw actor JSON → normalized evidence |
| `src/score.ts` | pure 7-dimension scoring → confidence + Build/Wait/Avoid |
| `src/combine.ts` | merge sources with graceful degradation |
| `src/cost.ts` | pay-per-use cost estimates |
| `src/report.ts` | decision-first Markdown report |
| `src/analyze.ts` | Gemini pain extraction + opportunity judging |
| `src/apify.ts` | call Apify Actors (App Store + Google Play reviews, Reddit, Threads) |
| `src/main.ts` | orchestrator (`--mock` for offline) |

Design and implementation plan live in `docs/superpowers/`.

## Data sources

Actor IDs live in `config.json` (`actors`) — the code stays actor-agnostic, so any can be swapped. Current defaults:

| Source | Actor | Why |
|---|---|---|
| App Store (iOS) | `johnvc/apple-app-store-reviews-api` | API-based; takes the numeric App Store id |
| Google Play | `andok/app-store-reviews` | `store: "google"`, takes the package name |
| Reddit | `fatihtahta/reddit-scraper-search-fast` | API-based search — avoids the 403 blocking that browser scrapers (e.g. `reddit-scraper-lite`) hit |
| Threads | `watcher.data/search-threads-by-keywords` | keyword search over Threads |

All are pay-per-event (cents-to-low-dollars per run).

## Notes

- Any single data source can fail; the report still ships from the rest (graceful degradation).
- Apify actor IDs live in `config.json` — the code stays actor-agnostic.
- Email delivery is optional and never on the critical path.

---

*Started from the [Apify agents-data-workshop](https://github.com/apify/agents-data-workshop) (MIT). WedgeFinder is an independent project built on top of it.*

## License

MIT, see [LICENSE](./LICENSE) for details.
