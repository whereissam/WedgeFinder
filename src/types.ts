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
