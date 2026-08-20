/**
 * Resume engine API (thin server-function wrappers only).
 *
 * Exposed operations: generate, regenerate, fetch, update, delete, plus the
 * copilot edit endpoint. Every handler requires an authenticated session and
 * relies on RLS for ownership.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { ResumeContent } from "./resume-schema";

/** Generate a resume from the user's uploads, links and pasted notes. */
export const generateResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { resumeId: string }) => {
    if (!input?.resumeId) throw new Error("Missing resume id.");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { runGeneration } = await import("./resume-engine.server");
    return runGeneration(context.supabase, context.userId, { resumeId: data.resumeId });
  });

/** Regenerate, keeping the current version as context (optional feedback). */
export const regenerateResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { resumeId: string; feedback?: string | undefined }) => {
    if (!input?.resumeId) throw new Error("Missing resume id.");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { runGeneration } = await import("./resume-engine.server");
    return runGeneration(context.supabase, context.userId, {
      resumeId: data.resumeId,
      regenerate: true,
      feedback: data.feedback,
    });
  });

/** Fetch one resume row (structured JSON the preview can render directly). */
export const fetchResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { resumeId: string }) => {
    if (!input?.resumeId) throw new Error("Missing resume id.");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { fetchResumeRow } = await import("./resume-engine.server");
    return fetchResumeRow(context.supabase, data.resumeId);
  });

/** Update content / title / template and refresh the ATS score. */
export const updateResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      resumeId: string;
      content: ResumeContent;
      title?: string | undefined;
      template?: string | undefined;
    }) => {
      if (!input?.resumeId) throw new Error("Missing resume id.");
      if (!input?.content) throw new Error("Missing resume content.");
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    const { saveContent } = await import("./resume-engine.server");
    const { normalizeResume, estimateAtsScore } = await import("./resume-schema");
    const content = normalizeResume(data.content);
    await saveContent(context.supabase, data.resumeId, content, {
      title: data.title,
      template: data.template,
    });
    return { resume: content, atsScore: estimateAtsScore(content) };
  });

/** Delete a resume owned by the caller. */
export const deleteResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { resumeId: string }) => {
    if (!input?.resumeId) throw new Error("Missing resume id.");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("resumes").delete().eq("id", data.resumeId);
    if (error) throw new Error(error.message);
    return { deleted: true };
  });

/** Apply a natural-language copilot instruction to an existing resume. */
export const copilotEdit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      resume: ResumeContent;
      instruction: string;
      targetRole?: string | undefined;
    }) => {
      if (!input?.instruction?.trim()) throw new Error("Tell the copilot what to change.");
      return input;
    },
  )
  .handler(async ({ data }) => {
    const { reviseResume } = await import("./ai.server");
    return reviseResume(data);
  });
