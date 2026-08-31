/**
 * Job description analysis + match model.
 * Browser-safe: shared by the UI, the service layer and server helpers.
 */

export interface JobRequirement {
  /** Short requirement label, e.g. "React 18" or "Owns CI/CD pipelines". */
  label: string;
  /** hard = must-have, soft = nice-to-have / behavioural. */
  kind: "hard" | "soft";
  /** Verbatim-ish keyword an ATS is likely to scan for. */
  keyword: string;
}

export interface JobAnalysis {
  role: string;
  company: string;
  seniority: string;
  location: string;
  summary: string;
  requirements: JobRequirement[];
  keywords: string[];
  responsibilities: string[];
}

export interface JobMatchGap {
  requirement: string;
  /** Honest, non-fabricating suggestion for how to close or reframe the gap. */
  suggestion: string;
  severity: "high" | "medium" | "low";
}

export interface JobMatch {
  score: number;
  verdict: string;
  matched: string[];
  missing: JobMatchGap[];
  keywordCoverage: number;
}

export const emptyAnalysis: JobAnalysis = {
  role: "",
  company: "",
  seniority: "",
  location: "",
  summary: "",
  requirements: [],
  keywords: [],
  responsibilities: [],
};

const str = (v: unknown, fallback = ""): string => (typeof v === "string" ? v.trim() : fallback);
const strArray = (v: unknown, limit = 40): string[] =>
  Array.isArray(v)
    ? v
        .filter((i): i is string => typeof i === "string" && i.trim().length > 0)
        .map((i) => i.trim())
        .slice(0, limit)
    : [];

/** Defensive normaliser — the model is instructed, never trusted. */
export function normalizeAnalysis(value: unknown): JobAnalysis {
  const v = (value ?? {}) as Record<string, unknown>;
  const requirements = Array.isArray(v["requirements"])
    ? (v["requirements"] as unknown[])
        .map((raw) => {
          const r = (raw ?? {}) as Record<string, unknown>;
          const label = str(r["label"]) || str(raw);
          if (!label) return null;
          return {
            label,
            kind: r["kind"] === "soft" ? ("soft" as const) : ("hard" as const),
            keyword: str(r["keyword"]) || label,
          };
        })
        .filter((r): r is JobRequirement => r !== null)
        .slice(0, 24)
    : [];

  return {
    role: str(v["role"]),
    company: str(v["company"]),
    seniority: str(v["seniority"]),
    location: str(v["location"]),
    summary: str(v["summary"]),
    requirements,
    keywords: strArray(v["keywords"], 30),
    responsibilities: strArray(v["responsibilities"], 12),
  };
}

export function normalizeMatch(value: unknown): JobMatch {
  const v = (value ?? {}) as Record<string, unknown>;
  const missing = Array.isArray(v["missing"])
    ? (v["missing"] as unknown[])
        .map((raw) => {
          const r = (raw ?? {}) as Record<string, unknown>;
          const requirement = str(r["requirement"]) || str(raw);
          if (!requirement) return null;
          const severity = r["severity"];
          return {
            requirement,
            suggestion: str(r["suggestion"], "Add evidence for this only if it is true for you."),
            severity:
              severity === "high" || severity === "medium" || severity === "low"
                ? severity
                : ("medium" as const),
          };
        })
        .filter((g): g is JobMatchGap => g !== null)
        .slice(0, 12)
    : [];

  const rawScore = Number(v["score"]);
  return {
    score: Number.isFinite(rawScore) ? Math.max(0, Math.min(100, Math.round(rawScore))) : 0,
    verdict: str(v["verdict"], "Match calculated."),
    matched: strArray(v["matched"], 24),
    missing,
    keywordCoverage: Math.max(0, Math.min(100, Math.round(Number(v["keywordCoverage"]) || 0))),
  };
}

/**
 * Deterministic keyword coverage: how many JD keywords literally appear in the
 * resume text. Used as a sanity floor next to the model's judgement so the
 * score never depends purely on an LLM opinion.
 */
export function keywordCoverage(keywords: string[], resumeText: string): number {
  if (!keywords.length) return 0;
  const haystack = resumeText.toLowerCase();
  const hits = keywords.filter((k) => haystack.includes(k.toLowerCase().trim())).length;
  return Math.round((hits / keywords.length) * 100);
}

export function scoreTone(score: number): "strong" | "fair" | "weak" {
  if (score >= 75) return "strong";
  if (score >= 50) return "fair";
  return "weak";
}
