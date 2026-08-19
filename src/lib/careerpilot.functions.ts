/**
 * Server functions exposed to the client (thin wrappers only).
 * All handlers require an authenticated session.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { ResumeContent } from "./resume-schema";

export const generateResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      sourceText: string;
      githubUrl?: string;
      linkedinUrl?: string;
      targetRole?: string;
    }) => {
      if (!input?.sourceText?.trim() && !input?.githubUrl && !input?.linkedinUrl) {
        throw new Error("Add resume text or a GitHub/LinkedIn link first.");
      }
      return input;
    },
  )
  .handler(async ({ data }) => {
    const { buildResume } = await import("./ai.server");
    return buildResume(data);
  });

export const copilotEdit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { resume: ResumeContent; instruction: string; targetRole?: string }) => {
      if (!input?.instruction?.trim()) throw new Error("Tell the copilot what to change.");
      return input;
    },
  )
  .handler(async ({ data }) => {
    const { reviseResume } = await import("./ai.server");
    return reviseResume(data);
  });
