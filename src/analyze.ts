import { GoogleGenAI, Type } from "@google/genai";
import type { EvidenceItem, PainPoint, JudgeScores, Source } from "./types.ts";

const MODEL = "gemini-2.5-flash";
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const toBool = (v: unknown) => v === true || v === "true" || v === "yes";
const VALID_SOURCES: Source[] = ["ios_review", "android_review", "reddit", "threads"];
const toSource = (v: unknown): Source => (VALID_SOURCES.includes(v as Source) ? (v as Source) : "reddit");

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

const toStringArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean) : [];

export function parseJudgeResponse(input: unknown): JudgeScores {
  const j = input as any;
  return {
    wedge: String(j?.wedge ?? "Unspecified wedge").trim(),
    competitorInertia: clamp(Number(j?.competitorInertia) || 0, 0, 100),
    startupExploitability: clamp(Number(j?.startupExploitability) || 0, 0, 100),
    mvpFeatures: toStringArray(j?.mvpFeatures),
    avoid: toStringArray(j?.avoid),
    alternatives: toStringArray(j?.alternatives),
  };
}

export function makeClient(): GoogleGenAI {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

const PAIN_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    pains: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          pain: { type: Type.STRING },
          source: { type: Type.STRING, enum: ["ios_review", "android_review", "reddit", "threads"] },
          quote: { type: Type.STRING },
          severity: { type: Type.NUMBER },
          switchingIntent: { type: Type.BOOLEAN },
          willingnessToPaySignal: { type: Type.BOOLEAN },
        },
        required: ["pain", "source", "quote", "severity", "switchingIntent", "willingnessToPaySignal"],
      },
    },
  },
  required: ["pains"],
};

const JUDGE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    wedge: { type: Type.STRING, description: "Plain-language, founder-readable wedge in under 8 words, no jargon" },
    competitorInertia: { type: Type.NUMBER, description: "0-100, how hard for incumbent to fix" },
    startupExploitability: { type: Type.NUMBER, description: "0-100, how exploitable by a small team" },
    mvpFeatures: { type: Type.ARRAY, items: { type: Type.STRING }, description: "4-6 concrete features to build in v1" },
    avoid: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3-4 things NOT to build in v1" },
    alternatives: { type: Type.ARRAY, items: { type: Type.STRING }, description: "existing competing products the founder would face" },
  },
  required: ["wedge", "competitorInertia", "startupExploitability", "mvpFeatures", "avoid", "alternatives"],
};

async function callModel<T>(
  client: GoogleGenAI, schema: unknown, prompt: string, parse: (i: unknown) => T,
): Promise<T> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await client.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: { responseMimeType: "application/json", responseSchema: schema },
    });
    try {
      return parse(JSON.parse(res.text ?? ""));
    } catch (e) {
      if (attempt === 1) throw e;
    }
  }
  throw new Error("unreachable");
}

export async function extractPains(items: EvidenceItem[], client: GoogleGenAI): Promise<PainPoint[]> {
  const corpus = items
    .map((i, n) => `[${n}] (${i.source}${i.rating ? `, ${i.rating}★` : ""}) ${i.text}`)
    .join("\n");
  const prompt =
    `Extract concrete product pain points from these user complaints. For each, give a short pain ` +
    `label, the source, a short verbatim quote, severity 0-100 (does it block usage / cause data loss?), ` +
    `switchingIntent (do they mention leaving/alternatives?), and willingnessToPaySignal (paid/team/` +
    `productivity stakes?). Only real pains, no filler.\n\nComplaints:\n${corpus}`;
  return callModel(client, PAIN_SCHEMA, prompt, parsePainsResponse);
}

export async function judgeOpportunity(
  pains: PainPoint[], idea: string, competitor: string, client: GoogleGenAI,
): Promise<JudgeScores> {
  const summary = pains.map((p) => `- ${p.pain} (sev ${p.severity})`).join("\n");
  const prompt =
    `A founder wants to build: "${idea}", competing with ${competitor}. Based on these extracted pains:\n` +
    `1. wedge: the single best angle, phrased in plain founder language under 8 words (e.g. "Notes that never disappear offline"), NOT enterprise/technical jargon.\n` +
    `2. competitorInertia (0-100): how hard is this for ${competitor} to fix?\n` +
    `3. startupExploitability (0-100): how realistically can a small team exploit it?\n` +
    `4. mvpFeatures: 4-6 concrete, specific features to ship in v1 (not vague).\n` +
    `5. avoid: 3-4 things NOT to build in v1 (scope traps).\n` +
    `6. alternatives: existing products already competing in this space the founder would face.\n\n` +
    `Pains:\n${summary}`;
  return callModel(client, JUDGE_SCHEMA, prompt, parseJudgeResponse);
}
