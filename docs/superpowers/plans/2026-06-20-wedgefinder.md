# WedgeFinder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build WedgeFinder — a CLI agent that takes a founder's idea + one competitor, buys live App Store/Google Play reviews + Reddit complaints via Apify Actors, scores the opportunity across 7 dimensions, and writes a decision-first `report.md` (Build/Wait/Avoid + confidence).

**Architecture:** Pure, deterministic modules (route, normalize, score, combine, cost, report) are TDD'd with `node:test`. Two I/O modules (`analyze` = Claude, `apify` = Apify Actors) are thin wrappers; their *parsing* logic is pure and tested, their network calls are exercised manually. `main.ts` orchestrates and supports a `--mock` mode so the full report flow runs offline before any Apify call (mock-data-first, per spec milestones).

**Tech Stack:** Node 22 with native TypeScript type-stripping (`--experimental-strip-types`, no build step), `node:test` runner, `@anthropic-ai/sdk` (model `claude-haiku-4-5`), `apify-client`. Env via Node's built-in `--env-file=.env`.

**Spec:** `docs/superpowers/specs/2026-06-20-wedgefinder-design.md`

## Global Constraints

- Node ≥ 22.6; all source files are `.ts`, run via `node --experimental-strip-types`. Local imports MUST use explicit `.ts` extension (required by type-stripping).
- Run tests: `node --experimental-strip-types --test`. Run app: `node --experimental-strip-types --env-file=.env src/main.ts`.
- Two data sources only: `app_review` (App Store + Google Play) and `reddit`. No other sources in MVP.
- **Graceful degradation:** any one source failing must NOT abort the run; the report ships from remaining source(s).
- **One primary competitor** in the demo; `extraCompetitors` may exist in the interface but is unused in the demo config.
- Confidence score is **always** rendered with its per-dimension breakdown and this exact disclaimer string: `This is a heuristic confidence score based on observed demand signals, not a prediction of startup success.`
- Cost copy: "pay-per-use, cents-to-low-dollars." Review actor rate constant = `$1.00 / 1000 reviews`. Never print fabricated totals like `$0.08`.
- Decision thresholds: confidence ≥ 70 → `Build`; 45–69 → `Wait`; < 45 → `Avoid`.
- Apify actor IDs live in `config.json`, never hardcoded in `src/` — code stays actor-agnostic.
- Email delivery is optional and off the critical path; the run must fully succeed without it.

---

### Task 1: Project scaffold + shared types + test harness

**Files:**
- Create: `package.json`, `tsconfig.json`, `.env.example`, `config.json`, `src/types.ts`, `test/harness.test.ts`

**Interfaces:**
- Consumes: nothing (first task)
- Produces: all shared types — `Source`, `EvidenceItem`, `PainPoint`, `SignalScores`, `JudgeScores`, `Decision`, `Opportunity`, `SourceResult` — imported by every later task.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "wedgefinder",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --experimental-strip-types --test",
    "start": "node --experimental-strip-types --env-file=.env src/main.ts",
    "start:mock": "node --experimental-strip-types --env-file=.env src/main.ts --mock"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.39.0",
    "apify-client": "^2.11.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`** (editor type-checking only; not used at runtime)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["src", "test"]
}
```

- [ ] **Step 3: Create `.env.example`**

```bash
APIFY_TOKEN=your_apify_token_here
ANTHROPIC_API_KEY=your_anthropic_key_here
REPORT_EMAIL=
```

- [ ] **Step 4: Create `config.json`** (demo input — single competitor)

```json
{
  "idea": "Offline-first Notion alternative for students",
  "primaryCompetitor": "Notion",
  "extraCompetitors": [],
  "targetUser": "students and writers",
  "goal": "Should I build this?",
  "ratings": [1, 2, 3],
  "maxReviews": 200,
  "maxRedditItems": 100,
  "actors": {
    "reviews": "andok/app-store-reviews",
    "reddit": "trudax/reddit-scraper-lite"
  },
  "appStore": { "ios": "", "android": "" }
}
```

- [ ] **Step 5: Create `src/types.ts`**

```ts
export type Source = "app_review" | "reddit";

export type EvidenceItem = {
  source: Source;
  text: string;
  rating?: number;
  url?: string;
  date?: string;
  author?: string;
};

export type PainPoint = {
  pain: string;
  source: Source;
  quote: string;
  severity: number;            // 0–100
  switchingIntent: boolean;
  willingnessToPaySignal: boolean;
};

export type SignalScores = {
  frequency: number;
  severity: number;
  switchingIntent: number;
  willingnessToPay: number;
  evidenceDiversity: number;
};

export type JudgeScores = {
  wedge: string;
  competitorInertia: number;       // 0–100
  startupExploitability: number;   // 0–100
};

export type Decision = "Build" | "Wait" | "Avoid";

export type Opportunity = {
  wedge: string;
  evidenceCount: number;
  sources: Source[];
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
  decision: Decision;
};

export type SourceResult = {
  source: Source;
  ok: boolean;
  items: EvidenceItem[];
  costEstimate: number;
  error?: string;
};
```

- [ ] **Step 6: Write the harness test** in `test/harness.test.ts`

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import type { EvidenceItem } from "../src/types.ts";

test("types import and EvidenceItem is usable", () => {
  const item: EvidenceItem = { source: "reddit", text: "hello" };
  assert.equal(item.source, "reddit");
});
```

- [ ] **Step 7: Run the test to verify the toolchain works**

Run: `npm test`
Expected: PASS — 1 test passing, confirming type-stripping + node:test run.

- [ ] **Step 8: Commit**

```bash
git add package.json tsconfig.json .env.example config.json src/types.ts test/harness.test.ts
git commit -m "chore: scaffold wedgefinder project + shared types"
```

---

### Task 2: Rule-based source router (`route.ts`)

**Files:**
- Create: `src/route.ts`, `test/route.test.ts`

**Interfaces:**
- Consumes: `Source` from `types.ts`
- Produces: `detectProductType(idea: string): ProductType` and `chooseSources(productType: ProductType): Source[]`; exported `type ProductType`.

- [ ] **Step 1: Write the failing test** in `test/route.test.ts`

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { detectProductType, chooseSources } from "../src/route.ts";

