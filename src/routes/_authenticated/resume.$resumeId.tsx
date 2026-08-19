import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { ArrowLeft, Download, Loader2, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resumeService } from "@/services/resume.service";
import { CopilotPanel, type CopilotMessage } from "@/components/resume/CopilotPanel";
import { ResumePreview } from "@/components/resume/ResumePreview";
import { copilotEdit, generateResume } from "@/lib/careerpilot.functions";
import {
  TEMPLATES,
  estimateAtsScore,
  normalizeResume,
  type ResumeContent,
  type TemplateId,
} from "@/lib/resume-schema";

export const Route = createFileRoute("/_authenticated/resume/$resumeId")({
  head: () => ({
    meta: [
      { title: "Resume builder — CareerPilot AI" },
      {
        name: "description",
        content:
          "Generate, preview and refine an ATS-friendly resume with the AI copilot, then export to PDF.",
      },
      { property: "og:title", content: "Resume builder — CareerPilot AI" },
      { property: "og:description", content: "AI resume editing with live preview and PDF export." },
    ],
  }),
  component: ResumeBuilder,
});

function ResumeBuilder() {
  const { resumeId } = Route.useParams();
  const navigate = useNavigate();
  const runGenerate = useServerFn(generateResume);
  const runCopilot = useServerFn(copilotEdit);

  const [resume, setResume] = useState<ResumeContent | null>(null);
  const [template, setTemplate] = useState<TemplateId>("atlas");
  const [title, setTitle] = useState("");
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [generating, setGenerating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: row, isLoading } = useQuery({
    queryKey: ["resume", resumeId],
    queryFn: () => resumeService.get(resumeId),
  });

  // Hydrate local editor state once the row arrives.
  useEffect(() => {
    if (!row) return;
    setResume(normalizeResume(row.content));
    setTemplate((row.template as TemplateId) ?? "atlas");
    setTitle(row.title);
  }, [row]);

  const hasContent = Boolean(resume && (resume.name || resume.experience.length || resume.summary));

  async function persist(
    next: Partial<{ content: ResumeContent; template: TemplateId; title: string }>,
  ) {
    await resumeService.patch(resumeId, {
      ...next,
      ...(next.content ? { atsScore: estimateAtsScore(next.content) } : {}),
    });
  }

  async function handleGenerate() {
    if (!row) return;
    setGenerating(true);
    try {
      const generated = await runGenerate({
        data: {
          sourceText: row.source_text ?? "",
          githubUrl: row.github_url ?? undefined,
          linkedinUrl: row.linkedin_url ?? undefined,
          targetRole: row.target_role ?? undefined,
        },
      });
      const next = normalizeResume(generated);
      setResume(next);
      await persist({ content: next });
      toast.success("ATS resume generated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Generation failed.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleCopilot(instruction: string) {
    if (!resume) return;
    setMessages((prev) => [...prev, { role: "user", text: instruction }]);
    setEditing(true);
    try {
      const result = await runCopilot({
        data: { resume, instruction, targetRole: row?.target_role ?? undefined },
      });
      const next = normalizeResume(result.resume);
      setResume(next);
      await persist({ content: next });
      setMessages((prev) => [...prev, { role: "copilot", text: result.note }]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "The copilot couldn't apply that.";
      setMessages((prev) => [...prev, { role: "copilot", text: message }]);
      toast.error(message);
    } finally {
      setEditing(false);
    }
  }

  async function handleSave() {
    if (!resume) return;
    setSaving(true);
    try {
      await persist({ content: resume, template, title });
      toast.success("Saved");
    } catch {
      toast.error("Could not save your changes.");
    } finally {
      setSaving(false);
    }
  }

  async function handleTemplate(id: TemplateId) {
    setTemplate(id);
    try {
      await persist({ template: id });
    } catch {
      toast.error("Could not save the template choice.");
    }
  }

  if (isLoading || !resume) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" /> Loading resume…
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-5 py-8">
      {/* Toolbar */}
      <div className="mb-6 flex flex-wrap items-center gap-3 print:hidden">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/dashboard" })}>
          <ArrowLeft className="size-4" /> Back
        </Button>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="h-9 max-w-xs font-medium"
          aria-label="Resume title"
        />
        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            disabled={!hasContent}
          >
            <Download className="size-4" /> Export PDF
          </Button>
          <Button size="sm" onClick={handleGenerate} disabled={generating}>
            {generating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {hasContent ? "Regenerate" : "Generate with AI"}
          </Button>
        </div>
      </div>

      {/* Templates */}
      <div className="mb-6 flex flex-wrap gap-2 print:hidden">
        {TEMPLATES.map((item) => (
          <button
            key={item.id}
            onClick={() => handleTemplate(item.id)}
            className={`rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
              template === item.id
                ? "border-primary bg-accent text-accent-foreground"
                : "border-border bg-card text-muted-foreground hover:border-primary/50"
            }`}
          >
            <span className="block font-semibold text-foreground">{item.name}</span>
            {item.blurb}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          {hasContent ? (
            <ResumePreview resume={resume} template={template} />
          ) : (
            <div className="rounded-xl border border-dashed border-border p-16 text-center print:hidden">
              <Sparkles className="mx-auto size-6 text-primary" />
              <p className="mt-3 font-medium">Nothing generated yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Hit “Generate with AI” to turn your source material into an ATS-friendly resume.
              </p>
            </div>
          )}
        </div>

        <div className="h-[640px] lg:sticky lg:top-24 print:hidden">
          <CopilotPanel messages={messages} busy={editing} onSend={handleCopilot} />
        </div>
      </div>
    </main>
  );
}
