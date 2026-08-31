/**
 * AI response validation (server-only).
 *
 * Nothing produced by a model is persisted before passing through here: the
 * JSON is parsed defensively, checked against a zod schema and then handed to
 * the existing domain normalisers so the stored shape is always canonical.
 */
import { z } from "zod";
import { AiError } from "./gateway.server";
import { normalizeResume, type ResumeContent } from "../resume-schema";
import { normalizeAnalysis, normalizeMatch, type JobAnalysis, type JobMatch } from "../job-schema";

/** Parse model output as JSON, tolerating stray code fences. */
export function parseJson(raw: string, context: string): unknown {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    throw new AiError(`AI returned malformed ${context} data. Please try again.`, "invalid_output");
  }
}

function check<S extends z.ZodTypeAny>(schema: S, value: unknown, context: string): z.infer<S> {
  const result = schema.safeParse(value);
  if (!result.success) {
    console.error(
      JSON.stringify({
        scope: "ai",
        event: "validation.failed",
        context,
        issues: result.error.issues.slice(0, 5),
      }),
    );
    throw new AiError(`AI returned invalid ${context} data. Please try again.`, "invalid_output");
  }
  return result.data;
}

/* ---------------------------------------------------------------- schemas */

const resumeObject = z.object({}).passthrough();

const editEnvelope = z.object({
  resume: z.unknown().optional(),
  note: z.string().optional(),
  changes: z.array(z.string()).optional(),
});

const analysisEnvelope = z.object({
  role: z.string().optional(),
  requirements: z.array(z.unknown()).optional(),
  keywords: z.array(z.unknown()).optional(),
});

const matchEnvelope = z.object({
  score: z.union([z.number(), z.string()]).optional(),
  matched: z.array(z.unknown()).optional(),
  missing: z.array(z.unknown()).optional(),
});

export const uploadInsightSchema = z.object({
  summary: z.string().max(600).default(""),
  skills: z.array(z.string()).max(40).default([]),
  highlights: z.array(z.string()).max(20).default([]),
  organizations: z.array(z.string()).max(20).default([]),
  documentType: z
    .enum(["resume", "certificate", "transcript", "portfolio", "other"])
    .default("other"),
});
export type UploadInsight = z.infer<typeof uploadInsightSchema>;

export const profileAdviceSchema = z.object({
  verdict: z.string().max(400).default(""),
  gaps: z
    .array(
      z.object({
        section: z.string().default(""),
        advice: z.string().default(""),
        severity: z.enum(["high", "medium", "low"]).default("medium"),
      }),
    )
    .max(12)
    .default([]),
  nextSteps: z.array(z.string()).max(10).default([]),
});
export type ProfileAdvice = z.infer<typeof profileAdviceSchema>;

/* -------------------------------------------------------------- validators */

/** A bare resume document. */
export function validateResume(raw: string): ResumeContent {
  const parsed = check(resumeObject, parseJson(raw, "resume"), "resume");
  return normalizeResume(parsed);
}

/** `{ resume, note, changes }` returned by rewrite/tailor prompts. */
export function validateResumeEdit(
  raw: string,
  context: string,
): { resume: ResumeContent; note: string; changes: string[] } {
  const parsed = check(editEnvelope, parseJson(raw, context), context);
  return {
    resume: normalizeResume(parsed.resume ?? parsed),
    note: parsed.note?.trim() || "Updated your resume.",
    changes: (parsed.changes ?? []).filter((c) => c.trim().length > 0).slice(0, 6),
  };
}

export function validateAnalysis(raw: string): JobAnalysis {
  const parsed = check(analysisEnvelope.passthrough(), parseJson(raw, "analysis"), "analysis");
  return normalizeAnalysis(parsed);
}

export function validateMatch(raw: string, coverage: number): JobMatch {
  const parsed = check(matchEnvelope.passthrough(), parseJson(raw, "match"), "match");
  return normalizeMatch({ ...parsed, keywordCoverage: coverage });
}

export function validateUploadInsight(raw: string): UploadInsight {
  return check(uploadInsightSchema, parseJson(raw, "upload insight"), "upload insight");
}

export function validateProfileAdvice(raw: string): ProfileAdvice {
  return check(profileAdviceSchema, parseJson(raw, "profile advice"), "profile advice");
}
