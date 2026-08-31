import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Compass } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/common/LoadingState";
import { authService } from "@/services/auth.service";
import { toErrorMessage } from "@/services/api-client";
import { fieldErrors, resetPasswordSchema } from "@/lib/validation";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Set a new password — CareerPilot AI" },
      {
        name: "description",
        content: "Choose a new password to finish recovering your CareerPilot AI account.",
      },
      { property: "og:title", content: "Set a new password — CareerPilot AI" },
      { property: "og:description", content: "Finish recovering your account." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  // The email link drops a recovery session in the URL hash; wait for it.
  useEffect(() => {
    let active = true;
    const hash = window.location.hash;
    const isRecovery = hash.includes("type=recovery");

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setReady(Boolean(data.session) || isRecovery);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = resetPasswordSchema.safeParse({ password, confirm });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      await authService.updatePassword(parsed.data.password);
      toast.success("Password updated. You're signed in.");
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      toast.error(toErrorMessage(err, "Could not update your password."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Compass className="size-4" aria-hidden />
          </span>
          <span className="font-display text-lg font-semibold">CareerPilot AI</span>
        </Link>

        <div className="rounded-2xl border border-border bg-card p-7 shadow-soft">
          <h1 className="text-2xl font-semibold">Set a new password</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {ready
              ? "Choose a strong password with at least 8 characters, one letter and one number."
              : "This page needs a valid reset link. Request a new one if yours has expired."}
          </p>

          {ready && (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="password">New password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  aria-invalid={Boolean(errors["password"])}
                />
                {errors["password"] && (
                  <p className="text-sm text-destructive">{errors["password"]}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm">Confirm password</Label>
                <Input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  aria-invalid={Boolean(errors["confirm"])}
                />
                {errors["confirm"] && (
                  <p className="text-sm text-destructive">{errors["confirm"]}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy && <Spinner />}
                Update password
              </Button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link to="/forgot-password" className="font-medium text-primary hover:underline">
              Request a new link
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
