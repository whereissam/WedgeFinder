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
