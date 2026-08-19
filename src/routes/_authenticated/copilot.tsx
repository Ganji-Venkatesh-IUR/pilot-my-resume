import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/copilot")({
  head: () => ({
    meta: [
      { title: "AI copilot — CareerPilot AI" },
      {
        name: "description",
        content: "Open a resume with the AI copilot to rewrite bullets, tone and keywords.",
      },
      { property: "og:title", content: "AI copilot — CareerPilot AI" },
      { property: "og:description", content: "Conversational resume editing." },
    ],
  }),
  component: CopilotHub,
});

const EXAMPLES = [
  "Make the bullets more quantified",
  "Tailor this to a senior role",
  "Shorten the summary to two lines",
  "Add missing ATS keywords for a data role",
];

function CopilotHub() {
  const { data: resumes, isLoading } = useQuery({
    queryKey: ["resumes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resumes")
        .select("id, title, target_role, ats_score, updated_at")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <>
      <PageHeader
        title="AI copilot"
        description="Pick a resume — the copilot chat opens beside its live preview."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section aria-label="Your resumes">
          {isLoading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading…
            </p>
          ) : resumes && resumes.length > 0 ? (
            <ul className="space-y-3">
              {resumes.map((resume) => (
                <li key={resume.id}>
                  <Link
                    to="/resume/$resumeId"
                    params={{ resumeId: resume.id }}
                    className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-soft transition-shadow hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                      <Sparkles className="size-5" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{resume.title}</span>
                      <span className="block truncate text-sm text-muted-foreground">
                        {resume.target_role || "No target role"}
                      </span>
                    </span>
                    <ArrowRight className="size-4 text-muted-foreground" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-10 text-center">
              <p className="text-sm text-muted-foreground">
                You need a resume before the copilot can help.
              </p>
              <Button asChild className="mt-4">
                <Link to="/upload">Start from an upload</Link>
              </Button>
            </div>
          )}
        </section>

        <aside className="h-fit rounded-xl border border-border bg-card p-5 shadow-soft">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Things to ask
          </h2>
          <ul className="mt-3 space-y-2">
            {EXAMPLES.map((example) => (
              <li
                key={example}
                className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground"
              >
                “{example}”
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </>
  );
}
