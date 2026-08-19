import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export interface Credentials {
  email: string;
  password: string;
}

/** Every auth interaction the UI needs, in one place. */
export const authService = {
  async signIn({ email, password }: Credentials) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  },

  /** Returns true when a session was created immediately (no email confirm). */
  async signUp({ email, password, fullName }: Credentials & { fullName: string }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName },
      },
    });
    if (error) throw error;
    return Boolean(data.session);
  },

  /** Returns true when the browser was redirected to the provider. */
  async signInWithGoogle(): Promise<boolean> {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) throw new Error("Google sign-in failed. Please try again.");
    return Boolean(result.redirected);
  },

  /** Sends a reset link that lands on /reset-password. */
  async requestPasswordReset(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  },

  /** Sets a new password for the recovery session created by the email link. */
  async updatePassword(password: string) {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  },

  async signOut() {
    await supabase.auth.signOut();
  },
};
