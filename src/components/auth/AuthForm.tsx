import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Compass } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/common/LoadingState";
import { authService } from "@/services/auth.service";
import { toErrorMessage } from "@/services/api-client";
import { useSession } from "@/hooks/useSession";
import { env } from "@/config/env";

export type AuthMode = "signin" | "signup";

/** Shared credentials form rendered by /login and /register. */
export function AuthForm({ mode }: { mode: AuthMode }) {
  const isSignup = mode === "signup";
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const { session, loading } = useSession();
  const navigate = useNavigate();

  // Already signed in? Skip straight to the dashboard.
  useEffect(() => {
    if (!loading && session) navigate({ to: "/dashboard", replace: true });
  }, [loading, session, navigate]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      if (isSignup) {
        const hasSession = await authService.signUp({ email, password, fullName });
        if (!hasSession) {
          toast.success("Check your email to confirm your account.");
          return;
        }
        toast.success(`Welcome to ${env.appName}`);
      } else {
        await authService.signIn({ email, password });
      }
      navigate({ to: "/dashboard", replace: true });
    } catch (error) {
      toast.error(toErrorMessage(error, "Authentication failed."));
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    try {
      const redirected = await authService.signInWithGoogle();
      if (redirected) return;
      navigate({ to: "/dashboard", replace: true });
    } catch (error) {
      toast.error(toErrorMessage(error, "Google sign-in failed."));
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Compass className="size-4" aria-hidden />
          </span>
          <span className="font-display text-lg font-semibold">{env.appName}</span>
        </Link>

        <div className="rounded-2xl border border-border bg-card p-7 shadow-soft">
          <h1 className="text-2xl font-semibold">
            {isSignup ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isSignup
              ? "Start building ATS-friendly resumes in minutes."
              : "Sign in to your resume workspace."}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {isSignup && (
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ada Lovelace"
                  autoComplete="name"
                  required
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={isSignup ? "new-password" : "current-password"}
                minLength={6}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy && <Spinner />}
              {isSignup ? "Create account" : "Sign in"}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>

          <Button variant="outline" className="w-full" onClick={handleGoogle}>
            Continue with Google
          </Button>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {isSignup ? "Already have an account? " : "New to CareerPilot? "}
            <Link
              to={isSignup ? "/login" : "/register"}
              className="font-medium text-primary hover:underline"
            >
              {isSignup ? "Sign in" : "Create an account"}
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
