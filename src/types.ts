export type Source = "ios_review" | "android_review" | "reddit" | "threads";

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
  mvpFeatures: string[];           // concrete v1 features
  avoid: string[];                 // what NOT to build in v1
  alternatives: string[];          // existing competing products in this space
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
  mvpFeatures: string[];
  avoid: string[];
  alternatives: string[];
};

export type SourceResult = {
  source: Source;
  ok: boolean;
  items: EvidenceItem[];
  costEstimate: number;
  error?: string;
};
