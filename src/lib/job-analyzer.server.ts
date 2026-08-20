/**
 * Job description analysis, matching and resume tailoring (server-only).
 *
 * Flow: analyze (JD -> structured requirements) -> match (requirements vs the
 * user's stored resume/career profile) -> tailor (reorder + rewrite the resume
 * without inventing anything). Prompts come from the shared registry and every
 * model response is validated before it leaves this module.
 */
import { runPrompt } from "./ai/gateway.server";
import { createTaskLog } from "./ai/logger.server";
import * as prompts from "./ai/prompts.server";
import { validateAnalysis, validateMatch, validateResumeEdit } from "./ai/validation.server";
import { keywordCoverage, type JobAnalysis, type JobMatch } from "./job-schema";
import type { ResumeContent } from "./resume-schema";

/** Cap the JD we send so a pasted careers page can't blow the context window. */
export const MAX_JD_CHARS = 12_000;

/** Flatten a resume into plain text for deterministic keyword coverage. */
export function resumeToText(resume: ResumeContent): string {
  return [
    resume.name,
    resume.headline,
    resume.summary,
    resume.skills.join(" "),
    resume.experience
      .map((e) => `${e.role} ${e.company} ${e.period} ${e.bullets.join(" ")}`)
      .join(" "),
    resume.projects.map((p) => `${p.name} ${p.description} ${p.tech ?? ""}`).join(" "),
    resume.education.map((e) => `${e.degree} ${e.school}`).join(" "),
    resume.certifications.join(" "),
  ].join(" ");
}

/** Step 1 — extract structured requirements from a pasted job description. */
export async function analyzeJobDescription(input: {
  jdText: string;
  hintTitle?: string | undefined;
  hintCompany?: string | undefined;
}): Promise<JobAnalysis> {
  const log = createTaskLog("job.analyze");
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
}

/** Step 2 — compare the analysis against the candidate's current resume. */
export async function matchResumeToJob(input: {
  analysis: JobAnalysis;
  resume: ResumeContent;
}): Promise<JobMatch> {
  const log = createTaskLog("job.match");
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
}

/** Step 3 — produce a tailored resume that reorders and rewrites, never invents. */
export async function tailorResumeForJob(input: {
  analysis: JobAnalysis;
  match?: JobMatch | undefined;
  resume: ResumeContent;
}): Promise<{ resume: ResumeContent; changes: string[]; note: string }> {
  const log = createTaskLog("job.tailor");
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
    // Layout + style stay user-owned; the model only supplies content.
    resume: { ...edit.resume, layout: input.resume.layout, style: input.resume.style },
    note: edit.note,
    changes: edit.changes.slice(0, 6),
  };
}
