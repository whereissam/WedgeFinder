# WedgeFinder — Demo Cheat Sheet

## One-liner
> WedgeFinder helps a founder decide whether an idea is worth building. Give it an idea + a competitor; it buys real user complaints from App Store, Google Play, Reddit and Threads, and returns a **Build / Wait / Avoid** decision backed by real quotes.

## Run it (pick ONE — both reliable)

### A. Local CLI (most reliable on stage)
```bash
npm run start:mock
```
Instant. Shows the router picking 4 sources, then a `Build` decision + `report.md`.

### B. Published Apify Actor (the "I shipped it" moment)
Console → your `wedgefinder` Actor → **Run**, with **"Use bundled mock data" checked**.
- One-time setup: Settings → Environment variables → add `GEMINI_API_KEY` (secret).
- Output: a row in the **Dataset** + a `REPORT` markdown in the **Key-value store**.

> Demo in **Mock mode**. It runs the full pipeline + real Gemini analysis on bundled complaints — no live-scraper 403/429, no 7-min wait, no memory limit.

## What to say (60 seconds)
1. "Founders don't need another idea generator — they need conviction before building."
2. Run it → router picks **App Store · Google Play · Reddit · Threads**.
3. "It pays per-use for real complaints, then Gemini extracts the pains."
4. Open the report: **Decision (Build/Wait/Avoid) + confidence + the per-dimension breakdown + real user quotes**.
5. Close: "Not a dashboard — a decision. Pay-per-use, not a monthly subscription."

## Talking points
- **Multi-source, agentic:** the agent decides which sources to buy from the product type.
- **Decision, not a dashboard:** leads with Build/Wait/Avoid + a 0–100 confidence score and its 7-dimension breakdown.
- **Evidence you can check:** every conclusion cites a real user quote.
- **Graceful degradation (use this if asked about Reddit):** "Reddit rate-limited us live — the agent still delivered from the other three sources and flagged Reddit as thin evidence. It can't fall over because one source blocks you."
- **Honesty is the point:** on concentrated demand it says Build; on noisy real data it may say Wait (people complain but few say they'd switch/pay). The tool refuses to give false confidence.

## Don't overclaim (so judges can't poke holes)
- Cost: say "pay-per-use, cents-to-low-dollars" — not a fixed number.
- Competitors: "subscription tools that start at tens-to-hundreds per month."
- It "reduces guessing with evidence" — it does not predict success.

## If asked "is it real / did it really pull live data?"
Yes — show `docs/sample-report.md`: an actual live run on 35 real Notion Google Play reviews + 22 Reddit items, with real quotes. Live mode works; it's just slow + rate-limited, so the on-stage run uses mock.
