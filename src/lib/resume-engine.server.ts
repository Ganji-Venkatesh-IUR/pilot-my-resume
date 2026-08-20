/**
 * Server-only resume engine: reads source material, runs generation and
 * persists results. All queries use the caller's RLS-scoped Supabase client.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";
import { estimateAtsScore, normalizeResume, type ResumeContent } from "./resume-schema";
import { normalizeSource, type NormalizedSource } from "./resume-source";
import { generateFromSource } from "./ai.server";

type Client = SupabaseClient<Database>;

export interface ResumeRow {
  id: string;
  title: string;
  template: string;
  target_role: string | null;
  source_text: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  content: Json;
  ats_score: number | null;
  created_at: string;
  updated_at: string;
}

/** Fetch one resume owned by the caller (RLS enforces ownership). */
export async function fetchResumeRow(supabase: Client, id: string): Promise<ResumeRow> {
  const { data, error } = await supabase.from("resumes").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Resume not found.");
  return data as ResumeRow;
}

/**
 * Collect the career knowledge profile + uploads + resume inputs into the
 * normalized source shape. The knowledge profile is the source of truth, so it
 * is prepended to the corpus ahead of noisier uploaded documents.
 */
export async function collectSource(
  supabase: Client,
  userId: string,
  row: ResumeRow,
): Promise<NormalizedSource> {
  const { loadCareerProfile } = await import("./career.server");
  const { careerProfileToText } = await import("./career-schema");

  const [{ data: uploads }, career] = await Promise.all([
    supabase
      .from("uploads")
      .select("kind, label, source_url, extracted_text, status")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(25),
    loadCareerProfile(supabase, userId),
  ]);

  const knowledgeText = careerProfileToText(career);
  const pasted = [knowledgeText, row.source_text ?? ""].filter(Boolean).join("\n\n");

  return normalizeSource({
    uploads: uploads ?? [],
    profile: {
      fullName: career.personal.fullName || undefined,
      email: career.personal.email || undefined,
      headline: career.personal.headline || career.personal.jobTitle || undefined,
      location: career.personal.location || undefined,
    },
    targetRole: row.target_role ?? undefined,
    pastedText: pasted || undefined,
    githubUrl: row.github_url ?? career.personal.githubUrl ?? undefined,
    linkedinUrl: row.linkedin_url ?? career.personal.linkedinUrl ?? undefined,
  });
}

/** Persist generated/edited content plus a refreshed ATS score. */
export async function saveContent(
  supabase: Client,
  id: string,
  content: ResumeContent,
  patch?: { title?: string | undefined; template?: string | undefined },
) {
  const payload: {
    content: Json;
    ats_score: number;
    title?: string;
    template?: string;
  } = {
    content: content as unknown as Json,
    ats_score: estimateAtsScore(content),
  };
  if (patch?.title) payload.title = patch.title;
  if (patch?.template) payload.template = patch.template;

  const { error } = await supabase.from("resumes").update(payload).eq("id", id);
  if (error) throw new Error(error.message);
}

export interface GenerationResult {
  resume: ResumeContent;
  atsScore: number;
  /** True when no source material existed and a scaffold was returned. */
  scaffold: boolean;
  richness: number;
}

/**
 * Generate (or regenerate) a resume for one row.
 * `regenerate` keeps the previous version as context so edits survive.
 */
export async function runGeneration(
  supabase: Client,
  userId: string,
  input: { resumeId: string; regenerate?: boolean | undefined; feedback?: string | undefined },
): Promise<GenerationResult> {
  const row = await fetchResumeRow(supabase, input.resumeId);
  const source = await collectSource(supabase, userId, row);

  const previous = input.regenerate ? normalizeResume(row.content) : undefined;
  const resume = await generateFromSource(source, {
    previous,
    feedback: input.feedback,
  });

  await saveContent(supabase, input.resumeId, resume);

  return {
    resume,
    atsScore: estimateAtsScore(resume),
    scaffold: source.isEmpty,
    richness: source.richness,
  };
}
