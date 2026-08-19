import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { emptyResume, type ResumeContent, type TemplateId } from "@/lib/resume-schema";

/** Row shape used by list views (dashboard, builder, copilot). */
export interface ResumeSummary {
  id: string;
  title: string;
  template: string;
  target_role: string | null;
  ats_score: number | null;
  updated_at: string;
}

export interface NewResumeInput {
  title?: string;
  targetRole?: string;
  sourceText?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  template?: TemplateId;
}

/**
 * All resume persistence lives here so components never talk to the backend
 * directly. Swap the bodies for `apiClient` calls to move onto a REST backend.
 */
export const resumeService = {
  async list(): Promise<ResumeSummary[]> {
    const { data, error } = await supabase
      .from("resumes")
      .select("id, title, template, target_role, ats_score, updated_at")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async get(id: string) {
    const { data, error } = await supabase.from("resumes").select("*").eq("id", id).single();
    if (error) throw error;
    return data;
  },

  /** Creates an empty resume owned by the signed-in user and returns its id. */
  async create(input: NewResumeInput): Promise<string> {
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
  },

  async updateContent(id: string, content: ResumeContent, atsScore?: number) {
    const { error } = await supabase
      .from("resumes")
      .update({
        content: content as unknown as Json,
        ...(atsScore === undefined ? {} : { ats_score: atsScore }),
      })
      .eq("id", id);
    if (error) throw error;
  },

  async updateTemplate(id: string, template: TemplateId) {
    const { error } = await supabase.from("resumes").update({ template }).eq("id", id);
    if (error) throw error;
  },

  /** Partial update for the editor (title / template / content in one round-trip). */
  async patch(
    id: string,
    patch: { title?: string; template?: TemplateId; content?: ResumeContent; atsScore?: number },
  ) {
    const payload: Record<string, unknown> = {};
    if (patch.title) payload["title"] = patch.title;
    if (patch.template) payload["template"] = patch.template;
    if (patch.content) payload["content"] = patch.content as unknown as Json;
    if (patch.atsScore !== undefined) payload["ats_score"] = patch.atsScore;
    if (Object.keys(payload).length === 0) return;

    const { error } = await supabase.from("resumes").update(payload).eq("id", id);
    if (error) throw error;
  },

  async remove(id: string) {
    const { error } = await supabase.from("resumes").delete().eq("id", id);
    if (error) throw error;
  },
};
