# WedgeFinder — Design Spec

**Name:** WedgeFinder *(renamed from "IdeaProof Agent" — `ideaproof.io` collides, and "proof" overclaims; the product reduces uncertainty, it doesn't prove an idea is right. Alternatives if needed: BuildOrNot, FounderConviction, SignalWedge.)*
**Date:** 2026-06-20
**Status:** Approved — ready for implementation planning
**Context:** Apify + AI agents hackathon. Theme: *an agent autonomously pays for real-time web data and turns it into a business decision.*

---

## 1. One-line pitch

> **IdeaBrowser gives founders startup ideas. WedgeFinder gives founders evidence-backed conviction.** The agent takes a founder's idea, buys live complaint/review data from Apify Actors, and returns a **build / wait / avoid** memo backed by real user quotes — telling you whether the idea is worth building, who feels the pain, and which competitor weakness to attack first.

中文:

> 「IdeaBrowser 幫你找創業點子;WedgeFinder 幫你判斷這個點子值不值得做。Agent 會自己去買用戶抱怨與評論等市場訊號,最後給 early founder 一份有證據支撐的 build / wait / avoid 報告。」

Honest claim — does **not** promise the "correct" decision:

> "I reduce founder guessing by turning public demand signals into an evidence-backed build/no-build call."

---

## 2. Problem

An early founder deciding *whether to build an idea* is mostly guessing. The high-leverage validation move — reading competitors' 1–3★ reviews and community complaints to confirm real, unaddressed pain — is slow to do by hand across App Store, Google Play, and Reddit. Idea-discovery tools tell you *what* to build; nobody cheaply tells a founder *whether their specific idea is worth building*, with evidence.

## 3. Positioning (honest, defensible)

This is **idea validation with evidence**, not idea discovery and not another sentiment dashboard.

| Product | Job it does |
|---|---|
| **IdeaBrowser** | *Discover* ideas — browse a researched idea database, trends, generators (`browse → get inspired → maybe build`) |
| **Appbot / AppFollow / review-intelligence actors** | *Ongoing* review ops, ASO, support dashboards, sentiment |
| **WedgeFinder (this)** | *Validate a decision* — founder has an idea → agent buys live data → measures pain → returns a **build/wait/avoid** call with confidence (`idea → buy data → validate → conviction`) |

> "IdeaBrowser helps you browse startup ideas. WedgeFinder helps early founders prove whether an idea is worth building, using live external data. Appbot/AppFollow serve ongoing review operations; WedgeFinder serves a one-shot founder decision."

### Pitch hygiene (do NOT overstate on stage)
- **Data cost:** "pay-per-use, cents-to-low-dollars." Don't quote `$0.08` or `$0.10/1,000`. The review actor lists **from ~$1.00 / 1,000 reviews**; if pressed: *"~200 reviews ≈ $0.20 at the listed rate, before other platform costs."*
- **Competitor SaaS pricing:** "subscription SaaS starting from tens-to-hundreds per month." No "$500–2,000/month" (no source).
- **Original reports, not a reseller:** generate from public demand signals; do **not** scrape or rebrand IdeaBrowser's database (an `ideabrowser-scraper` actor exists — we don't use it as our base).
- **Router honesty:** the source router is **rule-based for MVP** (product type → which sources to buy); say "later this can become an LLM router." Don't imply complex autonomous planning.
- **Don't disparage incumbents:** they serve their job well; we serve a different one.

---

## 4. Scope

### In scope (MVP)
- **Idea-centric input:** founder gives an *idea* + **one primary competitor** + target user + "should I build this?"
- **Dual data source** with graceful degradation: (1) App Store + Google Play reviews, (2) Reddit complaints.
- **Rule-based source router:** product type → which sources to buy (documented seam for a future LLM router).
- **Intelligence layer:** extract pains → score across 7 dimensions → **Build Confidence Score (0–100)** + **Build / Wait / Avoid** decision, always shown **with per-dimension breakdown + heuristic disclaimer**.
- **Output:** a `report.md` validation memo that **leads with the decision**, prints to terminal + saves to disk.
- Print **data cost + items analyzed** (pay-per-use narrative).
- **Source transparency:** every conclusion carries real quotes + counts + source label.