test("detects a mobile/note-taking app", () => {
  assert.equal(detectProductType("Offline-first Notion alternative for students"), "mobile_app");
});

test("detects a browser extension", () => {
  assert.equal(detectProductType("A Chrome extension for tab management"), "browser_extension");
});

test("unknown idea falls back to dual source", () => {
  assert.deepEqual(chooseSources("unknown"), ["app_review", "reddit"]);
});

test("mobile app uses both sources", () => {
  assert.deepEqual(chooseSources("mobile_app"), ["app_review", "reddit"]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test test/route.test.ts`
Expected: FAIL — cannot find module `../src/route.ts`.

- [ ] **Step 3: Write `src/route.ts`**

```ts
import type { Source } from "./types.ts";

export type ProductType =
  | "mobile_app" | "browser_extension" | "b2b_saas" | "dev_tool" | "consumer" | "unknown";

export function detectProductType(idea: string): ProductType {
  const t = idea.toLowerCase();
  if (/\b(extension|chrome|browser)\b/.test(t)) return "browser_extension";
  if (/\b(saas|b2b|team|enterprise|crm|dashboard)\b/.test(t)) return "b2b_saas";
  if (/\b(cli|sdk|api|developer|dev tool|library)\b/.test(t)) return "dev_tool";
  if (/\b(app|ios|android|mobile|notes?|note-taking)\b/.test(t)) return "mobile_app";
  return "unknown";
}

// MVP implements only app_review + reddit actors. Types that lack app
// presence resolve to reddit-only; everything else gets both.
export function chooseSources(productType: ProductType): Source[] {
  switch (productType) {
    case "browser_extension":
    case "b2b_saas":
    case "dev_tool":
      return ["reddit"];
    case "mobile_app":
    case "consumer":
    case "unknown":
    default:
      return ["app_review", "reddit"];
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --experimental-strip-types --test test/route.test.ts`
Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/route.ts test/route.test.ts
git commit -m "feat: rule-based source router"
```

---

### Task 3: Raw-data normalization (`normalize.ts`)

**Files:**
- Create: `src/normalize.ts`, `test/normalize.test.ts`

**Interfaces:**
- Consumes: `EvidenceItem` from `types.ts`
- Produces: `normalizeReview(raw: any): EvidenceItem`, `normalizeRedditItem(raw: any): EvidenceItem`, `filterByRatings(items: EvidenceItem[], ratings: number[]): EvidenceItem[]`.

- [ ] **Step 1: Write the failing test** in `test/normalize.test.ts`

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeReview, normalizeRedditItem, filterByRatings } from "../src/normalize.ts";

test("normalizes a raw app review", () => {
  const e = normalizeReview({ text: "Sync is broken", score: 1, userName: "ana", url: "u" });
  assert.equal(e.source, "app_review");
  assert.equal(e.text, "Sync is broken");
  assert.equal(e.rating, 1);
  assert.equal(e.author, "ana");
});

test("normalizes a raw reddit item", () => {
  const e = normalizeRedditItem({ body: "Notion offline sucks", username: "bob", url: "r" });
  assert.equal(e.source, "reddit");
  assert.equal(e.text, "Notion offline sucks");
  assert.equal(e.author, "bob");
});

test("filterByRatings keeps reddit and low-star reviews, drops 5-star reviews", () => {
  const items = [
    { source: "app_review", text: "bad", rating: 1 },
    { source: "app_review", text: "great", rating: 5 },
    { source: "reddit", text: "complaint" },
  ] as const;
  const kept = filterByRatings([...items], [1, 2, 3]);
  assert.equal(kept.length, 2);
  assert.ok(kept.every((i) => i.text !== "great"));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test test/normalize.test.ts`
Expected: FAIL — cannot find module `../src/normalize.ts`.

- [ ] **Step 3: Write `src/normalize.ts`**

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --experimental-strip-types --test test/normalize.test.ts`
Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/normalize.ts test/normalize.test.ts
git commit -m "feat: normalize raw actor data into EvidenceItem"
```

---

### Task 4: Pure scoring core (`score.ts`)

**Files:**
- Create: `src/score.ts`, `test/score.test.ts`

**Interfaces:**
- Consumes: `PainPoint`, `SignalScores`, `JudgeScores`, `Opportunity`, `Decision` from `types.ts`
- Produces: `deriveSignalScores(pains: PainPoint[]): SignalScores`, `computeConfidence(s: SignalScores & { competitorInertia: number; startupExploitability: number }): number`, `decide(confidence: number): Decision`, `assembleOpportunity(pains: PainPoint[], judge: JudgeScores): Opportunity`, exported `WEIGHTS`.

- [ ] **Step 1: Write the failing test** in `test/score.test.ts`

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { deriveSignalScores, computeConfidence, decide, assembleOpportunity } from "../src/score.ts";
import type { PainPoint } from "../src/types.ts";

const strongPains: PainPoint[] = Array.from({ length: 20 }, (_, i) => ({
  pain: "offline sync fails",
  source: i % 2 === 0 ? "app_review" : "reddit",
  quote: "lost my notes offline",
  severity: 90,
  switchingIntent: true,
  willingnessToPaySignal: true,
}));

test("decide thresholds", () => {
  assert.equal(decide(80), "Build");
  assert.equal(decide(55), "Wait");
  assert.equal(decide(20), "Avoid");
});

test("deriveSignalScores rewards multi-source, severe, frequent pain", () => {
  const s = deriveSignalScores(strongPains);
  assert.equal(s.frequency, 100);          // 20 pains saturates
  assert.equal(s.severity, 90);
  assert.equal(s.switchingIntent, 100);
  assert.equal(s.evidenceDiversity, 100);  // both sources present
});

test("empty pains score zero", () => {
  const s = deriveSignalScores([]);
  assert.equal(s.frequency, 0);
  assert.equal(s.severity, 0);
});

test("assembleOpportunity produces a Build for strong evidence", () => {
  const opp = assembleOpportunity(strongPains, {
    wedge: "Offline-first notes",
    competitorInertia: 80,
    startupExploitability: 85,
  });
  assert.equal(opp.decision, "Build");
  assert.ok(opp.confidence >= 70);
  assert.deepEqual([...opp.sources].sort(), ["app_review", "reddit"]);
  assert.equal(opp.evidenceCount, 20);
});

test("computeConfidence clamps to 0–100", () => {
  const c = computeConfidence({
    frequency: 100, severity: 100, switchingIntent: 100, willingnessToPay: 100,
    evidenceDiversity: 100, competitorInertia: 100, startupExploitability: 100,
  });
  assert.equal(c, 100);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test test/score.test.ts`
Expected: FAIL — cannot find module `../src/score.ts`.

- [ ] **Step 3: Write `src/score.ts`**

```ts
import type { PainPoint, SignalScores, JudgeScores, Opportunity, Decision } from "./types.ts";

export const WEIGHTS = {
  frequency: 0.15,
  severity: 0.2,
  switchingIntent: 0.2,
  willingnessToPay: 0.1,
  competitorInertia: 0.1,
  startupExploitability: 0.15,
  evidenceDiversity: 0.1,
} as const;

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const avg = (ns: number[]) => (ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : 0);
const pct = (xs: PainPoint[], f: (p: PainPoint) => boolean) =>
  xs.length ? (xs.filter(f).length / xs.length) * 100 : 0;

export function deriveSignalScores(pains: PainPoint[]): SignalScores {
  if (pains.length === 0) {
    return { frequency: 0, severity: 0, switchingIntent: 0, willingnessToPay: 0, evidenceDiversity: 0 };
  }
  const distinctSources = new Set(pains.map((p) => p.source)).size;
  return {
    frequency: Math.min(100, pains.length * 5),        // 20 pains saturates
    severity: Math.round(avg(pains.map((p) => p.severity))),
    switchingIntent: Math.round(pct(pains, (p) => p.switchingIntent)),
    willingnessToPay: Math.round(pct(pains, (p) => p.willingnessToPaySignal)),
    evidenceDiversity: distinctSources >= 2 ? 100 : 50,
  };
}

export function computeConfidence(
  s: SignalScores & { competitorInertia: number; startupExploitability: number },
): number {
  const raw =
    s.frequency * WEIGHTS.frequency +
    s.severity * WEIGHTS.severity +
    s.switchingIntent * WEIGHTS.switchingIntent +
    s.willingnessToPay * WEIGHTS.willingnessToPay +
    s.competitorInertia * WEIGHTS.competitorInertia +
    s.startupExploitability * WEIGHTS.startupExploitability +
    s.evidenceDiversity * WEIGHTS.evidenceDiversity;
  return Math.round(clamp(raw, 0, 100));
}

export function decide(confidence: number): Decision {
  if (confidence >= 70) return "Build";
  if (confidence >= 45) return "Wait";
  return "Avoid";
}

export function assembleOpportunity(pains: PainPoint[], judge: JudgeScores): Opportunity {
  const signals = deriveSignalScores(pains);
  const scores = {
    ...signals,
    competitorInertia: clamp(judge.competitorInertia, 0, 100),
    startupExploitability: clamp(judge.startupExploitability, 0, 100),
  };
  const confidence = computeConfidence(scores);
  return {
    wedge: judge.wedge,
    evidenceCount: pains.length,
    sources: [...new Set(pains.map((p) => p.source))],
    scores,
    confidence,
    decision: decide(confidence),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --experimental-strip-types --test test/score.test.ts`
Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/score.ts test/score.test.ts
git commit -m "feat: pure 7-dimension scoring core"
```

---

### Task 5: Report renderer (`report.ts`)

**Files:**
- Create: `src/report.ts`, `test/report.test.ts`

**Interfaces:**
- Consumes: `Opportunity`, `PainPoint`, `Source` from `types.ts`
- Produces: `renderReport(input: ReportInput): string` and exported `DISCLAIMER`; exported `type ReportInput = { idea: string; competitor: string; targetUser: string; opportunity: Opportunity; pains: PainPoint[]; reviewCount: number; redditCount: number; usedSources: Source[]; unavailableSources: Source[]; estimatedCost: number; }`.

- [ ] **Step 1: Write the failing test** in `test/report.test.ts`

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { renderReport, DISCLAIMER } from "../src/report.ts";
import type { Opportunity, PainPoint } from "../src/types.ts";

const opp: Opportunity = {
  wedge: "Offline-first notes for students",
  evidenceCount: 12,
  sources: ["app_review", "reddit"],
  scores: { frequency: 60, severity: 88, switchingIntent: 70, willingnessToPay: 50,
    competitorInertia: 80, startupExploitability: 85, evidenceDiversity: 100 },
  confidence: 76,
  decision: "Build",
};
const pains: PainPoint[] = [{
  pain: "offline sync fails", source: "app_review", quote: "I lost my notes offline",
  severity: 90, switchingIntent: true, willingnessToPaySignal: false,
}];

test("report leads with decision and confidence", () => {
  const md = renderReport({
    idea: "Offline-first Notion alternative", competitor: "Notion", targetUser: "students",
    opportunity: opp, pains, reviewCount: 200, redditCount: 87,
    usedSources: ["app_review", "reddit"], unavailableSources: [], estimatedCost: 0.2,
  });
  assert.match(md, /## Decision\s*\n+Build/);
  assert.match(md, /76\/100/);
  assert.ok(md.includes(DISCLAIMER));
  assert.ok(md.includes("I lost my notes offline"));   // cited evidence
  assert.match(md, /Severity 88/);                      // dimension breakdown
  assert.match(md, /## Risks/);
});

test("report notes unavailable sources in risks", () => {
  const md = renderReport({
    idea: "X", competitor: "Notion", targetUser: "students", opportunity: opp, pains,
    reviewCount: 200, redditCount: 0, usedSources: ["app_review"],
    unavailableSources: ["reddit"], estimatedCost: 0.2,
  });
  assert.match(md, /reddit/i);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test test/report.test.ts`
Expected: FAIL — cannot find module `../src/report.ts`.

- [ ] **Step 3: Write `src/report.ts`**

```ts
import type { Opportunity, PainPoint, Source } from "./types.ts";

export const DISCLAIMER =
  "This is a heuristic confidence score based on observed demand signals, not a prediction of startup success.";

export type ReportInput = {
  idea: string;
  competitor: string;
  targetUser: string;
  opportunity: Opportunity;
  pains: PainPoint[];
  reviewCount: number;
  redditCount: number;
  usedSources: Source[];
  unavailableSources: Source[];
  estimatedCost: number;
};

export function renderReport(input: ReportInput): string {
  const { opportunity: o, pains } = input;
  const s = o.scores;
  const breakdown =
    `Frequency ${s.frequency} · Severity ${s.severity} · Switching ${s.switchingIntent} · ` +
    `WTP ${s.willingnessToPay} · Inertia ${s.competitorInertia} · ` +
    `Exploitability ${s.startupExploitability} · Diversity ${s.evidenceDiversity}`;

  const evidence = pains.slice(0, 8)
    .map((p) => `- [${p.source}] "${p.quote}" — _${p.pain}_`)
    .join("\n") || "_No specific quotes extracted._";

  const risks: string[] = [];
  if (input.unavailableSources.length) {
    risks.push(`Source(s) unavailable this run: ${input.unavailableSources.join(", ")} — evidence is thinner than ideal.`);
  }
  if (o.evidenceCount < 8) risks.push("Low evidence volume — treat confidence as provisional.");
  if (!risks.length) risks.push("Evidence is reasonable but still a sample of vocal users, not the whole market.");

  return `# Startup Idea Validation Report — "${input.idea}"

## Decision

${o.decision}

## Confidence Score

${o.confidence}/100

Breakdown: ${breakdown}

> ${DISCLAIMER}

## Best Wedge

${o.wedge}

## Evidence

Analyzed ${input.reviewCount} app reviews + ${input.redditCount} Reddit items across ${input.usedSources.join(", ") || "no sources"}.

${evidence}

## Target User

${input.targetUser}

## Competitor Weakness

Where ${input.competitor} is most exposed: ${o.wedge}.

## MVP Recommendation

Build the narrowest product that fixes "${o.wedge}" for ${input.targetUser}.

## Landing Page Positioning

"Notes that work even when ${input.competitor} doesn't."

## Risks / Weak Evidence

${risks.map((r) => `- ${r}`).join("\n")}

## Next Validation Step

Talk to 5 ${input.targetUser} who left ${input.competitor} and confirm "${o.wedge}" is why.

---
Data: analyzed ${input.reviewCount} reviews + ${input.redditCount} Reddit items across ${input.usedSources.join(", ") || "none"}. Estimated data cost: ~$${input.estimatedCost.toFixed(2)} (pay-per-use, cents-to-low-dollars).
`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --experimental-strip-types --test test/report.test.ts`
Expected: PASS — 2 tests.

- [ ] **Step 5: Commit**

```bash
git add src/report.ts test/report.test.ts
git commit -m "feat: decision-first markdown report renderer"
```

---

### Task 6: Combine + cost (`combine.ts`, `cost.ts`)

**Files:**
- Create: `src/cost.ts`, `src/combine.ts`, `test/combine.test.ts`

**Interfaces:**
- Consumes: `SourceResult`, `EvidenceItem`, `Source` from `types.ts`
- Produces:
  - `cost.ts`: `estimateReviewCost(n: number): number`, `estimateRedditCost(n: number): number`
  - `combine.ts`: `combineSources(results: SourceResult[]): Combined` where `type Combined = { evidence: EvidenceItem[]; usedSources: Source[]; unavailableSources: Source[]; reviewCount: number; redditCount: number; totalCost: number }`.

- [ ] **Step 1: Write the failing test** in `test/combine.test.ts`

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { estimateReviewCost, estimateRedditCost } from "../src/cost.ts";
import { combineSources } from "../src/combine.ts";
import type { SourceResult } from "../src/types.ts";

test("review cost is $1 per 1000", () => {
  assert.equal(estimateReviewCost(200), 0.2);
  assert.equal(estimateReviewCost(0), 0);
});

test("reddit cost is non-negative", () => {
  assert.ok(estimateRedditCost(100) >= 0);
});

test("combine merges ok sources and flags failed ones", () => {
  const results: SourceResult[] = [
    { source: "app_review", ok: true, items: [{ source: "app_review", text: "a", rating: 1 }], costEstimate: 0.2 },
    { source: "reddit", ok: false, items: [], costEstimate: 0, error: "rate limited" },
  ];
  const c = combineSources(results);
  assert.deepEqual(c.usedSources, ["app_review"]);
  assert.deepEqual(c.unavailableSources, ["reddit"]);
  assert.equal(c.reviewCount, 1);
  assert.equal(c.redditCount, 0);
  assert.equal(c.evidence.length, 1);
});

test("combine handles both sources ok", () => {
  const results: SourceResult[] = [
    { source: "app_review", ok: true, items: [{ source: "app_review", text: "a", rating: 1 }], costEstimate: 0.2 },
    { source: "reddit", ok: true, items: [{ source: "reddit", text: "b" }], costEstimate: 0.05 },
  ];
  const c = combineSources(results);
  assert.deepEqual(c.usedSources.sort(), ["app_review", "reddit"]);
  assert.equal(c.unavailableSources.length, 0);
  assert.equal(c.totalCost, 0.25);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test test/combine.test.ts`
Expected: FAIL — cannot find module `../src/cost.ts`.

- [ ] **Step 3: Write `src/cost.ts`**

```ts
// Published rates (see spec §3 pitch hygiene). Treat as estimates only.
const REVIEW_RATE_PER_1000 = 1.0; // andok/app-store-reviews: from ~$1.00 / 1000
const REDDIT_RATE_PER_1000 = 0.5; // conservative placeholder estimate

export function estimateReviewCost(n: number): number {
  return Math.round((n / 1000) * REVIEW_RATE_PER_1000 * 100) / 100;
}

export function estimateRedditCost(n: number): number {
  return Math.round((n / 1000) * REDDIT_RATE_PER_1000 * 100) / 100;
}
```

- [ ] **Step 4: Write `src/combine.ts`**

```ts
import type { SourceResult, EvidenceItem, Source } from "./types.ts";

export type Combined = {
  evidence: EvidenceItem[];
  usedSources: Source[];
  unavailableSources: Source[];
  reviewCount: number;
  redditCount: number;
  totalCost: number;
};

export function combineSources(results: SourceResult[]): Combined {
  const ok = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);
  const evidence = ok.flatMap((r) => r.items);
  return {
    evidence,
    usedSources: ok.map((r) => r.source),
    unavailableSources: failed.map((r) => r.source),
    reviewCount: evidence.filter((e) => e.source === "app_review").length,
    redditCount: evidence.filter((e) => e.source === "reddit").length,
    totalCost: Math.round(ok.reduce((sum, r) => sum + r.costEstimate, 0) * 100) / 100,
  };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `node --experimental-strip-types --test test/combine.test.ts`
Expected: PASS — 4 tests.

- [ ] **Step 6: Commit**

```bash
git add src/cost.ts src/combine.ts test/combine.test.ts
git commit -m "feat: cost estimates + source combiner with degradation"
```

---

### Task 7: Claude analysis (`analyze.ts`) — parsers TDD'd, calls wrapped

**Files:**
- Create: `src/analyze.ts`, `test/analyze.test.ts`

**Interfaces:**
- Consumes: `EvidenceItem`, `PainPoint`, `JudgeScores` from `types.ts`; `@anthropic-ai/sdk`
- Produces:
  - Pure (tested): `parsePainsResponse(input: unknown): PainPoint[]`, `parseJudgeResponse(input: unknown): JudgeScores`
  - I/O (wrappers): `extractPains(items: EvidenceItem[], client: Anthropic): Promise<PainPoint[]>`, `judgeOpportunity(pains: PainPoint[], idea: string, competitor: string, client: Anthropic): Promise<JudgeScores>`
  - `makeClient(): Anthropic`

- [ ] **Step 1: Write the failing test** in `test/analyze.test.ts` (parsers only — no network)

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePainsResponse, parseJudgeResponse } from "../src/analyze.ts";

test("parsePainsResponse coerces a valid tool payload", () => {
  const pains = parsePainsResponse({
    pains: [
      { pain: "sync fails", source: "app_review", quote: "lost notes", severity: 90,
        switchingIntent: true, willingnessToPaySignal: false },
    ],
  });
  assert.equal(pains.length, 1);
  assert.equal(pains[0].severity, 90);
  assert.equal(pains[0].source, "app_review");
});

test("parsePainsResponse clamps severity and defaults bad source to reddit", () => {
  const pains = parsePainsResponse({
    pains: [{ pain: "x", source: "weird", quote: "q", severity: 500, switchingIntent: "yes" }],
  });
  assert.equal(pains[0].severity, 100);
  assert.equal(pains[0].source, "reddit");
  assert.equal(pains[0].switchingIntent, true);
});

test("parsePainsResponse throws on non-array payload", () => {
  assert.throws(() => parsePainsResponse({ pains: "nope" }));
});

test("parseJudgeResponse coerces and clamps", () => {
  const j = parseJudgeResponse({ wedge: "offline notes", competitorInertia: 150, startupExploitability: 80 });
  assert.equal(j.wedge, "offline notes");
  assert.equal(j.competitorInertia, 100);
  assert.equal(j.startupExploitability, 80);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test test/analyze.test.ts`
Expected: FAIL — cannot find module `../src/analyze.ts`.

- [ ] **Step 3: Write `src/analyze.ts`**

```ts
import Anthropic from "@anthropic-ai/sdk";
import type { EvidenceItem, PainPoint, JudgeScores, Source } from "./types.ts";

const MODEL = "claude-haiku-4-5";
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const toBool = (v: unknown) => v === true || v === "true" || v === "yes";
const toSource = (v: unknown): Source => (v === "app_review" ? "app_review" : "reddit");

export function parsePainsResponse(input: unknown): PainPoint[] {
  const arr = (input as any)?.pains;
  if (!Array.isArray(arr)) throw new Error("pains is not an array");
  return arr.map((p: any) => ({
    pain: String(p.pain ?? "").trim(),
    source: toSource(p.source),
    quote: String(p.quote ?? "").trim(),
    severity: clamp(Number(p.severity) || 0, 0, 100),
    switchingIntent: toBool(p.switchingIntent),
    willingnessToPaySignal: toBool(p.willingnessToPaySignal),
  }));
}

export function parseJudgeResponse(input: unknown): JudgeScores {
  const j = input as any;
  return {
    wedge: String(j?.wedge ?? "Unspecified wedge").trim(),
    competitorInertia: clamp(Number(j?.competitorInertia) || 0, 0, 100),
    startupExploitability: clamp(Number(j?.startupExploitability) || 0, 0, 100),
  };
}

export function makeClient(): Anthropic {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

const PAIN_TOOL: Anthropic.Tool = {
  name: "report_pains",
  description: "Return pain points extracted from user complaints.",
  input_schema: {
    type: "object",
    properties: {
      pains: {
        type: "array",
        items: {
          type: "object",
          properties: {
            pain: { type: "string" },
            source: { type: "string", enum: ["app_review", "reddit"] },
            quote: { type: "string" },
            severity: { type: "number" },
            switchingIntent: { type: "boolean" },
            willingnessToPaySignal: { type: "boolean" },
          },
          required: ["pain", "source", "quote", "severity", "switchingIntent", "willingnessToPaySignal"],
        },
      },
    },
    required: ["pains"],
  },
};

const JUDGE_TOOL: Anthropic.Tool = {
  name: "judge_opportunity",
  description: "Judge the best competitor wedge and two hard-to-derive scores.",
  input_schema: {
    type: "object",
    properties: {
      wedge: { type: "string" },
      competitorInertia: { type: "number", description: "0-100, how hard for incumbent to fix" },
      startupExploitability: { type: "number", description: "0-100, how exploitable by a small team" },
    },
    required: ["wedge", "competitorInertia", "startupExploitability"],
  },
};

async function callTool<T>(
  client: Anthropic, tool: Anthropic.Tool, prompt: string, parse: (i: unknown) => T,
): Promise<T> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      tools: [tool],
      tool_choice: { type: "tool", name: tool.name },
      messages: [{ role: "user", content: prompt }],
    });
    const block = msg.content.find((b) => b.type === "tool_use");
    try {
      if (block && block.type === "tool_use") return parse(block.input);
      throw new Error("no tool_use block");
    } catch (e) {
      if (attempt === 1) throw e;
    }
  }
  throw new Error("unreachable");
}

export async function extractPains(items: EvidenceItem[], client: Anthropic): Promise<PainPoint[]> {
  const corpus = items
    .map((i, n) => `[${n}] (${i.source}${i.rating ? `, ${i.rating}★` : ""}) ${i.text}`)
    .join("\n");
  const prompt =
    `Extract concrete product pain points from these user complaints. For each, give a short pain ` +
    `label, the source, a short verbatim quote, severity 0-100 (does it block usage / cause data loss?), ` +
    `switchingIntent (do they mention leaving/alternatives?), and willingnessToPaySignal (paid/team/` +
    `productivity stakes?). Only real pains, no filler.\n\nComplaints:\n${corpus}`;
  return callTool(client, PAIN_TOOL, prompt, parsePainsResponse);
}

export async function judgeOpportunity(
  pains: PainPoint[], idea: string, competitor: string, client: Anthropic,
): Promise<JudgeScores> {
  const summary = pains.map((p) => `- ${p.pain} (sev ${p.severity})`).join("\n");
  const prompt =
    `A founder wants to build: "${idea}", competing with ${competitor}. Based on these extracted ` +
    `pains, name the single best wedge (one phrase), then score competitorInertia (0-100: how hard ` +
    `is this for ${competitor} to fix?) and startupExploitability (0-100: how realistically can a ` +
    `small team exploit it?).\n\nPains:\n${summary}`;
  return callTool(client, JUDGE_TOOL, prompt, parseJudgeResponse);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --experimental-strip-types --test test/analyze.test.ts`
Expected: PASS — 4 tests.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS — all tests across all files green.

- [ ] **Step 6: Commit**

```bash
git add src/analyze.ts test/analyze.test.ts
git commit -m "feat: Claude pain extraction + opportunity judging with tested parsers"
```

---

### Task 8: M1 — mock pipeline + orchestrator (`main.ts`, mocks)

**Files:**
- Create: `mocks/mock-reviews.json`, `mocks/mock-reddit.json`, `src/main.ts`

**Interfaces:**
- Consumes: everything above — `route`, `normalize`, `score.assembleOpportunity`, `combine.combineSources`, `cost`, `report.renderReport`, `analyze.{makeClient,extractPains,judgeOpportunity}`
- Produces: a runnable CLI. `--mock` reads `mocks/*.json`; default mode is wired in Tasks 9–10. Writes `report.md`, prints a summary.

- [ ] **Step 1: Create `mocks/mock-reviews.json`** (raw shapes the review actor returns)

```json
[
  { "text": "Sync takes forever and I lost two days of notes while offline on a flight.", "score": 1, "userName": "traveler_kk", "url": "https://example.com/r1" },
  { "text": "Offline mode is basically broken. I'm a student and can't rely on it in class.", "score": 2, "userName": "studyhard", "url": "https://example.com/r2" },
  { "text": "Love the templates but it's too expensive for what I need.", "score": 3, "userName": "budgetuser", "url": "https://example.com/r3" },
  { "text": "Constant loading spinners on mobile. Looking for a faster alternative.", "score": 2, "userName": "fastfingers", "url": "https://example.com/r4" },
  { "text": "Great app", "score": 5, "userName": "fanboy", "url": "https://example.com/r5" }
]
```

- [ ] **Step 2: Create `mocks/mock-reddit.json`** (raw shapes the Reddit actor returns)

```json
[
  { "body": "Switched away from Notion because offline sync kept eating my edits. Any offline-first alternative for students?", "username": "r_student", "url": "https://reddit.com/x1" },
  { "body": "Notion is too slow on mobile, especially in low signal. I'd pay for something that just works offline.", "username": "r_writer", "url": "https://reddit.com/x2" },
  { "body": "Looking for a Notion alternative that opens instantly and works on a train.", "username": "r_commuter", "url": "https://reddit.com/x3" }
]
```

- [ ] **Step 3: Write `src/main.ts`**

```ts
import { readFile, writeFile } from "node:fs/promises";
import { detectProductType, chooseSources } from "./route.ts";
import { normalizeReview, normalizeRedditItem, filterByRatings } from "./normalize.ts";
import { estimateReviewCost, estimateRedditCost } from "./cost.ts";
import { combineSources } from "./combine.ts";
import { assembleOpportunity } from "./score.ts";
import { renderReport } from "./report.ts";
import { makeClient, extractPains, judgeOpportunity } from "./analyze.ts";
import type { SourceResult } from "./types.ts";

type Config = {
  idea: string; primaryCompetitor: string; targetUser: string; goal: string;
  ratings: number[]; maxReviews: number; maxRedditItems: number;
  actors: { reviews: string; reddit: string };
  appStore: { ios: string; android: string };
};

async function loadConfig(): Promise<Config> {
  return JSON.parse(await readFile(new URL("../config.json", import.meta.url), "utf8"));
}

async function mockSources(cfg: Config): Promise<SourceResult[]> {
  const rawReviews = JSON.parse(await readFile(new URL("../mocks/mock-reviews.json", import.meta.url), "utf8"));
  const rawReddit = JSON.parse(await readFile(new URL("../mocks/mock-reddit.json", import.meta.url), "utf8"));
  const reviews = filterByRatings(rawReviews.map(normalizeReview), cfg.ratings);
  const reddit = rawReddit.map(normalizeRedditItem);
  return [
    { source: "app_review", ok: true, items: reviews, costEstimate: estimateReviewCost(reviews.length) },
    { source: "reddit", ok: true, items: reddit, costEstimate: estimateRedditCost(reddit.length) },
  ];
}

async function main() {
  const mock = process.argv.includes("--mock");
  const cfg = await loadConfig();
  const productType = detectProductType(cfg.idea);
  const wanted = chooseSources(productType);
  console.log(`Source router (rule-based) → ${productType} → [${wanted.join(", ")}]`);

  // Fetch (Tasks 9–10 implement the non-mock branch).
  const results: SourceResult[] = mock ? await mockSources(cfg) : await fetchLive(cfg, wanted);

  const combined = combineSources(results);
  for (const r of results) {
    console.log(r.ok ? `  ✓ ${r.source}: ${r.items.length} items` : `  ✗ ${r.source}: ${r.error}`);
  }

  const client = makeClient();
  const pains = await extractPains(combined.evidence, client);
  const judge = await judgeOpportunity(pains, cfg.idea, cfg.primaryCompetitor, client);
  const opportunity = assembleOpportunity(pains, judge);

  const md = renderReport({
    idea: cfg.idea, competitor: cfg.primaryCompetitor, targetUser: cfg.targetUser,
    opportunity, pains,
    reviewCount: combined.reviewCount, redditCount: combined.redditCount,
    usedSources: combined.usedSources, unavailableSources: combined.unavailableSources,
    estimatedCost: combined.totalCost,
  });
  await writeFile("report.md", md, "utf8");

  console.log(`\nDecision: ${opportunity.decision}  Confidence: ${opportunity.confidence}/100`);
  console.log(`Analyzed ${combined.reviewCount} reviews + ${combined.redditCount} reddit items.`);
  console.log(`Estimated data cost: ~$${combined.totalCost.toFixed(2)} (pay-per-use)`);
  console.log(`Wrote report.md`);
}

// Placeholder replaced in Task 9. Defined here so --mock works standalone.
async function fetchLive(_cfg: Config, _wanted: string[]): Promise<SourceResult[]> {
  throw new Error("Live fetch not wired yet — run with --mock (implemented in Task 9).");
}

main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 4: Run the mock pipeline** (requires `ANTHROPIC_API_KEY` in `.env`; copy from `.env.example` first)

Run: `npm run start:mock`
Expected: prints router line, two ✓ source lines, a `Decision:` line, and writes `report.md`.

- [ ] **Step 5: Eyeball `report.md`**

Run: `cat report.md`
Expected: a decision-first report — `## Decision` near the top, `## Confidence Score` with the `Breakdown:` line and the exact disclaimer sentence, real quotes under `## Evidence`, and all sections through `## Next Validation Step`.

- [ ] **Step 6: Run the full suite to confirm nothing regressed**

Run: `npm test`
Expected: PASS — all green.

- [ ] **Step 7: Commit**

```bash
git add mocks/mock-reviews.json mocks/mock-reddit.json src/main.ts
git commit -m "feat: M1 mock-data pipeline producing report.md"
```

---

### Task 9: M2 — wire the App Store / Google Play review actor (`apify.ts`)

**Files:**
- Create: `src/apify.ts`
- Modify: `src/main.ts` (replace the `fetchLive` placeholder)

**Interfaces:**
- Consumes: `apify-client`; `normalize.{normalizeReview,filterByRatings}`; `cost.estimateReviewCost`; types
- Produces: `runReviewScraper(cfg: ReviewCfg, client: ApifyClient): Promise<SourceResult>`; `makeApifyClient(): ApifyClient`; `type ReviewCfg = { actorId: string; competitor: string; ios: string; android: string; ratings: number[]; maxReviews: number }`.

- [ ] **Step 1: Write `src/apify.ts`**

```ts
import { ApifyClient } from "apify-client";
import { normalizeReview, filterByRatings } from "./normalize.ts";
import { estimateReviewCost } from "./cost.ts";
import type { SourceResult } from "./types.ts";

export function makeApifyClient(): ApifyClient {
  return new ApifyClient({ token: process.env.APIFY_TOKEN });
}

export type ReviewCfg = {
  actorId: string; competitor: string; ios: string; android: string;
  ratings: number[]; maxReviews: number;
};

export async function runReviewScraper(cfg: ReviewCfg, client: ApifyClient): Promise<SourceResult> {
  try {
    const input: Record<string, unknown> = { maxReviews: cfg.maxReviews };
    if (cfg.ios) input.appStoreUrls = [cfg.ios];
    if (cfg.android) input.googlePlayUrls = [cfg.android];
    const run = await client.actor(cfg.actorId).call(input);
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    const normalized = filterByRatings(items.map(normalizeReview), cfg.ratings)
      .filter((e) => e.text.length > 0)
      .slice(0, cfg.maxReviews);
    return {
      source: "app_review", ok: true, items: normalized,
      costEstimate: estimateReviewCost(normalized.length),
    };
  } catch (e) {
    return { source: "app_review", ok: false, items: [], costEstimate: 0, error: String(e) };
  }
}
```

- [ ] **Step 2: Replace the `fetchLive` placeholder in `src/main.ts`**

Replace the placeholder function (and add the import at the top) with:

```ts
import { makeApifyClient, runReviewScraper } from "./apify.ts";
```

```ts
async function fetchLive(cfg: Config, wanted: string[]): Promise<SourceResult[]> {
  const apify = makeApifyClient();
  const results: SourceResult[] = [];
  if (wanted.includes("app_review")) {
    results.push(await runReviewScraper({
      actorId: cfg.actors.reviews, competitor: cfg.primaryCompetitor,
      ios: cfg.appStore.ios, android: cfg.appStore.android,
      ratings: cfg.ratings, maxReviews: cfg.maxReviews,
    }, apify));
  }
  // Reddit added in Task 10.
  return results;
}
```

- [ ] **Step 3: Confirm the mock path still works** (no regression)

Run: `npm run start:mock`
Expected: still writes `report.md` from mocks.

- [ ] **Step 4: Smoke-test the live review pull** (requires `APIFY_TOKEN`; set `appStore.ios` in `config.json` to a real App Store URL for Notion first)

Run: `npm start`
Expected: `✓ app_review: N items` then a `Decision:` line and `report.md`. If the actor errors, you should instead see `✗ app_review: ...` and the run should still finish (degraded) — that is the graceful-degradation contract working.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS — all green (no new unit tests; `apify.ts` is I/O verified by smoke test).

- [ ] **Step 6: Commit**

```bash
git add src/apify.ts src/main.ts
git commit -m "feat: M2 live App Store/Google Play review fetching"
```

---

### Task 10: M3 — add Reddit + verify degradation

**Files:**
- Modify: `src/apify.ts` (add `runRedditScraper`), `src/main.ts` (call it)

**Interfaces:**
- Consumes: `normalize.normalizeRedditItem`; `cost.estimateRedditCost`
- Produces: `runRedditScraper(cfg: RedditCfg, client: ApifyClient): Promise<SourceResult>`; `type RedditCfg = { actorId: string; competitor: string; maxItems: number }`.

- [ ] **Step 1: Add `runRedditScraper` to `src/apify.ts`**

```ts
import { normalizeRedditItem } from "./normalize.ts";
import { estimateRedditCost } from "./cost.ts";

export type RedditCfg = { actorId: string; competitor: string; maxItems: number };

export async function runRedditScraper(cfg: RedditCfg, client: ApifyClient): Promise<SourceResult> {
  try {
    const searches = ["slow", "offline", "alternative", "bug"].map((w) => `${cfg.competitor} ${w}`);
    const run = await client.actor(cfg.actorId).call({
      searches, type: "comments", maxItems: cfg.maxItems,
    });
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    const normalized = items.map(normalizeRedditItem)
      .filter((e) => e.text.length > 0)
      .slice(0, cfg.maxItems);
    return {
      source: "reddit", ok: true, items: normalized,
      costEstimate: estimateRedditCost(normalized.length),
    };
  } catch (e) {
    return { source: "reddit", ok: false, items: [], costEstimate: 0, error: String(e) };
  }
}
```

- [ ] **Step 2: Wire Reddit into `fetchLive` in `src/main.ts`**

Update the import and add the Reddit branch:

```ts
import { makeApifyClient, runReviewScraper, runRedditScraper } from "./apify.ts";
```

Add inside `fetchLive`, before `return results;`:

```ts
  if (wanted.includes("reddit")) {
    results.push(await runRedditScraper({
      actorId: cfg.actors.reddit, competitor: cfg.primaryCompetitor, maxItems: cfg.maxRedditItems,
    }, apify));
  }
```

- [ ] **Step 3: Verify degradation — both sources OK**

Run: `npm start`
Expected: `✓ app_review`, `✓ reddit`, a `Decision:` line, `report.md` with both sources in the Evidence footer.

- [ ] **Step 4: Verify degradation — Reddit fails, run still completes**

Temporarily set `actors.reddit` in `config.json` to a bogus id like `"nonexistent/actor"`, then:
Run: `npm start`
Expected: `✗ reddit: ...`, but the run STILL finishes, writes `report.md`, and the Risks section names `reddit` as unavailable. Restore the real actor id afterward.

- [ ] **Step 5: Verify degradation — reviews fail, run still completes**

Temporarily blank `appStore.ios`/`appStore.android` AND set `actors.reviews` to `"nonexistent/actor"`, then:
Run: `npm start`
Expected: `✗ app_review`, `✓ reddit`, run finishes from Reddit only. Restore config afterward.

- [ ] **Step 6: Run the full suite + commit**

Run: `npm test`
Expected: PASS.

```bash
git add src/apify.ts src/main.ts config.json
git commit -m "feat: M3 Reddit source + verified graceful degradation"
```

---

### Task 11: M4 — polish, optional email, README

**Files:**
- Modify: `src/apify.ts` (add optional `sendReport`), `src/main.ts` (final summary + optional email)
- Create: `README-wedgefinder.md`

**Interfaces:**
- Consumes: env `REPORT_EMAIL`
- Produces: `sendReport(actorId: string, email: string, markdown: string, client: ApifyClient): Promise<boolean>`.

- [ ] **Step 1: Add optional `sendReport` to `src/apify.ts`**

```ts
export async function sendReport(
  actorId: string, email: string, markdown: string, client: ApifyClient,
): Promise<boolean> {
  try {
    await client.actor(actorId).call({
      to: email, subject: "Your WedgeFinder validation report", text: markdown,
    });
    return true;
  } catch (e) {
    console.error(`Email skipped: ${e}`);
    return false;
  }
}
```

- [ ] **Step 2: Add the optional email step at the end of `main()` in `src/main.ts`** (after `writeFile("report.md", ...)`)

```ts
  const email = process.env.REPORT_EMAIL;
  if (email) {
    const { sendReport } = await import("./apify.ts");
    const sent = await sendReport("apify/send-mail", email, md, makeApifyClient());
    console.log(sent ? `Emailed report to ${email}` : `Email not sent (continuing).`);
  }
```

- [ ] **Step 3: Create `README-wedgefinder.md`**

```markdown
# WedgeFinder

IdeaBrowser gives founders startup ideas. WedgeFinder gives founders evidence-backed
conviction: give it an idea + one competitor, and it buys live App Store / Google Play
reviews + Reddit complaints, scores the opportunity across 7 dimensions, and writes a
decision-first `report.md` (Build / Wait / Avoid).

## Setup

    cp .env.example .env       # add APIFY_TOKEN + ANTHROPIC_API_KEY
    npm install

## Run

    npm run start:mock         # offline, mock data — proves the report flow
    npm start                  # live: pays per-use for real review + Reddit data

Edit `config.json` to change the idea, competitor, and App Store URLs.

## Test

    npm test

## Notes

- Confidence is a heuristic from observed demand signals, not a prediction of success.
- Any single data source can fail; the report still ships from the rest (graceful degradation).
- Data cost is pay-per-use (cents-to-low-dollars), not a monthly subscription.
```

- [ ] **Step 4: Final full run + suite**

Run: `npm run start:mock && npm test`
Expected: report written, all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/apify.ts src/main.ts README-wedgefinder.md
git commit -m "feat: M4 optional email, final summary, README"
```

---

## Self-Review Notes

- **Spec coverage:** dual-source (T9/T10) · graceful degradation (T6 combine + T10 verification) · rule-based router (T2) · 7-dimension scoring + confidence + Build/Wait/Avoid (T4) · breakdown + disclaimer always shown (T5) · decision-first report with all spec §10 sections (T5) · source transparency / cited quotes (T5/T7) · cost narrative (T6/T8) · mock-data-first milestones (T8→T11) · single-competitor demo config (T1) · email optional off critical path (T11) · actor-agnostic via config (T1/T9/T10).
- **Type consistency:** `EvidenceItem`/`PainPoint`/`JudgeScores`/`Opportunity`/`SourceResult` defined once in T1 and consumed unchanged; `assembleOpportunity(pains, judge)`, `combineSources(results)`, `renderReport(input)`, `extractPains(items, client)`, `judgeOpportunity(pains, idea, competitor, client)` signatures match across producer/consumer tasks.
- **Out of scope (correctly absent):** extra competitors, >2 sources, RAG, workflow exports, published priced actor — all deferred per spec §4.
- **Known boundary:** `analyze.ts` and `apify.ts` network calls aren't unit-tested (only their pure parsers are); they're verified by the manual smoke runs in T8–T10. Actor input field names (`appStoreUrls`, `searches`, etc.) must be confirmed against the live actor pages at build time — actor IDs are isolated in `config.json` so this stays a config-level fix.
```
