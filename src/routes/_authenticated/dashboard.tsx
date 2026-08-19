import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { FileText, Plus, Trash2, Loader2, Github, Linkedin, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { emptyResume } from "@/lib/resume-schema";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — CareerPilot AI" },
      {
        name: "description",
        content: "Manage your AI-generated resumes, start new drafts and track ATS readiness.",
      },
      { property: "og:title", content: "Dashboard — CareerPilot AI" },
      { property: "og:description", content: "Your AI resume workspace." },
    ],
  }),
  component: Dashboard,
});

interface ResumeRow {
  id: string;
  title: string;
  template: string;
  target_role: string | null;
  ats_score: number | null;
  updated_at: string;
}

function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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

  /** Reads a plain-text/markdown resume file into the source textarea. */
  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      setSourceText(text.slice(0, 40000));
      toast.success(`Loaded ${file.name}`);
    } catch {
      toast.error("Couldn't read that file. Paste the text instead.");
    }
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setCreating(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Session expired. Please sign in again.");

      const { data, error } = await supabase
        .from("resumes")
        .insert({
          user_id: auth.user.id,
          title: title.trim() || "Untitled resume",
          target_role: targetRole.trim() || null,
          source_text: sourceText.trim() || null,
          github_url: githubUrl.trim() || null,
          linkedin_url: linkedinUrl.trim() || null,
          content: emptyResume as unknown as Record<string, unknown>,
        })
        .select("id")
        .single();
      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ["resumes"] });
      navigate({ to: "/resume/$resumeId", params: { resumeId: data.id } });
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
    <main className="mx-auto max-w-7xl px-5 py-10">
      <h1 className="text-3xl font-semibold">Your workspace</h1>
      <p className="mt-1 text-muted-foreground">
        Start from a resume, a GitHub profile or a LinkedIn URL — the AI does the rest.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* Saved resumes */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Resumes
          </h2>
          {isLoading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading…
            </p>
          ) : resumes && resumes.length > 0 ? (
            <ul className="space-y-3">
              {resumes.map((resume) => (
                <li
                  key={resume.id}
                  className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-soft transition-shadow hover:shadow-lift"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                    <FileText className="size-5" />
                  </span>
                  <button
                    className="min-w-0 flex-1 text-left"
                    onClick={() =>
                      navigate({ to: "/resume/$resumeId", params: { resumeId: resume.id } })
                    }
                  >
                    <p className="truncate font-medium">{resume.title}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {resume.target_role || "No target role"} ·{" "}
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
                    aria-label="Delete resume"
                    onClick={() => handleDelete(resume.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              No resumes yet. Create your first one on the right.
            </div>
          )}
        </section>

        {/* New resume form */}
        <section className="rounded-xl border border-border bg-card p-5 shadow-soft">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
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
                <Github className="size-3.5" /> GitHub URL
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
                <Linkedin className="size-3.5" /> LinkedIn URL
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
              <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-primary hover:underline">
                <Upload className="size-3.5" /> Upload a .txt / .md resume
                <input type="file" accept=".txt,.md,.markdown" className="hidden" onChange={handleFile} />
              </label>
            </div>
            <Button type="submit" className="w-full" disabled={creating}>
              {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Create resume
            </Button>
          </form>
        </section>
      </div>
    </main>
  );
}
