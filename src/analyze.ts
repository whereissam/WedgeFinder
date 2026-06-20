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
