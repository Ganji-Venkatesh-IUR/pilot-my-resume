import { supabase } from "@/integrations/supabase/client";
import type { ProfileInput } from "@/lib/validation";

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  headline: string | null;
  location: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  website_url: string | null;
  created_at: string;
}

const COLUMNS =
  "id, full_name, email, headline, location, github_url, linkedin_url, website_url, created_at";

/** Profile reads/writes for the signed-in user (RLS scopes rows automatically). */
export const profileService = {
  async getCurrent(): Promise<Profile | null> {
    const { data, error } = await supabase.from("profiles").select(COLUMNS).maybeSingle();
    if (error) throw error;
    return data;
  },

  async updateName(userId: string, fullName: string) {
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim() || null })
      .eq("id", userId);
    if (error) throw error;
  },

  /** Saves the full editable profile (name, headline, location, links). */
  async update(userId: string, input: ProfileInput) {
    const nullable = (value: string) => value.trim() || null;
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: nullable(input.fullName),
        headline: nullable(input.headline),
        location: nullable(input.location),
        github_url: nullable(input.githubUrl),
        linkedin_url: nullable(input.linkedinUrl),
        website_url: nullable(input.websiteUrl),
      })
      .eq("id", userId);
    if (error) throw error;
  },
};
