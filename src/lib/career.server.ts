/**
 * Server-only persistence for the career knowledge profile.
 * All queries run through the caller's RLS-scoped Supabase client.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  normalizeEntry,
  type CareerEntry,
  type CareerKind,
  type CareerProfile,
} from "./career-schema";

type Client = SupabaseClient<Database>;

/** Payload accepted by create/update (id and user_id are handled server-side). */
export interface CareerEntryInput {
  kind: CareerKind;
  title?: string;
  subtitle?: string;
  organization?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
  description?: string;
  bullets?: string[];
  tags?: string[];
  level?: string;
  url?: string;
  position?: number;
}

/** Map the API shape to DB columns; undefined keys are left untouched. */
function toRow(input: Partial<CareerEntryInput>) {
  const row: Record<string, unknown> = {};
  if (input.kind !== undefined) row["kind"] = input.kind;
  if (input.title !== undefined) row["title"] = input.title.slice(0, 200);
  if (input.subtitle !== undefined) row["subtitle"] = input.subtitle.slice(0, 200);
  if (input.organization !== undefined) row["organization"] = input.organization.slice(0, 200);
  if (input.location !== undefined) row["location"] = input.location.slice(0, 200);
  if (input.startDate !== undefined) row["start_date"] = input.startDate.slice(0, 40);
  if (input.endDate !== undefined) row["end_date"] = input.endDate.slice(0, 40);
  if (input.isCurrent !== undefined) row["is_current"] = input.isCurrent;
  if (input.description !== undefined) row["description"] = input.description.slice(0, 4000);
  if (input.bullets !== undefined) row["bullets"] = input.bullets.slice(0, 20);
  if (input.tags !== undefined) row["tags"] = input.tags.slice(0, 30);
  if (input.level !== undefined) row["level"] = input.level || null;
  if (input.url !== undefined) row["url"] = input.url.slice(0, 500);
  if (input.position !== undefined) row["position"] = input.position;
  return row;
}

/** Full knowledge profile: personal info from `profiles` + all entries. */
export async function loadCareerProfile(
  supabase: Client,
  userId: string,
): Promise<CareerProfile> {
  const [profileRes, entriesRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase
      .from("career_entries")
      .select("*")
      .order("kind", { ascending: true })
      .order("position", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  if (entriesRes.error) throw new Error(entriesRes.error.message);
  const p = (profileRes.data ?? {}) as Record<string, unknown>;
  const str = (k: string) => (typeof p[k] === "string" ? (p[k] as string) : "");

  return {
    personal: {
      fullName: str("full_name"),
      jobTitle: str("job_title"),
      email: str("email"),
      phone: str("phone"),
      location: str("location"),
      headline: str("headline"),
      summary: str("summary"),
      githubUrl: str("github_url"),
      linkedinUrl: str("linkedin_url"),
      websiteUrl: str("website_url"),
    },
    entries: (entriesRes.data ?? []).map((r) => normalizeEntry(r as Record<string, unknown>)),
  };
}

export async function savePersonal(
  supabase: Client,
  userId: string,
  personal: Partial<CareerProfile["personal"]>,
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: personal.fullName ?? null,
      job_title: personal.jobTitle ?? null,
      phone: personal.phone ?? null,
      location: personal.location ?? null,
      headline: personal.headline ?? null,
      summary: personal.summary ?? null,
      github_url: personal.githubUrl ?? null,
      linkedin_url: personal.linkedinUrl ?? null,
      website_url: personal.websiteUrl ?? null,
    })
    .eq("id", userId);
  if (error) throw new Error(error.message);
}

export async function createEntry(
  supabase: Client,
  userId: string,
  input: CareerEntryInput,
): Promise<CareerEntry> {
  const { data, error } = await supabase
    .from("career_entries")
    .insert({ ...toRow(input), user_id: userId, kind: input.kind } as never)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return normalizeEntry(data as Record<string, unknown>);
}

export async function updateEntry(
  supabase: Client,
  id: string,
  patch: Partial<CareerEntryInput>,
): Promise<CareerEntry> {
  const { data, error } = await supabase
    .from("career_entries")
    .update(toRow(patch) as never)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return normalizeEntry(data as Record<string, unknown>);
}

export async function deleteEntry(supabase: Client, id: string): Promise<void> {
  const { error } = await supabase.from("career_entries").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** Persist a new ordering for one kind (drag/move up-down in the UI). */
export async function reorderEntries(
  supabase: Client,
  ids: string[],
): Promise<void> {
  await Promise.all(
    ids.map((id, index) =>
      supabase.from("career_entries").update({ position: index } as never).eq("id", id),
    ),
  );
}
