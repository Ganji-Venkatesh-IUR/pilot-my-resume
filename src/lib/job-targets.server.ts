/**
 * Server-only persistence for job targets (analysis + match + tailored copy).
 * All queries run through the caller's RLS-scoped Supabase client.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";
import { estimateAtsScore, normalizeResume, type ResumeContent } from "./resume-schema";
import { normalizeAnalysis, normalizeMatch, type JobAnalysis, type JobMatch } from "./job-schema";

type Client = SupabaseClient<Database>;

export interface JobTargetRow {
  id: string;
  title: string;
  company: string | null;
  jd_text: string;
  analysis: Json | null;
  match: Json | null;
  match_score: number | null;
  base_resume_id: string | null;
  tailored_resume_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

/** Row + parsed JSON payloads, ready for the UI. */
export interface JobTargetDetail {
  row: JobTargetRow;
  analysis: JobAnalysis | null;
  match: JobMatch | null;
  baseResume: ResumeContent | null;
  tailoredResume: ResumeContent | null;
  baseTitle: string | null;
  tailoredTitle: string | null;
}

export async function getJobTarget(supabase: Client, id: string): Promise<JobTargetRow> {
  const { data, error } = await supabase.from("job_targets").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Job target not found.");
  return data as JobTargetRow;
}

/** Load a job target together with both resume versions for comparison. */
export async function getJobTargetDetail(supabase: Client, id: string): Promise<JobTargetDetail> {
  const row = await getJobTarget(supabase, id);

  const ids = [row.base_resume_id, row.tailored_resume_id].filter((v): v is string => Boolean(v));
  const resumes = ids.length
    ? ((await supabase.from("resumes").select("id, title, content").in("id", ids)).data ?? [])
    : [];

  const find = (rid: string | null) => (rid ? resumes.find((r) => r.id === rid) : undefined);
  const base = find(row.base_resume_id);
  const tailored = find(row.tailored_resume_id);

  return {
    row,
    analysis: row.analysis ? normalizeAnalysis(row.analysis) : null,
    match: row.match ? normalizeMatch(row.match) : null,
    baseResume: base ? normalizeResume(base.content) : null,
    tailoredResume: tailored ? normalizeResume(tailored.content) : null,
    baseTitle: base?.title ?? null,
    tailoredTitle: tailored?.title ?? null,
  };
}

export async function listJobTargetRows(supabase: Client): Promise<JobTargetRow[]> {
  const { data, error } = await supabase
    .from("job_targets")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data ?? []) as JobTargetRow[];
}

export async function insertJobTarget(
  supabase: Client,
  userId: string,
  input: {
    title: string;
    company: string | null;
    jdText: string;
    analysis: JobAnalysis;
    baseResumeId: string | null;
  },
): Promise<JobTargetRow> {
  const { data, error } = await supabase
    .from("job_targets")
    .insert({
      user_id: userId,
      title: input.title,
      company: input.company,
      jd_text: input.jdText,
      analysis: input.analysis as unknown as Json,
      base_resume_id: input.baseResumeId,
      status: "analyzed",
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as JobTargetRow;
}

export async function saveMatch(
  supabase: Client,
  id: string,
  match: JobMatch,
  baseResumeId: string | null,
) {
  const { error } = await supabase
    .from("job_targets")
    .update({
      match: match as unknown as Json,
      match_score: match.score,
      status: "matched",
      ...(baseResumeId ? { base_resume_id: baseResumeId } : {}),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Store the tailored resume as its own row so the original is never lost.
 * Re-tailoring updates the existing tailored row instead of piling up copies.
 */
export async function saveTailoredResume(
  supabase: Client,
  userId: string,
  target: JobTargetRow,
  content: ResumeContent,
  baseTemplate: string,
): Promise<string> {
  const label = `${target.title}${target.company ? ` @ ${target.company}` : ""}`;
  const payload = {
    title: `Tailored — ${label}`.slice(0, 120),
    content: content as unknown as Json,
    ats_score: estimateAtsScore(content),
    target_role: target.title,
    template: baseTemplate,
  };

  if (target.tailored_resume_id) {
    const { error } = await supabase
      .from("resumes")
      .update(payload)
      .eq("id", target.tailored_resume_id);
    if (error) throw new Error(error.message);
    return target.tailored_resume_id;
  }

  const { data, error } = await supabase
    .from("resumes")
    .insert({ user_id: userId, ...payload })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const { error: linkError } = await supabase
    .from("job_targets")
    .update({ tailored_resume_id: data.id, status: "tailored" })
    .eq("id", target.id);
  if (linkError) throw new Error(linkError.message);

  return data.id;
}
