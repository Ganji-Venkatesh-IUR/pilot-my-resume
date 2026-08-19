import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { FileText, Github, Linkedin, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { createResume } from "@/lib/create-resume";
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
  const { q, template } = Route.useSearch();

  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");

  const { data: resumes, isLoading } = useQuery({
    queryKey: ["resumes"],
    queryFn: async (): Promise<ResumeRow[]> => {
      const { data, error } = await supabase
        .from("resumes")
        .select("id, title, template, target_role, ats_score, updated_at")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = (resumes ?? []).filter((r) =>
    q ? `${r.title} ${r.target_role ?? ""}`.toLowerCase().includes(q.toLowerCase()) : true,
  );

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setCreating(true);
    try {
      const id = await createResume({
        title,
        targetRole,
        sourceText,
        githubUrl,
        linkedinUrl,
        template: template ?? "atlas",
      });
      await queryClient.invalidateQueries({ queryKey: ["resumes"] });
      navigate({ to: "/resume/$resumeId", params: { resumeId: id } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the resume.");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("resumes").delete().eq("id", id);
    if (error) {
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

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_400px]">
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

        <section
          aria-labelledby="new-resume-heading"
          className="h-fit rounded-xl border border-border bg-card p-5 shadow-soft"
        >
          <h2
            id="new-resume-heading"
            className="text-xs font-semibold uppercase tracking-widest text-muted-foreground"
          >
            New resume
          </h2>
          <form onSubmit={handleCreate} className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title">Name this resume</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Backend engineer — 2026"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="role">Target role</Label>
              <Input
                id="role"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="Senior Backend Engineer"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="github" className="flex items-center gap-1.5">
                <Github className="size-3.5" aria-hidden /> GitHub URL
              </Label>
              <Input
                id="github"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/username"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="linkedin" className="flex items-center gap-1.5">
                <Linkedin className="size-3.5" aria-hidden /> LinkedIn URL
              </Label>
              <Input
                id="linkedin"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/in/username"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="source">Paste your resume or notes</Label>
              <Textarea
                id="source"
                rows={6}
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                placeholder="Paste your current resume, experience notes, or project descriptions…"
              />
            </div>
            <Button type="submit" className="w-full" disabled={creating}>
              {creating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" aria-hidden />
              )}
              Create resume
            </Button>
          </form>
        </section>
      </div>
    </>
  );
}
