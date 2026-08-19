import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { emptyResume, type TemplateId } from "@/lib/resume-schema";

export interface NewResumeInput {
  title?: string;
  targetRole?: string;
  sourceText?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  template?: TemplateId;
}

/**
 * Creates an empty resume row owned by the signed-in user and returns its id.
 * Shared by the upload center, the builder and the templates grid.
 */
export async function createResume(input: NewResumeInput): Promise<string> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Session expired. Please sign in again.");

  const { data, error } = await supabase
    .from("resumes")
    .insert({
      user_id: auth.user.id,
      title: input.title?.trim() || "Untitled resume",
      target_role: input.targetRole?.trim() || null,
      source_text: input.sourceText?.trim() || null,
      github_url: input.githubUrl?.trim() || null,
      linkedin_url: input.linkedinUrl?.trim() || null,
      template: input.template ?? "atlas",
      content: emptyResume as unknown as Json,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}