### Out of scope (future work)
- More than two live sources (G2, Trustpilot, Product Hunt, Chrome Web Store, GitHub issues, HN, Stack Overflow, search/trend signals).
- **Extra competitors** — the code interface supports `extraCompetitors`, but the **demo config uses a single primary competitor** (Notion). Multiple competitors = more actor calls, longer waits, harder analysis.
- Own-product analysis / you-vs-competitor comparison.
- RAG "market memory" for trend-over-time questions.
- Workflow exports (Notion / Slack / Linear) + scheduled monitoring.
- Publishing as a priced Apify Actor.
- Email delivery — **optional bonus, never on the critical path**.

### Key scope decisions (settled)
1. **Core output = terminal + `report.md`.** Email optional — demo never depends on external email/auth/quota.
2. **Two sources, not three+.** Two makes "the agent decides what to buy" *true* without tripling on-stage fragility.
3. **Graceful degradation is mandatory:** any one source failing degrades the report (lower Evidence Diversity, noted in Risks) but never aborts the run.
4. **One primary competitor in the demo.** `extraCompetitors` stays in the interface but out of the demo config.
5. **Report leads with the decision** (Build / Wait / Avoid + score + breakdown), then evidence.
6. **Original analysis only** — public demand signals as the data base, never IdeaBrowser's database.
7. **Mock-data-first build order** (see §13 milestones) — full report flow works on mock data before any Apify call.

---

## 5. Architecture — the closed loop

```
[Founder asks] "I want to build an offline-first Notion alternative for students. Is it worth building?"
      │
      ▼
① Route (rule-based): product type → pick sources
      │   (note-taking app → App Store + Google Play + Reddit)
      ▼
② Pay + fetch (per chosen source, independently / gracefully):
      • Apify review actor → competitor's 1–3★ reviews
      • Apify Reddit actor → complaints ("<competitor> slow/offline/alternative")
      ▼
③ Intelligence (Claude, structured output):
      (a) extract pains → {pain, severity, quote, signals, source}
      (b) aggregate → opportunity scored on 7 dimensions
      (c) Build Confidence Score (0–100) + breakdown + Build/Wait/Avoid
      ▼
④ Render → report.md  (decision-first validation memo)
      │
      ▼
⑤ Print: items analyzed + data cost  (pay-per-use narrative)
      │
      ▼  (optional bonus, off critical path)
⑥ Apify Send Email Actor → email the report  (chains a 2nd Apify actor)
```

---

## 6. Components

| File | Responsibility |
|------|----------------|
| `config.json` | Idea, primary competitor, target user, goal, App Store / Google Play IDs or URLs, subreddits/keywords, star filter (1–3), max items per source, actor IDs. (`extraCompetitors` supported but empty in demo.) |
| `src/route.ts` | Rule-based: product type → which sources to pull. Documented seam where an LLM router slots in later |
| `src/apify.ts` | `runReviewScraper()`, `runRedditScraper()`, optional `sendReport()`. Each call independently try/catch'd; returns `{ ok, items, costEstimate, error }` |
| `src/analyze.ts` | Claude with **forced structured output**: `extractPains(items)` then `scoreOpportunity(pains)`. Retry once on schema failure |
| `src/score.ts` | Pure functions: aggregate 7 dimensions → `confidence` (0–100) → `decision`. Deterministic, unit-testable without the LLM |
| `src/report.ts` | Render scored result → decision-first Markdown memo (incl. score breakdown + disclaimer) |
| `src/main.ts` | Orchestrate ①→⑤(+⑥); collect cost + counts; print summary |
| `mocks/` | `mock-reviews.json`, `mock-reddit.json` for Milestone 1 (build the report before any Apify call) |
| `.env` | `APIFY_TOKEN`, `ANTHROPIC_API_KEY`, optional report recipient email |

Design principle: one job per unit, clear interface, independently testable. `score.ts` is pure (no I/O, no LLM) so confidence math + Build/Wait/Avoid thresholds are reproducible and testable.

---

## 7. Data sources (dual + graceful degradation)

