import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Compass } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/common/LoadingState";
import { authService } from "@/services/auth.service";
import { toErrorMessage } from "@/services/api-client";
import { forgotPasswordSchema } from "@/lib/validation";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset your password — CareerPilot AI" },
      {
        name: "description",
        content: "Request a secure password reset link for your CareerPilot AI account.",
      },
      { property: "og:title", content: "Reset your password — CareerPilot AI" },
      { property: "og:description", content: "Get back into your resume workspace." },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid email");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await authService.requestPasswordReset(parsed.data.email);
      setSent(true);
      toast.success("Reset link sent — check your inbox.");
    } catch (err) {
      toast.error(toErrorMessage(err, "Could not send the reset link."));
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
          <h1 className="text-2xl font-semibold">Forgot your password?</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {sent
              ? "If that email is registered, a reset link is on its way. The link opens a page where you can set a new password."
              : "Enter your account email and we'll send you a secure reset link."}
          </p>

          {!sent && (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "email-error" : undefined}
                />
                {error && (
                  <p id="email-error" className="text-sm text-destructive">
                    {error}
                  </p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy && <Spinner />}
                Send reset link
              </Button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link to="/login" className="font-medium text-primary hover:underline">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
