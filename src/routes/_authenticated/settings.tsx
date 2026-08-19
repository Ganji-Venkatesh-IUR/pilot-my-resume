import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { LogOut, Monitor, Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { TEMPLATES, type TemplateId } from "@/lib/resume-schema";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — CareerPilot AI" },
      { name: "description", content: "Appearance, default template and account preferences." },
      { property: "og:title", content: "Settings — CareerPilot AI" },
      { property: "og:description", content: "Tune CareerPilot AI to your workflow." },
    ],
  }),
  component: SettingsPage,
});

type Theme = "light" | "dark" | "system";

const THEMES: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

function applyTheme(theme: Theme) {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = theme === "dark" || (theme === "system" && prefersDark);
  document.documentElement.classList.toggle("dark", dark);
}

function SettingsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [theme, setTheme] = useState<Theme>("light");
  const [defaultTemplate, setDefaultTemplate] = useState<TemplateId>("atlas");
  const [autoAts, setAutoAts] = useState(true);

  // Preferences are local to the browser — read after hydration only.
  useEffect(() => {
    const storedTheme = (localStorage.getItem("cp-theme") as Theme | null) ?? "light";
    const storedTemplate = (localStorage.getItem("cp-template") as TemplateId | null) ?? "atlas";
    setTheme(storedTheme);
    setDefaultTemplate(storedTemplate);
    setAutoAts(localStorage.getItem("cp-auto-ats") !== "false");
    applyTheme(storedTheme);
  }, []);

  function changeTheme(next: Theme) {
    setTheme(next);
    localStorage.setItem("cp-theme", next);
    applyTheme(next);
  }

  function changeTemplate(next: TemplateId) {
    setDefaultTemplate(next);
    localStorage.setItem("cp-template", next);
    toast.success(`Default template set to ${TEMPLATES.find((t) => t.id === next)?.name}`);
  }

  function changeAutoAts(next: boolean) {
    setAutoAts(next);
    localStorage.setItem("cp-auto-ats", String(next));
  }

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <>
      <PageHeader title="Settings" description="Appearance and resume defaults." />

      <div className="max-w-2xl space-y-6">
        <section className="rounded-xl border border-border bg-card p-6 shadow-soft">
          <h2 className="font-display font-semibold">Appearance</h2>
          <p className="mt-1 text-sm text-muted-foreground">Choose how CareerPilot AI looks.</p>
          <div className="mt-4 grid grid-cols-3 gap-3" role="radiogroup" aria-label="Theme">
            {THEMES.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={theme === value}
                onClick={() => changeTheme(value)}
                className={`flex flex-col items-center gap-2 rounded-lg border p-4 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  theme === value
                    ? "border-primary bg-accent text-accent-foreground"
                    : "border-border hover:bg-muted"
                }`}
              >
                <Icon className="size-4" aria-hidden />
                {label}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-6 shadow-soft">
          <h2 className="font-display font-semibold">Resume defaults</h2>
          <div className="mt-4 space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="default-template">Default template</Label>
              <Select value={defaultTemplate} onValueChange={(v) => changeTemplate(v as TemplateId)}>
                <SelectTrigger id="default-template">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATES.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name} — {template.blurb}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="auto-ats">Show ATS score</Label>
                <p className="text-sm text-muted-foreground">
                  Display a readability score on every draft.
                </p>
              </div>
              <Switch id="auto-ats" checked={autoAts} onCheckedChange={changeAutoAts} />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-6 shadow-soft">
          <h2 className="font-display font-semibold">Account</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign out of CareerPilot AI on this device.
          </p>
          <Button variant="outline" className="mt-4" onClick={handleSignOut}>
            <LogOut className="size-4" aria-hidden /> Sign out
          </Button>
        </section>
      </div>
    </>
  );
}