- **Reviews:** `andok/app-store-reviews` (one actor covers App Store + Google Play). Pull 1–3★ only — focus on pain, save tokens.
- **Reddit:** an Apify Reddit posts/comments scraper, queried with complaint terms (`"<competitor> slow"`, `"<competitor> offline"`, `"<competitor> alternative"`).
- **Degradation contract:** sources pulled independently. On error or zero items → log, mark "unavailable," continue. **Evidence Diversity** score + the **Risks** section reflect what was actually gathered. One source failing never aborts the run.

---

## 8. Intelligence layer — the actual product

For each candidate **opportunity** (a competitor weakness the idea could exploit), score 7 dimensions:

| Dimension | Question it answers |
|---|---|
| **Pain Frequency** | How often does this complaint appear? |
| **Pain Severity** | Annoying, or does it block usage / cause data loss? |
| **Switching Intent** | Do users say they're looking for an alternative / leaving? |
| **Willingness to Pay** | Paid plans, business/team use, productivity loss mentioned? |
| **Competitor Inertia** | Hard for the incumbent to fix (architectural, not a quick patch)? |
| **Startup Exploitability** | Can a small focused team realistically build a wedge here? |
| **Evidence Diversity** | Pain appears across BOTH reviews and Reddit, not just one place? |

→ Aggregate into a **Build Confidence Score (0–100)**, mapped to a decision:
- **Build** — strong pain, clear audience, exploitable, multi-source evidence
- **Wait** — real signal but thin/uncertain; validate further first
- **Avoid** — weak pain / low exploitability (e.g. "too expensive" → price war)

**Transparency requirement:** the score is **always shown with its per-dimension breakdown** plus the disclaimer:
> "This is a heuristic confidence score based on observed demand signals, not a prediction of startup success."

**Scoring approach:** the LLM rates each dimension *with a one-line justification and a cited quote*; `score.ts` combines them via a documented weighted average into 0–100, then thresholds into Build/Wait/Avoid. Weighting is heuristic and stated openly. Thin evidence ⇒ lower score ⇒ surfaced in "Risks / Weak Evidence."

Why this matters: high frequency ≠ build. "Too expensive" is frequent but low exploitability; "offline sync breaks" is mid-frequency but high severity + exploitability = a real wedge.

---

## 9. Data schema (the minimal TS contract)

```ts
// Normalized input to the intelligence layer (both sources map to this)
type EvidenceItem = {
  source: "app_review" | "reddit";
  text: string;
  rating?: number;   // app reviews
  url?: string;
  date?: string;
  author?: string;
};

// LLM extraction output
type PainPoint = {
  pain: string;
  source: "app_review" | "reddit";
  quote: string;
  severity: number;              // 0–100
  switchingIntent: boolean;
  willingnessToPaySignal: boolean;
};

// Aggregated, scored result
type Opportunity = {
  wedge: string;
  evidenceCount: number;
  sources: string[];
  scores: {
    frequency: number;
    severity: number;
    switchingIntent: number;
    willingnessToPay: number;
    competitorInertia: number;
    startupExploitability: number;
    evidenceDiversity: number;
  };
  confidence: number;            // 0–100
  decision: "Build" | "Wait" | "Avoid";
};
```

`score.ts` turns `PainPoint[]` → `Opportunity` deterministically; the LLM never invents the final `confidence`/`decision` directly — it supplies dimension inputs, `score.ts` computes the aggregate.

---

## 10. Report structure (`report.md`) — decision-first

```
# Startup Idea Validation Report — "<idea>"

## Decision
Build / Wait / Avoid — one line, up top.

## Confidence Score
0–100, WITH the per-dimension breakdown, then the heuristic disclaimer.

## Best Wedge
The narrow angle most worth attacking.

## Evidence
Real quotes, review counts, Reddit mentions — labeled by source. (No claim without a citation.)

## Target User
Who has the strongest pain.

## Competitor Weakness
Where the existing product fails.

## MVP Recommendation
What to build first.

## Landing Page Positioning
One headline. (e.g. "Notes that work even when Notion doesn't.")

## Risks / Weak Evidence
What's uncertain, which sources were thin/unavailable, where to be skeptical.

## Next Validation Step
The single next thing the founder should test before committing.

---
Data: analyzed N reviews + M Reddit items across <sources>. Estimated data cost: ~$X (pay-per-use).
```

