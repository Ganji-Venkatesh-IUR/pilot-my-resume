import { supabase } from "@/integrations/supabase/client";

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
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/login`,
      },
    });
    if (error) throw new Error("Google sign-in failed. Please try again.");
    // Supabase redirects the browser, so if we reach here without error, redirect was initiated
    return true;
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
