/**
 * AI orchestration API — thin server-function wrappers only.
 *
 * Every handler is authenticated (`requireSupabaseAuth`), validates its input
 * before touching the pipeline, and delegates to the orchestrator service.
 * No prompt text and no business logic lives in this file.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { ResumeContent } from "./resume-schema";
import type { JobAnalysis, JobMatch } from "./job-schema";

const requireText = (value: unknown, field: string, max = 12_000): string => {
  if (typeof value !== "string" || !value.trim()) throw new Error(`Missing ${field}.`);
  return value.trim().slice(0, max);
};

const requireId = (value: unknown, field: string): string => {
  if (typeof value !== "string" || !value.trim()) throw new Error(`Missing ${field}.`);
  return value;
};

/** Public catalog of prompt templates (ids + versions, no prompt bodies). */
export const aiCatalog = createServerFn({ method: "GET" }).handler(async () => {
  const { promptCatalog } = await import("./ai/prompts.server");
  const { AI_TASKS } = await import("./ai/orchestrator.server");
  return { tasks: [...AI_TASKS], prompts: promptCatalog() };
});

/** Generate or regenerate a resume through the orchestrated pipeline. */
export const orchestrateResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { resumeId: string; regenerate?: boolean; feedback?: string }) => ({
    resumeId: requireId(input?.resumeId, "resume id"),
    regenerate: Boolean(input?.regenerate),
    feedback: input?.feedback?.slice(0, 2_000),
  }))
  .handler(async ({ data, context }) => {
    const { runResumeGeneration } = await import("./ai/orchestrator.server");
    return runResumeGeneration(context.supabase, context.userId, data);
  });

/** Copilot rewrite: scoped, fact-preserving edit of a saved resume. */
export const orchestrateRewrite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      resumeId: string;
      resume: ResumeContent;
      instruction: string;
      section?: string;
      targetRole?: string;
      persist?: boolean;
    }) => {
      if (!input?.resume) throw new Error("Missing resume content.");
      return {
        resumeId: requireId(input?.resumeId, "resume id"),
        resume: input.resume,
        instruction: requireText(input?.instruction, "instruction", 1_000),
        section: input?.section,
        targetRole: input?.targetRole,
        persist: input?.persist !== false,
      };
    },
  )
  .handler(async ({ data, context }) => {
    const { runResumeRewrite, normalizeResume } = await import("./ai/orchestrator.server");
    return runResumeRewrite(context.supabase, {
      ...data,
      resume: normalizeResume(data.resume),
    });
  });

/** Extract structured requirements from a job description. */
export const orchestrateJobAnalyze = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { jdText: string; title?: string; company?: string }) => ({
    jdText: requireText(input?.jdText, "job description"),
    title: input?.title?.slice(0, 200),
    company: input?.company?.slice(0, 200),
  }))
  .handler(async ({ data }) => {
    const { runJobAnalysis } = await import("./ai/orchestrator.server");
    return runJobAnalysis({
      jdText: data.jdText,
      hintTitle: data.title,
      hintCompany: data.company,
    });
  });

/** Score a resume against an analyzed job. */
export const orchestrateJobMatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { analysis: JobAnalysis; resume: ResumeContent }) => {
    if (!input?.analysis) throw new Error("Missing job analysis.");
    if (!input?.resume) throw new Error("Missing resume content.");
    return input;
  })
  .handler(async ({ data }) => {
    const { runJobMatch, normalizeResume } = await import("./ai/orchestrator.server");
    return runJobMatch({ analysis: data.analysis, resume: normalizeResume(data.resume) });
  });

/** Tailor a resume for one job without inventing facts. */
export const orchestrateJobTailor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { analysis: JobAnalysis; match?: JobMatch; resume: ResumeContent }) => {
      if (!input?.analysis) throw new Error("Missing job analysis.");
      if (!input?.resume) throw new Error("Missing resume content.");
      return input;
    },
  )
  .handler(async ({ data }) => {
    const { runJobTailor, normalizeResume } = await import("./ai/orchestrator.server");
    return runJobTailor({
      analysis: data.analysis,
      match: data.match,
      resume: normalizeResume(data.resume),
    });
  });

/** Turn one uploaded document into structured metadata. */
export const orchestrateUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { uploadId: string }) => ({
    uploadId: requireId(input?.uploadId, "upload id"),
  }))
  .handler(async ({ data, context }) => {
    const { runUploadProcessing } = await import("./ai/orchestrator.server");
    return runUploadProcessing(context.supabase, data);
  });

/** Review the career knowledge profile and return improvement advice. */
export const orchestrateProfileSync = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { runProfileSync } = await import("./ai/orchestrator.server");
    return runProfileSync(context.supabase, context.userId);
  });
