/**
 * AI workflow orchestrator (server-only).
 *
 * This is the single entry point for every AI pipeline in CareerPilot:
 * resume generation, copilot rewrites, job analysis / matching / tailoring,
 * upload processing and career-profile sync.
 *
 * Service boundaries:
 *   prompts.server     — prompt templates (no transport, no IO)
 *   gateway.server     — model transport (retries, timeouts, errors)
 *   validation.server  — schema validation of model output
 *   orchestrator       — sequencing, persistence and logging (this file)
 *
 * Persistence always goes through the caller's RLS-scoped Supabase client, so
 * a user can only ever orchestrate work over their own data.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";
import { createTaskLog } from "./logger.server";
import { AiError, runPrompt } from "./gateway.server";
import * as prompts from "./prompts.server";
import {
  validateAnalysis,
  validateMatch,
  validateProfileAdvice,
  validateResumeEdit,
  validateUploadInsight,
  type ProfileAdvice,
  type UploadInsight,
} from "./validation.server";
import { estimateAtsScore, normalizeResume, type ResumeContent } from "../resume-schema";
import { keywordCoverage, type JobAnalysis, type JobMatch } from "../job-schema";

type Client = SupabaseClient<Database>;

/** Every orchestrated task returns the same envelope. */
export interface TaskResult<T> {
  ok: true;
  traceId: string;
  durationMs: number;
  data: T;
}

/** Task names exposed to the frontend. */
export const AI_TASKS = [
  "resume.generate",
  "resume.regenerate",
  "resume.rewrite",
  "job.analyze",
  "job.match",
  "job.tailor",
  "upload.process",
  "profile.sync",
] as const;
export type AiTask = (typeof AI_TASKS)[number];

const MAX_JD_CHARS = 12_000;
const MAX_DOC_CHARS = 16_000;

/** Wrap a pipeline with tracing + uniform error mapping. */
async function orchestrate<T>(
  task: AiTask,
  run: (log: ReturnType<typeof createTaskLog>) => Promise<T>,
): Promise<TaskResult<T>> {
  const log = createTaskLog(task);
  log.event("start");
  try {
    const data = await run(log);
    log.event("end", { status: "ok" });
    return { ok: true, traceId: log.traceId, durationMs: log.elapsed(), data };
  } catch (error) {
    const code = error instanceof AiError ? error.code : "internal";
    log.event("end", { status: "error", code }, "error");
    // Only safe, user-facing text crosses the RPC boundary.
    throw new Error(
      error instanceof AiError
        ? error.message
        : (error as Error)?.message || "Something went wrong running that AI task.",
    );
  }
}

/* ------------------------------------------------------- resume pipelines */

/** Generate or regenerate a resume from the knowledge profile + uploads. */
export function runResumeGeneration(
  supabase: Client,
  userId: string,
  input: { resumeId: string; regenerate?: boolean | undefined; feedback?: string | undefined },
) {
  const task: AiTask = input.regenerate ? "resume.regenerate" : "resume.generate";
  return orchestrate(task, async (log) => {
    const { runGeneration } = await import("../resume-engine.server");
    const result = await runGeneration(supabase, userId, input);
    log.event("resume.persisted", { atsScore: result.atsScore, scaffold: result.scaffold });
    return result;
  });
}

/** Apply a copilot instruction to a resume and persist the validated result. */
export function runResumeRewrite(
  supabase: Client,
  input: {
    resumeId: string;
    resume: ResumeContent;
    instruction: string;
    section?: string | undefined;
    targetRole?: string | undefined;
    persist?: boolean | undefined;
  },
) {
  return orchestrate("resume.rewrite", async (log) => {
    const raw = await runPrompt(
      prompts.resumeRewrite,
      {
        resumeJson: JSON.stringify(input.resume),
        instruction: input.instruction,
        section: input.section,
        targetRole: input.targetRole,
      },
      log,
    );

    const edit = validateResumeEdit(raw, "edit");
    // Layout + style are user-owned state; the model never gets to change them.
    const resume: ResumeContent = {
      ...edit.resume,
      layout: input.resume.layout,
      style: input.resume.style,
    };

    if (input.persist !== false) {
      const { saveContent } = await import("../resume-engine.server");
      await saveContent(supabase, input.resumeId, resume);
      log.event("resume.persisted", { atsScore: estimateAtsScore(resume) });
    }

    return {
      resume,
      note: edit.note,
      changes: edit.changes.slice(0, 4),
      atsScore: estimateAtsScore(resume),
    };
  });
}

