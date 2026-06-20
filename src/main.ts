import { readFile, writeFile } from "node:fs/promises";
import { sourceLabel } from "./report.ts";
import { runPipeline, type WfConfig } from "./pipeline.ts";

async function loadConfig(): Promise<WfConfig> {
  return JSON.parse(await readFile(new URL("../config.json", import.meta.url), "utf8"));
}

async function main() {
  const mock = process.argv.includes("--mock");
  const cfg = await loadConfig();
  const { productType, wanted, results, combined, opportunity, md } = await runPipeline(cfg, { mock });

  console.log(`Source router (rule-based) → ${productType} → [${wanted.join(", ")}]`);
  for (const r of results) {
    console.log(r.ok ? `  ✓ ${sourceLabel(r.source)}: ${r.items?.length ?? 0} items` : `  ✗ ${sourceLabel(r.source)}: ${r.error}`);
  }

  await writeFile("report.md", md, "utf8");

  const total = Object.values(combined.counts).reduce((a, b) => a + b, 0);
  console.log(`\nDecision: ${opportunity.decision}  Confidence: ${opportunity.confidence}/100`);
  console.log(`Analyzed ${total} signals across ${combined.usedSources.map(sourceLabel).join(", ") || "none"}.`);
  console.log(`Estimated data cost: ~$${combined.totalCost.toFixed(2)} (pay-per-use)`);
  console.log(`Wrote report.md`);
}

main().catch((e) => { console.error(e); process.exit(1); });
