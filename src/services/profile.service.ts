import { supabase } from "@/integrations/supabase/client";

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  created_at: string;
}

/** Profile reads/writes for the signed-in user (RLS scopes rows automatically). */
export const profileService = {
  async getCurrent(): Promise<Profile | null> {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, created_at")
      .maybeSingle();
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
};
