import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { resumeService } from "@/services/resume.service";
import { TEMPLATES, type TemplateId } from "@/lib/resume-schema";

export const Route = createFileRoute("/_authenticated/builder")({
  // Both params are optional so other pages can link here without search state.
  validateSearch: (search: Record<string, unknown>): { q?: string; template?: TemplateId } => ({
    ...(typeof search["q"] === "string" ? { q: search["q"] as string } : {}),
    ...(typeof search["template"] === "string"
      ? { template: search["template"] as TemplateId }
      : {}),
  }),
  head: () => ({
    meta: [
      { title: "Resume builder — CareerPilot AI" },
      {
        name: "description",
        content: "Create a new ATS-friendly resume from your notes, GitHub or LinkedIn profile.",
      },
      { property: "og:title", content: "Resume builder — CareerPilot AI" },
      { property: "og:description", content: "Create and manage your AI resumes." },
    ],
  }),
  component: BuilderPage,
});

interface ResumeRow {
  id: string;
  title: string;
  template: string;
  target_role: string | null;
  ats_score: number | null;
  updated_at: string;
}

function BuilderPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { q } = Route.useSearch();

  const { data: resumes, isLoading } = useQuery({
    queryKey: ["resumes"],
    queryFn: (): Promise<ResumeRow[]> => resumeService.list(),
  });

  const filtered = (resumes ?? []).filter((r) =>
    q ? `${r.title} ${r.target_role ?? ""}`.toLowerCase().includes(q.toLowerCase()) : true,
  );

  async function handleDelete(id: string) {
    try {
      await resumeService.remove(id);
    } catch {
      toast.error("Could not delete that resume.");
      return;
    }
    toast.success("Resume deleted");
    queryClient.invalidateQueries({ queryKey: ["resumes"] });
  }

  return (
    <>
      <PageHeader
        title="Resume builder"
        description={
          q
            ? `Showing resumes matching “${q}”.`
            : "Start a new draft or continue an existing resume."
        }
      />

      <div className="grid gap-8">
        <section aria-labelledby="resumes-heading">
          <h2
            id="resumes-heading"
            className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground"
          >
            Your resumes
          </h2>
          {isLoading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading…
            </p>
          ) : filtered.length > 0 ? (
            <ul className="space-y-3">
              {filtered.map((resume) => (
                <li
                  key={resume.id}
                  className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-soft transition-shadow hover:shadow-lift"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                    <FileText className="size-5" aria-hidden />
                  </span>
                  <button
                    className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() =>
                      navigate({ to: "/resume/$resumeId", params: { resumeId: resume.id } })
                    }
                  >
                    <p className="truncate font-medium">{resume.title}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {resume.target_role || "No target role"} ·{" "}
                      {TEMPLATES.find((t) => t.id === resume.template)?.name ?? resume.template} ·{" "}
                      {new Date(resume.updated_at).toLocaleDateString()}
                    </p>
                  </button>
                  {resume.ats_score !== null && (
                    <span className="rounded-full bg-success/15 px-2.5 py-1 text-xs font-medium text-success">
                      ATS {resume.ats_score}
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete ${resume.title}`}
                    onClick={() => handleDelete(resume.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              No resumes here yet. Create one with the form.
            </div>
          )}
        </section>
      </div>
    </>
  );
}