/* ---------------------------------------------------------- job pipelines */

export function runJobAnalysis(input: {
  jdText: string;
  hintTitle?: string | undefined;
  hintCompany?: string | undefined;
}): Promise<TaskResult<JobAnalysis>> {
  return orchestrate("job.analyze", async (log) => {
    const raw = await runPrompt(
      prompts.jobAnalyze,
      {
        jdText: input.jdText.slice(0, MAX_JD_CHARS),
        hintTitle: input.hintTitle,
        hintCompany: input.hintCompany,
      },
      log,
    );
    return validateAnalysis(raw);
  });
}

export function runJobMatch(input: {
  analysis: JobAnalysis;
  resume: ResumeContent;
}): Promise<TaskResult<JobMatch>> {
  return orchestrate("job.match", async (log) => {
    const { resumeToText } = await import("../job-analyzer.server");
    const coverage = keywordCoverage(input.analysis.keywords, resumeToText(input.resume));
    const raw = await runPrompt(
      prompts.jobMatch,
      {
        analysisJson: JSON.stringify(input.analysis),
        resumeJson: JSON.stringify(input.resume),
        coverage,
      },
      log,
    );
    return validateMatch(raw, coverage);
  });
}

export function runJobTailor(input: {
  analysis: JobAnalysis;
  match?: JobMatch | undefined;
  resume: ResumeContent;
}) {
  return orchestrate("job.tailor", async (log) => {
    const raw = await runPrompt(
      prompts.jobTailor,
      {
        analysisJson: JSON.stringify(input.analysis),
        matchJson: input.match ? JSON.stringify(input.match) : undefined,
        resumeJson: JSON.stringify(input.resume),
      },
      log,
    );
    const edit = validateResumeEdit(raw, "tailoring");
    return {
      resume: {
        ...edit.resume,
        layout: input.resume.layout,
        style: input.resume.style,
      } as ResumeContent,
      note: edit.note,
      changes: edit.changes,
    };
  });
}

/* ------------------------------------------------------- upload pipeline */

/** Turn one uploaded document's extracted text into structured metadata. */
export function runUploadProcessing(
  supabase: Client,
  input: { uploadId: string },
): Promise<TaskResult<UploadInsight & { uploadId: string }>> {
  return orchestrate("upload.process", async (log) => {
    const { data: row, error } = await supabase
      .from("uploads")
      .select("id, label, extracted_text, metadata")
      .eq("id", input.uploadId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Upload not found.");

    const text = (row.extracted_text ?? "").slice(0, MAX_DOC_CHARS);
    if (text.trim().length < 40) {
      throw new Error("This upload has no readable text to process yet.");
    }

    const raw = await runPrompt(prompts.uploadProcess, { label: row.label, text }, log);
    const insight = validateUploadInsight(raw);

    const metadata = {
      ...((row.metadata as Record<string, unknown> | null) ?? {}),
      insight,
      processedAt: new Date().toISOString(),
    };
    const { error: saveError } = await supabase
      .from("uploads")
      .update({ metadata: metadata as unknown as Json, status: "processed" })
      .eq("id", input.uploadId);
    if (saveError) throw new Error(saveError.message);

    log.event("upload.persisted", { skills: insight.skills.length });
    return { ...insight, uploadId: input.uploadId };
  });
}

/* ------------------------------------------------------ profile pipeline */

/** Review the career knowledge profile and return honest improvement advice. */
export function runProfileSync(
  supabase: Client,
  userId: string,
): Promise<TaskResult<ProfileAdvice & { completeness: number }>> {
  return orchestrate("profile.sync", async (log) => {
    const { loadCareerProfile } = await import("../career.server");
    const { careerProfileToText, profileCompleteness } = await import("../career-schema");

    const profile = await loadCareerProfile(supabase, userId);
    const completeness = profileCompleteness(profile);
    const profileText = careerProfileToText(profile);

    if (!profileText.trim()) {
      return {
        completeness,
        verdict: "Your career profile is empty — add your experience and skills to get started.",
        gaps: [],
        nextSteps: [
          "Add at least one work experience entry.",
          "List the skills you use most, with levels.",
          "Add your education history.",
        ],
      };
    }

    const raw = await runPrompt(prompts.profileSync, { profileText, completeness }, log);
    const advice = validateProfileAdvice(raw);
    return { ...advice, completeness };
  });
}

/** Re-export for services that need a canonical resume before orchestrating. */
export { normalizeResume };
