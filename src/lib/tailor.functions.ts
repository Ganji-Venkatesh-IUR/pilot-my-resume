/**
 * Job analyzer + tailoring API (thin server-function wrappers only).
 *
 * Endpoints: analyze, match, tailor, fetch (one), history (list), delete.
 * Every handler requires an authenticated session; RLS enforces ownership.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Analyze a pasted job description and store it as a job target. */
export const analyzeJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      jdText: string;
      title?: string | undefined;
      company?: string | undefined;
      baseResumeId?: string | undefined;
    }) => {
      const text = input?.jdText?.trim() ?? "";
      if (text.length < 80) throw new Error("Paste a fuller job description (at least 80 characters).");
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    const { analyzeJobDescription, MAX_JD_CHARS } = await import("./job-analyzer.server");
    const { insertJobTarget } = await import("./job-targets.server");

    const jdText = data.jdText.trim().slice(0, MAX_JD_CHARS);
    const analysis = await analyzeJobDescription({
      jdText,
      hintTitle: data.title,
      hintCompany: data.company,
    });

    const row = await insertJobTarget(context.supabase, context.userId, {
      title: (data.title?.trim() || analysis.role || "Untitled role").slice(0, 120),
      company: data.company?.trim() || analysis.company || null,
      jdText,
      analysis,
      baseResumeId: data.baseResumeId ?? null,
    });

    return { id: row.id, analysis };
  });

/** Compare a stored analysis against one of the user's resumes. */
export const matchJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { jobId: string; resumeId: string }) => {
    if (!input?.jobId || !input?.resumeId) throw new Error("Pick a resume to match against.");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { matchResumeToJob } = await import("./job-analyzer.server");
    const { getJobTarget, saveMatch } = await import("./job-targets.server");
    const { fetchResumeRow } = await import("./resume-engine.server");
    const { normalizeAnalysis } = await import("./job-schema");
    const { normalizeResume } = await import("./resume-schema");

    const target = await getJobTarget(context.supabase, data.jobId);
    if (!target.analysis) throw new Error("Analyze the job description first.");
    const resumeRow = await fetchResumeRow(context.supabase, data.resumeId);

    const match = await matchResumeToJob({
      analysis: normalizeAnalysis(target.analysis),
      resume: normalizeResume(resumeRow.content),
    });

    await saveMatch(context.supabase, data.jobId, match, data.resumeId);
    return { match };
  });

/** Generate (or refresh) the tailored resume version for a job target. */
export const tailorForJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { jobId: string; resumeId?: string | undefined }) => {
    if (!input?.jobId) throw new Error("Missing job id.");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { tailorResumeForJob } = await import("./job-analyzer.server");
    const { getJobTarget, saveTailoredResume } = await import("./job-targets.server");
    const { fetchResumeRow } = await import("./resume-engine.server");
    const { normalizeAnalysis, normalizeMatch } = await import("./job-schema");
    const { normalizeResume, estimateAtsScore } = await import("./resume-schema");

    const target = await getJobTarget(context.supabase, data.jobId);
    if (!target.analysis) throw new Error("Analyze the job description first.");

    const baseId = data.resumeId ?? target.base_resume_id;
    if (!baseId) throw new Error("Pick the resume you want tailored.");

    const baseRow = await fetchResumeRow(context.supabase, baseId);
    const result = await tailorResumeForJob({
      analysis: normalizeAnalysis(target.analysis),
      match: target.match ? normalizeMatch(target.match) : undefined,
      resume: normalizeResume(baseRow.content),
    });

    const tailoredId = await saveTailoredResume(
      context.supabase,
      context.userId,
      target,
      result.resume,
      baseRow.template,
    );

    // Keep the base link accurate when the user tailored a different resume.
    if (target.base_resume_id !== baseId) {
      await context.supabase
        .from("job_targets")
        .update({ base_resume_id: baseId, status: "tailored" })
        .eq("id", target.id);
    }

    return {
      tailoredResumeId: tailoredId,
      resume: result.resume,
      note: result.note,
      changes: result.changes,
      atsScore: estimateAtsScore(result.resume),
    };
  });

/** Fetch one job target with both resume versions for side-by-side compare. */
export const fetchJobTarget = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { jobId: string }) => {
    if (!input?.jobId) throw new Error("Missing job id.");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { getJobTargetDetail } = await import("./job-targets.server");
    return getJobTargetDetail(context.supabase, data.jobId);
  });

/** History of analyzed roles, newest first. */
export const fetchJobHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { listJobTargetRows } = await import("./job-targets.server");
    const rows = await listJobTargetRows(context.supabase);
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      company: r.company,
      matchScore: r.match_score,
      status: r.status,
      tailoredResumeId: r.tailored_resume_id,
      createdAt: r.created_at,
    }));
  });

/** Remove a job target (the tailored resume row is kept on purpose). */
export const deleteJobTarget = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { jobId: string }) => {
    if (!input?.jobId) throw new Error("Missing job id.");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("job_targets").delete().eq("id", data.jobId);
    if (error) throw new Error(error.message);
    return { deleted: true };
  });