---

## 11. Demo input (single competitor)

```json
{
  "idea": "Offline-first Notion alternative for students",
  "primaryCompetitor": "Notion",
  "targetUser": "students and writers",
  "goal": "Should I build this?",
  "ratings": [1, 2, 3],
  "maxReviews": 200,
  "maxRedditItems": 100
}
```

**Output:** `report.md` (decision-first, §10) + a terminal summary line with counts and cost. No `extraCompetitors` in the demo.

---

## 12. Defensive design (on-stage robustness)

- **Per-source isolation:** each Apify call try/catch'd; one failure degrades, never aborts.
- **Structured output:** LLM extraction/scoring forced to JSON schema; one retry on mismatch; final fallback = frequency-only summary flagged as low confidence.
- **Token/scope control:** only 1–3★ reviews to the LLM; cap items; log how many analyzed.
- **Honest confidence:** score reflects actual evidence volume — thin data → low score → "Wait/Avoid" + Risks note + breakdown shown.
- **Deterministic scoring core:** `score.ts` pure and unit-testable independent of network/LLM, including Build/Wait/Avoid thresholds.

---

## 13. Implementation milestones (build order)

**M1 — Static report generator (no Apify).** Mock reviews + mock Reddit (`mocks/`) → `extractPains` → `score` → `report.md`. Goal: the report *looks right* first.

**M2 — Wire the first Apify actor.** App Store / Google Play reviews → normalize to `EvidenceItem` → existing pipeline → `report.md`. Demo runs end-to-end on one real source.

**M3 — Add Reddit + degradation.** Add the Reddit actor; verify all three paths: reviews-only (Reddit fails), Reddit-only (reviews fail), both. This is the hackathon's critical stability work.

**M4 — Polish.** Terminal summary, cost estimate, pretty Markdown, optional email (off the main line).

---

## 14. Demo narrative (~60s)

Open with the problem, not features:
> "Early founders don't just need startup ideas — they need conviction before spending weeks building. WedgeFinder takes a founder's idea, buys live complaint data from Apify Actors, and returns a build/wait/avoid memo backed by real user quotes."

Run `npm start` → terminal:
```
Source router (rule-based) selected:
  ✓ App reviews   ✓ Reddit complaints
Fetched:  ✓ 200 app reviews   ✓ 87 Reddit items
Estimated data cost: ~$0.20 + platform/API costs
Generated: report.md
```
Open `report.md`:
```
Decision: Build      Confidence: 78/100
  Frequency 72 · Severity 88 · Switching 81 · WTP 60 · Inertia 80 · Exploitability 86 · Diversity 75
Best wedge: Offline-first notes for students and writers
Headline: "Notes that work even when Notion doesn't."
```
Close:
> "IdeaBrowser gives you ideas. WedgeFinder tells you whether your specific idea has enough evidence to build."

---

## 15. Future work (post-hackathon)

- Source routing by product type (mobile → App/Play/Reddit; extension → Chrome Web Store/Reddit/GitHub; B2B SaaS → G2/Reddit/forums; dev tool → GitHub/HN/Reddit/SO; consumer → Amazon/Reddit/YouTube) + search/trend signals; upgrade rule-based router → LLM router.
- Multiple competitors; own-product analysis + you-vs-competitor comparison.
- RAG "market memory" (Chroma/Qdrant) for trends over time.
- Workflow exports (Notion/Slack/Linear) + scheduled monitoring; webhooks to chain actors.
- Official product APIs (App Store Connect, Google Play Developer).
- Publish as a priced Apify Actor.

---

## 16. Open risks
- Reddit scraper reliability / rate limits on the day → mitigated by graceful degradation + mock fallback.
- Exact actor IDs / input shapes confirmed against the live Store at build time (actor IDs in `config.json`; code stays actor-agnostic).
- Confidence weighting + Build/Wait/Avoid thresholds are heuristic — presented as guidance, with breakdown + disclaimer, not truth.
