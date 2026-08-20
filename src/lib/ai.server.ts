/**
 * Resume AI service (server-only).
 *
 * Transport lives in `ai/gateway.server`, prompt text in `ai/prompts.server`
 * and response checking in `ai/validation.server` — this module only sequences
 * them for the resume domain.
 */
import { normalizeResume, type ResumeContent } from "./resume-schema";
import { buildCorpus, type NormalizedSource } from "./resume-source";
import { callGateway as gatewayCall, runPrompt } from "./ai/gateway.server";
import { createTaskLog } from "./ai/logger.server";
import * as prompts from "./ai/prompts.server";
import { validateResume, validateResumeEdit } from "./ai/validation.server";

/** Back-compat low-level call used by other server services. */
export async function callGateway(
  messages: Array<{ role: string; content: string }>,
): Promise<string> {
  return gatewayCall(messages);
}

/**
 * Deterministic scaffold used when there is no material to summarise.
 * Keeps the preview renderable instead of failing the whole request.
 */
export function baselineResume(source: NormalizedSource): ResumeContent {
  return normalizeResume({
    name: source.profile.fullName ?? "",
    headline: source.targetRole || source.profile.headline || "",
    email: source.profile.email ?? "",
    location: source.profile.location ?? "",
    links: source.links.map((l) => l.url),
  });
}

/** Build a full ATS-optimised resume from normalized source material. */
export async function generateFromSource(
  source: NormalizedSource,
  options?: { previous?: ResumeContent | undefined; feedback?: string | undefined },
): Promise<ResumeContent> {
  if (source.isEmpty) return baselineResume(source);

  const log = createTaskLog("resume.generate");
  const raw = await runPrompt(
    prompts.resumeGenerate,
    {
      corpus: buildCorpus(source),
      targetRole: source.targetRole,
      previous: options?.previous ? JSON.stringify(options.previous) : undefined,
      feedback: options?.feedback,
    },
    log,
  );

  const generated = validateResume(raw);

  // Backfill contact details the model may have dropped.
  return normalizeResume({
    ...generated,
    name: generated.name || (source.profile.fullName ?? ""),
    email: generated.email || (source.profile.email ?? ""),
    location: generated.location || (source.profile.location ?? ""),
    links: generated.links.length ? generated.links : source.links.map((l) => l.url),
  });
}

/** Apply a natural-language copilot instruction to an existing resume. */
export async function reviseResume(input: {
  resume: ResumeContent;
  instruction: string;
  targetRole?: string | undefined;
}): Promise<{ resume: ResumeContent; note: string }> {
  const result = await rewriteSection(input);
  return { resume: result.resume, note: result.note };
}

/**
 * Rewrite one section (or the whole resume) under a user instruction.
 * The prompt forbids invented facts and asks for an explanation of the change.
 */
export async function rewriteSection(input: {
  resume: ResumeContent;
  instruction: string;
  section?: string | undefined;
  targetRole?: string | undefined;
}): Promise<{ resume: ResumeContent; note: string; changes: string[] }> {
  const log = createTaskLog("resume.rewrite");
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
  return {
    // Layout + style are user-owned state; the model never gets to change them.
    resume: { ...edit.resume, layout: input.resume.layout, style: input.resume.style },
    note: edit.note,
    changes: edit.changes.slice(0, 4),
  };
}
